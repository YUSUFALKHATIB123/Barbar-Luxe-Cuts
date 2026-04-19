
import React, { useState, useEffect, useRef } from 'react';
import { firebase } from '../services/FirebaseMock';
import { User } from '../types';
import { useApp } from '../app/App';

const ProfileSetup: React.FC<{ initialData: any, onDone: (u: User) => void }> = ({ initialData, onDone }) => {
  const { t, language } = useApp();
  const isAr = language === 'ar';

  // Pre-fill name from Google display name if available
  const suggestedName = initialData?.googleDisplayName || initialData?.name || '';
  const [name, setName] = useState(suggestedName);
  const [phoneDigits, setPhoneDigits] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [nameValid, setNameValid] = useState(false);
  const [phoneValid, setPhoneValid] = useState(false);
  const [focusedField, setFocusedField] = useState<'name' | 'phone' | null>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  // Validate on change
  useEffect(() => {
    const nameRegex = /^[a-zA-Z\u0600-\u06FF\s]+$/;
    setNameValid(nameRegex.test(name) && name.trim().length >= 3);
  }, [name]);

  useEffect(() => {
    // رقم سعودي وطني مع الصفر: 11 رقم يبدأ بـ 05 (مثال: 05512345678)
    setPhoneValid(/^05\d{9}$/.test(phoneDigits));
  }, [phoneDigits]);

  /** عرض بمسافات فقط — بدون أقواس حتى يعمل الحذف (Backspace) بشكل طبيعي */
  const formatPhoneDisplay = (digits: string) => {
    const d = digits.replace(/\D/g, '').slice(0, 11);
    if (!d) return '';
    const p1 = d.slice(0, 4);
    const p2 = d.slice(4, 7);
    const p3 = d.slice(7, 11);
    return [p1, p2, p3].filter((s) => s.length > 0).join(' ');
  };

  const normalizePhoneDigits = (rawInput: string) => {
    let d = rawInput.replace(/\D/g, '');
    if (!d) return '';
    // +966 ثم الرقم الوطني بدون 0 الأولى (مثلاً 966551234567 → 0551234567…)
    if (d.startsWith('966')) {
      const rest = d.slice(3);
      if (rest.startsWith('5')) {
        d = '0' + rest;
      }
    }
    // 5XXXXXXXXX (10 أرقام تبدأ بـ 5 بدون 0) → 05...
    if (d.startsWith('5') && !d.startsWith('05')) {
      d = '0' + d;
    }
    return d.slice(0, 11);
  };

  const formatPhoneForSubmit = () => {
    const d = phoneDigits;
    if (d.length !== 11) return d;
    return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 11)}`;
  };

  const validate = () => {
    const nameRegex = /^[a-zA-Z\u0600-\u06FF\s]+$/;
    if (!nameRegex.test(name) || name.trim().length < 3) {
      setError(isAr ? 'الاسم يجب أن يكون 3 أحرف على الأقل' : 'Name must be at least 3 characters');
      return false;
    }
    if (!/^05\d{9}$/.test(phoneDigits)) {
      setError(
        isAr
          ? 'رقم الجوال غير صحيح (11 رقماً مع الصفر، يبدأ بـ 05)'
          : 'Invalid phone: 11 digits including leading 0 (starts with 05)'
      );
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    setError('');

    if (!initialData || !initialData.uid) {
      setError(isAr ? 'خطأ في البيانات. يرجى المحاولة مرة أخرى.' : 'Data error. Please try again.');
      console.error('initialData missing:', initialData);
      return;
    }

    if (!validate()) {
      return;
    }

    setIsSaving(true);

    try {
      const newUser: User = {
        uid: initialData.uid,
        email: initialData.email || '',
        name: name.trim(),
        phone: formatPhoneForSubmit(),
        role: 'user',
        avatar: initialData.avatar || `https://i.pravatar.cc/150?u=${initialData.uid}`
      };

      await firebase.saveProfile(newUser);
      onDone(newUser);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(isAr ? 'حدث خطأ أثناء الحفظ. يرجى المحاولة مرة أخرى.' : 'Save error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const avatar = initialData?.avatar;
  const email = initialData?.email;
  const canSubmit = nameValid && phoneValid && !isSaving;

  return (
    <div className="relative h-full bg-[#050505] flex flex-col overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/8 blur-[100px] rounded-full"></div>
        <div className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] bg-primary/5 blur-[100px] rounded-full"></div>
        <div className="absolute top-1/3 right-0 w-48 h-48 bg-white/[0.02] blur-[60px] rounded-full"></div>
      </div>

      {/* Scrollable content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-7 py-10 overflow-y-auto hide-scrollbar">

        {/* Avatar + Welcome section */}
        <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Avatar */}
          <div className="relative mx-auto mb-6 w-24 h-24">
            {avatar ? (
              <>
                <img
                  src={avatar}
                  alt="avatar"
                  className="w-24 h-24 rounded-full object-cover border-[3px] border-primary/40 shadow-xl shadow-primary/10"
                />
                {/* Gold ring glow */}
                <div className="absolute -inset-1 rounded-full border-2 border-primary/20 animate-pulse"></div>
              </>
            ) : (
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center border-[3px] border-primary/30">
                <span className="material-icons-round text-primary text-5xl">person_add</span>
              </div>
            )}
            {/* Check badge */}
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center border-[3px] border-[#050505] shadow-lg shadow-primary/30">
              <span className="material-icons-round text-black text-sm font-bold">check</span>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-[26px] font-black text-white mb-2 leading-tight">
            {isAr ? 'أكمل ملفك الشخصي' : 'Complete Your Profile'}
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto">
            {isAr
              ? 'أدخل معلوماتك لتتمكن من حجز المواعيد بسهولة'
              : 'Enter your details to start booking appointments'}
          </p>

          {/* Email badge */}
          {email && (
            <div className="mt-4 inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full py-2 px-5">
              <span className="material-icons-round text-primary text-sm">email</span>
              <span className="text-gray-400 text-xs font-medium" dir="ltr">{email}</span>
            </div>
          )}
        </div>

        {/* Form */}
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">

          {/* Name field */}
          <div>
            <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] mb-3 px-2">
              <span className={`transition-colors duration-300 ${focusedField === 'name' ? 'text-primary' : 'text-primary/50'}`}>
                {isAr ? 'الاسم الكامل' : 'FULL NAME'}
              </span>
              {nameValid && (
                <span className="material-icons-round text-green-400 text-xs animate-in zoom-in duration-300">check_circle</span>
              )}
            </label>
            <div className="relative">
              <span className={`absolute ${isAr ? 'right-5' : 'left-5'} top-1/2 -translate-y-1/2 material-icons-round text-xl transition-colors duration-300 ${focusedField === 'name' ? 'text-primary' : 'text-gray-600'}`}>
                person
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && name.trim()) {
                    phoneRef.current?.focus();
                  }
                }}
                className={`w-full bg-white/[0.04] border rounded-2xl py-[18px] ${isAr ? 'pr-14 pl-6' : 'pl-14 pr-6'} text-white text-base transition-all duration-300 focus:ring-0 placeholder:text-gray-700 ${
                  focusedField === 'name'
                    ? 'border-primary/60 bg-primary/[0.04] shadow-lg shadow-primary/5'
                    : nameValid
                    ? 'border-green-500/20'
                    : 'border-white/10'
                }`}
                placeholder={isAr ? 'مثال: محمد الأحمد' : 'e.g. Mohammed Al-Ahmad'}
              />
            </div>
          </div>

          {/* Phone field */}
          <div>
            <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] mb-3 px-2">
              <span className={`transition-colors duration-300 ${focusedField === 'phone' ? 'text-primary' : 'text-primary/50'}`}>
                {isAr ? 'رقم الجوال' : 'PHONE NUMBER'}
              </span>
              {phoneValid && (
                <span className="material-icons-round text-green-400 text-xs animate-in zoom-in duration-300">check_circle</span>
              )}
            </label>
            <div className="relative">
              {/* Country code badge */}
              <div className={`absolute ${isAr ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5`}>
                <span className="text-sm">🇸🇦</span>
                <span className="text-gray-400 text-xs font-bold" dir="ltr">+966</span>
              </div>
              <input
                ref={phoneRef}
                type="tel"
                dir="ltr"
                value={formatPhoneDisplay(phoneDigits)}
                onChange={(e) => {
                  setPhoneDigits(normalizePhoneDigits(e.target.value));
                }}
                onFocus={() => setFocusedField('phone')}
                onBlur={() => setFocusedField(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canSubmit) {
                    handleSubmit();
                  }
                }}
                className={`w-full bg-white/[0.04] border rounded-2xl py-[18px] ${isAr ? 'pr-[120px] pl-6' : 'pl-[120px] pr-6'} text-base transition-all duration-300 focus:ring-0 placeholder:text-gray-700 ${
                  phoneDigits.length < 2 ? 'text-white/45' : 'text-white'
                } ${
                  focusedField === 'phone'
                    ? 'border-primary/60 bg-primary/[0.04] shadow-lg shadow-primary/5'
                    : phoneValid
                    ? 'border-green-500/20'
                    : 'border-white/10'
                }`}
                placeholder="05XX XXX XXXX"
              />
            </div>
            <p className="text-gray-600 text-[10px] mt-2 px-2">
              {isAr ? '11 رقماً مع الصفر، يبدأ بـ 05 (مثال: 05512345678)' : '11 digits including 0, starts with 05 (e.g. 05512345678)'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <span className="material-icons-round text-red-400 text-lg">error_outline</span>
              <p className="text-red-400 text-xs font-bold flex-1">{error}</p>
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            type="button"
            className={`w-full font-black text-lg py-5 rounded-[28px] active:scale-[0.97] transition-all duration-300 mt-3 relative overflow-hidden ${
              canSubmit
                ? 'bg-primary text-black shadow-2xl shadow-primary/25 hover:shadow-primary/40'
                : 'bg-white/5 text-gray-600 cursor-not-allowed'
            }`}
          >
            {/* Shimmer effect when enabled */}
            {canSubmit && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_3s_infinite]"></div>
            )}
            <span className="relative z-10 flex items-center justify-center gap-3">
              {isSaving ? (
                <>
                  <span className="material-icons-round animate-spin text-xl">refresh</span>
                  {isAr ? 'جارٍ الحفظ...' : 'Saving...'}
                </>
              ) : (
                <>
                  <span className="material-icons-round text-xl">arrow_forward</span>
                  {isAr ? 'حفظ واستمرار' : 'Save & Continue'}
                </>
              )}
            </span>
          </button>

          {/* Privacy note */}
          <p className="text-gray-600 text-[10px] text-center px-4 leading-relaxed mt-2">
            {isAr
              ? 'بياناتك محمية ومشفرة وتستخدم فقط لتأكيد الحجوزات والتواصل معك'
              : 'Your data is encrypted and only used for booking confirmations'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
