import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { 
  PlusCircle, 
  FileText, 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  Building2,
  Menu,
  X,
  ClipboardCheck,
  Share2,
  Heart,
  Stethoscope,
  Pill
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PWAInstall } from './PWAInstall';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, drugstore } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  // Close menu on route or search change
  React.useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname, location.search]);

  const sidebarClasses = React.useMemo(() => `
    fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-[#e2e8f0] p-5 flex flex-col gap-2 transform transition-transform duration-300 md:relative md:translate-x-0
    ${isMenuOpen ? 'translate-x-0 pt-20' : '-translate-x-full'}
  `, [isMenuOpen]);

  const handleSignOut = async () => {
    setIsMenuOpen(false);
    await signOut(auth);
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Declarações', path: '/services', icon: FileText },
    { name: 'Anamnese', path: '/anamnesis', icon: Stethoscope },
    { name: 'Receituário', path: '/prescription', icon: Pill },
    { name: 'Meus POPs', path: '/pops', icon: FileText },
    { name: 'Formulários', path: '/forms', icon: ClipboardCheck },
    { name: 'Novo POP', path: '/pops/new', icon: PlusCircle },
    { name: 'Dados da Drogaria', path: '/profile', icon: Building2 },
    { name: 'Configurações', path: '/settings', icon: Settings },
    { name: 'Apoiar Projeto', path: '/support', icon: Heart },
  ];

  if (!user) return <>{children}</>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-100 shrink-0 z-50 flex items-center justify-between px-6">
        <div className="flex items-center space-x-3">
          <div className="mr-2">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
          <div className="flex items-center space-x-4 cursor-pointer group" onClick={() => { navigate('/'); setIsMenuOpen(false); }}>
            <div className="w-11 h-11 relative">
              <div className="absolute inset-0 bg-blue-600 blur-lg opacity-20 group-hover:opacity-40 transition-opacity"></div>
              <img src="/logorogerpop.png" alt="Logo" className="w-full h-full object-contain relative z-10 drop-shadow-md group-hover:scale-105 transition-transform" />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-xl font-black tracking-tighter leading-none text-blue-600">DR. ROGER <span className="text-slate-900 font-black">POP</span></span>
              <span className="text-[10px] text-slate-400 font-black tracking-[0.2em] uppercase mt-1">Sistemas de Qualidade</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden sm:block text-right mr-2">
            <div className="text-sm font-black text-slate-900 leading-none uppercase tracking-tight">{drugstore?.name || 'Drogaria'}</div>
            <div className="text-[10px] text-slate-400 font-bold mt-1.5 leading-none tracking-[0.1em] uppercase">CRF: {drugstore?.crf || '-'}</div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm flex items-center justify-center text-sm font-black text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all cursor-pointer">
              {user.email?.[0].toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-100 p-6 flex flex-col gap-6 transform transition-transform duration-300
          ${isMenuOpen ? 'translate-x-0 pt-24' : '-translate-x-full'}
        `}>
          <div className="flex-1 overflow-y-auto px-1 py-1 custom-scrollbar">
            <nav className="flex flex-col space-y-1.5">
              <div className="text-[10px] font-black text-slate-400 uppercase mb-4 px-4 tracking-widest leading-none">Menu Principal</div>
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`nav-item flex items-center gap-4 ${location.pathname === item.path ? 'nav-item-active' : ''}`}
                >
                  <item.icon size={18} className={location.pathname === item.path ? 'text-blue-600' : 'text-slate-400'} />
                  <span className="text-sm tracking-tight">{item.name}</span>
                </Link>
              ))}
            </nav>

            <div className="mt-8">
              <div className="text-[10px] font-black text-slate-400 uppercase mb-4 px-4 tracking-widest leading-none">Categorias Rápidas</div>
              <div className="flex flex-col space-y-1">
                {[
                  'Assistência',
                  'Controlados',
                  'Logística',
                  'Sanitário',
                  'Gestão',
                  'Qualidade'
                ].map((cat) => (
                  <Link 
                    key={cat}
                    to={`/pops?q=${encodeURIComponent(cat)}`} 
                    onClick={() => setIsMenuOpen(false)}
                    className="px-4 py-2 text-sm text-slate-500 font-bold hover:text-blue-600 hover:translate-x-1 transition-all flex items-center"
                  >
                    <span className="mr-3 text-[8px] text-slate-300">•</span> {cat}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-50 shrink-0 space-y-4">
            <button
              onClick={() => {
                setIsMenuOpen(false);
                const text = encodeURIComponent("Acesse o Dr. Roger POP - Sistema de Gestão Farmacêutica: https://dr-roger-pop.vercel.app");
                window.open(`https://wa.me/?text=${text}`, '_blank');
              }}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl transition-all text-xs font-black shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <Share2 size={16} />
              <span>INDICAR SISTEMA</span>
            </button>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center space-x-3 px-4 py-3 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-2xl transition-all text-sm font-bold group"
            >
              <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
              <span>Sair do Sistema</span>
            </button>
          </div>
        </aside>

        <main className={`flex-1 p-6 md:p-10 overflow-auto custom-scrollbar transition-all duration-300 ${isMenuOpen ? 'md:pl-80' : 'md:pl-10'}`}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="max-w-7xl mx-auto"
          >
            {children}
          </motion.div>
        </main>

        {/* Mobile Overlay */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-[#0f172a]/40 backdrop-blur-sm z-30 md:hidden"
            />
          )}
        </AnimatePresence>
        <PWAInstall />
      </div>
    </div>
  );
};
