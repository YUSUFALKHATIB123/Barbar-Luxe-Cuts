
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { firebase } from '../services/FirebaseMock';
import { Booking, AvailabilityStatus, WorkingHours, CustomerNote, BarberService } from '../types';
import { useApp } from '../app/App';
import BookingCountdown from '../components/BookingCountdown';

const RESCHEDULE_TIME_SLOTS = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
  '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM'
];

const BARBER_SERVICES = [
  { id: '1', nameAr: 'قصة شعر ملكية', nameEn: 'Royal Cut' },
  { id: '2', nameAr: 'تحديد لحية دقيق', nameEn: 'Precision Beard' },
  { id: '3', nameAr: 'تنظيف بشرة بالذهب', nameEn: 'Gold Facial' },
  { id: '4', nameAr: 'تحديد لحية دقيق + تنظيف بشرة بالذهب', nameEn: 'Beard + Gold Facial' },
];

function getBookingDateTime(booking: Booking): Date {
  const [dateStr, timeStr] = [booking.date, booking.time];
  const d = new Date(dateStr);
  const [time, period] = timeStr.split(' ');
  const [hours, minutes] = time.split(':');
  let hour24 = parseInt(hours);
  if (period === 'PM' && hour24 !== 12) hour24 += 12;
  if (period === 'AM' && hour24 === 12) hour24 = 0;
  d.setHours(hour24, parseInt(minutes), 0, 0);
  return d;
}

type BarberTab = 'bookings' | 'calendar' | 'financial' | 'availability' | 'services' | 'reports';

const BarberDashboard: React.FC<{ onProfile: () => void }> = ({ onProfile }) => {
  const { t, user, language } = useApp();
  const [activeTab, setActiveTab] = useState<BarberTab>('bookings');
  const [now, setNow] = useState(() => new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [myRevenue, setMyRevenue] = useState({ day: 0, week: 0, month: 0, total: 0 });
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editError, setEditError] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addService, setAddService] = useState('');
  const [addDate, setAddDate] = useState('');
  const [addTime, setAddTime] = useState('');
  const [addError, setAddError] = useState('');
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [newBookingToast, setNewBookingToast] = useState(false);
  const previousBookingCount = useRef<number>(0);
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>('available');
  const [workingHours, setWorkingHours] = useState<WorkingHours | null>(null);
  const [customerNotes, setCustomerNotes] = useState<CustomerNote[]>([]);
  const [barberServices, setBarberServices] = useState<BarberService[]>([]);
  const [showWorkingHoursModal, setShowWorkingHoursModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [noteText, setNoteText] = useState('');
  const [selectedBookingForNote, setSelectedBookingForNote] = useState<Booking | null>(null);

  const branchName = useMemo(() => {
    const first = bookings.find(b => b.branchName);
    return first?.branchName || 'Olaya Main';
  }, [bookings]);

  const rescheduleDates = useMemo(() => {
    const arr: { iso: string; label: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const iso = `${y}-${m}-${day}`;
      const label = i === 0 ? t('today') : d.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' });
      arr.push({ iso, label });
    }
    return arr;
  }, [language, t]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const load = async () => {
    if (!user?.name) return;
    const data = await firebase.getBookings(undefined, user.name);
    const activeCount = data.filter(b => b.status === 'Pending' || b.status === 'Approved').length;
    if (previousBookingCount.current > 0 && activeCount > previousBookingCount.current) {
      setNewBookingToast(true);
      setTimeout(() => setNewBookingToast(false), 4000);
    }
    previousBookingCount.current = activeCount;
    setBookings([...data].reverse());
    
    const dayRev = await firebase.getBarberRevenue(user.name, 'day');
    const weekRev = await firebase.getBarberRevenue(user.name, 'week');
    const monthRev = await firebase.getBarberRevenue(user.name, 'month');
    
    // تحميل حالة التوفر
    const status = await firebase.getBarberAvailability(user.name);
    setAvailabilityStatus(status);
    
    // تحميل ساعات العمل
    const hours = await firebase.getWorkingHours(user.name);
    setWorkingHours(hours);
    
    // تحميل ملاحظات العملاء
    const notes = await firebase.getCustomerNotes(user.name);
    setCustomerNotes(notes);
    
    // تحميل الخدمات الشخصية
    const services = await firebase.getBarberServices(user.name);
    setBarberServices(services);
    const allApproved = data.filter(b => b.status === 'Approved');
    const totalRev = allApproved.reduce((sum, b) => sum + b.amount, 0);
    setMyRevenue({ day: dayRev, week: weekRev, month: monthRev, total: totalRev });
  };

  useEffect(() => { load(); }, [user]);

  const filteredBookings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return bookings.filter((b) => {
      const matchesStatus = statusFilter === 'All' || b.status === statusFilter;
      const searchable = `${b.userName} ${b.service} ${b.date} ${b.time}`.toLowerCase();
      const matchesQuery = !query || searchable.includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [bookings, searchQuery, statusFilter]);

  const kpi = useMemo(() => {
    return {
      total: bookings.length,
      pending: bookings.filter((b) => b.status === 'Pending').length,
      approved: bookings.filter((b) => b.status === 'Approved').length,
      completed: bookings.filter((b) => b.status === 'Approved').length,
    };
  }, [bookings]);

  const upcomingBookings = useMemo(() => {
    const now = new Date();
    return bookings
      .filter((b) => b.status === 'Approved' && getBookingDateTime(b) > now)
      .sort((a, b) => getBookingDateTime(a).getTime() - getBookingDateTime(b).getTime())
      .slice(0, 5);
  }, [bookings]);

  const weekDaysWithBookings = useMemo(() => {
    const days: { iso: string; label: string; bookings: Booking[] }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const iso = `${y}-${m}-${day}`;
      const label = i === 0 ? t('today') : d.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' });
      const dayBookings = bookings
        .filter((b) => b.date === iso && b.status !== 'Rejected')
        .sort((a, b) => getBookingDateTime(a).getTime() - getBookingDateTime(b).getTime());
      days.push({ iso, label, bookings: dayBookings });
    }
    return days;
  }, [bookings, language, t]);

  const handleStatus = async (id: string, status: 'Approved' | 'Rejected') => {
    await firebase.updateBookingStatus(id, status);
    load();
  };

  return (
    <div className="h-full bg-[#050505] flex flex-col animate-in fade-in duration-500 overflow-hidden">
      <header className="px-8 pt-16 pb-6 border-b border-white/5 flex justify-between items-center bg-black/40 backdrop-blur-xl transition-colors duration-200">
        <h1 className="text-xl font-black text-primary uppercase tracking-widest">
          {t('barber_panel')}
        </h1>
        <button onClick={onProfile} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
          <span className="material-icons-round text-white">settings</span>
        </button>
      </header>

      {newBookingToast && (
        <div className="mx-6 mt-2 py-3 px-4 bg-primary/20 border border-primary rounded-2xl flex items-center gap-2 animate-in slide-in-from-top duration-300">
          <span className="material-icons-round text-primary">notifications_active</span>
          <span className="text-primary font-black text-xs uppercase">{t('new_booking_notify')}</span>
        </div>
      )}

      <div className="flex border-b border-white/5 px-6 overflow-x-auto hide-scrollbar">
        <div className="flex flex-nowrap min-w-0">
          {([
            { id: 'bookings' as BarberTab, label: t('bookings') },
            { id: 'calendar' as BarberTab, label: t('calendar_week') },
            { id: 'financial' as BarberTab, label: t('financial') },
            { id: 'availability' as BarberTab, label: language === 'ar' ? 'الحالة' : 'Availability' },
            { id: 'services' as BarberTab, label: language === 'ar' ? 'الخدمات' : 'Services' },
            { id: 'reports' as BarberTab, label: language === 'ar' ? 'التقارير' : 'Reports' },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-6 py-4 text-sm font-black uppercase tracking-widest transition-all duration-200 border-b-2 ${
                activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-white/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto hide-scrollbar p-6 space-y-6">
        {activeTab === 'bookings' && (
          <>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              setShowAddModal(true);
              setAddName('');
              setAddPhone('');
              setAddService(BARBER_SERVICES[0]?.id ?? '1');
              const d = new Date();
              const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
              setAddDate(`${y}-${m}-${day}`);
              setAddTime('');
              setAddError('');
            }}
            className="px-4 py-2 bg-primary text-black font-black rounded-xl text-[10px] uppercase tracking-widest"
          >
            {t('add_booking')}
          </button>
        </div>

        {/* مواعيد الزبائن القادمة */}
        <section className="space-y-3">
          <h2 className="text-primary font-black text-sm uppercase tracking-widest mb-3">
            {t('upcoming_appointments')}
          </h2>
          {upcomingBookings.length === 0 ? (
            <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 text-center">
              <span className="material-icons-round text-gray-500 text-3xl">event_available</span>
              <p className="text-gray-500 text-sm font-bold">{t('no_upcoming_appointments')}</p>
            </div>
          ) : (
            upcomingBookings.map((booking, index) => {
              const bookingDate = getBookingDateTime(booking);
              const diffMs = bookingDate.getTime() - now.getTime();
              const isNowOrSoon = diffMs <= 5 * 60 * 1000; // الآن أو خلال 5 دقائق
              return (
                <div
                  key={booking.id}
                  className={`rounded-2xl p-4 border ${
                    isNowOrSoon
                      ? 'bg-primary/20 border-primary ring-2 ring-primary/50'
                      : index === 0
                        ? 'bg-primary/10 border-primary/30'
                        : 'bg-[#0D0D0D] border-primary/20'
                  }`}
                >
                  {isNowOrSoon && (
                    <p className="text-primary text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-1">
                      <span className="material-icons-round text-sm">notifications_active</span>
                      {t('appointment_now')}
                    </p>
                  )}
                  {!isNowOrSoon && index === 0 && (
                    <p className="text-primary text-[10px] font-black uppercase tracking-widest mb-2">
                      {t('next_appointment')}
                    </p>
                  )}
                  <BookingCountdown booking={booking} />
                  <div className="mt-2 pt-2 border-t border-white/5">
                    <p className="text-white text-xs font-bold">{booking.userName}</p>
                    <p className="text-primary/70 text-[10px]">{booking.service}</p>
                    <p className="text-gray-500 text-[9px] mt-1">{booking.date} • {booking.time}</p>
                  </div>
                </div>
              );
            })
          )}
        </section>

        {/* البحث والفلترة */}
        <section className="space-y-3">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-primary transition-all"
            placeholder={t('search_bookings')}
          />
          <div className="flex gap-2 overflow-x-auto hide-scrollbar">
            {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  statusFilter === status ? 'bg-primary text-black' : 'bg-white/5 text-gray-300 border border-white/10'
                }`}
              >
                {status === 'All' ? t('all') : t(status.toLowerCase() as 'pending' | 'approved' | 'rejected')}
              </button>
            ))}
          </div>
        </section>

        {/* قائمة الحجوزات */}
        {filteredBookings.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-700 font-black uppercase tracking-widest italic">
            {t('no_appointments')}
          </div>
        ) : (
          filteredBookings.map(b => (
            <div key={b.id} className="bg-[#0D0D0D] border border-white/5 rounded-[40px] p-6 shadow-2xl space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-white font-black text-lg">{b.userName}</h4>
                  <p className="text-primary text-[10px] font-black uppercase tracking-widest">{b.date} • {b.time}</p>
                </div>
                <span className={`px-4 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                   b.status === 'Pending' ? 'bg-yellow-500 text-black' : 
                   b.status === 'Approved' ? 'bg-green-500 text-black' : 'bg-red-500 text-white'
                }`}>
                  {t(b.status.toLowerCase() as 'pending' | 'approved' | 'rejected')}
                </span>
              </div>

              <div className="p-4 bg-white/5 rounded-3xl border border-white/5 flex justify-between items-center">
                 <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest">{t('service')}</span>
                 <span className="text-white font-bold text-sm">{b.service}</span>
              </div>

              <div className="p-4 bg-primary/10 rounded-3xl border border-primary/20 flex justify-between items-center">
                 <span className="text-primary/70 text-[10px] font-black uppercase tracking-widest">{t('amount')}</span>
                 <span className="text-primary font-black text-lg">{b.amount} {t('currency')}</span>
              </div>

              {b.receiptUrl && (
                <button onClick={() => setSelectedReceipt(b.receiptUrl!)} className="w-full py-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                  <span className="material-icons-round text-primary">receipt_long</span>
                  <span className="text-primary text-[10px] font-black uppercase tracking-widest">{t('view_receipt')}</span>
                </button>
              )}

              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setEditBooking(b);
                    setEditDate(b.date);
                    setEditTime(b.time);
                    setEditError('');
                  }}
                  className="py-2 px-3 rounded-xl border border-primary/30 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/10"
                >
                  {t('reschedule_booking')}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(b.id)}
                  className="py-2 px-3 rounded-xl border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10"
                >
                  {t('delete_booking')}
                </button>
              </div>
              {b.status === 'Pending' && (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleStatus(b.id, 'Approved')}
                    className="flex-1 py-4 bg-green-500 text-black font-black rounded-2xl text-[10px] uppercase shadow-lg shadow-green-500/20 active:scale-95 active:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-[#0D0D0D] transition-all"
                  >
                    {t('approve')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatus(b.id, 'Rejected')}
                    className="flex-1 py-4 bg-red-500/10 text-red-500 border border-red-500/20 font-black rounded-2xl text-[10px] uppercase active:scale-95 transition-all"
                  >
                    {t('reject')}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
          </>
        )}

        {activeTab === 'calendar' && (
          <section className="space-y-4">
            <h2 className="text-primary font-black text-sm uppercase tracking-widest mb-3">
              {t('calendar_week')}
            </h2>
            {weekDaysWithBookings.map(({ iso, label, bookings: dayBookings }) => (
              <div key={iso} className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-4">
                <p className="text-primary font-black text-xs uppercase tracking-widest mb-3">{label}</p>
                {dayBookings.length === 0 ? (
                  <p className="text-gray-500 text-[10px] font-bold">{t('no_upcoming_appointments')}</p>
                ) : (
                  <div className="space-y-2">
                    {dayBookings.map((b) => (
                      <div key={b.id} className="flex justify-between items-center py-2 border-t border-white/5 first:border-t-0">
                        <span className="text-white text-xs font-bold">{b.userName}</span>
                        <span className="text-primary/80 text-[10px] font-bold">{b.time}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        {activeTab === 'financial' && (
          <>
        {/* قسم الأرباح */}
        <section className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-[32px] p-6 border border-primary/20">
          <h2 className="text-primary font-black text-lg mb-4">{t('my_revenue')}</h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-black/30 rounded-2xl p-3">
              <p className="text-primary/70 text-[10px] mb-1">{t('today')}</p>
              <p className="text-white font-black text-xl">{myRevenue.day} {t('currency')}</p>
            </div>
            <div className="bg-black/30 rounded-2xl p-3">
              <p className="text-primary/70 text-[10px] mb-1">{t('this_week')}</p>
              <p className="text-white font-black text-xl">{myRevenue.week} {t('currency')}</p>
            </div>
            <div className="bg-black/30 rounded-2xl p-3">
              <p className="text-primary/70 text-[10px] mb-1">{t('this_month')}</p>
              <p className="text-white font-black text-xl">{myRevenue.month} {t('currency')}</p>
            </div>
            <div className="bg-primary/20 rounded-2xl p-3 border border-primary/30">
              <p className="text-primary text-[10px] mb-1 font-black">{t('total_revenue')}</p>
              <p className="text-white font-black text-xl">{myRevenue.total} {t('currency')}</p>
            </div>
          </div>
          <div className="text-center pt-2 border-t border-primary/10">
            <p className="text-primary/60 text-[10px]">
              {kpi.completed} {t('completed_services')}
            </p>
          </div>
        </section>

        {/* إحصائيات سريعة */}
        <section className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <p className="text-gray-400 text-[10px]">{t('total_bookings')}</p>
            <p className="text-white font-black text-xl">{kpi.total}</p>
          </div>
          <div className="bg-yellow-500/10 rounded-2xl p-3 border border-yellow-500/20">
            <p className="text-yellow-300 text-[10px]">{t('pending_bookings')}</p>
            <p className="text-yellow-300 font-black text-xl">{kpi.pending}</p>
          </div>
        </section>
          </>
        )}

        {activeTab === 'availability' && (
          <section className="space-y-6">
            <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-6">
              <h3 className="text-white font-black text-lg mb-4">{language === 'ar' ? 'حالة التوفر' : 'Availability Status'}</h3>
              <div className="flex gap-3 mb-6">
                {(['available', 'busy', 'unavailable'] as AvailabilityStatus[]).map(status => (
                  <button
                    key={status}
                    onClick={async () => {
                      if (user?.name) {
                        await firebase.setBarberAvailability(user.name, status);
                        setAvailabilityStatus(status);
                      }
                    }}
                    className={`flex-1 py-3 rounded-xl font-black text-sm uppercase ${
                      availabilityStatus === status
                        ? status === 'available' ? 'bg-green-500 text-black' :
                          status === 'busy' ? 'bg-yellow-500 text-black' :
                          'bg-red-500 text-white'
                        : 'bg-white/5 text-white/50 border border-white/10'
                    }`}
                  >
                    {status === 'available' ? (language === 'ar' ? 'متاح' : 'Available') :
                     status === 'busy' ? (language === 'ar' ? 'مشغول' : 'Busy') :
                     (language === 'ar' ? 'غير متاح' : 'Unavailable')}
                  </button>
                ))}
              </div>
              
              <div className="border-t border-white/10 pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-white font-black">{language === 'ar' ? 'ساعات العمل' : 'Working Hours'}</h4>
                  <button
                    onClick={() => setShowWorkingHoursModal(true)}
                    className="px-4 py-2 bg-primary text-black font-black rounded-xl text-xs uppercase"
                  >
                    {language === 'ar' ? 'تعديل' : 'Edit'}
                  </button>
                </div>
                {workingHours ? (
                  <div className="space-y-2">
                    {(Object.entries(workingHours.days) as [string, WorkingHours['days'][string]][]).map(([day, hours]) => (
                      hours.enabled && (
                        <div key={day} className="flex justify-between items-center text-sm">
                          <span className="text-white/80">{language === 'ar' ? 
                            day === 'monday' ? 'الاثنين' : day === 'tuesday' ? 'الثلاثاء' : day === 'wednesday' ? 'الأربعاء' :
                            day === 'thursday' ? 'الخميس' : day === 'friday' ? 'الجمعة' : day === 'saturday' ? 'السبت' : 'الأحد'
                            : day.charAt(0).toUpperCase() + day.slice(1)}</span>
                          <span className="text-primary">{hours.startTime} - {hours.endTime}</span>
                        </div>
                      )
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">{language === 'ar' ? 'لم يتم تحديد ساعات العمل' : 'No working hours set'}</p>
                )}
              </div>
            </div>

            {/* ملاحظات العملاء */}
            <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-black text-lg">{language === 'ar' ? 'ملاحظات العملاء' : 'Customer Notes'}</h3>
                <button
                  onClick={() => {
                    setSelectedBookingForNote(null);
                    setNoteText('');
                    setShowNoteModal(true);
                  }}
                  className="px-4 py-2 bg-primary text-black font-black rounded-xl text-xs uppercase"
                >
                  {language === 'ar' ? 'إضافة ملاحظة' : 'Add Note'}
                </button>
              </div>
              {customerNotes.length === 0 ? (
                <p className="text-gray-500 text-sm">{language === 'ar' ? 'لا توجد ملاحظات' : 'No notes'}</p>
              ) : (
                <div className="space-y-3">
                  {customerNotes.slice(0, 5).map(note => (
                    <div key={note.id} className="bg-white/5 rounded-xl p-3">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-white font-bold text-sm">{note.userName}</span>
                        <button
                          onClick={async () => {
                            await firebase.deleteCustomerNote(note.id);
                            load();
                          }}
                          className="text-red-400 text-xs"
                        >
                          {language === 'ar' ? 'حذف' : 'Delete'}
                        </button>
                      </div>
                      <p className="text-white/70 text-xs">{note.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'services' && (
          <section className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-white font-black text-lg">{language === 'ar' ? 'الخدمات الشخصية' : 'Personal Services'}</h3>
              <button
                onClick={() => {/* إضافة خدمة جديدة */}}
                className="px-4 py-2 bg-primary text-black font-black rounded-xl text-xs uppercase"
              >
                {language === 'ar' ? 'إضافة' : 'Add'}
              </button>
            </div>
            {barberServices.length === 0 ? (
              <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-6 text-center">
                <p className="text-gray-500">{language === 'ar' ? 'لا توجد خدمات' : 'No services'}</p>
              </div>
            ) : (
              barberServices.map(service => (
                <div key={service.id} className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-4 flex justify-between items-center">
                  <div>
                    <h4 className="text-white font-black">{language === 'ar' ? service.nameAr : service.nameEn}</h4>
                    <p className="text-primary text-sm">{service.price} {t('currency')} • {service.duration} {language === 'ar' ? 'دقيقة' : 'min'}</p>
                  </div>
                </div>
              ))
            )}
          </section>
        )}

        {activeTab === 'reports' && (
          <section className="space-y-6">
            <h3 className="text-white font-black text-lg">{language === 'ar' ? 'التقارير والإحصائيات' : 'Reports & Statistics'}</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={async () => {
                  if (user?.name) {
                    const today = new Date().toISOString().split('T')[0];
                    const report = await firebase.generateBarberReport(user.name, 'day', today);
                    const message = language === 'ar' 
                      ? `التقرير اليومي:\nالحجوزات: ${report.totalBookings}\nالمكتملة: ${report.completedBookings}\nالإيرادات: ${report.totalRevenue} ريال\nالتقييم: ${report.averageRating.toFixed(1)}`
                      : `Daily Report:\nBookings: ${report.totalBookings}\nCompleted: ${report.completedBookings}\nRevenue: ${report.totalRevenue} SAR\nRating: ${report.averageRating.toFixed(1)}`;
                    alert(message);
                  }
                }}
                className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-4 text-center"
              >
                <span className="material-icons-round text-primary text-3xl mb-2">today</span>
                <p className="text-white font-black">{language === 'ar' ? 'تقرير اليوم' : 'Today'}</p>
              </button>
              <button
                onClick={async () => {
                  if (user?.name) {
                    const today = new Date().toISOString().split('T')[0];
                    const report = await firebase.generateBarberReport(user.name, 'week', today);
                    const message = language === 'ar' 
                      ? `تقرير الأسبوع:\nالحجوزات: ${report.totalBookings}\nالمكتملة: ${report.completedBookings}\nالإيرادات: ${report.totalRevenue} ريال\nالتقييم: ${report.averageRating.toFixed(1)}`
                      : `Weekly Report:\nBookings: ${report.totalBookings}\nCompleted: ${report.completedBookings}\nRevenue: ${report.totalRevenue} SAR\nRating: ${report.averageRating.toFixed(1)}`;
                    alert(message);
                  }
                }}
                className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-4 text-center"
              >
                <span className="material-icons-round text-primary text-3xl mb-2">date_range</span>
                <p className="text-white font-black">{language === 'ar' ? 'تقرير الأسبوع' : 'This Week'}</p>
              </button>
              <button
                onClick={async () => {
                  if (user?.name) {
                    const today = new Date().toISOString().split('T')[0];
                    const report = await firebase.generateBarberReport(user.name, 'month', today);
                    const message = language === 'ar' 
                      ? `تقرير الشهر:\nالحجوزات: ${report.totalBookings}\nالمكتملة: ${report.completedBookings}\nالإيرادات: ${report.totalRevenue} ريال\nالتقييم: ${report.averageRating.toFixed(1)}\nأوقات الذروة: ${report.peakHours.map(h => h.hour).join(', ')}`
                      : `Monthly Report:\nBookings: ${report.totalBookings}\nCompleted: ${report.completedBookings}\nRevenue: ${report.totalRevenue} SAR\nRating: ${report.averageRating.toFixed(1)}\nPeak Hours: ${report.peakHours.map(h => h.hour).join(', ')}`;
                    alert(message);
                  }
                }}
                className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-4 text-center"
              >
                <span className="material-icons-round text-primary text-3xl mb-2">calendar_month</span>
                <p className="text-white font-black">{language === 'ar' ? 'تقرير الشهر' : 'This Month'}</p>
              </button>
            </div>
          </section>
        )}
      </main>

      {selectedReceipt && (
        <div className="fixed inset-0 z-[1000] bg-black/95 flex items-center justify-center p-8 modal-overlay-enter" onClick={() => setSelectedReceipt(null)}>
          <div className="modal-content-enter" onClick={e => e.stopPropagation()}>
           <img src={selectedReceipt} className="max-w-full max-h-[80vh] object-contain rounded-3xl shadow-2xl" />
          </div>
        </div>
      )}

      {/* منبثقة ساعات العمل */}
      {showWorkingHoursModal && (
        <div className="fixed inset-0 z-[600] bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4 modal-overlay-enter" onClick={() => setShowWorkingHoursModal(false)}>
          <div className="w-full max-w-md bg-[#0d0d0d] rounded-t-3xl sm:rounded-3xl border-t sm:border border-white/10 p-6 max-h-[85vh] overflow-y-auto modal-content-enter" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-black text-lg mb-4">{language === 'ar' ? 'ساعات العمل' : 'Working Hours'}</h3>
            <div className="space-y-4">
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                const dayHours = workingHours?.days[day] || { enabled: false, startTime: '09:00', endTime: '18:00' };
                return (
                  <div key={day} className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-white font-bold">
                        {language === 'ar' ? 
                          day === 'monday' ? 'الاثنين' : day === 'tuesday' ? 'الثلاثاء' : day === 'wednesday' ? 'الأربعاء' :
                          day === 'thursday' ? 'الخميس' : day === 'friday' ? 'الجمعة' : day === 'saturday' ? 'السبت' : 'الأحد'
                          : day.charAt(0).toUpperCase() + day.slice(1)}
                      </label>
                      <input
                        type="checkbox"
                        checked={dayHours.enabled}
                        onChange={(e) => {
                          if (!workingHours) {
                            const newHours: WorkingHours = {
                              barberId: user?.name || '',
                              days: { [day]: { enabled: e.target.checked, startTime: '09:00', endTime: '18:00' } },
                              updatedAt: Date.now()
                            };
                            setWorkingHours(newHours);
                          } else {
                            setWorkingHours({
                              ...workingHours,
                              days: {
                                ...workingHours.days,
                                [day]: { ...dayHours, enabled: e.target.checked }
                              }
                            });
                          }
                        }}
                        className="rounded border-white/20 text-primary bg-white/5"
                      />
                    </div>
                    {dayHours.enabled && (
                      <div className="flex gap-2">
                        <input
                          type="time"
                          value={dayHours.startTime}
                          onChange={(e) => {
                            if (workingHours) {
                              setWorkingHours({
                                ...workingHours,
                                days: {
                                  ...workingHours.days,
                                  [day]: { ...dayHours, startTime: e.target.value }
                                }
                              });
                            }
                          }}
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                        />
                        <span className="text-white/50 self-center">-</span>
                        <input
                          type="time"
                          value={dayHours.endTime}
                          onChange={(e) => {
                            if (workingHours) {
                              setWorkingHours({
                                ...workingHours,
                                days: {
                                  ...workingHours.days,
                                  [day]: { ...dayHours, endTime: e.target.value }
                                }
                              });
                            }
                          }}
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowWorkingHoursModal(false)}
                className="flex-1 py-3 rounded-2xl border border-white/10 text-white/80 font-bold"
              >
                {t('back')}
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (user?.name && workingHours) {
                    await firebase.setWorkingHours(user.name, workingHours.days);
                    setShowWorkingHoursModal(false);
                    load();
                  }
                }}
                className="flex-1 py-3 rounded-2xl bg-primary text-black font-black"
              >
                {language === 'ar' ? 'حفظ' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* منبثقة إضافة ملاحظة */}
      {showNoteModal && (
        <div className="fixed inset-0 z-[600] bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4 modal-overlay-enter" onClick={() => setShowNoteModal(false)}>
          <div className="w-full max-w-md bg-[#0d0d0d] rounded-t-3xl sm:rounded-3xl border-t sm:border border-white/10 p-6 max-h-[85vh] overflow-y-auto modal-content-enter" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-black text-lg mb-4">{language === 'ar' ? 'إضافة ملاحظة' : 'Add Note'}</h3>
            {selectedBookingForNote ? (
              <div className="mb-4">
                <p className="text-white/80 text-sm mb-2">{selectedBookingForNote.userName}</p>
                <p className="text-primary text-xs">{selectedBookingForNote.service}</p>
              </div>
            ) : (
              <input
                type="text"
                placeholder={language === 'ar' ? 'اسم العميل' : 'Customer Name'}
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white mb-4"
              />
            )}
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder={language === 'ar' ? 'اكتب الملاحظة...' : 'Write note...'}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white min-h-[120px] mb-4"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowNoteModal(false);
                  setNoteText('');
                  setSelectedUserId('');
                  setSelectedBookingForNote(null);
                }}
                className="flex-1 py-3 rounded-2xl border border-white/10 text-white/80 font-bold"
              >
                {t('back')}
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (user?.name && noteText.trim()) {
                    const userId = selectedBookingForNote?.userId || selectedUserId;
                    const userName = selectedBookingForNote?.userName || selectedUserId;
                    await firebase.addCustomerNote(user.name, userId, userName, noteText.trim());
                    setShowNoteModal(false);
                    setNoteText('');
                    setSelectedUserId('');
                    setSelectedBookingForNote(null);
                    load();
                  }
                }}
                disabled={!noteText.trim()}
                className="flex-1 py-3 rounded-2xl bg-primary text-black font-black disabled:opacity-50"
              >
                {language === 'ar' ? 'حفظ' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* منبثقة تعديل الموعد */}
      {editBooking && (
        <div className="fixed inset-0 z-[600] bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4 modal-overlay-enter" onClick={() => setEditBooking(null)}>
          <div className="w-full max-w-md bg-[#0d0d0d] rounded-t-3xl sm:rounded-3xl border-t sm:border border-white/10 p-6 max-h-[85vh] overflow-y-auto modal-content-enter" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-black text-lg mb-4">{t('reschedule_booking')} — {editBooking.userName}</h3>
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
              {rescheduleDates.map(({ iso, label }) => (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setEditDate(iso)}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold ${editDate === iso ? 'bg-primary text-black' : 'bg-white/5 text-white/80 border border-white/10'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2 mb-6">
              {RESCHEDULE_TIME_SLOTS.map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => setEditTime(time)}
                  className={`py-2 rounded-xl text-xs font-bold ${editTime === time ? 'bg-primary text-black' : 'bg-white/5 text-white/80 border border-white/10'}`}
                >
                  {time}
                </button>
              ))}
            </div>
            {editError && <p className="text-red-400 text-xs mb-4">{editError}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setEditBooking(null)} className="flex-1 py-3 rounded-2xl border border-white/10 text-white/80 font-bold">{t('back')}</button>
              <button
                type="button"
                disabled={!editDate || !editTime || editSubmitting}
                onClick={async () => {
                  if (!editDate || !editTime) return;
                  setEditError('');
                  setEditSubmitting(true);
                  const result = await firebase.adminRescheduleBooking(editBooking.id, editDate, editTime);
                  setEditSubmitting(false);
                  if (result.ok) { load(); setEditBooking(null); } else {
                    if (result.error === 'SLOT_TAKEN') setEditError(t('slot_taken'));
                    else setEditError(language === 'ar' ? 'حدث خطأ' : 'Something went wrong');
                  }
                }}
                className="flex-1 py-3 rounded-2xl bg-primary text-black font-black disabled:opacity-50"
              >
                {editSubmitting ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'تأكيد' : 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* تأكيد الحذف */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[600] bg-black/80 flex items-center justify-center p-4 modal-overlay-enter" onClick={() => setDeleteConfirmId(null)}>
          <div className="w-full max-w-sm bg-[#0d0d0d] rounded-2xl border border-white/10 p-6 modal-content-enter" onClick={e => e.stopPropagation()}>
            <p className="text-white font-bold mb-6">{t('confirm_delete_booking')}</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setDeleteConfirmId(null)} className="flex-1 py-3 rounded-2xl border border-white/10 text-white/80 font-bold">{t('back')}</button>
              <button
                type="button"
                onClick={async () => {
                  await firebase.cancelBooking(deleteConfirmId!);
                  load();
                  setDeleteConfirmId(null);
                }}
                className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-black"
              >
                {t('delete_booking')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* منبثقة إضافة موعد */}
      {showAddModal && (
        <div className="fixed inset-0 z-[600] bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowAddModal(false)}>
          <div className="w-full max-w-md bg-[#0d0d0d] rounded-t-3xl sm:rounded-3xl border-t sm:border border-white/10 p-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-black text-lg mb-4">{t('add_booking')}</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-white/60 text-[10px] font-bold uppercase mb-1">{t('client_name')}</label>
                <input value={addName} onChange={e => setAddName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" placeholder={language === 'ar' ? 'اسم الزبون' : 'Client name'} />
              </div>
              <div>
                <label className="block text-white/60 text-[10px] font-bold uppercase mb-1">{t('client_phone')}</label>
                <input value={addPhone} onChange={e => setAddPhone(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" placeholder="05xxxxxxxx" />
              </div>
              <div>
                <label className="block text-white/60 text-[10px] font-bold uppercase mb-1">{t('service')}</label>
                <select value={addService} onChange={e => setAddService(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white">
                  {BARBER_SERVICES.map(s => (
                    <option key={s.id} value={s.id} className="bg-[#0d0d0d]">{language === 'ar' ? s.nameAr : s.nameEn}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {rescheduleDates.map(({ iso, label }) => (
                  <button key={iso} type="button" onClick={() => setAddDate(iso)} className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold ${addDate === iso ? 'bg-primary text-black' : 'bg-white/5 text-white/80 border border-white/10'}`}>{label}</button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {RESCHEDULE_TIME_SLOTS.map((time) => (
                  <button key={time} type="button" onClick={() => setAddTime(time)} className={`py-2 rounded-xl text-xs font-bold ${addTime === time ? 'bg-primary text-black' : 'bg-white/5 text-white/80 border border-white/10'}`}>{time}</button>
                ))}
              </div>
            </div>
            {addError && <p className="text-red-400 text-xs mb-4">{addError}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 rounded-2xl border border-white/10 text-white/80 font-bold">{t('back')}</button>
              <button
                type="button"
                disabled={!addName.trim() || !addDate || !addTime || addSubmitting}
                onClick={async () => {
                  if (!user?.name || !addName.trim() || !addDate || !addTime) return;
                  setAddError('');
                  setAddSubmitting(true);
                  const serviceName = BARBER_SERVICES.find(s => s.id === addService);
                  const result = await firebase.createBookingByBarber({
                    barberId: user.name,
                    branchName,
                    userName: addName.trim(),
                    userPhone: addPhone.trim() || undefined,
                    service: serviceName ? (language === 'ar' ? serviceName.nameAr : serviceName.nameEn) : addService,
                    date: addDate,
                    time: addTime,
                  });
                  setAddSubmitting(false);
                  if (result.ok) { load(); setShowAddModal(false); } else {
                    if (result.error === 'SLOT_TAKEN') setAddError(t('slot_taken'));
                    else setAddError(language === 'ar' ? 'حدث خطأ' : 'Something went wrong');
                  }
                }}
                className="flex-1 py-3 rounded-2xl bg-primary text-black font-black disabled:opacity-50"
              >
                {addSubmitting ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'تأكيد' : 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BarberDashboard;
