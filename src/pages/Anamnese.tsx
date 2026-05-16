import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Stethoscope, 
  User, 
  Activity, 
  HeartPulse, 
  Thermometer, 
  Droplets, 
  Scale, 
  Save, 
  FileDown, 
  History,
  AlertCircle,
  Pill,
  Clock,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { saveAs } from 'file-saver';

const anamneseSchema = z.object({
  fullName: z.string().min(3, 'Nome é obrigatório'),
  age: z.string().min(1, 'Idade é obrigatória'),
  weight: z.string().optional(),
  height: z.string().optional(),
  bloodPressure: z.string().optional(),
  heartRate: z.string().optional(),
  temperature: z.string().optional(),
  bloodSugar: z.string().optional(),
  complaint: z.string().min(5, 'Descreva a queixa principal'),
  allergies: z.string().optional(),
  medications: z.string().optional(),
  preExistingConditions: z.string().optional(),
  habits: z.string().optional(),
  observations: z.string().optional(),
});

type AnamneseForm = z.infer<typeof anamneseSchema>;

export default function Anamnese() {
  const { drugstore } = useAuth();
  const [success, setSuccess] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<AnamneseForm>({
    resolver: zodResolver(anamneseSchema),
  });

  const onSubmit = (data: AnamneseForm) => {
    console.log('Anamnese Salva:', data);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const generatePDF = (data: AnamneseForm) => {
    setGenerating(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      autoTable(doc, {
        startY: 10,
        margin: { left: 10, right: 10 },
        styles: { fontSize: 9, cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.1 },
        columnStyles: {
          0: { cellWidth: 40, halign: 'center' },
          1: { cellWidth: 'auto', halign: 'center', fontStyle: 'bold', fontSize: 11 },
          2: { cellWidth: 50, fontSize: 8 }
        },
        body: [[
          { content: drugstore?.name || 'DROGARIA', rowSpan: 2 },
          { content: 'REGISTRO DE ANAMNESE FARMACÊUTICA' },
          { content: `DATA: ${format(new Date(), 'dd/MM/yyyy')}\nHORA: ${format(new Date(), 'HH:mm')}` }
        ], [
          { content: 'IDENTIFICAÇÃO E SINAIS VITAIS' },
          { content: `CNPJ: ${drugstore?.cnpj || '-'}` }
        ]],
        theme: 'grid'
      });

      let startY = (doc as any).lastAutoTable.finalY + 10;

      // Patient Data
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('1. IDENTIFICAÇÃO DO PACIENTE', 10, startY);
      startY += 5;
      
      autoTable(doc, {
        startY: startY,
        body: [
          ['Nome:', data.fullName, 'Idade:', data.age],
          ['Peso:', data.weight || '-', 'Altura:', data.height || '-'],
        ],
        styles: { fontSize: 9 },
        theme: 'plain'
      });

      startY = (doc as any).lastAutoTable.finalY + 5;

      // Vital Signs
      doc.setFont('helvetica', 'bold');
      doc.text('2. SINAIS VITAIS E PARÂMETROS', 10, startY);
      startY += 5;

      autoTable(doc, {
        startY: startY,
        head: [['P. Arterial', 'F. Cardíaca', 'Temperatura', 'Glicemia (mg/dL)']],
        body: [[data.bloodPressure || '-', data.heartRate || '-', data.temperature || '-', data.bloodSugar || '-']],
        styles: { fontSize: 9, halign: 'center' },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
        theme: 'grid'
      });

      startY = (doc as any).lastAutoTable.finalY + 10;

      // Clinical Evaluation
      doc.setFont('helvetica', 'bold');
      doc.text('3. AVALIAÇÃO CLÍNICA', 10, startY);
      startY += 2;

      autoTable(doc, {
        startY: startY,
        body: [
          [{ content: 'Queixa Principal:', styles: { fontStyle: 'bold' } }, data.complaint],
          [{ content: 'Alergias:', styles: { fontStyle: 'bold' } }, data.allergies || 'Nenhuma informada'],
          [{ content: 'Medicamentos em uso:', styles: { fontStyle: 'bold' } }, data.medications || 'Nenhum informado'],
          [{ content: 'Condições pré-existentes:', styles: { fontStyle: 'bold' } }, data.preExistingConditions || 'Nenhuma informada'],
          [{ content: 'Hábitos de Vida:', styles: { fontStyle: 'bold' } }, data.habits || 'Não informado'],
          [{ content: 'Observações Adicionais:', styles: { fontStyle: 'bold' } }, data.observations || '-'],
        ],
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: { 0: { cellWidth: 45 } },
        theme: 'grid'
      });

      startY = (doc as any).lastAutoTable.finalY + 20;

      // Footer
      doc.setFontSize(8);
      doc.text('________________________________________________________', pageWidth / 2, startY, { align: 'center' });
      doc.text('Assinatura do Farmacêutico (Visto RT)', pageWidth / 2, startY + 5, { align: 'center' });
      
      const patientX = 10;
      doc.text('________________________________________________________', 10, startY + 20);
      doc.text('Assinatura do Paciente (ou Responsável)', 10, startY + 25);

      saveAs(doc.output('blob'), `Anamnese_${data.fullName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
    } catch (error) {
      console.error(error);
      alert('Erro ao gerar PDF');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-10 px-1 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl shadow-xl shadow-blue-500/20 flex items-center justify-center border border-white/20">
              <Stethoscope size={32} className="drop-shadow-md" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-full shadow-md border border-slate-50">
              <Activity size={14} className="text-blue-600" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              Anamnese Farmacêutica
              <span className="text-[10px] bg-blue-50 text-blue-600 font-black px-2.5 py-1 rounded-full uppercase tracking-widest border border-blue-100">Atendimento</span>
            </h1>
            <p className="text-sm text-slate-400 font-bold tracking-tight uppercase mt-0.5">Consulta e acompanhamento de saúde do paciente</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={handleSubmit(generatePDF)}
            disabled={generating}
            className="btn-secondary flex items-center gap-2"
          >
            {generating ? <Loader2 className="animate-spin" size={18} /> : <FileDown size={18} />}
            <span className="uppercase tracking-widest text-[10px] font-black">Exportar Prontuário</span>
          </button>
          <button 
            type="submit"
            form="anamnese-form"
            className="btn-primary flex items-center gap-2"
          >
            <Save size={18} />
            <span className="uppercase tracking-widest text-[10px] font-black">Salvar Consulta</span>
          </button>
        </div>
      </div>

      <form id="anamnese-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Patient Info */}
        <div className="lg:col-span-8 space-y-8">
          <div className="card bg-white p-8 space-y-8 shadow-xl shadow-slate-200/50 border-none">
            <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
              <User className="text-blue-600" size={20} />
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Identificação do Paciente</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-3 space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nome Completo</label>
                <input {...register('fullName')} className="input-field bg-slate-50" placeholder="Digite o nome do paciente..." />
                {errors.fullName && <p className="text-xs text-red-500 font-bold">{errors.fullName.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Idade</label>
                <input {...register('age')} className="input-field bg-slate-50" placeholder="Ex: 35" />
                {errors.age && <p className="text-xs text-red-500 font-bold">{errors.age.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                  <Scale size={14} className="text-slate-300" /> Peso (kg)
                </label>
                <input {...register('weight')} className="input-field bg-slate-50" placeholder="Ex: 75.5" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                  <Activity size={14} className="text-slate-300" /> Altura (m)
                </label>
                <input {...register('height')} className="input-field bg-slate-50" placeholder="Ex: 1.75" />
              </div>
            </div>
          </div>

          <div className="card bg-white p-8 space-y-8 shadow-xl shadow-slate-200/50 border-none">
            <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
              <History className="text-blue-600" size={20} />
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Avaliação Clínica Detalhada</h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                  <AlertCircle size={14} className="text-red-400" /> Queixa Principal
                </label>
                <textarea {...register('complaint')} rows={3} className="input-field bg-slate-50" placeholder="Por que o paciente buscou atendimento?" />
                {errors.complaint && <p className="text-xs text-red-500 font-bold">{errors.complaint.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Alergias</label>
                  <input {...register('allergies')} className="input-field bg-slate-50" placeholder="Ex: Dipirona, Corantes..." />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Condições Prévias</label>
                  <input {...register('preExistingConditions')} className="input-field bg-slate-50" placeholder="Ex: Diabetes, Hipertensão..." />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                  <Pill size={14} className="text-blue-400" /> Medicamentos em Uso
                </label>
                <textarea {...register('medications')} rows={2} className="input-field bg-slate-50" placeholder="Liste medicamentos contínuos..." />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Hábitos (Fumo, Álcool, Exercício)</label>
                  <input {...register('habits')} className="input-field bg-slate-50" placeholder="Descreva brevemente..." />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Observações Adicionais</label>
                  <input {...register('observations')} className="input-field bg-slate-50" placeholder="Informações relevantes..." />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vital Signs Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          <div className="card bg-white p-8 space-y-6 shadow-xl shadow-slate-200/50 border-none">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-4">Parâmetros Médicos</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                  <HeartPulse size={14} className="text-red-500" /> Pressão Arterial
                </label>
                <div className="relative">
                  <input {...register('bloodPressure')} className="input-field bg-slate-50" placeholder="Ex: 120/80" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">mmHg</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                  <Activity size={14} className="text-indigo-500" /> Frequência Cardíaca
                </label>
                <div className="relative">
                  <input {...register('heartRate')} className="input-field bg-slate-50" placeholder="Ex: 72" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">BPM</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                  <Thermometer size={14} className="text-orange-500" /> Temperatura
                </label>
                <div className="relative">
                  <input {...register('temperature')} className="input-field bg-slate-50" placeholder="Ex: 36.5" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">°C</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                  <Droplets size={14} className="text-blue-500" /> Glicemia Capilar
                </label>
                <div className="relative">
                  <input {...register('bloodSugar')} className="input-field bg-slate-50" placeholder="Ex: 98" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">mg/dL</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-slate-900 p-8 space-y-6 shadow-xl shadow-blue-900/20 border-none text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 blur-3xl rounded-full -mr-16 -mt-16"></div>
            
            <div className="space-y-4 relative z-10">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
                <Clock size={24} />
              </div>
              <h4 className="text-lg font-black tracking-tight leading-tight uppercase">Histórico de Atendimento</h4>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                As anamneses salvas ficam vinculadas ao histórico técnico da drogaria para auditorias de serviços farmacêuticos.
              </p>
              {success && (
                <div className="flex items-center gap-2 text-emerald-400 pt-4 animate-bounce">
                  <CheckCircle2 size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Salvamento Concluído</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
