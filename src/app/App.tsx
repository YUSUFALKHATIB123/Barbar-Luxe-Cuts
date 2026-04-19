
import React, { useState, useEffect, createContext, useContext } from 'react';
import { Screen, User } from '../types';
import SplashScreen from '../pages/SplashScreen';
import OnboardingScreen from '../pages/OnboardingScreen';
import AuthScreen from '../pages/AuthScreen';
import ProfileSetup from '../pages/ProfileSetup';
import HomeScreen from '../pages/HomeScreen';
import BarberProfileScreen from '../pages/BarberProfileScreen';
import PaymentScreen from '../pages/PaymentScreen';
import ConfirmationScreen from '../pages/ConfirmationScreen';
import SettingsScreen from '../pages/SettingsScreen';
import BarberDashboard from '../pages/BarberDashboard';
import BranchManagerDashboard from '../pages/BranchManagerDashboard';
import BookingHistory from '../pages/BookingHistory';
import { translations } from '../locales/translations';
import { NotificationService } from '../services/NotificationService';

interface AppState {
  user: User | null;
  language: 'ar' | 'en';
  setUser: (u: User | null) => void;
  setLanguage: (l: 'ar' | 'en') => void;
  t: (key: keyof typeof translations['ar']) => string;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within Provider");
  return context;
};

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.Splash);
  const [user, setUser] = useState<User | null>(null);
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [selectedData, setSelectedData] = useState<any>(null);

  const t = (key: keyof typeof translations['ar']) => {
    return translations[language][key] || key;
  };

  const navigate = (screen: Screen, data?: any) => {
    if (data) setSelectedData(data);
    setCurrentScreen(screen);
  };

  const logout = () => {
    setUser(null);
    setSelectedData(null);
    setCurrentScreen(Screen.Auth);
    // لإعادة تهيئة الحالة تماماً نستخدم التحديث البسيط بدلاً من الـ reload الثقيل
  };

  useEffect(() => {
    if (currentScreen === Screen.Splash) {
      setTimeout(() => navigate(Screen.Onboarding), 2500);
    }
  }, [currentScreen]);

  const isRTL = language === 'ar';
  const screenTransitionClass = 'h-full w-full screen-enter';

  const renderCurrentScreen = () => {
    if (currentScreen === Screen.Splash) return <SplashScreen />;
    if (currentScreen === Screen.Onboarding) return <OnboardingScreen onComplete={() => navigate(Screen.Auth)} />;
    if (currentScreen === Screen.Auth) {
      return (
        <AuthScreen
          onLogin={async (u) => {
            console.log('onLogin called with user:', u);
            // مستخدم لديه phone يعني ملف شخصي مكتمل (موجود في Firestore)
            if (u.phone) {
              setUser(u as User);
              // تهيئة الإشعارات للمستخدم
              if (u.uid) {
                NotificationService.initializeForUser(u.uid).catch(console.error);
              }
              // توجيه حسب الدور
              console.log('User role:', u.role, 'branchId:', u.branchId);
              if (u.role === 'barber') {
                console.log('Navigating to BarberDashboard');
                navigate(Screen.BarberDashboard);
              } else if (u.role === 'admin') {
                // جميع الأدمن يذهبون إلى لوحة مدير الصالة
                console.log('Navigating to BranchManagerDashboard');
                navigate(Screen.BranchManagerDashboard);
              } else {
                console.log('Navigating to Home');
                navigate(Screen.Home);
              }
            } else {
              // مستخدم جديد بدون رقم جوال → يحتاج إكمال الملف الشخصي
              console.log('No phone (new user), navigating to ProfileSetup');
              navigate(Screen.ProfileSetup, u);
            }
          }}
        />
      );
    }
    if (currentScreen === Screen.ProfileSetup) {
      return <ProfileSetup initialData={selectedData} onDone={async (u) => { 
        setUser(u);
        // تهيئة الإشعارات للمستخدم الجديد
        if (u.uid) {
          NotificationService.initializeForUser(u.uid).catch(console.error);
        }
        navigate(Screen.Home);
      }} />;
    }
    if (currentScreen === Screen.Home) {
      return <HomeScreen onProfile={() => navigate(Screen.Settings)} onSelectBarber={(b) => navigate(Screen.BarberProfile, b)} />;
    }
    if (currentScreen === Screen.BarberProfile) {
      return <BarberProfileScreen barber={selectedData} onBack={() => navigate(Screen.Home)} onBook={(b) => navigate(Screen.Payment, b)} />;
    }
    if (currentScreen === Screen.Payment) {
      return <PaymentScreen booking={selectedData} onBack={() => navigate(Screen.BarberProfile, selectedData.barber)} onDone={(createdBooking) => navigate(Screen.Confirmation, createdBooking)} />;
    }
    if (currentScreen === Screen.Confirmation) {
      return <ConfirmationScreen onFinish={() => {
        // جدولة إشعارات للحجز الجديد
        if (selectedData && user?.uid) {
          NotificationService.scheduleBookingNotifications(selectedData);
        }
        navigate(Screen.Home);
      }} booking={selectedData} />;
    }
    if (currentScreen === Screen.Settings) {
      return (
        <SettingsScreen
          onBack={() => {
            if (user?.role === 'barber') {
              navigate(Screen.BarberDashboard);
            } else if (user?.role === 'admin') {
              navigate(Screen.BranchManagerDashboard);
            } else {
              navigate(Screen.Home);
            }
          }}
          onHistory={() => navigate(Screen.BookingHistory)}
          onAdmin={() => {
            if (user?.role === 'barber') {
              navigate(Screen.BarberDashboard);
            } else if (user?.role === 'admin') {
              navigate(Screen.BranchManagerDashboard);
            }
          }}
          onLogout={() => {
            NotificationService.clearAll();
            logout();
          }}
        />
      );
    }
    if (currentScreen === Screen.BarberDashboard) {
      return <BarberDashboard onProfile={() => navigate(Screen.Settings)} />;
    }
    if (currentScreen === Screen.BranchManagerDashboard) {
      return <BranchManagerDashboard onProfile={() => navigate(Screen.Settings)} />;
    }
    if (currentScreen === Screen.BookingHistory) {
      return <BookingHistory onBack={() => navigate(Screen.Settings)} />;
    }
    return null;
  };

  return (
    <AppContext.Provider value={{ user, language, setUser, setLanguage, t }}>
      <div
        lang={language}
        className={`min-h-[100dvh] w-full bg-background-dark ${isRTL ? 'font-sans' : 'font-latin'}`}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className="relative min-h-[100dvh] h-[100dvh] w-full max-w-none overflow-hidden">
          <div className={screenTransitionClass} key={currentScreen}>
            {renderCurrentScreen()}
          </div>
        </div>
      </div>
    </AppContext.Provider>
  );
};

export default App;
