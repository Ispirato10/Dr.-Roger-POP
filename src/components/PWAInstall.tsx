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
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-full max-w-md px-4"
      >
        <div className="bg-[#0f172a] text-white p-5 rounded-2xl shadow-[0_20px_50px_rgba(37,99,235,0.3)] border border-[#334155] flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#2563eb] rounded-xl flex items-center justify-center shadow-lg">
                <Smartphone size={24} />
              </div>
              <div>
                <h3 className="font-bold text-base leading-tight">Instalar Dr. Roger POP</h3>
                <p className="text-sm text-[#94a3b8] mt-1">Acesse o sistema com um clique direto do seu computador ou celular.</p>
              </div>
            </div>
            <button 
              onClick={() => setShowInstallBanner(false)}
              className="text-[#94a3b8] hover:text-white p-1 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setShowInstallBanner(false)}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-[#94a3b8] hover:text-white transition-colors"
            >
              Agora não
            </button>
            <button
              onClick={handleInstallClick}
              className="flex-[2] bg-[#2563eb] hover:bg-[#3b82f6] text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-500/20"
            >
              <Download size={18} />
              Instalar Aplicativo
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
