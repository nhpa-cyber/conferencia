import React from 'react';
import { Star, GitFork, AlertCircle, Code, Shield, GitBranch } from 'lucide-react';
import { RepoInfo } from '../types';

interface RepoStatsProps {
  repoInfo: RepoInfo;
}

export default function RepoStats({ repoInfo }: RepoStatsProps) {
  const statsItems = [
    {
      icon: <Star className="w-5 h-5 text-amber-500" />,
      label: 'Estrelas',
      value: repoInfo.stars.toLocaleString(),
      bgColor: 'bg-amber-50 border-amber-100',
    },
    {
      icon: <GitFork className="w-5 h-5 text-indigo-500" />,
      label: 'Forks',
      value: repoInfo.forks.toLocaleString(),
      bgColor: 'bg-indigo-50 border-indigo-100',
    },
    {
      icon: <AlertCircle className="w-5 h-5 text-red-500" />,
      label: 'Issues Abertas',
      value: repoInfo.openIssues.toLocaleString(),
      bgColor: 'bg-red-50 border-red-100',
    },
    {
      icon: <Code className="w-5 h-5 text-emerald-500" />,
      label: 'Linguagem Principal',
      value: repoInfo.language || 'Não informada',
      bgColor: 'bg-emerald-50 border-emerald-100',
    },
    {
      icon: <Shield className="w-5 h-5 text-purple-500" />,
      label: 'Licença',
      value: repoInfo.license || 'Nenhuma',
      bgColor: 'bg-purple-50 border-purple-100',
    },
    {
      icon: <GitBranch className="w-5 h-5 text-sky-500" />,
      label: 'Branch Padrão',
      value: repoInfo.defaultBranch,
      bgColor: 'bg-sky-50 border-sky-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 p-4 bg-slate-50 border border-slate-100 rounded-xl">
      {statsItems.map((item, index) => (
        <div
          key={index}
          className="flex flex-col p-3 bg-white border border-slate-100 rounded-xl shadow-xs transition-all hover:shadow-md"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <div className={`p-1.5 rounded-lg border ${item.bgColor} shrink-0`}>
              {item.icon}
            </div>
            <span className="text-[10px] md:text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              {item.label}
            </span>
          </div>
          <span className="text-sm md:text-base font-bold text-slate-800 truncate" title={item.value}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
