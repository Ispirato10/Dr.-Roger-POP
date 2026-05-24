import React, { useState, useEffect, useRef } from 'react';
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
  Loader2,
  Layout,
  FileText,
  HelpCircle,
  UserCheck,
  Plus,
  Trash2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { saveAs } from 'file-saver';

// Helper component to render a single page of PDF on a canvas
function PdfPage({ pdfDoc, pageNumber }: { pdfDoc: any; pageNumber: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorObj, setErrorObj] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const renderPage = async () => {
      try {
        setLoading(true);
        setErrorObj(null);
        const page = await pdfDoc.getPage(pageNumber);
        
        // Render scale for crisp rendering
        const viewport = page.getViewport({ scale: 1.3 });
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
    <div className="relative w-full aspect-[1/1.414] bg-white rounded-xl overflow-hidden border border-slate-700/35 flex items-center justify-center shadow-xl">
      {loading && (
        <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center gap-2 z-10 animate-fade-in">
          <Loader2 size={24} className="text-blue-500 animate-spin" />
          <span className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-widest">Compilando Folha Clínica...</span>
        </div>
      )}
      {errorObj && (
        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-4 text-center z-10">
          <span className="text-[10px] font-mono uppercase text-rose-500 font-bold">Erro de renderização</span>
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

export default function Anamnese() {
  const { drugstore } = useAuth();
  const [success, setSuccess] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pdfjsLoaded, setPdfjsLoaded] = useState<boolean>(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'html' | 'pdf'>('pdf');
  const [editorTab, setEditorTab] = useState<'perfil' | 'anamnese' | 'cuidados' | 'farmaco' | 'adesao'>('perfil');

  // Unified form state initialized with empty/blank structures to maintain a model blank view
  const [formValues, setFormValues] = useState({
    // Page 1: Perfil do Paciente
    dataConsulta: format(new Date(), 'yyyy-MM-dd'),
    localAtendimento: 'Consultório', // Consultório ou Domicílio
    nomePaciente: '',
    dataNascimento: '',
    idade: '',
    genero: 'Feminino', // Masculino ou Feminino
    telefone: '',
    ocupacao: '',
    peso: '',
    altura: '',
    comQuemMora: '',
    limitacaoNenhuma: true,
    limitacaoLocomocao: false,
    limitacaoFala: false,
    limitacaoVisao: false,
    limitacaoAudicao: false,
    limitacaoOutras: '',
    autonomia: 'Toma medicamentos sem assistência', // 3 options
    temCuidador: 'Não', // Sim ou Não
    cuidadorNome: '',
    cuidadorParentesco: '',
    cuidadorTelefone: '',
    locaisArmazenamento: '',

    // Page 1: Anamnese (Checks & text details)
    tratamentoMedico: 'Não',
    tratamentoMedicoQual: '',
    possuiAlergia: 'Não',
    possuiAlergiaQual: '',
    diabetes: 'Não',
    diabetesControlada: 'Sim',
    diabetesObs: '',
    historicoConvulsoes: 'Não',
    historicoConvulsoesObs: '',
    doencasInfecto: 'Não',
    doencasInfectoQual: '',
    
    // Grid binary options (Page 1 checks)
    gestante: 'Não',
    amamentando: 'Não',
    portadorMarcapasso: 'Não',
    disturbioCirculatorio: 'Não',
    cancer: 'Não',
    usoDrogas: 'Não',
    alimentacao24h: 'Não',
    historicoQueloide: 'Não',
    hiperHipotensao: 'Não',
    anemia: 'Não',
    hemofilia: 'Não',
    hepatite: 'Não',
    dormiuBem: 'Não',
    algumOutroProblema: '',

    // Page 2: Cuidados Farmacêuticos
    glicemiaValor: '',
    glicemiaExecutadoPor: '',
    pressaoValor: '',
    pressaoExecutadoPor: '',
    temperaturaValor: '',
    temperaturaExecutadoPor: '',

    // Page 2: Problemas de Saúde [3 Rows]
    problemasSaude: [
      { problema: '', examesSintomas: '', estadoClinico: '' },
      { problema: '', examesSintomas: '', estadoClinico: '' },
      { problema: '', examesSintomas: '', estadoClinico: '' }
    ],

    // Page 3: Farmacoterapia Atual [5 Rows Standard]
    farmacoterapia: [
      { principio: '', posologiaPrescrita: '', origem: '', paraQue: '', manha: '', tarde: '', noite: '', tempoUso: '', comoFunciona: '' },
      { principio: '', posologiaPrescrita: '', origem: '', paraQue: '', manha: '', tarde: '', noite: '', tempoUso: '', comoFunciona: '' },
      { principio: '', posologiaPrescrita: '', origem: '', paraQue: '', manha: '', tarde: '', noite: '', tempoUso: '', comoFunciona: '' },
      { principio: '', posologiaPrescrita: '', origem: '', paraQue: '', manha: '', tarde: '', noite: '', tempoUso: '', comoFunciona: '' },
      { principio: '', posologiaPrescrita: '', origem: '', paraQue: '', manha: '', tarde: '', noite: '', tempoUso: '', comoFunciona: '' }
    ],

    // Page 4: Adesão ao Tratamento
    dificuldadeTomar: '',
    deixouDeTomarDias: '',
    esqueceuTomar: 'Não',
    tomaHoraIndicada: 'Sim',
    bemDeixaDeTomar: 'Não',
    malDeixaDeTomar: 'Não',
    medicamentoIncomoda: 'Não',
    
    // Incomodam list [3 fields]
    incomodoList: [
      { medicamento: '', muito: false, umPouco: false, muitoPouco: false, nunca: false, formaIncomoda: '' }
    ],

    // Last months symptoms
    sintomaDorCabeca: false,
    sintomaTontura: false,
    sintomaDorMuscular: false,
    sintomaCoceira: false,
    sintomaIncontinencia: false,
    sintomaFadiga: false,
    sintomaSono: false,
    sintomaSexual: false,
    sintomaHumor: false,
    sintomaGastrointestinal: false,

    // Difficulties with meds
    difAbrirEmbalagem: 'Nada difícil',
    difLerEmbalagem: 'Nada difícil',
    difLembrarTomar: 'Nada difícil',
    difConseguirMed: 'Nada difícil',
    difTomarTantos: 'Nada difícil',
    difComentario: '',

    // Terapias Alternativas [2 Rows]
    terapiasAlternativas: [
      { terapia: '', indicacao: '', frequencia: '', modoPreparo: '' },
      { terapia: '', indicacao: '', frequencia: '', modoPreparo: '' }
    ],

    // Actions pactuated
    outrasAcoes: '',
    tempoConsultaMinValue: '',
    farmaceuticoAssinatura: '',
    dataProximaConsulta: ''
  });

  // Dynamically load PDF.js CDN safely
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
      console.error("Failed to load PDF.js in Anamnesis page");
    };
    document.body.appendChild(script);
  }, []);

  // Auto-focus first input field of the current tab when editorTab changes to facilitate rapid entry
  useEffect(() => {
    const timer = setTimeout(() => {
      const form = document.getElementById('anamnese_realtime_form');
      if (form) {
        const focusable = form.querySelector('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])') as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
        if (focusable) {
          focusable.focus();
        }
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [editorTab]);

  // Handler to update deep fields
  const handleValueChange = (field: string, val: any) => {
    setFormValues(prev => ({
      ...prev,
      [field]: val
    }));
  };

  const handleNestedListChange = (listName: 'problemasSaude' | 'farmacoterapia' | 'terapiasAlternativas' | 'incomodoList', index: number, fieldName: string, val: any) => {
    setFormValues(prev => {
      const renewedList = [...prev[listName]];
      renewedList[index] = {
        ...renewedList[index],
        [fieldName]: val
      };
      return {
        ...prev,
        [listName]: renewedList
      };
    });
  };

  // Pure jsPDF design engine recreating the entire 4-page clinical document elegantly
  const buildAnamnesePDF = (values: typeof formValues) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const primaryColor = [30, 41, 59]; // Elegant deep slate
    const accentColor = [37, 99, 235];  // Clinical blue
    const lightBg = [241, 245, 249];     // Slate 100 background
    const borderColor = [203, 213, 225]; // Slate 200 borders
    const darkTextColor = [15, 23, 42]; // Slate 900 list items 

    // Reusable header drawing function
    const drawPageStructure = (pageNum: number, title: string, subtitle: string) => {
      // 10mm margins
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(0.3);
      doc.rect(10, 10, 190, 277); // External box

      // Top logo/identification bar
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.rect(12, 12, 186, 18, 'F');
      doc.rect(12, 12, 186, 18, 'S');
      doc.line(55, 12, 55, 30);
      doc.line(150, 12, 150, 30);

      // Drugstore Info / Logo Left (Width 12 to 55)
      if (drugstore?.logoUrl) {
        try {
          doc.addImage(drugstore.logoUrl, 'PNG', 14, 13, 37, 16, undefined, 'FAST');
        } catch (e) {
          // Fallback if base64 contains unsupported markers or fails
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          doc.text(drugstore.name || 'SUA FARMÁCIA CLÍNICA', 33.5, 20, { align: 'center' });
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5.5);
          doc.setTextColor(115, 115, 115);
          doc.text(`CNPJ: ${drugstore.cnpj || '___.___.___/____-__'}`, 33.5, 25, { align: 'center' });
        }
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(drugstore?.name || 'SUA FARMÁCIA CLÍNICA', 33.5, 20, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(115, 115, 115);
        doc.text(`CNPJ: ${drugstore?.cnpj || '___.___.___/____-__'}`, 33.5, 25, { align: 'center' });
      }

      // Title Middle
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.text(title, 102.5, 20, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(subtitle, 102.5, 26, { align: 'center' });

      // Page tracker Right
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`FOLHA ${pageNum} DE 4`, 170, 21, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(150, 150, 150);
      doc.text('SERVIÇOS DE FARMÁCIA CLÍNICA', 170, 26, { align: 'center' });
    };

    // Helper functions for drawing clean sections
    const drawSectionHeader = (y: number, label: string) => {
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.rect(12, y, 186, 6, 'F');
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.rect(12, y, 186, 6, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
      doc.text(label.toUpperCase(), 15, y + 4.3);
    };

    const drawLineWithLabel = (label: string, value: string, x: number, y: number, endX: number) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.3);
      doc.setTextColor(75, 85, 99);
      doc.text(label, x, y);
      
      const textWidth = doc.getTextWidth(label);
      const startLine = x + textWidth + 1.5;
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(17, 24, 39);

      // Truncate to avoid overlapping the right limit (endX)
      const valText = value || '';
      const maxTextWidth = endX - startLine - 2;
      let textToDraw = valText;
      if (maxTextWidth > 5) {
        if (doc.getTextWidth(textToDraw) > maxTextWidth) {
          while (textToDraw.length > 0 && doc.getTextWidth(textToDraw + '...') > maxTextWidth) {
            textToDraw = textToDraw.slice(0, -1);
          }
          textToDraw += '...';
        }
      }
      doc.text(textToDraw, startLine, y - 0.3);

      doc.setDrawColor(220, 225, 235);
      const finalEndX = Math.max(startLine, endX);
      doc.line(startLine, y + 0.5, finalEndX, y + 0.5);
    };

    const drawCheckbox = (label: string, checked: boolean, x: number, y: number) => {
      doc.setDrawColor(100, 116, 139);
      doc.rect(x, y - 2.2, 2.5, 2.5);
      if (checked) {
        doc.setFillColor(37, 99, 235);
        doc.rect(x + 0.5, y - 1.7, 1.5, 1.5, 'F');
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(51, 65, 85);
      doc.text(label, x + 4, y);
    };

    // ==========================================
    // PAGE 1: PERFIL DO PACIENTE & ANAMNESE
    // ==========================================
    drawPageStructure(1, 'SERVIÇO DE CLÍNICA FARMACÊUTICA', 'PERFIL DO PACIENTE & ANAMNESE COMPLETA');

    // Section 1: Perfil do Paciente
    let currentY = 35;
    drawSectionHeader(currentY, 'PERFIL DO PACIENTE');

    currentY += 12;
    drawLineWithLabel('Data da Consulta:', values.dataConsulta ? format(new Date(values.dataConsulta), 'dd/MM/yyyy') : '__/__/____', 14, currentY, 75);
    drawCheckbox('Atendimento Consultório', values.localAtendimento === 'Consultório', 85, currentY);
    drawCheckbox('Atendimento Domicílio', values.localAtendimento === 'Domicílio', 135, currentY);

    currentY += 7;
    drawLineWithLabel('Nome do Paciente:', values.nomePaciente, 14, currentY, 192);

    currentY += 7;
    drawLineWithLabel('Data Nasc.:', values.dataNascimento ? format(new Date(values.dataNascimento), 'dd/MM/yyyy') : '', 14, currentY, 55);
    drawLineWithLabel('Idade:', values.idade ? `${values.idade} anos` : '', 65, currentY, 105);
    drawCheckbox('Masc.', values.genero === 'Masculino', 125, currentY);
    drawCheckbox('Fem.', values.genero === 'Feminino', 155, currentY);

    currentY += 7;
    drawLineWithLabel('Telefone:', values.telefone, 14, currentY, 90);
    drawLineWithLabel('Ocupação:', values.ocupacao, 95, currentY, 192);

    currentY += 7;
    drawLineWithLabel('Peso (kg):', values.peso, 14, currentY, 55);
    drawLineWithLabel('Altura (m):', values.altura, 65, currentY, 110);
    drawLineWithLabel('Mora com quem?:', values.comQuemMora, 115, currentY, 192);

    // Limitations block
    currentY += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.3);
    doc.setTextColor(75, 85, 99);
    doc.text('Limitações:', 14, currentY);
    drawCheckbox('Nenhuma', values.limitacaoNenhuma, 35, currentY);
    drawCheckbox('Locomoção', values.limitacaoLocomocao, 60, currentY);
    drawCheckbox('Fala', values.limitacaoFala, 88, currentY);
    drawCheckbox('Visão', values.limitacaoVisao, 110, currentY);
    drawCheckbox('Audição', values.limitacaoAudicao, 130, currentY);
    drawLineWithLabel('Outras:', values.limitacaoOutras, 150, currentY, 192);

    // Autonomy & Cuidador
    currentY += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.3);
    doc.setTextColor(75, 85, 99);
    doc.text('Autonomia na gestão de Meds:', 14, currentY);
    
    currentY += 5;
    drawCheckbox('Toma medicamentos sem assistência', values.autonomia === 'Toma medicamentos sem assistência', 14, currentY);
    drawCheckbox('Necessita de lembretes ou ajuda', values.autonomia === 'Necessita de lembretes ou de assistência', 85, currentY);
    drawCheckbox('Incapaz de tomar sozinho', values.autonomia === 'Incapaz de tomar sozinho', 145, currentY);

    currentY += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.3);
    doc.setTextColor(75, 85, 99);
    doc.text('Possui Cuidador?', 14, currentY);
    drawCheckbox('Não', values.temCuidador === 'Não', 45, currentY);
    drawCheckbox('Sim', values.temCuidador === 'Sim', 60, currentY);
    drawLineWithLabel('Nome do Cuidador:', values.cuidadorNome, 80, currentY, 192);

    currentY += 7;
    drawLineWithLabel('Parentesco:', values.cuidadorParentesco, 14, currentY, 95);
    drawLineWithLabel('Telefone do Cuidador:', values.cuidadorTelefone, 100, currentY, 192);

    currentY += 7;
    drawLineWithLabel('Locais de Armazenamento dos medicamentos em casa:', values.locaisArmazenamento, 14, currentY, 192);

    // Section 2: Anamnese
    currentY += 10;
    drawSectionHeader(currentY, 'QUESTIONÁRIO DE ANAMNESE FARMACÊUTICA');

    // Details questions
    currentY += 10;
    drawLineWithLabel('Está em algum tratamento médico?', values.tratamentoMedico, 14, currentY, 70);
    drawLineWithLabel('Qual?', values.tratamentoMedicoQual, 75, currentY, 192);

    currentY += 7;
    drawLineWithLabel('Possui alguma Alergia?', values.possuiAlergia, 14, currentY, 65);
    drawLineWithLabel('Qual?', values.possuiAlergiaQual, 70, currentY, 192);

    currentY += 7;
    drawLineWithLabel('Diabetes?', values.diabetes, 14, currentY, 40);
    drawLineWithLabel('Controlada?', values.diabetesControlada, 45, currentY, 75);
    drawLineWithLabel('Observações Saúde:', values.diabetesObs, 80, currentY, 192);

    currentY += 7;
    drawLineWithLabel('Histórico de Convulsões?', values.historicoConvulsoes, 14, currentY, 60);
    drawLineWithLabel('Obs. convulsões:', values.historicoConvulsoesObs, 65, currentY, 192);

    currentY += 7;
    drawLineWithLabel('Doenças infectocontagiosas?', values.doencasInfecto, 14, currentY, 65);
    drawLineWithLabel('Qual?', values.doencasInfectoQual, 70, currentY, 192);

    // Two parallel columns of binary options
    const binaryListPage1 = [
      { label: 'Gestante?', value: values.gestante === 'Sim' },
      { label: 'Histórico de Quelóide?', value: values.historicoQueloide === 'Sim' },
      { label: 'Amamentando?', value: values.amamentando === 'Sim' },
      { label: 'Hipertensão ou Hipotensão?', value: values.hiperHipotensao === 'Sim' },
      { label: 'Portador de Marcapasso?', value: values.portadorMarcapasso === 'Sim' },
      { label: 'Anemia?', value: values.anemia === 'Sim' },
      { label: 'Distúrbio Circulatório?', value: values.disturbioCirculatorio === 'Sim' },
      { label: 'Hemofilia?', value: values.hemofilia === 'Sim' },
      { label: 'Câncer?', value: values.cancer === 'Sim' },
      { label: 'Hepatite?', value: values.hepatite === 'Sim' },
      { label: 'Fez/Faz uso de Drogas?', value: values.usoDrogas === 'Sim' },
      { label: 'Dormiu bem na última noite?', value: values.dormiuBem === 'Sim' },
      { label: 'Alimentou-se nas últimas 24h?', value: values.alimentacao24h === 'Sim' }
    ];

    currentY += 5;
    for (let i = 0; i < binaryListPage1.length; i += 2) {
      currentY += 5.5;
      const item1 = binaryListPage1[i];
      const item2 = binaryListPage1[i+1];
      
      if (item1) {
        drawCheckbox(item1.label, item1.value, 15, currentY);
      }
      if (item2) {
        drawCheckbox(item2.label, item2.value, 105, currentY);
      }
    }

    currentY += 7.5;
    drawLineWithLabel('Algum outro Problema de Saúde?', values.algumOutroProblema, 14, currentY, 192);

    // Terms & signature at page 1 footer
    currentY += 12;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    doc.text('Declaro que as informações acima são verdadeiras, não cabendo ao profissional quaisquer responsabilidades por informações omitidas.', 14, currentY);
    
    currentY += 9;
    drawLineWithLabel('Data da entrega:', values.dataConsulta ? format(new Date(values.dataConsulta), 'dd/MM/yyyy') : '', 14, currentY, 72);
    drawLineWithLabel('Assinatura do Paciente:', '', 75, currentY, 192);


    // ==========================================
    // PAGE 2: CUIDADOS FARMACÊUTICOS & QUEIXAS
    // ==========================================
    doc.addPage();
    drawPageStructure(2, 'CUIDADOS FARMACÊUTICOS', 'MONITORAMENTO & PROBLEMAS DE SAÚDE');

    currentY = 35;
    drawSectionHeader(currentY, 'RITMO DE CUIDADOS FARMACÊUTICOS (SINAIS VITAIS)');

    // 3 blocks for Glicemia, Pressao and Temperatura
    const blocks = [
      { title: 'GLICEMIA CAPILAR', normal: 'Valor normal: 80 a 100 mg/dL', val: values.glicemiaValor, unit: 'mg/dL', exec: values.glicemiaExecutadoPor },
      { title: 'PRESSÃO ARTERIAL', normal: 'Valor normal: Até 130/85 mmHg', val: values.pressaoValor, unit: 'mmHg', exec: values.pressaoExecutadoPor },
      { title: 'TEMPERATURA CORPORAL', normal: 'Valor normal: ~36,8 °C', val: values.temperaturaValor, unit: '°C', exec: values.temperaturaExecutadoPor }
    ];

    blocks.forEach((b, idx) => {
      currentY += 8;
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.rect(12, currentY, 186, 15, 'F');
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.rect(12, currentY, 186, 15, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.text(b.title, 15, currentY + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(115, 115, 115);
      doc.text(b.normal, 15, currentY + 11);

      drawLineWithLabel('VALOR:', b.val ? `${b.val} ${b.unit}` : '', 80, currentY + 6.5, 130);
      drawLineWithLabel('EXECUTADO POR:', b.exec, 80, currentY + 12, 188);
      currentY += 9;
    });

    currentY += 12;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.3);
    doc.setTextColor(115, 115, 115);
    doc.text('* NOTA: Estes procedimentos não possuem finalidade de diagnóstico e não substituem exames laboratoriais.', 12, currentY);

    currentY += 8;
    drawSectionHeader(currentY, 'PROBLEMAS DE SAÚDE / QUEIXAS');

    // Table drawing for Problemas de Saúde [Header]
    currentY += 8;
    doc.setFillColor(248, 250, 252);
    doc.rect(12, currentY, 186, 9, 'F');
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(12, currentY, 186, 9, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Problemas de saúde do paciente', 14, currentY + 5.5);
    doc.text('Registros de exames, sinais e sintomas relativos (HDA)', 65, currentY + 5.5);
    doc.text('Estado Clínico Atual *', 158, currentY + 5.5);

    // Rows [3 rows]
    for (let r = 0; r < 3; r++) {
      currentY += 9;
      const rowVal = values.problemasSaude[r] || { problema: '', examesSintomas: '', estadoClinico: '' };
      
      doc.setFillColor(255, 255, 255);
      doc.rect(12, currentY, 186, 16, 'F');
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.rect(12, currentY, 186, 16, 'S');

      // vertical lines splits
      doc.line(62, currentY, 62, currentY + 16);
      doc.line(155, currentY, 155, currentY + 16);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);
      
      // MultiLine printing inside columns
      doc.text(doc.splitTextToSize(rowVal.problema || '__________________________________', 45), 14, currentY + 5);
      doc.text(doc.splitTextToSize(rowVal.examesSintomas || '____________________________________________________________________', 88), 64, currentY + 5);
      doc.text(doc.splitTextToSize(rowVal.estadoClinico || '__________', 38), 157, currentY + 5);
      
      currentY += 7;
    }

    currentY += 16;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('* Legenda Estado Clínico: Curado (CUR) / Controlado (CON) / Melhora Parcial (MPA) / Piora Parcial (PPA) / Não Controlado (NCO) / Diagnóstico (SAD)', 12, currentY);


    // ==========================================
    // PAGE 3: FARMACOTERAPIA ATUAL
    // ==========================================
    doc.addPage();
    drawPageStructure(3, 'FARMACOTERAPIA ATUAL', 'RELAÇÃO COMPLETA DE MEDICAMENTOS');

    currentY = 35;
    drawSectionHeader(currentY, 'PRINCIPAIS ATIVOS & POSOLOGIAS EM USO');

    // Header grid for FARMACOTERAPIA ATUAL
    currentY += 8;
    doc.setFillColor(239, 246, 255); // Rich medical light blue header
    doc.rect(12, currentY, 186, 8, 'F');
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.rect(12, currentY, 186, 8, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    
    // Aligned headers
    doc.text('Nº / Princípio Ativo', 14, currentY + 5.5);
    doc.text('Psolo. Prescrita', 72, currentY + 5.5, { align: 'center' });
    doc.text('Origem Rec.', 96, currentY + 5.5, { align: 'center' });
    doc.text('Indicação / Para Que', 121.5, currentY + 5.5, { align: 'center' });
    doc.text('M.', 143, currentY + 5.5, { align: 'center' });
    doc.text('T.', 153, currentY + 5.5, { align: 'center' });
    doc.text('N.', 163, currentY + 5.5, { align: 'center' });
    doc.text('Tempo', 175.5, currentY + 5.5, { align: 'center' });
    doc.text('Opinião *', 190.5, currentY + 5.5, { align: 'center' });

    // 5 Rows in a streamlined compact grid format
    for (let m = 0; m < 5; m++) {
      currentY += 8;
      const rM = values.farmacoterapia[m] || { principio: '', posologiaPrescrita: '', origem: '', paraQue: '', manha: '', tarde: '', noite: '', tempoUso: '', comoFunciona: '' };
      
      doc.setFillColor(255, 255, 255);
      doc.rect(12, currentY, 186, 18, 'F');
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.rect(12, currentY, 186, 18, 'S');

      // Col divisions conforming perfectly to the new layout
      doc.line(57, currentY, 57, currentY + 18);
      doc.line(87, currentY, 87, currentY + 18);
      doc.line(105, currentY, 105, currentY + 18);
      doc.line(138, currentY, 138, currentY + 18);
      doc.line(148, currentY, 148, currentY + 18);
      doc.line(158, currentY, 158, currentY + 18);
      doc.line(168, currentY, 168, currentY + 18);
      doc.line(183, currentY, 183, currentY + 18);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.4);
      doc.setTextColor(30, 41, 59);

      // Print clean cells using wrapped Text to avoid any spillover
      doc.text(doc.splitTextToSize(`${m + 1}. ${rM.principio || ''}`, 41), 14, currentY + 5);
      doc.text(doc.splitTextToSize(rM.posologiaPrescrita || '', 27), 58.5, currentY + 5);
      doc.text(doc.splitTextToSize(rM.origem || '', 16), 88.5, currentY + 5);
      doc.text(doc.splitTextToSize(rM.paraQue || '', 31), 106.5, currentY + 5);

      // Posologia utilizada checklist box - balanced inside 10mm columns
      drawCheckbox('AR', rM.manha === 'AR', 139, currentY + 4);
      drawCheckbox('DR', rM.manha === 'DR', 139, currentY + 10);
      drawCheckbox('AR', rM.tarde === 'AR', 149, currentY + 4);
      drawCheckbox('DR', rM.tarde === 'DR', 149, currentY + 10);
      drawCheckbox('AR', rM.noite === 'AR', 159, currentY + 4);
      drawCheckbox('DR', rM.noite === 'DR', 159, currentY + 10);

      doc.text(doc.splitTextToSize(rM.tempoUso || '', 13), 169.5, currentY + 5);
      doc.text(doc.splitTextToSize(rM.comoFunciona || '', 13), 184.5, currentY + 5);

      currentY += 10;
    }

    currentY += 18;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('* Legenda Posologia: AR: Antes das refeições | DR: Depois das Refeições', 12, currentY);
    currentY += 3.5;
    doc.text('* Como esse medicamento funciona: 1=Funciona Bem | 2=Regular | 3=Não Funciona Bem | 9=Não Sei', 12, currentY);


    // ==========================================
    // PAGE 4: ADESÃO AO TRATAMENTO / OUTROS
    // ==========================================
    doc.addPage();
    drawPageStructure(4, 'ADESÃO & INTERVENÇÃO', 'ADESÃO DO PACIENTE E TERAPIAS ALTERNATIVAS');

    currentY = 32;
    drawSectionHeader(currentY, 'AVALIAÇÃO DE ADESÃO AO TRATAMENTO');

    // Questions about adhesion
    currentY += 8;
    drawLineWithLabel('Encontra dificuldades adicionais para tomar seus comprimidos?', values.dificuldadeTomar, 14, currentY, 192);
    
    currentY += 6;
    drawLineWithLabel('Quantas vezes nos últimos 7 dias deixou de tomar medicações?', values.deixouDeTomarDias, 14, currentY, 192);

    currentY += 6.5;
    drawCheckbox('Já esqueceu de tomar medicamentos?', values.esqueceuTomar === 'Sim', 14, currentY);
    drawCheckbox('Toma sempre na hora indicada?', values.tomaHoraIndicada === 'Sim', 105, currentY);

    currentY += 5.5;
    drawCheckbox('Quando se encontra bem, deixa de tomar?', values.bemDeixaDeTomar === 'Sim', 14, currentY);
    drawCheckbox('Quando se sente mal com o remédio, interrompe?', values.malDeixaDeTomar === 'Sim', 105, currentY);

    currentY += 7;
    drawLineWithLabel('Algum medicamento te incomoda de alguma forma?', values.medicamentoIncomoda, 14, currentY, 192);

    // Grid for uncomfortable meds (Limit to 1 major row dynamically)
    currentY += 4;
    doc.setFillColor(248, 250, 252);
    doc.rect(12, currentY, 186, 6, 'F');
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.rect(12, currentY, 186, 6, 'S');

    // Column dividers for header
    doc.line(70, currentY, 70, currentY + 6);
    doc.line(132, currentY, 132, currentY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text('Medicamento Incômodo', 14, currentY + 4);
    doc.text('Grau de incômodo', 72, currentY + 4);
    doc.text('Forma / Como incomoda?', 134, currentY + 4);

    currentY += 6;
    const rInc = values.incomodoList[0] || { medicamento: '', muito: false, umPouco: false, muitoPouco: false, nunca: false, formaIncomoda: '' };
    doc.setFillColor(255, 255, 255);
    doc.rect(12, currentY, 186, 8, 'F');
    doc.rect(12, currentY, 186, 8, 'S');
    
    // Column dividers for data row
    doc.line(70, currentY, 70, currentY + 8);
    doc.line(132, currentY, 132, currentY + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.text(doc.splitTextToSize(rInc.medicamento || '', 54), 14, currentY + 5);
    
    // Checked boxes cleanly adjusted inside the column
    drawCheckbox('Muito', rInc.muito, 72, currentY + 5.2);
    drawCheckbox('Médio', rInc.umPouco, 86, currentY + 5.2);
    drawCheckbox('Pouco', rInc.muitoPouco, 100, currentY + 5.2);
    drawCheckbox('Nunca', rInc.nunca, 114, currentY + 5.2);

    doc.text(doc.splitTextToSize(rInc.formaIncomoda || '', 60), 134, currentY + 5);

    // Section header: Recent symptoms
    currentY += 12;
    drawSectionHeader(currentY, 'SINTOMAS RECENTES SENTIDOS NOS ÚLTIMOS MESES');

    // Matrix of symptoms box
    currentY += 5;
    const symps = [
      { label: 'Dor de cabeça', val: values.sintomaDorCabeca },
      { label: 'Tontura', val: values.sintomaTontura },
      { label: 'Dor muscular', val: values.sintomaDorMuscular },
      { label: 'Coceira/Urticária', val: values.sintomaCoceira },
      { label: 'Problema urinário', val: values.sintomaIncontinencia },
      { label: 'Fadiga/Cansaço', val: values.sintomaFadiga },
      { label: 'Problemas de sono', val: values.sintomaSono },
      { label: 'Diminuição sexual', val: values.sintomaSexual },
      { label: 'Alteração humor', val: values.sintomaHumor },
      { label: 'Gastrointestinal', val: values.sintomaGastrointestinal }
    ];

    for (let s = 0; s < symps.length; s += 3) {
      currentY += 5;
      const s1 = symps[s];
      const s2 = symps[s+1];
      const s3 = symps[s+2];
      if (s1) drawCheckbox(s1.label, s1.val, 15, currentY);
      if (s2) drawCheckbox(s2.label, s2.val, 75, currentY);
      if (s3) drawCheckbox(s3.label, s3.val, 135, currentY);
    }

    // Section Header: Terapias Alternativas
    currentY += 9;
    drawSectionHeader(currentY, 'TERAPIAS ALTERNATIVAS OU COMPLEMENTARES');

    currentY += 8;
    doc.setFillColor(248, 250, 252);
    doc.rect(12, currentY, 186, 6, 'F');
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.rect(12, currentY, 186, 6, 'S');

    // Column dividers for header
    doc.line(52, currentY, 52, currentY + 6);
    doc.line(102, currentY, 102, currentY + 6);
    doc.line(142, currentY, 142, currentY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text('Terapia Alternativa', 14, currentY + 4);
    doc.text('Indicação / Para Que', 54, currentY + 4);
    doc.text('Freq. Utilização', 104, currentY + 4);
    doc.text('Modo de Preparo / Utilização', 144, currentY + 4);

    // Rows [2 alternative rows]
    for (let ta = 0; ta < 2; ta++) {
      currentY += 6;
      const rTa = values.terapiasAlternativas[ta] || { terapia: '', indicacao: '', frequencia: '', modoPreparo: '' };
      doc.setFillColor(255, 255, 255);
      doc.rect(12, currentY, 186, 8, 'F');
      doc.rect(12, currentY, 186, 8, 'S');

      // Column dividers for data rows
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.line(52, currentY, 52, currentY + 8);
      doc.line(102, currentY, 102, currentY + 8);
      doc.line(142, currentY, 142, currentY + 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.4);
      doc.text(doc.splitTextToSize(rTa.terapia || '', 36), 14, currentY + 5);
      doc.text(doc.splitTextToSize(rTa.indicacao || '', 46), 54, currentY + 5);
      doc.text(doc.splitTextToSize(rTa.frequencia || '', 36), 104, currentY + 5);
      doc.text(doc.splitTextToSize(rTa.modoPreparo || '', 51), 144, currentY + 5);
    }

    // Outras ações / Pactuadas
    currentY += 12;
    drawSectionHeader(currentY, 'PACTUAÇÃO DE OUTRAS AÇÕES & AGENDAMENTOS');

    currentY += 10;
    drawLineWithLabel('Outras Ações Pactuadas com o Paciente:', values.outrasAcoes, 14, currentY, 192);

    currentY += 8;
    drawLineWithLabel('Tempo da consulta (min):', values.tempoConsultaMinValue, 14, currentY, 60);
    drawLineWithLabel('Farmacêutico Clin.:', values.farmaceuticoAssinatura || drugstore?.responsibleName || '', 70, currentY, 130);
    drawLineWithLabel('Próxima Consulta:', values.dataProximaConsulta ? format(new Date(values.dataProximaConsulta), 'dd/MM/yyyy') : '', 132, currentY, 192);

    // Final signature lines
    currentY += 13;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setDrawColor(180, 180, 180);
    doc.line(15, currentY + 5, 90, currentY + 5);
    doc.line(110, currentY + 5, 185, currentY + 5);
    doc.text('Assinatura e Carimbo do Farmacêutico', 52.5, currentY + 9, { align: 'center' });
    doc.text('Visto de Declaração do Paciente', 147.5, currentY + 9, { align: 'center' });

    return doc;
  };

  // Real-time reactive PDF compiler directly refreshing preview
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setIsCompiling(true);
        const docPdf = buildAnamnesePDF(formValues);
        
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
            console.error("PDF.js Live Rendering Error:", pdfErr);
          }
        }
        setIsCompiling(false);
      } catch (err) {
        console.error("Error drawing reactive clinical pdf preview:", err);
        setIsCompiling(false);
      }
    }, 550);

    return () => {
      clearTimeout(timer);
    };
  }, [formValues, pdfjsLoaded]);

  // Handle Form Submission
  const onSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  // Immediate full download function
  const handleDownloadPDF = () => {
    setGenerating(true);
    try {
      const doc = buildAnamnesePDF(formValues);
      const filename = `Anamnese_${formValues.nomePaciente.trim().replace(/\s+/g, '_') || 'Em_Branco'}_${format(new Date(), 'yyyyMMdd')}.pdf`;
      saveAs(doc.output('blob'), filename);
    } catch (err) {
      console.error(err);
      alert("Erro ao baixar PDF");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-8 px-1 pb-20">
      
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl shadow-xl shadow-blue-500/20 flex items-center justify-center border border-white/20">
              <Stethoscope size={30} className="drop-shadow-md" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-full shadow-md border border-slate-50">
              <Activity size={12} className="text-blue-600" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Anamnese Farmacêutica
              <span className="text-[10px] bg-blue-50 text-blue-600 font-extrabold px-2.5 py-1 rounded-full uppercase tracking-widest border border-blue-100">CFF INTEGRAL</span>
            </h1>
            <p className="text-sm text-slate-400 font-bold tracking-tight uppercase mt-0.5">Editor Oficial do Serviço de Clínica Farmacêutica do Paciente</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={handleDownloadPDF}
            disabled={generating}
            className="btn-secondary flex items-center gap-2"
          >
            {generating ? <Loader2 className="animate-spin" size={16} /> : <FileDown size={16} />}
            <span className="uppercase tracking-widest text-[10px] font-black">Exportar Oficial (A4 PDF)</span>
          </button>
          <button 
            type="submit"
            form="anamnese_realtime_form"
            className="btn-primary flex items-center gap-2"
          >
            <Save size={16} />
            <span className="uppercase tracking-widest text-[10px] font-black">Salvar Prontuário</span>
          </button>
        </div>
      </div>

      {/* Primary Workspace split: Form left & PDF live preview right */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* Editor Form Columns (Tabs inside card) */}
        <div className="xl:col-span-6 space-y-6">
          <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200/65 overflow-hidden flex flex-col">
            
            {/* Nav Tabs for split modules */}
            <div className="bg-slate-55 flex flex-wrap border-b border-slate-100 p-2 gap-1">
              {[
                { id: 'perfil', label: '1. Perfil Cadastral', icon: User },
                { id: 'anamnese', label: '2. Histórico Médico', icon: HelpCircle },
                { id: 'cuidados', label: '3. Parâmetros & Queixas', icon: HeartPulse },
                { id: 'farmaco', label: '4. Farmacoterapia', icon: Pill },
                { id: 'adesao', label: '5. Adesão & Ações', icon: UserCheck }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setEditorTab(tab.id as any)}
                  className={`flex-1 min-w-[130px] p-2.5 rounded-xl text-left text-[10.5px] font-black uppercase tracking-wider transition-all flex items-center gap-2 border ${
                    editorTab === tab.id
                      ? 'bg-blue-600 text-white shadow-md border-blue-700 font-extrabold'
                      : 'text-slate-500 hover:text-slate-950 border-transparent hover:bg-slate-50 font-semibold'
                  }`}
                >
                  <tab.icon size={13} />
                  {tab.label}
                </button>
              ))}
            </div>

            <form id="anamnese_realtime_form" onSubmit={onSubmitForm} className="p-6 md:p-8 space-y-8">
              
              {/* TAB 1: PERFIL */}
              {editorTab === 'perfil' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <User className="text-blue-600" size={18} />
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Identificação do Paciente</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Data Consulta</label>
                      <input 
                        type="date" 
                        value={formValues.dataConsulta} 
                        onChange={(e) => handleValueChange('dataConsulta', e.target.value)}
                        className="input-field bg-slate-50 border-slate-200" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Local Atendimento</label>
                      <select 
                        value={formValues.localAtendimento} 
                        onChange={(e) => handleValueChange('localAtendimento', e.target.value)}
                        className="input-field bg-slate-50 border-slate-200"
                      >
                        <option value="Consultório">Consultório</option>
                        <option value="Domicílio">Domicílio</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nome do Paciente</label>
                    <input 
                      type="text"
                      value={formValues.nomePaciente}
                      onChange={(e) => handleValueChange('nomePaciente', e.target.value)}
                      placeholder="Digite o nome completo do paciente..." 
                      className="input-field bg-slate-50 border-slate-200" 
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nascimento</label>
                      <input 
                        type="date"
                        value={formValues.dataNascimento}
                        onChange={(e) => handleValueChange('dataNascimento', e.target.value)}
                        className="input-field bg-slate-50 border-slate-200" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Idade</label>
                      <input 
                        type="text"
                        value={formValues.idade}
                        onChange={(e) => handleValueChange('idade', e.target.value)}
                        placeholder="Ex: 45" 
                        className="input-field bg-slate-50 border-slate-200" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Gênero</label>
                      <select 
                        value={formValues.genero} 
                        onChange={(e) => handleValueChange('genero', e.target.value)}
                        className="input-field bg-slate-50 border-slate-200"
                      >
                        <option value="Masculino">Masculino</option>
                        <option value="Feminino">Feminino</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Telefone</label>
                      <input 
                        type="text"
                        value={formValues.telefone}
                        onChange={(e) => handleValueChange('telefone', e.target.value)}
                        placeholder="(00) 00000-0000" 
                        className="input-field bg-slate-50 border-slate-200" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Ocupação</label>
                      <input 
                        type="text"
                        value={formValues.ocupacao}
                        onChange={(e) => handleValueChange('ocupacao', e.target.value)}
                        placeholder="Emprego, aposentado, estudante..." 
                        className="input-field bg-slate-50 border-slate-200" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Peso (kg)</label>
                      <input 
                        type="text"
                        value={formValues.peso}
                        onChange={(e) => handleValueChange('peso', e.target.value)}
                        placeholder="78.5" 
                        className="input-field bg-slate-50 border-slate-200" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Altura (m)</label>
                      <input 
                        type="text"
                        value={formValues.altura}
                        onChange={(e) => handleValueChange('altura', e.target.value)}
                        placeholder="1.72" 
                        className="input-field bg-slate-50 border-slate-200" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Com quem mora?</label>
                      <input 
                        type="text"
                        value={formValues.comQuemMora}
                        onChange={(e) => handleValueChange('comQuemMora', e.target.value)}
                        placeholder="Família, sozinho..." 
                        className="input-field bg-slate-50 border-slate-200" 
                      />
                    </div>
                  </div>

                  {/* Limitacoes checklist board */}
                  <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Limitações</span>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <input 
                          type="checkbox" 
                          checked={formValues.limitacaoNenhuma} 
                          onChange={(e) => handleValueChange('limitacaoNenhuma', e.target.checked)} 
                        />
                        Nenhuma
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <input 
                          type="checkbox" 
                          checked={formValues.limitacaoLocomocao} 
                          onChange={(e) => handleValueChange('limitacaoLocomocao', e.target.checked)} 
                        />
                        Locomoção
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <input 
                          type="checkbox" 
                          checked={formValues.limitacaoFala} 
                          onChange={(e) => handleValueChange('limitacaoFala', e.target.checked)} 
                        />
                        Fala
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <input 
                          type="checkbox" 
                          checked={formValues.limitacaoVisao} 
                          onChange={(e) => handleValueChange('limitacaoVisao', e.target.checked)} 
                        />
                        Visão
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <input 
                          type="checkbox" 
                          checked={formValues.limitacaoAudicao} 
                          onChange={(e) => handleValueChange('limitacaoAudicao', e.target.checked)} 
                        />
                        Audição
                      </label>
                    </div>
                    <div className="pt-2">
                      <input 
                        type="text"
                        value={formValues.limitacaoOutras}
                        onChange={(e) => handleValueChange('limitacaoOutras', e.target.value)}
                        placeholder="Outras limitações não citadas..." 
                        className="input-field bg-white border-slate-200" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Autonomia</label>
                    <select 
                      value={formValues.autonomia} 
                      onChange={(e) => handleValueChange('autonomia', e.target.value)}
                      className="input-field bg-slate-50 border-slate-200"
                    >
                      <option value="Toma medicamentos sem assistência">Toma medicamentos sem assistência</option>
                      <option value="Necessita de lembretes ou de assistência">Necessita de lembretes ou de assistência</option>
                      <option value="Incapaz de tomar sozinho">Incapaz de tomar sozinho</option>
                    </select>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tem Cuidador?</span>
                      <select 
                        value={formValues.temCuidador}
                        onChange={(e) => handleValueChange('temCuidador', e.target.value)}
                        className="bg-white border rounded p-1 text-xs font-extrabold text-blue-600"
                      >
                        <option value="Não">Não</option>
                        <option value="Sim">Sim</option>
                      </select>
                    </div>

                    {formValues.temCuidador === 'Sim' && (
                      <div className="space-y-3 animate-fade-in pt-1">
                        <input 
                          type="text"
                          value={formValues.cuidadorNome}
                          onChange={(e) => handleValueChange('cuidadorNome', e.target.value)}
                          placeholder="Nome do Cuidador..." 
                          className="input-field bg-white border-slate-200" 
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <input 
                            type="text"
                            value={formValues.cuidadorParentesco}
                            onChange={(e) => handleValueChange('cuidadorParentesco', e.target.value)}
                            placeholder="Grau parentesco..." 
                            className="input-field bg-white border-slate-200" 
                          />
                          <input 
                            type="text"
                            value={formValues.cuidadorTelefone}
                            onChange={(e) => handleValueChange('cuidadorTelefone', e.target.value)}
                            placeholder="Telefone cuidador..." 
                            className="input-field bg-white border-slate-200" 
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Locais de Armazenamento</label>
                    <input 
                      type="text"
                      value={formValues.locaisArmazenamento}
                      onChange={(e) => handleValueChange('locaisArmazenamento', e.target.value)}
                      placeholder="Ex: Armário cozinha, geladeira, cabeceira..." 
                      className="input-field bg-slate-50 border-slate-200" 
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: ANAMNESE MEDICAL HIST */}
              {editorTab === 'anamnese' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <HelpCircle className="text-blue-600" size={18} />
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Anamnese / Questionário</h3>
                  </div>

                  {/* Toggle inputs inside detail borders */}
                  <div className="space-y-4">
                    <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">Está em algum tratamento médico?</span>
                        <select 
                          value={formValues.tratamentoMedico}
                          onChange={(e) => handleValueChange('tratamentoMedico', e.target.value)}
                          className="border border-slate-200 bg-white p-1 rounded font-bold text-xs"
                        >
                          <option value="Não">Não</option>
                          <option value="Sim">Sim</option>
                        </select>
                      </div>
                      {formValues.tratamentoMedico === 'Sim' && (
                        <input 
                          type="text" 
                          value={formValues.tratamentoMedicoQual} 
                          onChange={(e) => handleValueChange('tratamentoMedicoQual', e.target.value)} 
                          placeholder="Qual tratamento?" 
                          className="input-field bg-white border-slate-200 mt-1" 
                        />
                      )}
                    </div>

                    <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">Possui alguma Alergia?</span>
                        <select 
                          value={formValues.possuiAlergia}
                          onChange={(e) => handleValueChange('possuiAlergia', e.target.value)}
                          className="border border-slate-200 bg-white p-1 rounded font-bold text-xs"
                        >
                          <option value="Não">Não</option>
                          <option value="Sim">Sim</option>
                        </select>
                      </div>
                      {formValues.possuiAlergia === 'Sim' && (
                        <input 
                          type="text" 
                          value={formValues.possuiAlergiaQual} 
                          onChange={(e) => handleValueChange('possuiAlergiaQual', e.target.value)} 
                          placeholder="Quais alergias?" 
                          className="input-field bg-white border-slate-200 mt-1" 
                        />
                      )}
                    </div>

                    <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">Diabetes?</span>
                        <select 
                          value={formValues.diabetes}
                          onChange={(e) => handleValueChange('diabetes', e.target.value)}
                          className="border border-slate-200 bg-white p-1 rounded font-bold text-xs"
                        >
                          <option value="Não">Não</option>
                          <option value="Sim">Sim</option>
                        </select>
                      </div>
                      {formValues.diabetes === 'Sim' && (
                        <div className="space-y-2 mt-2">
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                            <input 
                              type="checkbox" 
                              checked={formValues.diabetesControlada === 'Sim'} 
                              onChange={(e) => handleValueChange('diabetesControlada', e.target.checked ? 'Sim' : 'Não')} 
                            />
                            Diabetes Controlada?
                          </label>
                          <input 
                            type="text" 
                            value={formValues.diabetesObs} 
                            onChange={(e) => handleValueChange('diabetesObs', e.target.value)} 
                            placeholder="Observações diabetes..." 
                            className="input-field bg-white border-slate-200 mt-1" 
                          />
                        </div>
                      )}
                    </div>

                    <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">Histórico de Convulsões?</span>
                        <select 
                          value={formValues.historicoConvulsoes}
                          onChange={(e) => handleValueChange('historicoConvulsoes', e.target.value)}
                          className="border border-slate-200 bg-white p-1 rounded font-bold text-xs"
                        >
                          <option value="Não">Não</option>
                          <option value="Sim">Sim</option>
                        </select>
                      </div>
                      {formValues.historicoConvulsoes === 'Sim' && (
                        <input 
                          type="text" 
                          value={formValues.historicoConvulsoesObs} 
                          onChange={(e) => handleValueChange('historicoConvulsoesObs', e.target.value)} 
                          placeholder="Observações de convulsões..." 
                          className="input-field bg-white border-slate-200 mt-1" 
                        />
                      )}
                    </div>

                    <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">Doenças infectocontagiosas?</span>
                        <select 
                          value={formValues.doencasInfecto}
                          onChange={(e) => handleValueChange('doencasInfecto', e.target.value)}
                          className="border border-slate-200 bg-white p-1 rounded font-bold text-xs"
                        >
                          <option value="Não">Não</option>
                          <option value="Sim">Sim</option>
                        </select>
                      </div>
                      {formValues.doencasInfecto === 'Sim' && (
                        <input 
                          type="text" 
                          value={formValues.doencasInfectoQual} 
                          onChange={(e) => handleValueChange('doencasInfectoQual', e.target.value)} 
                          placeholder="Qual doença infectocontagiosa?" 
                          className="input-field bg-white border-slate-200 mt-1" 
                        />
                      )}
                    </div>
                  </div>

                  {/* Grid of basic check selectors */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Outros fatores clínicos</span>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { id: 'gestante', label: 'Gestante' },
                        { id: 'amamentando', label: 'Amamentando' },
                        { id: 'portadorMarcapasso', label: 'Marcapasso' },
                        { id: 'disturbioCirculatorio', label: 'Distúrbio Circulatório' },
                        { id: 'cancer', label: 'Câncer' },
                        { id: 'usoDrogas', label: 'Faz uso de Drogas' },
                        { id: 'alimentacao24h', label: 'Alimentou-se nas últimas 24h' },
                        { id: 'historicoQueloide', label: 'Histórico de Quelóide' },
                        { id: 'hiperHipotensao', label: 'Hipertensão/Hipotensão' },
                        { id: 'anemia', label: 'Anemia' },
                        { id: 'hemofilia', label: 'Hemofilia' },
                        { id: 'hepatite', label: 'Hepatite' },
                        { id: 'dormiuBem', label: 'Dormiu bem última noite' }
                      ].map((item) => (
                        <div key={item.id} className="flex items-center justify-between border-b border-slate-200/50 pb-1.5 text-xs">
                          <span className="text-slate-600 font-semibold">{item.label}</span>
                          <select 
                            value={(formValues as any)[item.id]}
                            onChange={(e) => handleValueChange(item.id, e.target.value)}
                            className="bg-white border rounded p-0.5 text-xs font-extrabold text-slate-700"
                          >
                            <option value="Não">Não</option>
                            <option value="Sim">Sim</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Outro Problema de Saúde?</label>
                    <textarea 
                      rows={2} 
                      value={formValues.algumOutroProblema}
                      onChange={(e) => handleValueChange('algumOutroProblema', e.target.value)}
                      placeholder="Descreva algum outro sintoma relevante..." 
                      className="input-field bg-slate-50 border-slate-200" 
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: PARAMETERS / QUEIXAS */}
              {editorTab === 'cuidados' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <HeartPulse className="text-blue-600" size={18} />
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Sinais Vitais & Queixas</h3>
                  </div>

                  {/* 3 Parameter Blocks */}
                  <div className="space-y-4">
                    <div className="border border-slate-200/80 rounded-xl p-4 bg-slate-50/50 space-y-3">
                      <span className="text-xs font-black text-red-650 tracking-wider">GLICEMIA CAPILAR</span>
                      <div className="grid grid-cols-2 gap-3">
                        <input 
                          type="text" 
                          value={formValues.glicemiaValue} 
                          onChange={(e) => handleValueChange('glicemiaValor', e.target.value)} 
                          placeholder="Valor mg/dL..." 
                          className="input-field bg-white" 
                        />
                        <input 
                          type="text" 
                          value={formValues.glicemiaExecutadoPor} 
                          onChange={(e) => handleValueChange('glicemiaExecutadoPor', e.target.value)} 
                          placeholder="Executado por..." 
                          className="input-field bg-white" 
                        />
                      </div>
                    </div>

                    <div className="border border-slate-200/80 rounded-xl p-4 bg-slate-50/50 space-y-3">
                      <span className="text-xs font-black text-indigo-750 tracking-wider">PRESSÃO ARTERIAL</span>
                      <div className="grid grid-cols-2 gap-3">
                        <input 
                          type="text" 
                          value={formValues.pressaoValor} 
                          onChange={(e) => handleValueChange('pressaoValor', e.target.value)} 
                          placeholder="Valor mmHg..." 
                          className="input-field bg-white" 
                        />
                        <input 
                          type="text" 
                          value={formValues.pressaoExecutadoPor} 
                          onChange={(e) => handleValueChange('pressaoExecutadoPor', e.target.value)} 
                          placeholder="Executado por..." 
                          className="input-field bg-white" 
                        />
                      </div>
                    </div>

                    <div className="border border-slate-200/80 rounded-xl p-4 bg-slate-50/50 space-y-3">
                      <span className="text-xs font-black text-orange-650 tracking-wider">TEMPERATURA CORPORAL</span>
                      <div className="grid grid-cols-2 gap-3">
                        <input 
                          type="text" 
                          value={formValues.temperaturaValor} 
                          onChange={(e) => handleValueChange('temperaturaValor', e.target.value)} 
                          placeholder="Valor °C..." 
                          className="input-field bg-white" 
                        />
                        <input 
                          type="text" 
                          value={formValues.temperaturaExecutadoPor} 
                          onChange={(e) => handleValueChange('temperaturaExecutadoPor', e.target.value)} 
                          placeholder="Executado por..." 
                          className="input-field bg-white" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Problemas de saúde / Queixas Table */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Problemas de Saúde Atuais</span>
                    </div>

                    {formValues.problemasSaude.map((item, index) => (
                      <div key={index} className="border border-slate-100 rounded-xl p-4 bg-slate-50 space-y-2.5">
                        <span className="text-[9px] font-black text-slate-400 uppercase">Problema {index + 1}</span>
                        <input 
                          type="text" 
                          value={item.problema} 
                          onChange={(e) => handleNestedListChange('problemasSaude', index, 'problema', e.target.value)} 
                          placeholder="Descrição do problema (Ex: Diabetes mellitus)" 
                          className="input-field bg-white border-slate-200" 
                        />
                        <textarea 
                          rows={2} 
                          value={item.examesSintomas} 
                          onChange={(e) => handleNestedListChange('problemasSaude', index, 'examesSintomas', e.target.value)} 
                          placeholder="Exames, sinais o sintomas (Forma HDA)..." 
                          className="input-field bg-white border-slate-200" 
                        />
                        <input 
                          type="text" 
                          value={item.estadoClinico} 
                          onChange={(e) => handleNestedListChange('problemasSaude', index, 'estadoClinico', e.target.value)} 
                          placeholder="Estado atual (Ex: CUR, CON, MPA, SAD...)" 
                          className="input-field bg-white border-slate-200" 
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: MEDICATIONS TABLE */}
              {editorTab === 'farmaco' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Pill className="text-blue-600" size={18} />
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Farmacoterapia Atual (Medicamentos)</h3>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {formValues.farmacoterapia.map((med, index) => (
                      <div key={index} className="border border-slate-100 rounded-xl p-4 bg-slate-50 space-y-3">
                        <span className="text-[10px] font-black text-slate-550 uppercase">Medicamento {index + 1}</span>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input 
                            type="text" 
                            value={med.principio} 
                            onChange={(e) => handleNestedListChange('farmacoterapia', index, 'principio', e.target.value)} 
                            placeholder="Ativo / Concentração..." 
                            className="input-field bg-white border-slate-200" 
                          />
                          <input 
                            type="text" 
                            value={med.posologiaPrescrita} 
                            onChange={(e) => handleNestedListChange('farmacoterapia', index, 'posologiaPrescrita', e.target.value)} 
                            placeholder="Posologia Prescrita..." 
                            className="input-field bg-white border-slate-200" 
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input 
                            type="text" 
                            value={med.origem} 
                            onChange={(e) => handleNestedListChange('farmacoterapia', index, 'origem', e.target.value)} 
                            placeholder="Origem (SUS, Particular...)" 
                            className="input-field bg-white border-slate-200" 
                          />
                          <input 
                            type="text" 
                            value={med.paraQue} 
                            onChange={(e) => handleNestedListChange('farmacoterapia', index, 'paraQue', e.target.value)} 
                            placeholder="Para que utiliza?" 
                            className="input-field bg-white border-slate-200" 
                          />
                        </div>

                        {/* Posologia Manha/Tarde/Noite slots */}
                        <div className="grid grid-cols-3 gap-2 bg-white p-3.5 rounded-xl border border-slate-100">
                          <div className="space-y-1">
                            <span className="text-[8.5px] font-black uppercase text-slate-400 block text-center">Manhã</span>
                            <select 
                              value={med.manha} 
                              onChange={(e) => handleNestedListChange('farmacoterapia', index, 'manha', e.target.value)}
                              className="w-full text-xs font-bold p-1 border rounded bg-slate-50"
                            >
                              <option value="">-</option>
                              <option value="AR">AR (Antes das refeições)</option>
                              <option value="DR">DR (Depois das refeições)</option>
                            </select>
                          </div>
                          
                          <div className="space-y-1">
                            <span className="text-[8.5px] font-black uppercase text-slate-400 block text-center">Tarde</span>
                            <select 
                              value={med.tarde} 
                              onChange={(e) => handleNestedListChange('farmacoterapia', index, 'tarde', e.target.value)}
                              className="w-full text-xs font-bold p-1 border rounded bg-slate-50"
                            >
                              <option value="">-</option>
                              <option value="AR">AR</option>
                              <option value="DR">DR</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[8.5px] font-black uppercase text-slate-400 block text-center">Noite</span>
                            <select 
                              value={med.noite} 
                              onChange={(e) => handleNestedListChange('farmacoterapia', index, 'noite', e.target.value)}
                              className="w-full text-xs font-bold p-1 border rounded bg-slate-50"
                            >
                              <option value="">-</option>
                              <option value="AR">AR</option>
                              <option value="DR">DR</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input 
                            type="text" 
                            value={med.tempoUso} 
                            onChange={(e) => handleNestedListChange('farmacoterapia', index, 'tempoUso', e.target.value)} 
                            placeholder="Tempo de uso (Ex: 3 meses)..." 
                            className="input-field bg-white border-slate-200" 
                          />
                          <input 
                            type="text" 
                            value={med.comoFunciona} 
                            onChange={(e) => handleNestedListChange('farmacoterapia', index, 'comoFunciona', e.target.value)} 
                            placeholder="Satisfeito? 1, 2, 3 ou 9" 
                            className="input-field bg-white border-slate-200" 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: ADHESION, SYMPTOMS & AGENDAMENTOS */}
              {editorTab === 'adesao' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <UserCheck className="text-blue-600" size={18} />
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Adesão, Sintomas & Terapias</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Dificuldade para tomar os comprimidos?</label>
                      <input 
                        type="text" 
                        value={formValues.dificuldadeTomar}
                        onChange={(e) => handleValueChange('dificuldadeTomar', e.target.value)}
                        placeholder="Ex: Nenhuma ou engolir cápsula grande..." 
                        className="input-field bg-slate-50 border-slate-200" 
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Deixou de tomar nos últimos 7 dias?</label>
                      <input 
                        type="text" 
                        value={formValues.deixouDeTomarDias}
                        onChange={(e) => handleValueChange('deixouDeTomarDias', e.target.value)}
                        placeholder="Quantidade de vezes..." 
                        className="input-field bg-slate-50 border-slate-200" 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Já esqueceu de tomar?</span>
                        <select 
                          value={formValues.esqueceuTomar} 
                          onChange={(e) => handleValueChange('esqueceuTomar', e.target.value)}
                          className="w-full text-xs font-bold p-2 border rounded bg-slate-50 border-slate-200"
                        >
                          <option value="Não">Não</option>
                          <option value="Sim">Sim</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Toma na hora indicada?</span>
                        <select 
                          value={formValues.tomaHoraIndicada} 
                          onChange={(e) => handleValueChange('tomaHoraIndicada', e.target.value)}
                          className="w-full text-xs font-bold p-2 border rounded bg-slate-50 border-slate-200"
                        >
                          <option value="Sim">Sim</option>
                          <option value="Não">Não</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Se sente bem, pára?</span>
                        <select 
                          value={formValues.bemDeixaDeTomar} 
                          onChange={(e) => handleValueChange('bemDeixaDeTomar', e.target.value)}
                          className="w-full text-xs font-bold p-2 border rounded bg-slate-50 border-slate-200"
                        >
                          <option value="Não">Não</option>
                          <option value="Sim">Sim</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Se sente mal, pára?</span>
                        <select 
                          value={formValues.malDeixaDeTomar} 
                          onChange={(e) => handleValueChange('malDeixaDeTomar', e.target.value)}
                          className="w-full text-xs font-bold p-2 border rounded bg-slate-50 border-slate-200"
                        >
                          <option value="Não">Não</option>
                          <option value="Sim">Sim</option>
                        </select>
                      </div>
                    </div>

                    {/* Med incomoda details */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                        <span className="text-xs font-bold text-slate-700">Algum de seus medicamentos te incomoda?</span>
                        <select 
                          value={formValues.medicamentoIncomoda} 
                          onChange={(e) => handleValueChange('medicamentoIncomoda', e.target.value)}
                          className="bg-white border text-xs font-extrabold text-blue-600 rounded p-1"
                        >
                          <option value="Não">Não</option>
                          <option value="Sim">Sim</option>
                        </select>
                      </div>

                      {formValues.medicamentoIncomoda === 'Sim' && (
                        <div className="space-y-3 pt-3 animate-fade-in">
                          <input 
                            type="text" 
                            value={formValues.incomodoList[0]?.medicamento} 
                            onChange={(e) => handleNestedListChange('incomodoList', 0, 'medicamento', e.target.value)} 
                            placeholder="Nome do Medicamento..." 
                            className="input-field bg-white border-slate-200" 
                          />
                          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pl-1">
                            <label className="flex items-center gap-1.5 font-bold">
                              <input 
                                type="checkbox" 
                                checked={formValues.incomodoList[0]?.muito} 
                                onChange={(e) => handleNestedListChange('incomodoList', 0, 'muito', e.target.checked)} 
                              />
                              Incomoda muito
                            </label>
                            <label className="flex items-center gap-1.5 font-bold">
                              <input 
                                type="checkbox" 
                                checked={formValues.incomodoList[0]?.umPouco} 
                                onChange={(e) => handleNestedListChange('incomodoList', 0, 'umPouco', e.target.checked)} 
                              />
                              Regulamente
                            </label>
                          </div>
                          <input 
                            type="text" 
                            value={formValues.incomodoList[0]?.formaIncomoda} 
                            onChange={(e) => handleNestedListChange('incomodoList', 0, 'formaIncomoda', e.target.value)} 
                            placeholder="De que forma incomoda?" 
                            className="input-field bg-white border-slate-200" 
                          />
                        </div>
                      )}
                    </div>

                    {/* Matrix Checklist of symptoms in the UI */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Sintomas Recentes nos Últimos Meses</span>
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        {[
                          { id: 'sintomaDorCabeca', label: 'Dor de cabeça' },
                          { id: 'sintomaTontura', label: 'Tontura/Desequilíbrio' },
                          { id: 'sintomaDorMuscular', label: 'Dor muscular' },
                          { id: 'sintomaCoceira', label: 'Coceira/Urticária' },
                          { id: 'sintomaIncontinencia', label: 'Incontinência urinária' },
                          { id: 'sintomaFadiga', label: 'Fadiga/Cansaço' },
                          { id: 'sintomaSono', label: 'Problemas de sono' },
                          { id: 'sintomaSexual', label: 'Disfunção sexual' },
                          { id: 'sintomaHumor', label: 'Alterações de humor' },
                          { id: 'sintomaGastrointestinal', label: 'Problema gastrointestinal' }
                        ].map(symp => (
                          <label key={symp.id} className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                            <input 
                              type="checkbox" 
                              checked={(formValues as any)[symp.id]} 
                              onChange={(e) => handleValueChange(symp.id, e.target.checked)} 
                            />
                            {symp.label}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Alternate therapies / Terapias Alternativas */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Terapias Alternativas (Acupuntura, chás...)</span>
                      
                      {formValues.terapiasAlternativas.map((item, index) => (
                        <div key={index} className="bg-white p-3 rounded-xl border border-slate-100 space-y-2">
                          <span className="text-[8px] font-black text-slate-400 uppercase">Terapia {index + 1}</span>
                          <input 
                            type="text" 
                            style={{ height: '36px' }}
                            value={item.terapia} 
                            onChange={(e) => handleNestedListChange('terapiasAlternativas', index, 'terapia', e.target.value)}
                            placeholder="Terapia Alternativa..." 
                            className="input-field border-slate-200" 
                          />
                          <input 
                            type="text" 
                            style={{ height: '36px' }}
                            value={item.indicacao} 
                            onChange={(e) => handleNestedListChange('terapiasAlternativas', index, 'indicacao', e.target.value)}
                            placeholder="Indicação..." 
                            className="input-field border-slate-200" 
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input 
                              type="text" 
                              style={{ height: '36px' }}
                              value={item.frequencia} 
                              onChange={(e) => handleNestedListChange('terapiasAlternativas', index, 'frequencia', e.target.value)}
                              placeholder="Frequência..." 
                              className="input-field border-slate-200" 
                            />
                            <input 
                              type="text" 
                              style={{ height: '36px' }}
                              value={item.modoPreparo} 
                              onChange={(e) => handleNestedListChange('terapiasAlternativas', index, 'modoPreparo', e.target.value)}
                              placeholder="Modo preparo..." 
                              className="input-field border-slate-200" 
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Actions Pactuated / Pct. Acoes */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Outras Ações Pactuadas</label>
                      <textarea 
                        rows={2} 
                        value={formValues.outrasAcoes}
                        onChange={(e) => handleValueChange('outrasAcoes', e.target.value)}
                        placeholder="Quais caminhos ou metas combinadas com o paciente..." 
                        className="input-field bg-slate-50 border-slate-200" 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Dur. Consulta (min)</span>
                        <input 
                          type="text" 
                          value={formValues.tempoConsultaMinValue}
                          onChange={(e) => handleValueChange('tempoConsultaMinValue', e.target.value)}
                          placeholder="Ex: 45 min" 
                          className="input-field bg-slate-50 border-slate-200" 
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Agendar Retorno</span>
                        <input 
                          type="date" 
                          value={formValues.dataProximaConsulta}
                          onChange={(e) => handleValueChange('dataProximaConsulta', e.target.value)}
                          className="input-field bg-slate-50 border-slate-200" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Botões de Navegação das Abas no final do formulário */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-8 gap-4">
                <button
                  type="button"
                  disabled={editorTab === 'perfil'}
                  onClick={() => {
                    const tabOrder = ['perfil', 'anamnese', 'cuidados', 'farmaco', 'adesao'] as const;
                    const currentIndex = tabOrder.indexOf(editorTab);
                    if (currentIndex > 0) {
                      setEditorTab(tabOrder[currentIndex - 1]);
                    }
                  }}
                  className={`px-4 py-2.5 rounded-xl border text-[10.5px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                    editorTab === 'perfil'
                      ? 'border-slate-100 text-slate-300 cursor-not-allowed bg-slate-50/50'
                      : 'border-slate-200 text-slate-600 hover:text-slate-950 hover:bg-slate-50 shadow-sm'
                  }`}
                >
                  ← Voltar Etapa
                </button>
                
                {editorTab !== 'adesao' ? (
                  <button
                    type="button"
                    onClick={() => {
                      const tabOrder = ['perfil', 'anamnese', 'cuidados', 'farmaco', 'adesao'] as const;
                      const currentIndex = tabOrder.indexOf(editorTab);
                      if (currentIndex < tabOrder.length - 1) {
                        setEditorTab(tabOrder[currentIndex + 1]);
                      }
                    }}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-[10.5px] font-black uppercase tracking-wider"
                  >
                    Próxima Etapa →
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-[10.5px] font-black uppercase tracking-wider"
                  >
                    <Save size={14} />
                    Finalizar & Salvar
                  </button>
                )}
              </div>

            </form>
          </div>
        </div>

        {/* Real-time PDF Live view Pane (Fiel real renderer) right */}
        <div className="xl:col-span-6 space-y-4">
          
          <div className="bg-slate-950 p-4 md:p-6 rounded-2xl flex flex-col justify-center items-center gap-4 relative" style={{ minHeight: '620px' }}>
            
            {/* Embedded Visualizer Header info */}
            <div className="w-full flex items-center justify-between bg-slate-900/90 backdrop-blur border border-slate-800 p-3 rounded-xl text-[9.5px] font-black text-slate-300 tracking-wide uppercase">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Visualizador do PDF com Dados Reais</span>
              </div>
              <div className="flex items-center gap-2">
                {previewPdfUrl && (
                  <a
                    href={previewPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-[10px] tracking-wide"
                  >
                    Tela Cheia ↗
                  </a>
                )}
              </div>
            </div>

            {pdfDoc && pdfDoc.numPages ? (
              <div className="w-full space-y-5 max-w-[500px] overflow-y-auto max-h-[800px] pr-1">
                {Array.from({ length: pdfDoc.numPages }, (_, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-[8.5px] font-mono font-bold text-slate-500 uppercase tracking-widest px-1">
                      <span>Prontuário de Anamnese</span>
                      <span>Folha {idx + 1} de {pdfDoc.numPages}</span>
                    </div>
                    <PdfPage pdfDoc={pdfDoc} pageNumber={idx + 1} />
                  </div>
                ))}
              </div>
            ) : isCompiling || !pdfjsLoaded ? (
              <div className="text-center py-24 flex flex-col items-center justify-center text-slate-500">
                <Loader2 className="animate-spin text-blue-500 mb-3" size={32} />
                <p className="text-xs font-black uppercase text-slate-400">Compilando e gerando o PDF real...</p>
                <p className="text-[10px] text-slate-600 font-mono mt-1 font-semibold">Engine PDF.js Active - Autoupdating...</p>
              </div>
            ) : (
              <div className="text-center py-24 flex flex-col items-center justify-center text-slate-500">
                <Loader2 className="animate-spin text-blue-500 mb-3" size={32} />
                <p className="text-xs font-semibold">Carregando engine gráfico de desenho...</p>
              </div>
            )}
            
          </div>

          <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 text-white relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-3xl rounded-full -mr-12 -mt-12"></div>
            
            <div className="space-y-3 relative z-10">
              <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/20">
                <Clock size={16} className="text-blue-400" />
              </div>
              <h4 className="text-sm font-black tracking-wider uppercase">Vínculo de Prontuários</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                Este modelo de ficha preenchido no editor acompanha o padrão clínico unificado brasileiro do Conselho Federal de Farmácia (CFF). Todas as folhas são criadas contendo o cabeçalho técnico e rodapé configurados para a sua drogaria real cadastrada.
              </p>
              {success && (
                <div className="flex items-center gap-2 text-emerald-400 pt-3 animate-bounce">
                  <CheckCircle2 size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Procedimento Técnico Salvo com Sucesso!</span>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
