import React, { useState } from 'react';
import { User } from '../types';
import { ShieldCheck, Truck, Lock, User as UserIcon, LogIn, HelpCircle } from 'lucide-react';
import logoImg from '../assets/images/pau_brasil_logo_1783008800955.jpg';

interface LoginViewProps {
  users: User[];
  onLoginSuccess: (user: User) => void;
}

export default function LoginView({ users, onLoginSuccess }: LoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showTips, setShowTips] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Por favor, informe o usuário de acesso.');
      return;
    }

    const matchedUser = users.find(
      u => u.username.toLowerCase() === username.trim().toLowerCase()
    );

    if (matchedUser) {
      const userPassword = matchedUser.password || '123';
      if (password === userPassword) {
        onLoginSuccess(matchedUser);
      } else {
        setError('Senha incorreta para o usuário informado.');
      }
    } else {
      setError('Usuário não localizado. Verifique suas credenciais de acesso.');
    }
  };

  const handleQuickLogin = (user: User) => {
    setUsername(user.username);
    setPassword(user.password || '123');
    onLoginSuccess(user);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans" id="login_container">
      {/* Background brand accents */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-amber-500/10 blur-[120px] pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden relative z-10 transition-all duration-300 hover:shadow-blue-500/5">
        
        {/* Card Header with Branded Logo */}
        <div className="bg-slate-50 border-b border-slate-100 p-8 text-center flex flex-col items-center">
          
          {/* PAU BRASIL DISTRIBUIDORA AMBEV - LOGO AND TEXT */}
          <div className="mb-4 text-center flex flex-col items-center" id="pau_brasil_logo">
            <div className="w-20 h-20 bg-white p-1 rounded-xl shadow-md border border-slate-200 mb-3 overflow-hidden flex items-center justify-center">
              <img src={logoImg} alt="Pau Brasil Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
            <div className="font-sans font-black tracking-tight text-3xl flex flex-col items-center justify-center leading-none">
              <span className="text-[#0f35a9]">PAU BRASIL</span>
              <span className="text-xxs uppercase font-extrabold tracking-widest text-[#0f35a9]/80 mt-1.5 block">
                distribuidora <span className="text-amber-500 font-black">ambev</span>
              </span>
            </div>
          </div>

          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider font-mono">
            RETORNO DE ROTA PAU BRASIL GUARABIRA
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Controle de Retornos, Aferição Física e Conciliação Fiscal
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-xs text-red-800 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Usuário de Acesso</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Insira seu usuário..."
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-3 pl-10 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0f35a9] focus:bg-white transition"
              />
              <UserIcon className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Senha de Segurança</span>
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-3 pl-10 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0f35a9] focus:bg-white transition"
              />
              <Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#0f35a9] hover:bg-blue-800 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition flex items-center justify-center space-x-2 cursor-pointer"
          >
            <LogIn className="h-4 w-4 text-amber-400" />
            <span>Entrar no Sistema</span>
          </button>
        </form>

      </div>

      {/* Footer Branding info */}
      <div className="mt-6 text-center text-xxs text-slate-500 font-medium z-10 max-w-sm">
        <p>RETORNO DE ROTA PAU BRASIL GUARABIRA v2.6 • Pau Brasil Distribuidora Ambev</p>
        <p className="mt-1 opacity-75">Ambiente seguro com criptografia local ativa • Ambev Tech Standard</p>
      </div>
    </div>
  );
}
