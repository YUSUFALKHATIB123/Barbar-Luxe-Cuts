
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../app/App';
import { firebase } from '../services/FirebaseMock';
import { Booking } from '../types';

interface Props {
  barber: any;
  onBack: () => void;
  onBook: (data: any) => void;
}

const BarberProfileScreen: React.FC<Props> = ({ barber, onBack, onBook }) => {
  const { t, language } = useApp();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);
  const [dragY, setDragY] = useState(0);
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);
  const [isClosingSheet, setIsClosingSheet] = useState(false);
  const dragStartYRef = useRef<number | null>(null);
  const dragYRef = useRef(0);
  const hasDraggedRef = useRef(false);
  const dragRafRef = useRef<number | null>(null);
  const pendingDragYRef = useRef<number | null>(null);
  const sheetDragListenersRef = useRef<{
    move: (e: PointerEvent) => void;
    up: (e: PointerEvent) => void;
  } | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // جلب حجوزات هذا الحلاق لتعطيل الأوقات المحجوزة
    firebase.getBookings(undefined, barber.name).then(setExistingBookings);
  }, [barber]);

  const dates = useMemo(() => {
    const arr: { day: string; date: string; full: string; isoDate: string }[] = [];
    for (let i = 0; i < 4; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d.getDate()).padStart(2, '0');
      arr.push({
        day: i === 0 ? (language === 'ar' ? 'اليوم' : 'Today') : d.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'short' }),
        date: d.getDate().toString(),
        full: d.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US'),
        isoDate: `${y}-${m}-${dayNum}`
      });
    }
    return arr;
  }, [language]);

  const allTimeSlots = [
    "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
    "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM",
    "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM"
  ];

  const availableTimeSlots = useMemo(() => {
    const todayIso = new Date().toISOString().split('T')[0];
    const sel = dates[selectedDateIdx];
    if (!sel || sel.isoDate !== todayIso) return allTimeSlots;
    const now = new Date();
    return allTimeSlots.filter((timeStr) => {
      const parts = timeStr.split(' ');
      const [h, m] = parts[0].split(':').map((x) => parseInt(x, 10));
      const isPM = parts[1] === 'PM';
      let hour24 = h;
      if (isPM && h !== 12) hour24 = h + 12;
      if (parts[1] === 'AM' && h === 12) hour24 = 0;
      const slotDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour24, m, 0, 0);
      return slotDate.getTime() > now.getTime();
    });
  }, [dates, selectedDateIdx]);

  const services = [
    { id: '1', name: language === 'ar' ? 'قصة شعر ملكية' : 'Royal Cut', price: 150 },
    { id: '2', name: language === 'ar' ? 'تحديد لحية دقيق' : 'Precision Beard', price: 80 },
    { id: '3', name: language === 'ar' ? 'تنظيف بشرة بالذهب' : 'Gold Facial', price: 200 }
  ];

  const totalPrice = services.filter(s => selectedServices.includes(s.id)).reduce((a, b) => a + b.price, 0);
  const whatsappNumber = barber?.whatsapp || '966500000000';
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    language === 'ar'
      ? `مرحبًا ${barber.name}، أرغب بالاستفسار عن الحجز في ${barber.branchName || ''}`
      : `Hi ${barber.name}, I want to ask about booking at ${barber.branchName || ''}`
  )}`;

  const isTimeBooked = (time: string) => {
    const sel = dates[selectedDateIdx];
    return existingBookings.some(b =>
        (b.date === sel.isoDate || b.date.includes(sel.date)) &&
        b.time === time &&
        b.status !== 'Rejected'
    );
  };

  const getBookingInfo = (time: string) => {
    const sel = dates[selectedDateIdx];
    return existingBookings.find(b =>
        (b.date === sel.isoDate || b.date.includes(sel.date)) &&
        b.time === time &&
        b.status !== 'Rejected'
    );
  };

  const removeSheetDragListeners = () => {
    const L = sheetDragListenersRef.current;
    if (!L) return;
    document.removeEventListener('pointermove', L.move, true);
    document.removeEventListener('pointerup', L.up, true);
    document.removeEventListener('pointercancel', L.up, true);
    sheetDragListenersRef.current = null;
  };

  /** طبقة أنيميشن slide-up-card تبقى تتحكم بـ transform وتلغي translateY من React — يجب إيقافها قبل/أثناء السحب */
  const clearSheetEntranceAnimation = () => {
    const el = sheetRef.current;
    if (!el) return;
    el.style.animation = 'none';
    el.classList.remove('slide-up-card');
  };

  useEffect(() => () => removeSheetDragListeners(), []);

  const flushDragFrame = () => {
    if (pendingDragYRef.current === null) return;
    const y = pendingDragYRef.current;
    pendingDragYRef.current = null;
    dragRafRef.current = null;
    setDragY(y);
  };

  const scheduleDragUpdate = (next: number) => {
    dragYRef.current = next;
    pendingDragYRef.current = next;
    if (dragRafRef.current === null) {
      dragRafRef.current = requestAnimationFrame(flushDragFrame);
    }
  };

  const handleSheetDragStart = (clientY: number) => {
    if (isClosingSheet) return;
    removeSheetDragListeners();
    clearSheetEntranceAnimation();
    dragStartYRef.current = clientY;
    dragYRef.current = 0;
    hasDraggedRef.current = false;
    setDragY(0);
    setIsDraggingSheet(true);

    const move = (e: PointerEvent) => {
      if (dragStartYRef.current === null) return;
      const delta = e.clientY - dragStartYRef.current;
      if (delta > 2) {
        hasDraggedRef.current = true;
        e.preventDefault();
      }
      const next = Math.max(0, delta);
      scheduleDragUpdate(next);
    };

    const up = () => {
      if (dragRafRef.current !== null) {
        cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = null;
      }
      pendingDragYRef.current = null;
      removeSheetDragListeners();
      const currentY = dragYRef.current;
      const shouldClose = hasDraggedRef.current && currentY > 80;
      dragStartYRef.current = null;
      setIsDraggingSheet(false);
      if (shouldClose) {
        setIsClosingSheet(true);
        const finalY = typeof window !== 'undefined' ? window.innerHeight : 900;
        dragYRef.current = finalY;
        setDragY(finalY);
        return;
      }
      dragYRef.current = 0;
      setDragY(0);
    };

    sheetDragListenersRef.current = { move, up };
    document.addEventListener('pointermove', move, { capture: true, passive: false });
    document.addEventListener('pointerup', up, true);
    document.addEventListener('pointercancel', up, true);
  };

  return (
    <div className="fixed inset-0 z-[500] bg-black/85 flex items-end">
      <div
        ref={sheetRef}
        className="w-full h-full bg-[#080808] rounded-t-[60px] border-t border-white/10 overflow-hidden slide-up-card flex flex-col"
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget) clearSheetEntranceAnimation();
        }}
        onTransitionEnd={() => {
          if (isClosingSheet) onBack();
        }}
        style={{
          transform: `translateY(${dragY}px)`,
          transition: isDraggingSheet
            ? 'none'
            : isClosingSheet
            ? 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
            : 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {/* مقبض السحب — touch-action:none يمنع اعتراض المتصفح للإيماءة؛ بدون setPointerCapture حتى تصل الأحداث إلى document */}
        <div
          className="w-full flex justify-center py-3 cursor-grab active:cursor-grabbing select-none touch-none"
          onPointerDown={(e) => {
            e.preventDefault();
            handleSheetDragStart(e.clientY);
          }}
        >
          <div className="w-14 h-1.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors pointer-events-none" />
        </div>

        <div
          className="relative flex-1 overflow-y-auto hide-scrollbar px-8 overscroll-y-contain"
          style={{ touchAction: isDraggingSheet ? 'none' : 'pan-y' }}
        >
          <div className="relative h-[240px] rounded-[40px] overflow-hidden mb-10">
            <img src={barber.img} className="w-full h-full object-cover grayscale brightness-75" />
            <div className="absolute bottom-6 left-6 text-start">
              <h1 className="text-4xl font-black text-white mb-2">{barber.name}</h1>
              <p className="text-primary text-[10px] font-black uppercase tracking-widest">{barber.branchName}</p>
            </div>
          </div>

          <div className="mb-10">
            <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-4">{t('available_dates')}</h3>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar">
              {dates.map((d, i) => (
                <div 
                  key={i}
                  onClick={() => { setSelectedDateIdx(i); setSelectedTime(null); }}
                  className={`flex-shrink-0 w-20 h-24 rounded-[30px] border-2 transition-all flex flex-col items-center justify-center cursor-pointer ${
                    selectedDateIdx === i ? 'bg-primary border-primary text-black' : 'bg-white/5 border-white/5 text-gray-500'
                  }`}
                >
                  <span className="text-[8px] font-black uppercase mb-1">{d.day}</span>
                  <span className="text-2xl font-black">{d.date}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-10">
            <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-4">{t('select_time')}</h3>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2" style={{ scrollbarWidth: 'thin' }}>
              {availableTimeSlots.map(time => {
                const taken = isTimeBooked(time);
                const bookingInfo = getBookingInfo(time);
                return (
                    <button 
                      key={time}
                      disabled={taken}
                      onClick={() => {
                        if (!taken) setSelectedTime(time);
                        else if (bookingInfo) {
                          alert(`${t('slot_taken')}\n${language === 'ar' ? 'المستخدم:' : 'User:'} ${bookingInfo.userName}`);
                        }
                      }}
                      className={`flex-shrink-0 px-6 py-3 rounded-full border transition-all font-black text-[10px] relative ${
                        taken ? 'bg-red-500/10 border-red-500/20 text-red-500/30 opacity-60 cursor-pointer' :
                        selectedTime === time ? 'bg-primary border-primary text-black' : 'bg-white/5 border-white/5 text-gray-600 hover:bg-white/10'
                      }`}
                      title={taken && bookingInfo ? `${t('slot_taken')} - ${bookingInfo.userName}` : ''}
                    >
                      {taken ? (
                        <span className="flex flex-col items-center gap-0.5">
                          <span className="text-[8px]">{time}</span>
                          <span className="text-[7px] opacity-70">{t('slot_taken')}</span>
                        </span>
                      ) : time}
                    </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {services.map(s => (
              <div key={s.id} onClick={() => setSelectedServices(p => p.includes(s.id) ? p.filter(x => x !== s.id) : [...p, s.id])} className={`p-6 rounded-[32px] border-2 flex justify-between items-center cursor-pointer ${selectedServices.includes(s.id) ? 'border-primary bg-primary/5' : 'border-white/5 bg-white/5'}`}>
                <span className="text-sm font-black text-white">{s.name}</span>
                <span className="text-primary font-black text-sm">{s.price} {t('currency')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* زر واتساب عائم */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-6 right-6 z-[600] w-16 h-16 rounded-full bg-[#25D366] text-white shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 animate-in zoom-in duration-300"
          aria-label="WhatsApp"
          title="WhatsApp"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
        </a>

        <div className="p-6 bg-[#080808] border-t border-white/5 flex items-center gap-3">
          <h4 className="text-2xl font-black text-white">{totalPrice} {t('currency')}</h4>
          <button 
            disabled={selectedServices.length === 0 || !selectedTime}
            onClick={() => onBook({ barber, service: services.filter(s => selectedServices.includes(s.id)).map(x => x.name).join(' + '), amount: totalPrice, time: selectedTime, date: dates[selectedDateIdx].isoDate, dateLabel: dates[selectedDateIdx].day + ' ' + dates[selectedDateIdx].date })}
            className="ms-auto px-10 py-5 bg-primary text-black font-black rounded-full shadow-2xl disabled:opacity-50 uppercase text-[10px] tracking-widest transition-all hover:scale-105 active:scale-95"
          >
            {t('reserve_now')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BarberProfileScreen;
