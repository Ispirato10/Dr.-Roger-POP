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
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Show the install button/banner
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
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
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-full max-w-sm px-4"
      >
        <div className="bg-[#1e293b] text-white p-4 rounded-2xl shadow-2xl border border-[#334155] flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#2563eb] rounded-xl flex items-center justify-center">
                <Smartphone size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">Instalar Aplicativo</h3>
                <p className="text-xs text-[#94a3b8]">Acesse o Dr. Roger POP mais rápido direto da sua tela inicial</p>
              </div>
            </div>
            <button 
              onClick={() => setShowInstallBanner(false)}
              className="text-[#94a3b8] hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          
          <button
            onClick={handleInstallClick}
            className="w-full bg-[#2563eb] hover:bg-[#3b82f6] text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Download size={16} />
            Instalar Agora
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
