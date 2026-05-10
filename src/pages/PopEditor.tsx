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
  Edit,
  Clock,
  History, 
  ShieldCheck, 
  Loader2,
  BookOpen,
  User,
  Package,
  ListOrdered,
  Link2,
  Layout,
  Plus,
  Image as ImageIcon,
  X,
  Type,
  AlignJustify
} from 'lucide-react';
import { POP_TEMPLATES, POPTemplate } from '../constants/templates';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, ImageRun, Table, TableRow, TableCell, WidthType, BorderStyle, VerticalAlign } from 'docx';
import { useFieldArray } from 'react-hook-form';
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
  images: z.array(z.object({
    url: z.string(),
    caption: z.string().optional(),
  })).optional(),
  customFields: z.array(z.object({
    label: z.string(),
    value: z.string(),
  })).optional(),
});

type PopFormValues = z.infer<typeof popSchema>;

export default function PopEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { drugstore, user } = useAuth();
  const [loading, setLoading] = React.useState(!!id);
  const [saving, setSaving] = React.useState(false);
  const [showTemplates, setShowTemplates] = React.useState(!id);

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

  const currentValues = watch();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("A imagem deve ter no máximo 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        appendImage({ url: reader.result as string, caption: '' });
      };
      reader.readAsDataURL(file);
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
      { label: "2. CAMPO DE APLICAÇÃO", value: currentValues.applicationField },
      { label: "3. DEFINIÇÕES", value: currentValues.definitions },
      { label: "4. RESPONSÁVEL", value: currentValues.responsible },
      { label: "5. MATERIAIS NECESSÁRIOS", value: currentValues.materials },
      { label: "6. EQUIPAMENTOS DE PROTEÇÃO (EPI)", value: currentValues.epi },
      { label: "7. RISCOS DA ATIVIDADE", value: currentValues.riscos },
      { label: "8. PROCEDIMENTO DETALHADO", value: currentValues.procedure },
      { label: "9. MONITORAMENTO E VERIFICAÇÃO", value: currentValues.monitoring },
      { label: "10. FREQUÊNCIA DE REVISÃO", value: currentValues.reviewFrequency },
      { label: "11. REFERÊNCIAS NORMATIVAS", value: currentValues.references },
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
        children: [new TextRun({ text: "12. INFORMAÇÕES ADICIONAIS", bold: true, size: 22 })],
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
    setValue('images', []);
    setValue('customFields', []);
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
      const splitValue = doc.splitTextToSize(section.value || '-', pageWidth - margin * 2);
      const estimatedHeight = 15 + (splitValue.length * 5);
      
      if (y + estimatedHeight > 270) {
        doc.addPage();
        y = 20;
      }

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        styles: { fontSize: 10, cellPadding: 1, overflow: 'linebreak' },
        headStyles: { fontSize: 11, fontStyle: 'bold', fillColor: [255, 255, 255], textColor: [0, 0, 0] },
        body: [
          [{ 
            content: section.label, 
            styles: { fontStyle: 'bold', fontSize: 11, cellPadding: { bottom: 2 }, halign: 'left' as const } 
          }],
          [{ 
            content: section.value || '-',
            styles: { halign: 'left' as const }
          }]
        ],
        theme: 'plain'
      });
      
      y = (doc as any).lastAutoTable.finalY + 8;
    });

    // Custom Fields in PDF
    if (currentValues.customFields && currentValues.customFields.length > 0) {
      if (y > 250) { doc.addPage(); y = 20; }
      
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        styles: { fontSize: 10, cellPadding: 1 },
        body: [
          [{ 
            content: '12. INFORMAÇÕES ADICIONAIS', 
            styles: { fontStyle: 'bold', fontSize: 11, cellPadding: { bottom: 2 }, halign: 'left' as const } 
          }],
          ...currentValues.customFields.map(field => [
            { 
              content: `${field.label.toUpperCase()}: ${field.value}`,
              styles: { halign: 'left' as const }
            }
          ])
        ],
        theme: 'plain'
      });
      
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // Images in PDF
    if (currentValues.images && currentValues.images.length > 0) {
      currentValues.images.forEach((img, idx) => {
        if (y > 200) {
          doc.addPage();
          y = 20;
        } else {
          y += 10;
        }

        try {
          const imgWidth = 120;
          const imgHeight = 80;
          const centerX = (pageWidth - imgWidth) / 2;
          
          doc.addImage(img.url, 'PNG', centerX, y, imgWidth, imgHeight, undefined, 'FAST');
          y += imgHeight + 5;
          
          if (img.caption) {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'italic');
            doc.text(img.caption, pageWidth / 2, y, { align: 'center' });
            y += 8;
          }
        } catch (e) {
          console.error("Error adding image to PDF:", e);
        }
      });
    }

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
              Editor de POP
              <span className="text-[10px] bg-blue-50 text-blue-600 font-black px-2.5 py-1 rounded-full uppercase tracking-widest border border-blue-100">Profissional</span>
            </h1>
            <p className="text-sm text-slate-400 font-bold tracking-tight uppercase mt-0.5">Gestão de qualificação e conformidade técnica</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none flex items-center gap-2">
                    <User size={14} className="text-blue-500" /> Responsável pela Execução
                  </label>
                  <input {...register('responsible')} className="input-field bg-slate-50 border-transparent focus:bg-white" placeholder="Ex: Farmacêutico RT, Auxiliar..." />
                  {errors.responsible && <p className="text-xs text-red-500 font-bold">{errors.responsible.message}</p>}
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
                <div className="flex items-center justify-between mb-4">
                  <label className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1">
                    <Type size={14} /> Campos Personalizados
                  </label>
                  <button 
                    type="button"
                    onClick={() => appendCustomField({ label: '', value: '' })}
                    className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
                  >
                    <Plus size={14} /> Adicionar Campo
                  </button>
                </div>
                
                <div className="space-y-3">
                  {customFieldItems.map((field, index) => (
                    <div key={field.id} className="flex flex-col md:flex-row gap-3 items-start bg-slate-50 p-3 rounded-xl border border-slate-100 relative group">
                      <div className="flex-1 w-full space-y-1">
                        <input 
                          {...register(`customFields.${index}.label` as const)} 
                          placeholder="Nome do campo (Ex: Observações)" 
                          className="w-full text-xs font-bold uppercase bg-transparent border-none focus:ring-0 p-0 text-slate-500"
                        />
                        <textarea 
                          {...register(`customFields.${index}.value` as const)} 
                          placeholder="Conteúdo..." 
                          className="w-full text-sm bg-white border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
                          rows={2}
                        />
                      </div>
                      <button 
                        type="button"
                        onClick={() => removeCustomField(index)}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  {customFieldItems.length === 0 && (
                    <p className="text-center py-4 text-xs text-slate-400 italic">Nenhum campo personalizado adicionado.</p>
                  )}
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
                <input {...register('references')} className="input-field" placeholder="RDC 44/2009, etc." />
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
    </div>
  );
}
