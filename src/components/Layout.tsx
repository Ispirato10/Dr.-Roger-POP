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
  Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PWAInstall } from './PWAInstall';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, drugstore } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const sidebarClasses = React.useMemo(() => `
    fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-[#e2e8f0] p-5 flex flex-col gap-2 transform transition-transform duration-300 md:relative md:translate-x-0
    ${isMenuOpen ? 'translate-x-0 pt-20' : '-translate-x-full'}
  `, [isMenuOpen]);

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Meus POPs', path: '/pops', icon: FileText },
    { name: 'Formulários', path: '/forms', icon: ClipboardCheck },
    { name: 'Novo POP', path: '/pops/new', icon: PlusCircle },
    { name: 'Dados da Drogaria', path: '/profile', icon: Building2 },
    { name: 'Apoiar Projeto', path: '/support', icon: Heart },
  ];

  if (!user) return <>{children}</>;

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="h-16 bg-[#0f172a] text-white flex items-center justify-between px-6 border-b-4 border-[#3b82f6] shrink-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="md:hidden mr-2">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
          <div className="hidden md:flex items-center space-x-3">
            <div className="w-8 h-8 bg-[#2563eb] rounded-md flex items-center justify-center font-bold text-xl">R</div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight leading-none uppercase">Dr. Roger POP</span>
              <span className="text-[10px] opacity-70 font-semibold tracking-wider">SISTEMA DE GESTÃO FARMACÊUTICA</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-5">
          <div className="hidden sm:block text-right">
            <div className="text-[13px] font-semibold leading-none">{drugstore?.name || 'Farmácia'}</div>
            <div className="text-[11px] opacity-70 mt-0.5 leading-none">CRF: {drugstore?.crf || '-'}</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#334155] border border-[#475569] flex items-center justify-center text-xs font-bold">
            {user.email?.[0].toUpperCase()}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <aside className={sidebarClasses}>
          <div className="flex-1 overflow-y-auto px-1 py-1 custom-scrollbar">
            <nav className="flex flex-col space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`nav-item ${location.pathname === item.path ? 'nav-item-active' : ''}`}
                >
                  <item.icon size={18} />
                  <span className="text-sm">{item.name}</span>
                </Link>
              ))}
            </nav>

            <div className="mt-6">
              <div className="text-[11px] font-bold text-[#94a3b8] uppercase mb-3 px-3 tracking-wider">Categorias Rápidas</div>
              <div className="flex flex-col space-y-0.5">
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
                    className="px-3 py-1.5 text-sm text-[#475569] hover:text-[#2563eb] transition-colors flex items-center"
                  >
                    <span className="mr-2 opacity-50">•</span> {cat}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#f1f5f9] shrink-0 space-y-3">
            <button
              onClick={() => {
                const text = encodeURIComponent("Acesse o Dr. Roger POP - Sistema de Gestão Farmacêutica: https://dr-roger-pop.vercel.app");
                window.open(`https://wa.me/?text=${text}`, '_blank');
              }}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all text-sm font-bold shadow-sm"
            >
              <Share2 size={16} />
              <span>Compartilhar Web App</span>
            </button>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center space-x-3 px-3 py-2.5 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-md transition-all text-sm font-medium"
            >
              <LogOut size={18} />
              <span>Sair do Sistema</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 p-6 md:p-8 overflow-auto">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="max-w-6xl mx-auto"
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
