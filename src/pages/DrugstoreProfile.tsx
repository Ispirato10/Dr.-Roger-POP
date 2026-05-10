import React from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../contexts/AuthContext';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Building2, Save, Loader2 } from 'lucide-react';

const drugstoreSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  cnpj: z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/, "CNPJ inválido (00.000.000/0000-00)"),
  crf: z.string().min(3, "CRF inválido"),
  address: z.string().min(5, "Endereço completo é necessário"),
  phone: z.string().min(8, "Telefone inválido"),
  email: z.string().email("E-mail inválido"),
  hours: z.string().optional(),
  logoUrl: z.string().optional(),
});

type DrugstoreFormValues = z.infer<typeof drugstoreSchema>;

export default function DrugstoreProfile() {
  const { user, drugstore, refreshDrugstore } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [logoPreview, setLogoPreview] = React.useState<string | null>(drugstore?.logoUrl || null);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<DrugstoreFormValues>({
    resolver: zodResolver(drugstoreSchema),
    defaultValues: drugstore || {
      email: user?.email || '',
    }
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setLogoPreview(base64String);
        setValue('logoUrl', base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (values: DrugstoreFormValues) => {
    if (!user) return;
    setSaving(true);
    setSuccess(false);
    try {
      await setDoc(doc(db, 'drugstores', user.uid), {
        ...values,
        ownerId: user.uid,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      
      await refreshDrugstore();
      setSuccess(true);
      
      // Pequeno delay para o usuário ver a mensagem de sucesso antes de redirecionar
      setTimeout(() => {
        setSuccess(false);
        navigate('/');
      }, 1500);
    } catch (error) {
      console.error("Error saving drugstore:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 px-1 pb-20">
      <div className="flex items-center gap-6 pb-6 border-b border-slate-100">
        <div className="relative">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl shadow-xl shadow-blue-500/20 flex items-center justify-center border border-white/20">
            <Building2 size={36} className="drop-shadow-md" />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-full shadow-md border border-slate-50">
            <Save size={14} className="text-blue-600" />
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
            {drugstore ? 'Dados Institucionais' : 'Configuração Inicial'}
          </h1>
          <p className="text-sm text-slate-400 font-bold tracking-tight uppercase mt-1.5">
            {drugstore ? 'Gerenciamento de credenciais e identificação' : 'Cadastre sua drogaria para começar a emitir POPs'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card shadow-2xl shadow-slate-200/50 border-none p-10 space-y-10 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="md:col-span-2 space-y-6 bg-slate-50 p-8 rounded-3xl border border-slate-100/50">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none block mb-4">Logo da Drogaria (Opcional)</label>
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <div className="w-32 h-32 rounded-2xl bg-white shadow-inner border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0 group hover:border-blue-300 transition-colors">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                ) : (
                  <Building2 className="text-slate-200 group-hover:scale-110 transition-transform" size={48} />
                )}
              </div>
              <div className="space-y-4 text-center sm:text-left">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleLogoChange}
                  className="hidden" 
                  id="logo-upload"
                />
                <label 
                  htmlFor="logo-upload"
                  className="inline-flex items-center gap-2 cursor-pointer bg-white border border-slate-200 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm active:scale-95"
                >
                  <Save size={16} />
                  Alterar Logotipo
                </label>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                  Recomendado: 256x256px<br />formatos PNG, JPG ou WEBP.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Nome da Drogaria / Razão Social</label>
            <input {...register('name')} className="input-field bg-slate-50 border-transparent focus:bg-white text-lg font-black tracking-tight" placeholder="Ex: Farmácia Matriz" />
            {errors.name && <p className="text-xs text-red-500 font-bold mt-1">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">CNPJ</label>
            <input {...register('cnpj')} className="input-field bg-slate-50 border-transparent focus:bg-white font-mono font-bold" placeholder="00.000.000/0000-00" />
            {errors.cnpj && <p className="text-xs text-red-500 font-bold mt-1">{errors.cnpj.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">CRF Institucional</label>
            <input {...register('crf')} className="input-field bg-slate-50 border-transparent focus:bg-white font-mono font-bold" placeholder="CRF-XX 00000" />
            {errors.crf && <p className="text-xs text-red-500 font-bold mt-1">{errors.crf.message}</p>}
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Endereço Completo</label>
            <input {...register('address')} className="input-field bg-slate-50 border-transparent focus:bg-white" placeholder="Rua, Número, Bairro, Cidade - UF" />
            {errors.address && <p className="text-xs text-red-500 font-bold mt-1">{errors.address.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Telefone de Contato</label>
            <input {...register('phone')} className="input-field bg-slate-50 border-transparent focus:bg-white" placeholder="(00) 0000-0000" />
            {errors.phone && <p className="text-xs text-red-500 font-bold mt-1">{errors.phone.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">E-mail Corporativo</label>
            <input {...register('email')} className="input-field bg-slate-50 border-transparent focus:bg-white" placeholder="contato@farmacia.com" />
            {errors.email && <p className="text-xs text-red-500 font-bold mt-1">{errors.email.message}</p>}
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Horário de Funcionamento</label>
            <input {...register('hours')} className="input-field bg-slate-50 border-transparent focus:bg-white" placeholder="Ex: Seg a Sex 08:00 - 20:00, Sáb 08:00 - 12:00" />
          </div>
        </div>

        <div className="pt-8 border-t border-slate-50 flex items-center justify-between gap-6">
          <div className="flex-1">
            {success && (
              <div className="flex items-center gap-3 text-emerald-600 font-black uppercase text-[10px] tracking-widest animate-pulse">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                Dados atualizados com sucesso
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center gap-3 min-w-[200px] justify-center"
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            <span className="uppercase tracking-widest text-xs font-black">{saving ? 'Salvando...' : 'Salvar Dados'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
