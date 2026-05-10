import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, deleteDoc } from 'firebase/firestore';
import { 
  ArrowLeft, 
  Save, 
  FileDown, 
  FileText,
  Search,
  Trash2,
  History, 
  ShieldCheck, 
  Loader2,
  BookOpen,
  User,
  Package,
  ListOrdered,
  Link2,
  Layout,
} from 'lucide-react';
import { POP_TEMPLATES, POPTemplate } from '../constants/templates';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';

const popSchema = z.object({
  title: z.string().min(3, "Título obrigatório"),
  code: z.string().min(2, "Código obrigatório"),
  objective: z.string().min(5, "Objetivo obrigatório"),
  applicationField: z.string().min(3, "Campo de aplicação obrigatório"),
  definitions: z.string().optional(),
  responsible: z.string().min(2, "Responsável obrigatório"),
  materials: z.string().optional(),
  epi: z.string().optional(),
  riscos: z.string().optional(),
  procedure: z.string().min(10, "Procedimento obrigatório"),
  monitoring: z.string().optional(),
  reviewFrequency: z.string().optional(),
  references: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']),
  version: z.number(),
});

type PopFormValues = z.infer<typeof popSchema>;

export default function PopEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { drugstore, user } = useAuth();
  const [loading, setLoading] = React.useState(!!id);
  const [saving, setSaving] = React.useState(false);
  const [showTemplates, setShowTemplates] = React.useState(!id);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<PopFormValues>({
    resolver: zodResolver(popSchema),
    defaultValues: {
      title: '',
      code: '',
      objective: '',
      responsible: '',
      procedure: '',
      reviewFrequency: 'Anual',
      status: 'draft',
      version: 1,
    }
  });

  const currentValues = watch();

  const generateDOCX = async () => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: "Dr. Roger POP - Gestão de Conformidade",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Drogaria: ${drugstore?.name || "-"}`, bold: true }),
              new TextRun({ text: ` | CNPJ: ${drugstore?.cnpj || "-"}`, break: 1 }),
              new TextRun({ text: ` | CRF: ${drugstore?.crf || "-"}`, break: 1 }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "", spacing: { after: 400 } }),
          new Paragraph({
            text: currentValues.title || "Sem título",
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            text: `Código: ${currentValues.code || "-"} | Versão: ${currentValues.version}.0 | Data: ${format(new Date(), "dd/MM/yyyy")}`,
            spacing: { after: 200 },
          }),
          ...([
            { label: "1. OBJETIVO", value: currentValues.objective },
            { label: "2. CAMPO DE APLICAÇÃO", value: currentValues.applicationField },
            { label: "3. DEFINIÇÕES", value: currentValues.definitions },
            { label: "4. RESPONSÁVEL", value: currentValues.responsible },
            { label: "5. MATERIAIS NECESSÁRIOS", value: currentValues.materials },
            { label: "6. PROCEDIMENTO DETALHADO", value: currentValues.procedure },
            { label: "7. MONITORAMENTO E VERIFICAÇÃO", value: currentValues.monitoring },
            { label: "8. FREQUÊNCIA DE REVISÃO", value: currentValues.reviewFrequency },
            { label: "9. REFERÊNCIAS NORMATIVAS", value: currentValues.references },
          ].map(section => ([
            new Paragraph({
              text: section.label,
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 200, after: 100 },
            }),
            new Paragraph({
              text: section.value || "-",
              spacing: { after: 200 },
            })
          ])).flat())
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${currentValues.code || "POP"}_${currentValues.title}.docx`);
  };

  const fetchPop = async () => {
    if (!id) return;
    try {
      const docSnap = await getDoc(doc(db, 'pops', id));
      if (docSnap.exists()) {
        reset(docSnap.data() as PopFormValues);
      }
    } catch (error) {
      console.error("Error fetching pop:", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (id) fetchPop();
  }, [id]);

  const applyTemplate = (template: POPTemplate) => {
    setValue('title', template.title);
    setValue('objective', template.objective);
    setValue('applicationField', template.applicationField || 'Toda a drogaria');
    setValue('definitions', template.definitions || '-');
    setValue('responsible', template.responsible);
    setValue('materials', template.materials);
    setValue('epi', template.epi || 'Avental branco, identificação.');
    setValue('riscos', template.riscos || 'Erros de processo, contaminação.');
    setValue('procedure', template.procedure);
    setValue('monitoring', template.monitoring || '-');
    setValue('reviewFrequency', template.reviewFrequency || 'Anual');
    setValue('references', template.references);
    setValue('code', `POP-${template.id.toUpperCase().substring(0, 4)}-01`);
    setShowTemplates(false);
  };

  const onSubmit = async (values: PopFormValues) => {
    if (!drugstore || !user) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const popData = {
        ...values,
        drugstoreId: drugstore.id,
        authorId: user.uid,
        updatedAt: now,
      };

      if (id) {
        await updateDoc(doc(db, 'pops', id), popData);
      } else {
        const newDocRef = await addDoc(collection(db, 'pops'), {
          ...popData,
          createdAt: now,
        });
        navigate(`/pops/edit/${newDocRef.id}`);
      }
      alert('POP salvo com sucesso!');
    } catch (error) {
      console.error("Error saving pop:", error);
      alert('Erro ao salvar POP.');
    } finally {
      setSaving(false);
    }
  };

  const [deleting, setDeleting] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const deletePop = async () => {
    if (!id) return;
    
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }

    setDeleting(true);
    setConfirmDelete(false);
    try {
      await deleteDoc(doc(db, 'pops', id));
      alert('POP excluído com sucesso!');
      navigate('/pops');
    } catch (error: any) {
      console.error("Error deleting pop:", error);
      alert(`Erro ao excluir POP: ${error.message || 'Erro de permissão'}`);
    } finally {
      setDeleting(false);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = 15;

    // Professional Header Table
    autoTable(doc, {
      startY: 10,
      margin: { left: 10, right: 10 },
      styles: { 
        fontSize: 10, 
        cellPadding: 3, 
        lineColor: [0, 0, 0], 
        lineWidth: 0.1,
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 40, halign: 'center' }, // Logo area
        1: { cellWidth: 'auto', halign: 'center', fontStyle: 'bold', fontSize: 13 }, // Title
        2: { cellWidth: 45, fontSize: 8 } // Document control
      },
      body: [
        [
          { content: '', rowSpan: 2 }, // Empty for logo drawing
          { content: 'PROCEDIMENTO OPERACIONAL PADRÃO (POP)', styles: { fillColor: [245, 245, 245] } },
          { content: `CÓDIGO: ${currentValues.code || 'POP-XXX'}\nVERSÃO: ${currentValues.version}.0\nREVISÃO: ${format(new Date(), 'dd/MM/yyyy')}` }
        ],
        [
          { content: currentValues.title?.toUpperCase() || 'SEM TÍTULO' },
          { content: `PÁGINA: 1 de 1` } // Placeholder, updated in footer
        ]
      ],
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 0 && data.row.index === 0) {
          const centerX = data.cell.x + data.cell.width / 2;
          const centerY = data.cell.y + data.cell.height / 2;
          
          if (drugstore?.logoUrl) {
            try {
              // Calculate dimensions to fit in the cell while maintaining aspect ratio
              // Cell is 40mm wide (columnStyles 0)
              const imgWidth = 30; // 30mm width
              const imgHeight = 20; // max 20mm height
              doc.addImage(drugstore.logoUrl, 'PNG', centerX - (imgWidth / 2), centerY - (imgHeight / 2), imgWidth, imgHeight, undefined, 'FAST');
            } catch (e) {
              console.error("Error drawing custom logo:", e);
              // Fallback to text if image fails
              doc.setFontSize(8);
              doc.setTextColor(100);
              doc.text(drugstore.name || 'DROGARIA', centerX, centerY, { align: 'center' });
            }
          } else {
            // Sky Blue Professional Logo (Fallback if no custom logo)
            doc.setDrawColor(3, 105, 161); // sky-700
            doc.setLineWidth(1.2);
            doc.line(centerX - 4, centerY, centerX + 4, centerY);
            doc.line(centerX, centerY - 4, centerX, centerY + 4);
            
            doc.setLineWidth(0.6);
            doc.circle(centerX, centerY, 8, 'S');
  
            doc.setFontSize(5);
            doc.setTextColor(3, 105, 161);
            doc.setFont('helvetica', 'bold');
            doc.text('QUALIDADE', centerX, centerY + 11, { align: 'center' });
          }
        }
      },
      theme: 'grid'
    });

    const headerFinalY = (doc as any).lastAutoTable.finalY + 10;
    y = headerFinalY;

    // Content
    const sections = [
      { label: '1. OBJETIVO', value: currentValues.objective },
      { label: '2. CAMPO DE APLICAÇÃO', value: currentValues.applicationField },
      { label: '3. DEFINIÇÕES', value: currentValues.definitions },
      { label: '4. RESPONSÁVEL', value: currentValues.responsible },
      { label: '5. MATERIAIS NECESSÁRIOS', value: currentValues.materials },
      { label: '6. EQUIPAMENTOS DE PROTEÇÃO (EPI)', value: currentValues.epi },
      { label: '7. RISCOS DA ATIVIDADE', value: currentValues.riscos },
      { label: '8. PROCEDIMENTO DETALHADO', value: currentValues.procedure },
      { label: '9. MONITORAMENTO E VERIFICAÇÃO', value: currentValues.monitoring },
      { label: '10. FREQUÊNCIA DE REVISÃO', value: currentValues.reviewFrequency },
      { label: '11. REFERÊNCIAS NORMATIVAS', value: currentValues.references },
    ];

    sections.forEach(section => {
      // Check if we need a new page
      const splitValue = doc.splitTextToSize(section.value || '-', pageWidth - margin * 2);
      const estimatedHeight = 10 + (splitValue.length * 5);
      
      if (y + estimatedHeight > 260) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(section.label, margin, y);
      y += 6;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(splitValue, margin, y);
      y += (splitValue.length * 5) + 8;
    });

    // Approval Area
    if (y > 230) {
      doc.addPage();
      y = 20;
    } else {
      y += 10;
    }

    autoTable(doc, {
      startY: y,
      margin: { left: 10, right: 10 },
      styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
      head: [[{ content: 'REGISTRO DE APROVAÇÃO', colSpan: 3, styles: { halign: 'center', fillColor: [240, 240, 240], fontStyle: 'bold' } }]],
      body: [
        ['ELABORADO POR:', 'VERIFICADO POR:', 'APROVADO POR:'],
        ['\n\n_______________________\nResponsável Técnico', '\n\n_______________________\nGerência', '\n\n_______________________\nDiretoria'],
        [`Data: ${format(new Date(), 'dd/MM/yyyy')}`, `Data: ${format(new Date(), 'dd/MM/yyyy')}`, `Data: ${format(new Date(), 'dd/MM/yyyy')}`]
      ],
      theme: 'grid'
    });

    // Footer with Page Numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Update page number in the header if it was on the first page
      // Actually simpler to just add footer info
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`Documento de Propriedade de: ${drugstore?.name || 'Drogaria'} - Proibida Reprodução Sem Autorização`, pageWidth / 2, 285, { align: 'center' });
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - 25, 285);
      
      // Stamp-like text
      doc.saveGraphicsState();
      doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
      doc.setFontSize(40);
      doc.setTextColor(200, 200, 200);
      doc.text('DOCUMENTO CONTROLADO', pageWidth / 2, doc.internal.pageSize.getHeight() / 2, { align: 'center', angle: 45 });
      doc.restoreGraphicsState();
    }

    doc.save(`${currentValues.code || 'POP'}_${currentValues.title}.pdf`);
  };

  const [templateSearch, setTemplateSearch] = React.useState('');
  const filteredTemplates = POP_TEMPLATES.filter(t => 
    t.title.toLowerCase().includes(templateSearch.toLowerCase()) || 
    t.category.toLowerCase().includes(templateSearch.toLowerCase())
  );

  if (loading) return <div className="py-20 text-center">Carregando POP...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="p-3 bg-gradient-to-br from-sky-600 to-sky-800 text-white rounded-xl shadow-lg border border-white/20">
              <ShieldCheck size={28} className="drop-shadow-md" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-sm border border-slate-100">
              <FileText size={12} className="text-sky-600" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              Editor Profissional de POP
              <span className="text-[10px] bg-sky-100 text-sky-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Normativo</span>
            </h1>
            <p className="text-sm text-slate-500">Gestão de qualificação e conformidade farmacêutica.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/pops')} className="flex items-center text-slate-500 hover:text-slate-800 transition-colors text-sm font-medium">
            <ArrowLeft size={18} className="mr-2" />
            Voltar
          </button>
          
          <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
         <div className="flex space-x-3">
          {id && (
            <>
              <button 
                type="button"
                onClick={deletePop}
                disabled={deleting}
                className={`flex items-center space-x-2 border px-4 py-2 rounded-lg transition-all disabled:opacity-50 cursor-pointer shadow-sm ${
                  confirmDelete 
                    ? 'bg-red-600 text-white border-red-700 font-bold' 
                    : 'text-red-600 bg-red-50 border-red-100 hover:bg-red-100'
                }`}
                title={confirmDelete ? "Clique novamente para confirmar a exclusão permanente" : "Excluir documento permanentemente"}
              >
                {deleting ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : confirmDelete ? (
                  <span className="uppercase text-xs tracking-wider">Confirmar Exclusão?</span>
                ) : (
                  <Trash2 size={18} />
                )}
                {!confirmDelete && <span>{deleting ? 'Excluindo...' : 'Excluir'}</span>}
              </button>
              <button onClick={generatePDF} className="flex items-center space-x-2 text-slate-600 bg-white border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50">
                <FileDown size={18} />
                <span>PDF</span>
              </button>
              <button onClick={generateDOCX} className="flex items-center space-x-2 text-slate-600 bg-white border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50">
                <FileText size={18} />
                <span>DOCX</span>
              </button>
            </>
          )}
          <button 
            disabled={saving}
            onClick={handleSubmit(onSubmit)}
            className="btn-primary flex items-center space-x-2"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            <span>{saving ? 'Salvando...' : 'Salvar POP'}</span>
          </button>
        </div>
      </div>
    </div>

    {showTemplates && (
        <div className="card bg-sky-50 border-sky-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
            <h3 className="font-bold text-sky-800 flex items-center gap-2 min-w-[200px]">
              <BookOpen size={20} />
              Modelos de POP Profissionais
            </h3>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-400" size={16} />
              <input 
                type="text" 
                placeholder="Pesquisar nos 20+ modelos completos..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white text-sm"
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
              />
            </div>
            <button onClick={() => setShowTemplates(false)} className="text-xs text-sky-600 hover:underline">Pular e criar em branco</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredTemplates.length > 0 ? filteredTemplates.map(t => (
              <button
                key={t.id}
                onClick={() => applyTemplate(t)}
                className="bg-white p-3 rounded-lg border border-sky-100 hover:border-sky-400 text-left transition-all hover:shadow-md group"
              >
                <p className="text-sm font-bold text-slate-800 group-hover:text-sky-700">{t.title}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] px-2 py-0.5 bg-sky-50 text-sky-600 rounded-full font-semibold uppercase">{t.category}</span>
                  <span className="text-[10px] text-slate-400">Ver mais &rarr;</span>
                </div>
              </button>
            )) : (
              <div className="col-span-3 py-8 text-center text-sky-600 text-sm">
                Nenhum modelo encontrado para sua busca.
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="card space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-bold uppercase text-slate-400">Título do Procedimento</label>
                  <input {...register('title')} className="input-field" placeholder="Ex: Dispensação de Psicotrópicos" />
                  {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-slate-400">Código</label>
                  <input {...register('code')} className="input-field" placeholder="POP-ADM-01" />
                  {errors.code && <p className="text-xs text-red-500">{errors.code.message}</p>}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1">
                  <BookOpen size={14} /> Objetivo
                </label>
                <textarea {...register('objective')} rows={3} className="input-field" placeholder="Descreva a finalidade deste POP..." />
                {errors.objective && <p className="text-xs text-red-500">{errors.objective.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-slate-400">Campo de Aplicação</label>
                  <input {...register('applicationField')} className="input-field" placeholder="Ex: Setor de dispensação" />
                  {errors.applicationField && <p className="text-xs text-red-500">{errors.applicationField.message}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-slate-400">Freq. de Revisão</label>
                  <input {...register('reviewFrequency')} className="input-field" placeholder="Ex: Anual" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-400">Definições e Siglas</label>
                <textarea {...register('definitions')} rows={2} className="input-field" placeholder="Termos técnicos utilizados..." />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1">
                    <User size={14} /> Responsável
                  </label>
                  <input {...register('responsible')} className="input-field" placeholder="Ex: Farmacêutico" />
                  {errors.responsible && <p className="text-xs text-red-500">{errors.responsible.message}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1">
                    <ShieldCheck size={14} /> Equipamentos de Proteção (EPI)
                  </label>
                  <input {...register('epi')} className="input-field" placeholder="Ex: Avental, luvas, máscara..." />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1">
                    <History size={14} /> Riscos da Atividade
                  </label>
                  <input {...register('riscos')} className="input-field" placeholder="Ex: Contaminação cruzada, queda..." />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1">
                  <ListOrdered size={14} /> Procedimento (Passo a Passo)
                </label>
                <textarea {...register('procedure')} rows={20} className="input-field font-mono text-sm leading-relaxed" placeholder="1. Inicie o processo...\n2. Verifique..." />
                {errors.procedure && <p className="text-xs text-red-500">{errors.procedure.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-400">Monitoramento e Verificação</label>
                <textarea {...register('monitoring')} rows={3} className="input-field" placeholder="Como este processo é auditado?" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1">
                  <Link2 size={14} /> Referências Normativas
                </label>
                <input {...register('references')} className="input-field" placeholder="RDC 44/2009, etc." />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card space-y-4">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Status e Controle</h3>
            
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-400">Status do Documento</label>
              <select {...register('status')} className="input-field bg-white">
                <option value="draft">Rascunho</option>
                <option value="active">Ativo / Aprovado</option>
                <option value="archived">Arquivado</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-400">Versão</label>
              <div className="flex items-center space-x-2">
                <div className="input-field bg-slate-50 flex-1">{currentValues.version}.0</div>
                {id && (
                  <button 
                    type="button"
                    onClick={() => setValue('version', (currentValues.version || 1) + 1)}
                    className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50"
                    title="Incrementar versão"
                  >
                    <History size={18} />
                  </button>
                )}
              </div>
            </div>

            {currentValues.status === 'active' && (
              <div className="p-3 bg-green-50 border border-green-100 rounded-lg flex items-center space-x-2 text-green-700 text-sm">
                <ShieldCheck size={18} />
                <span>Documento em conformidade</span>
              </div>
            )}
          </div>

          <div className="card space-y-4">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Dados da Drogaria</h3>
            <div className="text-xs space-y-2 text-slate-500">
              <p><span className="font-semibold text-slate-700">Empresa:</span> {drugstore?.name}</p>
              <p><span className="font-semibold text-slate-700">CRF:</span> {drugstore?.crf}</p>
              <p><span className="font-semibold text-slate-700">Endereço:</span> {drugstore?.address}</p>
            </div>
            <button 
              type="button"
              onClick={() => navigate('/profile')}
              className="text-xs font-medium text-sky-600 hover:underline flex items-center gap-1"
            >
              <Layout size={12} /> Editar dados da drogaria
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
