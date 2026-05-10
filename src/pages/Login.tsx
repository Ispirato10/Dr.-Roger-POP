import React from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, LogIn } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [error, setError] = React.useState<string | null>(null);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/');
    } catch (err: any) {
      if (err.code === 'auth/unauthorized-domain') {
        setError("Domínio não autorizado. Adicione o domínio atual (ex: vercel.app) no Console do Firebase > Authentication > Settings > Authorized Domains.");
      } else {
        setError(err.message);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600 blur-[120px] rounded-full"></div>
      </div>

      <div className="card max-w-md w-full text-center space-y-10 py-16 px-10 relative z-10 border-none shadow-2xl shadow-slate-200">
        <div className="space-y-6">
          <div className="mx-auto w-32 h-32 relative group">
            <img 
              src="/logorogerpop.png" 
              alt="Dr. Roger POP Logo" 
              className="w-full h-full object-contain drop-shadow-xl group-hover:scale-110 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tight text-slate-900 leading-none uppercase">DR. ROGER <span className="text-blue-600">POP</span></h1>
            <p className="text-xs font-black text-slate-400 tracking-[0.2em] uppercase">Compliance Farmacêutica Profissional</p>
          </div>
          <p className="text-sm text-slate-500 font-medium leading-relaxed px-4">
            Gestão normativa simplificada de Procedimentos Operacionais Padrão sob medida para sua drogaria.
          </p>
        </div>

        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center space-x-4 bg-white border border-slate-100 hover:bg-slate-50 text-slate-900 font-black py-4 px-8 rounded-2xl transition-all shadow-md active:scale-95 group"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          <span className="uppercase tracking-widest text-xs">Entrar com Google</span>
        </button>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg border border-red-100">
            {error}
          </p>
        )}

        <div className="pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            Conformidade ANVISA facilitada
          </p>
        </div>
      </div>
    </div>
  );
}
