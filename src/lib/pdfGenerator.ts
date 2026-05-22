import { format } from 'date-fns';

export const getBase64FromUrl = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!url) {
      resolve('');
      return;
    }
    if (url.startsWith('data:')) {
      resolve(url);
      return;
    }
    const img = new Image();
    img.setAttribute('crossOrigin', 'anonymous');
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        try {
          const dataURL = canvas.toDataURL('image/png');
          resolve(dataURL);
        } catch (e) {
          reject(e);
        }
      } else {
        reject(new Error('Could not get 2d context'));
      }
    };
    img.onerror = () => {
      // Fallback to fetch as Blob (to circumvent standard CORS on public media)
      fetch(url)
        .then(response => response.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.onerror = () => reject(new Error('FileReader failed'));
          reader.readAsDataURL(blob);
        })
        .catch(err => reject(err));
    };
    img.src = url;
  });
};

export const generatePopPDF = async (data: any, drugstore: any) => {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  // Preload logo and illustration base64s synchronously to prevent rendering races
  const logoBase64 = drugstore?.logoUrl ? await getBase64FromUrl(drugstore.logoUrl).catch(() => null) : null;
  const imagesBase64 = data.images && data.images.length > 0
    ? await Promise.all(data.images.map(async (img: any) => {
        try {
          const b64 = await getBase64FromUrl(img.url);
          return { ...img, base64: b64 };
        } catch (err) {
          console.error("Error preloading illustration for PDF Generator:", err);
          return { ...img, base64: null };
        }
      }))
    : [];

  let currentY = 62;

  const checkPageOverflow = (neededHeight: number) => {
    if (currentY + neededHeight > 266) {
      doc.addPage();
      currentY = 62;
    }
  };

  const renderTechnicalTitle = (titleText: string) => {
    checkPageOverflow(14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12); // Standard ABNT size for titles and section lines
    doc.setTextColor(30, 58, 138); // deep blue text
    
    // Split title to fit within margins
    const lines = doc.splitTextToSize(titleText, 180);
    for (let i = 0; i < lines.length; i++) {
      doc.text(lines[i], 15, currentY);
      if (i < lines.length - 1) {
        currentY += 5.5;
        checkPageOverflow(14);
      }
    }
    
    doc.setDrawColor(219, 234, 254);
    doc.setLineWidth(0.2);
    doc.line(15, currentY + 1.8, 195, currentY + 1.8);
    currentY += 8;
  };

  const renderBodyText = (text: string, isItalic = false) => {
    if (!text || text.trim() === '') return;
    doc.setFont("helvetica", isItalic ? "italic" : "normal");
    doc.setFontSize(12); // Complies with ABNT standard size 12
    doc.setTextColor(51, 65, 85);
    const lines = doc.splitTextToSize(text, 180);
    for (const line of lines) {
      checkPageOverflow(5.5); // Elegant leading (1.5 times the font height)
      doc.text(line, 15, currentY);
      currentY += 5.5;
    }
    currentY += 4.5; // small padding after paragraph
  };

  // 1. OBJETIVO
  if (data.objective && data.objective.trim() !== '') {
    renderTechnicalTitle("1. OBJETIVO");
    renderBodyText(data.objective, true);
  }

  // 2. SIGLAS
  if (data.siglas && data.siglas.trim() !== '') {
    renderTechnicalTitle("2. SIGLAS");
    renderBodyText(data.siglas);
  }

  // 3. CAMPO DE APLICAÇÃO
  if (data.applicationField && data.applicationField.trim() !== '') {
    renderTechnicalTitle("3. CAMPO DE APLICAÇÃO-ALVO");
    renderBodyText(data.applicationField);
  }

  // 4. DEFINIÇÕES
  if (data.definitions && data.definitions.trim() !== '') {
    renderTechnicalTitle("4. DEFINIÇÕES IMPORTANTES");
    renderBodyText(data.definitions);
  }

  // Technical blocks: Responsável, Equipamentos, Riscos, Recursos
  const technicalTags = [
    { label: "5. RESPONSABILIDADE OPERACIONAL", value: data.responsible },
    { label: "8. RECURSOS E MATERIAIS NECESSÁRIOS", value: data.materials },
    { label: "9. DIREÇÃO DE SEGURANÇA E EPI", value: data.epi },
    { label: "10. RISCOS ENVOLVIDOS NA ATIVIDADE", value: data.riscos },
  ];

  for (const tag of technicalTags) {
    if (tag.value && tag.value.trim() !== '') {
      checkPageOverflow(18);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12); // Standard ABNT size for subtitles
      doc.setTextColor(15, 23, 42);
      
      const subTitleLines = doc.splitTextToSize(tag.label, 180);
      for (let i = 0; i < subTitleLines.length; i++) {
        doc.text(subTitleLines[i], 15, currentY);
        if (i < subTitleLines.length - 1) {
          currentY += 5.5;
          checkPageOverflow(18);
        }
      }

      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.8);
      doc.line(15, currentY + 1.5, 15, currentY + 7.5);
      currentY += 4.5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11); // Standard secondary body size
      doc.setTextColor(51, 65, 85);
      const blockLines = doc.splitTextToSize(tag.value, 175);
      for (const line of blockLines) {
        checkPageOverflow(5.2);
        doc.text(line, 18, currentY);
        currentY += 5.2;
      }
      currentY += 4.5;
    }
  }

  // 11. DETAILED OPERATIONAL PROCEDURE
  if (data.procedure && data.procedure.trim() !== '') {
    renderTechnicalTitle("11. PROTOCOLO OPERACIONAL DETALHADO (ATIVIDADES)");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12); // Main body ABNT size 12
    doc.setTextColor(51, 65, 85);

    const paragraphs = data.procedure.split('\n');
    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) {
        currentY += 3.5;
        continue;
      }
      const lines = doc.splitTextToSize(trimmed, 180);
      for (const line of lines) {
        checkPageOverflow(5.5); // Elegant 1.5-equivalent line leading for 12pt
        doc.text(line, 15, currentY);
        currentY += 5.5;
      }
      currentY += 3.5;
    }
  }

  // Custom Metadata / Forms
  if (data.customFields && data.customFields.length > 0) {
    let hasCustomFields = false;
    for (const meta of data.customFields) {
      if (meta.label) {
        hasCustomFields = true;
        break;
      }
    }
    
    if (hasCustomFields) {
      renderTechnicalTitle("VOLUMETRIA E FORMULÁRIO DE REGISTRO ANEXO");
      
      for (const meta of data.customFields) {
        if (!meta.label) continue;
        
        const type = meta.type || 'text';
        const requiredText = meta.required ? ' (*)' : '';
        const displayLabel = `${meta.label.toUpperCase()}${requiredText}`;
        const help = meta.helpText || '';
        
        checkPageOverflow(18); // Minimum space needed for a field segment
        
        // Render Field Label
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(displayLabel, 15, currentY);
        currentY += 4.5;
        
        // Render Help Text if any
        if (help) {
          doc.setFont("helvetica", "oblique");
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          const helpLines = doc.splitTextToSize(help, 175);
          for (const hLine of helpLines) {
            checkPageOverflow(4);
            doc.text(hLine, 15, currentY);
            currentY += 4;
          }
        }
        
        // Draw the input container based on type
        if (type === 'signature') {
          currentY += 8;
          checkPageOverflow(14);
          doc.setDrawColor(148, 163, 184);
          doc.setLineWidth(0.3);
          doc.line(15, currentY, 115, currentY); // Draw signature line
          currentY += 4.5;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(71, 85, 105);
          doc.text(`Assinatura / Carimbo do Responsável Técnico ou Supervisor`, 15, currentY);
          currentY += 6;
        } 
        else if (type === 'checklist') {
          const optionsStr = meta.options || '';
          const optionsList = optionsStr ? optionsStr.split(/[,;]/).map((o: any) => o.trim()).filter(Boolean) : [];
          
          currentY += 1.5;
          if (optionsList.length === 0) {
            doc.setFont("helvetica", "italic");
            doc.setFontSize(9);
            doc.setTextColor(148, 163, 184);
            doc.text("[Nenhuma caixa de checagem configurada]", 18, currentY);
            currentY += 5;
          } else {
            for (const opt of optionsList) {
              checkPageOverflow(6.5);
              doc.setDrawColor(100, 116, 139);
              doc.setLineWidth(0.3);
              doc.rect(15, currentY - 3.2, 3.2, 3.2); // Checkbox square
              
              doc.setFont("helvetica", "normal");
              doc.setFontSize(9);
              doc.setTextColor(51, 65, 85);
              doc.text(opt, 20, currentY - 0.5);
              currentY += 5.2;
            }
          }
          currentY += 1.5;
        } 
        else if (type === 'select') {
          const valueStr = meta.value || '';
          const optionsStr = meta.options || '';
          const optionsList = optionsStr ? optionsStr.split(/[,;]/).map((o: any) => o.trim()).filter(Boolean) : [];
          
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(51, 65, 85);
          
          // Show current value, or the list of choices in parentheses if empty
          if (valueStr) {
            doc.text(valueStr, 15, currentY);
            currentY += 5;
          } else {
            const formattedOptions = optionsList.slice(0, 4).join(" | ") + (optionsList.length > 4 ? "..." : "");
            doc.text(`[ Selecionar uma opção:  ${formattedOptions || 'Sem opções configuradas'} ]`, 15, currentY);
            currentY += 5.5;
          }
          currentY += 1.5;
        } 
        else if (type === 'date') {
          const valueStr = meta.value || '___ / ___ / _____';
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(51, 65, 85);
          doc.text(valueStr, 15, currentY);
          currentY += 5.5;
          currentY += 1.5;
        } 
        else if (type === 'textarea') {
          const valueStr = meta.value || '';
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(51, 65, 85);
          
          if (valueStr) {
            const valLines = doc.splitTextToSize(valueStr, 175);
            for (const line of valLines) {
              checkPageOverflow(5);
              doc.text(line, 15, currentY);
              currentY += 5;
            }
          } else {
            // Render gorgeous lined spaces for physical writing in the printed POP document
            checkPageOverflow(14);
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.2);
            doc.line(15, currentY + 3, 195, currentY + 3);
            doc.line(15, currentY + 9, 195, currentY + 9);
            currentY += 13;
          }
          currentY += 1.5;
        } 
        else { // short text 'text'
          const valueStr = meta.value || '';
          const placeholderStr = meta.placeholder ? `(${meta.placeholder})` : '____________________________________________________________________';
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(51, 65, 85);
          
          if (valueStr) {
            doc.text(valueStr, 15, currentY);
            currentY += 4.5;
          } else {
            doc.setTextColor(148, 163, 184);
            doc.text(placeholderStr, 15, currentY + 1.2);
            currentY += 5;
          }
          currentY += 1.5;
        }
        
        currentY += 3; // space between fields
      }
      currentY += 4;
    }
  }

  // Tables
  if (data.tables && data.tables.length > 0) {
    for (let tIdx = 0; tIdx < data.tables.length; tIdx++) {
      const table = data.tables[tIdx];
      renderTechnicalTitle(`TABELA METROLÓGICA ${tIdx + 1}: ${table.title || 'Controle'}`);

      const hCells = table.headers || [];
      const rCells = table.rows || [];

      // Se a tabela iniciar muito próxima do final da página, força início em nova página limpa
      if (currentY > 235) {
        doc.addPage();
        currentY = 62;
      }

      autoTable(doc, {
        startY: currentY,
        head: [hCells],
        body: rCells,
        margin: { left: 15, right: 15, top: 62, bottom: 30 },
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 3, font: 'helvetica' }, // ABNT standard size 10 for table texts
        headStyles: { fillColor: [30, 58, 138], textColor: 255 },
      });
      currentY = (doc as any).lastAutoTable.finalY + 8;
    }
  }

  // Illustrations / Images
  if (imagesBase64 && imagesBase64.length > 0) {
    let hasImages = false;
    for (const img of imagesBase64) {
      if (img.base64) {
        hasImages = true;
        break;
      }
    }
    if (hasImages) {
      renderTechnicalTitle("IMAGENS ANEXAS (ILUSTRAÇÕES)");

      for (const img of imagesBase64) {
        if (img.base64) {
          checkPageOverflow(55);
          try {
            doc.addImage(img.base64, 'JPEG', 15, currentY, 80, 45);
            if (img.caption) {
              doc.setFont("helvetica", "italic");
              doc.setFontSize(9); // More legible captions
              doc.setTextColor(100, 116, 139);
              doc.text(img.caption, 15, currentY + 49);
              currentY += 54;
            } else {
              currentY += 49;
            }
          } catch (err) {
            console.error("Error drawing attached illustration in PDF:", err);
            currentY += 5;
          }
        }
      }
    }
  }

  // 12. Monitoramento
  if (data.monitoring && data.monitoring.trim() !== '') {
    renderTechnicalTitle("12. MONITORAMENTO E INDICADORES");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12); // ABNT Standard 12
    doc.setTextColor(51, 65, 85);
    const monLines = doc.splitTextToSize(data.monitoring, 180);
    for (const line of monLines) {
      checkPageOverflow(5.5);
      doc.text(line, 15, currentY);
      currentY += 5.5;
    }
    currentY += 5;
  }

  // 13. Revisão
  if (data.reviewFrequency && data.reviewFrequency.trim() !== '') {
    renderTechnicalTitle("13. FREQUÊNCIA DE REVISÃO E ESTUDO");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12); // ABNT Standard 12
    doc.setTextColor(51, 65, 85);
    const revLines = doc.splitTextToSize(data.reviewFrequency, 180);
    for (const line of revLines) {
      checkPageOverflow(5.5);
      doc.text(line, 15, currentY);
      currentY += 5.5;
    }
    currentY += 5;
  }

  // 14. Referências
  if (data.references && data.references.trim() !== '') {
    renderTechnicalTitle("14. REFERÊNCIAS REGULATÓRIAS / TÉCNICAS");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12); // ABNT Standard 12
    doc.setTextColor(51, 65, 85);
    const refLines = doc.splitTextToSize(data.references, 180);
    for (const line of refLines) {
      checkPageOverflow(5.5);
      doc.text(line, 15, currentY);
      currentY += 5.5;
    }
    currentY += 10;
  }

  // Ensure that the signatures on the last page have enough room.
  // If the last page has content that goes past Y = 235, the signature block
  // (which is at Y = 245 to 260) would be too close or might overlap.
  // In this case, we simply add a new page so that the signatures are printed
  // beautifully and with plenty of breathing room on an extra page.
  if (currentY > 235) {
    doc.addPage();
  }

  // Consecrate Headers and Footers on every page
  const totalPages = doc.getNumberOfPages();
  const emissionDate = format(new Date(), 'dd/MM/yyyy');

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    doc.setPage(pageNum);

    // 2. Main technical frame box (x=15, y=15, w=180, h=28)
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(15, 15, 180, 28);

    // Vertical line for brand logo
    doc.line(55, 15, 55, 43);
    // Vertical line for metadata
    doc.line(145, 15, 145, 43);

    // Horizontal dividers for title/subtitle blocks
    doc.line(55, 27, 145, 27);
    doc.line(145, 27, 195, 27);

    // Logo rendering in header block
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', 19, 17, 32, 24);
      } catch (logoErr) {
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "bold");
        doc.text("DR", 35, 27, { align: "center" });
        doc.setFontSize(5.5);
        doc.setFont("helvetica", "normal");
        doc.text(`${drugstore?.city || 'DOURADINA'} / ${drugstore?.state || 'PR'}`.toUpperCase(), 35, 36, { align: "center" });
      }
    } else {
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.text("DR", 35, 27, { align: "center" });
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "normal");
      doc.text(`${drugstore?.city || 'DOURADINA'} / ${drugstore?.state || 'PR'}`.toUpperCase(), 35, 36, { align: "center" });
    }

    // Central block details
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text("PROCEDIMENTO OPERACIONAL PADRÃO - POP", 100, 20, { align: "center" });
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text((drugstore?.name || 'UNIDADE BASICA DE SAUDE').toUpperCase(), 100, 24, { align: "center" });

    // Central Procedure Title row
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    const titleLines = doc.splitTextToSize((data.title || 'Procedimento Técnico').toUpperCase(), 85);
    doc.text(titleLines, 100, 32, { align: "center" });

    // Right Side metadata (POP number and Category)
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.text("POP No.", 170, 19, { align: "center" });
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(data.code || '001', 170, 25, { align: "center" });

    doc.setFontSize(5);
    doc.setFont("helvetica", "normal");
    doc.text("CATEGORIA", 170, 31, { align: "center" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text((data.category || 'GERAL').toUpperCase(), 170, 36, { align: "center" });

    // 3. Middle metadata row (Elaborador / Emissor / Verificador)
    doc.rect(15, 43, 180, 12);
    doc.line(80, 43, 80, 55);
    doc.line(140, 43, 140, 55);

    doc.setFontSize(5);
    doc.setFont("helvetica", "normal");
    doc.text("ELABORADO POR:", 17, 47);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text((data.elaboradoPor || drugstore?.name || '-').toUpperCase(), 17, 51);

    doc.setFontSize(5);
    doc.setFont("helvetica", "normal");
    doc.text("EMISSAO / REVISAO:", 82, 47);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    const emBlock = `${emissionDate} ${data.anoRevisao ? ` / ${data.anoRevisao}` : ''}`;
    doc.text(emBlock, 82, 51);

    doc.setFontSize(5);
    doc.setFont("helvetica", "normal");
    doc.text("REVISADO POR:", 142, 47);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text((data.revisadoPor || '-').toUpperCase(), 142, 51);

    // 4. Clean Footer row
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(15, 274, 195, 274);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("DOCUMENTO OFICIAL SEGURO", 17, 281);
    doc.setFontSize(6);
    doc.setFont("helvetica", "italic");
    doc.text("Gerenciador Dr. Roger POP Manager - Controle de Qualidade Sanitária", 17, 285);

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(`FL ${pageNum} / ${totalPages}`, 190, 281, { align: "right" });

    // Last Page: Hand Off Signatures
    if (pageNum === totalPages) {
      doc.line(15, 245, 195, 245);
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "bold");
      doc.text("ELABORADO POR:", 45, 249, { align: "center" });
      doc.text("VERIFICADO POR:", 105, 249, { align: "center" });
      doc.text("APROVADO POR:", 165, 249, { align: "center" });

      doc.setFontSize(7);
      doc.text((data.elaboradoPor || drugstore?.name || '-').toUpperCase(), 45, 258, { align: "center" });
      doc.text((data.revisadoPor || '-').toUpperCase(), 105, 258, { align: "center" });
      doc.text((data.elaboradoPor || drugstore?.name || '-').toUpperCase(), 165, 258, { align: "center" });
    }
  }

  return doc;
};
