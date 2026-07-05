import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Github, Key, Search, HelpCircle, Loader2 } from 'lucide-react';
import { RepoInfo } from '../types';

interface RepoSelectorProps {
  onSelect: (owner: string, repo: string, token: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  key?: string;
}

export default function RepoSelector({ onSelect, isLoading, error }: RepoSelectorProps) {
  const [repoInput, setRepoInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [showTokenHelp, setShowTokenHelp] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoInput.trim()) return;

    // Parse owner and repo from input
    let owner = '';
    let repo = '';

    // Handle full URLs like https://github.com/owner/repo
    const cleanInput = repoInput.trim().replace(/\/$/, ""); // remove trailing slash
    if (cleanInput.includes('github.com')) {
      const parts = cleanInput.split('github.com/');
      if (parts.length > 1) {
        const pathParts = parts[1].split('/');
        if (pathParts.length >= 2) {
          owner = pathParts[0];
          repo = pathParts[1];
        }
      }
    } else {
      // Handle format: owner/repo
      const parts = cleanInput.split('/');
      if (parts.length === 2) {
        owner = parts[0];
        repo = parts[1];
      }
    }

    if (!owner || !repo) {
      alert('Formato inválido. Por favor, digite o repositório no formato "usuario/repositorio" ou a URL completa do GitHub.');
      return;
    }

    onSelect(owner, repo, tokenInput);
  };

  // Pre-fill some popular open source repos for quick access
  const handleQuickSelect = (repoPath: string) => {
    setRepoInput(repoPath);
    const [owner, repo] = repoPath.split('/');
    onSelect(owner, repo, tokenInput);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 text-slate-800 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl bg-white border border-slate-100 rounded-2xl shadow-xl p-8 md:p-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 bg-slate-950 text-white rounded-2xl mb-4 shadow-lg">
            <Github className="w-10 h-10" id="github-logo-selector" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 text-center">
            Importador de Repositórios GitHub
          </h1>
          <p className="text-slate-500 mt-2 text-center text-sm md:text-base max-w-md">
            Importe qualquer repositório público do GitHub e analise a sua estrutura e código de maneira profunda com Inteligência Artificial.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Repository Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
              Repositório ou URL do GitHub
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                placeholder="Ex: facebook/react ou https://github.com/google/flatbuffers"
                disabled={isLoading}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 focus:border-slate-950 focus:bg-white rounded-xl text-slate-900 placeholder:text-slate-400 outline-none transition-all font-medium text-sm md:text-base shadow-xs"
              />
            </div>
          </div>

          {/* Optional GitHub Token */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                <Key className="w-3.5 h-3.5" /> Token do GitHub <span className="text-slate-400 lowercase italic normal-case font-normal">(Opcional)</span>
              </label>
              <button
                type="button"
                onClick={() => setShowTokenHelp(!showTokenHelp)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                title="Por que usar um Token?"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>

            {showTokenHelp && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-3.5 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-500 leading-relaxed space-y-1"
              >
                <p>
                  A API do GitHub possui limites rígidos de requisições por hora para acessos sem autenticação (60 requisições por IP).
                </p>
                <p>
                  Para importar repositórios maiores de forma tranquila, gere um <strong>Personal Access Token (classic)</strong> ou <strong>Fine-grained token</strong> no GitHub com permissão de leitura de repositórios públicos.
                </p>
              </motion.div>
            )}

            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              disabled={isLoading}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-slate-950 focus:bg-white rounded-xl text-slate-900 placeholder:text-slate-400 outline-none transition-all font-mono text-sm"
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm leading-relaxed font-medium">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !repoInput.trim()}
            className="w-full flex items-center justify-center gap-2.5 py-4 bg-slate-950 hover:bg-slate-900 active:scale-[0.99] text-white disabled:bg-slate-200 disabled:text-slate-400 disabled:scale-100 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Importando Repositório...</span>
              </>
            ) : (
              <>
                <Github className="w-5 h-5" />
                <span>Importar Repositório</span>
              </>
            )}
          </button>
        </form>

        {/* Quick select suggestions */}
        <div className="mt-8 border-t border-slate-100 pt-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3.5">
            Sugestões Rápidas de Teste
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { path: 'facebook/react', label: 'React Core' },
              { path: 'lucide-icons/lucide', label: 'Lucide Icons' },
              { path: 'expressjs/express', label: 'Express Framework' },
              { path: 'twbs/bootstrap', label: 'Bootstrap UI' },
            ].map((suggest) => (
              <button
                key={suggest.path}
                onClick={() => handleQuickSelect(suggest.path)}
                disabled={isLoading}
                className="flex items-center gap-2 p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-100 hover:border-slate-200 rounded-xl text-left text-slate-700 hover:text-slate-900 text-xs md:text-sm font-medium transition-all cursor-pointer"
              >
                <Github className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{suggest.label}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
