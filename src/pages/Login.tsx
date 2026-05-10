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
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sky-50 p-4">
      <div className="card max-w-md w-full text-center space-y-8 py-12 px-8">
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-sky-100 rounded-2xl flex items-center justify-center text-sky-600">
            <ShieldCheck size={40} />
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Dr. Roger POP</h1>
          <p className="text-slate-500">
            Gestão simplificada de Procedimentos Operacionais Padrão para sua farmácia.
          </p>
        </div>

        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center space-x-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium py-3 px-6 rounded-xl transition-all shadow-sm active:scale-95"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          <span>Entrar com Google</span>
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
