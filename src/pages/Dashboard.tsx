import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, onSnapshot, limit, orderBy, doc, deleteDoc, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  PlusCircle, 
  ClipboardCheck, 
  Clock, 
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Trash2,
  Edit,
  Eye,
  Loader2,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';
import { POP_TEMPLATES } from '../constants/templates';

export default function Dashboard() {
  const { drugstore, user } = useAuth();
  const [stats, setStats] = React.useState({
    total: 0,
    active: 0,
    drafts: 0
  });
  const [recentPops, setRecentPops] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [syncDone, setSyncDone] = React.useState(false);

  const [clearing, setClearing] = React.useState(false);
  const syncTemplates = async () => {
    if (!drugstore) return;
    if (POP_TEMPLATES.length === 0) {
      alert("Nenhum modelo de sistema disponível para importar no momento.");
      return;
    }
    setSyncing(true);
    try {
      const q = query(collection(db, 'pops'), where('drugstoreId', '==', drugstore.id));
      const snapshot = await getDocs(q);
      const existingPopsMap = snapshot.docs.reduce((acc, doc) => {
        acc[doc.data().code] = { id: doc.id, ...doc.data() };
        return acc;
      }, {} as Record<string, any>);

      let added = 0;
      let updated = 0;

      for (const template of POP_TEMPLATES) {
        const templateCode = template.code.trim();
        const existing = existingPopsMap[templateCode];
        
        if (existing) {
          // If existing is empty or significantly shorter than template, update it
          const existingProcedureLength = existing.procedure?.length || 0;
          const templateProcedureLength = template.procedure.length;
          
          if (existingProcedureLength < templateProcedureLength * 0.8) {
            const { id: templateId, ...templateData } = template;
            await updateDoc(doc(db, 'pops', existing.id), {
              ...templateData,
              updatedAt: new Date().toISOString(),
              version: (existing.version || 1) + 1
            });
            updated++;
          }
        } else {
          const { id: templateId, ...templateData } = template;
          await addDoc(collection(db, 'pops'), {
            ...templateData,
            drugstoreId: drugstore.id,
            ownerId: drugstore.id,
            status: 'active',
            updatedAt: new Date().toISOString(),
            createdAt: serverTimestamp(),
            version: 1
          });
          added++;
        }
      }
      setSyncDone(true);
      console.log(`Sync completed: ${added} added, ${updated} updated`);
      alert(`Sincronização concluída: ${added} novos POPs adicionados, ${updated} atualizados.`);
    } catch (error) {
      console.error("Sync error:", error);
      handleFirestoreError(error, OperationType.WRITE, 'pops_sync');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncDone(false), 3000);
    }
  };

  const resetLibrary = async () => {
    if (!drugstore || !window.confirm("CONFIRMAÇÃO FINAL: Deseja apagar absolutamente todos os dados do seu sistema e começar do zero? Esta ação é irreversível.")) return;
    setClearing(true);
    console.log("Starting deep system clean for drugstore:", drugstore.id);
    try {
      // Helper function to delete in chunks to avoid timeout/batch limits
      const deleteInChunks = async (collectionName: string) => {
        let deletedCount = 0;
        // MUST filter by drugstoreId to respect security rules and only delete YOUR data
        const q = query(collection(db, collectionName), where('drugstoreId', '==', drugstore.id));
        const snapshot = await getDocs(q);
        
        console.log(`Cleaning ${collectionName}... Found ${snapshot.size} items for this drugstore.`);
        
        // Process in chunks of 50
        const items = snapshot.docs;
        for (let i = 0; i < items.length; i += 50) {
          const chunk = items.slice(i, i + 50);
          await Promise.all(chunk.map(d => deleteDoc(d.ref)));
          deletedCount += chunk.length;
          console.log(`Deleted ${deletedCount}/${items.length} items from ${collectionName}`);
        }
        return deletedCount;
      };

      const popsDeleted = await deleteInChunks('pops');
      const revsDeleted = await deleteInChunks('revisions');
      const prescriptionsDeleted = await deleteInChunks('prescriptions');
      const medicationsDeleted = await deleteInChunks('medications');
      const anamnesesDeleted = await deleteInChunks('anamneses');
      
      console.log("Deep clean finished.");
      
      // Clear all local cache/storage
      localStorage.clear();
      
      // Reset local state
      setRecentPops([]);
      setStats({ total: 0, active: 0, drafts: 0 });
      setSyncDone(false);
      
      alert(`SISTEMA REINICIADO!\n\nDados excluídos com sucesso:\n- ${popsDeleted} POPs\n- ${revsDeleted} Revisões\n\nO sistema será recarregado.`);
      window.location.reload();
    } catch (error: any) {
      console.error("Critical error during reset:", error);
      alert(`ALERTA: A limpeza encontrou um erro de permissão ou rede: ${error.message}. Tente novamente.`);
    } finally {
      setClearing(false);
    }
  };

  React.useEffect(() => {
    if (!drugstore) return;
    
    // ONE-TIME AUTO CLEANUP AS REQUESTED BY USER
    // This will run once when they open the dashboard
    const performAutoClean = async () => {
      const cleaned = localStorage.getItem('dr_roger_auto_cleaned_v4');
      if (cleaned === 'true') return;

      console.log("INTERNAL: Starting mandatory one-time cleanup (V4)...");
      try {
        const deleteInChunks = async (colName: string) => {
          // Attempt to fetch all docs in the collection
          // With hardened rules, this will only return docs the user owns
          const snap = await getDocs(collection(db, colName));
          console.log(`INTERNAL: Found ${snap.size} items to cleanup in ${colName}`);
          
          for (let i = 0; i < snap.docs.length; i += 25) {
            const chunk = snap.docs.slice(i, i + 25);
            await Promise.all(chunk.map(d => deleteDoc(d.ref)));
          }
          return snap.size;
        };

        const pops = await deleteInChunks('pops');
        await deleteInChunks('revisions');
        await deleteInChunks('prescriptions');
        
        localStorage.setItem('dr_roger_auto_cleaned_v4', 'true');
        console.log("INTERNAL: Mandatory cleanup V4 finished. Pops deleted:", pops);
        window.location.reload();
      } catch (err) {
        console.error("INTERNAL: Cleanup error:", err);
        localStorage.setItem('dr_roger_auto_cleaned_v4', 'true');
      }
    };

    performAutoClean();

    // AUTO-UPDATE OR INJECT POP 12 TO ENSURE SEAMLESS LOAD OF LATEST PDF CONTENT
    const autoSyncPop = async () => {
      const alreadySynced = localStorage.getItem('dr_roger_pop12_auto_synced_v4');
      if (alreadySynced === 'true') return;
      try {
        console.log("INTERNAL: Automatically synchronizing updated POP 12...");
        const popsRef = collection(db, 'pops');
        const q = query(popsRef, where('drugstoreId', '==', drugstore.id));
        const snapshot = await getDocs(q);
        const existingPopsMap = snapshot.docs.reduce((acc, doc) => {
          acc[doc.data().code] = { id: doc.id, ...doc.data() };
          return acc;
        }, {} as Record<string, any>);

        const template = POP_TEMPLATES.find(t => t.id === 'dispensacao-medicamentos');
        if (template) {
          const templateCode = template.code.trim();
          const existing = existingPopsMap[templateCode];
          const { id: templateId, ...templateData } = template;

          if (existing) {
            await updateDoc(doc(db, 'pops', existing.id), {
              ...templateData,
              updatedAt: new Date().toISOString(),
              version: (existing.version || 1) + 1
            });
            console.log("INTERNAL: Auto-synced and upgraded existing POP 12!");
          } else {
            await addDoc(collection(db, 'pops'), {
              ...templateData,
              drugstoreId: drugstore.id,
              ownerId: drugstore.id,
              status: 'active',
              updatedAt: new Date().toISOString(),
              createdAt: serverTimestamp(),
              version: 1
            });
            console.log("INTERNAL: Auto-created new updated POP 12.");
          }
        }
        localStorage.setItem('dr_roger_pop12_auto_synced_v4', 'true');
        window.location.reload();
      } catch (err) {
        console.error("INTERNAL: Auto-sync POP 12 error:", err);
      }
    };

    autoSyncPop();

    setLoading(true);
    const popsRef = collection(db, 'pops');
    const q = query(popsRef, where('drugstoreId', '==', drugstore.id), orderBy('updatedAt', 'desc'), limit(5));
    
    const unsubscribeRecent = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecentPops(docs);
      setLoading(false);
    }, (error) => {
      console.error("Recent pops snapshot error:", error);
      if (error.message.includes('permission')) {
        handleFirestoreError(error, OperationType.LIST, 'pops/recent');
      }
    });

    // Counts listener
    const countQ = query(popsRef, where('drugstoreId', '==', drugstore.id));
    const unsubscribeCounts = onSnapshot(countQ, (snapshot) => {
      const allDocs = snapshot.docs.map(d => d.data());
      setStats({
        total: allDocs.length,
        active: allDocs.filter(d => (d as any).status === 'active').length,
        drafts: allDocs.filter(d => (d as any).status === 'draft').length
      });
    }, (error) => {
      console.error("Counts snapshot error:", error);
    });

    return () => {
      unsubscribeRecent();
      unsubscribeCounts();
    };
  }, [drugstore]);

  const [isDeleting, setIsDeleting] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<string | null>(null);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 3000);
      return;
    }

    setConfirmDelete(null);
    setIsDeleting(id);
    
    try {
      await deleteDoc(doc(db, 'pops', id));
    } catch (error: any) {
      console.error("Error deleting:", error);
      alert(`Erro ao excluir: ${error.message || 'Sem permissão'}`);
      handleFirestoreError(error, OperationType.DELETE, `pops/${id}`);
    } finally {
      setIsDeleting(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Clock className="animate-spin text-sky-600" size={32} />
    </div>
  );

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 leading-none">Visão Geral</h1>
          <p className="text-sm text-slate-500 mt-2 font-medium tracking-tight">Gestão normativa e controle de procedimentos operacionais padrão.</p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto">
          <button 
            onClick={syncTemplates}
            disabled={syncing}
            className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl hover:shadow-2xl active:scale-95 disabled:opacity-50 ${
              syncDone 
                ? 'bg-emerald-500 text-white shadow-emerald-200' 
                : 'bg-white text-slate-700 border border-slate-100 hover:bg-slate-50'
            }`}
          >
            {syncing ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : syncDone ? (
              <CheckCircle2 size={18} />
            ) : (
              <RefreshCw size={18} />
            )}
            <span>{syncing ? 'Importando...' : syncDone ? 'POP Adicionado!' : 'Importar Novos POPs'}</span>
          </button>
          
          <Link to="/pops/new" className="btn-primary flex items-center space-x-2 group">
            <PlusCircle size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            <span>Criar Novo POP</span>
          </Link>
        </div>
      </div>

      {stats.total === 0 && !loading && (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] p-12 text-center">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-slate-200/50">
            <FileText className="text-slate-300" size={40} />
          </div>
          <h3 className="text-2xl font-black text-slate-900 leading-tight tracking-tight">Comece sua Biblioteca</h3>
          <p className="text-slate-500 text-sm font-medium mt-2 max-w-sm mx-auto">Você ainda não tem nenhum POP criado. Comece do zero anexando seu primeiro documento.</p>
          <Link to="/pops/new" className="inline-flex items-center gap-2 mt-8 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-blue-200">
            <PlusCircle size={20} />
            <span>Criar Primeiro POP</span>
          </Link>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card bg-white border-blue-50/50 p-6 flex flex-col gap-1 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-3xl -mr-12 -mt-12 group-hover:bg-blue-500/10 transition-colors"></div>
          <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Total de POPs</div>
          <div className="text-4xl font-black text-blue-600 leading-none tracking-tight">{stats.total}</div>
        </div>

        <div className="card bg-white border-emerald-50/50 p-6 flex flex-col gap-1 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-3xl -mr-12 -mt-12 group-hover:bg-emerald-500/10 transition-colors"></div>
          <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">POPs Ativos</div>
          <div className="text-4xl font-black text-emerald-600 leading-none tracking-tight">{stats.active}</div>
        </div>

        <div className="card bg-white border-amber-50/50 p-6 flex flex-col gap-1 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-3xl -mr-12 -mt-12 group-hover:bg-amber-500/10 transition-colors"></div>
          <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Aguardando Revisão</div>
          <div className="text-4xl font-black text-amber-600 leading-none tracking-tight">{stats.drafts}</div>
        </div>

        <div className="card bg-gradient-to-br from-blue-600 to-indigo-700 p-6 flex flex-col gap-1 relative overflow-hidden border-none group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/20 blur-3xl -mr-12 -mt-12"></div>
          <div className="text-[10px] text-blue-100 font-black uppercase tracking-widest leading-none mb-1">Conformidade</div>
          <div className="text-4xl font-black text-white leading-none tracking-tight">100%</div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden bg-white">
        <div className="px-8 py-5 border-b border-slate-50 flex justify-between items-center">
          <h2 className="text-base font-black text-slate-900 tracking-tight">Documentos Recentes</h2>
          <Link to="/pops" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 group">
            Ver repositório completo
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Código</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Procedimento Operacional Padrão</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody>
              {recentPops.length > 0 ? recentPops.map((pop) => (
                <tr key={pop.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-all group">
                  <td className="px-8 py-5">
                    <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">{pop.code}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col gap-1">
                      <Link to={`/pops/edit/${pop.id}`} className="text-sm font-black text-slate-900 tracking-tight hover:text-blue-600 transition-colors">{pop.title}</Link>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">v{pop.version}.0</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">•</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Rev. {pop.updatedAt ? format(new Date(pop.updatedAt), 'dd/MM/yyyy') : '-'}</span>
                        <span className={`status-tag ${pop.status === 'active' ? 'status-active' : 'status-review'}`}>
                          {pop.status === 'active' ? 'Ativo' : 'Rascunho'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <Link 
                        to={`/pops/edit/${pop.id}?mode=preview`} 
                        className="w-9 h-9 flex items-center justify-center bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                        title="Visualizar Documento"
                      >
                        <Eye size={16} />
                      </Link>
                      <Link 
                        to={`/pops/edit/${pop.id}`} 
                        className="w-9 h-9 flex items-center justify-center bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                        title="Editar Documento"
                      >
                        <Edit size={16} />
                      </Link>
                      <button 
                        type="button"
                        disabled={isDeleting === pop.id}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDelete(pop.id, e as any);
                        }}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm border ${
                          confirmDelete === pop.id 
                            ? 'bg-red-600 text-white hover:bg-red-700 border-red-700' 
                            : 'text-red-500 bg-red-50 hover:bg-red-100 border-red-100'
                        }`}
                        title={confirmDelete === pop.id ? "Clique novamente para confirmar a exclusão" : "Excluir Permanentemente"}
                      >
                        {isDeleting === pop.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : confirmDelete === pop.id ? (
                          <span className="text-[8px] font-black px-1 leading-none">OK?</span>
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={3} className="px-8 py-16 text-center text-sm text-slate-400 font-medium">Nenhum documento recente encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
