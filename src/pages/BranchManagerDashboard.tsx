
import React, { useState, useEffect, useMemo } from 'react';
import { firebase } from '../services/FirebaseMock';
import { Booking, FinancialRecord, BranchService, User } from '../types';
import { useApp } from '../app/App';
import ExpenseForm from '../components/ExpenseForm';
import BookingCountdown from '../components/BookingCountdown';

const RESCHEDULE_TIME_SLOTS = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
  '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM'
];

type Tab = 'bookings' | 'performance' | 'financial' | 'services' | 'barbers' | 'coupons' | 'analytics' | 'settings' | 'backup';

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

const BranchManagerDashboard: React.FC<{ onProfile: () => void }> = ({ onProfile }) => {
  const { t, user, language } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>('bookings');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [dateFilterToday, setDateFilterToday] = useState(false);
  const [barberPerformance, setBarberPerformance] = useState<Array<{
    barberId: string;
    barberName: string;
    totalBookings: number;
    approvedBookings: number;
    rejectedBookings: number;
    totalRevenue: number;
    acceptanceRate: number;
  }>>([]);
  const [profitLoss, setProfitLoss] = useState({ revenue: 0, expenses: 0, profit: 0, profitMargin: 0 });
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [adminRescheduleBooking, setAdminRescheduleBooking] = useState<Booking | null>(null);
  const [adminRescheduleDate, setAdminRescheduleDate] = useState('');
  const [adminRescheduleTime, setAdminRescheduleTime] = useState('');
  const [adminRescheduleError, setAdminRescheduleError] = useState('');
  const [adminRescheduleSubmitting, setAdminRescheduleSubmitting] = useState(false);
  const [branchServices, setBranchServices] = useState<BranchService[]>([]);
  const [newServiceNameAr, setNewServiceNameAr] = useState('');
  const [newServiceNameEn, setNewServiceNameEn] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [barbers, setBarbers] = useState<User[]>([]);
  const [showBulkNotificationModal, setShowBulkNotificationModal] = useState(false);
  const [bulkNotificationTitle, setBulkNotificationTitle] = useState('');
  const [bulkNotificationMessage, setBulkNotificationMessage] = useState('');
  const [bulkNotificationTarget, setBulkNotificationTarget] = useState<'all' | 'customers' | 'barbers'>('all');
  const [bulkNotifications, setBulkNotifications] = useState<any[]>([]);
  const [allCoupons, setAllCoupons] = useState<any[]>([]);

  const branchId = user?.branchId || 'Olaya Main';
  const BRANCH_OPTIONS = ['Olaya Main', 'Tahlia Branch', 'Nakheel Mall'];

  const adminRescheduleDates = useMemo(() => {
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

  const load = async () => {
    const allBookings = await firebase.getBookings();
    const branchBookings = allBookings.filter(b => b.branchName === branchId);
    setBookings([...branchBookings].reverse());

    const records = await firebase.getFinancialRecords(branchId);
    setFinancialRecords(records);

    const performance = await firebase.getBarberPerformance(branchId);
    setBarberPerformance(performance);

    const pl = await firebase.calculateProfitLoss(branchId, 'month');
    setProfitLoss(pl);

    const services = await firebase.getBranchServices(branchId);
    setBranchServices(services);

    const barberList = await firebase.getBarbers();
    setBarbers(barberList);

    const notifications = await firebase.getBulkNotifications(branchId);
    setBulkNotifications(notifications);

    const coupons = await firebase.getAllCoupons(branchId);
    setAllCoupons(coupons);
  };

  useEffect(() => { load(); }, [user, branchId]);

  const filteredBookings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const today = new Date().toISOString().split('T')[0];
    return bookings.filter((b) => {
      const matchesStatus = statusFilter === 'All' || b.status === statusFilter;
      const matchesDate = !dateFilterToday || b.date === today;
      const searchable = `${b.userName} ${b.service} ${b.date} ${b.time}`.toLowerCase();
      const matchesQuery = !query || searchable.includes(query);
      return matchesStatus && matchesDate && matchesQuery;
    });
  }, [bookings, searchQuery, statusFilter, dateFilterToday]);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayBookings = useMemo(() => {
    return bookings
      .filter((b) => b.date === todayStr && (b.status === 'Approved' || b.status === 'Pending'))
      .sort((a, b) => getBookingDateTime(a).getTime() - getBookingDateTime(b).getTime());
  }, [bookings, todayStr]);

  const kpi = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);
    const weekStart = thisWeek.toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    return {
      today: bookings.filter(b => b.date === today).length,
      week: bookings.filter(b => b.date >= weekStart).length,
      month: bookings.filter(b => b.date >= monthStart).length,
      totalRevenue: bookings.filter(b => b.status === 'Approved').reduce((sum, b) => sum + b.amount, 0),
      activeBarbers: new Set(bookings.map(b => b.barberId)).size,
    };
  }, [bookings]);

  const handleStatus = async (id: string, status: 'Approved' | 'Rejected') => {
    await firebase.updateBookingStatus(id, status);
    load();
  };

  const handleAddExpense = async (expense: Omit<FinancialRecord, 'id' | 'createdAt'>) => {
    await firebase.createFinancialRecord(expense);
    load();
  };

  return (
    <div className="h-full bg-[#050505] flex flex-col animate-in fade-in duration-500 overflow-hidden">
      <header className="px-8 pt-16 pb-6 border-b border-white/5 flex justify-between items-center bg-black/40 backdrop-blur-xl">
        <h1 className="text-xl font-black text-primary uppercase tracking-widest">
          {t('branch_manager')}
        </h1>
        <button onClick={onProfile} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
          <span className="material-icons-round text-white">settings</span>
        </button>
      </header>

      {/* التبويبات */}
      <div className="flex border-b border-white/5 px-6 overflow-x-auto hide-scrollbar" style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}>
        <div className="flex flex-nowrap min-w-0">
          {([
            { id: 'bookings' as Tab, label: t('bookings') },
            { id: 'performance' as Tab, label: t('performance') },
            { id: 'financial' as Tab, label: t('financial') },
            { id: 'services' as Tab, label: t('services_management') },
            { id: 'barbers' as Tab, label: t('barbers_management') },
            { id: 'coupons' as Tab, label: language === 'ar' ? 'الكوبونات' : 'Coupons' },
            { id: 'analytics' as Tab, label: language === 'ar' ? 'التحليلات' : 'Analytics' },
            { id: 'settings' as Tab, label: language === 'ar' ? 'الإعدادات' : 'Settings' },
            { id: 'backup' as Tab, label: language === 'ar' ? 'النسخ الاحتياطي' : 'Backup' },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-6 py-4 text-sm font-black uppercase tracking-widest transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto hide-scrollbar p-6 space-y-6">
        {/* محتوى التبويبات */}
        {activeTab === 'bookings' && (
          <>
            {/* لوحة التنبيهات — فقط في تبويب الحجوزات */}
            {(() => {
              const pendingCount = bookings.filter(b => b.status === 'Pending').length;
              const recentRejected = bookings.filter(b => b.status === 'Rejected').slice(0, 3).reverse();
              if (pendingCount === 0 && recentRejected.length === 0) return null;
              return (
                <section className="space-y-2">
                  <h3 className="text-primary/80 text-[10px] font-black uppercase tracking-widest">{t('alerts')}</h3>
                  {pendingCount > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex justify-between items-center">
                      <span className="text-amber-400 text-sm font-bold">{pendingCount} {t('pending_need_approval')}</span>
                      <button
                        type="button"
                        onClick={() => { setStatusFilter('Pending'); }}
                        className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase"
                      >
                        {t('view_pending')}
                      </button>
                    </div>
                  )}
                  {recentRejected.length > 0 && (
                    <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4">
                      <p className="text-red-400/90 text-[10px] font-black uppercase mb-2">{t('recent_cancellations')}</p>
                      <ul className="space-y-1">
                        {recentRejected.map((b) => (
                          <li key={b.id} className="text-white/70 text-xs">{b.userName} — {b.date} {b.time}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              );
            })()}
            
            {/* مواعيد اليوم — داخل تبويب الحجوزات فقط */}
            <section className="space-y-3">
              <h2 className="text-primary font-black text-sm uppercase tracking-widest mb-3">
                {t('today_appointments')}
              </h2>
              {todayBookings.length === 0 ? (
                <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 text-center">
                  <span className="material-icons-round text-gray-500 text-3xl">event_available</span>
                  <p className="text-gray-500 text-sm font-bold">{t('no_upcoming_appointments')}</p>
                </div>
              ) : (
                todayBookings.map((booking) => (
                  <div key={booking.id} className="bg-[#0D0D0D] border border-primary/20 rounded-2xl p-4">
                    <BookingCountdown booking={booking} labelNow={t('appointment_now_branch')} />
                    <div className="mt-2 pt-2 border-t border-white/5">
                      <p className="text-white text-xs font-bold">{booking.userName}</p>
                      <p className="text-primary/70 text-[10px]">{booking.barberId} • {booking.service}</p>
                      <p className="text-gray-500 text-[9px] mt-1">{booking.date} • {booking.time}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAdminRescheduleBooking(booking);
                        setAdminRescheduleDate(booking.date);
                        setAdminRescheduleTime(booking.time);
                        setAdminRescheduleError('');
                      }}
                      className="w-full mt-3 py-2 rounded-xl border border-primary/30 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 transition-all"
                    >
                      {t('reschedule_booking')}
                    </button>
                  </div>
                ))
              )}
            </section>

            <section className="space-y-3">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-primary transition-all"
                placeholder={t('search_bookings')}
              />
              <div className="flex gap-2 overflow-x-auto hide-scrollbar flex-wrap">
                <button
                  onClick={() => setDateFilterToday((v) => !v)}
                  className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    dateFilterToday ? 'bg-primary text-black' : 'bg-white/5 text-gray-300 border border-white/10'
                  }`}
                >
                  {t('filter_today')}
                </button>
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

                  {b.status === 'Pending' && (
                    <div className="flex gap-3">
                      <button onClick={() => handleStatus(b.id, 'Approved')} className="flex-1 py-4 bg-green-500 text-black font-black rounded-2xl text-[10px] uppercase shadow-lg shadow-green-500/20 active:scale-95 transition-all">
                        {t('approve')}
                      </button>
                      <button onClick={() => handleStatus(b.id, 'Rejected')} className="flex-1 py-4 bg-red-500/10 text-red-500 border border-red-500/20 font-black rounded-2xl text-[10px] uppercase active:scale-95 transition-all">
                        {t('reject')}
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </>
        )}

        {activeTab === 'performance' && (
          <section className="space-y-4">
            {barberPerformance.length === 0 ? (
              <div className="text-center text-gray-500 font-bold py-8">
                {t('no_performance_data')}
              </div>
            ) : (
              barberPerformance.map(barber => (
                <div key={barber.barberId} className="bg-[#0D0D0D] border border-white/5 rounded-[32px] p-6 space-y-4">
                  <h4 className="text-white font-black text-lg">{barber.barberName}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 rounded-2xl p-3">
                      <p className="text-gray-400 text-[10px]">{t('total_bookings_label')}</p>
                      <p className="text-white font-black text-xl">{barber.totalBookings}</p>
                    </div>
                    <div className="bg-green-500/10 rounded-2xl p-3 border border-green-500/20">
                      <p className="text-green-300 text-[10px]">{t('approved_bookings')}</p>
                      <p className="text-green-300 font-black text-xl">{barber.approvedBookings}</p>
                    </div>
                    <div className="bg-primary/10 rounded-2xl p-3 border border-primary/20">
                      <p className="text-primary/70 text-[10px]">{t('revenue')}</p>
                      <p className="text-primary font-black text-xl">{barber.totalRevenue} {t('currency')}</p>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-3">
                      <p className="text-gray-400 text-[10px]">{t('acceptance_rate')}</p>
                      <p className="text-white font-black text-xl">{barber.acceptanceRate.toFixed(0)}%</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </section>
        )}

        {activeTab === 'financial' && (
          <section className="space-y-6">
            {/* KPI Cards — داخل تبويب المالية فقط */}
            <section className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                <p className="text-gray-400 text-[10px]">{t('today')}</p>
                <p className="text-white font-black text-xl">{kpi.today}</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                <p className="text-gray-400 text-[10px]">{t('this_week')}</p>
                <p className="text-white font-black text-xl">{kpi.week}</p>
              </div>
              <div className="bg-primary/10 rounded-2xl p-3 border border-primary/20">
                <p className="text-primary/70 text-[10px]">{t('revenue')}</p>
                <p className="text-primary font-black text-xl">{kpi.totalRevenue} {t('currency')}</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                <p className="text-gray-400 text-[10px]">{t('active_barbers')}</p>
                <p className="text-white font-black text-xl">{kpi.activeBarbers}</p>
              </div>
            </section>

            {/* تقرير الإيرادات — تصدير وطباعة */}
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={async () => {
                  const reportData = await firebase.exportFinancialReport(branchId, 'pdf', 'month');
                  const blob = new Blob([reportData], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `financial-report-${branchId}-${new Date().toISOString().slice(0, 10)}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  alert(language === 'ar' ? 'تم تصدير التقرير' : 'Report exported');
                }}
                className="px-4 py-2 rounded-xl bg-primary text-black text-[10px] font-black uppercase"
              >
                {language === 'ar' ? 'تصدير PDF' : 'Export PDF'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  const reportData = await firebase.exportFinancialReport(branchId, 'excel', 'month');
                  const blob = new Blob([reportData], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `financial-report-${branchId}-${new Date().toISOString().slice(0, 10)}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  alert(language === 'ar' ? 'تم تصدير التقرير' : 'Report exported');
                }}
                className="px-4 py-2 rounded-xl border border-primary/30 text-primary text-[10px] font-black uppercase"
              >
                {language === 'ar' ? 'تصدير Excel' : 'Export Excel'}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-primary/20 border border-primary/30 text-primary text-[10px] font-black uppercase"
              >
                {t('print_report')}
              </button>
            </div>

            {/* P&L Summary */}
            <div id="revenue-report" className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-[32px] p-6 border border-primary/20">
              <h3 className="text-primary font-black text-lg mb-4">{t('profit_loss')}</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 text-sm">{t('revenue')}</span>
                  <span className="text-green-400 font-black text-lg">{profitLoss.revenue} {t('currency')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 text-sm">{t('expenses')}</span>
                  <span className="text-red-400 font-black text-lg">{profitLoss.expenses} {t('currency')}</span>
                </div>
                <div className="border-t border-primary/20 pt-3 flex justify-between items-center">
                  <span className="text-white font-black">{t('net_profit')}</span>
                  <span className={`font-black text-xl ${profitLoss.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {profitLoss.profit} {t('currency')}
                  </span>
                </div>
                <div className="text-center pt-2">
                  <span className="text-primary/60 text-xs">
                    {t('profit_margin')}: {profitLoss.profitMargin.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* المصاريف */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-black text-lg">{t('expenses')}</h3>
                <button
                  onClick={() => setShowExpenseForm(true)}
                  className="px-4 py-2 bg-primary text-black font-black rounded-full text-[10px] uppercase"
                >
                  {t('add_expense')}
                </button>
              </div>
              {financialRecords.filter(r => r.type === 'expense').length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  {t('no_expenses')}
                </div>
              ) : (
                financialRecords
                  .filter(r => r.type === 'expense')
                  .slice(0, 10)
                  .map(record => {
                    const categoryLabels: Record<string, string> = {
                      rent: language === 'ar' ? 'إيجار' : 'Rent',
                      utilities: language === 'ar' ? 'فواتير' : 'Utilities',
                      salary: language === 'ar' ? 'رواتب' : 'Salary',
                      supplies: language === 'ar' ? 'مستلزمات' : 'Supplies',
                      maintenance: language === 'ar' ? 'صيانة' : 'Maintenance',
                    };
                    return (
                      <div key={record.id} className="bg-[#0D0D0D] border border-white/5 rounded-2xl p-4 mb-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <p className="text-white font-bold text-sm">{record.description}</p>
                            <p className="text-primary/60 text-[10px] mt-1">{categoryLabels[record.category] || record.category}</p>
                          </div>
                          <span className="text-red-400 font-black text-lg">{record.amount} {t('currency')}</span>
                        </div>
                        <p className="text-gray-500 text-[10px]">{record.date}</p>
                      </div>
                    );
                  })
              )}
            </div>
          </section>
        )}

        {activeTab === 'services' && (
          <section className="space-y-6">
            <h2 className="text-primary font-black text-sm uppercase tracking-widest">{t('services_management')}</h2>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <input value={newServiceNameAr} onChange={e => setNewServiceNameAr(e.target.value)} placeholder={t('service_name_ar')} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm" />
              <input value={newServiceNameEn} onChange={e => setNewServiceNameEn(e.target.value)} placeholder={t('service_name_en')} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm" />
              <input type="number" value={newServicePrice} onChange={e => setNewServicePrice(e.target.value)} placeholder={t('service_price')} className="w-24 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm" />
              <button
                type="button"
                onClick={async () => {
                  if (!newServiceNameAr.trim() || !newServicePrice.trim()) return;
                  await firebase.addBranchService(branchId, {
                    nameAr: newServiceNameAr.trim(),
                    nameEn: newServiceNameEn.trim() || newServiceNameAr.trim(),
                    price: parseInt(newServicePrice, 10) || 0,
                  });
                  setNewServiceNameAr('');
                  setNewServiceNameEn('');
                  setNewServicePrice('');
                  load();
                }}
                className="px-4 py-3 rounded-xl bg-primary text-black font-black text-xs uppercase"
              >
                {t('add_service')}
              </button>
            </div>
            <div className="space-y-2">
              {branchServices.map((s) => (
                <div key={s.id} className="bg-[#0D0D0D] border border-white/5 rounded-2xl p-4 flex justify-between items-center">
                  <div>
                    <p className="text-white font-bold text-sm">{language === 'ar' ? s.nameAr : s.nameEn}</p>
                    <p className="text-primary/70 text-[10px]">{s.price} {t('currency')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await firebase.deleteBranchService(branchId, s.id);
                      load();
                    }}
                    className="text-red-400 text-[10px] font-black uppercase"
                  >
                    {t('delete')}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'barbers' && (
          <section className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-primary font-black text-sm uppercase tracking-widest">{t('barbers_management')}</h2>
              <button
                onClick={() => {/* إدارة الرواتب */}}
                className="px-4 py-2 bg-primary text-black font-black rounded-xl text-xs uppercase"
              >
                {language === 'ar' ? 'الرواتب' : 'Salaries'}
              </button>
            </div>
            <div className="space-y-3">
              {barbers.map((barber) => {
                const salary = financialRecords.find(r => r.type === 'expense' && r.category === 'salary' && r.barberId === barber.uid);
                return (
                  <div key={barber.uid} className={`bg-[#0D0D0D] border rounded-2xl p-4 ${barber.disabled ? 'opacity-60 border-white/5' : 'border-white/10'}`}>
                    <div className="flex justify-between items-center flex-wrap gap-2 mb-3">
                      <div>
                        <p className="text-white font-bold text-sm">{barber.name}</p>
                        <p className="text-primary/60 text-[10px]">{barber.email}</p>
                        {salary && (
                          <p className="text-white/60 text-[9px] mt-1">
                            {language === 'ar' ? `الراتب: ${salary.amount} ريال` : `Salary: ${salary.amount} SAR`}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={barber.branchId || ''}
                          onChange={async (e) => {
                            await firebase.updateBarber(barber.uid, { branchId: e.target.value || undefined });
                            load();
                          }}
                          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-[10px]"
                        >
                          <option value="">— {t('link_branch')} —</option>
                          {BRANCH_OPTIONS.map((b) => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={async () => {
                            await firebase.updateBarber(barber.uid, { disabled: !barber.disabled });
                            load();
                          }}
                          className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase ${barber.disabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
                        >
                          {barber.disabled ? t('enable_barber') : t('disable_barber')}
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const amount = prompt(language === 'ar' ? 'أدخل الراتب الشهري:' : 'Enter monthly salary:');
                          if (amount && !isNaN(parseFloat(amount))) {
                            firebase.createFinancialRecord({
                              type: 'expense',
                              category: 'salary',
                              amount: parseFloat(amount),
                              date: new Date().toISOString().split('T')[0],
                              description: language === 'ar' ? `راتب ${barber.name}` : `Salary for ${barber.name}`,
                              branchId: branchId,
                              barberId: barber.uid
                            }).then(() => load());
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-primary/20 text-primary border border-primary/30 rounded-xl text-[10px] font-black uppercase"
                      >
                        {language === 'ar' ? 'تعيين راتب' : 'Set Salary'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {activeTab === 'coupons' && (
          <section className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-primary font-black text-sm uppercase tracking-widest">{language === 'ar' ? 'إدارة الكوبونات' : 'Coupon Management'}</h2>
              <button
                onClick={async () => {
                  const code = prompt(language === 'ar' ? 'أدخل كود الكوبون:' : 'Enter coupon code:');
                  const discountType = prompt(language === 'ar' ? 'نوع الخصم (percentage/fixed):' : 'Discount type (percentage/fixed):') as 'percentage' | 'fixed';
                  const discountValue = prompt(language === 'ar' ? 'قيمة الخصم:' : 'Discount value:');
                  if (code && discountType && discountValue) {
                    await firebase.createCoupon({
                      code: code.toUpperCase(),
                      discountType,
                      discountValue: parseFloat(discountValue),
                      validFrom: new Date().toISOString().split('T')[0],
                      validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                      branchId,
                      isActive: true
                    });
                    load();
                  }
                }}
                className="px-4 py-2 bg-primary text-black font-black rounded-xl text-xs uppercase"
              >
                {language === 'ar' ? 'إضافة كوبون' : 'Add Coupon'}
              </button>
            </div>
            <div className="space-y-3">
              {allCoupons.length === 0 ? (
                <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-6 text-center">
                  <p className="text-gray-500">{language === 'ar' ? 'لا توجد كوبونات' : 'No coupons'}</p>
                </div>
              ) : (
                allCoupons.map(coupon => (
                  <div key={coupon.id} className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-4 flex justify-between items-center">
                    <div>
                      <h4 className="text-white font-black">{coupon.code}</h4>
                      <p className="text-primary text-sm">
                        {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `${coupon.discountValue} SAR`}
                        {' • '}
                        {coupon.usedCount}/{coupon.usageLimit || '∞'} {language === 'ar' ? 'استخدام' : 'used'}
                      </p>
                      <p className="text-white/60 text-xs">
                        {new Date(coupon.validFrom).toLocaleDateString()} - {new Date(coupon.validTo).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await firebase.updateCoupon(coupon.id, { isActive: !coupon.isActive });
                          load();
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-black uppercase ${
                          coupon.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {coupon.isActive ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'معطل' : 'Inactive')}
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(language === 'ar' ? 'هل تريد حذف هذا الكوبون؟' : 'Delete this coupon?')) {
                            await firebase.deleteCoupon(coupon.id);
                            load();
                          }
                        }}
                        className="px-3 py-2 bg-red-500/20 text-red-400 rounded-xl text-xs font-black uppercase"
                      >
                        {language === 'ar' ? 'حذف' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {activeTab === 'analytics' && (
          <section className="space-y-6">
            <h2 className="text-primary font-black text-sm uppercase tracking-widest">{language === 'ar' ? 'تحليلات العملاء' : 'Customer Analytics'}</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={async () => {
                  const today = new Date().toISOString().split('T')[0];
                  const analytics = await firebase.getCustomerAnalytics(branchId, 'day', today);
                  alert(language === 'ar' 
                    ? `اليوم:\nالعملاء: ${analytics.totalCustomers}\nالجدد: ${analytics.newCustomers}\nالعائدون: ${analytics.returningCustomers}\nمتوسط قيمة الحجز: ${analytics.averageBookingValue.toFixed(0)} ريال`
                    : `Today:\nCustomers: ${analytics.totalCustomers}\nNew: ${analytics.newCustomers}\nReturning: ${analytics.returningCustomers}\nAvg Booking: ${analytics.averageBookingValue.toFixed(0)} SAR`
                  );
                }}
                className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-4 text-center"
              >
                <span className="material-icons-round text-primary text-3xl mb-2">today</span>
                <p className="text-white font-black text-xs">{language === 'ar' ? 'اليوم' : 'Today'}</p>
              </button>
              <button
                onClick={async () => {
                  const today = new Date().toISOString().split('T')[0];
                  const analytics = await firebase.getCustomerAnalytics(branchId, 'week', today);
                  alert(language === 'ar' 
                    ? `هذا الأسبوع:\nالعملاء: ${analytics.totalCustomers}\nالجدد: ${analytics.newCustomers}\nالعائدون: ${analytics.returningCustomers}\nمتوسط قيمة الحجز: ${analytics.averageBookingValue.toFixed(0)} ريال\nمعدل الاحتفاظ: ${analytics.customerRetentionRate.toFixed(1)}%`
                    : `This Week:\nCustomers: ${analytics.totalCustomers}\nNew: ${analytics.newCustomers}\nReturning: ${analytics.returningCustomers}\nAvg Booking: ${analytics.averageBookingValue.toFixed(0)} SAR\nRetention: ${analytics.customerRetentionRate.toFixed(1)}%`
                  );
                }}
                className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-4 text-center"
              >
                <span className="material-icons-round text-primary text-3xl mb-2">date_range</span>
                <p className="text-white font-black text-xs">{language === 'ar' ? 'هذا الأسبوع' : 'This Week'}</p>
              </button>
              <button
                onClick={async () => {
                  const today = new Date().toISOString().split('T')[0];
                  const analytics = await firebase.getCustomerAnalytics(branchId, 'month', today);
                  const topServices = analytics.topServices.map(s => `${s.service}: ${s.count}`).join('\n');
                  alert(language === 'ar' 
                    ? `هذا الشهر:\nالعملاء: ${analytics.totalCustomers}\nالجدد: ${analytics.newCustomers}\nالعائدون: ${analytics.returningCustomers}\nمتوسط قيمة الحجز: ${analytics.averageBookingValue.toFixed(0)} ريال\nمعدل الاحتفاظ: ${analytics.customerRetentionRate.toFixed(1)}%\n\nالخدمات الأكثر طلباً:\n${topServices}`
                    : `This Month:\nCustomers: ${analytics.totalCustomers}\nNew: ${analytics.newCustomers}\nReturning: ${analytics.returningCustomers}\nAvg Booking: ${analytics.averageBookingValue.toFixed(0)} SAR\nRetention: ${analytics.customerRetentionRate.toFixed(1)}%\n\nTop Services:\n${topServices}`
                  );
                }}
                className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-4 text-center"
              >
                <span className="material-icons-round text-primary text-3xl mb-2">calendar_month</span>
                <p className="text-white font-black text-xs">{language === 'ar' ? 'هذا الشهر' : 'This Month'}</p>
              </button>
            </div>
          </section>
        )}

        {activeTab === 'settings' && (
          <section className="space-y-6">
            <h2 className="text-primary font-black text-sm uppercase tracking-widest">{language === 'ar' ? 'إعدادات الفرع' : 'Branch Settings'}</h2>
            <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-6 space-y-4">
              <div>
                <label className="text-white/80 text-xs mb-2 block">{language === 'ar' ? 'اسم الفرع' : 'Branch Name'}</label>
                <input
                  type="text"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white"
                  placeholder={branchId}
                />
              </div>
              <div>
                <label className="text-white/80 text-xs mb-2 block">{language === 'ar' ? 'الموقع' : 'Location'}</label>
                <input
                  type="text"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white"
                  placeholder={language === 'ar' ? 'الموقع' : 'Location'}
                />
              </div>
              <button className="w-full py-3 bg-primary text-black font-black rounded-xl uppercase">
                {language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
              </button>
            </div>
          </section>
        )}

        {activeTab === 'backup' && (
          <section className="space-y-6">
            <h2 className="text-primary font-black text-sm uppercase tracking-widest">{language === 'ar' ? 'النسخ الاحتياطي والإشعارات' : 'Backup & Notifications'}</h2>
            
            {/* النسخ الاحتياطي */}
            <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-6">
              <h3 className="text-white font-black mb-4">{language === 'ar' ? 'النسخ الاحتياطي' : 'Backup & Restore'}</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={async () => {
                    const backup = await firebase.backupData(branchId);
                    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `backup-${branchId}-${Date.now()}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    alert(language === 'ar' ? 'تم تنزيل النسخة الاحتياطية' : 'Backup downloaded');
                  }}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 text-center"
                >
                  <span className="material-icons-round text-primary text-2xl mb-2">download</span>
                  <p className="text-white font-black text-xs">{language === 'ar' ? 'تنزيل نسخة' : 'Download Backup'}</p>
                </button>
                <button
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'application/json';
                    input.onchange = async (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        const text = await file.text();
                        const backup = JSON.parse(text);
                        if (confirm(language === 'ar' ? 'هل تريد استعادة هذه البيانات؟' : 'Restore this backup?')) {
                          const restored = await firebase.restoreData(backup);
                          if (restored) {
                            alert(language === 'ar' ? 'تم استعادة البيانات' : 'Data restored');
                            load();
                          }
                        }
                      }
                    };
                    input.click();
                  }}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 text-center"
                >
                  <span className="material-icons-round text-primary text-2xl mb-2">upload</span>
                  <p className="text-white font-black text-xs">{language === 'ar' ? 'استعادة نسخة' : 'Restore Backup'}</p>
                </button>
              </div>
            </div>

            {/* الإشعارات الجماعية */}
            <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-black">{language === 'ar' ? 'الإشعارات الجماعية' : 'Bulk Notifications'}</h3>
                <button
                  onClick={() => {
                    setBulkNotificationTitle('');
                    setBulkNotificationMessage('');
                    setBulkNotificationTarget('all');
                    setShowBulkNotificationModal(true);
                  }}
                  className="px-4 py-2 bg-primary text-black font-black rounded-xl text-xs uppercase"
                >
                  {language === 'ar' ? 'إرسال إشعار' : 'Send Notification'}
                </button>
              </div>
              {bulkNotifications.length === 0 ? (
                <p className="text-gray-500 text-sm">{language === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}</p>
              ) : (
                <div className="space-y-2">
                  {bulkNotifications.slice(0, 5).map(notif => (
                    <div key={notif.id} className="bg-white/5 rounded-xl p-3">
                      <h4 className="text-white font-bold text-sm">{notif.title}</h4>
                      <p className="text-white/70 text-xs">{notif.message}</p>
                      <p className="text-white/50 text-[9px] mt-1">
                        {notif.status === 'sent' && notif.sentAt 
                          ? new Date(notif.sentAt).toLocaleString()
                          : language === 'ar' ? 'مجدولة' : 'Scheduled'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {selectedReceipt && (
        <div className="fixed inset-0 z-[1000] bg-black/95 flex items-center justify-center p-8 animate-in zoom-in duration-300" onClick={() => setSelectedReceipt(null)}>
           <img src={selectedReceipt} className="max-w-full max-h-[80vh] object-contain rounded-3xl shadow-2xl" />
        </div>
      )}

      {/* منبثقة الإشعارات الجماعية */}
      {showBulkNotificationModal && (
        <div className="fixed inset-0 z-[600] bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowBulkNotificationModal(false)}>
          <div className="w-full max-w-md bg-[#0d0d0d] rounded-t-3xl sm:rounded-3xl border-t sm:border border-white/10 p-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-black text-lg mb-4">{language === 'ar' ? 'إرسال إشعار جماعي' : 'Send Bulk Notification'}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-white/80 text-xs mb-2 block">{language === 'ar' ? 'العنوان' : 'Title'}</label>
                <input
                  type="text"
                  value={bulkNotificationTitle}
                  onChange={(e) => setBulkNotificationTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white"
                  placeholder={language === 'ar' ? 'عنوان الإشعار' : 'Notification title'}
                />
              </div>
              <div>
                <label className="text-white/80 text-xs mb-2 block">{language === 'ar' ? 'الرسالة' : 'Message'}</label>
                <textarea
                  value={bulkNotificationMessage}
                  onChange={(e) => setBulkNotificationMessage(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white min-h-[120px]"
                  placeholder={language === 'ar' ? 'نص الإشعار...' : 'Notification message...'}
                />
              </div>
              <div>
                <label className="text-white/80 text-xs mb-2 block">{language === 'ar' ? 'الجمهور المستهدف' : 'Target Audience'}</label>
                <select
                  value={bulkNotificationTarget}
                  onChange={(e) => setBulkNotificationTarget(e.target.value as 'all' | 'customers' | 'barbers')}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white"
                >
                  <option value="all">{language === 'ar' ? 'الكل' : 'All'}</option>
                  <option value="customers">{language === 'ar' ? 'العملاء فقط' : 'Customers Only'}</option>
                  <option value="barbers">{language === 'ar' ? 'الحلاقين فقط' : 'Barbers Only'}</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowBulkNotificationModal(false)}
                className="flex-1 py-3 rounded-2xl border border-white/10 text-white/80 font-bold"
              >
                {t('back')}
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (bulkNotificationTitle.trim() && bulkNotificationMessage.trim()) {
                    await firebase.createBulkNotification({
                      branchId,
                      title: bulkNotificationTitle.trim(),
                      message: bulkNotificationMessage.trim(),
                      targetAudience: bulkNotificationTarget,
                      status: 'sent',
                      sentAt: Date.now()
                    });
                    await firebase.sendBulkNotification((await firebase.getBulkNotifications(branchId))[0]?.id || '');
                    setShowBulkNotificationModal(false);
                    setBulkNotificationTitle('');
                    setBulkNotificationMessage('');
                    alert(language === 'ar' ? 'تم إرسال الإشعار' : 'Notification sent');
                    load();
                  }
                }}
                disabled={!bulkNotificationTitle.trim() || !bulkNotificationMessage.trim()}
                className="flex-1 py-3 rounded-2xl bg-primary text-black font-black disabled:opacity-50"
              >
                {language === 'ar' ? 'إرسال' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showExpenseForm && (
        <ExpenseForm
          onClose={() => setShowExpenseForm(false)}
          onSubmit={handleAddExpense}
          branchId={branchId}
        />
      )}

      {/* نافذة مدير الصالة: تعديل موعد الزبون */}
      {adminRescheduleBooking && (
        <div className="fixed inset-0 z-[600] bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setAdminRescheduleBooking(null)}>
          <div className="w-full max-w-md bg-[#0d0d0d] rounded-t-3xl sm:rounded-3xl border-t sm:border border-white/10 p-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-black text-lg mb-4">{t('reschedule_booking')} — {adminRescheduleBooking.userName}</h3>
            <p className="text-white/60 text-xs mb-4">{language === 'ar' ? 'تغيير موعد الزبون. سيُبلّغ تلقائياً.' : 'Change client appointment. They will be notified.'}</p>
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
              {adminRescheduleDates.map(({ iso, label }) => (
                <button
                  key={iso}
                  type="button"
                  onClick={() => { setAdminRescheduleDate(iso); }}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold ${adminRescheduleDate === iso ? 'bg-primary text-black' : 'bg-white/5 text-white/80 border border-white/10'}`}
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
                  onClick={() => setAdminRescheduleTime(time)}
                  className={`py-2 rounded-xl text-xs font-bold ${adminRescheduleTime === time ? 'bg-primary text-black' : 'bg-white/5 text-white/80 border border-white/10'}`}
                >
                  {time}
                </button>
              ))}
            </div>
            {adminRescheduleError && (
              <p className="text-red-400 text-xs mb-4">{adminRescheduleError}</p>
            )}
            <div className="flex gap-3">
              <button type="button" onClick={() => setAdminRescheduleBooking(null)} className="flex-1 py-3 rounded-2xl border border-white/10 text-white/80 font-bold">
                {t('back')}
              </button>
              <button
                type="button"
                disabled={!adminRescheduleDate || !adminRescheduleTime || adminRescheduleSubmitting}
                onClick={async () => {
                  if (!adminRescheduleDate || !adminRescheduleTime) return;
                  setAdminRescheduleError('');
                  setAdminRescheduleSubmitting(true);
                  const result = await firebase.adminRescheduleBooking(adminRescheduleBooking.id, adminRescheduleDate, adminRescheduleTime);
                  setAdminRescheduleSubmitting(false);
                  if (result.ok) {
                    load();
                    setAdminRescheduleBooking(null);
                  } else {
                    if (result.error === 'SLOT_TAKEN') setAdminRescheduleError(t('slot_taken'));
                    else setAdminRescheduleError(language === 'ar' ? 'حدث خطأ' : 'Something went wrong');
                  }
                }}
                className="flex-1 py-3 rounded-2xl bg-primary text-black font-black disabled:opacity-50"
              >
                {adminRescheduleSubmitting ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'تأكيد' : 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchManagerDashboard;
