import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  FileText, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Copy, 
  Eye,
  Plus,
  ArrowUpDown,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';

export default function PopList() {
  const { drugstore } = useAuth();
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get('q');
  
  const [pops, setPops] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState(queryParam || '');
  const [filterStatus, setFilterStatus] = React.useState('all');

  // Update search term when query param changes
  React.useEffect(() => {
    if (queryParam !== null) {
      setSearchTerm(queryParam);
    }
  }, [queryParam]);

  const fetchPops = async () => {
    if (!drugstore) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'pops'), where('drugstoreId', '==', drugstore.id));
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setPops(docs);
    } catch (error) {
      console.error("Error fetching pops:", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchPops();
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
    const previousPops = [...pops];
    setPops(prev => prev.filter(p => p.id !== id));

    try {
      await deleteDoc(doc(db, 'pops', id));
    } catch (error: any) {
      console.error("Error deleting POP:", error);
      setPops(previousPops);
      alert(`Erro ao excluir: ${error.message}`);
    } finally {
      setIsDeleting(null);
    }
  };

  const filteredPops = pops.filter(pop => {
    const matchesSearch = pop.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          pop.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (pop.category && pop.category.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || pop.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Biblioteca de POPs</h1>
          <p className="text-slate-500">Gerencie todos os procedimentos da sua drogaria.</p>
        </div>
        <Link to="/pops/new" className="btn-primary flex items-center space-x-2">
          <Plus size={20} />
          <span>Novo POP</span>
        </Link>
      </div>

      <div className="card space-y-4">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por título ou código..."
              className="input-field pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="input-field md:w-48 appearance-none"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Todos os Status</option>
            <option value="active">Ativos</option>
            <option value="draft">Rascunhos</option>
            <option value="archived">Arquivados</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white border-t border-[#e2e8f0] -mx-5 -mb-5 overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-slate-500">Carregando...</div>
          ) : filteredPops.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                  <th className="px-4 py-3 text-[13px] font-semibold text-[#64748b]">Código</th>
                  <th className="px-4 py-3 text-[13px] font-semibold text-[#64748b]">Procedimento Operacional Padrão</th>
                  <th className="px-4 py-3 text-[13px] font-semibold text-[#64748b]">Versão</th>
                  <th className="px-4 py-3 text-[13px] font-semibold text-[#64748b]">Última Revisão</th>
                  <th className="px-4 py-3 text-[13px] font-semibold text-[#64748b]">Status</th>
                  <th className="px-4 py-3 text-[13px] font-semibold text-[#64748b] text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredPops.map((pop) => (
                  <tr key={pop.id} className="border-b border-[#f1f5f9] hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono text-slate-500">{pop.code}</td>
                    <td className="px-4 py-3 text-sm font-medium text-[#1e293b]">{pop.title}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">v{pop.version}.0</td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {pop.updatedAt ? format(new Date(pop.updatedAt), 'dd/MM/yyyy') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`status-tag ${pop.status === 'active' ? 'status-active' : 'status-review'}`}>
                        {pop.status === 'active' ? 'Ativo' : pop.status === 'draft' ? 'Rascunho' : 'Arquivado'}
                      </span>
                    </td>
                     <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
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
                              ? 'bg-red-600 text-white hover:bg-red-700 border-red-700 z-10' 
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
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-slate-500">
              Nenhum POP encontrado com os filtros atuais.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
