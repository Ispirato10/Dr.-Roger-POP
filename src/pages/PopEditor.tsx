import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  ArrowLeft, 
  Save, 
  FileDown, 
  FileText,
  Search,
  Trash2,
  Edit,
  Clock,
  History, 
  ShieldCheck, 
  Loader2,
  BookOpen,
  Eye,
  User,
  Package,
  ListOrdered,
  Link2,
  Layout,
  Plus,
  Image as ImageIcon,
  X,
  Type,
  AlignJustify,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { POP_TEMPLATES, POPTemplate } from '../constants/templates';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, ImageRun, Table, TableRow, TableCell, WidthType, BorderStyle, VerticalAlign } from 'docx';
import { useFieldArray } from 'react-hook-form';
import { saveAs } from 'file-saver';
import { optimizeImage } from '../lib/imageOptimizer';
import { 
  saveLocalPop, 
  getLocalPopById, 
  deleteLocalPop, 
  reportQuotaExceeded, 
  isQuotaExceededError,
  addToPendingSyncQueue 
} from '../lib/storageSync';
import PopVisualizer from '../components/PopVisualizer';
import { generatePopPDF } from '../lib/pdfGenerator';

const popSchema = z.object({
  title: z.string().min(3, "Título obrigatório"),
  code: z.string().min(2, "Código obrigatório"),
  objective: z.string().min(5, "Objetivo obrigatório"),
  applicationField: z.string().min(3, "Campo de aplicação obrigatório"),
  definitions: z.string().optional(),
  siglas: z.string().optional(),
  elaboradoPor: z.string().optional(),
  revisadoPor: z.string().optional(),
  anoRevisao: z.string().optional(),
  responsible: z.string().min(2, "Responsável obrigatório"),
  materials: z.string().optional(),
  epi: z.string().optional(),
  riscos: z.string().optional(),
  procedure: z.string().min(10, "Procedimento obrigatório"),
  monitoring: z.string().optional(),
  reviewFrequency: z.string().optional(),
  references: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']),
  version: z.number(),
  images: z.array(z.object({
    url: z.string(),
    caption: z.string().optional(),
  })).optional(),
  customFields: z.array(z.object({
    label: z.string().min(1, "Rótulo obrigatório"),
    value: z.string().optional(),
    type: z.string().optional(), // 'text' | 'textarea' | 'select' | 'checklist' | 'date' | 'signature'
    options: z.string().optional(),   // semicolon or comma separated options
    width: z.string().optional(),   // 'full' | 'half'
    required: z.boolean().optional(),
    placeholder: z.string().optional(),
    helpText: z.string().optional(),
  })).optional(),
  tables: z.array(z.object({
    title: z.string().optional(),
    headers: z.array(z.string()),
    rows: z.array(z.array(z.string())),
  })).optional(),
});

type PopFormValues = z.infer<typeof popSchema>;

// Helper functions to parse and convert oklab() and oklch() color models to fallback standard rgb()/rgba() colors.
// This is necessary because html2canvas's layout rendering engine does not have native support for parsing oklch/oklab.
function parseOklabOrOklch(colorStr: string): string {
  const isOklch = colorStr.toLowerCase().startsWith('oklch');
  const isOklab = colorStr.toLowerCase().startsWith('oklab');
  if (!isOklch && !isOklab) return colorStr;

  const match = colorStr.match(/\(([^)]+)\)/);
  if (!match) return colorStr;

  const content = match[1].trim();
  const cleanContent = content.replace(/\//g, ' ').replace(/,/g, ' ').replace(/\s+/g, ' ');
  const parts = cleanContent.split(' ');

  if (parts.length < 3) return colorStr;

  const L = parseFloat(parts[0]);
  let a = 0;
  let b = 0;
  let alpha = '1';

  if (isOklch) {
    const C = parseFloat(parts[1]);
    const H = parseFloat(parts[2]);
    a = C * Math.cos((H * Math.PI) / 180);
    b = C * Math.sin((H * Math.PI) / 180);
  } else {
    a = parseFloat(parts[1]);
    b = parseFloat(parts[2]);
  }

  if (parts.length >= 4) {
    let rawAlpha = parts[3];
    if (rawAlpha.endsWith('%')) {
      alpha = (parseFloat(rawAlpha) / 100).toString();
    } else {
      alpha = rawAlpha;
    }
  }

  // Oklab to linear sRGB
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const b_val = -0.0041960863 * l - 0.7034186145 * m + 1.7076147010 * s;

  const lrgb2srgb = (c: number): number => {
    const abs = Math.abs(c);
    const res = abs > 0.0031308 ? 1.055 * Math.pow(abs, 1 / 2.4) - 0.055 : 12.92 * abs;
    return Math.min(255, Math.max(0, Math.round((c < 0 ? -res : res) * 255)));
  };

  const R = lrgb2srgb(r);
  const G = lrgb2srgb(g);
  const B = lrgb2srgb(b_val);

  return parseFloat(alpha) === 1 ? `rgb(${R}, ${G}, ${B})` : `rgba(${R}, ${G}, ${B}, ${alpha})`;
}

function replaceOklabAndOklchInString(str: string): string {
  if (typeof str !== 'string') return str;
  if (!str.includes('oklch') && !str.includes('oklab')) return str;

  return str.replace(/(oklch|oklab)\(([^)]+)\)/gi, (match) => {
    try {
      return parseOklabOrOklch(match);
    } catch (e) {
      console.warn("Failed standard conversion: fallback to solid color", e);
      return 'rgb(59, 130, 246)';
    }
  });
}

export default function PopEditor() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'preview' ? 'preview' : 'edit';
  
  const navigate = useNavigate();
  const { drugstore, user } = useAuth();
  const [loading, setLoading] = React.useState(!!id);
  const [saving, setSaving] = React.useState(false);
  const [showTemplates, setShowTemplates] = React.useState(!id);
  const [viewMode, setViewMode] = React.useState<'edit' | 'preview'>(initialMode);
  const [isExportingPDF, setIsExportingPDF] = React.useState(false);
  const [exportStep, setExportStep] = React.useState('');

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors } } = useForm<PopFormValues>({
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
      images: [],
      customFields: [],
      tables: [],
    }
  });

  const { fields: imageFields, append: appendImage, remove: removeImage } = useFieldArray({
    control,
    name: "images"
  });

  const { fields: customFieldItems, append: appendCustomField, remove: removeCustomField } = useFieldArray({
    control,
    name: "customFields"
  });

  const { fields: tableFields, append: appendTable, remove: removeTable } = useFieldArray({
    control,
    name: "tables"
  });

  const currentValues = watch();

  // Helper to add a column to a table
  const addColumn = (tableIndex: number) => {
    const table = currentValues.tables?.[tableIndex];
    if (!table) return;
    const headers = [...(table.headers || [])];
    headers.push('');
    setValue(`tables.${tableIndex}.headers`, headers);
    
    const rows = [...(table.rows || [])];
    const updatedRows = rows.map(r => [...r, '']);
    setValue(`tables.${tableIndex}.rows`, updatedRows);
  };

  // Helper to delete a column from a table
  const deleteColumn = (tableIndex: number, colIndex: number) => {
    const table = currentValues.tables?.[tableIndex];
    if (!table) return;
    const headers = [...(table.headers || [])];
    if (headers.length <= 1) return; // Must have at least one column
    headers.splice(colIndex, 1);
    setValue(`tables.${tableIndex}.headers`, headers);
    
    const rows = [...(table.rows || [])];
    const updatedRows = rows.map(row => {
      const newRow = [...row];
      newRow.splice(colIndex, 1);
      return newRow;
    });
    setValue(`tables.${tableIndex}.rows`, updatedRows);
  };

  // Helper to move column left or right
  const moveColumn = (tableIndex: number, colIndex: number, direction: 'left' | 'right') => {
    const table = currentValues.tables?.[tableIndex];
    if (!table) return;
    const headers = [...(table.headers || [])];
    const targetIndex = direction === 'left' ? colIndex - 1 : colIndex + 1;
    if (targetIndex < 0 || targetIndex >= headers.length) return;
    
    // Swap header text
    const tempHeader = headers[colIndex];
    headers[colIndex] = headers[targetIndex];
    headers[targetIndex] = tempHeader;
    setValue(`tables.${tableIndex}.headers`, headers);
    
    // Swap row cells
    const rows = [...(table.rows || [])];
    const updatedRows = rows.map(row => {
      const newRow = [...row];
      const tempCell = newRow[colIndex];
      newRow[colIndex] = newRow[targetIndex];
      newRow[targetIndex] = tempCell;
      return newRow;
    });
    setValue(`tables.${tableIndex}.rows`, updatedRows);
  };

  // Helper to move row up or down
  const moveRow = (tableIndex: number, rowIndex: number, direction: 'up' | 'down') => {
    const table = currentValues.tables?.[tableIndex];
    if (!table) return;
    const rows = [...(table.rows || [])];
    const targetIndex = direction === 'up' ? rowIndex - 1 : rowIndex + 1;
    if (targetIndex < 0 || targetIndex >= rows.length) return;
    
    const tempRow = rows[rowIndex];
    rows[rowIndex] = rows[targetIndex];
    rows[targetIndex] = tempRow;
    setValue(`tables.${tableIndex}.rows`, rows);
  };

  // Helper to add a row to a table
  const addRow = (tableIndex: number) => {
    const table = currentValues.tables?.[tableIndex];
    if (!table) return;
    const rows = [...(table.rows || [])];
    const colCount = (table.headers || []).length || 2;
    rows.push(new Array(colCount).fill(''));
    setValue(`tables.${tableIndex}.rows`, rows);
  };

  // Helper to move custom fields up or down
  const moveCustomField = (index: number, direction: 'up' | 'down') => {
    const fields = [...(currentValues.customFields || [])];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;
    const temp = fields[index];
    fields[index] = fields[targetIndex];
    fields[targetIndex] = temp;
    setValue('customFields', fields);
  };

  // Helper to load complete professional form templates
  const loadFormTemplate = (templateType: 'temperature' | 'hygiene' | 'narcotics') => {
    let fields: any[] = [];
    if (templateType === 'temperature') {
      fields = [
        { label: 'Temperatura do Termohigrômetro (ºC)', value: '', type: 'text', placeholder: 'Ex: 5,4 ºC', width: 'half', required: true, helpText: 'Preencher a temperatura atual do refrigerador' },
        { label: 'Umidade Relativa do Ar (%)', value: '', type: 'text', placeholder: 'Ex: 45%', width: 'half', required: true, helpText: 'Preencher a umidade atual do ambiente' },
        { label: 'Equipamento dentro das especificações?', value: 'Sim', type: 'select', options: 'Sim, Não', width: 'full', required: true, helpText: 'Indique se os valores estão dentro da margem aceitável' },
        { label: 'Ação corretiva se desvio', value: '', type: 'textarea', placeholder: 'Descreva a ação tomada caso estivesse fora...', width: 'full', required: false },
        { label: 'Assinatura do Farmacêutico ou Operador', value: '', type: 'signature', width: 'full', required: true }
      ];
    } else if (templateType === 'hygiene') {
      fields = [
        { label: 'Data e Hora da Higienização', value: '', type: 'date', width: 'half', required: true },
        { label: 'Responsável pela Higienização', value: '', type: 'text', placeholder: 'Nome completo...', width: 'half', required: true },
        { label: 'Itens Verificados e Limpos', value: '', type: 'checklist', options: 'Bancadas e pias higienizadas; Lixeiras esvaziadas; Pisos limpos e secos; Utensílios esterilizados', width: 'full', required: true, helpText: 'Marque todos os itens concluídos na rotina' },
        { label: 'Problemas encontrados ou observações', value: 'Nenhuma irregularidade encontrada.', type: 'textarea', placeholder: 'Ex: Descreva vazamentos...', width: 'full', required: false },
        { label: 'Assinatura do Inspetor de Turno', value: '', type: 'signature', width: 'full', required: true }
      ];
    } else if (templateType === 'narcotics') {
      fields = [
        { label: 'Nome Completo do Comprador', value: '', type: 'text', placeholder: 'Paciente ou portador...', width: 'full', required: true },
        { label: 'Documento de Identidade (RG/CPF)', value: '', type: 'text', placeholder: 'Documento oficial...', width: 'half', required: true },
        { label: 'Número da Receita de Controle Especial', value: '', type: 'text', placeholder: 'Ex: A1-12345/2026', width: 'half', required: true },
        { label: 'Medicamento Dispensado', value: '', type: 'text', placeholder: 'Ex: Cloridrato de Metilfenidato 10mg', width: 'full', required: true },
        { label: 'Dados do Médico (Nome e CRM)', value: '', type: 'text', placeholder: 'Nome do prescritor com CRM/UF', width: 'full', required: true },
        { label: 'Receita retida e carimbada?', value: 'Sim', type: 'select', options: 'Sim, Não', width: 'half', required: true },
        { label: 'Assinatura do Receptor / Paciente', value: '', type: 'signature', width: 'full', required: true }
      ];
    }
    setValue('customFields', fields);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        alert("A imagem selecionada é muito grande! Escolha um arquivo de até 15MB.");
        return;
      }
      try {
        // Automatically optimize image (downscale to max 800x600, target 60-90KB)
        const result = await optimizeImage(file, {
          maxWidth: 800,
          maxHeight: 600,
          quality: 0.8,
          format: 'image/jpeg',
          maxSizeKb: 90
        });
        appendImage({ url: result.base64, caption: '' });
      } catch (err: any) {
        console.error("Image optimization error:", err);
        alert("Erro ao processar imagem: " + (err?.message || "Tente outro arquivo."));
      }
    }
  };

  const generateDOCX = async () => {
    const children: any[] = [];

    // Header Table
    let logoImageRun: ImageRun | null = null;
    if (drugstore?.logoUrl) {
      try {
        const base64Data = drugstore.logoUrl.split(',')[1];
        const binaryString = window.atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        logoImageRun = new ImageRun({
          data: bytes,
          transformation: { width: 80, height: 50 },
        } as any);
      } catch (e) {
        console.error("Error processing logo for DOCX header:", e);
      }
    }

    const headerTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: logoImageRun ? [new Paragraph({ children: [logoImageRun], alignment: AlignmentType.CENTER })] : [
                new Paragraph({
                  children: [
                    new TextRun({ text: "DR. ROGER ", bold: true, size: 24, color: "3b82f6" }),
                    new TextRun({ text: "POP", bold: true, size: 24, color: "0f172a" }),
                  ],
                  alignment: AlignmentType.CENTER,
                })
              ],
              width: { size: 25, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.CENTER,
              shading: { fill: "F8FAFC" },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  text: "PROCEDIMENTO OPERACIONAL PADRÃO",
                  heading: HeadingLevel.HEADING_2,
                  alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                  children: [new TextRun({ text: currentValues.title?.toUpperCase() || "SEM TÍTULO", bold: true, size: 28 })],
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 100 },
                }),
              ],
              width: { size: 50, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.CENTER,
            }),
            new TableCell({
              children: [
                new Paragraph({ children: [new TextRun({ text: `CÓDIGO:`, bold: true, size: 16 }), new TextRun({ text: ` ${currentValues.code || "-"}` , size: 16})] }),
                new Paragraph({ children: [new TextRun({ text: `VERSÃO:`, bold: true, size: 16 }), new TextRun({ text: ` ${currentValues.version}.0` , size: 16})] }),
                new Paragraph({ children: [new TextRun({ text: `DATA:`, bold: true, size: 16 }), new TextRun({ text: ` ${format(new Date(), "dd/MM/yyyy")}` , size: 16})] }),
              ],
              width: { size: 25, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.CENTER,
              shading: { fill: "F8FAFC" },
            }),
          ],
        }),
      ],
    });

    children.push(headerTable);
    children.push(new Paragraph({ text: "", spacing: { after: 300 } }));

    const standardSections = [
      { label: "1. OBJETIVO", value: currentValues.objective },
      { label: "2. SIGLAS", value: currentValues.siglas },
      { label: "3. CAMPO DE APLICAÇÃO", value: currentValues.applicationField },
      { label: "4. DEFINIÇÕES", value: currentValues.definitions },
      { label: "5. RESPONSÁVEL", value: currentValues.responsible },
      { label: "6. ELABORADO POR", value: currentValues.elaboradoPor },
      { label: "7. REVISADO POR", value: currentValues.revisadoPor },
      { label: "8. MATERIAIS NECESSÁRIOS", value: currentValues.materials },
      { label: "9. EQUIPAMENTOS DE PROTEÇÃO (EPI)", value: currentValues.epi },
      { label: "10. RISCOS DA ATIVIDADE", value: currentValues.riscos },
      { label: "11. PROCEDIMENTO DETALHADO", value: currentValues.procedure },
      { label: "12. MONITORAMENTO E VERIFICAÇÃO", value: currentValues.monitoring },
      { label: "13. FREQUÊNCIA DE REVISÃO", value: currentValues.reviewFrequency },
      { label: "14. REFERÊNCIAS NORMATIVAS", value: currentValues.references },
    ];

    standardSections.forEach(section => {
      children.push(new Paragraph({
        children: [new TextRun({ text: section.label, bold: true, size: 22 })],
        spacing: { before: 300, after: 100 },
        shading: { fill: "F2F2F2" },
      }));

      // Split text into lines to handle paragraphs correctly in DOCX
      const lines = (section.value || "-").split('\n');
      lines.forEach(line => {
        if (line.trim() || line === "") {
          children.push(new Paragraph({
            text: line,
            spacing: { after: 100 },
            alignment: AlignmentType.LEFT,
          }));
        }
      });
    });

    // Add Custom Fields to DOCX
    if (currentValues.customFields && currentValues.customFields.length > 0) {
      children.push(new Paragraph({
        children: [new TextRun({ text: "9. INFORMAÇÕES ADICIONAIS", bold: true, size: 22 })],
        spacing: { before: 300, after: 100 },
        shading: { fill: "F2F2F2" },
      }));
      currentValues.customFields.forEach(field => {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: `${field.label.toUpperCase()}: `, bold: true }),
            new TextRun({ text: field.value }),
          ],
          spacing: { after: 100 },
          alignment: AlignmentType.LEFT,
        }));
      });
    }

    // Add Tables to DOCX
    if (currentValues.tables && currentValues.tables.length > 0) {
      currentValues.tables.forEach(tableData => {
        if (tableData.title) {
          children.push(new Paragraph({
            children: [new TextRun({ text: tableData.title.toUpperCase(), bold: true, size: 20 })],
            spacing: { before: 200, after: 100 }
          }));
        }

        const table = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: tableData.headers.map(h => new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })], alignment: AlignmentType.CENTER })],
                shading: { fill: "F2F2F2" }
              }))
            }),
            ...tableData.rows.map(row => new TableRow({
              children: row.map(cell => new TableCell({
                children: [new Paragraph({ text: cell, alignment: AlignmentType.CENTER })]
              }))
            }))
          ]
        });
        children.push(table);
        children.push(new Paragraph({ text: "", spacing: { after: 200 } }));
      });
    }

    // Add Images to DOCX
    if (currentValues.images && currentValues.images.length > 0) {
      children.push(new Paragraph({
        children: [new TextRun({ text: "ANEXO: IMAGENS ILUSTRATIVAS", bold: true, size: 22 })],
        spacing: { before: 400, after: 200 },
        shading: { fill: "F2F2F2" },
      }));

      for (const img of currentValues.images) {
        try {
          const base64Data = img.url.split(',')[1];
          const binaryString = window.atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          children.push(new Paragraph({
            children: [
              new ImageRun({
                data: bytes,
                transformation: { width: 500, height: 300 },
              } as any),
            ],
            alignment: AlignmentType.CENTER,
          }));
          if (img.caption) {
            children.push(new Paragraph({
              text: img.caption,
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
            }));
          }
        } catch (e) {
          console.error("Error adding image to DOCX:", e);
        }
      }
    }

    // Signatures
    children.push(new Paragraph({ text: "", spacing: { before: 500 } }));
    const signatureTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({ children: [new TextRun({ text: "ELABORADO POR:", bold: true, size: 16 })] }),
                new Paragraph({ text: "\n\n_______________________\nResponsável Técnico", alignment: AlignmentType.CENTER, spacing: { before: 400 } }),
                new Paragraph({ text: `Data: ${format(new Date(), "dd/MM/yyyy")}`, alignment: AlignmentType.CENTER }),
              ],
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
            }),
            new TableCell({
              children: [
                new Paragraph({ children: [new TextRun({ text: "VERIFICADO POR:", bold: true, size: 16 })] }),
                new Paragraph({ text: "\n\n_______________________\nGerência", alignment: AlignmentType.CENTER, spacing: { before: 400 } }),
                new Paragraph({ text: `Data: ${format(new Date(), "dd/MM/yyyy")}`, alignment: AlignmentType.CENTER }),
              ],
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
            }),
            new TableCell({
              children: [
                new Paragraph({ children: [new TextRun({ text: "APROVADO POR:", bold: true, size: 16 })] }),
                new Paragraph({ text: "\n\n_______________________\nDiretoria", alignment: AlignmentType.CENTER, spacing: { before: 400 } }),
                new Paragraph({ text: `Data: ${format(new Date(), "dd/MM/yyyy")}`, alignment: AlignmentType.CENTER }),
              ],
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
            }),
          ],
        }),
      ],
    });
    children.push(signatureTable);

    const doc = new Document({
      sections: [{
        properties: {},
        children: children,
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${currentValues.code || "POP"}_${currentValues.title}.docx`);
  };


  const fetchPop = async () => {
    if (!id) return;
    setLoading(true);
    console.log("Fetching POP:", id);
    try {
      const docRef = doc(db, 'pops', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log("POP Data correctly fetched from Firestore:", data.title);
        
        // Parse tables safely from Firestore format to UI format: { cells: string[] }[] -> string[][]
        const parsedTables = (data.tables || []).map((t: any) => ({
          title: t.title || '',
          headers: t.headers || [],
          rows: (t.rows || []).map((row: any) => {
            if (row && typeof row === 'object' && Array.isArray(row.cells)) {
              return row.cells;
            }
            return Array.isArray(row) ? row : [];
          })
        }));

        // Ensure standard fields are populated even if missing in Firestore
        const resetData: PopFormValues = {
          title: data.title || '',
          code: data.code || '',
          objective: data.objective || '',
          applicationField: data.applicationField || '',
          definitions: data.definitions || '',
          siglas: data.siglas || '',
          elaboradoPor: data.elaboradoPor || '',
          revisadoPor: data.revisadoPor || '',
          anoRevisao: data.anoRevisao || '',
          responsible: data.responsible || '',
          materials: data.materials || '',
          epi: data.epi || '',
          riscos: data.riscos || '',
          procedure: data.procedure || '',
          monitoring: data.monitoring || '',
          reviewFrequency: data.reviewFrequency || 'Anual',
          references: data.references || '',
          category: data.category || 'GERAL',
          status: data.status || 'draft',
          version: data.version || 1,
          images: data.images || [],
          customFields: (data.customFields || []).map((f: any) => ({
            label: f.label || '',
            value: f.value || '',
            type: f.type || 'text',
            options: f.options || '',
            width: f.width || 'full',
            required: typeof f.required === 'boolean' ? f.required : false,
            placeholder: f.placeholder || '',
            helpText: f.helpText || '',
          })),
          tables: parsedTables,
        };

        reset(resetData);
        // Also save to local cache for instant access
        saveLocalPop({ id, ...resetData, drugstoreId: drugstore?.id });
        if (!resetData.title) console.warn("Attention: POP title is empty in the database document!");
      } else {
        // Fallback to local storage
        const localPop = getLocalPopById(id);
        if (localPop) {
          reset(localPop);
        } else {
          console.error("POP document not found in Firestore or Local:", id);
          alert("Documento não encontrado.");
          navigate('/pops');
        }
      }
    } catch (error) {
      console.error("Error fetching POP:", error);
      if (isQuotaExceededError(error)) {
        reportQuotaExceeded(error, `fetchPop:${id}`);
      }
      // Check local cache
      const localPop = getLocalPopById(id);
      if (localPop) {
        reset(localPop);
      } else {
        handleFirestoreError(error, OperationType.GET, `pops/${id}`);
      }
    } finally {
      setTimeout(() => setLoading(false), 100);
    }
  };

  React.useEffect(() => {
    if (id) fetchPop();
  }, [id]);

  React.useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'preview') setViewMode('preview');
    else setViewMode('edit');
  }, [searchParams]);

  const applyTemplate = (template: POPTemplate) => {
    setValue('title', template.title);
    setValue('objective', template.objective);
    setValue('applicationField', template.applicationField || 'Toda a drogaria');
    setValue('definitions', template.definitions || '-');
    setValue('siglas', template.siglas || '');
    setValue('elaboradoPor', drugstore?.name || '');
    setValue('revisadoPor', '');
    setValue('anoRevisao', new Date().getFullYear().toString());
    setValue('responsible', template.responsible);
    setValue('materials', template.materials);
    setValue('epi', template.epi || 'Avental branco, identificação.');
    setValue('riscos', template.riscos || 'Erros de processo, contaminação.');
    setValue('procedure', template.procedure);
    setValue('monitoring', template.monitoring || '-');
    setValue('reviewFrequency', template.reviewFrequency || 'Anual');
    setValue('references', template.references);
    setValue('category', template.category || 'GERAL');
    setValue('code', template.code || `POP-${template.id.toUpperCase().substring(0, 4)}-01`);
    setValue('images', template.images || []);
    setValue('customFields', []);
    setValue('tables', template.tables || []);
    setShowTemplates(false);
  };

  const onSubmit = async (values: PopFormValues) => {
    if (!drugstore || !user) return;
    setSaving(true);
    const now = new Date().toISOString();
    
    // Sanitize tables to avoid Firestore nested arrays error: string[][] -> { cells: string[] }[]
    const safeTables = (values.tables || []).map(table => ({
      ...table,
      rows: (table.rows || []).map((row: any) => {
        if (Array.isArray(row)) {
          return { cells: row };
        }
        return row;
      })
    }));

    const targetId = id || `pop_${Date.now()}`;
    const popData = {
      ...values,
      id: targetId,
      tables: safeTables,
      drugstoreId: drugstore.id,
      ownerId: drugstore.id,
      authorId: user.uid,
      updatedAt: now,
    };

    // 1. Save locally FIRST to guarantee 0 data loss
    saveLocalPop(popData);

    try {
      if (id && !id.startsWith('pop_')) {
        await updateDoc(doc(db, 'pops', id), popData);
      } else {
        const newDocRef = await addDoc(collection(db, 'pops'), {
          ...popData,
          createdAt: now,
        });
        saveLocalPop({ ...popData, id: newDocRef.id });
        if (!id) {
          navigate(`/pops/edit/${newDocRef.id}`);
        }
      }
    } catch (error: any) {
      console.warn("Cloud write failed, stored in local persistence:", error);
      if (isQuotaExceededError(error)) {
        reportQuotaExceeded(error, 'savePop');
        addToPendingSyncQueue({
          collectionName: 'pops',
          docId: targetId,
          action: id ? 'update' : 'add',
          data: popData
        });
        if (!id) {
          navigate(`/pops/edit/${targetId}`);
        }
      } else {
        handleFirestoreError(error, OperationType.WRITE, id ? `pops/${id}` : 'pops');
      }
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
    
    // Delete from local cache
    deleteLocalPop(id);

    try {
      if (!id.startsWith('pop_')) {
        await deleteDoc(doc(db, 'pops', id));
      }
      navigate('/pops');
    } catch (error: any) {
      console.error("Error deleting from cloud:", error);
      if (isQuotaExceededError(error)) {
        reportQuotaExceeded(error, `deletePop:${id}`);
        addToPendingSyncQueue({
          collectionName: 'pops',
          docId: id,
          action: 'delete'
        });
        navigate('/pops');
      } else {
        handleFirestoreError(error, OperationType.DELETE, `pops/${id}`);
        navigate('/pops');
      }
    } finally {
      setDeleting(false);
    }
  };

  const generatePDF = async () => {
    setIsExportingPDF(true);
    setExportStep('Compilando vetores gráficos e imagens oficiais do POP...');
    try {
      const pdf = await generatePopPDF(currentValues, drugstore);
      setExportStep('Iniciando transferência segura do arquivo...');
      const cleanTitle = (currentValues.title || 'Procedimento').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      const filename = `POP_${currentValues.code || 'XXX'}_${cleanTitle}.pdf`;
      pdf.save(filename);
    } catch (e: any) {
      console.error("Error generating clean vector PDF in editor:", e);
      alert("Erro ao exportar PDF de alta fidelidade: " + e.message);
    } finally {
      setIsExportingPDF(false);
      setExportStep('');
    }
  };

  const [templateSearch, setTemplateSearch] = React.useState('');
  const filteredTemplates = POP_TEMPLATES.filter(t => 
    t.title.toLowerCase().includes(templateSearch.toLowerCase()) || 
    t.category.toLowerCase().includes(templateSearch.toLowerCase())
  );

  if (loading) return <div className="py-20 text-center font-bold text-slate-400 uppercase tracking-widest animate-pulse">Carregando POP...</div>;

  return (
    <div className="space-y-10 px-1 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl shadow-xl shadow-blue-500/20 flex items-center justify-center border border-white/20">
              <ShieldCheck size={32} className="drop-shadow-md" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-full shadow-md border border-slate-50">
              <FileText size={14} className="text-blue-600" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              {id ? (currentValues.title || 'Carregando...') : 'Novo POP'}
              <span className="text-[10px] bg-blue-50 text-blue-600 font-black px-2.5 py-1 rounded-full uppercase tracking-widest border border-blue-100">Editor</span>
            </h1>
            <p className="text-sm text-slate-400 font-bold tracking-tight uppercase mt-0.5">
              {currentValues.code ? `${currentValues.code} • ` : ''} Gestão Normativa
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl mr-4">
            <button 
              onClick={() => setViewMode('edit')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'edit' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Edit size={14} />
              Editor
            </button>
            <button 
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'preview' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Eye size={14} />
              Visualizar
            </button>
          </div>

          <button onClick={() => navigate('/pops')} className="flex items-center text-slate-500 hover:text-slate-900 transition-colors text-sm font-bold tracking-tight group">
            <ArrowLeft size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" />
            Voltar à Biblioteca
          </button>
          
          <div className="h-8 w-px bg-slate-100 hidden md:block mx-2"></div>
          <div className="flex items-center gap-2">
            {id && (
              <div className="flex items-center gap-2 mr-2">
                <button 
                  onClick={generatePDF} 
                  className="w-10 h-10 flex items-center justify-center text-slate-600 bg-white border border-slate-100 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all shadow-sm group"
                  title="Exportar PDF"
                >
                  <FileDown size={18} className="group-hover:translate-y-0.5 transition-transform" />
                </button>
                <button 
                  onClick={generateDOCX} 
                  className="w-10 h-10 flex items-center justify-center text-slate-600 bg-white border border-slate-100 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all shadow-sm group"
                  title="Exportar DOCX"
                >
                  <FileText size={18} className="group-hover:translate-y-0.5 transition-transform" />
                </button>
              </div>
            )}
            <button 
              disabled={saving}
              onClick={handleSubmit(onSubmit)}
              className="btn-primary flex items-center gap-3 min-w-[140px] justify-center"
            >
              {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              <span className="uppercase tracking-widest text-xs font-black">{saving ? 'Salvando...' : 'Salvar POP'}</span>
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

      {/* PopVisualizer always mounted so that its page elements are always available in the DOM for background pdf generation */}
      <div className={viewMode === 'preview' ? "h-[calc(100vh-120px)] min-h-[800px]" : "fixed top-[-9999px] left-[-9999px] pointer-events-none opacity-0"}>
        <PopVisualizer 
          data={currentValues} 
          drugstore={drugstore} 
          onDownloadPDF={generatePDF}
        />
      </div>

      {viewMode !== 'preview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-8">
          <div className="card shadow-xl shadow-slate-200/50 border-none p-10 space-y-10 bg-white">
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Título do Procedimento</label>
                  <input {...register('title')} className="input-field bg-slate-50 border-transparent focus:bg-white text-lg font-black tracking-tight" placeholder="Ex: Dispensação de Psicotrópicos" />
                  {errors.title && <p className="text-xs text-red-500 font-bold">{errors.title.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Código Identificador</label>
                  <input {...register('code')} className="input-field bg-slate-50 border-transparent focus:bg-white font-mono font-bold" placeholder="POP-ADM-01" />
                  {errors.code && <p className="text-xs text-red-500 font-bold">{errors.code.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Categoria</label>
                  <input {...register('category')} className="input-field bg-slate-50 border-transparent focus:bg-white font-bold" placeholder="Ex: GERAL, DISPENSAÇÃO..." />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none flex items-center gap-2">
                  <BookOpen size={14} className="text-blue-500" /> Objetivo do Processo
                </label>
                <textarea {...register('objective')} rows={3} className="input-field bg-slate-50 border-transparent focus:bg-white resize-none" placeholder="Descreva de forma clara e objetiva a finalidade deste procedimento..." />
                {errors.objective && <p className="text-xs text-red-500 font-bold">{errors.objective.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Campo de Aplicação</label>
                  <input {...register('applicationField')} className="input-field bg-slate-50 border-transparent focus:bg-white" placeholder="Ex: Setor de dispensação, recepção..." />
                  {errors.applicationField && <p className="text-xs text-red-500 font-bold">{errors.applicationField.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Frequência de Revisão</label>
                  <select {...register('reviewFrequency')} className="input-field bg-slate-50 border-transparent focus:bg-white appearance-none cursor-pointer">
                    <option value="Anual">Anual</option>
                    <option value="Semestral">Semestral</option>
                    <option value="Mensal">Mensal</option>
                    <option value="Sempre que necessário">Sempre que necessário</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Definições e Termos Técnicos</label>
                <textarea {...register('definitions')} rows={2} className="input-field bg-slate-50 border-transparent focus:bg-white resize-none" placeholder="Explique siglas e termos técnicos utilizados no documento..." />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Siglas e Abreviaturas</label>
                <textarea {...register('siglas')} rows={2} className="input-field bg-slate-50 border-transparent focus:bg-white resize-none" placeholder="Ex: SUS: Sistema Único de Saúde..." />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none flex items-center gap-2">
                    <User size={14} className="text-blue-500" /> Responsável pela Execução
                  </label>
                  <input {...register('responsible')} className="input-field bg-slate-50 border-transparent focus:bg-white" placeholder="Ex: Farmacêutico RT, Auxiliar..." />
                  {errors.responsible && <p className="text-xs text-red-500 font-bold">{errors.responsible.message}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:col-span-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Elaborado por</label>
                    <input {...register('elaboradoPor')} className="input-field bg-slate-50 border-transparent focus:bg-white" placeholder="Nome do autor" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Revisado por</label>
                    <input {...register('revisadoPor')} className="input-field bg-slate-50 border-transparent focus:bg-white" placeholder="Nome do revisor" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Ano Revisão</label>
                    <input {...register('anoRevisao')} className="input-field bg-slate-50 border-transparent focus:bg-white" placeholder="Ex: 2025" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none flex items-center gap-2">
                    <Package size={14} className="text-blue-500" /> Insumos e Materiais
                  </label>
                  <input {...register('materials')} className="input-field bg-slate-50 border-transparent focus:bg-white" placeholder="Ex: Computador, impressora, carimbo..." />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none flex items-center gap-2">
                    <ShieldCheck size={14} className="text-blue-500" /> Equipamentos de Proteção (EPI)
                  </label>
                  <input {...register('epi')} className="input-field bg-slate-50 border-transparent focus:bg-white" placeholder="Ex: Avental, luvas, máscara..." />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none flex items-center gap-2">
                    <History size={14} className="text-blue-500" /> Riscos da Atividade
                  </label>
                  <input {...register('riscos')} className="input-field bg-slate-50 border-transparent focus:bg-white" placeholder="Ex: Contaminação, queda, erro jurídico..." />
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-50">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none flex items-center gap-2">
                  <AlignJustify size={14} className="text-blue-500" /> Procedimento Detalhado (Passo a Passo)
                </label>
                <div className="relative group">
                  <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Alinhamento à Esquerda</span>
                  </div>
                  <textarea 
                    {...register('procedure')} 
                    rows={20} 
                    className="input-field bg-slate-50 border-transparent focus:bg-white font-sans text-sm leading-relaxed text-left min-h-[500px]" 
                    placeholder="Enumere os passos de execução deste procedimento..." 
                    style={{ textAlign: 'left' }}
                  />
                </div>
                {errors.procedure && <p className="text-xs text-red-500 font-bold">{errors.procedure.message}</p>}
              </div>

              {/* Custom Fields Section */}
              <div className="pt-6 border-t border-slate-100">
                <div className="mb-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                      <label className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                        <Type size={14} className="text-sky-500" /> Formulários & Registros Integrados
                      </label>
                      <p className="text-[10px] text-slate-500 mt-0.5">Crie termos de consentimento, checklists de higiene, registros de temperatura ou relatórios anexados ao seu POP.</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => appendCustomField({ label: '', value: '', type: 'text', width: 'full', required: false, options: '', placeholder: '', helpText: '' })}
                      className="self-start md:self-auto bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <Plus size={12} /> Adicionar Campo ao Formulário
                    </button>
                  </div>
                </div>

                {/* Modelos de Formulários Rápidos */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-4">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-2">Modelos Prontos de Registros para Farmácias (1-Clique)</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => loadFormTemplate('temperature')}
                      className="bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-200 text-[10px] font-semibold text-slate-700 hover:text-amber-705 px-2.5 py-1.5 rounded-md flex items-center gap-1 transition-all"
                    >
                      🌡️ Controle de Temperatura (Termolábeis)
                    </button>
                    <button
                      type="button"
                      onClick={() => loadFormTemplate('hygiene')}
                      className="bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-[10px] font-semibold text-slate-700 hover:text-emerald-705 px-2.5 py-1.5 rounded-md flex items-center gap-1 transition-all"
                    >
                      🧹 Higiene & Limpeza Diária
                    </button>
                    <button
                      type="button"
                      onClick={() => loadFormTemplate('narcotics')}
                      className="bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-[10px] font-semibold text-slate-700 hover:text-indigo-705 px-2.5 py-1.5 rounded-md flex items-center gap-1 transition-all"
                    >
                      📋 Dispensação (Controlados / Portaria 344)
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {customFieldItems.map((field, index) => {
                    const fieldType = watch(`customFields.${index}.type`) || 'text';
                    return (
                      <div key={field.id} className="bg-white border border-slate-150 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative space-y-3">
                        {/* Header of Field Card */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-50 px-2 py-0.5 rounded">
                            Campo #{index + 1} • {
                              fieldType === 'text' ? 'Texto Curto' :
                              fieldType === 'textarea' ? 'Texto Longo' :
                              fieldType === 'select' ? 'Seleção (Dropdown)' :
                              fieldType === 'checklist' ? 'Lista de Checagem' :
                              fieldType === 'date' ? 'Data / Calendário' :
                              fieldType === 'signature' ? 'Assinatura Oficial' : 'Campo de Texto'
                            }
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => moveCustomField(index, 'up')}
                              disabled={index === 0}
                              className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 disabled:opacity-20 transition-all font-bold"
                              title="Mover para cima"
                            >
                              <ArrowUp size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveCustomField(index, 'down')}
                              disabled={index === customFieldItems.length - 1}
                              className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 disabled:opacity-20 transition-all font-bold"
                              title="Mover para baixo"
                            >
                              <ArrowDown size={12} />
                            </button>
                            <button 
                              type="button"
                              onClick={() => removeCustomField(index)}
                              className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-slate-100 transition-all"
                              title="Excluir Campo"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Grids of properties */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Left Column: Descriptions and names */}
                          <div className="space-y-3">
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 block mb-1">LABEL (NOME DO CAMPO) *</label>
                              <input 
                                {...register(`customFields.${index}.label` as const)} 
                                placeholder="Nome identificador da informação. Ex: Temperatura ºC" 
                                className="w-full text-xs bg-slate-50/50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:bg-white focus:border-transparent outline-none transition-all font-semibold text-slate-700"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-500 block mb-1">TEXTO DE AJUDA / INSTRUÇÃO (OPCIONAL)</label>
                              <input 
                                {...register(`customFields.${index}.helpText` as const)} 
                                placeholder="Instruções para o operador ao preencher..." 
                                className="w-full text-xs bg-slate-50/50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:bg-white focus:border-transparent outline-none transition-all text-slate-600"
                              />
                            </div>

                            {fieldType !== 'signature' && fieldType !== 'checklist' && (
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 block mb-1">CONTEÚDO PADRÃO OU RESPOSTA</label>
                                <textarea 
                                  {...register(`customFields.${index}.value` as const)} 
                                  placeholder="Valor pré-definido / resposta do formulário..." 
                                  className="w-full text-xs bg-slate-50/50 border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-sky-500 focus:bg-white focus:border-transparent outline-none transition-all text-slate-600"
                                  rows={1}
                                />
                              </div>
                            )}
                          </div>

                          {/* Right Column: Settings & Logic */}
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 block mb-1">TIPO DE CAMPO</label>
                                <select
                                  {...register(`customFields.${index}.type` as const)}
                                  className="w-full text-xs bg-slate-50/50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:bg-white focus:border-transparent outline-none transition-all text-slate-700 font-medium"
                                >
                                  <option value="text">Texto Curto</option>
                                  <option value="textarea">Texto Longo (Anotações)</option>
                                  <option value="select">Seleção (Caixa suspensa)</option>
                                  <option value="checklist">Caixas de Checagem (Checklist)</option>
                                  <option value="date">Data & Calendário</option>
                                  <option value="signature">Área de Assinatura</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-slate-500 block mb-1">DISPOSIÇÃO / EXPANSÃO</label>
                                <select
                                  {...register(`customFields.${index}.width` as const)}
                                  className="w-full text-xs bg-slate-50/50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:bg-white focus:border-transparent outline-none transition-all text-slate-700 font-medium"
                                >
                                  <option value="full">Largura Inteira (100%)</option>
                                  <option value="half">Meia Largura (50%)</option>
                                </select>
                              </div>
                            </div>

                            {/* Conditional options for dropdown select and checkboxes */}
                            {(fieldType === 'select' || fieldType === 'checklist') && (
                              <div className="bg-sky-50 border border-sky-100/50 rounded-xl p-3 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <label className="text-[10px] font-bold text-sky-800 block">OPÇÕES (SEPARADAS POR VÍRGULA)</label>
                                  <span className="text-[8px] font-bold text-sky-600 bg-white px-1.5 py-0.5 rounded shadow-sm">Configurar</span>
                                </div>
                                <input
                                  {...register(`customFields.${index}.options` as const)}
                                  placeholder="Ex: Sim, Não, Não se aplica"
                                  className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-sky-500 outline-none font-semibold text-slate-700"
                                />
                                <p className="text-[9px] text-sky-600">Escreva as alternativas que as pessoas podem escolher ou verificar.</p>
                              </div>
                            )}

                            {/* Checkboxes parameters */}
                            <div className="flex items-center gap-4 pt-1">
                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  {...register(`customFields.${index}.required` as const)}
                                  className="h-3.5 w-3.5 text-sky-600 border-slate-300 rounded focus:ring-sky-500"
                                />
                                <span className="text-[10px] font-bold text-slate-600">Campo Obrigatório</span>
                              </label>
                              
                              {fieldType !== 'signature' && fieldType !== 'checklist' && (
                                <div>
                                  <input 
                                    {...register(`customFields.${index}.placeholder` as const)} 
                                    placeholder="Placeholder..." 
                                    className="text-[10px] bg-slate-50/20 border-b border-dashed border-slate-305 focus:border-sky-505 outline-none text-slate-500 text-center w-36"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {customFieldItems.length === 0 && (
                    <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                      <Sparkles size={24} className="text-slate-350 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-500">Nenhum campo personalizado de registro annexed</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Use os botões de 1-clique acima para carregar um modelo pronto ou adicionar campos avulsos.</p>
                    </div>
                  )}

                  {/* Elegant Interactive Preview Block of the custom fields */}
                  {customFieldItems.length > 0 && (
                    <div className="mt-8 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-inner">
                      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
                        <div>
                          <h4 className="text-[11px] font-black uppercase text-blue-400 tracking-wider flex items-center gap-1.5">
                            👁️ Painel Interativo do Formulário (Web Preview)
                          </h4>
                          <p className="text-[9px] text-slate-400 mt-0.5">Siga as instruções abaixo para testar as caixas interativas, calendários e digitação do registro.</p>
                        </div>
                        <span className="text-[8px] font-mono bg-blue-950 text-blue-400 border border-blue-900 px-2 py-0.5 rounded">WEB PREVIEW ATIVO</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950 p-4 border border-slate-800 rounded-xl max-w-full">
                        {customFieldItems.map((item, idx) => {
                          const fLabel = watch(`customFields.${idx}.label`) || `Campo #${idx + 1}`;
                          const fType = watch(`customFields.${idx}.type`) || 'text';
                          const fOptions = watch(`customFields.${idx}.options`) || '';
                          const fWidth = watch(`customFields.${idx}.width`) || 'full';
                          const fPlaceholder = watch(`customFields.${idx}.placeholder`) || '';
                          const fHelp = watch(`customFields.${idx}.helpText`) || '';
                          const fRequired = watch(`customFields.${idx}.required`);
                          const optionsArray = fOptions ? fOptions.split(/[,;]/).map(o => o.trim()).filter(Boolean) : [];

                          return (
                            <div key={idx} className={`space-y-1.5 ${fWidth === 'full' ? 'col-span-1 md:col-span-2' : 'col-span-1'}`}>
                              <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1">
                                {fLabel}
                                {fRequired && <span className="text-rose-500 font-black text-[12px]">*</span>}
                              </label>

                              {fHelp && (
                                <p className="text-[9px] text-slate-400 italic">{fHelp}</p>
                              )}

                              {fType === 'text' && (
                                <input
                                  type="text"
                                  placeholder={fPlaceholder || "Preencher resposta..."}
                                  className="w-full text-xs font-mono bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-350 focus:border-blue-500 outline-none"
                                />
                              )}

                              {fType === 'textarea' && (
                                <textarea
                                  placeholder={fPlaceholder || "Preencher observações..."}
                                  rows={2}
                                  className="w-full text-xs font-mono bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-355 focus:border-blue-500 outline-none"
                                />
                              )}

                              {fType === 'date' && (
                                <input
                                  type="date"
                                  className="w-full text-xs font-mono bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-355 focus:border-blue-500 outline-none"
                                />
                              )}

                              {fType === 'select' && (
                                <select
                                  className="w-full text-xs font-mono bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-355 focus:border-blue-500 outline-none"
                                >
                                  {optionsArray.length === 0 ? (
                                    <option>-- Nenhuma opção configurada --</option>
                                  ) : (
                                    optionsArray.map((opt, oIdx) => (
                                      <option key={oIdx} value={opt}>{opt}</option>
                                    ))
                                  )}
                                </select>
                              )}

                              {fType === 'checklist' && (
                                <div className="bg-slate-900/50 border border-slate-800/80 rounded p-2.5 space-y-1.5">
                                  {optionsArray.length === 0 ? (
                                    <p className="text-[9px] text-slate-500 italic">Escreva as opções do checklist no construtor para visualizá-las aqui...</p>
                                  ) : (
                                    optionsArray.map((opt, oIdx) => (
                                      <label key={oIdx} className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                          type="checkbox"
                                          className="h-3.5 w-3.5 text-blue-500 border-slate-800 bg-slate-900 rounded focus:ring-blue-500"
                                        />
                                        <span className="text-[10px] text-slate-300">{opt}</span>
                                      </label>
                                    ))
                                  )}
                                </div>
                              )}

                              {fType === 'signature' && (
                                <div className="bg-slate-900 border border-dashed border-slate-705 rounded-xl p-4 text-center">
                                  <div className="w-full h-8 border-b border-slate-800 mb-1 flex items-center justify-center">
                                    <span className="text-[8px] text-slate-500 uppercase font-mono tracking-widest">[ÁREA DE ASSINATURA INDIVIDUAL]</span>
                                  </div>
                                  <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wide">{fLabel}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tables Section */}
              <div className="pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1">
                    <ListOrdered size={14} /> Tabelas de Dados
                  </label>
                  <button 
                    type="button"
                    onClick={() => appendTable({ title: '', headers: ['', ''], rows: [['', '']] })}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus size={14} /> Adicionar Tabela
                  </button>
                </div>
                
                <div className="space-y-6">
                  {tableFields.map((table, tableIndex) => (
                    <div key={table.id} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4 relative group">
                      <button 
                        type="button"
                        onClick={() => removeTable(tableIndex)}
                        className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-red-500 transition-colors bg-white rounded-lg shadow-sm border border-slate-100"
                      >
                        <Trash2 size={16} />
                      </button>

                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Título da Tabela</label>
                        <input 
                          {...register(`tables.${tableIndex}.title` as const)} 
                          placeholder="Ex: Tabela de Dosagem Pediátrica" 
                          className="input-field bg-white"
                        />
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-slate-100">
                              {currentValues.tables?.[tableIndex]?.headers.map((_, hIdx) => (
                                <th key={hIdx} className="p-2 border border-slate-200 min-w-[140px] text-center bg-slate-50">
                                  <div className="flex flex-col gap-1 items-center">
                                    <input 
                                      {...register(`tables.${tableIndex}.headers.${hIdx}` as const)}
                                      className="w-full bg-white border border-slate-200 rounded px-1.5 py-1 text-[10px] font-black uppercase text-slate-700 text-center focus:ring-1 focus:ring-blue-500"
                                      placeholder={`Coluna ${hIdx + 1}`}
                                    />
                                    <div className="flex items-center gap-1.5 mt-1 border-t border-slate-100 pt-1 w-full justify-center">
                                      <button
                                        type="button"
                                        onClick={() => moveColumn(tableIndex, hIdx, 'left')}
                                        disabled={hIdx === 0}
                                        className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-200 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors"
                                        title="Mover coluna para esquerda"
                                      >
                                        <ChevronLeft size={12} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => deleteColumn(tableIndex, hIdx)}
                                        disabled={(currentValues.tables?.[tableIndex]?.headers.length || 0) <= 1}
                                        className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-slate-200 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors"
                                        title="Excluir coluna"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => moveColumn(tableIndex, hIdx, 'right')}
                                        disabled={hIdx === (currentValues.tables?.[tableIndex]?.headers.length || 0) - 1}
                                        className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-200 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors"
                                        title="Mover coluna para direita"
                                      >
                                        <ChevronRight size={12} />
                                      </button>
                                    </div>
                                  </div>
                                </th>
                              ))}
                              <th className="p-2 border border-slate-200 w-24 text-[10px] font-black uppercase text-slate-500 text-center bg-slate-50">
                                Ações de Linha
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {(currentValues.tables?.[tableIndex]?.rows || []).map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-white transition-colors">
                                {row.map((_, cIdx) => (
                                  <td key={cIdx} className="p-1 border border-slate-200">
                                    <input 
                                      {...register(`tables.${tableIndex}.rows.${rIdx}.${cIdx}` as const)}
                                      className="w-full bg-transparent border-none text-xs text-slate-600 focus:ring-0 focus:bg-white rounded px-1"
                                    />
                                  </td>
                                ))}
                                <td className="p-1 border border-slate-200 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => moveRow(tableIndex, rIdx, 'up')}
                                      disabled={rIdx === 0}
                                      className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-20 disabled:hover:text-slate-400 transition-colors"
                                      title="Mover linha para cima"
                                    >
                                      <ArrowUp size={12} />
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        const rows = [...(currentValues.tables?.[tableIndex]?.rows || [])];
                                        rows.splice(rIdx, 1);
                                        setValue(`tables.${tableIndex}.rows`, rows);
                                      }}
                                      className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                      title="Excluir linha"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => moveRow(tableIndex, rIdx, 'down')}
                                      disabled={rIdx === (currentValues.tables?.[tableIndex]?.rows || []).length - 1}
                                      className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-20 disabled:hover:text-slate-400 transition-colors"
                                      title="Mover linha para baixo"
                                    >
                                      <ArrowDown size={12} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        
                        <div className="flex items-center gap-2 mt-3">
                          <button 
                            type="button"
                            onClick={() => addRow(tableIndex)}
                            className="bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                          >
                            <Plus size={12} /> Adicionar Linha
                          </button>
                          <button 
                            type="button"
                            onClick={() => addColumn(tableIndex)}
                            className="bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-emerald-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                          >
                            <Plus size={12} /> Adicionar Coluna
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Images Section */}
              <div className="pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1">
                    <ImageIcon size={14} /> Imagens Ilustrativas
                  </label>
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload}
                      className="hidden" 
                      id="image-upload"
                    />
                    <label 
                      htmlFor="image-upload"
                      className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={14} /> Adicionar Imagem
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {imageFields.map((field, index) => (
                    <div key={field.id} className="relative group bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                      <img src={field.url} alt="Preview" className="w-full h-40 object-cover" />
                      <div className="p-2 space-y-2">
                        <input 
                          {...register(`images.${index}.caption` as const)} 
                          placeholder="Legenda da imagem..." 
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>
                      <button 
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                {imageFields.length === 0 && (
                  <p className="text-center py-4 text-xs text-slate-400 italic">Nenhuma imagem ilustrativa adicionada.</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-400">Monitoramento e Verificação</label>
                <textarea {...register('monitoring')} rows={3} className="input-field" placeholder="Como este processo é auditado?" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1">
                  <Link2 size={14} /> Referências Normativas
                </label>
                <textarea {...register('references')} rows={3} className="input-field" placeholder="RDC 44/2009, etc." />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="card shadow-xl shadow-slate-200/50 border-none p-8 space-y-6 bg-white">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-4">Status e Controle</h3>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Estado do Documento</label>
              <select {...register('status')} className="input-field bg-slate-50 border-transparent focus:bg-white appearance-none cursor-pointer font-bold text-sm">
                <option value="draft">Rascunho Técnico</option>
                <option value="active">Publicado / Ativo</option>
                <option value="archived">Arquivo Morto</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Versão Atual</label>
              <div className="flex items-center gap-3">
                <div className="input-field bg-slate-100 border-transparent flex-1 font-mono font-black text-slate-500">v{currentValues.version}.0</div>
                {id && (
                  <button 
                    type="button"
                    onClick={() => setValue('version', (currentValues.version || 1) + 1)}
                    className="w-11 h-11 flex items-center justify-center bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm group"
                    title="Incrementar versão"
                  >
                    <History size={18} className="group-hover:rotate-180 transition-transform duration-500" />
                  </button>
                )}
              </div>
            </div>

            {id && (
              <div className="pt-6 border-t border-slate-50">
                <button
                  type="button"
                  onClick={deletePop}
                  disabled={deleting}
                  className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 border ${
                    confirmDelete 
                      ? 'bg-red-600 text-white border-red-700 shadow-lg shadow-red-200 animate-pulse' 
                      : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'
                  }`}
                >
                  {deleting ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : confirmDelete ? (
                    'Confirmar Exclusão'
                  ) : (
                    <>
                      <Trash2 size={18} />
                      Excluir Este POP
                    </>
                  )}
                </button>
                {confirmDelete && (
                  <p className="text-[10px] text-red-500 font-bold text-center mt-2 uppercase tracking-tight">Esta ação é irreversível.</p>
                )}
              </div>
            )}

            {currentValues.status === 'active' && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-center gap-3 text-emerald-700 text-xs font-bold leading-tight">
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 shrink-0">
                  <ShieldCheck size={16} />
                </div>
                <span>Documento em Total Conformidade.</span>
              </div>
            )}
          </div>

          <div className="card shadow-xl shadow-slate-200/50 border-none p-8 space-y-6 bg-white overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-600/5 blur-2xl -mr-10 -mt-10"></div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-4 flex items-center justify-between">
              Assinatura Institucional
              <Layout size={14} className="text-slate-200" />
            </h3>
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase text-slate-300 tracking-widest">Drogaria</span>
                <span className="text-sm font-black text-slate-900 leading-tight uppercase">{drugstore?.name}</span>
              </div>
              <div className="flex justify-between items-end">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase text-slate-300 tracking-widest">Responsável (CRF)</span>
                  <span className="text-[12px] font-bold text-slate-500 uppercase">{drugstore?.crf || '-'}</span>
                </div>
                <button 
                  type="button"
                  onClick={() => navigate('/profile')}
                  className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all border border-transparent hover:border-blue-100"
                  title="Configurar Drogaria"
                >
                  <Edit size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {isExportingPDF && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-md text-white p-6">
          <div className="flex flex-col items-center gap-4 text-center max-w-sm">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-blue-500/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
            </div>
            <h3 className="text-sm font-black uppercase tracking-widest text-blue-400">Exportando PDF Real</h3>
            <p className="text-xs text-slate-300 font-medium animate-pulse">{exportStep}</p>
            <span className="text-[10px] text-slate-500 italic mt-2">Compilando cabeçalhos, tabelas, imagens e assinaturas oficiais no mesmo padrão de alta fidelidade do visualizador.</span>
          </div>
        </div>
      )}
    </div>
  );
}
