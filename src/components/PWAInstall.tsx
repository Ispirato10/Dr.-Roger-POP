import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const PWAInstall: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
    }

    const handler = (e: any) => {
      console.log('beforeinstallprompt event fired');
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Show the install button/banner
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Also check if app is already installed via appinstalled event
    const installedHandler = () => {
      console.log('App was installed');
      setIsStandalone(true);
      setShowInstallBanner(false);
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the PWA install prompt');
    } else {
      console.log('User dismissed the PWA install prompt');
    }

    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  if (isStandalone || !showInstallBanner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9, x: "-50%" }}
        animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
        exit={{ opacity: 0, y: 50, scale: 0.9, x: "-50%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-6 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-md"
      >
        <div className="bg-white dark:bg-[#0f172a] p-1 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-100 overflow-hidden">
          <div className="relative p-5 flex flex-col gap-5">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            
            <div className="flex items-start justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 transform -rotate-3 group-hover:rotate-0 transition-transform">
                  <Smartphone size={28} className="text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-lg text-slate-900 tracking-tight leading-tight">
                      Dr. Roger <span className="text-blue-600">POP</span> no seu bolso!
                    </h3>
                    <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Pro
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1 leading-snug">
                    Instale agora para ter acesso off-line e notificações importantes em tempo real.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowInstallBanner(false)}
                className="text-slate-300 hover:text-slate-600 p-2 hover:bg-slate-50 rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex items-center gap-3 relative z-10">
              <button
                onClick={() => setShowInstallBanner(false)}
                className="flex-1 py-3 rounded-2xl text-sm font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
              >
                Depois
              </button>
              <button
                onClick={handleInstallClick}
                className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-600/20 group"
              >
                <Download size={18} className="group-hover:translate-y-0.5 transition-transform" />
                INSTALAR AGORA
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
