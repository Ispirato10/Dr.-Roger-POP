import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  User, 
  Activity, 
  Heart, 
  Thermometer, 
  Syringe,
  Download,
  CheckCircle2,
  AlertCircle,
  Save,
  Loader2,
  Hash,
  History,
  X,
  Search,
  Settings
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { getNextSequenceNumber, saveDeclarationAndGetSequence, getRecentDeclarations } from '../services/declarations';

export default function PharmacyServices() {
  const { drugstore, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'glicemia' | 'pressao' | 'temperatura' | 'injetaveis'>('glicemia');
  const [isSaving, setIsSaving] = useState(false);
  const [sequenceNumber, setSequenceNumber] = useState<number>(1);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [recentDeclarations, setRecentDeclarations] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  
  // Patient Data
  const [patient, setPatient] = useState({
    nome: '',
    responsavel: '',
    tel: '',
    cel: '',
    end: '',
    bairro: '',
    cpf: '',
    idade: '',
    sexo: 'Não Informado',
    peso: '',
    gestante: 'Não',
    fumante: 'Não',
    diabetes: 'Não',
    medico: '',
    crm: '',
    medicoEnd: '',
    medicoTel: '',
    medicoEmail: '',
    usaMedicamentos: 'Não',
    quaisMedicamentos: ''
  });

  // Services Data
  const [glicemia, setGlicemia] = useState({
    usaInsulina: 'Não',
    qualInsulina: '',
    frequencia: '',
    valor: '',
    tipo: 'Jejum',
    orientacao: ''
  });

  const [pressao, setPressao] = useState({
    sistolica: '',
    diastolica: '',
    posicao: 'Sentado',
    membro: 'Braço Esquerdo',
    obs: '',
    orientacao: ''
  });

  const [temperatura, setTemperatura] = useState({
    valor: '',
    horario: format(new Date(), 'HH:mm'),
    orientacao: ''
  });

  const [injetaveis, setInjetaveis] = useState({
    nome: '',
    concentracao: '',
    via: 'IM',
    lote: '',
    validade: '',
    registro: '',
    posologia: '',
    plano: '',
    local: 'Glúteo',
    material: '',
    fabricante: '',
    proximaDose: ''
  });

  const [servicesIncluded, setServicesIncluded] = useState({
    glicemia: false,
    pressao: false,
    temperatura: false,
    injetaveis: false
  });

  const enabledServices = useMemo(() => {
    if (drugstore?.enabledServices) {
      return {
        glicemia: drugstore.enabledServices.glicemia ?? true,
        pressao: drugstore.enabledServices.pressao ?? true,
        temperatura: drugstore.enabledServices.temperatura ?? true,
        injetaveis: drugstore.enabledServices.injetaveis ?? true,
      };
    }
    const local = localStorage.getItem('dr_roger_enabled_services');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        return {
          glicemia: parsed.glicemia ?? true,
          pressao: parsed.pressao ?? true,
          temperatura: parsed.temperatura ?? true,
          injetaveis: parsed.injetaveis ?? true,
        };
      } catch (e) {}
    }
    return {
      glicemia: true,
      pressao: true,
      temperatura: true,
      injetaveis: true,
    };
  }, [drugstore?.enabledServices]);

  const serviceLabels: Record<keyof typeof servicesIncluded, string> = {
    glicemia: 'Glicemia Capilar',
    pressao: 'Pressão Arterial',
    temperatura: 'Temperatura Corporal',
    injetaveis: 'Injetáveis'
  };

  useEffect(() => {
    if (drugstore?.id) {
      getNextSequenceNumber(drugstore.id).then(seq => {
        if (seq) setSequenceNumber(seq);
      });
    }
  }, [drugstore?.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>, section: string) => {
    const { name, value } = e.target;
    if (section === 'patient') setPatient(prev => ({ ...prev, [name]: value }));
    if (section === 'glicemia') setGlicemia(prev => ({ ...prev, [name]: value }));
    if (section === 'pressao') setPressao(prev => ({ ...prev, [name]: value }));
    if (section === 'temperatura') setTemperatura(prev => ({ ...prev, [name]: value }));
    if (section === 'injetaveis') setInjetaveis(prev => ({ ...prev, [name]: value }));
  };

  const toggleService = (service: keyof typeof servicesIncluded) => {
    setServicesIncluded(prev => ({ ...prev, [service]: !prev[service] }));
    setActiveTab(service);
  };

  const handleOpenHistory = async () => {
    if (!drugstore?.id) return;
    setHistoryModalOpen(true);
    setIsLoadingHistory(true);
    try {
      const list = await getRecentDeclarations(drugstore.id);
      setRecentDeclarations(list);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSaveAndGeneratePDF = async () => {
    if (!drugstore?.id) {
      alert("Por favor, configure sua drogaria primeiro.");
      return;
    }
    
    if (Object.values(servicesIncluded).every(v => !v)) {
      alert("Selecione ao menos um serviço para gerar a declaração.");
      return;
    }

    try {
      setIsSaving(true);
      
      const payload = {
        patient,
        servicesIncluded,
        glicemia: servicesIncluded.glicemia ? glicemia : null,
        pressao: servicesIncluded.pressao ? pressao : null,
        temperatura: servicesIncluded.temperatura ? temperatura : null,
        injetaveis: servicesIncluded.injetaveis ? injetaveis : null,
      };

      const seq = await saveDeclarationAndGetSequence(drugstore.id, payload, sequenceNumber);
      generatePDF(seq);
      setSequenceNumber(seq + 1);
      
    } catch (error) {
      console.error("Error saving declaration:", error);
      alert("Erro ao salvar declaração. O PDF será gerado sem numeração.");
      generatePDF(sequenceNumber);
    } finally {
      setIsSaving(false);
    }
  };

  const generatePDF = (customSeq?: number) => {
    const activeSeq = customSeq || sequenceNumber;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 14;

    // Header
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('DECLARAÇÃO DE SERVIÇOS FARMACÊUTICOS', 14, y);
    
    // Sequence Number (Red, Bold, Right Aligned like reference image)
    doc.setFontSize(13);
    doc.setTextColor(200, 0, 0);
    doc.text(`Nº   ${activeSeq.toString().padStart(6, '0')}`, pageWidth - 14, y, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    
    y += 7;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Estabelecimento: ${drugstore?.name || 'Drogaria'}`, 14, y);
    doc.text(`CNPJ: ${drugstore?.cnpj || '-'}`, 130, y);
    y += 4.5;
    doc.text(`Endereço: ${drugstore?.address || 'Não informado'} - Tel: ${drugstore?.phone || '-'}`, 14, y);
    y += 4.5;
    doc.text(`Responsável Técnico: ${drugstore?.pharmacist || 'Farmacêutico'} - CRF: ${drugstore?.crf || '-'}`, 14, y);
    
    y += 4;
    doc.setLineWidth(0.4);
    doc.line(14, y, pageWidth - 14, y);
    y += 5;

    // Patient Data Block
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DO USUÁRIO', 14, y);
    y += 5;
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nome: ${patient.nome || '____________________________________________________'}`, 14, y);
    doc.text(`CPF: ${patient.cpf || '-'}`, 140, y);
    y += 4.5;
    doc.text(`Responsável Legal: ${patient.responsavel || '-'}`, 14, y);
    doc.text(`Tel: ${patient.tel || '-'}  /  Cel: ${patient.cel || '-'}`, 105, y);
    y += 4.5;
    doc.text(`Endereço: ${patient.end || '-'}`, 14, y);
    doc.text(`Bairro: ${patient.bairro || '-'}`, 130, y);
    y += 4.5;
    doc.text(`Idade: ${patient.idade || '-'}`, 14, y);
    doc.text(`Sexo: ${patient.sexo || '-'}`, 50, y);
    doc.text(`Peso: ${patient.peso ? patient.peso + ' kg' : '-'}`, 90, y);
    doc.text(`Gestante: ${patient.gestante}`, 130, y);
    y += 4.5;
    doc.text(`Fumante: ${patient.fumante}`, 14, y);
    doc.text(`Diabetes: ${patient.diabetes}`, 60, y);
    y += 4.5;
    doc.text(`Médico Resp.: ${patient.medico || '-'} (CRM: ${patient.crm || '-'})`, 14, y);
    y += 4.5;
    doc.text(`Usa Medicamentos? ${patient.usaMedicamentos}${patient.usaMedicamentos === 'Sim' ? ' - Quais: ' + patient.quaisMedicamentos : ''}`, 14, y);
    
    y += 5;
    doc.line(14, y, pageWidth - 14, y);
    y += 6;

    // Services Render
    if (servicesIncluded.glicemia) {
      if (y > 230) { doc.addPage(); y = 15; }
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('AFERIÇÃO DE GLICEMIA CAPILAR', 14, y);
      y += 5;

      // Draw 2 columns layout
      const colWidth = (pageWidth - 32) / 2;
      const col1X = 14;
      const col2X = 14 + colWidth + 4;
      const startGlicY = y;

      // Col 1: Service details
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Faz uso de insulina: ( ${glicemia.usaInsulina === 'Sim' ? 'X' : ' '} ) Sim   ( ${glicemia.usaInsulina !== 'Sim' ? 'X' : ' '} ) Não`, col1X, y);
      y += 4.5;
      if (glicemia.usaInsulina === 'Sim') {
        doc.text(`Qual: ${glicemia.qualInsulina || '-'}`, col1X, y);
        y += 4.5;
      }
      doc.setFont('helvetica', 'bold');
      doc.text(`Glicemia Capilar: ${glicemia.valor ? glicemia.valor + ' mg/dl' : '______ mg/dl'}`, col1X, y);
      doc.setFont('helvetica', 'normal');
      y += 4.5;
      doc.text(`Tipo: ( ${glicemia.tipo === 'Jejum' ? 'X' : ' '} ) Jejum   ( ${glicemia.tipo === 'Pós Prandial' ? 'X' : ' '} ) Pós Prandial   ( ${glicemia.tipo === 'Aleatória' ? 'X' : ' '} ) Aleatória`, col1X, y);
      y += 4.5;
      doc.text(`Orientação / Interferência realizada:`, col1X, y);
      y += 4.5;
      const splitOrient = doc.splitTextToSize(glicemia.orientacao || 'Nenhuma interferência reportada.', colWidth);
      doc.text(splitOrient, col1X, y);

      // Col 2: Complete Reference Table (as in attached image)
      let refY = startGlicY;
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text('Valores de Referência de Glicemia', col2X, refY);
      refY += 3.5;
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'italic');
      doc.text('Valores de glicose plasmática (mg/dl) para diagnóstico de diabetes', col2X, refY);
      refY += 3;
      doc.text('mellitus e seus estágios pré-clínicos:', col2X, refY);
      refY += 4;

      // Table box
      (doc as any).autoTable({
        startY: refY,
        margin: { left: col2X },
        tableWidth: colWidth,
        styles: { fontSize: 6.5, cellPadding: 1 },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        head: [['Categoria', 'Jejum*']],
        body: [
          ['Glicemia normal', '< 100 mg/dl'],
          ['Tolerância à glicose diminuída', '> 100 a < 126 mg/dl'],
          ['Diabetes mellitus', '> 126 mg/dl']
        ]
      });

      refY = (doc as any).lastAutoTable.finalY + 3;
      doc.setFontSize(6);
      doc.setFont('helvetica', 'italic');
      doc.text('* O jejum é definido como a falta de ingestão calórica por no mínimo 8 horas.', col2X, refY);

      y = Math.max(startGlicY + (splitOrient.length * 4) + 20, refY + 6);
      doc.setLineWidth(0.2);
      doc.line(14, y, pageWidth - 14, y);
      y += 5;
    }

    if (servicesIncluded.pressao) {
      if (y > 210) { doc.addPage(); y = 15; }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('AFERIÇÃO DE PRESSÃO ARTERIAL', 14, y);
      y += 5;

      const colWidth = (pageWidth - 32) / 2;
      const col1X = 14;
      const col2X = 14 + colWidth + 4;
      const startPressY = y;

      // Col 1: Measurements
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`Sistólica: ${pressao.sistolica || '___'} mmHg   Diastólica: ${pressao.diastolica || '___'} mmHg`, col1X, y);
      doc.setFont('helvetica', 'normal');
      y += 4.5;
      doc.text(`Posição: ${pressao.posicao} | Membro: ${pressao.membro}`, col1X, y);
      y += 4.5;
      if (pressao.obs) {
        doc.text(`Obs: ${pressao.obs}`, col1X, y);
        y += 4.5;
      }
      doc.text(`Orientação / Interferência realizada:`, col1X, y);
      y += 4.5;
      const splitOrientP = doc.splitTextToSize(pressao.orientacao || 'Orientação prestada conforme as diretrizes.', colWidth);
      doc.text(splitOrientP, col1X, y);

      // Col 2: Complete V Diretrizes reference table (matching attached image)
      let refPY = startPressY;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('Valores de Referência (V Diretrizes Brasileiras - SBC/SBH/SBN):', col2X, refPY);
      refPY += 4;

      (doc as any).autoTable({
        startY: refPY,
        margin: { left: col2X },
        tableWidth: colWidth,
        styles: { fontSize: 6, cellPadding: 1 },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        head: [['Classificação', 'PAS (mmHg)', 'PAD (mmHg)']],
        body: [
          ['Ótima', '< 120', '< 80'],
          ['Normal', '< 130', '< 85'],
          ['Limítrofe', '130 - 139', '85 - 89'],
          ['Hipertensão Estágio 1', '140 - 159', '90 - 99'],
          ['Hipertensão Estágio 2', '160 - 179', '100 - 109'],
          ['Hipertensão Estágio 3', '> 180', '> 110'],
          ['Hipertensão Sist. Isolada', '> 140', '< 90']
        ]
      });

      refPY = (doc as any).lastAutoTable.finalY + 3;

      y = Math.max(startPressY + (splitOrientP.length * 4) + 20, refPY + 5);
      doc.setLineWidth(0.2);
      doc.line(14, y, pageWidth - 14, y);
      y += 5;
    }

    if (servicesIncluded.temperatura) {
      if (y > 230) { doc.addPage(); y = 15; }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('AFERIÇÃO DE TEMPERATURA CORPORAL', 14, y);
      y += 5;

      const colWidth = (pageWidth - 32) / 2;
      const col1X = 14;
      const col2X = 14 + colWidth + 4;
      const startTempY = y;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`Temperatura Aferida: ${temperatura.valor ? temperatura.valor + ' ºC' : '___ ºC'}`, col1X, y);
      doc.setFont('helvetica', 'normal');
      y += 4.5;
      doc.text(`Horário de Aferição: ${temperatura.horario}`, col1X, y);
      y += 4.5;
      doc.text(`Orientação / Interferência realizada:`, col1X, y);
      y += 4.5;
      const splitOrientT = doc.splitTextToSize(temperatura.orientacao || 'Nenhuma interferência reportada.', colWidth);
      doc.text(splitOrientT, col1X, y);

      // Col 2: Complete Reference table
      let refTY = startTempY;
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text('Valores de Referência de Temperatura Corporal:', col2X, refTY);
      refTY += 4;

      (doc as any).autoTable({
        startY: refTY,
        margin: { left: col2X },
        tableWidth: colWidth,
        styles: { fontSize: 6.5, cellPadding: 1.2 },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        head: [['Classificação', 'Faixa Térmica']],
        body: [
          ['Hipotermia', '< 35,0 ºC'],
          ['Normotermia', '36,0 a 37,2 ºC'],
          ['Estado Febril', '37,3 a 37,7 ºC'],
          ['Febre', '>= 37,8 ºC']
        ]
      });

      refTY = (doc as any).lastAutoTable.finalY + 3;

      y = Math.max(startTempY + (splitOrientT.length * 4) + 15, refTY + 5);
      doc.setLineWidth(0.2);
      doc.line(14, y, pageWidth - 14, y);
      y += 5;
    }

    if (servicesIncluded.injetaveis) {
      if (y > 200) { doc.addPage(); y = 15; }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('ADMINISTRAÇÃO DE INJETÁVEIS', 14, y);
      y += 5;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Medicamento / DCB: ${injetaveis.nome || '-'}`, 14, y);
      doc.text(`Conc / Forma: ${injetaveis.concentracao || '-'}`, 110, y);
      y += 4.5;
      doc.text(`Via de Adm: ${injetaveis.via}`, 14, y);
      doc.text(`Lote: ${injetaveis.lote || '-'}`, 60, y);
      doc.text(`Validade: ${injetaveis.validade || '-'}`, 105, y);
      doc.text(`Reg. MS: ${injetaveis.registro || '-'}`, 150, y);
      y += 4.5;
      doc.text(`Fabricante: ${injetaveis.fabricante || '-'}`, 14, y);
      doc.text(`Próxima Dose: ${injetaveis.proximaDose || '-'}`, 110, y);
      y += 4.5;
      doc.text(`Posologia: ${injetaveis.posologia || '-'}`, 14, y);
      y += 4.5;
      doc.text(`Plano de Intervenção: ${injetaveis.plano || 'Não se aplica'}`, 14, y);
      y += 4.5;
      doc.text(`Local administrado / Lado: ${injetaveis.local || '-'}`, 14, y);
      doc.text(`Material utilizado: ${injetaveis.material || 'Seringa descartável com agulha'}`, 110, y);

      y += 6;
      doc.setLineWidth(0.2);
      doc.line(14, y, pageWidth - 14, y);
      y += 5;
    }

    // Signatures section
    if (y > 240) { doc.addPage(); y = 20; }
    y += 8;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('RESPONSÁVEL PELO ATENDIMENTO:', 14, y);
    y += 12;
    doc.text('_________________________________________________', 14, y);
    doc.text('_________________________________________________', 120, y);
    y += 4.5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Assinatura do Paciente / Responsável`, 22, y);
    doc.text(`${drugstore?.pharmacist || 'Farmacêutico'} - CRF: ${drugstore?.crf || ''}`, 130, y);

    y += 12;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.text('Este procedimento não tem finalidade de diagnóstico e não substitui a consulta médica ou exames laboratoriais.', pageWidth/2, y, { align: 'center' });
    
    // Add Termo de Ciência if Injetaveis
    if (servicesIncluded.injetaveis) {
      doc.addPage();
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('TERMO DE CIÊNCIA - ADMINISTRAÇÃO DE INJETÁVEIS', pageWidth/2, 20, { align: 'center' });
      
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      const text = `Eu, ${patient.nome || '_________________________________'}, inscrito(a) no CPF sob o nº ${patient.cpf || '__________________'}, estou ciente de que a ${drugstore?.name || 'Drogaria'} presta o serviço de aplicação de injetável em loja devidamente autorizada pelos Órgãos Competentes, seguindo todas as normas sanitárias e cuidados com o paciente, além de treinar e capacitar os seus funcionários para a execução desse tipo de prestação de serviços. 

É do meu conhecimento que, quando da aplicação de medicação injetável, podem ocorrer reações adversas, já previstas nas respectivas bulas, cujos efeitos não poderão ser atribuídos à responsabilidade da referida drogaria, justamente por serem independentes e desvinculados da prestação do serviço de aplicação de injetável. 

Nesse sentido, tenho ciência de que, quando da aplicação da medicação injetável, não será de responsabilidade da drogaria quaisquer perdas ou danos que vierem a ocorrer em razão da aplicação dos produtos injetáveis administrados, salvo se, durante a aplicação da medicação, for constatada negligência, imprudência ou imperícia. Estou ciente e concordo com o conteúdo do termo.`;
      
      const splitText = doc.splitTextToSize(text, pageWidth - 28);
      doc.text(splitText, 14, 40);

      doc.text('_______________________________________________________', pageWidth/2, 130, { align: 'center' });
      doc.text('Assinatura do Paciente / Responsável', pageWidth/2, 136, { align: 'center' });
      
      const dataHora = format(new Date(), 'dd/MM/yyyy HH:mm');
      doc.text(`Emitido em: ${dataHora}`, pageWidth/2, 150, { align: 'center' });
    }

    doc.save(`declaracao_servicos_${activeSeq}_${patient.nome || 'paciente'}.pdf`);
  };

  const filteredHistory = recentDeclarations.filter(item => {
    const searchLower = historySearch.toLowerCase();
    const pName = item.patient?.nome?.toLowerCase() || '';
    const seq = item.sequenceNumber?.toString() || '';
    return pName.includes(searchLower) || seq.includes(searchLower);
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Declaração de Serviços</h1>
          <p className="text-slate-500 font-medium mt-1">Gere declarações de serviços farmacêuticos com numeração de rastreio e referências completas.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Tracking Number Input */}
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3.5 py-2 rounded-xl text-sm font-bold shadow-sm">
            <Hash size={16} className="text-red-500 shrink-0" />
            <span className="text-xs uppercase tracking-wider text-red-600 font-sans">Nº Rastreio:</span>
            <input
              type="number"
              value={sequenceNumber}
              onChange={(e) => setSequenceNumber(parseInt(e.target.value) || 1)}
              className="w-20 bg-white border border-red-300 rounded-lg px-2 py-0.5 text-red-800 text-center font-black focus:outline-none focus:ring-2 focus:ring-red-400 font-mono"
            />
          </div>

          <button
            onClick={handleOpenHistory}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all text-sm active:scale-95"
          >
            <History size={16} />
            <span>Histórico</span>
          </button>

          <button
            onClick={() => generatePDF()}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 rounded-xl font-bold transition-all shadow-sm active:scale-95 text-sm"
            disabled={isSaving}
          >
            <Download size={16} />
            <span>Apenas Gerar PDF</span>
          </button>
          
          <button
            onClick={handleSaveAndGeneratePDF}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md active:scale-95 disabled:opacity-70 text-sm"
          >
            {isSaving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            <span>Salvar e Gerar PDF</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Patient Data Form - 1/3 width on large screens */}
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
              <User className="text-blue-600" size={20} />
              Dados do Paciente
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nome Completo *</label>
                <input type="text" name="nome" value={patient.nome} onChange={(e) => handleInputChange(e, 'patient')} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">CPF</label>
                  <input type="text" name="cpf" value={patient.cpf} onChange={(e) => handleInputChange(e, 'patient')} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Celular</label>
                  <input type="text" name="cel" value={patient.cel} onChange={(e) => handleInputChange(e, 'patient')} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Idade</label>
                  <input type="text" name="idade" value={patient.idade} onChange={(e) => handleInputChange(e, 'patient')} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Sexo</label>
                  <select name="sexo" value={patient.sexo} onChange={(e) => handleInputChange(e, 'patient')} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none transition-all">
                    <option>Não Informado</option>
                    <option>Masculino</option>
                    <option>Feminino</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Peso</label>
                  <input type="text" name="peso" value={patient.peso} onChange={(e) => handleInputChange(e, 'patient')} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none transition-all" />
                </div>
              </div>
              
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-700 mb-2">Contato e Endereço:</p>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Telefone</label>
                    <input type="text" name="tel" value={patient.tel} onChange={(e) => handleInputChange(e, 'patient')} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Responsável Legal</label>
                    <input type="text" name="responsavel" value={patient.responsavel} onChange={(e) => handleInputChange(e, 'patient')} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none transition-all" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Endereço</label>
                    <input type="text" name="end" value={patient.end} onChange={(e) => handleInputChange(e, 'patient')} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Bairro</label>
                    <input type="text" name="bairro" value={patient.bairro} onChange={(e) => handleInputChange(e, 'patient')} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none transition-all" />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-700 mb-2">Condições:</p>
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input type="checkbox" checked={patient.gestante === 'Sim'} onChange={(e) => handleInputChange({target:{name:'gestante', value: e.target.checked?'Sim':'Não'}} as any, 'patient')} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    Gestante
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input type="checkbox" checked={patient.fumante === 'Sim'} onChange={(e) => handleInputChange({target:{name:'fumante', value: e.target.checked?'Sim':'Não'}} as any, 'patient')} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    Fumante
                  </label>
                </div>
                <div className="mt-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Diabetes</label>
                  <select name="diabetes" value={patient.diabetes} onChange={(e) => handleInputChange(e, 'patient')} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none transition-all">
                    <option>Não</option>
                    <option>Sim - Tipo 1</option>
                    <option>Sim - Tipo 2</option>
                    <option>Não sabe informar</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-700 mb-2">Médico Responsável:</p>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nome do Médico</label>
                    <input type="text" name="medico" value={patient.medico} onChange={(e) => handleInputChange(e, 'patient')} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">CRM</label>
                    <input type="text" name="crm" value={patient.crm} onChange={(e) => handleInputChange(e, 'patient')} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none transition-all" />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-slate-700">Faz uso de medicamentos?</p>
                  <select name="usaMedicamentos" value={patient.usaMedicamentos} onChange={(e) => handleInputChange(e, 'patient')} className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs focus:border-blue-500 outline-none transition-all">
                    <option>Não</option>
                    <option>Sim</option>
                  </select>
                </div>
                {patient.usaMedicamentos === 'Sim' && (
                  <div>
                    <input type="text" placeholder="Quais?" name="quaisMedicamentos" value={patient.quaisMedicamentos} onChange={(e) => handleInputChange(e, 'patient')} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none transition-all" />
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Service Toggles */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="text-blue-600" size={20} />
                Serviços Prestados
              </h2>
              <Link 
                to="/settings" 
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 hover:underline"
              >
                <Settings size={14} />
                <span>Configurar</span>
              </Link>
            </div>

            <div className="space-y-2">
              {(Object.keys(servicesIncluded) as Array<keyof typeof servicesIncluded>)
                .filter(service => enabledServices[service])
                .map(service => (
                  <label key={service} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${servicesIncluded[service] ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                    <span className="text-sm font-bold text-slate-700">{serviceLabels[service]}</span>
                    <input type="checkbox" checked={servicesIncluded[service]} onChange={() => toggleService(service)} className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500" />
                  </label>
                ))}
            </div>

            {Object.values(enabledServices).every(v => !v) ? (
              <div className="mt-2 p-4 bg-amber-50 text-amber-800 rounded-xl text-xs font-medium border border-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <AlertCircle size={16} className="shrink-0 text-amber-600" />
                  <span>Todos os serviços estão ocultos</span>
                </div>
                <p>Todos os serviços farmacêuticos foram desativados nas Configurações.</p>
                <Link to="/settings" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors text-xs">
                  <Settings size={12} />
                  <span>Ativar Serviços nas Configurações</span>
                </Link>
              </div>
            ) : Object.values(servicesIncluded).every(v => !v) && (
               <div className="mt-4 p-3 bg-amber-50 text-amber-700 rounded-lg flex items-start gap-2 text-xs font-medium border border-amber-100">
                 <AlertCircle size={14} className="mt-0.5 shrink-0" />
                 Selecione ao menos um serviço para habilitar o preenchimento.
               </div>
            )}
          </div>
        </div>

        {/* Services Forms - 2/3 width */}
        <div className="xl:col-span-8">
          {Object.values(servicesIncluded).some(v => v) ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
              <div className="flex border-b border-slate-200 overflow-x-auto custom-scrollbar">
                {servicesIncluded.glicemia && enabledServices.glicemia && (
                  <button onClick={() => setActiveTab('glicemia')} className={`px-6 py-4 text-sm font-black tracking-tight whitespace-nowrap transition-colors border-b-2 ${activeTab === 'glicemia' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                    Glicemia
                  </button>
                )}
                {servicesIncluded.pressao && enabledServices.pressao && (
                  <button onClick={() => setActiveTab('pressao')} className={`px-6 py-4 text-sm font-black tracking-tight whitespace-nowrap transition-colors border-b-2 ${activeTab === 'pressao' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                    Pressão Arterial
                  </button>
                )}
                {servicesIncluded.temperatura && enabledServices.temperatura && (
                  <button onClick={() => setActiveTab('temperatura')} className={`px-6 py-4 text-sm font-black tracking-tight whitespace-nowrap transition-colors border-b-2 ${activeTab === 'temperatura' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                    Temperatura
                  </button>
                )}
                {servicesIncluded.injetaveis && enabledServices.injetaveis && (
                  <button onClick={() => setActiveTab('injetaveis')} className={`px-6 py-4 text-sm font-black tracking-tight whitespace-nowrap transition-colors border-b-2 ${activeTab === 'injetaveis' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                    Injetáveis
                  </button>
                )}
              </div>
              
              <div className="p-6 flex-1 bg-slate-50/50">
                <AnimatePresence mode="wait">
                  {activeTab === 'glicemia' && servicesIncluded.glicemia && (
                    <motion.div key="glicemia" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                      <div className="flex items-center gap-3 text-slate-800 mb-6">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><Activity size={20} /></div>
                        <h3 className="text-xl font-black">Aferição de Glicemia Capilar</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Glicemia Capilar (mg/dl)</label>
                          <input type="text" name="valor" value={glicemia.valor} onChange={(e) => handleInputChange(e, 'glicemia')} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tipo</label>
                          <select name="tipo" value={glicemia.tipo} onChange={(e) => handleInputChange(e, 'glicemia')} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none">
                            <option>Jejum</option>
                            <option>Pós Prandial</option>
                            <option>Aleatória</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Faz uso de Insulina?</label>
                          <select name="usaInsulina" value={glicemia.usaInsulina} onChange={(e) => handleInputChange(e, 'glicemia')} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none">
                            <option>Não</option>
                            <option>Sim</option>
                          </select>
                        </div>
                        {glicemia.usaInsulina === 'Sim' && (
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Qual Insulina?</label>
                            <input type="text" name="qualInsulina" value={glicemia.qualInsulina} onChange={(e) => handleInputChange(e, 'glicemia')} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none" />
                          </div>
                        )}
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Orientação e interferência realizada</label>
                          <textarea name="orientacao" value={glicemia.orientacao} onChange={(e) => handleInputChange(e, 'glicemia')} rows={3} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none resize-none"></textarea>
                        </div>
                      </div>
                      
                      {/* Complete Reference box for Glicemia */}
                      <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 mt-4 text-xs text-slate-700 space-y-2">
                        <strong className="text-blue-900 block font-black text-sm">Valores de Referência de Glicemia:</strong>
                        <p className="text-[11px] text-slate-600 italic">Valores de glicose plasmática (mg/dl) para diagnóstico de diabetes mellitus e seus estágios pré-clínicos</p>
                        <table className="w-full text-left border-collapse mt-2 bg-white rounded-lg overflow-hidden border border-blue-100">
                          <thead>
                            <tr className="bg-blue-100/50 text-blue-900 font-bold border-b border-blue-100">
                              <th className="p-2 text-[11px]">Categoria</th>
                              <th className="p-2 text-[11px]">Jejum*</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-blue-50 text-[11px]">
                            <tr>
                              <td className="p-2">Glicemia normal</td>
                              <td className="p-2 font-mono font-bold text-slate-800">&lt; 100 mg/dl</td>
                            </tr>
                            <tr>
                              <td className="p-2">Tolerância à glicose diminuída</td>
                              <td className="p-2 font-mono font-bold text-slate-800">&gt; 100 a &lt; 126 mg/dl</td>
                            </tr>
                            <tr>
                              <td className="p-2">Diabetes mellitus</td>
                              <td className="p-2 font-mono font-bold text-red-600">&gt; 126 mg/dl</td>
                            </tr>
                          </tbody>
                        </table>
                        <p className="text-[10px] text-slate-500 pt-1">* O jejum é definido como a falta de ingestão calórica por no mínimo 8 horas.</p>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'pressao' && servicesIncluded.pressao && (
                    <motion.div key="pressao" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                      <div className="flex items-center gap-3 text-slate-800 mb-6">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600"><Heart size={20} /></div>
                        <h3 className="text-xl font-black">Aferição de Pressão Arterial</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Pressão Sistólica (mmHg)</label>
                          <input type="number" name="sistolica" value={pressao.sistolica} onChange={(e) => handleInputChange(e, 'pressao')} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Pressão Diastólica (mmHg)</label>
                          <input type="number" name="diastolica" value={pressao.diastolica} onChange={(e) => handleInputChange(e, 'pressao')} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Posição do Paciente</label>
                          <select name="posicao" value={pressao.posicao} onChange={(e) => handleInputChange(e, 'pressao')} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none">
                            <option>Sentado</option>
                            <option>Deitado</option>
                            <option>Em pé</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Membro Utilizado</label>
                          <select name="membro" value={pressao.membro} onChange={(e) => handleInputChange(e, 'pressao')} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none">
                            <option>Braço Esquerdo</option>
                            <option>Braço Direito</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Orientação / Observações</label>
                          <textarea name="orientacao" value={pressao.orientacao} onChange={(e) => handleInputChange(e, 'pressao')} rows={3} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none resize-none"></textarea>
                        </div>
                      </div>

                      {/* Complete V Diretrizes reference box */}
                      <div className="bg-red-50/60 border border-red-200 rounded-xl p-4 mt-4 text-xs text-slate-700 space-y-2">
                        <strong className="text-red-900 block font-black text-sm">Valores de Referência de Pressão Arterial:</strong>
                        <p className="text-[11px] text-slate-600 italic">fonte: V Diretrizes Brasileiras de Hipertensão Arterial (SBC / SBH / SBN)</p>
                        <table className="w-full text-left border-collapse mt-2 bg-white rounded-lg overflow-hidden border border-red-100">
                          <thead>
                            <tr className="bg-red-100/50 text-red-900 font-bold border-b border-red-100">
                              <th className="p-2 text-[11px]">Classificação</th>
                              <th className="p-2 text-[11px]">PAS (mmHg)</th>
                              <th className="p-2 text-[11px]">PAD (mmHg)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-red-50 text-[11px]">
                            <tr>
                              <td className="p-2 font-medium">Ótima</td>
                              <td className="p-2 font-mono">&lt; 120</td>
                              <td className="p-2 font-mono">&lt; 80</td>
                            </tr>
                            <tr>
                              <td className="p-2 font-medium">Normal</td>
                              <td className="p-2 font-mono">&lt; 130</td>
                              <td className="p-2 font-mono">&lt; 85</td>
                            </tr>
                            <tr>
                              <td className="p-2 font-medium">Limítrofe</td>
                              <td className="p-2 font-mono">130 - 139</td>
                              <td className="p-2 font-mono">85 - 89</td>
                            </tr>
                            <tr>
                              <td className="p-2 font-medium text-amber-700">Hipertensão Estágio 1</td>
                              <td className="p-2 font-mono">140 - 159</td>
                              <td className="p-2 font-mono">90 - 99</td>
                            </tr>
                            <tr>
                              <td className="p-2 font-medium text-orange-700">Hipertensão Estágio 2</td>
                              <td className="p-2 font-mono">160 - 179</td>
                              <td className="p-2 font-mono">100 - 109</td>
                            </tr>
                            <tr>
                              <td className="p-2 font-medium text-red-700">Hipertensão Estágio 3</td>
                              <td className="p-2 font-mono">&gt; 180</td>
                              <td className="p-2 font-mono">&gt; 110</td>
                            </tr>
                            <tr>
                              <td className="p-2 font-medium text-purple-700">Hipertensão Sistólica Isolada</td>
                              <td className="p-2 font-mono">&gt; 140</td>
                              <td className="p-2 font-mono">&lt; 90</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'temperatura' && servicesIncluded.temperatura && (
                    <motion.div key="temperatura" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                      <div className="flex items-center gap-3 text-slate-800 mb-6">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600"><Thermometer size={20} /></div>
                        <h3 className="text-xl font-black">Aferição de Temperatura Corporal</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Valor da Temperatura (ºC)</label>
                          <input type="number" step="0.1" name="valor" value={temperatura.valor} onChange={(e) => handleInputChange(e, 'temperatura')} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Horário</label>
                          <input type="time" name="horario" value={temperatura.horario} onChange={(e) => handleInputChange(e, 'temperatura')} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none" />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Orientação / Interferência</label>
                          <textarea name="orientacao" value={temperatura.orientacao} onChange={(e) => handleInputChange(e, 'temperatura')} rows={3} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none resize-none"></textarea>
                        </div>
                      </div>

                      {/* Complete Reference box for Temperatura */}
                      <div className="bg-orange-50/60 border border-orange-200 rounded-xl p-4 mt-4 text-xs text-slate-700 space-y-2">
                        <strong className="text-orange-900 block font-black text-sm">Valores de Referência de Temperatura Corporal:</strong>
                        <table className="w-full text-left border-collapse mt-2 bg-white rounded-lg overflow-hidden border border-orange-100">
                          <thead>
                            <tr className="bg-orange-100/50 text-orange-900 font-bold border-b border-orange-100">
                              <th className="p-2 text-[11px]">Classificação</th>
                              <th className="p-2 text-[11px]">Faixa Térmica</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-orange-50 text-[11px]">
                            <tr>
                              <td className="p-2 font-medium">Hipotermia</td>
                              <td className="p-2 font-mono">&lt; 35,0 ºC</td>
                            </tr>
                            <tr>
                              <td className="p-2 font-medium text-emerald-700">Normotermia</td>
                              <td className="p-2 font-mono">36,0 ºC a 37,2 ºC</td>
                            </tr>
                            <tr>
                              <td className="p-2 font-medium text-amber-700">Estado Febril (Subfebril)</td>
                              <td className="p-2 font-mono">37,3 ºC a 37,7 ºC</td>
                            </tr>
                            <tr>
                              <td className="p-2 font-medium text-red-700">Febre</td>
                              <td className="p-2 font-mono">&gt;= 37,8 ºC</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'injetaveis' && servicesIncluded.injetaveis && (
                    <motion.div key="injetaveis" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                      <div className="flex items-center gap-3 text-slate-800 mb-6">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600"><Syringe size={20} /></div>
                        <h3 className="text-xl font-black">Administração de Injetáveis</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nome do Medicamento e DCB</label>
                          <input type="text" name="nome" value={injetaveis.nome} onChange={(e) => handleInputChange(e, 'injetaveis')} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Via</label>
                          <select name="via" value={injetaveis.via} onChange={(e) => handleInputChange(e, 'injetaveis')} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none">
                            <option>Intramuscular (IM)</option>
                            <option>Subcutânea (SC)</option>
                            <option>Intradérmica (ID)</option>
                            <option>Intravenosa (IV)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Concentração / Forma</label>
                          <input type="text" name="concentracao" value={injetaveis.concentracao} onChange={(e) => handleInputChange(e, 'injetaveis')} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Fabricante</label>
                          <input type="text" name="fabricante" value={injetaveis.fabricante} onChange={(e) => handleInputChange(e, 'injetaveis')} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Lote</label>
                          <input type="text" name="lote" value={injetaveis.lote} onChange={(e) => handleInputChange(e, 'injetaveis')} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Validade</label>
                          <input type="text" placeholder="MM/AAAA" name="validade" value={injetaveis.validade} onChange={(e) => handleInputChange(e, 'injetaveis')} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Reg. MS</label>
                          <input type="text" name="registro" value={injetaveis.registro} onChange={(e) => handleInputChange(e, 'injetaveis')} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Local / Lado Administrado</label>
                          <input type="text" name="local" value={injetaveis.local} onChange={(e) => handleInputChange(e, 'injetaveis')} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Material Utilizado</label>
                          <input type="text" name="material" value={injetaveis.material} onChange={(e) => handleInputChange(e, 'injetaveis')} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Próxima Dose</label>
                          <input type="date" name="proximaDose" value={injetaveis.proximaDose} onChange={(e) => handleInputChange(e, 'injetaveis')} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none" />
                        </div>
                        <div className="sm:col-span-3">
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Posologia</label>
                          <input type="text" name="posologia" value={injetaveis.posologia} onChange={(e) => handleInputChange(e, 'injetaveis')} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none" />
                        </div>
                        <div className="sm:col-span-3">
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Plano de Intervenção (quando houver)</label>
                          <textarea name="plano" value={injetaveis.plano} onChange={(e) => handleInputChange(e, 'injetaveis')} rows={2} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none resize-none"></textarea>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-400 mb-4 shadow-sm">
                <FileText size={24} />
              </div>
              <h3 className="text-lg font-black text-slate-700">Nenhum Serviço Selecionado</h3>
              <p className="text-sm text-slate-500 mt-2 max-w-sm">
                Selecione os serviços prestados na aba ao lado para preencher os formulários correspondentes.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* History Modal */}
      {historyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-2xl w-full shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="text-blue-600" size={20} />
                <h3 className="text-lg font-black text-slate-900">Histórico de Declarações Emitidas</h3>
              </div>
              <button onClick={() => setHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="my-4 relative">
              <Search size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por paciente ou número..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {isLoadingHistory ? (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                  <Loader2 size={24} className="animate-spin text-blue-600" />
                  <span className="text-sm">Carregando histórico...</span>
                </div>
              ) : filteredHistory.length === 0 ? (
                <p className="py-12 text-center text-slate-400 text-sm">Nenhuma declaração salva encontrada.</p>
              ) : (
                filteredHistory.map((item) => (
                  <div key={item.id} className="p-4 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 flex items-center justify-between transition-all">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-red-600 text-xs px-2 py-0.5 bg-red-100 rounded">
                          Nº {item.sequenceNumber?.toString().padStart(6, '0')}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm">{item.patient?.nome || 'Paciente sem nome'}</h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        CPF: {item.patient?.cpf || 'Não inf.'} • Emitido em: {item.createdAt?.toDate ? format(item.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : 'Data recente'}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        generatePDF(item.sequenceNumber);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-xs font-bold shadow-sm transition-all"
                    >
                      <Download size={14} />
                      <span>Reemitir PDF</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
