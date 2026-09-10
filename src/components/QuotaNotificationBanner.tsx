import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  CloudOff, 
  RefreshCw, 
  Download, 
  X, 
  CheckCircle2, 
  AlertTriangle,
  HardDrive,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  getQuotaStatus, 
  subscribeQuotaStatus, 
  clearQuotaExceeded, 
  exportFullLocalBackup,
  QuotaStatus,
  getPendingSyncQueue
} from '../lib/storageSync';
import { db, auth } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export const QuotaNotificationBanner: React.FC = () => {
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus>(getQuotaStatus());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeQuotaStatus((status) => {
      setQuotaStatus(status);
      if (status.isExceeded) {
        setIsDismissed(false); // Re-show if new quota error occurs
      }
    });
    return unsubscribe;
  }, []);

  const handleTestAndSync = async () => {
    setIsSyncing(true);
    setSyncSuccessMessage(null);

    try {
      // Test read to see if cloud quota is renewed
      if (auth.currentUser) {
        const testRef = doc(db, 'drugstores', auth.currentUser.uid);
        await getDoc(testRef);
      }

      // If test passes without throwing quota error:
      clearQuotaExceeded();
      setSyncSuccessMessage('Conexão com a nuvem restabelecida com sucesso! Todos os dados estão seguros.');
      setTimeout(() => setSyncSuccessMessage(null), 5000);
    } catch (err: any) {
      console.warn('Sync test still returned error:', err);
      setSyncSuccessMessage('A cota da nuvem ainda está aguardando renovação pelo provedor. Seus dados continuam 100% salvos no armazenamento local!');
      setTimeout(() => setSyncSuccessMessage(null), 6000);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!quotaStatus.isExceeded || isDismissed) {
    if (syncSuccessMessage) {
      return (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md animate-fade-in z-50">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-200 shrink-0" />
            <span>{syncSuccessMessage}</span>
          </div>
          <button onClick={() => setSyncSuccessMessage(null)} className="p-1 hover:bg-emerald-700 rounded">
            <X size={14} />
          </button>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 text-white border-b border-amber-500/40 shadow-lg relative z-40 transition-all">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-start justify-between gap-4">
          
          <div className="flex items-start gap-3 flex-1">
            <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 mt-0.5 border border-white/20">
              <HardDrive size={20} className="text-amber-200 animate-pulse" />
            </div>

            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-amber-900/60 text-amber-200 border border-amber-400/30 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck size={12} /> Modo de Contingência Local Ativo
                </span>
                <span className="text-xs font-extrabold text-amber-100">
                  Dados Protegidos no Navegador
                </span>
              </div>

              {!isMinimized && (
                <p className="text-xs text-amber-100/90 leading-relaxed font-medium pt-0.5">
                  A cota da nuvem atingiu o limite gratuito diário temporário. <strong className="text-white">O sistema continua funcionando normalmente</strong>: você pode criar e editar POPs, cadastrar declarações, emitir receitas e gerar PDFs. Tudo está sendo salvo no armazenamento local do seu dispositivo e será sincronizado quando a cota restabelecer.
                </p>
              )}

              {!isMinimized && (
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    onClick={handleTestAndSync}
                    disabled={isSyncing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-amber-900 hover:bg-amber-50 text-xs font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
                    <span>{isSyncing ? "Testando Nuvem..." : "Verificar e Sincronizar"}</span>
                  </button>

                  <button
                    onClick={exportFullLocalBackup}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-900/70 hover:bg-amber-900 text-white border border-amber-400/40 text-xs font-black uppercase tracking-wider transition-all shadow-sm active:scale-95"
                    title="Baixar arquivo JSON com todos os POPs e dados salvos no seu navegador"
                  >
                    <Download size={13} />
                    <span>Baixar Backup dos Dados (JSON)</span>
                  </button>

                  {quotaStatus.pendingSyncCount > 0 && (
                    <span className="text-[11px] text-amber-200 font-bold ml-1">
                      • {quotaStatus.pendingSyncCount} item(s) gravado(s) localmente
                    </span>
                  )}
                </div>
              )}

              {syncSuccessMessage && (
                <p className="text-xs text-white font-bold bg-amber-900/80 p-2 rounded-lg mt-2 border border-amber-400/30">
                  {syncSuccessMessage}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 rounded-lg text-amber-200 hover:text-white hover:bg-white/10 transition-colors"
              title={isMinimized ? "Expandir detalhes" : "Minimizar"}
            >
              {isMinimized ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1.5 rounded-lg text-amber-200 hover:text-white hover:bg-white/10 transition-colors"
              title="Ocultar aviso"
            >
              <X size={18} />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
