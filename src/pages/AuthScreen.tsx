
import React, { useState } from 'react';
import { firebase } from '../services/FirebaseMock';
import { User } from '../types';
import { useApp } from '../app/App';

interface Props {
  onLogin: (u: Partial<User>) => void;
}

const AuthScreen: React.FC<Props> = ({ onLogin }) => {
  const { language } = useApp();
  const isAr = language === 'ar';
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingPrivilegedUser, setPendingPrivilegedUser] = useState<Partial<User> | null>(null);
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [isVerifyingPasscode, setIsVerifyingPasscode] = useState(false);

  const login = async () => {
    setIsLoading(true);
    setError('');
    try {
      const userData = await firebase.loginWithGoogle();
      // إذا كان المستخدم admin أو barber يحتاج كود سري
      if (userData.role === 'admin' || userData.role === 'barber') {
        setPendingPrivilegedUser(userData);
        return;
      }
      onLogin(userData);
    } catch (err: any) {
      console.error('Login error:', err);
      // رسائل خطأ مفهومة للمستخدم
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setError(isAr ? 'تم إغلاق نافذة تسجيل الدخول' : 'Sign-in popup was closed');
      } else if (code === 'auth/popup-blocked') {
        setError(isAr ? 'تم حظر النافذة المنبثقة. يرجى السماح بها في المتصفح' : 'Popup blocked. Please allow popups');
      } else if (code === 'auth/network-request-failed') {
        setError(isAr ? 'مشكلة في الاتصال بالإنترنت' : 'Network error');
      } else if (code === 'auth/unauthorized-domain') {
        setError(isAr ? 'هذا النطاق غير مسموح. أضف localhost في Firebase Console' : 'Unauthorized domain');
      } else if (code === 'auth/configuration-not-found') {
        setError(isAr
          ? 'لم يتم تفعيل Authentication في Firebase Console. فعّل Google Sign-In أولاً'
          : 'Enable Authentication in Firebase Console first');
      } else {
        setError(isAr ? `فشل تسجيل الدخول: ${err.message}` : `Login failed: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const verifyPasscode = async () => {
    if (!pendingPrivilegedUser?.uid) return;
    setIsVerifyingPasscode(true);
    setPasscodeError('');
    const ok = await firebase.verifyAdminPasscode(pendingPrivilegedUser.uid, passcode);
    setIsVerifyingPasscode(false);
    if (!ok) {
      setPasscodeError(isAr ? 'الكود السري غير صحيح' : 'Invalid passcode');
      return;
    }
    onLogin(pendingPrivilegedUser);
  };

  return (
    <div className="relative h-full w-full flex flex-col animate-in fade-in duration-1000">
      <div className="absolute inset-0">
        <img src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80" className="w-full h-full object-cover grayscale brightness-[0.2]" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center h-full px-10 space-y-12">
        <div className="text-center">
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center border-2 border-primary/30 mx-auto mb-6">
                <span className="material-icons-round text-primary text-4xl">content_cut</span>
            </div>
            <h1 className="text-4xl font-black text-white mb-2">{isAr ? 'تسجيل الدخول' : 'Sign In'}</h1>
            <p className="text-gray-500 font-medium tracking-wide">{isAr ? 'سجل الدخول باستخدام حساب Google' : 'Sign in with your Google account'}</p>
        </div>

        <div className="w-full max-w-sm flex flex-col gap-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-3xl text-sm text-center flex items-center gap-3 justify-center">
                <span className="material-icons-round text-lg">error_outline</span>
                <span>{error}</span>
              </div>
            )}

            {/* زر تسجيل الدخول عبر Google */}
            <button 
              onClick={login}
              disabled={isLoading}
              className="bg-white/10 border-2 border-white/20 hover:border-primary/50 p-6 rounded-3xl flex items-center justify-center gap-4 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center gap-3">
                  <span className="material-icons-round text-primary animate-spin">refresh</span>
                  <span className="text-white font-bold">{isAr ? 'جاري التحميل...' : 'Loading...'}</span>
                </span>
              ) : (
                <>
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
                  <span className="text-white font-bold text-lg">{isAr ? 'تسجيل الدخول مع Google' : 'Sign in with Google'}</span>
                </>
              )}
            </button>

            <div className="text-center text-gray-500 text-xs mt-4">
              <p>{isAr ? 'بالضغط على الزر، أنت توافق على شروط الاستخدام وسياسة الخصوصية' : 'By pressing the button, you agree to the terms of use and privacy policy'}</p>
            </div>
        </div>
      </div>

      {/* نافذة التحقق من الكود السري للأدمن والحلاقين */}
      {pendingPrivilegedUser && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 modal-overlay-enter">
          <div className="w-full max-w-sm bg-[#111] border border-white/10 rounded-[32px] p-6 space-y-4 modal-content-enter">
            <h3 className="text-white font-black text-xl text-center">{isAr ? 'تحقق الأدمن' : 'Admin Verification'}</h3>
            <p className="text-gray-400 text-sm text-center">{isAr ? 'أدخل الكود السري للمتابعة إلى لوحة التحكم' : 'Enter passcode to continue'}</p>
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && passcode && !isVerifyingPasscode) {
                  verifyPasscode();
                }
              }}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-primary transition-all text-center text-2xl tracking-widest"
              placeholder="••••"
              autoFocus
            />
            {passcodeError && <p className="text-red-400 text-xs text-center">{passcodeError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setPendingPrivilegedUser(null);
                  setPasscode('');
                  setPasscodeError('');
                }}
                className="flex-1 py-3 rounded-2xl border border-white/10 text-gray-300 font-bold"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={verifyPasscode}
                disabled={!passcode || isVerifyingPasscode}
                className="flex-1 py-3 rounded-2xl bg-primary text-black font-black disabled:opacity-50"
              >
                {isVerifyingPasscode ? (isAr ? '...جارٍ التحقق' : 'Verifying...') : (isAr ? 'تأكيد' : 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthScreen;
