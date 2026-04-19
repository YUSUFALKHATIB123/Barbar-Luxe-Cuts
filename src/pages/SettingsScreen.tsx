
import React, { useState, useRef } from 'react';
import { useApp } from '../app/App';
import { firebase } from '../services/FirebaseMock';

interface Props {
  onBack: () => void;
  onHistory: () => void;
  onAdmin?: () => void;
  onLogout: () => void;
}

const SettingsScreen: React.FC<Props> = ({ onBack, onHistory, onAdmin, onLogout }) => {
  const { user, language, setLanguage, t, setUser } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editAvatar, setEditAvatar] = useState(user?.avatar || '');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!user?.uid) return;
    setIsSaving(true);
    try {
      const updates: { name?: string; phone?: string; avatar?: string } = {};
      if (editName.trim() !== user.name) updates.name = editName.trim();
      if (editPhone.trim() !== user.phone) updates.phone = editPhone.trim();
      if (editAvatar !== user.avatar) updates.avatar = editAvatar;

      if (Object.keys(updates).length > 0) {
        await firebase.updateUserProfile(user.uid, updates);
        setUser({ ...user, ...updates });
      }
      setIsEditing(false);
    } catch (error) {
      console.error('خطأ في حفظ التعديلات:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background-dark animate-in slide-in-from-bottom duration-500 overflow-y-auto hide-scrollbar">
      <header className="px-6 pt-16 pb-6 flex items-center justify-between sticky top-0 bg-background-dark/80 backdrop-blur-md z-50">
        <button 
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 transition-colors active:scale-90"
        >
          <span className="material-icons-round text-primary">{language === 'ar' ? 'chevron_right' : 'chevron_left'}</span>
        </button>
        <h1 className="text-xl font-black tracking-tight text-white">{t('settings')}</h1>
        <div className="w-10"></div> 
      </header>

      <section className="px-6 mb-10 text-center">
        <div className="relative inline-block">
          <div className="w-24 h-24 rounded-full p-1 bg-primary/20 mx-auto mb-4 border-2 border-primary/30 relative">
            <img 
              alt="Profile" 
              className="w-full h-full rounded-full object-cover" 
              src={isEditing ? editAvatar : (user?.avatar || 'https://i.pravatar.cc/150')}
            />
            {isEditing && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-black flex items-center justify-center shadow-lg"
              >
                <span className="material-icons-round text-sm">camera_alt</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
        </div>
        {isEditing ? (
          <>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full max-w-xs mx-auto mb-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-center font-black text-xl"
              placeholder={language === 'ar' ? 'الاسم' : 'Name'}
            />
            <input
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              className="w-full max-w-xs mx-auto bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-center text-sm"
              placeholder={language === 'ar' ? 'رقم الهاتف' : 'Phone'}
            />
          </>
        ) : (
          <>
            <h2 className="text-2xl font-black text-white">{user?.name}</h2>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">
                {user?.role === 'admin' ? (language === 'ar' ? 'مدير الصالة' : 'Branch Manager') : 
                 user?.role === 'barber' ? (language === 'ar' ? 'حلاق' : 'Barber') : 
                 (language === 'ar' ? 'عميل مميز' : 'Premium Client')}
            </p>
          </>
        )}
      </section>

      <div className="flex-1 px-6 space-y-6 pb-20">
        <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-3 px-1">{t('profile')}</p>
            <div className="space-y-1 bg-white/5 rounded-3xl border border-white/10 p-2 overflow-hidden shadow-2xl">
              {isEditing ? (
                <div className="flex gap-2 p-4">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditName(user?.name || '');
                      setEditPhone(user?.phone || '');
                      setEditAvatar(user?.avatar || '');
                    }}
                    className="flex-1 py-3 rounded-xl border border-white/10 text-white/80 font-bold"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving || !editName.trim()}
                    className="flex-1 py-3 rounded-xl bg-primary text-black font-black disabled:opacity-50"
                  >
                    {isSaving ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ' : 'Save')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <span className="material-icons-round text-primary">edit</span>
                    </div>
                    <span className="font-bold text-white">{language === 'ar' ? 'تعديل الملف الشخصي' : 'Edit Profile'}</span>
                  </div>
                  <span className={`material-icons-round text-slate-600 transition-transform ${language === 'ar' ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`}>
                    {language === 'ar' ? 'chevron_left' : 'chevron_right'}
                  </span>
                </button>
              )}
              <button onClick={onHistory} className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-colors group">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <span className="material-icons-round text-primary">history</span>
                    </div>
                    <span className="font-bold text-white">{t('booking_history')}</span>
                </div>
                <span className={`material-icons-round text-slate-600 transition-transform ${language === 'ar' ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`}>
                    {language === 'ar' ? 'chevron_left' : 'chevron_right'}
                </span>
              </button>
              
              {user?.role === 'user' && (
                <>
                  <button 
                    onClick={async () => {
                      if (!user?.uid) return;
                      const history = await firebase.getPaymentHistory(user.uid);
                      alert(language === 'ar' ? `سجل الدفع: ${history.length} عملية` : `Payment History: ${history.length} transactions`);
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <span className="material-icons-round text-primary">payment</span>
                        </div>
                        <span className="font-bold text-white">{language === 'ar' ? 'سجل الدفع' : 'Payment History'}</span>
                    </div>
                    <span className={`material-icons-round text-slate-600 transition-transform ${language === 'ar' ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`}>
                        {language === 'ar' ? 'chevron_left' : 'chevron_right'}
                    </span>
                  </button>
                  
                  <button 
                    onClick={async () => {
                      if (!user?.uid) return;
                      const code = await firebase.getReferralCode(user.uid);
                      navigator.clipboard.writeText(code);
                      alert(language === 'ar' ? `تم نسخ كود الإحالة: ${code}` : `Referral code copied: ${code}`);
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <span className="material-icons-round text-primary">share</span>
                        </div>
                        <span className="font-bold text-white">{language === 'ar' ? 'مشاركة التطبيق' : 'Share App'}</span>
                    </div>
                    <span className={`material-icons-round text-slate-600 transition-transform ${language === 'ar' ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`}>
                        {language === 'ar' ? 'chevron_left' : 'chevron_right'}
                    </span>
                  </button>
                  
                  <button 
                    onClick={async () => {
                      if (!user?.uid) return;
                      const settings = await firebase.getNotificationSettings(user.uid);
                      const enabled = !settings.enabled;
                      await firebase.updateNotificationSettings(user.uid, { enabled });
                      alert(language === 'ar' ? `الإشعارات: ${enabled ? 'مفعّلة' : 'معطّلة'}` : `Notifications: ${enabled ? 'Enabled' : 'Disabled'}`);
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <span className="material-icons-round text-primary">notifications</span>
                        </div>
                        <span className="font-bold text-white">{language === 'ar' ? 'إعدادات الإشعارات' : 'Notification Settings'}</span>
                    </div>
                    <span className={`material-icons-round text-slate-600 transition-transform ${language === 'ar' ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`}>
                        {language === 'ar' ? 'chevron_left' : 'chevron_right'}
                    </span>
                  </button>
                </>
              )}
              
              {user?.role === 'admin' && onAdmin && (
                <button onClick={onAdmin} className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-colors group">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <span className="material-icons-round text-primary">dashboard</span>
                        </div>
                        <span className="font-bold text-white">{language === 'ar' ? 'لوحة مدير الصالة' : 'Branch Manager Dashboard'}</span>
                    </div>
                    <span className={`material-icons-round text-slate-600 transition-transform ${language === 'ar' ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`}>
                        {language === 'ar' ? 'chevron_left' : 'chevron_right'}
                    </span>
                </button>
              )}
            </div>
        </div>

        <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-3 px-1">{t('preferences')}</p>
            <div className="space-y-1 bg-white/5 rounded-3xl border border-white/10 p-2 overflow-hidden shadow-2xl">
              <button onClick={toggleLanguage} className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-colors group">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <span className="material-icons-round text-primary">language</span>
                    </div>
                    <div className="text-start">
                        <span className="font-bold text-white block">{t('language')}</span>
                        <span className="text-[10px] text-primary font-bold uppercase tracking-widest">{language === 'ar' ? 'العربية' : 'English'}</span>
                    </div>
                </div>
                <span className="material-icons-round text-slate-600">sync</span>
              </button>
            </div>
        </div>

        <button 
          onClick={onLogout}
          className="w-full py-5 rounded-2xl font-black text-red-500 bg-red-500/5 border border-red-500/10 transition-all hover:bg-red-500/10 flex items-center justify-center gap-2 shadow-xl"
        >
          <span className="material-icons-round">logout</span>
          <span>{t('logout')}</span>
        </button>
      </div>
    </div>
  );
};

export default SettingsScreen;
