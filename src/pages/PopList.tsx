import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
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
  Clock,
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

  React.useEffect(() => {
    if (!drugstore) return;
    
    setLoading(true);
    const q = query(collection(db, 'pops'), where('drugstoreId', '==', drugstore.id));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setPops(docs);
      setLoading(false);
    }, (error) => {
      console.error("Pops list snapshot error:", error);
      handleFirestoreError(error, OperationType.LIST, 'pops');
      setLoading(false);
    });

    return () => unsubscribe();
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

  const filteredPops = pops.filter(pop => {
    const matchesSearch = pop.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          pop.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (pop.category && pop.category.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || pop.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 leading-none tracking-tight">Biblioteca de POPs</h1>
          <p className="text-sm text-slate-500 mt-2 font-medium tracking-tight">Gerencie todos os procedimentos operacionais e normativos da sua drogaria.</p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto">
          <Link to="/pops/new" className="btn-primary flex items-center space-x-2 group">
            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            <span>Novo Documento</span>
          </Link>
        </div>
      </div>

      <div className="card border-none shadow-xl shadow-slate-200/50 p-8 space-y-8">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
            <input
              type="text"
              placeholder="Buscar por título, código ou categoria..."
              className="input-field pl-12 bg-slate-50 border-transparent focus:bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative md:w-64">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
            <select
              className="input-field pl-12 bg-slate-50 border-transparent focus:bg-white appearance-none cursor-pointer font-bold text-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Todos os Status</option>
              <option value="active">Ativos</option>
              <option value="draft">Rascunhos</option>
              <option value="archived">Arquivados</option>
            </select>
          </div>
        </div>

        {/* Table Area */}
        <div className="bg-white border border-slate-50 rounded-3xl overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center gap-4 text-slate-400">
              <Loader2 className="animate-spin text-blue-600" size={32} />
              <span className="text-sm font-bold uppercase tracking-widest">Sincronizando Biblioteca...</span>
            </div>
          ) : filteredPops.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">CÓDIGO / TÍTULO</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">HISTÓRICO</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">ESTADO</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">AÇÕES</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPops.map((pop) => (
                    <tr key={pop.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-all group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-mono text-[10px] font-bold">
                            {pop.code}
                          </div>
                          <div className="flex flex-col">
                            <Link 
                              to={`/pops/edit/${pop.id}`}
                              className="text-sm font-black text-slate-900 tracking-tight hover:text-blue-600 transition-colors uppercase leading-tight"
                            >
                              {pop.title}
                            </Link>
                            <span className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Versão v{pop.version}.0</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-2 text-slate-500 font-bold text-xs leading-none">
                            <Clock size={12} className="text-slate-300" />
                            {pop.updatedAt ? format(new Date(pop.updatedAt), 'dd/MM/yyyy') : '-'}
                          </div>
                          <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">Última Atualização</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className={`status-tag ${pop.status === 'active' ? 'status-active' : 'status-review'}`}>
                          {pop.status === 'active' ? 'Ativo' : pop.status === 'draft' ? 'Rascunho' : 'Arquivado'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Link 
                            to={`/pops/edit/${pop.id}?mode=preview`}
                            className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                            title="Visualizar Documento"
                          >
                            <Eye size={16} />
                          </Link>
                          <Link 
                            to={`/pops/edit/${pop.id}`}
                            className="w-10 h-10 flex items-center justify-center bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
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
                            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm border ${
                              confirmDelete === pop.id 
                                ? 'bg-red-600 text-white hover:bg-red-700 border-red-700 z-10 scale-105' 
                                : 'text-red-500 bg-red-50 hover:bg-red-100 border-red-100'
                            }`}
                            title={confirmDelete === pop.id ? "Confirmar exclusão" : "Excluir permanentemente"}
                          >
                            {isDeleting === pop.id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : confirmDelete === pop.id ? (
                              <span className="text-[10px] font-black px-1 uppercase leading-none">OK?</span>
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-24 text-center">
              <div className="inline-flex w-16 h-16 bg-slate-50 rounded-3xl items-center justify-center text-slate-300 mb-4">
                <FileText size={32} />
              </div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest leading-relaxed">Nenhum POP encontrado com os filtros atuais.</p>
              <button 
                onClick={() => { setSearchTerm(''); setFilterStatus('all'); }}
                className="mt-6 text-xs font-black text-blue-600 hover:underline uppercase tracking-widest"
              >
                Limpar Todos os Filtros
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
