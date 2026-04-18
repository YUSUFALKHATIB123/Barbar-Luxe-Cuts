
import React from 'react';

const SplashScreen: React.FC = () => {
  return (
    <div className="h-full w-full flex flex-col items-center justify-between bg-background-dark py-20 animate-in fade-in duration-700">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="relative mb-8 w-32 h-32 flex items-center justify-center animate-in zoom-in duration-500 fill-mode-both" style={{ animationDelay: '200ms' }}>
          <div className="absolute w-1 h-24 bg-gold-gradient rounded-full transform -rotate-12 translate-x-[-10px]"></div>
          <div className="absolute w-20 h-20 border-4 border-primary border-r-transparent rounded-full transform rotate-45 translate-x-[10px]"></div>
          <div className="absolute w-4 h-4 bg-primary rounded-full shadow-[0_0_15px_rgba(244,182,37,0.5)] z-10"></div>
        </div>
        <div className="text-center animate-in fade-in slide-in-from-bottom-2 duration-600 fill-mode-both" style={{ animationDelay: '400ms' }}>
          <h1 className="font-serif text-4xl font-bold tracking-[0.2em] text-primary uppercase">Luxe Cuts</h1>
          <p className="mt-4 text-primary/60 text-sm font-medium tracking-[0.4em] uppercase">The Art of Precision</p>
        </div>
      </div>
      
      <div className="w-full max-w-xs px-8 flex flex-col gap-6 items-center animate-in fade-in duration-500 fill-mode-both" style={{ animationDelay: '600ms' }}>
        <div className="w-full flex flex-col gap-3">
          <div className="flex justify-between items-end">
            <span className="text-primary/70 text-[10px] font-bold tracking-widest uppercase">Initializing</span>
            <span className="text-primary text-[10px] font-bold tracking-widest uppercase">64%</span>
          </div>
          <div className="h-[2px] w-full bg-primary/10 rounded-full overflow-hidden">
            <div className="h-full bg-gold-gradient rounded-full splash-progress-bar"></div>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <span className="material-icons-round text-primary text-xs">verified_user</span>
           <p className="text-primary/60 text-[11px] font-medium tracking-wide">Premium Barbershop Experience</p>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
