import React, { useState, useEffect } from 'react';
import { getClientFirestore } from '../firebaseClient';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { User } from '../types';
import { 
  Shield, Search, Filter, Calendar, RefreshCw, ChevronLeft, 
  ChevronRight, AlertCircle, Laptop, UserCheck, HardDrive, Download 
} from 'lucide-react';

interface AuditLogsViewProps {
  currentUser: User;
}

interface AuditLogDoc {
  id: string;
  timestamp: any;
  userId: string;
  userName: string;
  userRole: string;
  module: string;
  actionType: string;
  affectedCollection: string;
  affectedId: string;
  summary: string;
  device?: string;
  status?: string;
}

export default function AuditLogsView({ currentUser }: AuditLogsViewProps) {
  const [logs, setLogs] = useState<AuditLogDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProfile, setSelectedProfile] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedActionType, setSelectedActionType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Real-time listener for "system_logs" collection
  useEffect(() => {
    // Security check: Only Gestor Master can access this view
    if (currentUser.role !== 'gestor') {
      setError("Acesso restrito. Apenas o perfil Gestor Master possui permissão de auditoria.");
      setLoading(false);
      return;
    }

    const db = getClientFirestore();
    if (!db) {
      setError("Não foi possível conectar ao banco de dados do Firebase.");
      setLoading(false);
      return;
    }

    setLoading(true);
    // Limit to 1000 most recent logs for performance
    const q = query(
      collection(db, "system_logs"), 
      orderBy("timestamp", "desc"),
      limit(1000)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLogs: AuditLogDoc[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        fetchedLogs.push({
          id: doc.id,
          timestamp: data.timestamp,
          userId: data.userId || '',
          userName: data.userName || '',
          userRole: data.userRole || '',
          module: data.module || '',
          actionType: data.actionType || '',
          affectedCollection: data.affectedCollection || '',
          affectedId: data.affectedId || '',
          summary: data.summary || '',
          device: data.device || '',
          status: data.status || 'SUCESSO'
        });
      });
      setLogs(fetchedLogs);
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error("Erro ao assinar canal de auditoria:", err);
      setError("Erro ao carregar logs em tempo real. Verifique as configurações de segurança.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Apply search & filter logic
  const filteredLogs = logs.filter(log => {
    // 1. Text Search (Free text across user name, summary, ID, details)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchName = log.userName.toLowerCase().includes(searchLower);
      const matchSummary = log.summary.toLowerCase().includes(searchLower);
      const matchId = log.affectedId.toLowerCase().includes(searchLower);
      const matchModule = log.module.toLowerCase().includes(searchLower);
      const matchAction = log.actionType.toLowerCase().includes(searchLower);
      if (!matchName && !matchSummary && !matchId && !matchModule && !matchAction) {
        return false;
      }
    }

    // 2. Profile filter
    if (selectedProfile && log.userRole !== selectedProfile) {
      return false;
    }

    // 3. Module filter
    if (selectedModule && log.module !== selectedModule) {
      return false;
    }

    // 4. Action Type filter
    if (selectedActionType && log.actionType !== selectedActionType) {
      return false;
    }

    // 5. Date filter
    if (startDate || endDate) {
      if (!log.timestamp) return false;
      // Firestore timestamp to date
      const logDate = log.timestamp.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
      
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (logDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (logDate > end) return false;
      }
    }

    return true;
  });

  // Calculate unique options for filter dropdowns based on actual logs
  const profilesList = Array.from(new Set(logs.map(l => l.userRole).filter(Boolean)));
  const modulesList = Array.from(new Set(logs.map(l => l.module).filter(Boolean)));
  const actionsList = Array.from(new Set(logs.map(l => l.actionType).filter(Boolean)));

  // Pagination logic
  const totalItems = filteredLogs.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "Data/Hora;Usuário;Perfil;Módulo;Ação;Coleção;ID Afetado;Resumo;Dispositivo;Status\n";
    
    filteredLogs.forEach(log => {
      const dateStr = log.timestamp?.toDate 
        ? log.timestamp.toDate().toLocaleString('pt-BR') 
        : new Date(log.timestamp).toLocaleString('pt-BR');
      
      csvContent += `"${dateStr}";"${log.userName}";"${log.userRole}";"${log.module}";"${log.actionType}";"${log.affectedCollection}";"${log.affectedId}";"${log.summary.replace(/"/g, '""')}";"${(log.device || '').replace(/"/g, '""')}";"${log.status || 'SUCESSO'}"\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `auditoria_sistema_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatProfileName = (role: string) => {
    switch(role) {
      case 'gestor': return 'Gestor Master';
      case 'auxiliar_logistica': return 'Auxiliar de Logística (Fiscal)';
      case 'conferente': return 'Conferente de Pátio';
      case 'monitoramento': return 'Monitoramento';
      default: return role;
    }
  };

  const getActionBadgeColor = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('CRIOU') || act.includes('CADASTRO') || act.includes('INSERIU')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
    }
    if (act.includes('EDITOU') || act.includes('ATUALIZOU') || act.includes('SALVOU') || act.includes('ALINHOU')) {
      return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
    }
    if (act.includes('EXCLUIU') || act.includes('REDUZIU') || act.includes('REDEFINIU')) {
      return 'bg-red-50 text-red-700 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';
    }
    if (act.includes('LOGIN')) {
      return 'bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20';
    }
    if (act.includes('LOGOUT')) {
      return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20';
    }
    return 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in" id="audit_logs_main_container">
      {/* Header */}
      <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/25 shadow-inner">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-sans font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">Auditoria do Sistema</h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Acompanhamento e validação de todas as ações e persistência de dados em tempo real no Firestore.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 font-bold px-3 py-2 rounded-xl transition text-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-5 rounded-2xl flex items-start space-x-3 text-red-800 dark:text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-sans font-bold text-sm">Falha de Acesso</h3>
            <p className="text-xs mt-1">{error}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Filter className="h-4 w-4 text-indigo-500" />
              <span className="font-sans font-bold text-xs uppercase tracking-wider">Filtros de Pesquisa</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Free Text */}
              <div className="space-y-1">
                <label className="text-[10px] font-sans font-bold text-slate-500 dark:text-slate-400 uppercase">Texto Livre</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filtrar por nome, resumo, ID..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Profile/Role */}
              <div className="space-y-1">
                <label className="text-[10px] font-sans font-bold text-slate-500 dark:text-slate-400 uppercase">Perfil</label>
                <select
                  value={selectedProfile}
                  onChange={(e) => { setSelectedProfile(e.target.value); setCurrentPage(1); }}
                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg focus:outline-none text-slate-800 dark:text-slate-100"
                >
                  <option value="">Todos os perfis</option>
                  {profilesList.map(profile => (
                    <option key={profile as string} value={profile as string}>{formatProfileName(profile as string)}</option>
                  ))}
                </select>
              </div>

              {/* Module */}
              <div className="space-y-1">
                <label className="text-[10px] font-sans font-bold text-slate-500 dark:text-slate-400 uppercase">Módulo</label>
                <select
                  value={selectedModule}
                  onChange={(e) => { setSelectedModule(e.target.value); setCurrentPage(1); }}
                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg focus:outline-none text-slate-800 dark:text-slate-100"
                >
                  <option value="">Todos os módulos</option>
                  {modulesList.map(mod => (
                    <option key={mod} value={mod}>{mod}</option>
                  ))}
                </select>
              </div>

              {/* Action Type */}
              <div className="space-y-1">
                <label className="text-[10px] font-sans font-bold text-slate-500 dark:text-slate-400 uppercase">Tipo de Ação</label>
                <select
                  value={selectedActionType}
                  onChange={(e) => { setSelectedActionType(e.target.value); setCurrentPage(1); }}
                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg focus:outline-none text-slate-800 dark:text-slate-100"
                >
                  <option value="">Todas as ações</option>
                  {actionsList.map(act => (
                    <option key={act} value={act}>{act}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Start Date */}
              <div className="space-y-1">
                <label className="text-[10px] font-sans font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-indigo-500" />
                  <span>Data Inicial</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg focus:outline-none text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* End Date */}
              <div className="space-y-1">
                <label className="text-[10px] font-sans font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-indigo-500" />
                  <span>Data Final</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg focus:outline-none text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Clear filters shortcut */}
            {(searchTerm || selectedProfile || selectedModule || selectedActionType || startDate || endDate) && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedProfile('');
                    setSelectedModule('');
                    setSelectedActionType('');
                    setStartDate('');
                    setEndDate('');
                    setCurrentPage(1);
                  }}
                  className="text-xxs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3 animate-spin animate-once" />
                  <span>Limpar todos os filtros</span>
                </button>
              </div>
            )}
          </div>

          {/* Results Table */}
          <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <span className="font-mono text-xxs font-bold text-slate-400 uppercase">
                {loading ? 'Sincronizando...' : `Registros encontrados: ${totalItems}`}
              </span>
              <div className="flex items-center space-x-1 font-mono text-xxs text-slate-400">
                <HardDrive className="h-3 w-3 text-indigo-500" />
                <span>Coleção: system_logs</span>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-24 space-y-3">
                <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin mx-auto" />
                <p className="text-xs text-slate-400 font-sans">Carregando logs de auditoria do Firestore em tempo real...</p>
              </div>
            ) : currentItems.length === 0 ? (
              <div className="text-center py-20">
                <Shield className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-3 animate-pulse" />
                <h3 className="font-sans font-bold text-sm text-slate-700 dark:text-slate-300">Nenhum log encontrado</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">Tente ajustar seus parâmetros de busca ou filtros para localizar os dados.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-150 dark:border-slate-800">
                      <th className="py-3 px-4 font-sans whitespace-nowrap">Data / Hora</th>
                      <th className="py-3 px-4 font-sans whitespace-nowrap">Usuário</th>
                      <th className="py-3 px-4 font-sans whitespace-nowrap">Perfil</th>
                      <th className="py-3 px-4 font-sans whitespace-nowrap">Módulo</th>
                      <th className="py-3 px-4 font-sans whitespace-nowrap">Ação</th>
                      <th className="py-3 px-4 font-sans whitespace-nowrap">Documento / ID</th>
                      <th className="py-3 px-4 font-sans whitespace-nowrap">Status</th>
                      <th className="py-3 px-4 font-sans">Resumo</th>
                      <th className="py-3 px-4 font-sans whitespace-nowrap text-right pr-6"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {currentItems.map((log) => {
                      const dateStr = log.timestamp?.toDate 
                        ? log.timestamp.toDate().toLocaleString('pt-BR') 
                        : log.timestamp 
                          ? new Date(log.timestamp).toLocaleString('pt-BR')
                          : 'Aguardando server...';

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                            {dateStr}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                            <div className="flex items-center space-x-1.5">
                              <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                              <span>{log.userName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-sans text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            <span className="text-xxs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md">
                              {formatProfileName(log.userRole)}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-sans text-slate-600 dark:text-slate-300 font-semibold whitespace-nowrap uppercase">
                            {log.module}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full border text-[9px] font-sans font-bold tracking-wider uppercase ${getActionBadgeColor(log.actionType)}`}>
                              {log.actionType}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-xxs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            <span className="block font-sans text-slate-600 dark:text-slate-300 font-medium">{log.affectedCollection}</span>
                            <span className="block font-mono text-[9px] text-slate-400 leading-none mt-0.5">{log.affectedId}</span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center text-xxs font-sans font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded">
                              ● {log.status || 'SUCESSO'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-sans max-w-sm break-words leading-relaxed">
                            {log.summary}
                          </td>
                          <td className="py-3 px-4 text-right pr-6 whitespace-nowrap">
                            {log.device && (
                              <button
                                title={log.device}
                                className="text-slate-300 dark:text-slate-600 hover:text-indigo-500 dark:hover:text-indigo-400 transition"
                              >
                                <Laptop className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-150 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3">
                <span className="text-xxs text-slate-500 dark:text-slate-400 font-sans">
                  Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, totalItems)} de {totalItems} logs
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer text-slate-600 dark:text-slate-400"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .map((p, idx, arr) => (
                      <React.Fragment key={p}>
                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                          <span className="text-slate-400 text-xxs px-1">...</span>
                        )}
                        <button
                          onClick={() => handlePageChange(p)}
                          className={`px-2.5 py-1 text-xxs font-sans font-bold rounded-md transition ${
                            currentPage === p
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer'
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    ))}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-1 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer text-slate-600 dark:text-slate-400"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
