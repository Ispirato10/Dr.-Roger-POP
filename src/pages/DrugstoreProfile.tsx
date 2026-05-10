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
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center space-x-4">
        <div className="p-3 bg-sky-100 text-sky-600 rounded-xl">
          <Building2 size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            {drugstore ? 'Dados da Drogaria' : 'Cadastro da Drogaria'}
          </h1>
          <p className="text-slate-500">
            Mantenha as informações da sua empresa atualizadas para os POPs.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2 space-y-4">
            <label className="text-sm font-semibold text-slate-700 block">Logo da Drogaria (Opcional)</label>
            <div className="flex items-center space-x-4">
              <div className="w-24 h-24 rounded-lg bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-contain" />
                ) : (
                  <Building2 className="text-slate-300" size={32} />
                )}
              </div>
              <div>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleLogoChange}
                  className="hidden" 
                  id="logo-upload"
                />
                <label 
                  htmlFor="logo-upload"
                  className="cursor-pointer bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
                >
                  Alterar Logo
                </label>
                <p className="text-[10px] text-slate-400 mt-2">Recomendado: Quadrado 256x256px (PNG/JPG)</p>
              </div>
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-slate-700">Nome da Drogaria / Razão Social</label>
            <input {...register('name')} className="input-field" placeholder="Ex: Farmácia do Bem" />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">CNPJ</label>
            <input {...register('cnpj')} className="input-field" placeholder="00.000.000/0000-00" />
            {errors.cnpj && <p className="text-xs text-red-500">{errors.cnpj.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">CRF da Drogaria</label>
            <input {...register('crf')} className="input-field" placeholder="CRF-XX 00000" />
            {errors.crf && <p className="text-xs text-red-500">{errors.crf.message}</p>}
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-slate-700">Endereço Completo</label>
            <input {...register('address')} className="input-field" placeholder="Rua, Número, Bairro, Cidade - UF" />
            {errors.address && <p className="text-xs text-red-500">{errors.address.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Telefone</label>
            <input {...register('phone')} className="input-field" placeholder="(00) 0000-0000" />
            {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">E-mail de Contato</label>
            <input {...register('email')} className="input-field" placeholder="contato@farmacia.com" />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-slate-700">Horário de Funcionamento</label>
            <input {...register('hours')} className="input-field" placeholder="Ex: Seg a Sex 08:00 - 20:00, Sáb 08:00 - 12:00" />
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
          {success && (
            <span className="text-green-600 font-medium animate-pulse">Dados salvos com sucesso!</span>
          )}
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center space-x-2 ml-auto"
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            <span>{saving ? 'Salvando...' : 'Salvar Dados'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
