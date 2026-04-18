
import React, { useState } from 'react';
import { firebase } from '../services/FirebaseMock';
import { useApp } from '../App';

const PaymentScreen: React.FC<{ booking: any, onBack: () => void, onDone: (createdBooking?: any) => void }> = ({ booking, onBack, onDone }) => {
  const { user, t } = useApp();
  const [isUploading, setIsUploading] = useState(false);
  const [paymentType, setPaymentType] = useState<'transfer' | 'salon'>('salon');
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async () => {
    if (paymentType === 'transfer' && !file) {
        alert("يرجى رفع إيصال التحويل أولاً");
        return;
    }

    setIsUploading(true);
    try {
      let url = "";
      if (paymentType === 'transfer' && file) {
          url = await firebase.compressAndUploadReceipt(file);
      }
      
      // Fix: Added missing properties required by the Booking interface
      const createdBooking = {
        id: Math.random().toString(36).substr(2, 9),
        userId: user!.uid,
        userName: user?.name || 'Guest',
        barberId: booking.barber.name,
        branchName: booking.barber.branchName || '',
        service: booking.service,
        date: booking.date,
        time: booking.time,
        status: 'Pending' as const,
        receiptUrl: url,
        amount: booking.amount,
        createdAt: Date.now()
      };
      await firebase.createBooking(createdBooking);
      onDone(createdBooking);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="h-full bg-background-dark flex flex-col p-8 pt-16 animate-in slide-in-from-left duration-500 overflow-y-auto hide-scrollbar">
      <div className="flex items-center gap-4 mb-10">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
            <span className="material-icons-round text-primary">chevron_right</span>
        </button>
        <h1 className="text-2xl font-black text-white">{t('payment_method')}</h1>
      </div>

      <div className="space-y-4 mb-10">
        <div 
            onClick={() => setPaymentType('salon')}
            className={`p-6 rounded-[32px] border-2 transition-all cursor-pointer flex items-center justify-between ${
                paymentType === 'salon' ? 'bg-primary/10 border-primary' : 'bg-white/5 border-white/5'
            }`}
        >
            <div className="flex items-center gap-4">
                <span className={`material-icons-round text-3xl ${paymentType === 'salon' ? 'text-primary' : 'text-gray-600'}`}>storefront</span>
                <div className="text-start">
                    <h3 className={`font-black ${paymentType === 'salon' ? 'text-white' : 'text-gray-500'}`}>{t('pay_at_salon')}</h3>
                    <p className="text-gray-600 text-[10px] font-bold">Cash or POS at salon</p>
                </div>
            </div>
            {paymentType === 'salon' && <span className="material-icons-round text-primary">check_circle</span>}
        </div>

        <div 
            onClick={() => setPaymentType('transfer')}
            className={`p-6 rounded-[32px] border-2 transition-all cursor-pointer flex items-center justify-between ${
                paymentType === 'transfer' ? 'bg-primary/10 border-primary' : 'bg-white/5 border-white/5'
            }`}
        >
            <div className="flex items-center gap-4">
                <span className={`material-icons-round text-3xl ${paymentType === 'transfer' ? 'text-primary' : 'text-gray-600'}`}>account_balance</span>
                <div className="text-start">
                    <h3 className={`font-black ${paymentType === 'transfer' ? 'text-white' : 'text-gray-500'}`}>{t('bank_transfer')}</h3>
                    <p className="text-gray-600 text-[10px] font-bold">Direct bank deposit</p>
                </div>
            </div>
            {paymentType === 'transfer' && <span className="material-icons-round text-primary">check_circle</span>}
        </div>
      </div>

      {paymentType === 'transfer' && (
        <div className="bg-white/5 border border-white/10 rounded-[40px] p-8 mb-8 text-center animate-in slide-in-from-bottom duration-300">
            {/* شعار البنك */}
            <div className="flex justify-center mb-6">
                <div className="bg-red-600 text-white font-black px-4 py-2 rounded-lg flex items-center gap-2">
                    <span className="material-icons-round">account_balance</span>
                    Ziraat Bankası
                </div>
            </div>
            
            <div className="space-y-4 text-start mb-8">
                <div>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">{t('account_name')}</p>
                    <p className="text-white font-black">LUXE CUTS TURKEY GAYRIMENKUL</p>
                </div>
                <div>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">{t('iban')}</p>
                    <p className="text-primary font-mono text-sm break-all font-black">TR 68 0001 2345 6789 0123 4567 89</p>
                </div>
            </div>
            
            <label className={`w-full h-32 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all ${file ? 'border-primary bg-primary/5' : 'border-white/10 hover:border-white/20'}`}>
                <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                {file ? (
                    <div className="flex items-center gap-2 text-primary">
                        <span className="material-icons-round">description</span>
                        <span className="font-bold text-xs truncate max-w-[150px]">{file.name}</span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <span className="material-icons-round text-gray-600 text-3xl">cloud_upload</span>
                        <span className="text-gray-600 text-[10px] font-black uppercase">ارفع صورة الإيصال</span>
                    </div>
                )}
            </label>
        </div>
      )}

      <div className="mt-auto pb-10 flex flex-col gap-6">
        <div className="flex justify-between items-center px-4">
            <span className="text-gray-500 font-bold text-xs uppercase">{t('final_amount')}</span>
            <span className="text-white text-3xl font-black">{booking.amount} {t('currency')}</span>
        </div>
        
        <button 
          onClick={handleSubmit}
          disabled={isUploading}
          className="w-full py-6 bg-primary text-black font-black text-xl rounded-[32px] shadow-2xl shadow-primary/30 active:scale-95 transition-all disabled:opacity-50"
        >
          {isUploading ? '...' : t('confirm_final')}
        </button>
      </div>
    </div>
  );
};

export default PaymentScreen;
