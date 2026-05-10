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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]">Visão Geral</h1>
          <p className="text-sm text-[#64748b]">Gestão normativa e controle de procedimentos operacionais padrão.</p>
        </div>
        <Link to="/pops/new" className="btn-primary flex items-center space-x-2 self-start md:self-auto">
          <PlusCircle size={18} />
          <span>Novo POP</span>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#e2e8f0] rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-[#2563eb]">{stats.total}</div>
          <div className="text-[12px] text-[#64748b] uppercase font-semibold mt-1">Total POPs</div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-[#2563eb]">{stats.active}</div>
          <div className="text-[12px] text-[#64748b] uppercase font-semibold mt-1">POPs Ativos</div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-[#2563eb]">{stats.drafts}</div>
          <div className="text-[12px] text-[#64748b] uppercase font-semibold mt-1">Aguardando Revisão</div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-[#2563eb]">100%</div>
          <div className="text-[12px] text-[#64748b] uppercase font-semibold mt-1">Conformidade</div>
        </div>
      </div>

      <div className="bg-white border border-[#e2e8f0] rounded-lg overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.1)] flex flex-col">
        <div className="p-4 border-b border-[#e2e8f0] flex justify-between items-center bg-[#f8fafc]">
          <span className="font-bold text-sm text-[#1e293b]">Documentos Recentes</span>
          <Link to="/pops" className="text-xs font-semibold text-[#2563eb] hover:underline">Ver todos os documentos &rarr;</Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                <th className="px-4 py-3 text-[13px] font-semibold text-[#64748b]">Código</th>
                <th className="px-4 py-3 text-[13px] font-semibold text-[#64748b]">Procedimento Operacional Padrão</th>
                <th className="px-4 py-3 text-[13px] font-semibold text-[#64748b]">Versão</th>
                <th className="px-4 py-3 text-[13px] font-semibold text-[#64748b]">Última Revisão</th>
                <th className="px-4 py-3 text-[13px] font-semibold text-[#64748b]">Status</th>
                <th className="px-4 py-3 text-[13px] font-semibold text-[#64748b]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {recentPops.length > 0 ? recentPops.map((pop) => (
                <tr key={pop.id} className="border-b border-[#f1f5f9] hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-slate-500">{pop.code}</td>
                  <td className="px-4 py-3 text-sm font-medium text-[#1e293b]">{pop.title}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">v{pop.version}.0</td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {pop.updatedAt ? format(new Date(pop.updatedAt), 'dd/MM/yyyy') : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`status-tag ${pop.status === 'active' ? 'status-active' : 'status-review'}`}>
                      {pop.status === 'active' ? 'Ativo' : 'Rascunho'}
                    </span>
                  </td>
                   <td className="px-4 py-3 text-sm">
                    <div className="flex items-center space-x-2">
                      <Link 
                        to={`/pops/edit/${pop.id}`} 
                        className="p-1.5 text-[#2563eb] hover:bg-blue-50 rounded transition-all"
                        title="Editar"
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
                         className={`p-2 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed group/del flex items-center justify-center cursor-pointer shadow-sm border ${
                           confirmDelete === pop.id 
                             ? 'bg-red-600 text-white hover:bg-red-700 border-red-700' 
                             : 'text-red-500 bg-red-50 hover:bg-red-100 border-red-100'
                         }`}
                         title={confirmDelete === pop.id ? "Clique novamente para confirmar a exclusão" : "Excluir Permanentemente"}
                       >
                         {isDeleting === pop.id ? (
                           <Loader2 size={16} className="animate-spin" />
                         ) : confirmDelete === pop.id ? (
                           <span className="text-[10px] font-bold px-1 uppercase leading-none">Confirmar?</span>
                         ) : (
                           <Trash2 size={16} className="group-hover/del:scale-110 transition-transform" />
                         )}
                       </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">Nenhum documento recente.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
