import React, { useState, useEffect, useId } from 'react';
import { Booking } from '../types';
import { useApp } from '../app/App';

/** Parse booking date string (ISO YYYY-MM-DD or legacy "اليوم 18" / "Today 18") to Date at start of day. */
function parseBookingDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }
  const dayMatch = trimmed.match(/(?:اليوم|Today)\s+(\d+)/i) || trimmed.match(/(\d+)/);
  if (dayMatch) {
    const day = parseInt(dayMatch[1], 10);
    if (Number.isNaN(day)) return null;
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), day);
    return d;
  }
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

/** Parse time string "9:30 AM" or "9:30 ص" / "9:30 م" to hour24, minutes. */
function parseTimeTo24(timeStr: string): { hour24: number; minutes: number } | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const parts = timeStr.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const [timePart, period] = parts;
  const [h, m] = timePart.split(':').map((x) => parseInt(x, 10));
  if (Number.isNaN(h)) return null;
  const minutes = Number.isNaN(m) ? 0 : m;
  const isPM = /^(PM|م|م\.|مساء)$/i.test(period);
  const isAM = /^(AM|ص|ص\.|صباحاً)$/i.test(period);
  let hour24 = h;
  if (isPM && h !== 12) hour24 = h + 12;
  if (isAM && h === 12) hour24 = 0;
  return { hour24, minutes };
}

interface BookingCountdownProps {
  booking: Booking;
  /** للنص عند "الآن" (مثلاً للزبون: موعدك الآن، للمدير: الموعد الآن) */
  labelNow?: string;
}

/** أبعاد دائرة التقدّم — حجم متوسط يتناسب مع بطاقة الصفحة الرئيسية */
const VIEW = 160;
const CX = 80;
const CY = 80;
const RING = 62;
const STROKE = 7;
const CIRC = 2 * Math.PI * RING;

const BookingCountdown: React.FC<BookingCountdownProps> = ({ booking, labelNow }) => {
  const gradientSuffix = useId().replace(/:/g, '');
  const { t, language } = useApp();
  const nowLabel = labelNow ?? t('appointment_now');
  const [timeRemaining, setTimeRemaining] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);
  const [isPast, setIsPast] = useState(false);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const dateObj = parseBookingDate(booking.date);
      const timeObj = parseTimeTo24(booking.time);
      if (!dateObj || !timeObj) {
        setTimeRemaining(null);
        return;
      }
      dateObj.setHours(timeObj.hour24, timeObj.minutes, 0, 0);
      const now = new Date();
      const diff = dateObj.getTime() - now.getTime();

      if (diff <= 0) {
        setIsPast(true);
        setTimeRemaining(null);
        return;
      }

      setIsPast(false);
      const hoursRemaining = Math.floor(diff / (1000 * 60 * 60));
      const minutesRemaining = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secondsRemaining = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining({ hours: hoursRemaining, minutes: minutesRemaining, seconds: secondsRemaining });
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [booking.date, booking.time]);

  if (!timeRemaining && !isPast) {
    return null;
  }

  const statusPending = booking.status === 'Pending';
  const statusApproved = booking.status === 'Approved';

  const ringTrack = statusPending ? 'rgba(212, 175, 55, 0.22)' : 'rgba(45, 212, 191, 0.2)';

  // بعد انتهاء وقت الموعد
  if (isPast) {
    const isApprovedNow = statusApproved;
    return (
      <div
        className={`relative overflow-hidden rounded-[28px] mb-4 border p-5 shadow-[0_20px_50px_rgba(0,0,0,0.45)] ${
          isApprovedNow
            ? 'border-emerald-500/25 bg-gradient-to-br from-emerald-950/40 via-[#0c0c0c] to-[#050505]'
            : 'border-primary/20 bg-gradient-to-br from-[#141008] via-[#0a0a0a] to-[#050505]'
        }`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_0%_0%,rgba(212,175,55,0.08),transparent_55%)]" />
        <div className="relative flex items-start gap-4">
          <div
            className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border ${
              isApprovedNow ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-primary/25 bg-primary/10'
            }`}
          >
            <span className={`material-icons-round text-2xl ${isApprovedNow ? 'text-emerald-400' : 'text-primary'}`}>
              event_available
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={`font-serif text-[11px] font-bold uppercase tracking-[0.2em] ${
                isApprovedNow ? 'text-emerald-400/90' : 'text-primary/90'
              }`}
            >
              {nowLabel}
            </p>
            {!isApprovedNow && (
              <p className="mt-1 text-[9px] font-black uppercase tracking-wider text-primary/55">{t('pending')}</p>
            )}
            <p className="mt-2 font-sans text-sm font-bold leading-snug text-white">{booking.barberId} • {booking.service}</p>
            <p className="mt-1.5 font-sans text-[10px] text-white/45">{booking.date} • {booking.time}</p>
          </div>
        </div>
      </div>
    );
  }

  const totalSeconds = timeRemaining.hours * 3600 + timeRemaining.minutes * 60 + timeRemaining.seconds;
  const maxHours = 24;
  const maxSeconds = maxHours * 3600;
  const percentage = Math.min((totalSeconds / maxSeconds) * 100, 100);
  const strokeDashoffset = CIRC - (percentage / 100) * CIRC;

  const hStr = String(timeRemaining.hours).padStart(2, '0');
  const mStr = String(timeRemaining.minutes).padStart(2, '0');
  const sStr = String(timeRemaining.seconds).padStart(2, '0');

  const gradGold = `booking-timer-gold-${gradientSuffix}`;
  const gradOk = `booking-timer-ok-${gradientSuffix}`;

  return (
    <div
      className={`relative mb-0 overflow-hidden rounded-[22px] border px-3 pb-4 pt-4 shadow-[0_16px_40px_rgba(0,0,0,0.45)] sm:px-4 ${
        statusPending
          ? 'border-amber-500/15 bg-gradient-to-br from-[#1a1510] via-[#0c0b09] to-[#050505]'
          : 'border-teal-500/20 bg-gradient-to-br from-[#0a1614] via-[#080a0a] to-[#050505]'
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_65%_45%_at_90%_0%,rgba(230,193,99,0.09),transparent_52%)]" />
      {statusApproved && (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_40%_at_10%_100%,rgba(45,212,191,0.08),transparent_48%)]" />
      )}

      <div className="relative flex flex-col items-center gap-3 sm:gap-4">
        {/* شارات الحالة — فوق المؤقت */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1.5 font-sans text-[9px] font-black uppercase tracking-[0.2em] ${
              statusPending ? 'border-primary/25 bg-primary/10 text-primary' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400'
            }`}
          >
            {t('time_remaining_label')}
          </span>
          {statusPending && (
            <span className="rounded-full border border-primary/15 bg-white/[0.03] px-2.5 py-0.5 font-sans text-[8px] font-black uppercase tracking-wider text-primary/70">
              {t('pending')}
            </span>
          )}
          {statusApproved && (
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-0.5 font-sans text-[8px] font-black uppercase tracking-wider text-emerald-400/90">
              {t('approved')}
            </span>
          )}
        </div>

        {/* مؤقت — حلقة مضغوطة + أرقام واضحة */}
        <div className="relative mx-auto flex w-full max-w-[min(100%,240px)] flex-col items-center">
          <div className="relative aspect-square w-full max-w-[200px]">
            <svg
              width={VIEW}
              height={VIEW}
              viewBox={`0 0 ${VIEW} ${VIEW}`}
              className={`h-full w-full -rotate-90 ${statusPending ? 'drop-shadow-[0_0_20px_rgba(230,193,99,0.14)]' : 'drop-shadow-[0_0_18px_rgba(45,212,191,0.12)]'}`}
              aria-hidden
            >
              <defs>
                <linearGradient id={gradGold} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F0D78C" />
                  <stop offset="45%" stopColor="#E6C163" />
                  <stop offset="100%" stopColor="#A67C2E" />
                </linearGradient>
                <linearGradient id={gradOk} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#5EEAD4" />
                  <stop offset="55%" stopColor="#2DD4BF" />
                  <stop offset="100%" stopColor="#0F766E" />
                </linearGradient>
              </defs>
              <circle cx={CX} cy={CY} r={RING - 14} fill="#070707" stroke={statusPending ? 'rgba(212,175,55,0.12)' : 'rgba(45,212,191,0.1)'} strokeWidth="1" />
              <circle cx={CX} cy={CY} r={RING} fill="none" stroke={ringTrack} strokeWidth={STROKE} />
              <circle
                cx={CX}
                cy={CY}
                r={RING}
                fill="none"
                stroke={statusPending ? `url(#${gradGold})` : `url(#${gradOk})`}
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={strokeDashoffset}
                className="transition-[stroke-dashoffset] duration-500 ease-out"
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center px-1 text-center">
              <span
                className={`mb-0.5 font-sans text-[9px] font-black uppercase tracking-[0.2em] ${
                  statusPending ? 'text-amber-200/50' : 'text-teal-300/55'
                }`}
              >
                {language === 'ar' ? 'مؤقت الموعد' : 'Countdown'}
              </span>
              <div className="flex items-center justify-center gap-0.5 font-black tabular-nums tracking-tight text-white sm:gap-1 text-[clamp(1.15rem,4.2vw,1.85rem)]">
                <span>{hStr}</span>
                <span className="pb-0.5 text-[0.5em] font-bold text-white/30">:</span>
                <span>{mStr}</span>
                <span className="pb-0.5 text-[0.5em] font-bold text-white/30">:</span>
                <span>{sStr}</span>
              </div>
              <p className={`mt-1 font-sans text-[8px] font-bold tracking-[0.16em] ${statusPending ? 'text-amber-200/35' : 'text-teal-400/45'}`}>
                {language === 'ar' ? 'س  ·  د  ·  ث' : 'h · m · s'}
              </p>
            </div>
          </div>
        </div>

        {/* تفاصيل الحجز — تحت المؤقت، في المنتصف */}
        <div className="w-full max-w-md text-center">
          <p className="font-sans text-xs font-bold leading-snug text-white/95 sm:text-sm">
            {booking.barberId}
            <span className="text-white/35"> • </span>
            {booking.service}
          </p>
          <p className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 font-sans text-[10px] text-white/45">
            <span className="inline-flex items-center gap-1">
              <span className="material-icons-round text-[15px] text-primary/55">calendar_today</span>
              {booking.date}
            </span>
            <span className="text-white/20">|</span>
            <span className="inline-flex items-center gap-1">
              <span className="material-icons-round text-[15px] text-primary/55">schedule</span>
              {booking.time}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default BookingCountdown;
