import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  ShieldCheck, 
  FileCheck, 
  Cpu, 
  Sparkles, 
  CheckCircle2 
} from 'lucide-react';

interface SplashIntroProps {
  onComplete: () => void;
}

export function SplashIntro({ onComplete }: SplashIntroProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);

  const steps = [
    { text: 'Conectando ao núcleo regulatório...', icon: <Cpu className="w-4 h-4 text-indigo-400" /> },
    { text: 'Verificando segurança e chaves de criptografia...', icon: <ShieldCheck className="w-4 h-4 text-emerald-400" /> },
    { text: 'Compilando modelos e POPs normativos...', icon: <FileCheck className="w-4 h-4 text-blue-400" /> },
    { text: 'Sincronizando controles de temperatura e umidade...', icon: <Activity className="w-4 h-4 text-orange-400" /> },
    { text: 'Otimizando cache de documentos de alta fidelidade...', icon: <Sparkles className="w-4 h-4 text-purple-400" /> },
    { text: 'Sistemas prontos para operação clínica!', icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" /> }
  ];

  // Fast but natural progress bar update
  useEffect(() => {
    const startTime = Date.now();
    const duration = 2400; // 2.4 seconds total animation boost

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const computedProgress = Math.min(Math.floor((elapsed / duration) * 100), 100);
      
      setProgress(computedProgress);

      // Determine step based on percentage
      const stepIndex = Math.min(
        Math.floor((computedProgress / 100) * steps.length),
        steps.length - 1
      );
      setCurrentStep(stepIndex);

      if (computedProgress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsFinishing(true);
          // Graceful fadeout duration coordination
          setTimeout(() => {
            onComplete();
          }, 600);
        }, 150);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {!isFinishing && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col items-center justify-center overflow-hidden font-sans select-none"
        >
          {/* Immersive Modern Background Tech Elements */}
          <div className="absolute inset-0 z-0">
            {/* Soft Ambient Radial Lights */}
            <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px] animate-pulse pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px] animate-pulse pointer-events-none" style={{ animationDelay: '1.5s' }} />
            
            {/* Precision Grid Pattern */}
            <div 
              className="absolute inset-0 opacity-[0.03]" 
              style={{ 
                backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', 
                backgroundSize: '24px 24px' 
              }} 
            />
          </div>

          <div className="relative z-10 flex flex-col items-center max-w-md px-6 text-center">
            {/* Logo Wrapper with Double Spinner Frame */}
            <div className="relative mb-10">
              {/* Outer Glow Circle */}
              <div className="absolute inset-0 bg-blue-500/20 rounded-[2.5rem] blur-2xl scale-110 animate-pulse" />
              
              {/* Spinning Tech Radial Borders */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
                className="absolute -inset-4 border-2 border-dashed border-indigo-500/20 rounded-[2.5rem]"
              />
              <motion.div 
                animate={{ rotate: -360 }}
                transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
                className="absolute -inset-2 border border-blue-500/30 rounded-[2rem]"
              />

              {/* Main Core Brand Shape */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 15 }}
                className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-sky-500 flex items-center justify-center text-white shadow-2xl shadow-blue-500/30"
              >
                {/* Tech scan Line passing through */}
                <motion.div 
                  animate={{ y: [-30, 30, -30] }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                  className="absolute left-0 right-0 h-0.5 bg-cyan-300/60 shadow-[0_0_8px_#22d3ee] z-20"
                />
                
                <Activity className="w-10 h-10 animate-pulse text-white relative z-10" />
              </motion.div>
            </div>

            {/* Application Identifier Title */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <h1 className="text-3xl font-black text-white tracking-tight flex items-center justify-center gap-2">
                <span>DR. ROGER</span>
                <span className="px-2 py-0.5 rounded-lg bg-blue-500/20 border border-blue-500/30 text-[10px] font-black text-cyan-400 tracking-wider uppercase">
                  SOP v2.5
                </span>
              </h1>
              <p className="text-slate-400 text-xs font-semibold tracking-wider uppercase mt-1.5">
                Plataforma de Gestão Normativa
              </p>
            </motion.div>

            {/* Dynamic Diagnostics Status Logger */}
            <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 mb-6 backdrop-blur-md relative overflow-hidden min-h-[58px] flex items-center">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-center gap-3 text-left w-full"
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700/50 shadow-inner">
                    {steps[currentStep]?.icon}
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block leading-none mb-1">Status do Boot</span>
                    <span className="text-xs font-semibold text-slate-200 leading-tight block">
                      {steps[currentStep]?.text}
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Beautiful Progress Bar and Percentage Indicator */}
            <div className="w-full">
              <div className="flex items-center justify-between text-[11px] font-black text-slate-400 tracking-wider uppercase mb-2">
                <span>Otimizando Performance</span>
                <motion.span className="text-cyan-400 font-mono text-xs">{progress}%</motion.span>
              </div>
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800/50 relative">
                <motion.div 
                  className="h-full bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Discreet footer information */}
            <div className="mt-12 text-slate-600 text-[10px] font-medium font-mono select-none">
              SECURE CONNECTED COLD-START ENGINE ACTIVE
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
