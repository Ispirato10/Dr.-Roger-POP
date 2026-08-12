import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Settings as SettingsIcon, 
  Check, 
  Save, 
  Activity, 
  Heart, 
  Thermometer, 
  Syringe, 
  Building2, 
  CheckCircle2, 
  Loader2, 
  Sliders,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

export interface EnabledServicesConfig {
  glicemia: boolean;
  pressao: boolean;
  temperatura: boolean;
  injetaveis: boolean;
}

export const DEFAULT_ENABLED_SERVICES: EnabledServicesConfig = {
  glicemia: true,
  pressao: true,
  temperatura: true,
  injetaveis: true
};

export default function SettingsPage() {
  const { user, drugstore, refreshDrugstore } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Settings state
  const [services, setServices] = useState<EnabledServicesConfig>(DEFAULT_ENABLED_SERVICES);
  const [autoOpenPDF, setAutoOpenPDF] = useState(true);
  const [showDisclaimer, setShowDisclaimer] = useState(true);

  useEffect(() => {
    if (drugstore?.enabledServices) {
      setServices({
        ...DEFAULT_ENABLED_SERVICES,
        ...drugstore.enabledServices
      });
    } else {
      // Check local storage fallback
      const savedLocal = localStorage.getItem('dr_roger_enabled_services');
      if (savedLocal) {
        try {
          setServices({ ...DEFAULT_ENABLED_SERVICES, ...JSON.parse(savedLocal) });
        } catch (e) {
          console.error(e);
        }
      }
    }

    if (drugstore?.pdfOptions) {
      if (typeof drugstore.pdfOptions.autoOpenPDF === 'boolean') setAutoOpenPDF(drugstore.pdfOptions.autoOpenPDF);
      if (typeof drugstore.pdfOptions.showDisclaimer === 'boolean') setShowDisclaimer(drugstore.pdfOptions.showDisclaimer);
    }
  }, [drugstore]);

  const toggleService = (key: keyof EnabledServicesConfig) => {
    setServices(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    if (!user || !drugstore?.id) {
      alert("Você precisa estar conectado com uma drogaria cadastrada.");
      return;
    }

    setIsSaving(true);
    setSavedSuccess(false);

    try {
      // LocalStorage backup for speed
      localStorage.setItem('dr_roger_enabled_services', JSON.stringify(services));

      const drugstoreRef = doc(db, 'drugstores', drugstore.id);
      await updateDoc(drugstoreRef, {
        enabledServices: services,
        pdfOptions: {
          autoOpenPDF,
          showDisclaimer
        },
        updatedAt: new Date().toISOString()
      });

      await refreshDrugstore();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (error) {
      console.error("Error saving settings:", error);
      handleFirestoreError(error, OperationType.WRITE, `drugstores/${drugstore.id}`);
    } finally {
      setIsSaving(false);
    }
  };

  const serviceList: { id: keyof EnabledServicesConfig; label: string; desc: string; icon: any; color: string; bg: string }[] = [
    {
      id: 'glicemia',
      label: 'Glicemia Capilar',
      desc: 'Aferição de glicose no sangue com tabela de referência de Jejum e Diabetes',
      icon: Activity,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    {
      id: 'pressao',
      label: 'Pressão Arterial',
      desc: 'Aferição de PAS/PAD com tabela de referência V Diretrizes Brasileiras (SBC/SBH/SBN)',
      icon: Heart,
      color: 'text-red-600',
      bg: 'bg-red-50'
    },
    {
      id: 'temperatura',
      label: 'Temperatura Corporal',
      desc: 'Aferição de temperatura com faixas de Normotermia, Estado Febril e Febre',
      icon: Thermometer,
      color: 'text-orange-600',
      bg: 'bg-orange-50'
    },
    {
      id: 'injetaveis',
      label: 'Administração de Injetáveis',
      desc: 'Aplicação de injetáveis, vias, lote, validade e geração automática do Termo de Ciência',
      icon: Syringe,
      color: 'text-purple-600',
      bg: 'bg-purple-50'
    }
  ];

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 pb-24">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
              <SettingsIcon size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Configurações do Sistema</h1>
              <p className="text-slate-500 font-medium text-sm mt-0.5">Gerencie os serviços prestados e opções das declarações de saúde.</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md active:scale-95 disabled:opacity-70 self-start sm:self-auto"
        >
          {isSaving ? (
            <Loader2 size={18} className="animate-spin" />
          ) : savedSuccess ? (
            <Check size={18} className="text-emerald-300" />
          ) : (
            <Save size={18} />
          )}
          <span>{savedSuccess ? 'Salvo com Sucesso!' : 'Salvar Configurações'}</span>
        </button>
      </div>

      {savedSuccess && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 shadow-sm">
          <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
          <span className="text-sm font-bold">Suas preferências foram salvas com sucesso e já estão aplicadas na tela de Declarações!</span>
        </motion.div>
      )}

      {/* Main Settings Sections */}
      <div className="space-y-6">
        {/* Section 1: Servicios Prestados */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <Sliders className="text-blue-600" size={22} />
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Serviços Prestados (Declarações)</h2>
              <p className="text-xs text-slate-500 font-medium">Ative ou oculte quais serviços farmacêuticos estarão disponíveis na página de Declarações da sua drogaria.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {serviceList.map(item => {
              const Icon = item.icon;
              const isEnabled = services[item.id];

              return (
                <div
                  key={item.id}
                  onClick={() => toggleService(item.id)}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-4 select-none ${
                    isEnabled 
                      ? 'border-blue-500 bg-blue-50/30 shadow-sm' 
                      : 'border-slate-200 bg-slate-50/50 opacity-70 hover:opacity-100 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${item.bg} ${item.color} flex items-center justify-center shrink-0`}>
                        <Icon size={20} />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 text-base">{item.label}</h3>
                        <span className={`text-[11px] font-bold uppercase tracking-wider ${isEnabled ? 'text-blue-600' : 'text-slate-400'}`}>
                          {isEnabled ? '• Ativo no Sistema' : '• Oculto na Declaração'}
                        </span>
                      </div>
                    </div>

                    {/* Custom Toggle Switch */}
                    <div className={`w-12 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${isEnabled ? 'bg-blue-600' : 'bg-slate-300'}`}>
                      <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: Preferências de PDF e Emissão */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <FileText className="text-blue-600" size={22} />
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Opções do PDF da Declaração</h2>
              <p className="text-xs text-slate-500 font-medium">Ajuste o comportamento do documento PDF gerado para o cliente.</p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <label className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
              <div>
                <span className="text-sm font-black text-slate-800 block">Exibir aviso de não diagnóstico médico no PDF</span>
                <span className="text-xs text-slate-500">Imprime o texto de ressalva legal no rodapé ("Este procedimento não tem finalidade de diagnóstico...").</span>
              </div>
              <input
                type="checkbox"
                checked={showDisclaimer}
                onChange={(e) => setShowDisclaimer(e.target.checked)}
                className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
            </label>
          </div>
        </div>

        {/* Section 3: Pharmacy Info Link */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-blue-400 font-black text-xs uppercase tracking-wider">
              <Building2 size={16} />
              <span>Drogaria Cadastrada</span>
            </div>
            <h3 className="text-xl font-black">{drugstore?.name || 'Sua Drogaria'}</h3>
            <p className="text-xs text-slate-400">CNPJ: {drugstore?.cnpj || '-'} | CRF: {drugstore?.crf || '-'} | Resp.: {drugstore?.pharmacist || '-'}</p>
          </div>

          <a
            href="/profile"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all whitespace-nowrap"
          >
            Editar Dados da Drogaria
          </a>
        </div>
      </div>
    </div>
  );
}
