import React from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../contexts/AuthContext';
import { 
  ClipboardCheck, 
  Download, 
  Thermometer, 
  Package, 
  Trash2, 
  RefreshCcw, 
  ArrowLeftRight,
  Eraser,
  Timer,
  Users,
  Activity,
  Syringe,
  Wrench,
  Loader2
} from 'lucide-react';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

const STANDARD_FORMS = [
  { id: 'temperatura', title: 'Controle de Temperatura', icon: Thermometer, description: 'Registro diário de temperaturas do refrigerador e ambiente.' },
  { id: 'recebimento', title: 'Recebimento de Medicamentos', icon: ArrowLeftRight, description: 'Checklist para conferência de mercadorias e integridade.' },
  { id: 'higienizacao', title: 'Registro de Higienização', icon: Eraser, description: 'Monitoramento da limpeza diária e pesada das instalações.' },
  { id: 'validade', title: 'Controle de Vencimento', icon: Timer, description: 'Monitoramento mensal de produtos próximos ao vencimento.' },
  { id: 'treinamento', title: 'Registro de Treinamento', icon: Users, description: 'Lista de presença e conteúdo dos treinamentos da equipe.' },
  { id: 'servicos', title: 'Declaração de Serviços', icon: Activity, description: 'Registro de aferição de pressão, glicemia e temperatura.' },
  { id: 'injetaveis', title: 'Registro de Injetáveis', icon: Syringe, description: 'Controle de aplicação de medicamentos injetáveis.' },
  { id: 'manutencao', title: 'Manutenção de Equipamentos', icon: Wrench, description: 'Registro de calibração, limpeza de AC e caixa d\'água.' },
  { id: 'queixas', title: 'Queixas Técnicas', icon: ClipboardCheck, description: 'Registro de desvios de qualidade e notificações (Notivisa).' },
  { id: 'caixa_dagua', title: 'Limpeza de Caixa D\'água', icon: RefreshCcw, description: 'Certificado e registro de limpeza semestral do reservatório.' },
  { id: 'descarte', title: 'Controle de Resíduos', icon: Trash2, description: 'Registro de coleta de resíduos químicos e infectantes.' },
];

export default function Forms() {
  const { drugstore } = useAuth();
  const [generating, setGenerating] = React.useState<string | null>(null);

  const downloadForm = (formId: string, formTitle: string) => {
    setGenerating(formId);
    console.log(`Iniciando download do formulário: ${formId} - ${formTitle}`);
    try {
      const doc = new jsPDF('l', 'mm', 'a4'); // Use landscape for better space
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
    
    // Header Table (Professional)
    autoTable(doc, {
      startY: 10,
      margin: { left: 10, right: 10 },
      styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, valign: 'middle' },
      columnStyles: {
        0: { cellWidth: 40, halign: 'center' },
        1: { cellWidth: 'auto', halign: 'center', fontStyle: 'bold', fontSize: 12 },
        2: { cellWidth: 50 }
      },
      body: [
        [
          { content: '', rowSpan: 2 }, // Empty for logo drawing
          { content: 'REGISTRO DE QUALIDADE / FORMULÁRIO', styles: { fillColor: [245, 245, 245] } },
          { content: `CÓDIGO: FOR-${formId.toUpperCase()}\nVERSÃO: 1.0\nDATA: ${format(new Date(), 'dd/MM/yyyy')}` }
        ],
        [
          { content: formTitle.toUpperCase() },
          { content: `EQUIPAMENTO/SETOR:\n____________________` }
        ]
      ],
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 0 && data.row.index === 0) {
          const centerX = data.cell.x + data.cell.width / 2;
          const centerY = data.cell.y + data.cell.height / 2;
          
          if (drugstore?.logoUrl) {
            try {
              // Calculate dimensions to fit in the cell
              const imgWidth = 30; 
              const imgHeight = 15; 
              doc.addImage(drugstore.logoUrl, 'PNG', centerX - (imgWidth / 2), centerY - (imgHeight / 2), imgWidth, imgHeight, undefined, 'FAST');
            } catch (e) {
              console.error("Error drawing custom logo in form:", e);
              doc.setFontSize(8);
              doc.setTextColor(100);
              doc.text(drugstore.name || 'DROGARIA', centerX, centerY, { align: 'center' });
            }
          } else {
            // Sky Blue Professional Logo (Consistent fallback)
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

    let startY = (doc as any).lastAutoTable.finalY + 10;

    // Dynamic Table Generation based on formId
    let headers: string[][] = [];
    let data: string[][] = [];
    let styles: any = { fontSize: 8, cellPadding: 3 };

    if (formId === 'temperatura') {
      headers = [['DIA', 'HORA', 'T. AMB (°C)', 'T. GEL (°C)', 'T. MÍN (°C)', 'T. MÁX (°C)', 'UR (%)', 'VISTO', 'OBSERVAÇÕES']];
      data = Array.from({ length: 31 }, (_, i) => [(i + 1).toString(), '', '', '', '', '', '', '', '']);
      styles.minCellHeight = 8;
    } else if (formId === 'recebimento') {
      headers = [['DATA', 'NF', 'FORNECEDOR', 'MEDICAMENTO', 'LOTE', 'VAL.', 'QTD', 'T. (°C)', 'EMB. OK?', 'VISTO']];
      data = Array(15).fill(['', '', '', '', '', '', '', '', 'SIM', '']);
    } else if (formId === 'higienizacao') {
      headers = [['ÁREA / EQUIPAMENTO', 'PROCEDIMENTO', 'PRODUTO', 'FREQ.', 'DATA', 'HORA', 'RESPONSÁVEL', 'VISTO']];
      data = [
        ['PISO / PAREDES', 'LIMPEZA ÚMIDA', 'DETERG. + HIPOCL.', 'DIÁRIA', '', '', '', ''],
        ['BANCADAS / BALCÕES', 'FRICÇÃO', 'ÁLCOOL 70%', 'DIÁRIA', '', '', '', ''],
        ['PRATELEIRAS', 'LIMPEZA SECA/ÚMIDA', 'PANO + ÁLCOOL', 'QUINZENAL', '', '', '', ''],
        ['GELADEIRA', 'LIMPEZA INTERNA', 'SABÃO NEUTRO', 'MENSAL', '', '', '', ''],
        ['SALA DE INJETÁVEIS', 'DESINFECÇÃO', 'ÁLCOOL 70%', 'CADA USO', '', '', '', ''],
        ['BANHEIROS', 'LIMPEZA PESADA', 'HIPOCLORITO', 'DIÁRIA', '', '', '', ''],
      ];
      data = [...data, ...Array(10).fill(['', '', '', '', '', '', '', ''])];
    } else if (formId === 'validade') {
      headers = [['CÓD.', 'DESCRIÇÃO DO PRODUTO', 'LOTE', 'VENCIMENTO', 'STATUS SINALIZ.', 'DESTINO (V/D/Q)', 'VISTO']];
      data = Array(18).fill(['', '', '', '', '', '', '']);
    } else if (formId === 'treinamento') {
      doc.setFontSize(9);
      doc.text(`TEMA: _________________________________________________________________________________________________________________`, 10, startY);
      startY += 7;
      doc.text(`INSTRUTOR: _________________________________________________ CARGO: ______________________ DATA: ____/____/_______`, 10, startY);
      startY += 7;
      doc.text(`CONTEÚDO: _____________________________________________________________________________________________________________`, 10, startY);
      startY += 10;
      headers = [['NOME DO PARTICIPANTE', 'FUNÇÃO', 'CARGA H.', 'ASSINATURA DO COLABORADOR']];
      data = Array(14).fill(['', '', '', '']);
    } else if (formId === 'servicos') {
      headers = [['DATA/HORA', 'CLIENTE', 'TELEFONE', 'SERVIÇO', 'RESULTADO', 'OBS/ENCAMINHAMENTO', 'VISTO FARM.']];
      data = Array(15).fill(['', '', '', '', '', '', '']);
    } else if (formId === 'injetaveis') {
      headers = [['DATA', 'PACIENTE', 'MEDICAMENTO', 'LOTE/VAL', 'VIA/LOCAL', 'PRESCRITOR', 'PROFISSIONAL', 'ASSINATURA']];
      data = Array(15).fill(['', '', '', '', '', '', '', '']);
    } else if (formId === 'manutencao') {
      headers = [['DATA', 'EQUIPAMENTO', 'TIPO (PREV/CORRET)', 'DESCRIÇÃO DO SERVIÇO', 'ORDEM SERV.', 'PRÓXIMA', 'RESP.']];
      data = Array(12).fill(['', '', '', '', '', '', '']);
    } else if (formId === 'queixas') {
      headers = [['DATA', 'PRODUTO', 'LOTE', 'FABRICANTE', 'NATUREZA DA QUEIXA', 'AÇÃO TOMADA', 'NOTIVISA?']];
      data = Array(12).fill(['', '', '', '', '', '', 'NÃO']);
    } else {
      headers = [['DATA', 'DESCRIÇÃO DA OCORRÊNCIA / ATIVIDADE', 'RESPONSÁVEL', 'VISTO RT']];
      data = Array(15).fill(['', '', '', '']);
    }

    autoTable(doc, {
      head: headers,
      body: data,
      startY: startY,
      theme: 'grid',
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1 },
      styles: styles
    });

    // Signatures at bottom
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    if (finalY < pageHeight - 30) {
      doc.setFontSize(8);
      doc.text('__________________________________________', 10, pageHeight - 20);
      doc.text('ASSINATURA RESPONSÁVEL TÉCNICO', 10, pageHeight - 15);
      
      doc.text('__________________________________________', pageWidth - 80, pageHeight - 20);
      doc.text('VISTO GERÊNCIA / QUALIDADE', pageWidth - 80, pageHeight - 15);
    }

    const pdfBlob = doc.output('blob');
    saveAs(pdfBlob, `Formulario_${formId}_${drugstore?.name?.replace(/\s+/g, '_')}.pdf`);
    console.log("PDF gerado com sucesso via file-saver");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Houve um erro ao gerar o PDF do formulário.");
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Formulários Padrão</h1>
        <p className="text-slate-500">Modelos prontos para impressão e controle manual na drogaria.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {STANDARD_FORMS.map((form) => (
          <div key={form.id} className="card flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="space-y-4">
              <div className="p-3 bg-sky-50 text-sky-600 rounded-xl w-fit">
                <form.icon size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">{form.title}</h3>
                <p className="text-sm text-slate-500 mt-1">{form.description}</p>
              </div>
            </div>
            <button
              disabled={generating === form.id}
              onClick={() => downloadForm(form.id, form.title)}
              className="mt-6 flex items-center justify-center space-x-2 text-sky-600 font-medium py-2 px-4 rounded-lg bg-sky-50 hover:bg-sky-100 transition-colors disabled:opacity-50"
            >
              {generating === form.id ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
              <span>{generating === form.id ? 'Gerando...' : 'Baixar PDF'}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
