import React, { useEffect, useState } from 'react';
import { 
  Download, 
  X, 
  Smartphone, 
  Sparkles, 
  Zap, 
  WifiOff, 
  ShieldCheck, 
  Share2, 
  PlusSquare, 
  ChevronRight,
  CheckCircle2,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const PWAInstall: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [showGenericGuide, setShowGenericGuide] = useState(false);

  useEffect(() => {
    // 1. Check if already installed in standalone mode
    const inStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone === true;
    if (inStandalone) {
      setIsStandalone(true);
      return;
    }

    // 2. Check if device is iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 3. Listen for browser 'beforeinstallprompt'
    const promptHandler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Check if user dismissed it recently (within 24h)
      const dismissedAt = localStorage.getItem('dr_roger_pwa_dismissed');
      if (!dismissedAt || Date.now() - parseInt(dismissedAt, 10) > 24 * 60 * 60 * 1000) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', promptHandler);

    // 4. Listen for successful installation
    const installedHandler = () => {
      setIsStandalone(true);
      setShowInstallBanner(false);
      localStorage.removeItem('dr_roger_pwa_dismissed');
    };
    window.addEventListener('appinstalled', installedHandler);

    // 5. Global trigger event to open PWA install manually from anywhere in the app
    const openTriggerHandler = () => {
      setShowInstallBanner(true);
    };
    window.addEventListener('open-pwa-install', openTriggerHandler);

    // 6. Show initial banner after a slight delay if not dismissed recently
    const timer = setTimeout(() => {
      const dismissedAt = localStorage.getItem('dr_roger_pwa_dismissed');
      const isDismissedRecently = dismissedAt && Date.now() - parseInt(dismissedAt, 10) < 24 * 60 * 60 * 1000;
      
      if (!inStandalone && !isDismissedRecently) {
        setShowInstallBanner(true);
      }
    }, 2500);

    return () => {
      window.removeEventListener('beforeinstallprompt', promptHandler);
      window.removeEventListener('appinstalled', installedHandler);
      window.removeEventListener('open-pwa-install', openTriggerHandler);
      clearTimeout(timer);
    };
  }, []);

  const handleDismiss = () => {
    setShowInstallBanner(false);
    setShowIOSInstructions(false);
    setShowGenericGuide(false);
    localStorage.setItem('dr_roger_pwa_dismissed', Date.now().toString());
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setShowInstallBanner(false);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error('PWA install prompt error:', err);
        setShowGenericGuide(true);
      }
    } else {
      setShowGenericGuide(true);
    }
  };

  if (isStandalone || !showInstallBanner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 80, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 60, scale: 0.9, transition: { duration: 0.2 } }}
        transition={{ type: "spring", stiffness: 220, damping: 22 }}
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-1.5rem)] max-w-lg"
      >
        <div className="relative bg-slate-900/95 backdrop-blur-xl text-white p-6 rounded-3xl border border-slate-700/60 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.6)] overflow-hidden">
          
          {/* Ambient Glow Effects */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-blue-500/20 via-indigo-500/20 to-teal-400/10 blur-3xl rounded-full pointer-events-none -mr-16 -mt-16 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-600/15 blur-2xl rounded-full pointer-events-none -ml-12 -mb-12"></div>

          {/* Close Button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800/80 transition-all z-20"
            title="Fechar"
          >
            <X size={18} />
          </button>

          {!showIOSInstructions && !showGenericGuide ? (
            /* Main Suggestive Install Banner */
            <div className="relative z-10 flex flex-col gap-5">
              
              {/* Header section with App Brand */}
              <div className="flex items-start gap-4 pr-6">
                <div className="relative shrink-0">
                  <motion.div 
                    animate={{ rotate: [0, -4, 4, 0] }}
                    transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                    className="w-14 h-14 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-2xl p-0.5 shadow-xl shadow-blue-500/25 flex items-center justify-center relative z-10"
                  >
                    <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center overflow-hidden">
                      <img src="/logorogerpop.png" alt="App Icon" className="w-10 h-10 object-contain drop-shadow" />
                    </div>
                  </motion.div>
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-teal-500 border-2 border-slate-900"></span>
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      <Sparkles size={10} /> App Web
                    </span>
                    <span className="text-xs text-slate-400 font-bold">• Dr. Roger POP</span>
                  </div>
                  
                  <h3 className="text-base sm:text-lg font-black tracking-tight leading-snug text-white">
                    Instale no seu dispositivo para ter a melhor experiência!
                  </h3>
                </div>
              </div>

              {/* Value Propositions / Benefits Pills */}
              <div className="grid grid-cols-3 gap-2 py-1">
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-2.5 flex flex-col items-center text-center gap-1.5">
                  <Zap size={16} className="text-amber-400 shrink-0" />
                  <span className="text-[11px] font-extrabold text-slate-200 leading-tight">Acesso Instantâneo</span>
                </div>
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-2.5 flex flex-col items-center text-center gap-1.5">
                  <WifiOff size={16} className="text-teal-400 shrink-0" />
                  <span className="text-[11px] font-extrabold text-slate-200 leading-tight">Suporte Off-line</span>
                </div>
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-2.5 flex flex-col items-center text-center gap-1.5">
                  <ShieldCheck size={16} className="text-blue-400 shrink-0" />
                  <span className="text-[11px] font-extrabold text-slate-200 leading-tight">Seguro e Leve</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Adicione o aplicativo diretamente à sua tela inicial sem gastar memória. Funciona como um app nativo, rápido e sempre atualizado!
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleDismiss}
                  className="px-4 py-3 rounded-2xl text-xs font-extrabold text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                >
                  Agora não
                </button>

                <button
                  onClick={handleInstallClick}
                  className="flex-1 py-3.5 px-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-black tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-95 transition-all group"
                >
                  <Download size={16} className="group-hover:translate-y-0.5 transition-transform" />
                  <span>{isIOS ? 'Como Instalar no iOS' : 'Instalar Aplicativo'}</span>
                </button>
              </div>

            </div>
          ) : showIOSInstructions ? (
            /* iOS Specific Step-by-Step Visual Instructions */
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative z-10 flex flex-col gap-4 pr-2"
            >
              <div className="flex items-center gap-2 text-blue-400 font-black text-sm uppercase tracking-wider">
                <Smartphone size={18} />
                <span>Instalação no iPhone / iPad</span>
              </div>

              <p className="text-xs text-slate-300 font-medium">
                No Safari do seu iPhone, siga estes 2 passos simples:
              </p>

              <div className="space-y-2.5 text-xs text-slate-200">
                <div className="flex items-start gap-3 bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <p className="font-bold">Toque no botão Compartilhar</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                      Localizado na barra inferior do Safari <Share2 size={13} className="text-blue-400 inline" />
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <p className="font-bold">Selecione "Adicionar à Tela de Início"</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                      Role o menu e toque em <PlusSquare size={13} className="text-blue-400 inline" /> para concluir
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setShowIOSInstructions(false)}
                  className="text-xs text-slate-400 hover:text-white font-bold transition-colors"
                >
                  ← Voltar
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-colors"
                >
                  Entendi
                </button>
              </div>
            </motion.div>
          ) : (
            /* Generic / Browser Menu Guide Fallback */
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative z-10 flex flex-col gap-4"
            >
              <div className="flex items-center gap-2 text-blue-400 font-black text-sm uppercase tracking-wider">
                <Info size={18} />
                <span>Instalação pelo Navegador</span>
              </div>

              <p className="text-xs text-slate-300 font-medium">
                Para instalar o app diretamente pelo seu navegador:
              </p>

              <div className="space-y-2 text-xs text-slate-200">
                <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60 flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-teal-400 shrink-0" />
                  <div>
                    <p className="font-bold">Abra o menu do seu navegador (⋮ ou ⚙️)</p>
                    <p className="text-[11px] text-slate-400">Clique nos três pontos no canto superior</p>
                  </div>
                </div>

                <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60 flex items-center gap-3">
                  <Download size={18} className="text-blue-400 shrink-0" />
                  <div>
                    <p className="font-bold">Selecione "Instalar aplicativo" ou "Adicionar à tela inicial"</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setShowGenericGuide(false)}
                  className="text-xs text-slate-400 hover:text-white font-bold transition-colors"
                >
                  ← Voltar
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-colors"
                >
                  Entendi
                </button>
              </div>
            </motion.div>
          )}

        </div>
      </motion.div>
    </AnimatePresence>
  );
};
