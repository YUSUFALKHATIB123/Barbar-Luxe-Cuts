
import React from 'react';
import { CalendarService } from '../services/CalendarService';
import { Booking } from '../types';
import { useApp } from '../app/App';

interface Props {
  onFinish: () => void;
  booking?: Booking;
}

const ConfirmationScreen: React.FC<Props> = ({ onFinish, booking }) => {
  const { t, language } = useApp();
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-background-dark animate-in zoom-in duration-500">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        
        <div className="relative mb-12">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="relative w-28 h-28 rounded-full border-4 border-primary flex items-center justify-center bg-background-dark z-10 shadow-2xl shadow-primary/40">
                <span className="material-icons-round text-primary text-6xl animate-bounce">check</span>
            </div>
        </div>

        <h1 className="text-4xl font-black text-white mb-4">{t('booking_success')}</h1>
        <p className="text-gray-500 font-medium mb-12">
            {language === 'ar' 
              ? 'شكراً لاختيارك Luxe Cuts. تم تأكيد طلبك وبانتظارك في الصالون.'
              : 'Thank you for choosing Luxe Cuts. Your booking has been confirmed and we are waiting for you at the salon.'}
        </p>

        <div className="w-full bg-white/5 border border-white/10 rounded-[40px] p-8 space-y-6 mb-6">
            <div className="flex justify-between border-b border-white/5 pb-4">
                <span className="text-gray-500 text-xs font-bold uppercase">{t('service')}</span>
                <span className="text-white font-black text-sm">{booking?.service || (language === 'ar' ? 'قصة شعر + لحية' : 'Haircut + Beard')}</span>
            </div>
            <div className="flex justify-between">
                <span className="text-gray-500 text-xs font-bold uppercase">{language === 'ar' ? 'الموعد' : 'Appointment'}</span>
                <span className="text-white font-black text-sm">{booking?.date || (language === 'ar' ? 'اليوم' : 'Today')}، {booking?.time || (language === 'ar' ? '10:00 ص' : '10:00 AM')}</span>
            </div>
            {booking?.barberId && (
              <div className="flex justify-between">
                <span className="text-gray-500 text-xs font-bold uppercase">{language === 'ar' ? 'الحلاق' : 'Barber'}</span>
                <span className="text-white font-black text-sm">{booking.barberId}</span>
              </div>
            )}
        </div>

        {booking && (
          <button
            onClick={() => CalendarService.addToCalendar(booking)}
            className="w-full bg-white/5 border border-white/10 py-4 rounded-[32px] text-white font-black text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3 mb-4"
          >
            <span className="material-icons-round">event</span>
            {t('add_to_calendar')}
          </button>
        )}

        <button 
          onClick={onFinish}
          className="w-full bg-primary py-5 rounded-[32px] text-black font-black text-xl shadow-2xl shadow-primary/30 active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          {t('return_home')}
          <span className="material-icons-round">home</span>
        </button>
      </div>
    </div>
  );
};

export default ConfirmationScreen;
