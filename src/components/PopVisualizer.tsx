import React from 'react';
import { 
  ShieldCheck, 
  FileText, 
  Printer, 
  Download, 
  BookOpen,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { generatePopPDF } from '../lib/pdfGenerator';

interface PdfPageProps {
  pdfDoc: any;
  pageNumber: number;
  key?: any;
}

function PdfPage({ pdfDoc, pageNumber }: PdfPageProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [errorObj, setErrorObj] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    const renderPage = async () => {
      try {
        setLoading(true);
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
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl max-w-[800px] w-full mx-auto relative flex flex-col items-center">
      <div className="flex items-center justify-between w-full mb-3 text-slate-450 text-[10px] uppercase tracking-wider font-mono px-1">
        <span className="font-semibold text-slate-400">Páginador Técnico</span>
        <span className="text-blue-400 font-bold">Folha {pageNumber}</span>
      </div>

      <div className="relative w-full aspect-[1/1.414] bg-white rounded-lg overflow-hidden border border-slate-700/30 flex items-center justify-center">
        {loading && (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-2 z-10">
            <RefreshCw size={18} className="text-blue-500 animate-spin" />
            <span className="text-[9px] font-mono uppercase text-slate-400">Renderizando Folha...</span>
          </div>
        )}
        {errorObj && (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-4 text-center z-10">
            <AlertCircle size={18} className="text-rose-500 mb-1" />
            <span className="text-[9px] font-mono uppercase text-rose-500">Erro na renderização da folha</span>
            <span className="text-[8px] text-slate-500 max-w-xs mt-1 font-mono">{errorObj}</span>
          </div>
        )}
        <canvas 
          ref={canvasRef} 
          className="w-full h-auto max-h-full object-contain block bg-white" 
        />
      </div>
    </div>
  );
}

interface PopVisualizerProps {
  data: any;
  drugstore: any;
  onDownloadPDF?: () => void;
}

export default function PopVisualizer({ data, drugstore }: PopVisualizerProps) {
  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = React.useState<any>(null);
  const [pdfjsLoaded, setPdfjsLoaded] = React.useState(false);
  const [isCompiling, setIsCompiling] = React.useState(false);
  const [compilingStep, setCompilingStep] = React.useState('');
  const [compileError, setCompileError] = React.useState<string | null>(null);
  const [totalPagesCount, setTotalPagesCount] = React.useState<number>(1);

  // Dynamically load PDF.js CDN to render PDF pages inside the page safely
  React.useEffect(() => {
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

  // Compile full-vector PDF reactively in background with a 400ms debounce
  React.useEffect(() => {
    let active = true;
    let localRevokeUrl: string | null = null;

    setIsCompiling(true);
    setCompilingStep('Compilando documentação oficial...');

    const compileTimeout = setTimeout(async () => {
      try {
        const doc = await generatePopPDF(data, drugstore);
        
        if (!active) {
          return;
        }

        const arrayBuffer = doc.output('arraybuffer');
        const rawBlob = doc.output('blob');
        const blobUrl = URL.createObjectURL(rawBlob);

        localRevokeUrl = blobUrl;
        setPdfUrl(blobUrl);

        if ((window as any).pdfjsLib && pdfjsLoaded) {
          const loadingTask = (window as any).pdfjsLib.getDocument({ data: arrayBuffer });
          const loadedDoc = await loadingTask.promise;
          if (active) {
            setPdfDoc(loadedDoc);
            setTotalPagesCount(loadedDoc.numPages);
          }
        } else {
          if (active) {
            setTotalPagesCount(doc.getNumberOfPages());
          }
        }
        
        if (active) {
          setCompileError(null);
        }
      } catch (err: any) {
        console.error("Error pre-compiling POP PDF preview:", err);
        if (active) {
          setCompileError(err?.message || "Ocorreu um erro ao compilar as referências e elementos visuais do POP.");
        }
      } finally {
        if (active) {
          setIsCompiling(false);
        }
      }
    }, 450); // Debounce typing keypresses to prevent CPU throttling

    return () => {
      active = false;
      clearTimeout(compileTimeout);
      if (localRevokeUrl) {
        URL.revokeObjectURL(localRevokeUrl);
      }
    };
  }, [data, drugstore, pdfjsLoaded]);

  // Handle direct Actions
  const handleAction = async (type: 'download' | 'print') => {
    try {
      if (!pdfUrl) {
        // Fallback compile on the fly if not ready yet
        const doc = await generatePopPDF(data, drugstore);
        const rawBlob = doc.output('blob');
        const rawUrl = URL.createObjectURL(rawBlob);
        
        if (type === 'download') {
          triggerDownload(rawUrl);
        } else {
          triggerPrint(rawUrl);
        }
        return;
      }

      if (type === 'download') {
        triggerDownload(pdfUrl);
      } else {
        triggerPrint(pdfUrl);
      }
    } catch (err: any) {
      alert("Erro ao executar ação de PDF: " + err.message);
    }
  };

  const triggerDownload = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    const cleanTitle = (data.title || 'Procedimento').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
    link.download = `POP_${data.code || 'XXX'}_${cleanTitle}.pdf`;
    link.click();
  };

  const triggerPrint = (url: string) => {
    // Open in a new window so the native Chrome PDF viewer handles formatting and layout print cleanly
    // without triggering cross-origin Frame errors in modern Chrome sandbox environments
    try {
      const printWindow = window.open(url, '_blank');
      if (!printWindow) {
        triggerDownload(url);
      }
    } catch (err) {
      console.warn("Direct window.open print was blocked or errored:", err);
      triggerDownload(url);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative">
      
      {/* Dynamic Action Header Area */}
      <div className="bg-slate-900 border-b border-slate-800 p-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 z-20 shrink-0">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
            <FileText size={18} className="text-white" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[9px] font-black uppercase text-blue-400 tracking-wider leading-none">Vigilância Sanitária Integrada</span>
            <span className="text-xs font-bold text-slate-100 truncate max-w-[280px] mt-1">{data.title || 'Procedimento Técnico'}</span>
          </div>
        </div>

        {/* View Mode Indicator Badge */}
        <div className="hidden md:flex items-center gap-2 bg-slate-950/80 border border-white/5 p-1.5 rounded-xl px-4 text-[10px] font-semibold text-slate-300">
          <BookOpen size={13} className="text-blue-500 mr-1" />
          <span>Visualizador Oficial Dr. Roger POP</span>
        </div>

        {/* Quick Operations Button */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
          <button 
            onClick={() => handleAction('print')} 
            className="p-2.5 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white rounded-xl transition-all border border-white/5 disabled:opacity-50" 
            title="Imprimir POP Oficial"
          >
            <Printer size={16} />
          </button>
          
          <button 
            onClick={() => handleAction('download')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 text-white"
          >
            <Download size={16} className="text-white" />
            <span className="text-white">Baixar PDF Nativo</span>
          </button>
        </div>
      </div>

      <div className="bg-slate-850 border-b border-slate-800 p-2 flex items-center justify-between px-6 z-10 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
            Modo de Visualização: <span className="text-blue-400">PDF Oficial ({totalPagesCount} fls)</span>
          </span>
          {isCompiling && (
            <div className="flex items-center gap-1 text-[8px] font-black uppercase text-blue-400 animate-pulse">
              <RefreshCw size={10} className="animate-spin" />
              <span>Sincronizando vetor...</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 px-3 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-[8px] font-black text-emerald-400 uppercase select-none leading-none">
          Documento Seguro Autorizado
        </div>
      </div>

      {/* Main View Area (Houses the actual PDF preview direct layout) */}
      <div className="flex-1 w-full bg-slate-950 overflow-hidden relative flex flex-col justify-center">
        {compileError ? (
          <div className="flex flex-col items-center gap-3 max-w-sm mx-auto px-6 py-12 text-center text-slate-400">
            <AlertCircle size={28} className="text-rose-500" />
            <span className="text-xs font-black uppercase tracking-widest text-rose-500">Erro na visualização</span>
            <span className="text-[10px] bg-rose-500/10 border border-rose-500/20 text-rose-400 font-mono px-3 py-1.5 rounded-lg max-w-full block whitespace-pre-wrap text-left mt-2 shadow">
              {compileError}
            </span>
          </div>
        ) : pdfDoc ? (
          <div className="w-full h-full overflow-y-auto p-4 md:p-8 flex flex-col gap-8 items-center bg-slate-950/90 custom-scrollbar">
            {Array.from({ length: totalPagesCount }, (_, idx) => (
              <PdfPage key={idx + 1} pdfDoc={pdfDoc} pageNumber={idx + 1} />
            ))}
          </div>
        ) : pdfUrl ? (
          <iframe 
            src={`${pdfUrl}#toolbar=0&navpanes=0&statusbar=0&view=FitH`} 
            className="w-full h-full flex-1 border-none bg-slate-900"
            title="Visualizador de PDF Realtime"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-8 gap-4 text-slate-400 text-center">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-4 border-blue-500/10"></div>
              <div className="absolute inset-0 rounded-full border-4 border-blue-50 border-t-transparent animate-spin"></div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Sincronizando Pré-visualização Vetorial</span>
            <span className="text-[9px] text-slate-500 max-w-xs">{compilingStep || 'Calculando fluxos de textos, tabelas metrológicas e logotipos oficiais...'}</span>
          </div>
        )}
      </div>

      {/* Footer lock badge */}
      <div className="bg-slate-950 p-2.5 px-6 border-t border-slate-900 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span className="text-[8px] font-mono font-black text-slate-500 uppercase tracking-wider">
            PREVIEW DE ALTA FIDELIDADE: RIGOROSAMENTE IGUAL À INSTRUÇÃO IMPRESSA
          </span>
        </div>
        <span className="text-[8px] text-slate-600 font-bold uppercase italic">
          Dr. Roger POP Manager
        </span>
      </div>

    </div>
  );
}
