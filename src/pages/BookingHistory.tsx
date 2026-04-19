
import React, { useState, useEffect } from 'react';
import { firebase } from '../services/FirebaseMock';
import { Booking } from '../types';
import { useApp } from '../app/App';

const BookingHistory: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user } = useApp();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      firebase.getBookings(user.uid).then(res => {
        setBookings(res);
        setLoading(false);
      });
    }
  }, [user]);

  return (
    <div className="h-full bg-background-dark flex flex-col animate-in slide-in-from-bottom duration-500 overflow-y-auto hide-scrollbar">
      <header className="px-8 pt-16 pb-6 border-b border-white/5 flex items-center gap-4 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
            <span className="material-icons-round text-primary">chevron_right</span>
        </button>
        <h1 className="text-xl font-black text-white">سجل الحجوزات</h1>
      </header>

      <main className="flex-1 p-6 space-y-4">
        {loading ? (
          <div className="text-center py-20 opacity-50">جاري التحميل...</div>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <span className="material-icons-round text-6xl text-gray-700">event_busy</span>
            <p className="text-gray-500 font-bold">لا توجد حجوزات سابقة</p>
          </div>
        ) : (
          bookings.map((b) => (
            <div key={b.id} className="bg-white/5 border border-white/10 rounded-3xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                  <span className="material-icons-round text-primary">content_cut</span>
                </div>
                <div>
                  <h4 className="text-white font-bold">{b.service}</h4>
                  <p className="text-gray-500 text-xs">{b.date} | {b.time}</p>
                </div>
              </div>
              <div className="text-left">
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                  b.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-500' : 
                  b.status === 'Approved' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                }`}>
                  {b.status === 'Pending' ? 'معلق' : b.status === 'Approved' ? 'مقبول' : 'مرفوض'}
                </span>
                <p className="text-primary font-black mt-1 text-sm">{b.amount} ر.س</p>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
};

export default BookingHistory;
