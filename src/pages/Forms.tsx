import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import { 
  ClipboardCheck, 
  Download, 
  Thermometer, 
  Trash2, 
  ArrowLeftRight,
  Activity,
  Syringe,
  Loader2,
  Plus,
  ArrowUp,
  ArrowDown,
  Sparkles,
  FileText,
  Edit2,
  Save,
  X,
  Settings,
  ShieldCheck,
  Layout,
  Maximize2,
  Check,
  File,
  RotateCcw,
  Type
} from 'lucide-react';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

// Specialized Type Declarations for Printable forms
export interface CustomFormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checklist' | 'date' | 'signature' | 'mask';
  maskType?: 'temperature' | 'humidity' | 'blood_pressure' | 'blood_glucose' | 'patient_data' | 'medicine_info' | 'stamp_carimbo' | 'clinical_care_page1' | 'clinical_care_page2' | 'clinical_care_page3';
  options?: string; // Options separated by commas/semicolons
  width?: '25' | '33' | '50' | '100'; // Multi-column layout capacity
  required?: boolean;
  helpText?: string;
  labelSize?: 'sm' | 'md' | 'lg';
  labelPlacement?: 'above' | 'left' | 'none';
  dottedLinesCount?: number; // Lined notepad rulings
  
  // Custom monthly table columns support:
  columnGroup?: string; // Sub-heading for grouped columns
  subUnitLabel?: string; // Small preprinted unit in cell (e.g. "ºC %" or "visto")
}

export interface CustomForm {
  id?: string;
  title: string;
  code: string;
  version: number;
  description?: string;
  drugstoreId: string;
  authorId: string;
  createdAt: any;
  updatedAt: any;
  fields: CustomFormField[];
  orientation?: 'portrait' | 'landscape';
  headerStyle?: 'default' | 'classic' | 'minimal';
  
  // Custom layout style parameters matching user's PDF checklists
  formLayout?: 'standard_form' | 'monthly_grid';
  razaoSocial?: string;
  cnpj?: string;
  roomOrAmbiente?: string;
  footerNotes?: string;
  watermarkText?: string;
  gridRowsCount?: number; // 31 rows standard
}

function PdfPage({ pdfDoc, pageNumber }: { pdfDoc: any; pageNumber: number }) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorObj, setErrorObj] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const renderPage = async () => {
      try {
        setLoading(true);
        setErrorObj(null);
        const page = await pdfDoc.getPage(pageNumber);
        
        // Render at a high pixel ratio for rich high-density text rendering
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = canvasRef.current;
        if (!canvas || !active) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
        if (active) {
          setLoading(false);
        }
      } catch (err: any) {
        console.error(`Error rendering PDF page ${pageNumber}:`, err);
        if (active) {
          setErrorObj(err?.message || "Erro de renderização");
          setLoading(false);
        }
      }
    };

    renderPage();
    return () => {
      active = false;
    };
  }, [pdfDoc, pageNumber]);

  return (
    <div className="relative w-full aspect-[1/1.414] bg-white rounded-xl overflow-hidden border border-slate-700/30 flex items-center justify-center shadow-xl">
      {loading && (
        <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center gap-2 z-10">
          <Loader2 size={24} className="text-indigo-500 animate-spin" />
          <span className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-widest">Compilando Folha Oficial...</span>
        </div>
      )}
      {errorObj && (
        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-4 text-center z-10">
          <span className="text-[10px] font-mono uppercase text-rose-500 font-bold">Erro na renderização da folha</span>
          <span className="text-[9px] text-slate-500 max-w-xs mt-1 font-mono">{errorObj}</span>
        </div>
      )}
      <canvas 
        ref={canvasRef} 
        className="w-full h-auto max-h-full object-contain block bg-white rounded-xl" 
      />
    </div>
  );
}

// Compact, standard regulatory templates
const STANDARD_PRESETS: any[] = [
  {
    id: 'aplicacao_injetaveis_mensal',
    title: 'Check-List - Sala de Aplicação de Injetáveis',
    icon: Syringe,
    code: 'FOR-INJ-02',
    description: 'Grade diária obrigatória de 31 dias para o controle e conferência de higienização, materiais e procedimentos na sala de aplicação de injetáveis.',
    formLayout: 'monthly_grid',
    razaoSocial: 'DROGARIA MARAFARMA LTDA',
    cnpj: '61.394.557 / 0001-49',
    roomOrAmbiente: 'Sala:__________',
    watermarkText: 'MARAFARMA',
    footerNotes: '* Limpeza - Veja + Álcool 70º',
    gridRowsCount: 31,
    fields: [
      { id: 'ci1', label: 'Colaborador' },
      { id: 'ci2', label: 'Limpeza *', columnGroup: 'Conferência de Materiais e Procedimentos (x)' },
      { id: 'ci3', label: 'Luvas Descartáveis', columnGroup: 'Conferência de Materiais e Procedimentos (x)' },
      { id: 'ci4', label: 'Algodão', columnGroup: 'Conferência de Materiais e Procedimentos (x)' },
      { id: 'ci5', label: 'Álcool 70º', columnGroup: 'Conferência de Materiais e Procedimentos (x)' },
      { id: 'ci6', label: 'Seringas Descartáveis', columnGroup: 'Conferência de Materiais e Procedimentos (x)' },
      { id: 'ci7', label: 'Papel Toalha', columnGroup: 'Conferência de Materiais e Procedimentos (x)' },
      { id: 'ci8', label: 'Descartex', columnGroup: 'Conferência de Materiais e Procedimentos (x)' }
    ]
  },
  {
    id: 'temperatura_umidade_mensal',
    title: 'Controle de Temperatura e Umidade',
    icon: Thermometer,
    code: 'FOR-TEMP-02',
    description: 'Tabela oficial de 31 dias com divisão para turnos de MANHÃ, TARDE e NOITE. Cada turno registra temperatura (ºC) e umidade relative (%) com subdivisão de células físicas.',
    formLayout: 'monthly_grid',
    razaoSocial: 'DROGARIA MARAFARMA LTDA',
    cnpj: '61.394.557 / 0001-49',
    roomOrAmbiente: 'Ambiente:__________',
    watermarkText: 'MARAFARMA',
    footerNotes: '* Registrar as temperaturas mínima, máxima e momento da medição',
    gridRowsCount: 31,
    fields: [
      { id: 'ct1', label: 'Min.', columnGroup: 'MANHÃ', subUnitLabel: 'ºC %' },
      { id: 'ct2', label: 'Max.', columnGroup: 'MANHÃ', subUnitLabel: 'ºC %' },
      { id: 'ct3', label: 'Mom.', columnGroup: 'MANHÃ', subUnitLabel: 'ºC %' },
      { id: 'ct4', label: 'Min.', columnGroup: 'TARDE', subUnitLabel: 'ºC %' },
      { id: 'ct5', label: 'Max.', columnGroup: 'TARDE', subUnitLabel: 'ºC %' },
      { id: 'ct6', label: 'Mom.', columnGroup: 'TARDE', subUnitLabel: 'ºC %' },
      { id: 'ct7', label: 'Min.', columnGroup: 'NOITE', subUnitLabel: 'ºC %' },
      { id: 'ct8', label: 'Max.', columnGroup: 'NOITE', subUnitLabel: 'ºC %' },
      { id: 'ct9', label: 'Mom.', columnGroup: 'NOITE', subUnitLabel: 'ºC %' }
    ]
  },
  {
    id: 'limpeza_banheiro_mensal',
    title: 'Check-List Limpeza e Organização de Banheiro',
    icon: ClipboardCheck,
    code: 'FOR-LIMP-BANH',
    description: 'Cronograma diário de conservação e higienização obrigatória dos sanitários, contemplando limpeza de vaso, pia, paredes e reabastecimento de papel e sabonete.',
    formLayout: 'monthly_grid',
    razaoSocial: 'DROGARIA MARAFARMA LTDA',
    cnpj: '61.394.557 / 0001-49',
    roomOrAmbiente: 'Ambiente:__________',
    watermarkText: 'MARAFARMA',
    footerNotes: '* Registrar com o visto do executor responsável após conclusão',
    gridRowsCount: 31,
    fields: [
      { id: 'cb1', label: 'Colaborador' },
      { id: 'cb2', label: 'Coleta de Lixo', columnGroup: 'Conferência de Materiais e Limpeza (x)' },
      { id: 'cb3', label: 'Limpeza de Vaso', columnGroup: 'Conferência de Materiais e Limpeza (x)' },
      { id: 'cb4', label: 'Limpeza da Pia', columnGroup: 'Conferência de Materiais e Limpeza (x)' },
      { id: 'cb5', label: 'Limpeza Parede', columnGroup: 'Conferência de Materiais e Limpeza (x)' },
      { id: 'cb6', label: 'Abastecimento Papel Higiênico', columnGroup: 'Conferência de Materiais e Limpeza (x)' },
      { id: 'cb7', label: 'Abastecimento Papel Toalha', columnGroup: 'Conferência de Materiais e Limpeza (x)' },
      { id: 'cb8', label: 'Abastecimento Sabonete Liq.', columnGroup: 'Conferência de Materiais e Limpeza (x)' }
    ]
  },
  {
    id: 'temperatura',
    title: 'Ficha Individual de Controle de Temperatura',
    icon: Thermometer,
    code: 'FOR-TEMP-01',
    description: 'Relatório clínico essencial por evento para o controle de medicamentos refrigerados e insumos da cadeia de frio.',
    fields: [
      { id: 'f1', label: 'Data Escrita', type: 'date', width: '50', required: true, labelSize: 'sm' },
      { id: 'f2', label: 'Hora da Coleta', type: 'text', width: '50', required: true, labelSize: 'sm', helpText: 'Ex: Manhã (08h) ou Tarde (16h)' },
      { id: 'f3', label: 'Temperatura Termolábeis', type: 'mask', maskType: 'temperature', width: '50', required: true },
      { id: 'f4', label: 'Umidade Relativa', type: 'mask', maskType: 'humidity', width: '50', required: true },
      { id: 'f5', label: 'Inspeções de Rotina', type: 'checklist', options: 'Equipamento limpo; Circulação interna livre de caixas; Alarme operacional ativo; Tomada blindada exclusiva protegida; Visto de limpeza semanal', width: '100', required: true },
      { id: 'f6', label: 'Ocorrências e Desvios de Temperatura', type: 'textarea', dottedLinesCount: 3, width: '100' },
      { id: 'f7', label: 'Assinatura e Carimbo Técnico', type: 'mask', maskType: 'stamp_carimbo', width: '100' }
    ]
  },
  {
    id: 'ficha_atendimento_clinico',
    title: 'Ficha de Atendimento Farmacêutico',
    icon: ClipboardCheck,
    code: 'FOR-ATEND-01',
    description: 'Documento unificado pelo CFF (Conselho Federal de Farmácia) para Acolhimento, Rastreamento em Saúde, Consulta Farmacêutica e Auriculoterapia.',
    formLayout: 'standard_form',
    fields: [
      { id: 'fa1', label: 'Etapa 1 - Acolhimento (Paciente e Tratamentos)', type: 'mask', maskType: 'clinical_care_page1', width: '100', required: true },
      { id: 'fa2', label: 'Etapa 2 - Rastreamento em Saúde e Sinais Vitais', type: 'mask', maskType: 'clinical_care_page2', width: '100', required: true },
      { id: 'fa3', label: 'Etapas 3 e 4 - Consulta Farmacêutica e Auriculoterapia', type: 'mask', maskType: 'clinical_care_page3', width: '100', required: true }
    ]
  }
];

export default function Forms() {
  const { user, drugstore } = useAuth();
  
  // Database States
  const [customForms, setCustomForms] = useState<CustomForm[]>([]);
  const [loadingForms, setLoadingForms] = useState<boolean>(true);
  const [generating, setGenerating] = useState<string | null>(null);
  
  // App navigation
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');
  
  // Form Editor State (Decoupled layout constructor)
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [formTitle, setFormTitle] = useState<string>('');
  const [formCode, setFormCode] = useState<string>('');
  const [formVersion, setFormVersion] = useState<number>(1);
  const [formDescription, setFormDescription] = useState<string>('');
  const [formFields, setFormFields] = useState<CustomFormField[]>([]);
  const [paperOrientation, setPaperOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [headerStyle, setHeaderStyle] = useState<'default' | 'classic' | 'minimal'>('default');
  
  // Custom Grid layout parameters matching user's PDF checklists
  const [formLayout, setFormLayout] = useState<'standard_form' | 'monthly_grid'>('standard_form');
  const [razaoSocial, setRazaoSocial] = useState<string>('DROGARIA MARAFARMA LTDA');
  const [cnpj, setCnpj] = useState<string>('61.394.557 / 0001-49');
  const [roomOrAmbiente, setRoomOrAmbiente] = useState<string>('Ambiente:__________');
  const [footerNotes, setFooterNotes] = useState<string>('');
  const [watermarkText, setWatermarkText] = useState<string>('MARAFARMA');
  const [gridRowsCount, setGridRowsCount] = useState<number>(31);
  
  const [newColLabel, setNewColLabel] = useState<string>('');
  const [newColGroup, setNewColGroup] = useState<string>('');
  const [newColSubUnit, setNewColSubUnit] = useState<string>('');
  
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'html' | 'pdf'>('pdf');
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfjsLoaded, setPdfjsLoaded] = useState<boolean>(false);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busySaving, setBusySaving] = useState<boolean>(false);

  // Load custom creations from Firebase
  const fetchCustomForms = async () => {
    if (!user) return;
    setLoadingForms(true);
    const path = 'customForms';
    try {
      const q = query(collection(db, path), where('drugstoreId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const list: CustomForm[] = [];
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as CustomForm);
      });
      setCustomForms(list);
    } catch (error) {
      console.error("Erro ao carregar formulários:", error);
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (e) {}
    } finally {
      setLoadingForms(false);
    }
  };

  useEffect(() => {
    fetchCustomForms();
    if (drugstore) {
      setRazaoSocial(drugstore.name || 'DROGARIA MARAFARMA LTDA');
      setCnpj(drugstore.cnpj || '61.394.557 / 0001-49');
      const storeWord = drugstore.name ? drugstore.name.trim().split(' ')[0].toUpperCase() : 'MARAFARMA';
      setWatermarkText(storeWord);
    }
  }, [user, drugstore]);

  // Dynamically load PDF.js CDN to render PDF pages inside the page safely
  useEffect(() => {
    if ((window as any).pdfjsLib) {
      setPdfjsLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
    script.async = true;
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      if (pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        setPdfjsLoaded(true);
      }
    };
    script.onerror = () => {
      console.error("Failed to load PDF.js from Cloudflare CDN");
    };
    document.body.appendChild(script);
  }, []);

  // Reactive real-time PDF document rendering
  useEffect(() => {
    if (!isEditorOpen) {
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
        setPreviewPdfUrl(null);
      }
      setPdfDoc(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsCompiling(true);
        const docPdf = buildPDF({
          title: formTitle || 'Ficha Sem Título',
          code: formCode || 'FOR-00',
          version: typeof formVersion === 'string' ? Number(formVersion) || 1 : formVersion,
          description: formDescription,
          fields: formFields,
          orientation: paperOrientation,
          headerStyle: headerStyle,
          formLayout: formLayout,
          razaoSocial: razaoSocial,
          cnpj: cnpj,
          roomOrAmbiente: roomOrAmbiente,
          footerNotes: footerNotes,
          watermarkText: watermarkText,
          gridRowsCount: typeof gridRowsCount === 'string' ? Number(gridRowsCount) || 31 : gridRowsCount
        });
        
        const arrayBuffer = docPdf.output('arraybuffer');
        const blob = docPdf.output('blob');
        const url = URL.createObjectURL(blob);
        
        setPreviewPdfUrl(prev => {
          if (prev) {
            URL.revokeObjectURL(prev);
          }
          return url;
        });

        if ((window as any).pdfjsLib && pdfjsLoaded) {
          try {
            const loadingTask = (window as any).pdfjsLib.getDocument({ data: arrayBuffer });
            const loadedDoc = await loadingTask.promise;
            setPdfDoc(loadedDoc);
          } catch (pdfErr) {
            console.error("Erro no carregamento PDF.js:", pdfErr);
          }
        }
        setIsCompiling(false);
      } catch (err) {
        console.error("Erro ao desenhar previsualização em PDF:", err);
        setIsCompiling(false);
      }
    }, 450);

    return () => {
      clearTimeout(timer);
    };
  }, [
    isEditorOpen,
    formTitle,
    formCode,
    formVersion,
    formDescription,
    formFields,
    paperOrientation,
    headerStyle,
    formLayout,
    razaoSocial,
    cnpj,
    roomOrAmbiente,
    footerNotes,
    watermarkText,
    gridRowsCount,
    pdfjsLoaded
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
      }
    };
  }, [previewPdfUrl]);

  // Handle cloning or customization of template preset
  const handleCustomizePreset = (preset: any) => {
    setFormTitle(`${preset.title} (Personalizado)`);
    setFormCode(`${preset.code}-PER`);
    setFormVersion(1);
    setFormDescription(preset.description || '');
    setPaperOrientation(preset.orientation || 'portrait');
    setHeaderStyle(preset.headerStyle || 'default');
    
    // Grid parameters
    setFormLayout(preset.formLayout || 'standard_form');
    setRazaoSocial(drugstore?.name || preset.razaoSocial || 'DROGARIA MARAFARMA LTDA');
    setCnpj(drugstore?.cnpj || preset.cnpj || '61.394.557 / 0001-49');
    setRoomOrAmbiente(preset.roomOrAmbiente || 'Ambiente:__________');
    setFooterNotes(preset.footerNotes || '');
    const storeFirstWord = drugstore?.name ? drugstore.name.trim().split(' ')[0].toUpperCase() : 'MARAFARMA';
    setWatermarkText(storeFirstWord || preset.watermarkText || 'MARAFARMA');
    setGridRowsCount(preset.gridRowsCount || 31);
    
    const clonedFields: CustomFormField[] = preset.fields.map((f: any, i: number) => ({
      ...f,
      id: `field_${Date.now()}_${i}`,
      labelSize: f.labelSize || 'sm',
      labelPlacement: f.labelPlacement || 'above',
      dottedLinesCount: f.dottedLinesCount || 3,
      columnGroup: f.columnGroup || '',
      subUnitLabel: f.subUnitLabel || ''
    }));
    
    setFormFields(clonedFields);
    setSelectedFieldId(clonedFields[0]?.id || null);
    setEditingId(null);
    setIsEditorOpen(true);
  };

  const handleCreateNewForm = () => {
    setFormTitle('Novo Relatório de Qualidade');
    setFormCode('FOR-01');
    setFormVersion(1);
    setFormDescription('Procedimento operacional padrão registrado para preenchimento manuscrito.');
    setPaperOrientation('portrait');
    setHeaderStyle('default');
    
    // Grid parameters
    setFormLayout('standard_form');
    setRazaoSocial(drugstore?.name || 'DROGARIA MARAFARMA LTDA');
    setCnpj(drugstore?.cnpj || '61.394.557 / 0001-49');
    setRoomOrAmbiente('Ambiente:__________');
    setFooterNotes('');
    const storeFirstWord = drugstore?.name ? drugstore.name.trim().split(' ')[0].toUpperCase() : 'MARAFARMA';
    setWatermarkText(storeFirstWord);
    setGridRowsCount(31);
    
    const initialFields: CustomFormField[] = [
      { id: `field_${Date.now()}_0`, label: 'Dados Gerais de Coleta', type: 'date', width: '50', labelSize: 'sm' },
      { id: `field_${Date.now()}_1`, label: 'Responsável Coletor', type: 'text', width: '50', labelSize: 'sm' },
      { id: `field_${Date.now()}_2`, label: 'Temperatura Registrada', type: 'mask', maskType: 'temperature', width: '50' },
      { id: `field_${Date.now()}_3`, label: 'Umidade do Ambiente', type: 'mask', maskType: 'humidity', width: '50' },
      { id: `field_${Date.now()}_4`, label: 'Checklist de Conformidades', type: 'checklist', options: 'Sem vazamentos na sala; Equipamento vedado corretamente; Prateleiras limpas', width: '100' },
      { id: `field_${Date.now()}_5`, label: 'Observações de Auditoria', type: 'textarea', dottedLinesCount: 4, width: '100' },
      { id: `field_${Date.now()}_6`, label: 'Assinatura de Homologação', type: 'mask', maskType: 'stamp_carimbo', width: '100' }
    ];
    setFormFields(initialFields);
    setSelectedFieldId(initialFields[0]?.id || null);
    setEditingId(null);
    setIsEditorOpen(true);
  };

  const handleEditCustomForm = (form: CustomForm) => {
    setFormTitle(form.title);
    setFormCode(form.code);
    setFormVersion(form.version);
    setFormDescription(form.description || '');
    setPaperOrientation(form.orientation || 'portrait');
    setHeaderStyle(form.headerStyle || 'default');
    
    // Grid parameters
    setFormLayout(form.formLayout || 'standard_form');
    setRazaoSocial(form.razaoSocial || drugstore?.name || 'DROGARIA MARAFARMA LTDA');
    setCnpj(form.cnpj || drugstore?.cnpj || '61.394.557 / 0001-49');
    setRoomOrAmbiente(form.roomOrAmbiente || 'Ambiente:__________');
    setFooterNotes(form.footerNotes || '');
    const storeFirstWord = drugstore?.name ? drugstore.name.trim().split(' ')[0].toUpperCase() : 'MARAFARMA';
    setWatermarkText(form.watermarkText || storeFirstWord);
    setGridRowsCount(form.gridRowsCount || 31);
    
    const fields = (form.fields || []).map((f, i) => ({
      ...f,
      id: f.id || `field_${Date.now()}_${i}`,
      labelSize: f.labelSize || 'sm',
      labelPlacement: f.labelPlacement || 'above',
      dottedLinesCount: f.dottedLinesCount || 3,
      columnGroup: f.columnGroup || '',
      subUnitLabel: f.subUnitLabel || ''
    }));
    
    setFormFields(fields);
    setSelectedFieldId(fields[0]?.id || null);
    setEditingId(form.id || null);
    setIsEditorOpen(true);
  };

  const handleDeleteCustomForm = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Você tem certeza que deseja excluir permanentemente este formulário impresso?")) return;
    try {
      await deleteDoc(doc(db, 'customForms', id));
      setCustomForms(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir. Verifique as credenciais no Firebase.");
    }
  };

  const handleSaveForm = async () => {
    if (!user) return;
    if (!formTitle.trim()) return alert("Por favor, preencha o Título.");
    if (!formCode.trim()) return alert("Por favor, preencha o Código Identificador.");

    setBusySaving(true);
    const sanitizedFields = formFields.map(f => ({
      ...f,
      label: f.label.trim() || 'Campo Sem Título'
    }));

    const payload: Omit<CustomForm, 'id'> = {
      title: formTitle.trim(),
      code: formCode.trim().toUpperCase(),
      version: Number(formVersion) || 1,
      description: formDescription.trim(),
      drugstoreId: user.uid,
      authorId: user.uid,
      createdAt: editingId ? (customForms.find(f => f.id === editingId)?.createdAt || Timestamp.now()) : Timestamp.now(),
      updatedAt: Timestamp.now(),
      fields: sanitizedFields,
      orientation: paperOrientation,
      headerStyle: headerStyle,
      
      // Persist spreadsheet parameters
      formLayout: formLayout,
      razaoSocial: razaoSocial.trim(),
      cnpj: cnpj.trim(),
      roomOrAmbiente: roomOrAmbiente.trim(),
      footerNotes: footerNotes.trim(),
      watermarkText: watermarkText.trim(),
      gridRowsCount: Number(gridRowsCount) || 31
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'customForms', editingId), payload);
      } else {
        await addDoc(collection(db, 'customForms'), payload);
      }
      await fetchCustomForms();
      setIsEditorOpen(false);
      setActiveTab('custom');
    } catch (err) {
      console.error(err);
      alert("Erro ao gravar estrutura no Firestore.");
    } finally {
      setBusySaving(false);
    }
  };

  // Add field
  const handleAddFieldSetting = (type: CustomFormField['type'], mask?: CustomFormField['maskType']) => {
    const defaultLabels: Record<string, string> = {
      text: 'Novo Campo de Texto Curto',
      textarea: 'Espaço de Anotações Clínicas',
      select: 'Opção de Escolha',
      checklist: 'Checklist de Verificações',
      date: 'Data do Evento',
      signature: 'Termo e Assinatura',
      temperature: 'Controle de Temperatura',
      humidity: 'Umidade Relativa',
      blood_pressure: 'Verificação de Pressão Arterial',
      blood_glucose: 'Teste de Glicemia Capilar',
      patient_data: 'Ficha Cadastral do Paciente',
      medicine_info: 'Medicamento / Vacina Aplicada',
      stamp_carimbo: 'Espaço para Carimbo Responsável (CRF)',
      clinical_care_page1: 'Acolhimento Farmacêutico (Etapa 1)',
      clinical_care_page2: 'Rastreamento em Saúde (Etapa 2)',
      clinical_care_page3: 'Consulta e Auriculoterapia (Etapas 3 & 4)'
    };

    const labelKey = mask || type;
    const newField: CustomFormField = {
      id: `field_${Date.now()}`,
      label: defaultLabels[labelKey] || 'Novo Campo Regulado',
      type: type,
      maskType: mask,
      width: (mask === 'patient_data' || mask === 'medicine_info' || mask?.startsWith('clinical_care_')) ? '100' : '50',
      required: false,
      dottedLinesCount: 3,
      labelSize: 'sm',
      labelPlacement: 'above',
      options: type === 'checklist' ? 'Limpeza OK; Equipamento calibrado; Organização OK' : 'Sim, Não'
    };
    setFormFields(prev => [...prev, newField]);
    setSelectedFieldId(newField.id);
  };

  // Field manipulation properties
  const handleUpdateField = (id: string, updates: Partial<CustomFormField>) => {
    setFormFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const handleRemoveField = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (formFields.length <= 1) return alert("O formulário de impressão precisa constar com ao menos 1 campo.");
    setFormFields(prev => prev.filter(f => f.id !== id));
    if (selectedFieldId === id) {
      setSelectedFieldId(formFields.find(f => f.id !== id)?.id || null);
    }
  };

  // Drag and Drop ordering replacement (Moving fields inside visual grid)
  const handleMoveField = (index: number, direction: 'up' | 'down', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const fields = [...formFields];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= fields.length) return;
    
    const temp = fields[index];
    fields[index] = fields[target];
    fields[target] = temp;
    setFormFields(fields);
  };

  const buildCustomFichaAtendimento = (form: any, drugstore: any) => {
    const docPdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const drawPage1 = () => {
      // Bounding page border
      docPdf.setDrawColor(148, 163, 184); // Sleeker border color (Slate 400)
      docPdf.setLineWidth(0.4);
      docPdf.rect(10, 10, 190, 277);

      // Logos header
      docPdf.setDrawColor(148, 163, 184);
      docPdf.rect(12, 12, 186, 22);
      docPdf.line(52, 12, 52, 34);
      docPdf.line(158, 12, 158, 34);

      // Left column: Registered drugstore logo!
      if (drugstore?.logoUrl) {
        try {
          docPdf.addImage(drugstore.logoUrl, 'PNG', 14, 14, 36, 18, undefined, 'FAST');
        } catch (e) {
          docPdf.setFont('helvetica', 'bold');
          docPdf.setFontSize(8.5);
          docPdf.setTextColor(30, 41, 59);
          docPdf.text(drugstore.name || 'DROGARIA', 32, 23, { align: 'center' });
        }
      } else {
        docPdf.setFont('helvetica', 'bold');
        docPdf.setFontSize(9);
        docPdf.setTextColor(15, 23, 42);
        docPdf.text(drugstore?.name || 'SUA DROGARIA', 32, 20, { align: 'center' });
        docPdf.setFont('helvetica', 'normal');
        docPdf.setFontSize(6.5);
        docPdf.setTextColor(71, 85, 105);
        docPdf.text(drugstore?.cnpj || 'CNPJ NÃO CADASTRADO', 32, 25, { align: 'center' });
      }

      // Center Column: Document Title
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(11);
      docPdf.setTextColor(15, 23, 42);
      docPdf.text('FICHA DE ATENDIMENTO FARMACÊUTICO', 105, 23.5, { align: 'center' });
      
      docPdf.setFont('helvetica', 'normal');
      docPdf.setFontSize(6.5);
      docPdf.setTextColor(100, 116, 139);
      docPdf.text('SERVIÇOS CLÍNICOS INTEGRADOS', 105, 28, { align: 'center' });

      // Right Column: Professional layout
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(8);
      docPdf.setTextColor(220, 38, 38); // CFF action red
      docPdf.text('Farmacêuticos', 178, 18.5, { align: 'center' });
      docPdf.text('em Ação', 178, 22.5, { align: 'center' });
      
      docPdf.setFont('helvetica', 'normal');
      docPdf.setFontSize(6);
      docPdf.setTextColor(71, 85, 105);
      docPdf.text('CUIDANDO DE VOCÊ', 178, 28, { align: 'center' });

      // Subtitle Etapa 1 - Light blue/gray slate background box
      docPdf.setFillColor(241, 245, 249);
      docPdf.rect(12, 37, 186, 6.5, 'F');
      docPdf.setDrawColor(203, 213, 225);
      docPdf.rect(12, 37, 186, 6.5, 'S');

      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(9.5);
      docPdf.setTextColor(15, 23, 42);
      docPdf.text('Etapa 1 - Acolhimento', 105, 41.5, { align: 'center' });

      // Sub-fields for anamnese
      docPdf.setFont('helvetica', 'normal');
      docPdf.setFontSize(7.5);
      docPdf.setTextColor(51, 65, 85);
      docPdf.setDrawColor(203, 213, 225);

      let currentY = 49;
      docPdf.text('Nome:', 15, currentY);
      docPdf.line(25, currentY + 0.5, 150, currentY + 0.5);
      docPdf.text('Data:', 152, currentY);
      docPdf.text('      /      /', 160, currentY);
      docPdf.line(160, currentY + 0.5, 195, currentY + 0.5);

      currentY += 5.5;
      docPdf.text('Endereço:', 15, currentY);
      docPdf.line(29, currentY + 0.5, 140, currentY + 0.5);
      docPdf.text('Telefone:', 142, currentY);
      docPdf.line(155, currentY + 0.5, 195, currentY + 0.5);

      currentY += 5.5;
      docPdf.text('Gênero: (  ) F   (  ) M   (  ) Outro', 15, currentY);
      docPdf.text('Idade:', 110, currentY);
      docPdf.line(120, currentY + 0.5, 145, currentY + 0.5);

      currentY += 5.5;
      docPdf.text('Problema(s) de saúde: (  ) Diabetes   (  ) Hipertensão   (  ) Asma   (  ) Dislipidemia   (  ) Outro(s):', 15, currentY);
      docPdf.line(134, currentY + 0.5, 195, currentY + 0.5);

      currentY += 5.5;
      docPdf.text('Tem alguém na família com: (  ) Diabetes   (  ) Hipertensão   (  ) Asma   (  ) Outro(s):', 15, currentY);
      docPdf.line(128, currentY + 0.5, 195, currentY + 0.5);

      currentY += 5.5;
      docPdf.text('Quem?', 15, currentY);
      docPdf.line(25, currentY + 0.5, 195, currentY + 0.5);

      currentY += 5.5;
      docPdf.text('Você fuma? (  ) Sim   (  ) Não', 15, currentY);
      docPdf.text('Fumante passivo? (  ) Sim   (  ) Não', 105, currentY);

      currentY += 5.5;
      docPdf.text('Você trouxe? (  ) Medicamentos   (  ) Receitas   (  ) Laudos de exames', 15, currentY);

      currentY += 5.5;
      docPdf.text('Você faz uso de algum medicamento? (  ) Sim   (  ) Não', 15, currentY);

      currentY += 5.5;
      docPdf.setFont('helvetica', 'bold');
      docPdf.setTextColor(30, 41, 59);
      docPdf.text('Caso a resposta seja sim, preencher o quadro abaixo de acordo com o relato do paciente:', 15, currentY);
      docPdf.setFont('helvetica', 'normal');
      docPdf.setTextColor(51, 65, 85);

      // Table row counts
      currentY += 3;
      docPdf.setFillColor(254, 252, 232); // Beautiful subtle clinical yellow background
      docPdf.rect(15, currentY, 176, 6, 'F');
      docPdf.setDrawColor(203, 213, 225);
      docPdf.rect(15, currentY, 176, 28, 'S');

      // Header labels
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(6.2);
      docPdf.setTextColor(30, 41, 59);
      docPdf.text('Medicamento', 38.5, currentY + 4, { align: 'center' });
      docPdf.text('Concentração', 73.5, currentY + 4, { align: 'center' });
      docPdf.text('Posologia\n(1-0-1 / SN)', 97.5, currentY + 3.2, { align: 'center' });
      docPdf.text('Como usa (com refeição /\nágua / leite / jejum / partido)', 136, currentY + 3.2, { align: 'center' });
      docPdf.text('Indicação', 179, currentY + 4, { align: 'center' });
      docPdf.setFont('helvetica', 'normal');
      docPdf.setTextColor(51, 65, 85);

      // Dividers
      docPdf.line(62, currentY, 62, currentY + 28);
      docPdf.line(85, currentY, 85, currentY + 28);
      docPdf.line(110, currentY, 110, currentY + 28);
      docPdf.line(162, currentY, 162, currentY + 28);

      let rowY = currentY + 6;
      for (let j = 0; j < 4; j++) {
        docPdf.line(15, rowY, 191, rowY);
        rowY += 5.5;
      }

      currentY += 31.5;
      docPdf.setFontSize(7.5);
      docPdf.text('O paciente usa:  (  ) Injetável   (  ) Dispositivos inalatórios   (  ) Aparelhos de aplicação nasal   (  ) Colírio   (  ) Creme vaginal   (  ) Outro', 15, currentY);

      currentY += 5.5;
      docPdf.text('Na sua casa, em que lugar os medicamentos são guardados?  (  ) Adequado   (  ) Inadequado: ____________________', 15, currentY);
      docPdf.line(146, currentY + 0.5, 195, currentY + 0.5);

      currentY += 5.5;
      docPdf.text('O que é feito com os medicamentos vencidos ou fora de uso?  (  ) Adequado   (  ) Inadequado: __________________', 15, currentY);
      docPdf.line(146, currentY + 0.5, 195, currentY + 0.5);

      currentY += 5.5;
      docPdf.text('OBS.:', 15, currentY);
      docPdf.line(24, currentY + 0.5, 195, currentY + 0.5);
      currentY += 5.5;
      docPdf.line(15, currentY + 0.5, 195, currentY + 0.5);

      // Section 2 Rastreamento
      currentY += 7;
      docPdf.setFillColor(241, 245, 249);
      docPdf.rect(12, currentY, 186, 6.5, 'F');
      docPdf.setDrawColor(203, 213, 225);
      docPdf.rect(12, currentY, 186, 6.5, 'S');

      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(9.5);
      docPdf.setTextColor(15, 23, 42);
      docPdf.text('Etapa 2 - Rastreamento em saúde', 105, currentY + 4.5, { align: 'center' });

      currentY += 10;
      const scrStarts = [15, 43, 81, 166];
      docPdf.setFillColor(254, 252, 232);
      docPdf.rect(15, currentY, 176, 5.5, 'F');
      docPdf.rect(15, currentY, 176, 68, 'S');

      docPdf.line(scrStarts[1], currentY, scrStarts[1], currentY + 68);
      docPdf.line(scrStarts[2], currentY, scrStarts[2], currentY + 68);
      docPdf.line(scrStarts[3], currentY, scrStarts[3], currentY + 68);

      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(6.5);
      docPdf.setTextColor(30, 41, 59);
      docPdf.text('Parâmetro', 29, currentY + 3.8, { align: 'center' });
      docPdf.text('Resultado', 62, currentY + 3.8, { align: 'center' });
      docPdf.text('Critério de encaminhamento para a consulta farmacêutica', 123.5, currentY + 3.8, { align: 'center' });
      docPdf.text('Resultado alterado?', 178.5, currentY + 3.8, { align: 'center' });

      let crY = currentY + 5.5;
      const rowsDef = [
        { label: 'Pressão arterial', res: '______________ mmHg', crit: '>= 140/90 mmHg', h: 7 },
        { label: 'Frequência cardíaca', res: '______________ bpm', crit: '(  ) >= 101 ou <= 49 bpm, sem insuficiência cardíaca\n(  ) >= 71 bpm, com insuficiência cardíaca', h: 10 },
        { label: 'Colesterol total', res: '______________ mg/dL', crit: '>= 190 mg/dL', h: 7 },
        { label: 'Glicemia capilar', res: '______________ mg/dL', crit: '(  ) >= 100 mg/dL, se jejum >= 8 h\n(  ) >= 140 mg/dL, se jejum de 2 a 8 h\n(  ) >= 200 mg/dL (glicemia casual/independente de jejum)', h: 15 },
        { label: 'HbA1c', res: '______________ %', crit: '(  ) >= 5,7%, sem diagnóstico prévio de diabetes\n(  ) >= 6,5%, com diagnóstico prévio de diabetes', h: 11 },
        { label: 'Peak flow', res: '1. _________  2. _________\n3. _________ L/min\nRes. final: ___________ %', crit: '<= 79%', h: 12.5 }
      ];

      rowsDef.forEach((row) => {
        docPdf.setFont('helvetica', 'normal');
        docPdf.setFontSize(7);
        docPdf.setTextColor(51, 65, 85);
        docPdf.setDrawColor(203, 213, 225);
        docPdf.line(15, crY, 191, crY);

        docPdf.setFont('helvetica', 'bold');
        docPdf.setTextColor(30, 41, 59);
        docPdf.text(row.label, 16.5, crY + 4.5);
        docPdf.setFont('helvetica', 'normal');
        docPdf.setTextColor(51, 65, 85);

        const resLines = row.res.split('\n');
        let resL_Y = crY + 4;
        resLines.forEach(l => {
          docPdf.text(l, scrStarts[1] + 2, resL_Y);
          resL_Y += 3.8;
        });

        docPdf.setFontSize(6);
        const critLines = row.crit.split('\n');
        let critL_Y = crY + 3.5;
        critLines.forEach(l => {
          docPdf.text(l, scrStarts[2] + 2, critL_Y);
          critL_Y += 3.5;
        });

        docPdf.setFontSize(7);
        docPdf.text('(  ) Sim\n(  ) Não', scrStarts[3] + 4, crY + (row.h/2) - 1.2);
        crY += row.h;
      });

      let lastY = crY + 4;
      docPdf.setFontSize(7.5);
      docPdf.text('Tempo de jejum:  (  ) >= 8 h   (  ) 2 a 8 h   (  ) >= 2 h / casual', 15, lastY);

      lastY += 4.5;
      docPdf.text('Paciente polimedicado (uso de 5 ou mais medicamentos):  (  ) Sim   (  ) Não', 15, lastY);

      lastY += 4.5;
      docPdf.text('Necessidade de orientação especial sobre forma farmacêutica:  (  ) Sim   (  ) Não', 15, lastY);

      lastY += 4.5;
      docPdf.text('Necessidade de consulta farmacêutica:  (  ) Sim   (  ) Não', 15, lastY);

      lastY += 4.5;
      docPdf.text('OBS.:', 15, lastY);
      docPdf.line(24, lastY + 0.5, 191, lastY + 0.5);
      lastY += 4.5;
      docPdf.line(15, lastY + 0.5, 191, lastY + 0.5);

      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(5.5);
      docPdf.setTextColor(148, 163, 184); // soft slate border gray
      docPdf.text('Responsável pelo atendimento', 7.5, 95, { angle: 90, align: 'center' });
      docPdf.text('Responsável pelo atendimento', 7.5, 230, { angle: 90, align: 'center' });
    };

    const drawPage2 = () => {
      docPdf.addPage();
      docPdf.setDrawColor(148, 163, 184);
      docPdf.setLineWidth(0.4);
      docPdf.rect(10, 10, 190, 277);

      let p2Y = 16;
      docPdf.setFillColor(241, 245, 249);
      docPdf.rect(12, p2Y - 1, 186, 6.5, 'F');
      docPdf.setDrawColor(203, 213, 225);
      docPdf.rect(12, p2Y - 1, 186, 6.5, 'S');

      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(9.5);
      docPdf.setTextColor(15, 23, 42);
      docPdf.text('Etapa 3 - Consulta farmacêutica', 105, p2Y + 3.5, { align: 'center' });

      p2Y += 12;
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(8.5);
      docPdf.setTextColor(30, 41, 59);
      docPdf.text('3.1 Avaliação (identificação de problemas)', 13, p2Y);

      docPdf.setFont('helvetica', 'normal');
      docPdf.setFontSize(7.5);
      docPdf.setTextColor(51, 65, 85);

      const evalPoints = [
        'Condição clínica que necessita de elucidação diagnóstica por médico:  (  ) Sim   (  ) Não   Qual? __________________________________',
        'Condição clínica previamente diagnosticada e descontrolada:  (  ) Sim   (  ) Não   Qual? ____________________________________',
        'Necessidade de terapia adicional prescrita por médico:  (  ) Sim   (  ) Não   Qual? _______________ Para o que? ___________',
        'Medicamento cuja indicação requer reavaliação:  (  ) Prescrito   Qual? _______________________________________________',
        'Problemas na posologia (dose alta/baixa, horário de administração, etc):  (  ) Sim   (  ) Não   Qual? ____________________________',
        'Necessidade de manejo de problema de saúde autolimitado:  (  ) Sim   (  ) Não   Qual? ______________________________________',
        'Automedicação indevida  Qual? ____________________________________________________________________________________',
        'Não adesão ao tratamento:  (  ) Intencional   (  ) Não intencional   Descrever motivo da não adesão e qual medicamento envolvido: _________',
        'Reação adversa a Medicamento:  (  ) Sim   (  ) Não   Qual? __________________________________________________________',
        'Baixo conhecimento do paciente:  (  ) Doença   (  ) Tratamento   Descrever: __________________________________________________',
        'Outros problemas:  (  ) Sim   (  ) Não   Quais? ________________________________________________________________________',
        'Observações adicionais ___________________________________________________________________________________________'
      ];

      p2Y += 5;
      evalPoints.forEach((point) => {
        docPdf.setTextColor(148, 163, 184);
        docPdf.text('•', 14, p2Y);
        docPdf.setTextColor(51, 65, 85);
        docPdf.text(point, 18, p2Y);
        p2Y += 7.2;
      });

      docPdf.setDrawColor(226, 232, 240);
      docPdf.line(14, p2Y + 0.5, 194, p2Y + 0.5);
      p2Y += 5.5;
      docPdf.line(14, p2Y + 0.5, 194, p2Y + 0.5);

      p2Y += 9;
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(8.5);
      docPdf.setTextColor(30, 41, 59);
      docPdf.text('3.2 Plano de Cuidado (Intervenções realizadas):', 13, p2Y);

      docPdf.setFont('helvetica', 'normal');
      docPdf.setFontSize(7.5);
      docPdf.setTextColor(51, 65, 85);

      const carePoints = [
        '(  ) Aconselhamento sobre doenças',
        '(  ) Aconselhamento sobre hábitos de vida saudável',
        '(  ) Aconselhamento sobre o tratamento',
        '(  ) Aconselhamento sobre o uso de alguma forma farmacêutica',
        '(  ) Entrega de calendário posológico',
        '(  ) Entrega de seletor de locais para aplicação de insulina e outros materiais para pessoas insulinizadas',
        '(  ) Prescrição de medidas não farmacológicas ________________________________________________________________________',
        '    ________________________________________________________________________________________________________________',
        '(  ) Prescrição de medicamentos isentos de prescrição médica __________________________________________________________',
        '    ________________________________________________________________________________________________________________',
        '(  ) Encaminhamento: ____________________________________________________________________________________________',
        '(  ) Encaminhamento para serviço de urgência/emergência ____________________________________________________________',
        '(  ) Outra? Qual? ________________________________________________________________________________________________'
      ];

      p2Y += 4.5;
      carePoints.forEach((point) => {
        docPdf.text(point, 15, p2Y);
        p2Y += 6.5;
      });

      p2Y += 5;
      docPdf.setFillColor(241, 245, 249);
      docPdf.rect(12, p2Y - 1, 186, 6.5, 'F');
      docPdf.setDrawColor(203, 213, 225);
      docPdf.rect(12, p2Y - 1, 186, 6.5, 'S');

      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(9.5);
      docPdf.setTextColor(15, 23, 42);
      docPdf.text('Etapa 4 - Auriculoterapia', 105, p2Y + 3.5, { align: 'center' });

      p2Y += 12;
      docPdf.setFont('helvetica', 'normal');
      docPdf.setFontSize(7.5);
      docPdf.setTextColor(51, 65, 85);
      docPdf.text('Responsável pelo atendimento: _______________________________________________________________________________________', 13, p2Y);
      
      p2Y += 5.5;
      docPdf.text('OBS.: _______________________________________________________________________________________________________________', 13, p2Y);

      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(5.5);
      docPdf.setTextColor(148, 163, 184);
      docPdf.text('Responsável pelo atendimento', 196.5, 140, { angle: 270, align: 'center' });
    };

    drawPage1();
    drawPage2();

    return docPdf;
  };

  // Pure PDF generator engine that supports both download and real-time iframe previews
  const buildPDF = (form: { 
    title: string; 
    code: string; 
    version: number; 
    description?: string; 
    fields: CustomFormField[];
    orientation?: 'portrait' | 'landscape';
    headerStyle?: 'default' | 'classic' | 'minimal';
    
    // Monthly spreadsheet parameters
    formLayout?: 'standard_form' | 'monthly_grid';
    razaoSocial?: string;
    cnpj?: string;
    roomOrAmbiente?: string;
    footerNotes?: string;
    watermarkText?: string;
    gridRowsCount?: number;
  }) => {
    if (form.code === 'FOR-ATEND-01' || form.title.toLowerCase().includes('atendimento farmacêutico')) {
      return buildCustomFichaAtendimento(form, drugstore);
    }

    const isLandscape = form.orientation === 'landscape';
    
    // 1. Specialized Grid Layout mapping requested in the PDF
    if (form.formLayout === 'monthly_grid') {
      const docPdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = docPdf.internal.pageSize.getWidth(); // Portrait: 210mm, Landscape: 297mm
      const pageHeight = docPdf.internal.pageSize.getHeight(); // Portrait: 297mm, Landscape: 210mm
      const margin = 12; // slightly narrower margin for maximum table space
      const printableWidth = pageWidth - (margin * 2);
      let y = 14;

      // Draw Sheet Title with auto-scaling to prevent overflowing margins
      docPdf.setFont('helvetica', 'bold');
      const maxSheetTitleW = printableWidth - 10;
      let sheetTitleSize = 13;
      docPdf.setFontSize(sheetTitleSize);
      let sheetTitleLines = docPdf.splitTextToSize(form.title.toUpperCase(), maxSheetTitleW);
      
      if (sheetTitleLines.length > 1) {
        sheetTitleSize = 11;
        docPdf.setFontSize(sheetTitleSize);
        sheetTitleLines = docPdf.splitTextToSize(form.title.toUpperCase(), maxSheetTitleW);
      }
      if (sheetTitleLines.length > 2) {
        sheetTitleSize = 9.5;
        docPdf.setFontSize(sheetTitleSize);
        sheetTitleLines = docPdf.splitTextToSize(form.title.toUpperCase(), maxSheetTitleW);
      }
      
      docPdf.setTextColor(15, 23, 42); // slate 900
      const sheetLineH = sheetTitleSize * 0.3527 * 1.35;
      sheetTitleLines.forEach((line: string) => {
        docPdf.text(line, pageWidth / 2, y, { align: 'center' });
        y += sheetLineH;
      });
      y += 1.5;

      // Draw Metadata tables like in PDF
      docPdf.setDrawColor(0, 0, 0); // sharp dark borders
      docPdf.setLineWidth(0.25);

      // Row 1: Razão Social
      docPdf.rect(margin, y, printableWidth, 5.5);
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(7.5);
      docPdf.text('Razão Social', margin + 3, y + 3.8);
      docPdf.setFont('helvetica', 'normal');
      docPdf.setFontSize(8);
      docPdf.text(form.razaoSocial || drugstore?.name || 'DROGARIA MARAFARMA LTDA', margin + 28, y + 3.8);
      docPdf.line(margin + 24, y, margin + 24, y + 5.5);

      // Row 2: CNPJ
      y += 5.5;
      docPdf.rect(margin, y, printableWidth, 5.5);
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(7.5);
      docPdf.text('CNPJ', margin + 3, y + 3.8);
      docPdf.setFont('helvetica', 'normal');
      docPdf.setFontSize(8);
      docPdf.text(form.cnpj || '61.394.557 / 0001-49', margin + 28, y + 3.8);
      docPdf.line(margin + 24, y, margin + 24, y + 5.5);

      // Row 3: Mês / Ano | Sala/Ambiente
      y += 5.5;
      docPdf.rect(margin, y, printableWidth, 5.5);
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(7.5);
      docPdf.text('Mês / Ano', margin + 3, y + 3.8);
      docPdf.line(margin + 24, y, margin + 24, y + 5.5);

      const rLabel = form.roomOrAmbiente ? form.roomOrAmbiente.split(':')[0] || 'Sala / Ambiente' : 'Sala / Ambiente';
      const rVal = form.roomOrAmbiente ? form.roomOrAmbiente.split(':')[1] || '' : '';

      docPdf.setFont('helvetica', 'bold');
      docPdf.text(rLabel.toUpperCase(), margin + 115, y + 3.8);
      docPdf.setFont('helvetica', 'normal');
      docPdf.text(rVal, margin + 140, y + 3.8);
      docPdf.line(margin + 110, y, margin + 110, y + 5.5);
      docPdf.line(margin + 135, y, margin + 135, y + 5.5);

      y += 10;
      const headerTop = y;

      // Setup Columns with custom widths
      const hasColab = form.fields.some(f => f.label.toLowerCase().includes('colaborador') || f.id === 'colaborador');
      const normalCols = form.fields.filter(f => !f.label.toLowerCase().includes('colaborador') && f.id !== 'colaborador');
      
      const colDetails: any[] = [
        { id: 'data', label: 'DATA', group: '', width: 10, subUnit: '' }
      ];

      const colabWidth = 18;
      const remainingWidth = printableWidth - 10 - (hasColab ? colabWidth : 0);
      const normalWidth = remainingWidth / Math.max(1, normalCols.length);

      form.fields.forEach(f => {
        const isColab = f.label.toLowerCase().includes('colaborador') || f.id === 'colaborador';
        colDetails.push({
          id: f.id,
          label: f.label,
          group: f.columnGroup || '',
          width: isColab ? colabWidth : normalWidth,
          subUnit: f.subUnitLabel || ''
        });
      });

      // Watermark: Render faded behind the scenes
      if (form.watermarkText) {
        docPdf.setFont('helvetica', 'bold');
        docPdf.setFontSize(38);
        docPdf.setTextColor(235, 238, 242); // slate 50 very subtle watermark
        docPdf.text(form.watermarkText.toUpperCase(), pageWidth / 2, headerTop + 72, { align: 'center', angle: 25 });
        docPdf.setTextColor(0, 0, 0); // Restore text color manually
      }

      docPdf.setDrawColor(0, 0, 0); // solid grid line coloring
      docPdf.setLineWidth(0.24);

      const headerH1 = 5.5;
      const headerH2 = 5.5;
      let curX = margin;

      // Row H1 of Table Header: Group boundaries
      for (let i = 0; i < colDetails.length; i++) {
        const col = colDetails[i];
        if (col.group === '') {
          // Merged top to bottom row
          docPdf.rect(curX, headerTop, col.width, headerH1 + headerH2);
          docPdf.setFont('helvetica', 'bold');
          docPdf.setFontSize(7.5);
          
          // Wrapped text support so long column names do not bleed out of borders
          const maxTextW = col.width - 1.2;
          const labelLines = docPdf.splitTextToSize(col.label.toUpperCase(), maxTextW);
          const lineH = 2.8;
          const totalH = labelLines.length * lineH;
          let textY = headerTop + (headerH1 + headerH2 - totalH) / 2 + 2.2;
          
          labelLines.forEach((line: string) => {
            docPdf.text(line, curX + col.width / 2, textY, { align: 'center' });
            textY += lineH;
          });
          
          curX += col.width;
        } else {
          let groupWidth = col.width;
          let endIdx = i;
          while (endIdx + 1 < colDetails.length && colDetails[endIdx + 1].group === col.group) {
            endIdx++;
            groupWidth += colDetails[endIdx].width;
          }

          // Draw merged spanning cell
          docPdf.rect(curX, headerTop, groupWidth, headerH1);
          docPdf.setFont('helvetica', 'bold');
          docPdf.setFontSize(7.5);
          
          const maxGroupW = groupWidth - 2;
          const groupLines = docPdf.splitTextToSize(col.group.toUpperCase(), maxGroupW);
          const groupLineH = 2.8;
          const totalGroupH = groupLines.length * groupLineH;
          let groupY = headerTop + (headerH1 - totalGroupH) / 2 + 2.2;
          
          groupLines.forEach((line: string) => {
            docPdf.text(line, curX + groupWidth / 2, groupY, { align: 'center' });
            groupY += groupLineH;
          });

          // Sub columns below group
          let tempX = curX;
          for (let g = i; g <= endIdx; g++) {
            const subCol = colDetails[g];
            docPdf.rect(tempX, headerTop + headerH1, subCol.width, headerH2);
            
            docPdf.setFont('helvetica', 'bold');
            let fSize = 6.0;
            if (subCol.label.length > 18) fSize = 5.2;
            docPdf.setFontSize(fSize);
            
            const maxSubW = subCol.width - 1.2;
            const subLines = docPdf.splitTextToSize(subCol.label.toUpperCase(), maxSubW);
            const subLineH = 2.4;
            const totalSubH = subLines.length * subLineH;
            let subY = headerTop + headerH1 + (headerH2 - totalSubH) / 2 + 1.8;
            
            subLines.forEach((line: string) => {
              docPdf.text(line, tempX + subCol.width / 2, subY, { align: 'center' });
              subY += subLineH;
            });
            
            tempX += subCol.width;
          }

          curX += groupWidth;
          i = endIdx;
        }
      }

      // Draw Row Body cells
      let rowTop = headerTop + headerH1 + headerH2;
      const totalRows = Number(form.gridRowsCount) || 31;
      
      let rowH = 4.8;
      if (totalRows > 31) rowH = 4.3;

      for (let r = 1; r <= totalRows; r++) {
        let cellX = margin;
        colDetails.forEach(col => {
          docPdf.rect(cellX, rowTop, col.width, rowH);
          
          if (col.id === 'data') {
            docPdf.setFont('helvetica', 'bold');
            docPdf.setFontSize(7.5);
            docPdf.text(String(r), cellX + col.width / 2, rowTop + rowH / 2 + 1, { align: 'center' });
          } else {
            if (col.subUnit) {
              if (col.subUnit.includes('%') && col.subUnit.includes('º')) {
                const midX = cellX + col.width / 2;
                docPdf.setDrawColor(180, 180, 180); // light divider line
                docPdf.setLineWidth(0.12);
                docPdf.line(midX, rowTop, midX, rowTop + rowH);
                
                docPdf.setDrawColor(0, 0, 0); // restore
                docPdf.setLineWidth(0.24);

                docPdf.setFont('helvetica', 'normal');
                docPdf.setFontSize(4.5);
                docPdf.setTextColor(140, 140, 140);
                docPdf.text('ºC', cellX + col.width / 4, rowTop + rowH / 2 + 1.2, { align: 'center' });
                docPdf.text('%', midX + col.width / 4, rowTop + rowH / 2 + 1.2, { align: 'center' });
              } else {
                docPdf.setFont('helvetica', 'italic');
                docPdf.setFontSize(5);
                docPdf.setTextColor(150, 150, 150);
                docPdf.text(col.subUnit, cellX + col.width - 1.2, rowTop + rowH - 1, { align: 'right' });
              }
              docPdf.setTextColor(0, 0, 0); // restore
            }
          }
          cellX += col.width;
        });
        rowTop += rowH;
      }

      // Footer note at bottom
      let footerY = rowTop + 5;
      if (form.footerNotes) {
        docPdf.setFont('helvetica', 'bold');
        docPdf.setFontSize(7.5);
        docPdf.setTextColor(30, 41, 59);
        docPdf.text(form.footerNotes.toUpperCase(), margin, footerY);
        footerY += 4.5;
      }

      // Signatures boxes
      footerY += 2;
      const lineW = printableWidth / 2 - 15;
      
      docPdf.setDrawColor(200, 200, 200);
      docPdf.setLineWidth(0.2);
      docPdf.line(margin + 5, footerY + 8, margin + 5 + lineW, footerY + 8);
      docPdf.line(pageWidth - margin - 5 - lineW, footerY + 8, pageWidth - margin - 5, footerY + 8);

      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(7);
      docPdf.setTextColor(15, 23, 42);
      docPdf.text('VISTO / CARIMBO RESPONSÁVEL (CRF)', margin + 5 + lineW / 2, footerY + 11.5, { align: 'center' });
      docPdf.text('CONFERENTE EM EXERCÍCIO / FISCAL', pageWidth - margin - 5 - lineW / 2, footerY + 11.5, { align: 'center' });

      return docPdf;
    }

    const docPdf = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = docPdf.internal.pageSize.getWidth(); // Portrait: 210mm, Landscape: 297mm
    const pageHeight = docPdf.internal.pageSize.getHeight(); // Portrait: 297mm, Landscape: 210mm
    const margin = 15;
    const printableWidth = pageWidth - (margin * 2);
    let y = 15;

    // Draw Quality Header based on selected style
    const hStyle = form.headerStyle || 'default';
    
    if (hStyle === 'classic') {
      // Centered Classy Design with thin dual lines
      docPdf.setDrawColor(30, 41, 59);
      docPdf.setLineWidth(0.4);
      docPdf.line(margin, y, pageWidth - margin, y);
      y += 5;
      
      docPdf.setFont('helvetica', 'bold');
      const maxClassicW = printableWidth - 4;
      let classicFontSize = 14;
      docPdf.setFontSize(classicFontSize);
      let classicLines = docPdf.splitTextToSize(form.title.toUpperCase(), maxClassicW);
      if (classicLines.length > 1) {
        classicFontSize = 12;
        docPdf.setFontSize(classicFontSize);
        classicLines = docPdf.splitTextToSize(form.title.toUpperCase(), maxClassicW);
      }
      if (classicLines.length > 2) {
        classicFontSize = 10;
        docPdf.setFontSize(classicFontSize);
        classicLines = docPdf.splitTextToSize(form.title.toUpperCase(), maxClassicW);
      }
      
      const classicLineH = classicFontSize * 0.3527 * 1.3;
      classicLines.forEach((line: string) => {
        docPdf.text(line, pageWidth / 2, y, { align: 'center' });
        y += classicLineH;
      });
      y += 2.5;
      
      docPdf.setFont('helvetica', 'normal');
      docPdf.setFontSize(8.5);
      docPdf.setTextColor(64, 64, 64);
      docPdf.text(`CÓDIGO: ${form.code}  |  VERSÃO: ${form.version}.0  |  DATA DE EMISSÃO: ${format(new Date(), 'dd/MM/yyyy')}`, pageWidth / 2, y, { align: 'center' });
      y += 4.5;
      
      docPdf.setLineWidth(0.15);
      docPdf.line(margin, y, pageWidth - margin, y);
      y += 7;
    } 
    else if (hStyle === 'minimal') {
      // Ultra-modern minimalist header
      docPdf.setFont('helvetica', 'bold');
      const maxMinW = printableWidth - 4;
      let minimalFontSize = 15;
      docPdf.setFontSize(minimalFontSize);
      let minimalLines = docPdf.splitTextToSize(form.title.toUpperCase(), maxMinW);
      if (minimalLines.length > 1) {
        minimalFontSize = 13;
        docPdf.setFontSize(minimalFontSize);
        minimalLines = docPdf.splitTextToSize(form.title.toUpperCase(), maxMinW);
      }
      
      docPdf.setTextColor(15, 23, 42); // slate 900
      let minimalY = y + 4;
      const minLineH = minimalFontSize * 0.3527 * 1.3;
      minimalLines.forEach((line: string) => {
        docPdf.text(line, margin, minimalY);
        minimalY += minLineH;
      });
      
      docPdf.setFont('helvetica', 'normal');
      docPdf.setFontSize(7.5);
      docPdf.setTextColor(100, 116, 139); // slate 500
      docPdf.text(`${form.code}  •  V${form.version}.0  •  ${drugstore?.name || 'CONTROLE DE QUALIDADE'}`, margin, minimalY + 3.5);
      
      y = minimalY + 8;
      docPdf.setDrawColor(226, 232, 240);
      docPdf.setLineWidth(0.2);
      docPdf.line(margin, y, pageWidth - margin, y);
      y += 7;
    } 
    else {
      // Standard Grid Header block with Logo integration
      docPdf.setDrawColor(100, 116, 139);
      docPdf.setLineWidth(0.2);
      
      // Let's draw outer rectangular bounding header
      docPdf.rect(margin, y, printableWidth, 22);
      docPdf.line(margin + 45, y, margin + 45, y + 22); // logo boundary
      docPdf.line(pageWidth - margin - 50, y, pageWidth - margin - 50, y + 22); // metadata boundary
      
      // Title Center with auto-wrapping and auto-scaling inside the full 22mm height panel
      docPdf.setFont('helvetica', 'bold');
      const maxTitleCellW = (printableWidth - 95) - 6; // 6mm padding total
      let currentTitleSize = 11;
      docPdf.setFontSize(currentTitleSize);
      let titleLines = docPdf.splitTextToSize(form.title.toUpperCase(), maxTitleCellW);
      
      if (titleLines.length > 2) {
        currentTitleSize = 9.5;
        docPdf.setFontSize(currentTitleSize);
        titleLines = docPdf.splitTextToSize(form.title.toUpperCase(), maxTitleCellW);
      }
      if (titleLines.length > 3) {
        currentTitleSize = 8.0;
        docPdf.setFontSize(currentTitleSize);
        titleLines = docPdf.splitTextToSize(form.title.toUpperCase(), maxTitleCellW);
      }

      docPdf.setTextColor(15, 23, 42);
      const titleLineHeight = currentTitleSize * 0.3527 * 1.32;
      const totalTitleHeight = titleLines.length * titleLineHeight;
      // Vertically center inside the full 22mm height
      let titleY = y + (22 - totalTitleHeight) / 2 + (currentTitleSize * 0.3527) / 2;
      
      titleLines.forEach((line: string) => {
        docPdf.text(line, margin + 45 + (printableWidth - 95)/2, titleY, { align: 'center' });
        titleY += titleLineHeight;
      });
      
      // Metadata Right
      docPdf.setFont('helvetica', 'normal');
      docPdf.setFontSize(7.5);
      docPdf.text(`CÓDIGO: ${form.code}`, pageWidth - margin - 47, y + 5.5);
      docPdf.text(`VERSÃO: ${form.version}.0`, pageWidth - margin - 47, y + 11);
      docPdf.text(`EMISSÃO: ${format(new Date(), 'dd/MM/yyyy')}`, pageWidth - margin - 47, y + 16.5);
      
      // Logo Left Space
      if (drugstore?.logoUrl) {
        try {
          docPdf.addImage(drugstore.logoUrl, 'PNG', margin + 4, y + 3, 37, 16, undefined, 'FAST');
        } catch(e) {
          docPdf.setFont('helvetica', 'bold');
          docPdf.setFontSize(8);
          docPdf.text(drugstore.name || 'DROGARIA', margin + 22.5, y + 12, { align: 'center' });
        }
      } else {
        docPdf.setFont('helvetica', 'bold');
        docPdf.setFontSize(9);
        docPdf.setTextColor(2, 132, 199);
        docPdf.text(drugstore.name || 'DROGARIA', margin + 22.5, y + 12, { align: 'center' });
      }
      
      y += 29;
    }

    // Draw form brief motivation description
    if (form.description?.trim()) {
      docPdf.setFillColor(248, 250, 252);
      docPdf.setDrawColor(241, 245, 249);
      docPdf.setLineWidth(0.1);
      
      const textLines = docPdf.splitTextToSize(form.description, printableWidth - 6);
      const descHeight = (textLines.length * 4.2) + 5;
      
      docPdf.rect(margin, y, printableWidth, descHeight, 'F');
      docPdf.setFont('helvetica', 'italic');
      docPdf.setFontSize(8);
      docPdf.setTextColor(71, 85, 105);
      
      let descY = y + 4.5;
      for (const line of textLines) {
        docPdf.text(line, margin + 3, descY);
        descY += 4.2;
      }
      y += descHeight + 6;
    }

    // Pack fields horizontally based on sequential grid widths (Percentage row grouping)
    const rows: { fields: CustomFormField[] }[] = [];
    let currentRow: CustomFormField[] = [];
    let currentPercentage = 0;
    
    form.fields.forEach(f => {
      const fieldWidth = parseInt(f.width || '100', 10);
      if (currentPercentage + fieldWidth > 100) {
        rows.push({ fields: currentRow });
        currentRow = [f];
        currentPercentage = fieldWidth;
      } else {
        currentRow.push(f);
        currentPercentage += fieldWidth;
      }
    });
    if (currentRow.length > 0) {
      rows.push({ fields: currentRow });
    }

    const checkPageOverflow = (needed: number) => {
      if (y + needed > pageHeight - 15) {
        docPdf.addPage();
        y = 15;
        docPdf.setFont('helvetica', 'italic');
        docPdf.setFontSize(7.5);
        docPdf.setTextColor(148, 163, 184);
        docPdf.text(`PRODUTO DE CONTROLE SANITÁRIO - CÓDIGO: ${form.code}`, margin, 10);
      }
    };

    // Draw each segmented row of controls
    rows.forEach(rowDef => {
      // Calculate max vertical dimension required for this row on paper
      let maxRowHeight = 16; // baseline text input height
      rowDef.fields.forEach(f => {
        const pct = parseInt(f.width || '100', 10);
        const colWidth = (printableWidth * pct / 100) - 3;

        let labelFontSize = 8.5;
        if (f.labelSize === 'sm') labelFontSize = 7.5;
        if (f.labelSize === 'lg') labelFontSize = 10;

        const labelText = `${f.label.toUpperCase()}${f.required ? ' *' : ''}`;
        
        // estimate label lines assuming ~1.4mm average char width for Helvetica @ 8.5pt
        const charsPerLabelLine = Math.floor(colWidth / (labelFontSize * 0.16));
        const estimatedLabelLines = Math.max(1, Math.ceil(labelText.length / Math.max(10, charsPerLabelLine)));
        
        let headerHeight = estimatedLabelLines * (labelFontSize * 0.3527 * 1.35) + 1.5;

        if (f.helpText) {
          const helpCharsPerLine = Math.floor(colWidth / (7 * 0.15));
          const estimatedHelpLines = Math.max(1, Math.ceil(f.helpText.length / Math.max(15, helpCharsPerLine)));
          headerHeight += estimatedHelpLines * (7 * 0.3527 * 1.3) + 1.5;
        }

        let bodyHeight = 5;
        if (f.type === 'textarea') {
          bodyHeight = (f.dottedLinesCount || 3) * 6.5 + 2;
        } else if (f.type === 'signature' || f.maskType === 'stamp_carimbo') {
          bodyHeight = 16;
        } else if (f.maskType === 'patient_data') {
          bodyHeight = 26;
        } else if (f.maskType === 'medicine_info') {
          bodyHeight = 22;
        } else if (f.type === 'checklist') {
          const optsCount = f.options ? f.options.split(/[,;]/).filter(Boolean).length : 1;
          bodyHeight = optsCount * 6.5;
        } else if (f.maskType === 'clinical_care_page1') {
          bodyHeight = 110;
        } else if (f.maskType === 'clinical_care_page2') {
          bodyHeight = 100;
        } else if (f.maskType === 'clinical_care_page3') {
          bodyHeight = 140;
        } else if (f.type === 'mask') {
          if (f.maskType === 'temperature' && colWidth < 115) {
            bodyHeight = 9.5;
          } else if (f.maskType === 'humidity' && colWidth < 95) {
            bodyHeight = 9.5;
          } else if (f.maskType === 'blood_pressure' && colWidth < 90) {
            bodyHeight = 9.5;
          } else if (f.maskType === 'blood_glucose' && colWidth < 140) {
            bodyHeight = 9.5;
          }
        }

        const estimatedTotalHeight = headerHeight + bodyHeight + 3;
        if (estimatedTotalHeight > maxRowHeight) maxRowHeight = estimatedTotalHeight;
      });

      checkPageOverflow(maxRowHeight + 5);

      let currentX = margin;
      rowDef.fields.forEach(f => {
        const pct = parseInt(f.width || '100', 10);
        const colWidth = (printableWidth * pct / 100);
        
        drawPDFFieldElement(docPdf, f, currentX + 1.5, y, colWidth - 3, maxRowHeight);
        currentX += colWidth;
      });

      y += maxRowHeight + 5;
    });

    // Unified dual signature boxes at footer
    checkPageOverflow(24);
    y += 4;
    docPdf.setDrawColor(203, 213, 225);
    docPdf.setLineWidth(0.25);
    
    const sigWidth = printableWidth / 2 - 12;
    docPdf.line(margin + 5, y + 10, margin + 5 + sigWidth, y + 10);
    docPdf.line(pageWidth - margin - 5 - sigWidth, y + 10, pageWidth - margin - 5, y + 10);
    
    docPdf.setFont('helvetica', 'bold');
    docPdf.setFontSize(8);
    docPdf.setTextColor(30, 41, 59);
    docPdf.text('ASSINATURA DO PROFISSIONAL RESPONSÁVEL', margin + 5 + sigWidth/2, y + 14, { align: 'center' });
    docPdf.text('ASSINATURA DO PACIENTE/RECEPTOR', pageWidth - margin - 5 - sigWidth/2, y + 14, { align: 'center' });

    return docPdf;
  };

  // Compact trigger to download generated document
  const handleDownloadPDF = (form: { 
    title: string; 
    code: string; 
    version: number; 
    description?: string; 
    fields: CustomFormField[];
    orientation?: 'portrait' | 'landscape';
    headerStyle?: 'default' | 'classic' | 'minimal';
    
    // Monthly spreadsheet parameters
    formLayout?: 'standard_form' | 'monthly_grid';
    razaoSocial?: string;
    cnpj?: string;
    roomOrAmbiente?: string;
    footerNotes?: string;
    watermarkText?: string;
    gridRowsCount?: number;
  }) => {
    setGenerating(form.code);
    try {
      const docPdf = buildPDF(form);
      const blob = docPdf.output('blob');
      saveAs(blob, `${form.code}_Form_Impresso.pdf`);
    } catch (e) {
      console.error(e);
      alert("Houve um erro de layout técnico ao tentar formatar a folha PDF.");
    } finally {
      setGenerating(null);
    }
  };

  // Internal visual element renderer inside PDF canvas
  const drawPDFFieldElement = (
    docPdf: jsPDF, 
    f: CustomFormField, 
    x: number, 
    y: number, 
    width: number, 
    rowHeight: number
  ) => {
    // Label Setup
    const requiredMarker = f.required ? ' *' : '';
    const labelLabel = `${f.label.toUpperCase()}${requiredMarker}`;
    
    let fontSize = 8.5;
    if (f.labelSize === 'sm') fontSize = 7.5;
    if (f.labelSize === 'lg') fontSize = 10;
    
    docPdf.setFont('helvetica', 'bold');
    docPdf.setFontSize(fontSize);
    docPdf.setTextColor(15, 23, 42); // slate 900
    
    // Draw Label text corresponding to placement
    const placement = f.labelPlacement || 'above';
    let fieldStartY = y + 5;
    
    if (placement === 'above') {
      // Wrap label based on column width
      const labelLines = docPdf.splitTextToSize(labelLabel, width - 2);
      const lineH = fontSize * 0.3527 * 1.35; // line height in mm
      let labelY = y + 3.5;
      labelLines.forEach((line: string) => {
        docPdf.text(line, x, labelY);
        labelY += lineH;
      });
      fieldStartY = labelY + 0.5;
    } else if (placement === 'left') {
      docPdf.text(labelLabel, x, y + rowHeight / 2 + 1.2);
    }

    if (f.helpText && placement === 'above') {
      docPdf.setFont('helvetica', 'oblique');
      docPdf.setFontSize(7);
      docPdf.setTextColor(100, 116, 139);
      const helpLines = docPdf.splitTextToSize(f.helpText, width - 2);
      const helpLineH = 7 * 0.3527 * 1.3;
      let helpY = fieldStartY + 1.5;
      helpLines.forEach((line: string) => {
        docPdf.text(line, x, helpY);
        helpY += helpLineH;
      });
      fieldStartY = helpY + 0.5;
    }

    const valueY = fieldStartY + 3.5;

    // Draw manual pre-fill layouts
    docPdf.setDrawColor(226, 232, 240); // slate 200
    docPdf.setLineWidth(0.25);

    if (f.type === 'signature') {
      docPdf.setDrawColor(148, 163, 184);
      docPdf.line(x, fieldStartY + 8, x + width - 4, fieldStartY + 8);
      docPdf.setFont('helvetica', 'normal');
      docPdf.setFontSize(7);
      docPdf.setTextColor(148, 163, 184);
      docPdf.text('Assinar acima via física', x + (width - 4)/2, fieldStartY + 11.5, { align: 'center' });
    }
    else if (f.type === 'textarea') {
      // Dotted writing notebook rows
      const lineCount = f.dottedLinesCount || 3;
      let lineY = fieldStartY + 5;
      for (let l = 0; l < lineCount; l++) {
        docPdf.setDrawColor(203, 213, 225);
        docPdf.setLineWidth(0.18);
        docPdf.line(x, lineY, x + width, lineY);
        lineY += 6.5;
      }
    }
    else if (f.type === 'checklist') {
      const opts = f.options ? f.options.split(/[,;]/).map(o => o.trim()).filter(Boolean) : [];
      let checkY = fieldStartY + 4;
      opts.forEach(opt => {
        docPdf.setDrawColor(100, 116, 139);
        docPdf.setLineWidth(0.25);
        docPdf.rect(x, checkY - 2.8, 3.2, 3.2); // blank box for check
        
        docPdf.setFont('helvetica', 'normal');
        docPdf.setFontSize(7.8);
        docPdf.setTextColor(51, 65, 85);
        docPdf.text(opt, x + 5, checkY - 0.2);
        checkY += 6.5;
      });
    }
    else if (f.type === 'select') {
      const opts = f.options ? f.options.split(/[,;]/).map(o => o.trim()).filter(Boolean) : [];
      docPdf.setFont('helvetica', 'normal');
      docPdf.setFontSize(8);
      docPdf.setTextColor(71, 85, 105);
      const outputText = opts.map(o => `[  ] ${o}`).join("    ");
      docPdf.text(outputText, x + 2, valueY);
    }
    else if (f.type === 'date') {
      docPdf.setFont('helvetica', 'normal');
      docPdf.setFontSize(8.5);
      docPdf.setTextColor(148, 163, 184);
      docPdf.text('____ / ____ / ________  -  ____ : ____', x + 2, valueY);
    }
    else if (f.type === 'mask') {
      // Print-designed clinical drugstore masks
      docPdf.setTextColor(51, 65, 85);

      if (f.maskType === 'temperature') {
        docPdf.setFont('helvetica', 'normal');
        if (width < 115) {
          docPdf.setFontSize(7.5);
          docPdf.text('TEMP. ATUAL: _________,___ ºC', x + 2, valueY);
          docPdf.text('MIN/MÁX: _______ / _______ ºC', x + 2, valueY + 4.5);
        } else {
          docPdf.setFontSize(8.5);
          docPdf.text('TEMP. ATUAL: _________,___ ºC  |  MIN/MÁX: _______ / _______ ºC', x + 2, valueY);
        }
      } 
      else if (f.maskType === 'humidity') {
        docPdf.setFont('helvetica', 'normal');
        if (width < 95) {
          docPdf.setFontSize(7.5);
          docPdf.text('UMIDADE RELATIVA DO AR:', x + 2, valueY);
          docPdf.text('____________ % UR', x + 2, valueY + 4.5);
        } else {
          docPdf.setFontSize(8.5);
          docPdf.text('UMIDADE RELATIVA DO AR: ____________ % UR', x + 2, valueY);
        }
      } 
      else if (f.maskType === 'blood_pressure') {
        docPdf.setFont('helvetica', 'normal');
        if (width < 90) {
          docPdf.setFontSize(7.5);
          docPdf.text('P.A. REGISTRADA:', x + 2, valueY);
          docPdf.text('________ x ________ mmHg', x + 2, valueY + 4.5);
        } else {
          docPdf.setFontSize(8.5);
          docPdf.text('P.A. REGISTRADA: ________ x ________ mmHg', x + 2, valueY);
        }
      }
      else if (f.maskType === 'blood_glucose') {
        docPdf.setFont('helvetica', 'normal');
        if (width < 140) {
          docPdf.setFontSize(7.3);
          docPdf.text('GLICEMIA DE PONTA: __________ mg/dL', x + 2, valueY);
          docPdf.text('[  ] Jejum   [  ] Pós-Prandial', x + 2, valueY + 4.5);
        } else {
          docPdf.setFontSize(8.5);
          docPdf.text('GLICEMIA DE PONTA: __________ mg/dL   [  ] Jejum   [  ] Pós-Prandial', x + 2, valueY);
        }
      }
      else if (f.maskType === 'stamp_carimbo') {
        docPdf.setDrawColor(203, 213, 225);
        docPdf.setLineWidth(0.2);
        // Stamp rectangle container
        docPdf.rect(x + 2, fieldStartY + 1, width - 4, rowHeight - 10, 'S');
        docPdf.setFont('helvetica', 'italic');
        docPdf.setFontSize(6.8);
        docPdf.setTextColor(148, 163, 184);
        docPdf.text('ESPAÇO CARIMBO CRF / ASSINATURA TÉCNICA', x + width / 2, fieldStartY + 10, { align: 'center' });
      }
      else if (f.maskType === 'patient_data') {
        docPdf.setDrawColor(226, 232, 240);
        docPdf.rect(x, fieldStartY, width, 25);
        docPdf.setFont('helvetica', 'normal');
        docPdf.setFontSize(8);
        docPdf.setTextColor(71, 85, 105);
        docPdf.text('NOME PACIENTE: ______________________________________________________________', x + 3, fieldStartY + 5.5);
        docPdf.text('CPF: ______.______.___ - ___   CONTATO: (___) ____________________ FONE', x + 3, fieldStartY + 13.5);
        docPdf.text('IDADE: ______ ANOS     SEXO: [  ] MASCULINO   [  ] FEMINININO', x + 3, fieldStartY + 21.5);
      }
      else if (f.maskType === 'clinical_care_page1') {
        docPdf.setDrawColor(226, 232, 240);
        docPdf.rect(x, fieldStartY, width, 25);
        docPdf.setFont('helvetica', 'normal');
        docPdf.setFontSize(8);
        docPdf.setTextColor(71, 85, 105);
        docPdf.text('[ Bloco Especial: Etapa 1 - Acolhimento Farmacêutico ]', x + 5, fieldStartY + 12);
      }
      else if (f.maskType === 'clinical_care_page2') {
        docPdf.setDrawColor(226, 232, 240);
        docPdf.rect(x, fieldStartY, width, 25);
        docPdf.setFont('helvetica', 'normal');
        docPdf.setFontSize(8);
        docPdf.setTextColor(71, 85, 105);
        docPdf.text('[ Bloco Especial: Etapa 2 - Rastreamento em Saúde ]', x + 5, fieldStartY + 12);
      }
      else if (f.maskType === 'clinical_care_page3') {
        docPdf.setDrawColor(226, 232, 240);
        docPdf.rect(x, fieldStartY, width, 25);
        docPdf.setFont('helvetica', 'normal');
        docPdf.setFontSize(8);
        docPdf.setTextColor(71, 85, 105);
        docPdf.text('[ Bloco Especial: Etapas 3 & 4 - Consulta & Auriculoterapia ]', x + 5, fieldStartY + 12);
      }
      else if (f.maskType === 'medicine_info') {
        docPdf.setDrawColor(226, 232, 240);
        docPdf.rect(x, fieldStartY, width, 22);
        docPdf.setFont('helvetica', 'normal');
        docPdf.setFontSize(8);
        docPdf.setTextColor(71, 85, 105);
        docPdf.text('NOME MEDICAMENTO: _______________________________ FABRICANTE: _____________', x + 3, fieldStartY + 5.5);
        docPdf.text('LOTE PRODUTO: __________________ VALIDADE: ____/____/_______ CRF: _________', x + 3, fieldStartY + 13.5);
        docPdf.text('VIA: [  ] INTRAMUSCULAR (IM)   [  ] SUBCUTÂNEA (SC)   [  ] OUTRA VIA', x + 3, fieldStartY + 19.5);
      }
    }
    else {
      // Standard underline line for physical typing
      docPdf.setDrawColor(226, 232, 240);
      docPdf.line(x, valueY + 2, x + width - 4, valueY + 2);
      
      docPdf.setFont('helvetica', 'italic');
      docPdf.setFontSize(7.5);
      docPdf.setTextColor(163, 163, 163);
      docPdf.text('Preenchimento livre...', x + 2, valueY);
    }
  };

  return (
    <div className="space-y-6 px-1 pb-20">
      <AnimatePresence mode="wait">
        {!isEditorOpen ? (
          // MAIN LIST DASHBOARD VIEW
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-8"
          >
            {/* Header branding */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-sky-700 text-white rounded-2xl shadow-xl flex items-center justify-center border border-white/10">
                    <ClipboardCheck size={30} className="drop-shadow-md" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-emerald-500 p-1 rounded-full text-white shadow shadow-md border-2 border-white">
                    <ShieldCheck size={12} />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    Formulários & Fichas de Impressão
                    <span className="text-[10px] bg-indigo-50 text-indigo-600 font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider border border-indigo-100">Escrita Manual</span>
                  </h1>
                  <p className="text-sm text-slate-500 font-medium mt-1">
                    Desenhe layouts em formato Retrato ou Paisagem com linhas, quadros pautados e termos para preenchimento manuscrito em rotinas de vigilância sanitária.
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleCreateNewForm}
                className="self-start lg:self-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Plus size={16} className="stroke-[3]" />
                Adicionar Ficha de Impressão
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setActiveTab('presets')}
                className={`py-3.5 px-6 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
                  activeTab === 'presets' 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Sparkles size={14} />
                Modelos Rápidos (Prescritivos ANVISA)
              </button>
              <button
                onClick={() => setActiveTab('custom')}
                className={`py-3.5 px-6 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 relative ${
                  activeTab === 'custom' 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText size={14} />
                Nossos Layouts Criados
                {customForms.length > 0 && (
                  <span className="bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                    {customForms.length}
                  </span>
                )}
              </button>
            </div>

            {/* TAB 1: PRESETS */}
            {activeTab === 'presets' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {STANDARD_PRESETS.map((form) => {
                  const IconComp = form.icon || ClipboardCheck;
                  return (
                    <div 
                      key={form.id} 
                      className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100">
                            <IconComp size={24} />
                          </div>
                          <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase">
                            {form.code}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 leading-tight uppercase mb-1">{form.title}</h3>
                          <p className="text-xs text-slate-500 leading-relaxed mt-2 font-medium line-clamp-3">{form.description}</p>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-[9px] bg-slate-50 border border-slate-150 text-slate-500 px-2.5 py-0.5 rounded-full font-bold uppercase">
                            {form.fields.length} Blocos Coletados
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-6">
                        <button
                          disabled={generating === form.code}
                          onClick={() => handleDownloadPDF({ ...form, version: 1 })}
                          className="flex items-center justify-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-800 py-2.5 rounded-xl font-bold transition-all text-[10px] uppercase cursor-pointer disabled:opacity-50"
                        >
                          {generating === form.code ? <Loader2 className="animate-spin text-indigo-600" size={13} /> : <Download size={13} />}
                          Baixar Pronta
                        </button>
                        <button
                          onClick={() => handleCustomizePreset(form)}
                          className="flex items-center justify-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2.5 rounded-xl font-bold transition-all text-[10px] uppercase cursor-pointer"
                        >
                          <Edit2 size={13} />
                          Personalizar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 2: CUSTOM FROM DATABASE */}
            {activeTab === 'custom' && (
              <div>
                {loadingForms ? (
                  <div className="text-center py-20 bg-white border border-slate-150 rounded-2xl">
                    <Loader2 className="animate-spin text-indigo-600 mx-auto mb-3" size={32} />
                    <p className="text-sm font-semibold text-slate-505">Carregando layouts cadastrados...</p>
                  </div>
                ) : customForms.length === 0 ? (
                  <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-6">
                    <FileText size={42} className="text-slate-300 mb-3" />
                    <h3 className="text-md font-bold text-slate-800">Nenhum layout personalizado encontrado</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm leading-relaxed text-center">
                      Crie folhas de controle clínico, registros de geladeira de imunobiológicos ou fichas técnicas específicas para sua farmácia.
                    </p>
                    <button
                      onClick={handleCreateNewForm}
                      className="mt-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs uppercase"
                    >
                      Criar Primeiro Layout
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {customForms.map((form) => (
                      <div 
                        key={form.id} 
                        className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <span className="text-[10px] font-mono bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-black uppercase">
                              {form.code}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                              v{form.version}.0 • {form.orientation === 'landscape' ? 'PAISAGEM' : 'RETRATO'}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-slate-900 uppercase leading-snug">{form.title}</h3>
                            {form.description && (
                              <p className="text-xs text-slate-500 mt-2 leading-relaxed line-clamp-2">{form.description}</p>
                            )}
                          </div>
                          <span className="text-[9.5px] bg-slate-50 border border-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase inline-block">
                            {form.fields.length} Blocos Coletados
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 mt-6">
                          <button
                            disabled={generating === form.code}
                            onClick={() => handleDownloadPDF(form)}
                            className="bg-indigo-600 hover:bg-indigo-705 text-white rounded-xl font-bold py-2.5 transition-all text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 col-span-2 shadow"
                          >
                            {generating === form.code ? <Loader2 className="animate-spin" size={12} /> : <Download size={12} />}
                            Imprimir PDF
                          </button>
                          
                          <button
                            onClick={() => handleEditCustomForm(form)}
                            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-bold py-2.5 transition-all text-[9.5px] uppercase flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Edit2 size={12} />
                            Editar
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between border-t border-slate-100 mt-4 pt-3 text-[9px] text-slate-400">
                          <span>Modificado: {form.updatedAt?.seconds ? format(new Date(form.updatedAt.seconds * 1000), 'dd/MM/yyyy') : 'Hoje'}</span>
                          <button 
                            type="button"
                            onClick={(e) => handleDeleteCustomForm(form.id!, e)}
                            className="text-red-500 hover:text-red-700 flex items-center gap-0.5 font-bold cursor-pointer hover:bg-red-50 px-2 py-0.5 rounded"
                          >
                            <Trash2 size={11} /> Excluir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        ) : (
          // INTERACTIVE INDEPENDENT PRINTABLE FORM CONSTRUCTOR
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Design header actions */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md">
                  <Layout className="animate-pulse" size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2.5 py-0.5 rounded-full uppercase">
                    Modelagem Especial para Prontuários Impressos
                  </span>
                  <h2 className="text-md font-bold uppercase text-white mt-1">Editor de Layout Clínico & Sanitário (A4)</h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <X size={14} /> Fechar Construtor
                </button>
                <button
                  type="button"
                  onClick={handleSaveForm}
                  disabled={busySaving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow disabled:opacity-50"
                >
                  {busySaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                  Salvar Ficha
                </button>
              </div>
            </div>

            {/* Main Interactive Grid split layout */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              
              {/* LEFT CONTROLS SIDEBAR: Properties and Presets Drawer (SPAN 5) */}
              <div className="xl:col-span-5 space-y-6">
                
                {/* 1. DOCUMENT PROPERTIES */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider pb-2 border-b border-indigo-50 flex items-center gap-1.5">
                    <Settings size={15} className="text-indigo-600" /> Configuração do Papel e Cabeçalho
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-505 block uppercase">Nome da Ficha *</label>
                      <input
                        type="text"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="Ex: Registro de Coleta Térmica"
                        className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:bg-white focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-505 block uppercase">Código Documental *</label>
                      <input
                        type="text"
                        value={formCode}
                        onChange={(e) => setFormCode(e.target.value)}
                        placeholder="Ex: FOR-REC-01"
                        className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:bg-white focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-505 block uppercase">Versão</label>
                      <input
                        type="number"
                        min={1}
                        value={formVersion}
                        onChange={(e) => setFormVersion(Number(e.target.value) || 1)}
                        className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-505 block uppercase">Orientação</label>
                      <select
                        value={paperOrientation}
                        onChange={(e: any) => setPaperOrientation(e.target.value)}
                        className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-indigo-600 text-slate-700"
                      >
                        <option value="portrait">Retrato A4</option>
                        <option value="landscape">Paisagem A4</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-505 block uppercase">Estilo Cabeçalho</label>
                      <select
                        value={headerStyle}
                        onChange={(e: any) => setHeaderStyle(e.target.value)}
                        className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-indigo-600 text-slate-700"
                      >
                        <option value="default">Grid Técnico</option>
                        <option value="classic">Corporativo</option>
                        <option value="minimal">Minimalista</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-505 block uppercase">Formato / Layout do Formulário</label>
                    <select
                      value={formLayout}
                      onChange={(e: any) => setFormLayout(e.target.value)}
                      className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 outline-none focus:ring-1 focus:ring-indigo-600 text-slate-700"
                    >
                      <option value="standard_form">Ficha Regular (Campos Verticais)</option>
                      <option value="monthly_grid">Ficha de Check-List Operacional (Grade Mensal / Tabelas)</option>
                    </select>
                  </div>

                  {formLayout === 'monthly_grid' && (
                    <div className="space-y-3 bg-indigo-50 border border-indigo-150 p-3 rounded-xl mt-2 pb-3.5">
                      <span className="text-[9.5px] font-bold text-indigo-900 tracking-wider block uppercase">Parâmetros das Tabelas Grid (PDF)</span>
                      
                      <div>
                        <label className="text-[9px] font-bold text-slate-600 block uppercase">Razão Social</label>
                        <input
                          type="text"
                          value={razaoSocial}
                          onChange={(e) => setRazaoSocial(e.target.value)}
                          className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-md px-2.5 py-1.5 outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-slate-600 block uppercase">CNPJ</label>
                          <input
                            type="text"
                            value={cnpj}
                            onChange={(e) => setCnpj(e.target.value)}
                            className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-md px-2.5 py-1.5 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-600 block uppercase">Ambiente / Sala</label>
                          <input
                            type="text"
                            value={roomOrAmbiente}
                            onChange={(e) => setRoomOrAmbiente(e.target.value)}
                            placeholder="Sala:_______"
                            className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-md px-2.5 py-1.5 outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-slate-600 block uppercase">Marca d'Água (Texto)</label>
                          <input
                            type="text"
                            value={watermarkText}
                            onChange={(e) => setWatermarkText(e.target.value)}
                            className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-md px-2.5 py-1.5 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-600 block uppercase">Linhas da Tabela (Dias)</label>
                          <input
                            type="number"
                            min={1}
                            max={31}
                            value={gridRowsCount}
                            onChange={(e) => setGridRowsCount(Number(e.target.value) || 31)}
                            className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-md px-2.5 py-1.5 outline-none text-slate-700"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-slate-600 block uppercase">Notas de Rodapé</label>
                        <input
                          type="text"
                          value={footerNotes}
                          onChange={(e) => setFooterNotes(e.target.value)}
                          placeholder="Ex: * Higienização diária obrigatória"
                          className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-md px-2.5 py-1.5 outline-none"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-bold text-slate-505 block uppercase">Descrição motivadora da folha (Instrução normativa opcional)</label>
                    <textarea
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Indique a legislação estadual ou regras da ANVISA justificando a preenchem..."
                      rows={2}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none text-slate-600"
                    />
                  </div>
                </div>

                {/* 2. COMPONENT PRESENTS DRAWER OR COLUMN BUILDER */}
                {formLayout === 'monthly_grid' ? (
                  <div className="space-y-4">
                    {/* PRESET LOADERS FOR THE THREE FORMS SENT BY USER */}
                    <div className="bg-gradient-to-br from-indigo-950 to-slate-900 border border-indigo-850 rounded-2xl p-4 md:p-5 shadow-lg space-y-3.5 text-white">
                      <div>
                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-300">Modelos Oficiais MARAFARMA</span>
                        <h4 className="text-[11.5px] font-black uppercase text-slate-100 tracking-wide mt-0.5">Carga Rápida de Colunas</h4>
                        <p className="text-[9.5px] text-zinc-400 mt-1 leading-normal font-sans">
                          Carregue a estrutura idêntica aos PDFs com apenas um clique e ajuste como preferir.
                        </p>
                      </div>

                      <div className="space-y-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setFormTitle('Check-List - Sala de Aplicação de Injetáveis');
                            setFormCode('CL-INJ-01');
                            setRoomOrAmbiente('Sala:__________');
                            
                            const storeFirstWord = drugstore?.name ? drugstore.name.trim().split(' ')[0].toUpperCase() : 'MARAFARMA';
                            setWatermarkText(storeFirstWord);
                            setRazaoSocial(drugstore?.name || 'DROGARIA MARAFARMA LTDA');
                            setCnpj(drugstore?.cnpj || '61.394.557 / 0001-49');
                            
                            setFooterNotes('* Limpeza - Veja + Álcool 70º');
                            setGridRowsCount(31);
                            setPaperOrientation('portrait');
                            
                            const fields: CustomFormField[] = [
                              { id: `field_${Date.now()}_0`, label: 'Colaborador', type: 'text', width: '50' },
                              { id: `field_${Date.now()}_1`, label: 'Limpeza *', type: 'text', columnGroup: 'Conferência de Materiais e Procedimentos (x)', subUnitLabel: '(x)' },
                              { id: `field_${Date.now()}_2`, label: 'Luvas Descartáveis', type: 'text', columnGroup: 'Conferência de Materiais e Procedimentos (x)', subUnitLabel: '(x)' },
                              { id: `field_${Date.now()}_3`, label: 'Algodão', type: 'text', columnGroup: 'Conferência de Materiais e Procedimentos (x)', subUnitLabel: '(x)' },
                              { id: `field_${Date.now()}_4`, label: 'Álcool 70º', type: 'text', columnGroup: 'Conferência de Materiais e Procedimentos (x)', subUnitLabel: '(x)' },
                              { id: `field_${Date.now()}_5`, label: 'Seringas Descartáveis', type: 'text', columnGroup: 'Conferência de Materiais e Procedimentos (x)', subUnitLabel: '(x)' },
                              { id: `field_${Date.now()}_6`, label: 'Papel Toalha', type: 'text', columnGroup: 'Conferência de Materiais e Procedimentos (x)', subUnitLabel: '(x)' },
                              { id: `field_${Date.now()}_7`, label: 'Descartex', type: 'text', columnGroup: 'Conferência de Materiais e Procedimentos (x)', subUnitLabel: '(x)' }
                            ];
                            setFormFields(fields);
                            setSelectedFieldId(fields[0]?.id || null);
                          }}
                          className="w-full text-left p-2.5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500 rounded-xl transition-all cursor-pointer text-[10.5px] font-bold flex items-center gap-2.5"
                        >
                          <Syringe size={14} className="text-indigo-400 shrink-0" />
                          <div>
                            <span className="block text-slate-100 font-extrabold text-[10px] uppercase">1. Checklist de Injetáveis</span>
                            <span className="text-[8.5px] text-zinc-500 font-sans font-medium">8 colunas, cabeça superior unificada</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setFormTitle('Controle de Temperatura e Umidade');
                            setFormCode('CTU-02');
                            setRoomOrAmbiente('Ambiente:__________');
                            
                            const storeFirstWord = drugstore?.name ? drugstore.name.trim().split(' ')[0].toUpperCase() : 'MARAFARMA';
                            setWatermarkText(storeFirstWord);
                            setRazaoSocial(drugstore?.name || 'DROGARIA MARAFARMA LTDA');
                            setCnpj(drugstore?.cnpj || '61.394.557 / 0001-49');
                            
                            setFooterNotes('* Registrar as temperaturas mínima, máxima e momento da medição');
                            setGridRowsCount(31);
                            setPaperOrientation('portrait');
                            
                            const fields: CustomFormField[] = [
                              { id: `field_${Date.now()}_1`, label: 'Min.', type: 'text', columnGroup: 'MANHÃ', subUnitLabel: 'ºC %' },
                              { id: `field_${Date.now()}_2`, label: 'Max.', type: 'text', columnGroup: 'MANHÃ', subUnitLabel: 'ºC %' },
                              { id: `field_${Date.now()}_3`, label: 'Mom.', type: 'text', columnGroup: 'MANHÃ', subUnitLabel: 'ºC %' },
                              { id: `field_${Date.now()}_4`, label: 'Min.', type: 'text', columnGroup: 'TARDE', subUnitLabel: 'ºC %' },
                              { id: `field_${Date.now()}_5`, label: 'Max.', type: 'text', columnGroup: 'TARDE', subUnitLabel: 'ºC %' },
                              { id: `field_${Date.now()}_6`, label: 'Mom.', type: 'text', columnGroup: 'TARDE', subUnitLabel: 'ºC %' },
                              { id: `field_${Date.now()}_7`, label: 'Min.', type: 'text', columnGroup: 'NOITE', subUnitLabel: 'ºC %' },
                              { id: `field_${Date.now()}_8`, label: 'Max.', type: 'text', columnGroup: 'NOITE', subUnitLabel: 'ºC %' },
                              { id: `field_${Date.now()}_9`, label: 'Mom.', type: 'text', columnGroup: 'NOITE', subUnitLabel: 'ºC %' }
                            ];
                            setFormFields(fields);
                            setSelectedFieldId(fields[0]?.id || null);
                          }}
                          className="w-full text-left p-2.5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500 rounded-xl transition-all cursor-pointer text-[10.5px] font-bold flex items-center gap-2.5"
                        >
                          <Thermometer size={14} className="text-emerald-400 shrink-0" />
                          <div>
                            <span className="block text-slate-100 font-extrabold text-[10px] uppercase">2. Temperatura e Umidade</span>
                            <span className="text-[8.5px] text-zinc-500 font-sans font-medium">Divisões de turnos com células dupla ºC e %</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setFormTitle('Check-List Limpeza e Organização de Banheiro');
                            setFormCode('CL-BAN-01');
                            setRoomOrAmbiente('Ambiente:__________');
                            
                            const storeFirstWord = drugstore?.name ? drugstore.name.trim().split(' ')[0].toUpperCase() : 'MARAFARMA';
                            setWatermarkText(storeFirstWord);
                            setRazaoSocial(drugstore?.name || 'DROGARIA MARAFARMA LTDA');
                            setCnpj(drugstore?.cnpj || '61.394.557 / 0001-49');
                            
                            setFooterNotes('* Registrar com o visto do executor responsável após conclusão');
                            setGridRowsCount(31);
                            setPaperOrientation('portrait');
                            
                            const fields: CustomFormField[] = [
                              { id: `field_${Date.now()}_0`, label: 'Colaborador', type: 'text', width: '50' },
                              { id: `field_${Date.now()}_1`, label: 'Coleta de Lixo', type: 'text', columnGroup: 'Conferência de Materiais e Limpeza (x)', subUnitLabel: '(x)' },
                              { id: `field_${Date.now()}_2`, label: 'Limpeza de Vaso', type: 'text', columnGroup: 'Conferência de Materiais e Limpeza (x)', subUnitLabel: '(x)' },
                              { id: `field_${Date.now()}_3`, label: 'Limpeza da Pia', type: 'text', columnGroup: 'Conferência de Materiais e Limpeza (x)', subUnitLabel: '(x)' },
                              { id: `field_${Date.now()}_4`, label: 'Limpeza Parede', type: 'text', columnGroup: 'Conferência de Materiais e Limpeza (x)', subUnitLabel: '(x)' },
                              { id: `field_${Date.now()}_5`, label: 'Abastecimento Papel Higiênico', type: 'text', columnGroup: 'Conferência de Materiais e Limpeza (x)', subUnitLabel: '(x)' },
                              { id: `field_${Date.now()}_6`, label: 'Abastecimento Papel Toalha', type: 'text', columnGroup: 'Conferência de Materiais e Limpeza (x)', subUnitLabel: '(x)' },
                              { id: `field_${Date.now()}_7`, label: 'Abastecimento Sabonete Liq.', type: 'text', columnGroup: 'Conferência de Materiais e Limpeza (x)', subUnitLabel: '(x)' }
                            ];
                            setFormFields(fields);
                            setSelectedFieldId(fields[0]?.id || null);
                          }}
                          className="w-full text-left p-2.5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500 rounded-xl transition-all cursor-pointer text-[10.5px] font-bold flex items-center gap-2.5"
                        >
                          <ClipboardCheck size={14} className="text-purple-400 shrink-0" />
                          <div>
                            <span className="block text-slate-100 font-extrabold text-[10px] uppercase">3. Limpeza de Banheiro</span>
                            <span className="text-[8.5px] text-zinc-500 font-sans font-medium">Categorias de materiais higiênicos completas</span>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* INTERACTIVE COLUMN CREATION */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                      <div>
                        <h3 className="text-xs font-black uppercase text-slate-600 tracking-wider">Criador de Colunas da Tabela</h3>
                        <p className="text-[10px] text-zinc-400 mt-1">Insira colunas sob medida para formatar sua planilha.</p>
                      </div>

                      <div className="space-y-3.5 text-xs font-semibold">
                        <div>
                          <label className="text-[9px] uppercase font-bold text-slate-500 block">Nome da Coluna *</label>
                          <input
                            type="text"
                            value={newColLabel}
                            onChange={(e) => setNewColLabel(e.target.value)}
                            placeholder="Ex: Luvas, Min., Sabonete"
                            className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:bg-white focus:ring-1 focus:ring-indigo-600 mt-1"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] uppercase font-bold text-slate-500 block">Agrupador / Grupo de Colunas (Opcional)</label>
                          <input
                            type="text"
                            value={newColGroup}
                            onChange={(e) => setNewColGroup(e.target.value)}
                            placeholder="Ex: MANHÃ, Conferência de Materiais"
                            className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:bg-white focus:ring-1 focus:ring-indigo-600 mt-1"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] uppercase font-bold text-slate-505 block">Subdivisão / Sufixo da Célula</label>
                          <select
                            value={newColSubUnit}
                            onChange={(e) => setNewColSubUnit(e.target.value)}
                            className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 outline-none focus:ring-1 focus:ring-indigo-600 text-slate-700 mt-1"
                          >
                            <option value="">Em branco (para visto ou visto em texto)</option>
                            <option value="ºC %">Delineamento Térmico + Humidade (ºC %)</option>
                            <option value="(x)">Caixa de Seleção Cruzada (x)</option>
                            <option value="visto">Assinatura Manual (visto)</option>
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (!newColLabel.trim()) {
                              alert("Insira o título da coluna.");
                              return;
                            }
                            const newField: CustomFormField = {
                              id: `field_${Date.now()}`,
                              label: newColLabel.trim(),
                              type: 'text',
                              columnGroup: newColGroup.trim(),
                              subUnitLabel: newColSubUnit,
                              width: '50',
                              required: false,
                              dottedLinesCount: 3,
                              labelSize: 'sm',
                              labelPlacement: 'above'
                            };
                            setFormFields(prev => [...prev, newField]);
                            setSelectedFieldId(newField.id);
                            
                            // Reset state
                            setNewColLabel('');
                            setNewColGroup('');
                            setNewColSubUnit('');
                          }}
                          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl shadow transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Plus size={13} /> ADICIONAR COLUNA
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <div>
                      <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Selecione para Adicionar à Ficha</h3>
                      <p className="text-[10px] text-zinc-400 mt-1">Componentes desenhados exclusivamente para a predição manuscrita.</p>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Basic printable elements */}
                      <div>
                        <span className="text-[9px] font-bold text-indigo-600 tracking-wider block uppercase mb-1">Estruturas Básicas</span>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleAddFieldSetting('date')}
                            className="flex items-center gap-1.5 p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-lg text-left text-[11px] font-bold text-slate-700 transition-colors"
                          >
                            <Type size={13} className="text-slate-400" /> Data e Hora p/ Escrita
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddFieldSetting('text')}
                            className="flex items-center gap-1.5 p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-lg text-left text-[11px] font-bold text-slate-700 transition-colors"
                          >
                            <Type size={13} className="text-slate-400" /> Linha p/ Resposta
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddFieldSetting('textarea')}
                            className="flex items-center gap-1.5 p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-lg text-left text-[11px] font-bold text-slate-700 transition-colors"
                          >
                            <File size={13} className="text-slate-400" /> Caderno de Anotações pautadas
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddFieldSetting('checklist')}
                            className="flex items-center gap-1.5 p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-lg text-left text-[11px] font-bold text-slate-700 transition-colors"
                          >
                            <ClipboardCheck size={13} className="text-slate-400" /> Grade de Checklist [ ]
                          </button>
                        </div>
                      </div>

                      {/* Quality control fields for drugstore */}
                      <div>
                        <span className="text-[9px] font-bold text-indigo-600 tracking-wider block uppercase mb-1">Mascáras Farmacêuticas e Clínicas</span>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleAddFieldSetting('mask', 'temperature')}
                            className="flex items-center gap-1.5 p-2 bg-slate-50 hover:bg-slate-100 border border-indigo-100 hover:border-indigo-300 rounded-lg text-left text-[11px] font-bold text-slate-700 transition-colors"
                          >
                            <Thermometer size={13} className="text-indigo-500" /> Termômetro ºC
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddFieldSetting('mask', 'humidity')}
                            className="flex items-center gap-1.5 p-2 bg-slate-50 hover:bg-slate-100 border border-indigo-100 hover:border-indigo-300 rounded-lg text-left text-[11px] font-bold text-slate-700 transition-colors"
                          >
                            <Activity size={13} className="text-indigo-500" /> Umidade Relativa %
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddFieldSetting('mask', 'blood_pressure')}
                            className="flex items-center gap-1.5 p-2 bg-slate-50 hover:bg-slate-100 border border-indigo-100 hover:border-indigo-300 rounded-lg text-left text-[11px] font-bold text-slate-700 transition-colors"
                          >
                            <Activity size={13} className="text-rose-500" /> Pressão Arterial
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddFieldSetting('mask', 'blood_glucose')}
                            className="flex items-center gap-1.5 p-2 bg-slate-50 hover:bg-slate-100 border border-indigo-100 hover:border-indigo-300 rounded-lg text-left text-[11px] font-bold text-slate-700 transition-colors"
                          >
                            <Activity size={13} className="text-emerald-500" /> Glicemia Capilar
                          </button>
                        </div>
                      </div>

                      {/* Preconfigured compound blocks */}
                      <div>
                        <span className="text-[9px] font-bold text-indigo-600 tracking-wider block uppercase mb-1">Compilados ANVISA</span>
                        <div className="grid grid-cols-1 gap-2">
                          <button
                            type="button"
                            onClick={() => handleAddFieldSetting('mask', 'patient_data')}
                            className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100 border border-indigo-200 rounded-lg text-left text-[11px] font-bold text-slate-700 transition-colors"
                          >
                            <ShieldCheck size={14} className="text-indigo-600" /> Ficha Cadastral Paciente (Nome, CPF, Sexo, Idade)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddFieldSetting('mask', 'clinical_care_page1')}
                            className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100 border border-indigo-250 rounded-lg text-left text-[11px] font-bold text-slate-700 transition-colors"
                          >
                            <ClipboardCheck size={14} className="text-violet-600" /> Acolhimento Farmacêutico (Etapa 1)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddFieldSetting('mask', 'clinical_care_page2')}
                            className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100 border border-indigo-250 rounded-lg text-left text-[11px] font-bold text-slate-700 transition-colors"
                          >
                            <Activity size={14} className="text-violet-600" /> Rastreamento em Saúde (Etapa 2)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddFieldSetting('mask', 'clinical_care_page3')}
                            className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100 border border-indigo-250 rounded-lg text-left text-[11px] font-bold text-slate-700 transition-colors"
                          >
                            <ClipboardCheck size={14} className="text-violet-600" /> Consulta & Auriculoterapia (Etapas 3 & 4)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddFieldSetting('mask', 'medicine_info')}
                            className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100 border border-indigo-200 rounded-lg text-left text-[11px] font-bold text-slate-700 transition-colors"
                          >
                            <Syringe size={14} className="text-indigo-600" /> Bloco Detalhado de Vacina/Injetável (Lote, Validade)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddFieldSetting('mask', 'stamp_carimbo')}
                            className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100 border border-dashed border-indigo-300 rounded-lg text-left text-[11px] font-bold text-indigo-700 transition-colors"
                          >
                            <ClipboardCheck size={14} className="text-indigo-600" /> Campo Box Carimbo p/ CRF e Farmacêutico Supervisor
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* 3. GERENCIADOR DE ORGANIZAÇÃO DE CAMPOS (FORM OUTLINE) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="pb-2 border-b border-indigo-50 flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.55">
                      <Layout size={15} className="text-indigo-600" /> Estrutura do Formulário ({formFields.length})
                    </h3>
                    {formFields.length > 1 && (
                      <span className="text-[9px] text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-full uppercase">Ordene os campos</span>
                    )}
                  </div>

                  {formFields.length === 0 ? (
                    <p className="text-[11px] text-slate-400 font-medium italic py-2 text-center">Nenhum campo adicionado ainda. Clique nas categorias acima para adicionar.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                      {formFields.map((field, index) => {
                        const isSelected = selectedFieldId === field.id;
                        return (
                          <div
                            key={field.id}
                            onClick={() => setSelectedFieldId(field.id)}
                            className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-400 text-indigo-950 font-semibold ring-1 ring-indigo-500/10'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-100 text-slate-600'
                            }`}
                          >
                            <div className="flex items-center gap-2 max-w-[65%] truncate">
                              <span className="text-[10px] font-bold text-slate-400 bg-white border border-slate-150 px-1.5 py-0.5 rounded-full inline-block min-w-[20px] text-center font-mono">
                                {index + 1}
                              </span>
                              <span className="truncate font-medium" title={field.label}>
                                {field.label || 'Sem Legenda'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <span className="text-[8px] font-bold bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded uppercase font-mono">
                                {field.width}%
                              </span>
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveField(index, 'up', e);
                                }}
                                className="p-1 hover:bg-slate-200 rounded disabled:opacity-25 text-slate-500"
                              >
                                <ArrowUp size={12} />
                              </button>
                              <button
                                type="button"
                                disabled={index === formFields.length - 1}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveField(index, 'down', e);
                                }}
                                className="p-1 hover:bg-slate-200 rounded disabled:opacity-25 text-slate-500"
                              >
                                <ArrowDown size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveField(field.id, e);
                                }}
                                className="p-1 hover:bg-red-50 text-red-500 hover:text-red-700 rounded"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 4. FIELD ATTRIBUTES CONTROL FOR THE SELECTED FIELD */}
                {selectedFieldId && formFields.find(f => f.id === selectedFieldId) && (
                  <div className="bg-white border-2 border-indigo-500/80 rounded-2xl p-5 shadow-lg space-y-4 relative">
                    <div className="absolute top-4 right-4 bg-indigo-100 text-indigo-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                      Elemento Selecionado
                    </div>
                    
                    <h3 className="text-xs font-black uppercase text-indigo-900 tracking-wider pb-2 border-b border-indigo-50">
                      {formLayout === 'monthly_grid' ? 'Editar Propriedades da Coluna' : 'Editar Propriedades do Campo'}
                    </h3>
                    
                    {(() => {
                      const field = formFields.find(f => f.id === selectedFieldId)!;
                      const fieldIdx = formFields.findIndex(f => f.id === selectedFieldId);
                      return (
                        <div className="space-y-4 text-xs font-semibold">
                          <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500 mt-1">
                              {formLayout === 'monthly_grid' ? 'Nome da Coluna da Tabela' : 'Pergunta / Título do Campo'}
                            </label>
                            <input
                              type="text"
                              value={field.label}
                              onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                              className="w-full text-xs font-bold border border-slate-300 rounded-lg p-2 mt-1 focus:ring-1 focus:ring-indigo-600"
                            />
                          </div>

                          {formLayout === 'monthly_grid' ? (
                            <div className="space-y-4">
                              <div className="space-y-3 bg-indigo-50/50 border border-indigo-150 p-3 rounded-xl mt-2 pb-3 flex flex-col">
                                <span className="text-[9.5px] font-bold text-indigo-900 tracking-wider block uppercase">Ajustes da Coluna da Tabela</span>
                                
                                <div>
                                  <label className="text-[9px] uppercase font-bold text-slate-600">Agrupador superior de Coluna (Se houver)</label>
                                  <input
                                    type="text"
                                    value={field.columnGroup || ''}
                                    onChange={(e) => handleUpdateField(field.id, { columnGroup: e.target.value })}
                                    placeholder="Ex: MANHÃ ou Conferência de Materiais"
                                    className="w-full text-xs font-bold border border-slate-300 bg-white rounded-md p-1.5 mt-0.5"
                                  />
                                  <span className="text-[8.5px] text-indigo-805 font-medium leading-normal italic block mt-0.5">Define títulos mesclados que agrupam múltiplas colunas no cabeçalho.</span>
                                </div>

                                <div>
                                  <label className="text-[9px] uppercase font-bold text-slate-600">Sufixo de Unidade / Subdivisão</label>
                                  <select
                                    value={field.subUnitLabel || ''}
                                    onChange={(e) => handleUpdateField(field.id, { subUnitLabel: e.target.value })}
                                    className="w-full text-xs font-bold border border-slate-300 bg-white rounded-md p-1.5 mt-0.5 cursor-pointer outline-none"
                                  >
                                    <option value="">Em branco (para visto ou visto em texto)</option>
                                    <option value="ºC %">Delineamento Térmico + Humidade (ºC %)</option>
                                    <option value="(x)">Caixa de Seleção Cruzada (x)</option>
                                    <option value="visto">Assinatura Manual (visto)</option>
                                  </select>
                                  <span className="text-[8.5px] text-indigo-805 font-medium leading-normal italic block mt-0.5">Unidade física impressa na célula (<strong>ºC %</strong> gerará divisão térmica e higrométrica).</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-[10px] uppercase font-bold text-slate-500">Tamanho da Legenda</label>
                                  <select
                                    value={field.labelSize || 'sm'}
                                    onChange={(e: any) => handleUpdateField(field.id, { labelSize: e.target.value })}
                                    className="w-full text-xs border border-slate-300 rounded-lg p-1.5 mt-1 outline-none"
                                  >
                                    <option value="sm">Pequeno (8px)</option>
                                    <option value="md">Médio (10px)</option>
                                    <option value="lg">Grande (12px)</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[10px] uppercase font-bold text-slate-500">Largura na Linha</label>
                                  <select
                                    value={field.width || '100'}
                                    onChange={(e: any) => handleUpdateField(field.id, { width: e.target.value })}
                                    className="w-full text-xs border border-slate-300 rounded-lg p-1.5 mt-1 outline-none"
                                  >
                                    <option value="100">Linha Inteira (100%)</option>
                                    <option value="50">Metade da Linha (50%)</option>
                                    <option value="33">Um Terço (33%)</option>
                                    <option value="25">Um Quarto (25%)</option>
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-[10px] uppercase font-bold text-slate-500">Posição Legenda</label>
                                  <select
                                    value={field.labelPlacement || 'above'}
                                    onChange={(e: any) => handleUpdateField(field.id, { labelPlacement: e.target.value })}
                                    className="w-full text-xs border border-slate-300 rounded-lg p-1.5 mt-1 outline-none font-medium"
                                  >
                                    <option value="above">Acima do campo</option>
                                    <option value="left">Alinhado à esquerda</option>
                                    <option value="none">Ocultar Legenda</option>
                                  </select>
                                </div>
                                <div className="flex items-center pt-4">
                                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={!!field.required}
                                      onChange={(e) => handleUpdateField(field.id, { required: e.target.checked })}
                                      className="h-4 w-4 text-indigo-600 rounded"
                                    />
                                    <span>Mostrar Asterisco (*)</span>
                                  </label>
                                </div>
                              </div>

                              {field.type === 'textarea' && (
                                <div>
                                  <label className="text-[10px] uppercase font-bold text-slate-500">Número de Linhas Delineadoras Pautadas</label>
                                  <input
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={field.dottedLinesCount || 3}
                                    onChange={(e) => handleUpdateField(field.id, { dottedLinesCount: Math.max(1, Number(e.target.value) || 3) })}
                                    className="w-full text-xs border border-slate-300 rounded-lg p-2 mt-1 font-bold"
                                  />
                                  <p className="text-[9.5px] text-indigo-700 mt-1 italic font-medium">Recomenda-se entre 2 e 6 linhas para notas à mão.</p>
                                </div>
                              )}

                              {field.type === 'checklist' && (
                                <div className="bg-indigo-50 border border-indigo-150 rounded-xl p-3 space-y-1">
                                  <label className="text-[9.5px] uppercase font-black text-indigo-900 block">Itens da Grade Checklist (Separar por ponto-e-vírgula)</label>
                                  <input
                                    type="text"
                                    value={field.options || ''}
                                    onChange={(e) => handleUpdateField(field.id, { options: e.target.value })}
                                    placeholder="Item A; Item B; Item C"
                                    className="w-full text-xs border border-indigo-200 rounded-md p-1.5 font-medium bg-white outline-none"
                                  />
                                </div>
                              )}

                              {field.type === 'select' && (
                                <div className="bg-indigo-50 border border-indigo-150 rounded-xl p-3 space-y-1">
                                  <label className="text-[9.5px] uppercase font-black text-indigo-900 block">Opções para Seleção Física (Separar por vírgula)</label>
                                  <input
                                    type="text"
                                    value={field.options || ''}
                                    onChange={(e) => handleUpdateField(field.id, { options: e.target.value })}
                                    placeholder="Sim, Não, Sob Análise"
                                    className="w-full text-xs border border-indigo-200 rounded-md p-1.5 font-medium bg-white outline-none"
                                  />
                                </div>
                              )}

                              <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500 block">Legenda Complementar de Ajuda</label>
                                <input
                                  type="text"
                                  value={field.helpText || ''}
                                  onChange={(e) => handleUpdateField(field.id, { helpText: e.target.value })}
                                  placeholder="Observação médica que deve ser cumprida..."
                                  className="w-full text-xs border border-slate-300 rounded-lg p-2 mt-1 text-slate-600 font-medium"
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex border-t border-slate-100 pt-3 flex-wrap gap-1.5 justify-between">
                            <button
                              type="button"
                              onClick={(e) => handleRemoveField(field.id, e)}
                              className="text-red-500 font-bold hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 text-[10.5px] cursor-pointer"
                            >
                              Remover este Campo
                            </button>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                disabled={fieldIdx === 0}
                                onClick={(e) => handleMoveField(fieldIdx, 'up', e)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-205 disabled:opacity-20 rounded"
                                title="Mover para Cima/Esquerda"
                              >
                                <ArrowUp size={13} className="stroke-[2.5]" />
                              </button>
                              <button
                                type="button"
                                disabled={fieldIdx === formFields.length - 1}
                                onClick={(e) => handleMoveField(fieldIdx, 'down', e)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-205 disabled:opacity-20 rounded"
                                title="Mover para Baixo/Direita"
                              >
                                <ArrowDown size={13} className="stroke-[2.5]" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

              </div>

              {/* RIGHT LIVE CANVAS PREVIEW - SIMULATING PHYSICAL SHEET OF PAPER (SPAN 7) */}
              <div className="xl:col-span-7 space-y-4">
                
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl text-white">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3 mb-4">
                    <div>
                      <h4 className="text-sm font-black uppercase text-indigo-450 tracking-wider flex items-center gap-1.5">
                        <FileText size={15} className="text-indigo-455" /> Pré-visualizaço Real do PDF de Impressão
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Abaixo está o documento final de alta fidelidade que será impresso ou baixado em folha A4.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDownloadPDF({
                        title: formTitle || 'Ficha Sem Título',
                        code: formCode || 'FOR-00',
                        version: typeof formVersion === 'string' ? Number(formVersion) || 1 : formVersion,
                        description: formDescription,
                        fields: formFields,
                        orientation: paperOrientation,
                        headerStyle: headerStyle,
                        formLayout: formLayout,
                        razaoSocial: razaoSocial,
                        cnpj: cnpj,
                        roomOrAmbiente: roomOrAmbiente,
                        footerNotes: footerNotes,
                        watermarkText: watermarkText,
                        gridRowsCount: typeof gridRowsCount === 'string' ? Number(gridRowsCount) || 31 : gridRowsCount
                      })}
                      className="bg-indigo-600 hover:bg-slate-700 text-white font-bold px-3.5 py-1.5 rounded-xl text-[10px] uppercase flex items-center gap-1.5 cursor-pointer shadow-lg transition-all self-start sm:self-center"
                    >
                      <Download size={12} /> Baixar PDF Oficial (.pdf)
                    </button>
                  </div>

                  {/* Selector of Preview Mode */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 mb-4 gap-3 text-xs leading-normal">
                    <div className="space-y-0.5">
                      <span className="text-[10.5px] uppercase font-black tracking-wider text-slate-400 block">Modo de Visualização do Documento</span>
                      <p className="text-[9px] text-slate-500 font-medium font-sans">Selecione o melhor formato para a tela do seu navegador.</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-1 flex gap-1 self-stretch sm:self-auto shadow-inner">
                      <button
                        type="button"
                        onClick={() => setPreviewMode('html')}
                        className={`flex-1 sm:flex-initial py-1.5 px-3.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          previewMode === 'html'
                            ? 'bg-indigo-600 text-white shadow font-extrabold'
                            : 'text-slate-400 hover:text-slate-200 font-medium'
                        }`}
                      >
                        <Layout size={12} /> Interativo HTML (Recomendado)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewMode('pdf')}
                        className={`flex-1 sm:flex-initial py-1.5 px-3.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          previewMode === 'pdf'
                            ? 'bg-indigo-600 text-white shadow font-extrabold'
                            : 'text-slate-400 hover:text-slate-200 font-medium'
                        }`}
                      >
                        <FileText size={12} /> PDF Nativo
                      </button>
                    </div>
                  </div>

                  {/* REAL LIVE PDF PREVIEW INTERACTIVE CANVAS LIST */}
                  {previewMode === 'pdf' && (
                    <div className="bg-slate-950 p-4 md:p-6 rounded-2xl flex flex-col justify-center items-center gap-4" style={{ minHeight: '600px' }}>
                      {pdfDoc && pdfDoc.numPages ? (
                        <div className="w-full relative space-y-4">
                          {/* Layout Header */}
                          <div className="flex items-center justify-between bg-slate-900/90 backdrop-blur-md p-3.5 rounded-xl border border-slate-800 text-[10px] uppercase font-bold text-slate-300">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              <span>Visualizador Fiel do PDF real gerado ({pdfDoc.numPages} {pdfDoc.numPages === 1 ? 'Página' : 'Páginas'})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {previewPdfUrl && (
                                <a
                                  href={previewPdfUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer text-xs uppercase tracking-wider font-mono decoration-transparent"
                                >
                                  Abrir ou Baixar PDF ↗
                                </a>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4 max-w-2xl mx-auto">
                            {Array.from({ length: pdfDoc.numPages }, (_, idx) => (
                              <div key={idx} className="space-y-1">
                                <div className="text-[9px] font-mono font-bold text-slate-500 text-right uppercase tracking-wider">
                                  Página {idx + 1} de {pdfDoc.numPages}
                                </div>
                                <PdfPage pdfDoc={pdfDoc} pageNumber={idx + 1} />
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : isCompiling || !pdfjsLoaded ? (
                        <div className="text-center py-24 flex flex-col items-center justify-center text-slate-500">
                          <Loader2 className="animate-spin text-indigo-500 mb-3" size={32} />
                          <p className="text-xs font-semibold">Compilando e renderizando PDF real...</p>
                          <p className="text-[10px] text-slate-600 mt-1 font-medium font-mono">Direct Canvas PDF.js Renderer Active</p>
                        </div>
                      ) : (
                        <div className="text-center py-24 flex flex-col items-center justify-center text-slate-500">
                          <Loader2 className="animate-spin text-indigo-500 mb-3" size={32} />
                          <p className="text-xs font-semibold font-mono uppercase tracking-widest text-indigo-400">Iniciando Engine Gráfico...</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* PAPER SIMULATOR GRID */}
                  <div className={`bg-slate-900 p-2 md:p-6 overflow-x-auto rounded-2xl flex flex-col gap-3 items-center justify-center ${previewMode === 'html' ? '' : 'hidden'}`}>
                    <p className="text-[9.5px] text-slate-400 text-center select-none max-w-md leading-normal italic font-medium">
                      Simulação Interativa fiel à folha A4. Clique em qualquer campo para editá-lo no painel esquerdo.
                    </p>
                    <div 
                      className={`bg-white text-slate-800 border border-slate-350 shadow-2xl p-6 relative transition-all duration-300 ${
                        paperOrientation === 'landscape' ? 'w-[750px] aspect-[1.414/1]' : 'w-[560px] aspect-[1/1.414]'
                      }`}
                    >
                      {/* Grid margin lines markers */}
                      <div className="absolute top-2 left-2 right-2 bottom-2 border border-dashed border-slate-200 pointer-events-none rounded"></div>
                      
                      {formLayout === 'monthly_grid' ? (
                        <div className="relative h-full flex flex-col justify-between py-1 px-1 z-10 w-full">
                          {/* Watermark preview */}
                          {watermarkText && (
                            <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] select-none pointer-events-none transform rotate-12 z-0 font-sans text-4xl font-extrabold tracking-widest text-slate-800 uppercase">
                              {watermarkText}
                            </div>
                          )}

                          <div className="z-10 space-y-2.5">
                            {/* Sheet Title */}
                            <div className="text-center">
                              <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-wide select-none">
                                {formTitle || 'TÍTULO'}
                              </h4>
                            </div>

                            {/* Crisp Metadata Table */}
                            <div className="border border-slate-400 text-[6px] text-slate-700 font-semibold bg-white select-none">
                              <div className="grid grid-cols-12 border-b border-slate-400 p-0.5">
                                <span className="col-span-2 font-bold text-slate-950 uppercase pl-1">Razão Social:</span>
                                <span className="col-span-10 text-slate-600 font-mono text-[6.5px]">{razaoSocial}</span>
                              </div>
                              <div className="grid grid-cols-12 border-b border-slate-400 p-0.5">
                                <span className="col-span-2 font-bold text-slate-950 uppercase pl-1">CNPJ:</span>
                                <span className="col-span-10 text-slate-600 font-mono text-[6.5px]">{cnpj}</span>
                              </div>
                              <div className="grid grid-cols-12 p-0.5">
                                <div className="col-span-6 flex gap-1 items-center">
                                  <span className="font-bold text-slate-950 uppercase pl-1">Mês / Ano:</span>
                                  <span className="text-slate-400 border-b border-dashed border-slate-400 w-12 h-1 block"></span>
                                </div>
                                <div className="col-span-6 border-l border-slate-400 pl-2 flex gap-1 items-center">
                                  <span className="font-bold text-slate-950 uppercase">{roomOrAmbiente.split(':')[0] || 'Ambiente'}:</span>
                                  <span className="text-slate-600 font-mono text-[6.5px]">{roomOrAmbiente.split(':')[1] || ''}</span>
                                </div>
                              </div>
                            </div>

                            {/* Interactive HTML Grid Table Builder Preview */}
                            <div className="overflow-x-auto border border-slate-400 rounded bg-white">
                              {(() => {
                                const hasColab = formFields.some(f => f.label.toLowerCase().includes('colaborador') || f.id === 'colaborador');
                                const normalCols = formFields.filter(f => !f.label.toLowerCase().includes('colaborador') && f.id !== 'colaborador');
                                
                                const colDetails: any[] = [
                                  { id: 'data', label: 'DATA', group: '', width: '8%', subUnit: '' }
                                ];

                                const colabWidth = '14%';
                                const normalWidth = `${(hasColab ? 78 : 92) / (normalCols.length || 1)}%`;

                                formFields.forEach(f => {
                                  const isColab = f.label.toLowerCase().includes('colaborador') || f.id === 'colaborador';
                                  colDetails.push({
                                    id: f.id,
                                    label: f.label,
                                    group: f.columnGroup || '',
                                    width: isColab ? colabWidth : normalWidth,
                                    subUnit: f.subUnitLabel || ''
                                  });
                                });

                                // Group columns
                                const groupedHeaders: any[] = [];
                                for (let i = 0; i < colDetails.length; i++) {
                                  const col = colDetails[i];
                                  if (!col.group) {
                                    groupedHeaders.push({ label: col.label, colSpan: 1, isSingle: true, fields: [col] });
                                  } else {
                                    const lastGroup = groupedHeaders[groupedHeaders.length - 1];
                                    if (lastGroup && !lastGroup.isSingle && lastGroup.label === col.group) {
                                      lastGroup.colSpan++;
                                      lastGroup.fields.push(col);
                                    } else {
                                      groupedHeaders.push({ label: col.group, colSpan: 1, isSingle: false, fields: [col] });
                                    }
                                  }
                                }

                                return (
                                  <table className="w-full border-collapse text-[5.8px]">
                                    <thead className="bg-slate-50 text-center font-bold text-slate-800">
                                      <tr className="border-b border-slate-400">
                                        {groupedHeaders.map((g, idx) => (
                                          <th
                                            key={idx}
                                            colSpan={g.colSpan}
                                            rowSpan={g.isSingle ? 2 : 1}
                                            style={{ width: g.isSingle ? g.fields[0].width : undefined }}
                                            className="border-r border-slate-400 p-0.5 text-[6.2px] font-bold uppercase cursor-pointer hover:bg-slate-100 text-slate-900 align-middle"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (!g.isSingle && g.fields[0]?.id) {
                                                setSelectedFieldId(g.fields[0].id);
                                              }
                                            }}
                                          >
                                            {g.label}
                                          </th>
                                        ))}
                                      </tr>
                                      <tr className="border-b border-slate-400">
                                        {groupedHeaders.filter(g => !g.isSingle).flatMap(g => g.fields).map((f, idx) => (
                                          <th
                                            key={idx}
                                            style={{ width: f.width }}
                                            className={`border-r border-slate-400 p-0.5 text-[5.5px] font-bold uppercase cursor-pointer transition-colors ${
                                              selectedFieldId === f.id ? 'bg-indigo-100 text-indigo-950 font-black' : 'hover:bg-slate-100 text-slate-705'
                                            }`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedFieldId(f.id);
                                            }}
                                          >
                                            {f.label}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {Array.from({ length: 8 }).map((_, rIdx) => (
                                        <tr key={rIdx} className="border-b border-slate-300">
                                          {colDetails.map((col, cIdx) => (
                                            <td
                                              key={cIdx}
                                              className={`border-r border-slate-300 p-0.5 text-center font-mono text-[5.8px] text-slate-400 ${
                                                col.id !== 'data' && selectedFieldId === col.id ? 'bg-indigo-50/50' : ''
                                              }`}
                                            >
                                              {col.id === 'data' ? (
                                                <strong className="text-slate-800 font-bold">{rIdx + 1}</strong>
                                              ) : col.subUnit ? (
                                                col.subUnit.includes('%') && col.subUnit.includes('º') ? (
                                                  <div className="flex justify-around text-[4.5px] text-slate-300">
                                                    <span>_ºC</span>
                                                    <span className="border-r border-slate-150"></span>
                                                    <span>_%</span>
                                                  </div>
                                                ) : (
                                                  <span className="text-[5.2px] text-slate-400 font-semibold italic">{col.subUnit}</span>
                                                )
                                              ) : (
                                                <span className="text-slate-200">___</span>
                                              )}
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                      <tr className="bg-slate-50/55 border-t border-slate-450">
                                        <td colSpan={colDetails.length} className="text-center py-0.5 text-[5.2px] italic text-slate-400 select-none">
                                          ... total de {gridRowsCount} linhas diárias geradas no documento completo ...
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                );
                              })()}
                            </div>
                          </div>

                          <div className="mt-3.5 z-10 text-[6px]">
                            {/* Footer note and signatures */}
                            {footerNotes && (
                              <p className="text-[6.5px] text-slate-500 font-medium italic select-none">
                                {footerNotes.toUpperCase()}
                              </p>
                            )}

                            <div className="mt-4 grid grid-cols-2 gap-4 text-[5.5px] text-slate-405 border-t border-slate-200 pt-2 select-none font-bold">
                              <div className="text-center border-t border-dashed border-slate-300 pt-1 uppercase">
                                VISTO / CARIMBO RESPONSÁVEL (CRF)
                              </div>
                              <div className="text-center border-t border-dashed border-slate-300 pt-1 uppercase">
                                CONFERENTE / FISCALIZAÇÃO
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (formCode === 'FOR-ATEND-01' || formTitle.toUpperCase().includes('ATENDIMENTO FARMACÊUTICO')) ? (
                        <div className="text-[7.2px] space-y-4 text-slate-700 h-full overflow-y-auto max-h-[720px] select-none pr-1 bg-white p-4 font-mono leading-normal rounded shadow border w-full">
                          {/* Rich high-fidelity preview matching the PDF! */}
                          <div className="border border-slate-900 p-2 space-y-3 relative bg-slate-50/10">
                            <span className="absolute top-1 right-2 bg-indigo-600 text-[6.5px] text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Simulador Página 1</span>
                            
                            {/* Header grid */}
                            <div className="border border-slate-400 grid grid-cols-4 bg-white text-[7.5px] text-center font-bold">
                              <div className="border-r border-slate-350 p-1 flex flex-col justify-center text-slate-800 leading-tight">
                                <span>CONSELHO</span>
                                <span>FEDERAL DE</span>
                                <span>FARMÁCIA</span>
                              </div>
                              <div className="border-r border-slate-350 col-span-2 p-1 text-[9px] font-black text-indigo-950 flex items-center justify-center tracking-tight leading-snug">
                                {formTitle.toUpperCase()}
                              </div>
                              <div className="p-1 flex flex-col justify-center text-red-600 leading-tight">
                                <span className="text-[7px]">Farmacêuticos</span>
                                <span className="text-[7px]">em Ação</span>
                                <span className="text-[5.5px] italic text-slate-500">CUIDANDO DE VOCÊ</span>
                              </div>
                            </div>

                            {/* Section 1 Title */}
                            <div className="text-center font-bold text-[8.5px] text-zinc-950 border-b border-slate-400 pb-0.5 uppercase tracking-wide">
                              Etapa 1 - Acolhimento
                            </div>

                            {/* Section 1 Inputs */}
                            <div className="space-y-1 bg-white p-2 rounded border border-slate-200 text-slate-600 text-[6.5px]">
                              <div>Nome: ____________________________________________________________________ Data: ___/___/___</div>
                              <div>Endereço: _____________________________________________________________ Telefone: ______________</div>
                              <div>Gênero: [ ] F  [ ] M  [ ] Outro      Idade: _________</div>
                              <div>Problema(s) de saúde: [ ] Diabetes  [ ] Hipertensão  [ ] Asma  [ ] Dislipidemia  [ ] Outro(s): _________________</div>
                              <div>Tem alguém na família com: [ ] Diabetes  [ ] Hipertensão  [ ] Asma  [ ] Outro(s): ________________________</div>
                              <div>Quem? _________________________________________________________________________________________________</div>
                              <div>Você fuma? [ ] Sim  [ ] Não         Fumante passivo? [ ] Sim  [ ] Não</div>
                              <div>Você trouxe? [ ] Medicamentos   [ ] Receitas   [ ] Laudos de exames</div>
                              <div>Você faz uso de algum medicamento? [ ] Sim  [ ] Não</div>
                              <div className="font-bold pt-1 text-slate-800">Caso a resposta seja sim, preencher o quadro abaixo de acordo com o relato do paciente:</div>
                            </div>

                            {/* Pharmacotherapy table preview */}
                            <div className="border border-slate-350 bg-white rounded overflow-hidden">
                              <div className="grid grid-cols-12 bg-amber-50/70 border-b border-slate-350 p-1 text-[6px] font-bold text-center">
                                <span className="col-span-4 border-r border-slate-300">Medicamento</span>
                                <span className="col-span-2 border-r border-slate-300">Concentração</span>
                                <span className="col-span-2 border-r border-slate-300">Posologia</span>
                                <span className="col-span-2 border-r border-slate-300">Como usa</span>
                                <span className="col-span-2">Indicação</span>
                              </div>
                              {Array.from({ length: 4 }).map((_, rIdx) => (
                                <div key={rIdx} className="grid grid-cols-12 border-b border-slate-200 p-1 text-slate-300 text-center text-[5.8px]">
                                  <div className="col-span-4 border-r border-slate-200">_____________________________</div>
                                  <div className="col-span-2 border-r border-slate-200">__________</div>
                                  <div className="col-span-2 border-r border-slate-200">__________</div>
                                  <div className="col-span-2 border-r border-slate-200">___________________</div>
                                  <div className="col-span-2">__________</div>
                                </div>
                              ))}
                            </div>

                            {/* Rest of Section 1 */}
                            <div className="space-y-1 bg-white p-2 border border-slate-200 text-slate-650 text-[6.5px]">
                              <div>O paciente usa: [ ] Injetável   [ ] Dispositivos inalatórios   [ ] Aplicação nasal   [ ] Colírio   [ ] Outro</div>
                              <div>Na sua casa, onde guarda os medicamentos? [ ] Adequado   [ ] Inadequado: __________________________________</div>
                              <div>O que é feito com medicamentos vencidos? [ ] Adequado   [ ] Inadequado: ___________________________________</div>
                              <div>OBS: _______________________________________________________________________________________________</div>
                            </div>

                            {/* Section 2 Header */}
                            <div className="text-center font-bold text-[8.5px] text-zinc-950 border-b border-slate-400 pb-0.5 mt-2 uppercase tracking-wide">
                              Etapa 2 - Rastreamento em Saúde
                            </div>

                            {/* Parameters Table preview */}
                            <div className="border border-slate-350 bg-white rounded overflow-hidden">
                              <div className="grid grid-cols-12 bg-amber-50/70 border-b border-slate-350 p-1 text-[6px] font-bold text-center">
                                <span className="col-span-3 border-r border-slate-300">Parâmetro</span>
                                <span className="col-span-3 border-r border-slate-300">Resultado</span>
                                <span className="col-span-4 border-r border-slate-300">Critério de Encaminhamento</span>
                                <span className="col-span-2">Alterado?</span>
                              </div>
                              <div className="grid grid-cols-12 border-b border-slate-200 p-1 text-[5.8px] items-center text-slate-700">
                                <div className="col-span-3 border-r border-slate-200 font-bold pl-1">Pressão Arterial</div>
                                <div className="col-span-3 border-r border-slate-200 text-slate-400 pl-1">_______ x _______ mmHg</div>
                                <div className="col-span-4 border-r border-slate-200 text-rose-700 font-bold pl-1">&ge; 140/90 mmHg</div>
                                <div className="col-span-2 text-center text-slate-405">[ ] Sim  [ ] Não</div>
                              </div>
                              <div className="grid grid-cols-12 border-b border-slate-200 p-1 text-[5.8px] items-center text-slate-700">
                                <div className="col-span-3 border-r border-slate-200 font-bold pl-1">Frequência Cardíaca</div>
                                <div className="col-span-3 border-r border-slate-200 text-slate-400 pl-1">_______ bpm</div>
                                <div className="col-span-4 border-r border-slate-200 pl-1 text-[5.3px] leading-tight text-slate-500">
                                  [ ] &ge;101 ou &le;49 bpm, s/ ins. cardíaca<br/>
                                  [ ] &ge;71 bpm, c/ ins. cardíaca
                                </div>
                                <div className="col-span-2 text-center text-slate-405">[ ] Sim  [ ] Não</div>
                              </div>
                              <div className="grid grid-cols-12 border-b border-slate-200 p-1 text-[5.8px] items-center text-slate-700">
                                <div className="col-span-3 border-r border-slate-200 font-bold pl-1">Colesterol Total</div>
                                <div className="col-span-3 border-r border-slate-200 text-slate-400 pl-1">_______ mg/dL</div>
                                <div className="col-span-4 border-r border-slate-200 text-rose-700 font-bold pl-1">&ge; 190 mg/dL</div>
                                <div className="col-span-2 text-center text-slate-405">[ ] Sim  [ ] Não</div>
                              </div>
                              <div className="grid grid-cols-12 border-b border-slate-200 p-1 text-[5.8px] items-center text-slate-700">
                                <div className="col-span-3 border-r border-slate-200 font-bold pl-1">Glicemia Capilar</div>
                                <div className="col-span-3 border-r border-slate-200 text-slate-400 pl-1">_______ mg/dL</div>
                                <div className="col-span-4 border-r border-slate-200 pl-1 text-[5.3px] leading-tight text-slate-500">
                                  [ ] &ge;100 mg/dL se jejum &gt;8h<br/>
                                  [ ] &ge;140 mg/dL se jejum de 2a8h<br/>
                                  [ ] &ge;200 mg/dL independente de jejum
                                </div>
                                <div className="col-span-2 text-center text-slate-405">[ ] Sim  [ ] Não</div>
                              </div>
                              <div className="grid grid-cols-12 border-b border-slate-200 p-1 text-[5.8px] items-center text-slate-700">
                                <div className="col-span-3 border-r border-slate-200 font-bold pl-1">HbA1c</div>
                                <div className="col-span-3 border-r border-slate-200 text-slate-400 pl-1">_______ %</div>
                                <div className="col-span-4 border-r border-slate-200 pl-1 text-[5.3px] leading-tight text-slate-500">
                                  [ ] &ge;5.7% sem diagn. prévio de diabetes<br/>
                                  [ ] &ge;6.5% com diagn. prévio de diabetes
                                </div>
                                <div className="col-span-2 text-center text-slate-405">[ ] Sim  [ ] Não</div>
                              </div>
                              <div className="grid grid-cols-12 p-1 text-[5.8px] items-center text-slate-700">
                                <div className="col-span-3 border-r border-slate-200 font-bold pl-1">Peak Flow</div>
                                <div className="col-span-3 border-r border-slate-200 text-slate-400 text-[5.3px] leading-tight pl-1">
                                  1. _____  2. _____  3. _____ l/min<br/>
                                  Resultado final: ______%
                                </div>
                                <div className="col-span-4 border-r border-slate-200 text-rose-700 font-bold pl-1">&le; 79%</div>
                                <div className="col-span-2 text-center text-slate-405">[ ] Sim  [ ] Não</div>
                              </div>
                            </div>

                            {/* Under Screening table */}
                            <div className="space-y-1 bg-white p-2 border border-slate-200 text-slate-600 text-[6.5px]">
                              <div>Tempo de jejum: [ ] &ge; 8h  [ ] 2 a 8h  [ ] &ge; 2h / casual</div>
                              <div>Paciente polimedicado (5 ou mais meds): [ ] Sim  [ ] Não</div>
                              <div>Idôneo para uso correto da forma farmacêutica: [ ] Sim  [ ] Não</div>
                              <div>OBS: _______________________________________________________________________________________________</div>
                            </div>
                          </div>

                          {/* Page 2 border */}
                          <div className="border border-slate-900 p-2 space-y-3 relative bg-slate-50/10">
                            <span className="absolute top-1 right-2 bg-indigo-600 text-[6.5px] text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Simulador Página 2</span>
                            
                            {/* Section 3 Header */}
                            <div className="text-center font-bold text-[8.5px] text-zinc-950 border-b border-slate-400 pb-0.5 uppercase tracking-wide">
                              Etapa 3 - Consulta Farmacêutica
                            </div>

                            {/* Subsection 3.1 Assessments */}
                            <div className="space-y-1 bg-white p-2 border border-slate-200 text-slate-650 text-[6px]">
                              <div className="font-bold text-[7px] text-indigo-900 pb-0.5">3.1 Avaliação (identificação de problemas)</div>
                              <div>&bull; Reclamação que necessita de esclarecimento médico? [ ] Sim  [ ] Não  Qual: __________________</div>
                              <div>&bull; Tratamento atual descontrolado? [ ] Sim  [ ] Não  Qual: ___________________________</div>
                              <div>&bull; Falta tratamento para alguma condição? [ ] Sim  [ ] Não  Qual: ________________________</div>
                              <div>&bull; Medicamento desnecessário / sem indicação? [ ] Sim  [ ] Não  Qual: _______________________</div>
                              <div>&bull; Problema posológico (frequência/dose)? [ ] Sim  [ ] Não  Qual: ____________________________</div>
                              <div>&bull; Problema de saúde autolimitado sem tratamento? [ ] Sim  [ ] Não  Qual: ______________________</div>
                              <div>&bull; Prática inadequada de automedicação? Qual: _______________________________________________</div>
                              <div>&bull; Não adesão ao tratamento: [ ] Intencional  [ ] Não intencional  Motivo: ______________________</div>
                              <div>&bull; Suspeita de reação adversa a medicamento (RAM)? [ ] Sim  [ ] Não  Qual: ______________________</div>
                              <div>&bull; Baixo conhecimento do paciente: [ ] Doença  [ ] Uso medicamentos  Qual: ____________________</div>
                              <div>&bull; Observações adicionais: _______________________________________________________________________</div>
                              <div>_______________________________________________________________________________________________</div>
                            </div>

                            {/* Subsection 3.2 Care Plan */}
                            <div className="space-y-1 bg-white p-2 border border-slate-200 text-slate-650 text-[6px]">
                              <div className="font-bold text-[7px] text-indigo-900 pb-0.5">3.2 Plano de Cuidado (Intervenções realizadas)</div>
                              <div>[ ] Orientação sobre a patologia descrita</div>
                              <div>[ ] Orientação sobre estilo de vida / hábitos saudáveis</div>
                              <div>[ ] Orientação detalhada quanto ao uso dos medicamentos</div>
                              <div>[ ] Elaboração e entrega de tabela de horários (calendário posológico)</div>
                              <div>[ ] Treinamento para uso correto e locais de aplicação de insulina / injetáveis</div>
                              <div>[ ] Prescrição de terapia não farmacológica: _____________________________________________________</div>
                              <div>[ ] Prescrição de Medicamentos Isentos de Prescrição Médica (MIPs): __________________________</div>
                              <div>[ ] Encaminhamento médico ou serviço de urgência: ____________________________________________</div>
                            </div>

                            {/* Section 4 Header */}
                            <div className="text-center font-bold text-[8.5px] text-zinc-950 border-b border-slate-400 pb-0.5 update uppercase tracking-wide">
                              Etapa 4 - Auriculoterapia
                            </div>

                            {/* Section 4 items */}
                            <div className="space-y-1 bg-white p-2 border border-slate-200 text-slate-650 text-[6.5px]">
                              <div>Pontos auriculares aplicados: ______________________________________________________________________</div>
                              <div>Observações complementares: ________________________________________________________________________</div>
                              <div>Responsável pelo atendimento: _____________________________________________________________________</div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* HEADER PREVIEW DYNAMIC */}
                          {headerStyle === 'classic' ? (
                        <div className="border-b border-slate-800 text-center pb-3 mb-6">
                          <h4 className="text-sm font-black uppercase text-slate-900 tracking-wide">{formTitle || 'TÍTULO'}</h4>
                          <span className="text-[8px] text-slate-500 font-mono mt-1 block">
                            CÓDIGO: {formCode.toUpperCase() || 'FOR-00'}  •  VERSÃO: {formVersion}.0  •  DATA: {format(new Date(), 'dd/MM/yyyy')}
                          </span>
                        </div>
                      ) : headerStyle === 'minimal' ? (
                        <div className="border-b border-slate-200 pb-3 mb-5 flex justify-between items-end">
                          <div>
                            <h4 className="text-xs font-bold uppercase text-slate-900">{formTitle || 'TÍTULO'}</h4>
                            <span className="text-[7.5px] text-slate-400 font-mono italic">Layout Simplificado para Impressão Manual</span>
                          </div>
                          <span className="text-[8px] font-mono font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                            {formCode.toUpperCase() || 'FOR-00'}
                          </span>
                        </div>
                      ) : (
                        // Standard Grid box layout
                        <div className="border border-slate-400 grid grid-cols-4 select-none mb-6 text-[8px] text-slate-700 font-semibold bg-slate-50/20">
                          <div className="border-r border-slate-400 p-2 col-span-1 flex items-center justify-center min-h-[40px] bg-white">
                            {drugstore?.logoUrl ? (
                              <img src={drugstore?.logoUrl} alt="Logo" referrerPolicy="no-referrer" className="max-h-8 max-w-full object-contain" />
                            ) : (
                              <span className="text-[7px] text-slate-400 uppercase font-bold">[MARCA]</span>
                            )}
                          </div>
                          
                          <div className="border-r border-slate-400 col-span-2 text-center p-1 flex flex-col justify-center bg-white">
                            <span className="text-[6.5px] font-bold text-slate-400 tracking-widest uppercase">CONTROLE DE QUALIDADE</span>
                            <span className="text-[9px] font-black text-slate-900 uppercase leading-snug">{formTitle || 'TÍTULO DO DOCUMENTO'}</span>
                          </div>
                          
                          <div className="col-span-1 p-1 flex flex-col justify-center leading-normal text-[7.5px] font-mono bg-white">
                            <div><strong>CÓD:</strong> {formCode.toUpperCase() || 'FOR-REC'}</div>
                            <div><strong>VERSÃO:</strong> v{formVersion}.0</div>
                            <div><strong>EMISSÃO:</strong> {format(new Date(), 'dd/MM/yyyy')}</div>
                          </div>
                        </div>
                      )}

                      {/* Brief motivation card */}
                      {formDescription && (
                        <div className="bg-slate-50/50 border-l-[3px] border-indigo-500 p-2.5 rounded-r mb-5">
                          <p className="text-[8.5px] text-slate-500 font-medium leading-relaxed italic">{formDescription}</p>
                        </div>
                      )}

                      {/* ELEMENTS LAYOUT */}
                      <div className="grid grid-cols-12 gap-3.5 mt-4">
                        {formFields.map((field, index) => {
                          const isSelected = selectedFieldId === field.id;
                          const sizeClass = field.width === '25' ? 'col-span-3' : 
                                            field.width === '33' ? 'col-span-4' : 
                                            field.width === '50' ? 'col-span-6' : 'col-span-12';
                          
                          let lblSize = 'text-[9px]';
                          if (field.labelSize === 'sm') lblSize = 'text-[8px]';
                          if (field.labelSize === 'lg') lblSize = 'text-[10px]';

                          const lineList = field.options ? field.options.split(/[,;]/).map(o => o.trim()).filter(Boolean) : [];

                          return (
                            <div 
                              key={field.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFieldId(field.id);
                              }}
                              className={`relative p-2 rounded-xl transition-all select-none border cursor-pointer flex flex-col justify-between ${
                                isSelected 
                                  ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-500' 
                                  : 'border-slate-200/70 hover:border-indigo-200 hover:bg-slate-50/45'
                              } ${sizeClass}`}
                            >
                              {/* Overlay controls */}
                              <div className="absolute -top-2 right-2 flex items-center gap-0.5 bg-slate-900 text-white rounded-md p-1 shadow border border-slate-705 hidden group-hover:flex z-20">
                                <button 
                                  onClick={(e) => handleMoveField(index, 'up', e)}
                                  disabled={index === 0}
                                  className="p-0.5 hover:text-indigo-400 disabled:opacity-20"
                                >
                                  <ArrowUp size={10} />
                                </button>
                                <button 
                                  onClick={(e) => handleMoveField(index, 'down', e)}
                                  disabled={index === formFields.length - 1}
                                  className="p-0.5 hover:text-indigo-400 disabled:opacity-20"
                                >
                                  <ArrowDown size={10} />
                                </button>
                              </div>

                              {/* Label display based on setting */}
                              {field.labelPlacement !== 'none' && (
                                <div className={`flex flex-col mb-1 ${field.labelPlacement === 'left' ? 'flex-row gap-2 items-center' : ''}`}>
                                  <label className={`font-black uppercase tracking-wide text-slate-900 ${lblSize}`}>
                                    {field.label || `Campo #${index+1}`}
                                    {field.required && <span className="text-red-500 font-extrabold ml-0.5 text-[10px]">*</span>}
                                  </label>
                                  {field.helpText && (
                                    <span className="text-[7.5px] text-slate-400 font-normal italic block">{field.helpText}</span>
                                  )}
                                </div>
                              )}

                              {/* FIELD SPECIFIC PRINT SHAPES AND MASKS */}
                              <div className="mt-1 min-h-[16px]">
                                {field.type === 'signature' && (
                                  <div className="pt-5 pb-0.5">
                                    <div className="border-b border-dashed border-slate-300 w-full h-1"></div>
                                    <span className="text-[7px] text-slate-400 font-semibold block text-center mt-1">Assinatura Manual</span>
                                  </div>
                                )}

                                {field.type === 'textarea' && (
                                  <div className="space-y-1 pt-1.5">
                                    {Array.from({ length: field.dottedLinesCount || 3 }).map((_, lIdx) => (
                                      <div key={lIdx} className="border-b border-dotted border-slate-250 w-full h-1"></div>
                                    ))}
                                  </div>
                                )}

                                {field.type === 'checklist' && (
                                  <div className="space-y-1.5 pt-1">
                                    {lineList.length === 0 ? (
                                      <span className="text-[8px] text-slate-300 italic">[Sem itens definidos]</span>
                                    ) : (
                                      lineList.map((item, iIdx) => (
                                        <div key={iIdx} className="flex items-center gap-1.5 text-[8px] font-semibold text-slate-600">
                                          <div className="w-3 h-3 border border-slate-400 bg-white rounded flex items-center justify-center">[ ]</div>
                                          <span className="uppercase">{item}</span>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                )}

                                {field.type === 'select' && (
                                  <div className="flex flex-wrap gap-2 text-[8px] font-semibold text-slate-500 pt-1">
                                    {lineList.length === 0 ? (
                                      <span>[ ] Opção A   [ ] Opção B</span>
                                    ) : (
                                      lineList.map((item, iIdx) => (
                                        <div key={iIdx} className="flex items-center gap-1">
                                          <span>[ ]</span>
                                          <span className="uppercase">{item}</span>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                )}

                                {field.type === 'date' && (
                                  <div className="text-[8.5px] font-semibold text-slate-400 font-mono pt-1">
                                    ____ / ____ / ________  -  ____ : ____
                                  </div>
                                )}

                                {field.type === 'mask' && (
                                  <div className="text-[8px] font-bold text-slate-600 pt-0.5 bg-slate-50 border border-slate-100 rounded p-1.5">
                                    {field.maskType === 'temperature' && (
                                      <div className="font-mono">TEMP REFRIG.: ________._ ºC  | Ambt.: ____._ ºC</div>
                                    )}
                                    {field.maskType === 'humidity' && (
                                      <div className="font-mono">UMIDADE AMBIENTE: ____________ % UR</div>
                                    )}
                                    {field.maskType === 'blood_pressure' && (
                                      <div className="font-mono">PRESSÃO ARTERIAL: ________ x ________ mmHg</div>
                                    )}
                                    {field.maskType === 'blood_glucose' && (
                                      <div className="font-mono">GLICEMIA CAPILAR: __________ mg/dL   [ ] J  [ ] P</div>
                                    )}
                                    {field.maskType === 'stamp_carimbo' && (
                                      <div className="border border-dashed border-slate-300 rounded p-2 text-center text-[7px] text-slate-400 italic">
                                        ESPAÇO RESERVADO CARIMBO CRF / MEDICAÇÃO
                                      </div>
                                    )}
                                    {field.maskType === 'clinical_care_page1' && (
                                      <div className="border border-slate-200 rounded p-2 bg-slate-50 text-[7px] text-slate-500 font-mono">
                                        <div className="font-bold text-slate-700 mb-1">[Etapa 1 - Acolhimento Farmacêutico]</div>
                                        Anamnese geral do paciente, hábitos, sintomas, laudos e quadro detalhado de farmacoterapia de 4 linhas.
                                      </div>
                                    )}
                                    {field.maskType === 'clinical_care_page2' && (
                                      <div className="border border-slate-200 rounded p-2 bg-slate-50 text-[7px] text-slate-500 font-mono">
                                        <div className="font-bold text-slate-700 mb-1">[Etapa 2 - Rastreamento em Saúde]</div>
                                        Tabela de parâmetros e sinais vitais (PA, FC, Colesterol, Glicemia Capilar, HbA1c e Peak Flow) com critérios de gravidade.
                                      </div>
                                    )}
                                    {field.maskType === 'clinical_care_page3' && (
                                      <div className="border border-slate-200 rounded p-2 bg-slate-50 text-[7px] text-slate-500 font-mono">
                                        <div className="font-bold text-slate-700 mb-1">[Etapas 3 & 4 - Consulta & Auriculoterapia]</div>
                                        Formulário com 12 pontos de avaliação farmacoterapêutica, plano de cuidado com 13 intervenções e auriculoterapia complementar.
                                      </div>
                                    )}
                                    {field.maskType === 'patient_data' && (
                                      <div className="space-y-1 font-mono text-[7px] text-slate-500">
                                        <div>PACIENTE: ____________________________________________________</div>
                                        <div>CPF: _______________ FONE: (___) ___________________ SEXO: [ ] M [ ] F</div>
                                      </div>
                                    )}
                                    {field.maskType === 'medicine_info' && (
                                      <div className="space-y-1 font-mono text-[7px] text-slate-500">
                                        <div>MEDICAMENTO: _____________________ FABRICANTE: _______________</div>
                                        <div>LOTE: _______________ EXPIRA: __/__/____ CRM/CRF: ______________</div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {field.type === 'text' && (
                                  <div className="border-b border-slate-200 w-full h-1.5 pt-3"></div>
                                )}
                              </div>

                              {/* Footer sizing badges */}
                              <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100/50 text-[7.5px] text-slate-350">
                                <span>L.: {field.width || '100'}%</span>
                                <span className="hover:text-red-500 transition-colors uppercase font-bold" onClick={(e) => handleRemoveField(field.id, e)}>Excluir</span>
                              </div>

                            </div>
                          );
                        })}
                      </div>

                          {/* DUAL BLOCKS FOR SIGNATURES */}
                          <div className="border-t border-slate-100 pt-5 mt-8 grid grid-cols-2 gap-4 text-[7px] text-slate-450 text-center font-bold">
                            <div>
                              <div className="w-4/5 border-b border-slate-305 mx-auto h-5"></div>
                              <span className="block mt-1">Selo do Farmacêutico Supervisor (CRF)</span>
                            </div>
                            <div>
                              <div className="w-4/5 border-b border-slate-305 mx-auto h-5"></div>
                              <span className="block mt-1">Conferente / Assinatura do Diretor</span>
                            </div>
                          </div>
                        </>
                      )}

                    </div>
                  </div>

                </div>

              </div>
              
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
