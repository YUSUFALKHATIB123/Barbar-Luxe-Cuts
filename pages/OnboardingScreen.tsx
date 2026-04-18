
import React, { useState, useRef } from 'react';
import { useApp } from '../App';

const OnboardingScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { t, language } = useApp();
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleStart = (clientX: number) => {
    setIsDragging(true);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const isRTL = language === 'ar';
    
    // حساب الموضع بناءً على اتجاه اللغة
    const relativeX = isRTL ? (rect.right - clientX) : (clientX - rect.left);
    const width = rect.width - 70; // تعويض عرض أيقونة المقص
    const newProgress = Math.min(Math.max(relativeX / width, 0), 1);
    
    setProgress(newProgress);
    if (newProgress >= 0.98) {
      setIsAnimating(true);
      setIsDragging(false);
      // أنيميشن المقص يفتح
      setTimeout(() => {
        onComplete();
      }, 800);
    }
  };

  const handleEnd = () => {
    if (progress < 0.98) {
      setProgress(0);
    }
    setIsDragging(false);
  };

  const cutPercent = progress * 100;
  const splitOffset = Math.min(progress * 14, 14);

  return (
    <div 
      className="relative h-full w-full bg-[#050505] overflow-hidden flex flex-col select-none"
    >
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80" 
          className="w-full h-full object-cover grayscale brightness-[0.15]" 
          alt="Barber"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black"></div>
      </div>

      {/* Logo في الأعلى */}
      <div className="relative z-20 px-8 pt-16">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
            <span className="material-icons-round text-black text-2xl font-black">content_cut</span>
          </div>
          <div className="flex flex-col">
            <span className="text-white font-serif text-xl font-bold">Luxe</span>
            <span className="text-primary font-serif text-xs font-bold uppercase tracking-wider">CUTS</span>
          </div>
        </div>
      </div>

      {/* النص الرئيسي في المنتصف */}
      <div className="relative z-20 px-8 flex-1 flex items-center justify-center">
        <h1 className="text-4xl sm:text-5xl font-black text-white leading-[1.3] font-sans text-center max-w-[360px]">
          {language === 'ar' ? (
            <>
              اكتشف أفضل{' '}
              <span className="text-primary italic">الحلاقين</span>{' '}
              واحجز مظهرك فوراً
            </>
          ) : (
            <>
              Discover top{' '}
              <span className="text-primary italic">barbers</span>{' '}
              and book your look instantly
            </>
          )}
        </h1>
      </div>

      <div className="relative z-20 mt-auto px-8 pb-20 flex flex-col items-center gap-6">
        {/* الزر الذهبي المطابق للصورة */}
        <div 
          ref={containerRef}
          className="relative w-full max-w-[340px] h-20 gold-gradient rounded-full flex items-center px-8 shadow-[0_15px_40px_rgba(212,175,55,0.3)] group overflow-hidden cursor-grab active:cursor-grabbing"
          onMouseDown={(e) => handleStart(e.clientX)}
          onTouchStart={(e) => handleStart(e.touches[0].clientX)}
          onMouseMove={(e) => handleMove(e.clientX)}
          onTouchMove={(e) => handleMove(e.touches[0].clientX)}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchEnd={handleEnd}
        >
          {/* النص قريب من المقص مع تأثير قص نصفين */}
          <div className="absolute right-20 top-1/2 -translate-y-1/2 w-[130px] h-8 overflow-visible z-20 pointer-events-none">
            <span
              className="absolute inset-0 text-[#0D0D0D] font-black text-lg tracking-tight whitespace-nowrap"
              style={{
                clipPath: 'inset(0 50% 0 0)',
                transform: `translateX(${language === 'ar' ? -splitOffset : splitOffset}px)`,
                transition: isDragging ? 'none' : 'transform 0.16s cubic-bezier(0.22, 1, 0.36, 1)',
                opacity: 1,
              }}
            >
              {t('get_started')}
            </span>
            <span
              className="absolute inset-0 text-[#0D0D0D] font-black text-lg tracking-tight whitespace-nowrap"
              style={{
                clipPath: 'inset(0 0 0 50%)',
                transform: `translateX(${language === 'ar' ? splitOffset : -splitOffset}px)`,
                transition: isDragging ? 'none' : 'transform 0.16s cubic-bezier(0.22, 1, 0.36, 1)',
                opacity: 1,
              }}
            >
              {t('get_started')}
            </span>
          </div>

          {/* منزلق المقص */}
          <div 
            className={`absolute flex items-center justify-center transition-all duration-500 z-30 ${
              isAnimating ? 'scale-150 rotate-12 opacity-0' : ''
            }`}
            style={{ 
              [language === 'ar' ? 'right' : 'left']: `calc(10px + ${progress * (340 - 140)}px)`,
              transition: isDragging ? 'none' : 'all 0.5s cubic-bezier(0.19, 1, 0.22, 1)',
              pointerEvents: 'none',
            }}
          >
            <div 
              className={`w-14 h-14 bg-black/10 rounded-full flex items-center justify-center backdrop-blur-sm shadow-lg ${isDragging ? 'animate-cut' : ''}`}
              style={{
                transform: isDragging ? 'scale(1.1)' : 'scale(1)',
                transition: isDragging ? 'transform 0.1s ease' : 'transform 0.25s ease',
                boxShadow: isDragging 
                  ? '0 4px 12px rgba(13, 13, 13, 0.4), 0 0 8px rgba(212, 175, 55, 0.3)' 
                  : '0 2px 8px rgba(13, 13, 13, 0.2)',
              }}
            >
               <span 
                 className="material-icons-round text-[#0D0D0D] text-3xl font-bold"
                 style={{
                  transform: isDragging ? 'rotate(8deg) scale(1.12)' : 'rotate(0deg) scale(1)',
                   transition: isDragging ? 'transform 0.1s ease' : 'transform 0.3s ease',
                   filter: isDragging ? 'drop-shadow(0 2px 4px rgba(13, 13, 13, 0.5))' : 'none',
                 }}
               >
                 content_cut
               </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingScreen;
