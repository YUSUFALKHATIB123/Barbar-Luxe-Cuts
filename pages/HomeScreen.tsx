
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../App';
import { firebase } from '../services/FirebaseMock';
import { NotificationService } from '../services/NotificationService';
import { Booking } from '../types';
import BookingCountdown from '../components/BookingCountdown';

const RESCHEDULE_TIME_SLOTS = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
  '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM'
];

function isBookingPast(booking: Booking): boolean {
  const dateStr = booking.date;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? new Date(dateStr) : null;
  if (!d || isNaN(d.getTime())) return false;
  const [timePart, period] = (booking.time || '').trim().split(/\s+/);
  const [h, m] = (timePart || '').split(':').map((x) => parseInt(x, 10));
  if (Number.isNaN(h)) return false;
  let hour24 = h;
  if (/^(PM|م)/i.test(period) && h !== 12) hour24 = h + 12;
  if (/^(AM|ص)/i.test(period) && h === 12) hour24 = 0;
  d.setHours(hour24, Number.isNaN(m) ? 0 : m, 0, 0);
  return d.getTime() <= Date.now();
}

const HomeScreen: React.FC<{ onProfile: () => void, onSelectBarber: (b: any) => void }> = ({ onProfile, onSelectBarber }) => {
  const { user, t, language } = useApp();
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('Olaya Main');
  const [searchQuery, setSearchQuery] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [filterBarber, setFilterBarber] = useState<string | null>(null);
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleError, setRescheduleError] = useState('');
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);

  const rescheduleDates = useMemo(() => {
    const arr: { iso: string; label: string }[] = [];
    const weekdayNamesAr = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const weekdayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 0; i < 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const iso = `${y}-${m}-${day}`;
      let label: string;
      if (i === 0) {
        label = t('today');
      } else {
        const dayName = language === 'ar' ? weekdayNamesAr[d.getDay()] : weekdayNamesEn[d.getDay()];
        label = `${dayName} ${d.getDate()}`;
      }
      arr.push({ iso, label });
    }
    return arr;
  }, [language, t]);

  const branches = [
    { id: '1', name: 'Olaya Main', loc: 'الرياض، شارع العليا', img: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80' },
    { id: '2', name: 'Tahlia Branch', loc: 'الرياض، شارع التحلية', img: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80' },
    { id: '3', name: 'Nakheel Mall', loc: 'الرياض، النخيل مول', img: 'https://images.unsplash.com/photo-1599351473299-d8395069d2a1?auto=format&fit=crop&q=80' }
  ];

  const rawBarbers = [
    { id: '1', name: 'Marcus V.', role: 'Beard Master', rate: '4.8', img: 'https://i.pravatar.cc/150?u=marcus1', whatsapp: '966500111111', branchName: 'Olaya Main', locationKeywords: ['العليا', 'olaya', 'riyadh'] },
    { id: '2', name: 'Daniel B.', role: 'Modern Style', rate: '5.0', img: 'https://i.pravatar.cc/150?u=daniel2', whatsapp: '966500222222', branchName: 'Tahlia Branch', locationKeywords: ['التحلية', 'tahlia', 'riyadh'] },
    { id: '3', name: 'Laith M.', role: 'Classic Cut', rate: '4.7', img: 'https://i.pravatar.cc/150?u=3', whatsapp: '966500333333', branchName: 'Nakheel Mall', locationKeywords: ['النخيل', 'nakheel', 'mall'] },
    { id: '4', name: 'Yasser K.', role: 'Hair Art', rate: '4.9', img: 'https://i.pravatar.cc/150?u=4', whatsapp: '966500444444', branchName: 'Olaya Main', locationKeywords: ['العليا', 'olaya', 'riyadh'] }
  ];

  const loadActiveBookings = () => {
    if (user) {
      firebase.getBookings(user.uid).then(all => {
        const active = all.filter(b => b.status === 'Pending' || b.status === 'Approved');
        setActiveBookings(active);
        // إعادة جدولة تذكير الموعد (30 دقيقة + عند الموعد) عند كل تحميل للحجوزات
        if (user.uid) NotificationService.initializeForUser(user.uid).catch(() => {});
      });
    }
  };

  useEffect(() => {
    loadActiveBookings();
    if (user?.uid) {
      firebase.getFavorites(user.uid).then(favs => {
        setFavorites(favs.map(f => f.barberId));
      });
    }
    firebase.getCoupons(selectedBranch === 'all' ? undefined : selectedBranch).then(setAvailableCoupons);
  }, [user, selectedBranch]);

  useEffect(() => {
    firebase.getBookings().then(setAllBookings);
  }, []);

  const hasActive = activeBookings.length > 0;
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const unavailableBarbers = useMemo(() => {
    return new Set(
      allBookings
        .filter((b) => b.status === 'Pending' || b.status === 'Approved')
        .map((b) => b.barberId)
    );
  }, [allBookings]);

  const filteredBarbers = useMemo(() => {
    return rawBarbers.filter((barber) => {
      const matchesBranch = (selectedBranch === 'all' || barber.branchName === selectedBranch);
      const matchesBarberFilter = !filterBarber || barber.name === filterBarber;
      const searchable = `${barber.name} ${barber.role} ${barber.branchName} ${barber.locationKeywords.join(' ')}`.toLowerCase();
      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
      const isAvailable = !unavailableBarbers.has(barber.name);
      const matchesAvailability = !availableOnly || isAvailable;
      return matchesBranch && matchesBarberFilter && matchesQuery && matchesAvailability;
    });
  }, [rawBarbers, selectedBranch, filterBarber, normalizedQuery, availableOnly, unavailableBarbers]);

  return (
    <div className="h-full bg-[#050505] flex flex-col animate-in fade-in duration-500 overflow-hidden">
      <header className="px-8 pt-16 flex justify-between items-center bg-background-dark/90 backdrop-blur-xl z-50 pb-4">
        <div className="text-start">
          <p className="text-gray-600 text-[10px] font-black uppercase tracking-[0.2em]">{t('welcome')}</p>
          <h1 className="text-2xl font-black text-white">{user?.name}</h1>
        </div>
        <button onClick={onProfile} className="w-12 h-12 rounded-full border-2 border-primary/40 p-0.5 active:scale-90 transition-transform shadow-lg shadow-primary/10">
          <img src={user?.avatar || 'https://i.pravatar.cc/150'} className="w-full h-full rounded-full object-cover" />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto hide-scrollbar px-8 py-6 space-y-10">
        {/* نافذة تعديل الموعد */}
        {showRescheduleModal && activeBookings[0] && (
          <div className="fixed inset-0 z-[600] bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowRescheduleModal(false)}>
            <div className="w-full max-w-md bg-[#0d0d0d] rounded-t-3xl sm:rounded-3xl border-t sm:border border-white/10 p-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h3 className="text-white font-black text-lg mb-4">{t('reschedule_booking')}</h3>
              <p className="text-white/60 text-xs mb-4">{language === 'ar' ? 'اختر التاريخ والوقت الجديد' : 'Choose new date and time'}</p>
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                {rescheduleDates.map(({ iso, label }) => (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => { setRescheduleDate(iso); setRescheduleTime(''); }}
                    className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold ${rescheduleDate === iso ? 'bg-primary text-black' : 'bg-white/5 text-white/80 border border-white/10'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="mb-6">
                {!rescheduleDate ? (
                  <p className="text-white/40 text-xs text-center py-4">{language === 'ar' ? 'اختر التاريخ أولاً' : 'Select date first'}</p>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowTimePicker(true)}
                      className={`w-full py-3 rounded-xl text-sm font-bold border transition-all ${
                        rescheduleTime 
                          ? 'bg-primary text-black border-primary' 
                          : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {rescheduleTime || (language === 'ar' ? 'اختر الوقت' : 'Select Time')}
                    </button>
                    {showTimePicker && (
                      <div className="fixed inset-0 z-[700] bg-black/90 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowTimePicker(false)}>
                        <div className="w-full max-w-sm bg-[#0d0d0d] rounded-t-3xl sm:rounded-3xl border-t sm:border border-white/10 p-6 max-h-[60vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-white font-black text-lg">{language === 'ar' ? 'اختر الوقت' : 'Select Time'}</h4>
                            <button
                              type="button"
                              onClick={() => setShowTimePicker(false)}
                              className="text-white/50 hover:text-white p-1"
                            >
                              <span className="material-icons-round text-xl">close</span>
                            </button>
                          </div>
                          <div className="flex-1 overflow-y-auto hide-scrollbar">
                            <div className="grid grid-cols-3 gap-2">
                              {RESCHEDULE_TIME_SLOTS.map((time) => (
                                <button
                                  key={time}
                                  type="button"
                                  onClick={() => {
                                    setRescheduleTime(time);
                                    setShowTimePicker(false);
                                  }}
                                  className={`py-3 rounded-xl text-sm font-bold border transition-all ${
                                    rescheduleTime === time 
                                      ? 'bg-primary text-black border-primary scale-105' 
                                      : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10 active:scale-95'
                                  }`}
                                >
                                  {time}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              {rescheduleError && (
                <p className="text-red-400 text-xs mb-4">{rescheduleError}</p>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowRescheduleModal(false)} className="flex-1 py-3 rounded-2xl border border-white/10 text-white/80 font-bold">
                  {t('back')}
                </button>
                <button
                  type="button"
                  disabled={!rescheduleDate || !rescheduleTime || rescheduleSubmitting}
                  onClick={async () => {
                    if (!rescheduleDate || !rescheduleTime || !activeBookings[0]) return;
                    setRescheduleError('');
                    setRescheduleSubmitting(true);
                    const result = await firebase.requestReschedule(activeBookings[0].id, rescheduleDate, rescheduleTime);
                    setRescheduleSubmitting(false);
                    if (result.ok) {
                      loadActiveBookings();
                      setShowRescheduleModal(false);
                    } else {
                      if (result.error === 'LESS_THAN_ONE_HOUR') setRescheduleError(t('reschedule_less_than_hour'));
                      else if (result.error === 'RESCHEDULE_LIMIT_REACHED') setRescheduleError(t('reschedule_limit_reached'));
                      else if (result.error === 'SLOT_TAKEN') setRescheduleError(t('slot_taken'));
                      else setRescheduleError(language === 'ar' ? 'حدث خطأ' : 'Something went wrong');
                    }
                  }}
                  className="flex-1 py-3 rounded-2xl bg-primary text-black font-black disabled:opacity-50"
                >
                  {rescheduleSubmitting ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'تأكيد' : 'Confirm')}
                </button>
              </div>
            </div>
          </div>
        )}

        <section className="flex items-center gap-3 relative">
          <div className="flex-1 h-14 bg-[#090b0f] border border-white/10 rounded-2xl px-4 flex items-center gap-3 min-w-0">
            <span className="material-icons-round text-gray-500 text-xl">search</span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-white placeholder:text-[#44506a] focus:ring-0"
              placeholder={language === 'ar' ? 'ابحث عن الحلاق أو الصالون...' : 'Search barber or salon...'}
            />
          </div>

          <button
            onClick={() => setShowFilterPopover((prev) => !prev)}
            className={`w-14 h-14 rounded-2xl border flex items-center justify-center transition-all flex-shrink-0 ${
              showFilterPopover || filterBarber || availableOnly || selectedBranch !== 'Olaya Main'
                ? 'bg-primary/90 border-primary text-black shadow-lg shadow-primary/25'
                : 'bg-[#090b0f] border-white/10 text-primary/80'
            }`}
            title={language === 'ar' ? 'تصفية' : 'Filter'}
            aria-label={language === 'ar' ? 'تصفية' : 'Filter'}
          >
            <span className="material-icons-round text-xl">tune</span>
          </button>

          {showFilterPopover && (
            <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-[#0d0d0d] border border-white/10 rounded-2xl p-4 shadow-2xl max-h-[70vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-3 sticky top-0 bg-[#0d0d0d] pb-2 border-b border-white/5 -mt-1 pt-1">
                <span className="text-primary text-[10px] font-black uppercase tracking-widest">{language === 'ar' ? 'تصفية' : 'Filter'}</span>
                <button type="button" onClick={() => setShowFilterPopover(false)} className="text-white/50 hover:text-white p-1">
                  <span className="material-icons-round text-lg">close</span>
                </button>
              </div>
              <div className="space-y-4 mt-3">
                <div>
                  <p className="text-white font-black text-[10px] uppercase mb-2 tracking-widest">{t('featured_salons')}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedBranch('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold ${selectedBranch === 'all' ? 'bg-primary text-black' : 'bg-white/5 text-white/80 border border-white/10'}`}
                    >
                      {t('all')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedBranch('Olaya Main')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold ${selectedBranch === 'Olaya Main' ? 'bg-primary text-black' : 'bg-white/5 text-white/80 border border-white/10'}`}
                    >
                      Olaya Main
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedBranch('Tahlia Branch')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold ${selectedBranch === 'Tahlia Branch' ? 'bg-primary text-black' : 'bg-white/5 text-white/80 border border-white/10'}`}
                    >
                      Tahlia Branch
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedBranch('Nakheel Mall')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold ${selectedBranch === 'Nakheel Mall' ? 'bg-primary text-black' : 'bg-white/5 text-white/80 border border-white/10'}`}
                    >
                      Nakheel Mall
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-white font-black text-[10px] uppercase mb-2 tracking-widest">{t('top_barbers')}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setFilterBarber(null)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold ${filterBarber === null ? 'bg-primary text-black' : 'bg-white/5 text-white/80 border border-white/10'}`}
                    >
                      {t('all')}
                    </button>
                    {rawBarbers.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setFilterBarber(b.name)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold ${filterBarber === b.name ? 'bg-primary text-black' : 'bg-white/5 text-white/80 border border-white/10'}`}
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={availableOnly}
                    onChange={(e) => setAvailableOnly(e.target.checked)}
                    className="rounded border-white/20 text-primary bg-white/5"
                  />
                  <span className="text-white/80 text-xs font-bold">
                    {language === 'ar' ? 'المتاح الآن فقط' : 'Available now only'}
                  </span>
                </label>
              </div>
            </div>
          )}
        </section>

        {/* بطاقة الموعد النشط الوحيدة — تحت البحث */}
        {hasActive && activeBookings.length > 0 && (
          <section className="animate-in slide-in-from-top duration-700 mb-4">
            <div className="bg-[#111] border border-white/5 rounded-[28px] p-4 shadow-2xl relative">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${
                  activeBookings[0].status === 'Pending'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {activeBookings[0].status === 'Pending' ? t('pending') : t('approved')}
                </span>
                {(activeBookings[0].rescheduleCount ?? 0) < 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setRescheduleError('');
                      setRescheduleDate(rescheduleDates[0]?.iso ?? '');
                      setRescheduleTime('');
                      setShowRescheduleModal(true);
                    }}
                    className="shrink-0 rounded-2xl border border-primary/30 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-primary transition-all hover:bg-primary/10"
                  >
                    {t('reschedule_booking')}
                  </button>
                )}
              </div>
              {activeBookings[0].rescheduledByAdminAt && (
                <p className="text-amber-400/90 text-[10px] font-bold mb-3 flex items-center gap-1">
                  <span className="material-icons-round text-sm">info</span>
                  {t('appointment_changed_by_admin')}
                </p>
              )}
              <BookingCountdown booking={activeBookings[0]} />
              {isBookingPast(activeBookings[0]) && activeBookings[0].status === 'Approved' && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  {activeBookings[0].rating != null ? (
                    <p className="text-primary/80 text-xs font-bold flex items-center gap-1">
                      {t('thank_you_rating')} — {'★'.repeat(activeBookings[0].rating)}{'☆'.repeat(5 - activeBookings[0].rating)}
                    </p>
                  ) : (
                    <>
                      <p className="text-white/80 text-[10px] font-black uppercase mb-2">{t('rate_service')}</p>
                      <div className="flex gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRatingStars(star)}
                            className="text-2xl text-primary/50 hover:text-primary focus:outline-none"
                          >
                            {ratingStars >= star ? '★' : '☆'}
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={ratingComment}
                        onChange={(e) => setRatingComment(e.target.value)}
                        placeholder={language === 'ar' ? 'تعليق (اختياري)' : 'Comment (optional)'}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs mb-2 min-h-[60px]"
                      />
                      <button
                        type="button"
                        disabled={ratingStars === 0 || ratingSubmitting}
                        onClick={async () => {
                          setRatingSubmitting(true);
                          await firebase.updateBookingRating(activeBookings[0].id, ratingStars, ratingComment.trim() || undefined);
                          loadActiveBookings();
                          setRatingSubmitting(false);
                          setRatingStars(0);
                          setRatingComment('');
                        }}
                        className="w-full py-2 rounded-xl bg-primary text-black text-xs font-black uppercase disabled:opacity-50"
                      >
                        {ratingSubmitting ? (language === 'ar' ? 'جاري الإرسال...' : 'Sending...') : t('submit_rating')}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </section>
        )}
        
        {/* قسم الكوبونات والعروض */}
        {availableCoupons.length > 0 && (
          <section>
            <div className="flex justify-between items-end mb-6">
              <h2 className="text-xl font-black text-white">{language === 'ar' ? 'كوبونات وعروض' : 'Coupons & Offers'}</h2>
              <button
                onClick={() => setShowCouponModal(true)}
                className="text-primary text-xs font-black uppercase tracking-widest"
              >
                {language === 'ar' ? 'عرض الكل' : 'View All'}
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto hide-scrollbar -mx-2 px-2 pb-2">
              {availableCoupons.slice(0, 3).map(coupon => (
                <div key={coupon.id} className="flex-shrink-0 w-72 bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-[32px] p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-white font-black text-lg mb-1">{coupon.code}</h4>
                      <p className="text-primary/80 text-[10px] font-bold uppercase">
                        {coupon.discountType === 'percentage' 
                          ? `${coupon.discountValue}% ${language === 'ar' ? 'خصم' : 'OFF'}`
                          : `${coupon.discountValue} ${language === 'ar' ? 'ريال خصم' : 'SAR OFF'}`
                        }
                      </p>
                    </div>
                    <span className="material-icons-round text-primary text-2xl">local_offer</span>
                  </div>
                  {coupon.minAmount && (
                    <p className="text-white/60 text-[9px] mb-2">
                      {language === 'ar' ? `الحد الأدنى: ${coupon.minAmount} ريال` : `Min: ${coupon.minAmount} SAR`}
                    </p>
                  )}
                  <button
                    onClick={async () => {
                      setCouponCode(coupon.code);
                      const result = await firebase.validateCoupon(coupon.code, 100, selectedBranch === 'all' ? undefined : selectedBranch);
                      if (result.valid) {
                        setCouponDiscount(result.discount);
                        alert(language === 'ar' ? `تم تطبيق الكوبون! خصم: ${result.discount} ريال` : `Coupon applied! Discount: ${result.discount} SAR`);
                      } else {
                        alert(language === 'ar' ? 'الكوبون غير صالح' : 'Invalid coupon');
                      }
                    }}
                    className="w-full py-2 rounded-xl bg-primary text-black text-xs font-black uppercase"
                  >
                    {language === 'ar' ? 'استخدم الكوبون' : 'Use Coupon'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* قسم الفروع */}
        <section>
            <div className="flex justify-between items-end mb-6">
                <h2 className="text-xl font-black text-white">{t('featured_salons')}</h2>
            </div>
            <div
              className="flex gap-5 overflow-x-auto overflow-y-hidden hide-scrollbar -mx-2 px-2 snap-x snap-mandatory"
              style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
            >
                {branches.map((br) => (
                    <div 
                        key={br.id}
                        onClick={() => setSelectedBranch(br.name)}
                        className={`snap-start flex-shrink-0 w-80 h-48 rounded-[46px] relative overflow-hidden border-2 transition-all duration-500 cursor-pointer ${
                            selectedBranch === br.name ? 'border-primary scale-[1.07] shadow-2xl shadow-primary/25 animate-in zoom-in duration-300' : 'border-white/5 opacity-70 hover:opacity-90'
                        }`}
                        style={{ 
                            willChange: 'transform',
                            transform: 'translateZ(0)',
                            backfaceVisibility: 'hidden'
                        }}
                    >
                        <img src={br.img} className={`w-full h-full object-cover transition-transform duration-500 ${
                            selectedBranch === br.name ? 'scale-110' : 'scale-100'
                        }`} style={{ 
                            willChange: 'transform',
                            backfaceVisibility: 'hidden'
                        }} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                        <div className="absolute bottom-4 left-6 text-start">
                            <h4 className="text-white font-black text-sm">{br.name}</h4>
                            <p className="text-gray-400 text-[9px] font-bold">{br.loc}</p>
                        </div>
                        {selectedBranch === br.name && (
                            <div className="absolute top-4 right-4 w-7 h-7 bg-primary rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                                <span className="material-icons-round text-black text-xs font-black">check</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </section>

        {/* الحلاقون */}
        <section className="pb-28">
            <h2 className="text-xl font-black text-white mb-6">{t('top_barbers')}</h2>
            <div className="grid grid-cols-2 gap-5">
                {filteredBarbers.map((b, index) => {
                    const isBooked = activeBookings.some(ab => ab.barberId === b.name);
                    const isAvailable = !unavailableBarbers.has(b.name);
                    return (
                        <div 
                            key={b.id} 
                            onClick={() => !hasActive && onSelectBarber({...b, branchName: selectedBranch})}
                            className={`relative bg-[#111] border rounded-[48px] p-6 text-center flex flex-col items-center transition-all duration-300 ease-out stagger-item ${
                                (hasActive && !isBooked) ? 'opacity-20 grayscale' : 'cursor-pointer hover:bg-white/5 hover:scale-[1.02] active:scale-[0.98]'
                            } ${isBooked ? 'border-primary bg-primary/5' : 'border-white/5'}`}
                            style={{ animationDelay: `${index * 60}ms` }}
                        >
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!user?.uid) return;
                                    const isFavorite = favorites.includes(b.name);
                                    if (isFavorite) {
                                        firebase.removeFavorite(user.uid, b.name).then(() => {
                                            setFavorites(prev => prev.filter(id => id !== b.name));
                                        });
                                    } else {
                                        firebase.addFavorite(user.uid, b.name, b.name).then(() => {
                                            setFavorites(prev => [...prev, b.name]);
                                        });
                                    }
                                }}
                                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all z-10"
                            >
                                <span className={`material-icons-round text-sm ${favorites.includes(b.name) ? 'text-primary' : 'text-white/50'}`}>
                                    {favorites.includes(b.name) ? 'favorite' : 'favorite_border'}
                                </span>
                            </button>
                            <img src={b.img} className={`w-24 h-24 rounded-full object-cover border-4 mb-4 ${isBooked ? 'border-primary' : 'border-white/5'}`} />
                            <h4 className="font-black text-white text-sm">{b.name}</h4>
                            <p className="text-gray-600 text-[9px] font-black uppercase">{b.role}</p>
                            <span className={`mt-2 text-[9px] font-black ${isAvailable ? 'text-green-400' : 'text-red-400'}`}>
                              {isAvailable ? (language === 'ar' ? 'متاح' : 'Available') : t('barber_booked')}
                            </span>
                        </div>
                    );
                })}
            </div>
            {filteredBarbers.length === 0 && (
              <div className="mt-6 text-center text-gray-500 font-bold">
                {language === 'ar' ? 'لا توجد نتائج مطابقة للبحث' : 'No matching results'}
              </div>
            )}
        </section>
      </main>
    </div>
  );
};

export default HomeScreen;
