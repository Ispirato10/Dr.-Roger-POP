import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, limit, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
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
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const { drugstore, user } = useAuth();
  const [stats, setStats] = React.useState({
    total: 0,
    active: 0,
    drafts: 0
  });
  const [recentPops, setRecentPops] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchDashboardData = async () => {
    if (!drugstore) return;
    try {
      const popsRef = collection(db, 'pops');
      const q = query(popsRef, where('drugstoreId', '==', drugstore.id), orderBy('updatedAt', 'desc'), limit(5));
      const snapshot = await getDocs(q);
      
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecentPops(docs);

      // Fetch counts
      const allQ = query(popsRef, where('drugstoreId', '==', drugstore.id));
      const allSnapshot = await getDocs(allQ);
      const allDocs = allSnapshot.docs.map(d => d.data());
      
      setStats({
        total: allDocs.length,
        active: allDocs.filter(d => d.status === 'active').length,
        drafts: allDocs.filter(d => d.status === 'draft').length
      });
    } catch (error) {
      console.error("Error fetching dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchDashboardData();
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
    const previousPops = [...recentPops];
    setRecentPops(prev => prev.filter(p => p.id !== id));
    
    try {
      await deleteDoc(doc(db, 'pops', id));
      await fetchDashboardData();
    } catch (error: any) {
      console.error("Error deleting:", error);
      setRecentPops(previousPops);
      alert(`Erro ao excluir: ${error.message}`);
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
        <Link to="/pops/new" className="btn-primary flex items-center space-x-2 self-start md:self-auto group">
          <PlusCircle size={20} className="group-hover:rotate-90 transition-transform duration-300" />
          <span>Criar Novo POP</span>
        </Link>
      </div>

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
                      <span className="text-sm font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">{pop.title}</span>
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
