import React, { useState, useEffect } from 'react';
import { User, Driver, Vehicle, Product, ActiveAsset, AuditSession, UserRole, ImportedRoute, Vale } from '../types';
import { BarChart3, Users, Truck, ShoppingBag, Plus, Trash2, Shield, Clock, Landmark, Percent, CheckCircle2, AlertTriangle, RefreshCw, Eye, Search, Landmark as BankIcon, HardDrive, Camera, FileSpreadsheet, Sparkles, Check, FileCheck, CircleAlert, Edit, FileText, ZoomIn, ZoomOut, ArrowRight, UploadCloud, XCircle } from 'lucide-react';
import { ImageDB, PhotoRecord } from '../imageDb';
import { DEFAULT_USERS } from '../data';
import FirebaseManagerView from './FirebaseManagerView';

interface GestorDashboardProps {
  currentUser: User;
  drivers: Driver[];
  vehicles: Vehicle[];
  products: Product[];
  activeAssets: ActiveAsset[];
  audits: AuditSession[];
  users: User[];
  onSaveUsers: (users: User[]) => void;
  onSaveDrivers: (drivers: Driver[]) => void;
  onSaveVehicles: (vehicles: Vehicle[]) => void;
  onSaveProducts: (products: Product[]) => void;
  onSaveAudits: (audits: AuditSession[]) => void;
  importedRoutes: ImportedRoute[];
  onSaveImportedRoutes: (routes: ImportedRoute[]) => void;
  vales: Vale[];
  onSaveVales: (vales: Vale[]) => void;
  forceTab?: 'dashboard' | 'cadastros';
  auditLogs?: any[];
}

function AuditPhotoViewer({ auditId, onSelectPhoto }: { auditId: string; onSelectPhoto: (photo: PhotoRecord) => void }) {
  const [photos, setPhotos] = React.useState<PhotoRecord[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    ImageDB.getPhotosByAudit(auditId)
      .then(res => {
        if (active) {
          setPhotos(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [auditId]);

  if (loading) {
    return <div className="text-xxs text-slate-400 animate-pulse py-1">Carregando fotos dos PA e AG...</div>;
  }

  if (photos.length === 0) {
    return <div className="text-xxs text-slate-400 italic py-1">Nenhuma foto de evidência cadastrada.</div>;
  }

  return (
    <div className="space-y-1.5 pt-2">
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Evidências Fotográficas (PA / AG / Refugos):</div>
      <div className="flex flex-wrap gap-2">
        {photos.map(p => (
          <div 
            key={p.id} 
            onClick={() => onSelectPhoto(p)}
            className="relative group bg-slate-100 rounded-lg overflow-hidden border border-slate-200 w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 cursor-pointer hover:border-amber-500 transition-all"
          >
            <img 
              src={p.photoUrl} 
              alt={p.itemName} 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-1 text-[8px] text-white">
              <span className="font-semibold truncate text-[7px]">{p.itemName}</span>
              <span className="opacity-75 text-[7px]">
                {p.type === 'produto' ? 'PA' : 
                 p.type === 'refugo' ? 'REFUGO' : 
                 p.type === 'troca_reposicao' ? 'TROCA/REP' : 'AG'}
              </span>
              <span className="text-amber-400 text-[6px] font-bold block mt-0.5">Clique para Zoom</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GestorDashboard({
  currentUser,
  drivers,
  vehicles,
  products,
  activeAssets,
  audits,
  users,
  onSaveUsers,
  onSaveDrivers,
  onSaveVehicles,
  onSaveProducts,
  onSaveAudits,
  importedRoutes,
  onSaveImportedRoutes,
  vales = [],
  onSaveVales,
  forceTab,
  auditLogs = []
}: GestorDashboardProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedValeIdForUpload, setSelectedValeIdForUpload] = useState<string | null>(null);

  // Vales Dashboard States
  const [valesSearch, setValesSearch] = useState('');
  const [valesFilter, setValesFilter] = useState<'todos' | 'PENDENTE_ASSINATURA' | 'ASSINADO' | 'COMPENSADO'>('todos');
  const [viewingValeDetails, setViewingValeDetails] = useState<Vale | null>(null);
  const [selectedValeIdForUploadDash, setSelectedValeIdForUploadDash] = useState<string | null>(null);
  const dashboardValeInputRef = React.useRef<HTMLInputElement>(null);

  // Navigation for Gestor views
  const [gestorTab, setGestorTab] = useState<'dashboard' | 'cadastros' | 'sobras_faltas' | 'map_tracking' | 'refugos_dashboard' | 'audit_logs' | 'historico' | 'firebase_sync'>(
    forceTab === 'cadastros' ? 'cadastros' : 'dashboard'
  );

  // General Audit and Photo History States
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'ok' | 'divergentes'>('all');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [selectedHistoryAudit, setSelectedHistoryAudit] = useState<AuditSession | null>(null);

  // Custom Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const requestConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  useEffect(() => {
    if (forceTab) {
      setGestorTab(forceTab === 'cadastros' ? 'cadastros' : 'dashboard');
    }
  }, [forceTab]);

  const [cadastroSubTab, setCadastroSubTab] = useState<'usuarios' | 'produtos' | 'veiculos' | 'motoristas' | 'manutencao'>('usuarios');

  // Annual export & reset states
  const [resetConfirmWord, setResetConfirmWord] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);

  const handleExportAnnualBackup = () => {
    const backupData = {
      audits,
      importedRoutes,
      timestamp: new Date().toISOString(),
      year: new Date().getFullYear(),
      version: "1.0",
      app: "Pau Brasil Guarabira Logistics Platform"
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `paubrasil_guarabira_backup_anual_${new Date().getFullYear()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    alert("Backup anual exportado com sucesso! Arquivo JSON de transações gerado e baixado.");
  };

  const handleResetDatabaseWipe = async () => {
    if (resetConfirmWord !== 'RESETAR') {
      alert("Por favor, digite exatamente a palavra 'RESETAR' para autorizar a limpeza.");
      return;
    }

    if (resetPassword !== '!Bud0102') {
      alert("Senha de segurança incorreta! A limpeza não foi autorizada.");
      return;
    }

    try {
      // Clear audits
      onSaveAudits([]);
      // Clear imported routes
      onSaveImportedRoutes([]);
      // Clear photos from IndexedDB
      await ImageDB.clearAllPhotos();

      alert("Base de dados limpa com sucesso! Toda a memória local e transações foram resetadas.");
      setShowResetModal(false);
      setResetConfirmWord('');
      setResetPassword('');
      window.location.reload();
    } catch (e) {
      alert("Erro ao realizar limpeza de dados: " + e);
    }
  };

  // Search filter inside tables
  const [searchQuery, setSearchQuery] = useState('');

  // States for Sobras & Faltas and Map Status Tracking
  const [correctiveNotesMap, setCorrectiveNotesMap] = useState<Record<string, string>>({});
  const [importDateFilter, setImportDateFilter] = useState(() => {
    // default to date of first imported route or today
    return importedRoutes[0]?.routeDate || new Date().toISOString().split('T')[0];
  });

  const handleUpdateAuditDiscrepancyAction = (
    auditId: string, 
    fields: { 
      surplusActionStatus?: 'prazo_envio_ok' | 'fora_do_prazo' | 'enviado_cliente';
      deficitActionStatus?: 'pendente_baixa' | 'baixado';
      correctiveActionNotes?: string;
    }
  ) => {
    const updatedAudits = audits.map(a => {
      if (a.id === auditId) {
        const now = new Date().toISOString();
        return {
          ...a,
          ...fields,
          history: [
            ...a.history,
            {
              timestamp: now,
              action: 'Ação Corretiva Atualizada',
              user: currentUser.name,
              details: `Campos alterados: ${Object.keys(fields).join(', ')}. Notas: ${fields.correctiveActionNotes || a.correctiveActionNotes || ''}`
            }
          ]
        };
      }
      return a;
    });
    onSaveAudits(updatedAudits);
    alert('Ação registrada com sucesso na auditoria do mapa!');
  };

  // 1. New User form state
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('conferente');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // 2. New Product form state
  const [newProdCode, setNewProdCode] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdGroup, setNewProdGroup] = useState('CERVEJA');
  const [newProdUnit, setNewProdUnit] = useState('un');
  const [newProdPallet, setNewProdPallet] = useState(84);
  const [newProdCost, setNewProdCost] = useState<number | ''>('');
  const [newProdHectoFactor, setNewProdHectoFactor] = useState<number | ''>('');

  // Product bulk import states
  const [isProductDragOver, setIsProductDragOver] = useState(false);
  const [productImportMode, setProductImportMode] = useState<'replace' | 'merge' | 'add'>('replace');

  // 3. New Vehicle form state
  const [newVehPlate, setNewVehPlate] = useState('');
  const [newVehCapacity, setNewVehCapacity] = useState<number | ''>('');

  // 4. New Driver/Helper form state
  const [newDrvId, setNewDrvId] = useState('');
  const [newDrvName, setNewDrvName] = useState('');
  const [newDrvRole, setNewDrvRole] = useState<'MOTORISTA' | 'AJUDANTE'>('MOTORISTA');
  const [newDrvCpf, setNewDrvCpf] = useState('');
  const [editingTempDriverId, setEditingTempDriverId] = useState('');

  // Calculate high-level stats for manager dashboard
  const finishedAudits = audits.filter(a => a.status === 'finalizado_ok' || a.status === 'finalizado_divergente');
  const totalAuditsCount = finishedAudits.length;
  
  const okAuditsCount = finishedAudits.filter(a => a.status === 'finalizado_ok').length;
  const matchRate = totalAuditsCount > 0 ? (okAuditsCount / totalAuditsCount) * 100 : 100;

  // Average physical audit duration in minutes
  const getAverageAuditDuration = () => {
    const auditsWithTime = finishedAudits.filter(a => {
      if (!a.startTime || !a.endTime || !a.conferenteId) return false;
      const userObj = users.find(u => u.id === a.conferenteId || u.username === a.conferenteId)
        || DEFAULT_USERS.find(u => u.id === a.conferenteId || u.username === a.conferenteId);
      return userObj?.role === 'conferente';
    });
    if (auditsWithTime.length === 0) return 0;
    const totalMs = auditsWithTime.reduce((sum, a) => {
      return sum + (new Date(a.endTime!).getTime() - new Date(a.startTime!).getTime());
    }, 0);
    return Math.floor((totalMs / auditsWithTime.length) / 1000); // average seconds
  };

  const avgSeconds = getAverageAuditDuration();
  const avgMinsText = avgSeconds > 0 
    ? `${Math.floor(avgSeconds / 60)}m ${avgSeconds % 60}s` 
    : 'N/A';

  // Financial statistics
  let totalMissingCost = 0;
  let totalSurplusCost = 0;

  // Let's calculate discrepancy by product
  const productDiscrepancies: Record<string, { desc: string, group: string, code: string, missing: number, surplus: number, financial: number }> = {};

  finishedAudits.forEach(audit => {
    audit.items.forEach(item => {
      const physical = item.rePhysicalQty !== undefined ? item.rePhysicalQty : item.physicalQty;
      const fiscal = item.fiscalQty ?? 0;
      const diff = physical - fiscal;
      
      if (diff !== 0) {
        if (!productDiscrepancies[item.productCode]) {
          productDiscrepancies[item.productCode] = {
            code: item.productCode,
            desc: item.productDescription,
            group: 'PRODUTO',
            missing: 0,
            surplus: 0,
            financial: 0
          };
        }
        
        if (diff < 0) {
          const absDiff = Math.abs(diff);
          totalMissingCost += absDiff * item.cost;
          productDiscrepancies[item.productCode].missing += absDiff;
          productDiscrepancies[item.productCode].financial -= absDiff * item.cost;
        } else {
          totalSurplusCost += diff * item.cost;
          productDiscrepancies[item.productCode].surplus += diff;
          productDiscrepancies[item.productCode].financial += diff * item.cost;
        }
      }
    });

    audit.assets.forEach(asset => {
      const physical = asset.rePhysicalQty !== undefined ? asset.rePhysicalQty : asset.physicalQty;
      const fiscal = asset.fiscalQty ?? 0;
      const diff = physical - fiscal;

      if (diff !== 0) {
        const key = `ASSET_${asset.assetId}`;
        if (!productDiscrepancies[key]) {
          productDiscrepancies[key] = {
            code: asset.assetId.toUpperCase(),
            desc: asset.assetName,
            group: 'ATIVO DE GIRO',
            missing: 0,
            surplus: 0,
            financial: 0
          };
        }

        if (diff < 0) {
          const absDiff = Math.abs(diff);
          totalMissingCost += absDiff * asset.cost;
          productDiscrepancies[key].missing += absDiff;
          productDiscrepancies[key].financial -= absDiff * asset.cost;
        } else {
          totalSurplusCost += diff * asset.cost;
          productDiscrepancies[key].surplus += diff;
          productDiscrepancies[key].financial += diff * asset.cost;
        }
      }
    });
  });

  const topDiscrepantProducts = Object.values(productDiscrepancies)
    .sort((a, b) => Math.abs(b.financial) - Math.abs(a.financial))
    .slice(0, 5);

  // Photo storage stats state & retention policies
  const [photoStats, setPhotoStats] = useState<{ count: number; sizeMb: number }>({ count: 0, sizeMb: 0 });
  const [retentionDays, setRetentionDays] = useState(30);
  const [selectedPhotoForPreview, setSelectedPhotoForPreview] = useState<{ photoUrl: string; title: string; subtitle: string; category: string } | null>(null);
  const [selectedPhotoScale, setSelectedPhotoScale] = useState(1);

  const loadPhotoStats = async () => {
    try {
      const stats = await ImageDB.getDatabaseStats();
      setPhotoStats(stats);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadPhotoStats();
  }, [audits]);

  const handlePrunePhotos = async () => {
    requestConfirm(
      "Política de Limpeza",
      `Deseja aplicar a política de limpeza e apagar todas as fotos de prova com mais de ${retentionDays} dias de gravação?`,
      async () => {
        const res = await ImageDB.prunePhotos(retentionDays);
        alert(`Faxina de armazenamento concluída! ${res.prunedCount} fotos antigas foram apagadas.`);
        loadPhotoStats();
      }
    );
  };

  // Calculate discrepancies by driver/helper (prestador de contas)
  interface DriverStats {
    id: string;
    name: string;
    role: 'MOTORISTA' | 'AJUDANTE';
    totalTrips: number;
    divergentTrips: number;
    totalMissingQty: number;
    totalSurplusQty: number;
    totalFinancialLoss: number;
  }

  const driverStatsMap: Record<string, DriverStats> = {};

  // Initialize all known drivers/helpers to avoid blank states
  drivers.forEach(d => {
    driverStatsMap[d.id] = {
      id: d.id,
      name: d.name,
      role: d.role,
      totalTrips: 0,
      divergentTrips: 0,
      totalMissingQty: 0,
      totalSurplusQty: 0,
      totalFinancialLoss: 0
    };
  });

  audits.forEach(audit => {
    if (audit.status !== 'finalizado_ok' && audit.status !== 'finalizado_divergente') return;

    const isDivergent = audit.status === 'finalizado_divergente';
    let missingQty = 0;
    let surplusQty = 0;
    let financialLoss = 0;

    audit.items.forEach(item => {
      const physical = item.rePhysicalQty !== undefined ? item.rePhysicalQty : item.physicalQty;
      const fiscal = item.fiscalQty ?? 0;
      const diff = physical - fiscal;
      if (diff < 0) {
        missingQty += Math.abs(diff);
        financialLoss += Math.abs(diff) * item.cost;
      } else if (diff > 0) {
        surplusQty += diff;
      }
    });

    audit.assets.forEach(asset => {
      const physical = asset.rePhysicalQty !== undefined ? asset.rePhysicalQty : asset.physicalQty;
      const fiscal = asset.fiscalQty ?? 0;
      const diff = physical - fiscal;
      if (diff < 0) {
        missingQty += Math.abs(diff);
        financialLoss += Math.abs(diff) * asset.cost;
      } else if (diff > 0) {
        surplusQty += diff;
      }
    });

    const addAuditToDriver = (dId: string) => {
      if (!driverStatsMap[dId]) {
        const found = drivers.find(d => d.id === dId);
        driverStatsMap[dId] = {
          id: dId,
          name: found ? found.name : dId,
          role: found ? found.role : 'MOTORISTA',
          totalTrips: 0,
          divergentTrips: 0,
          totalMissingQty: 0,
          totalSurplusQty: 0,
          totalFinancialLoss: 0
        };
      }
      
      const d = driverStatsMap[dId];
      d.totalTrips += 1;
      if (isDivergent) {
        d.divergentTrips += 1;
        d.totalMissingQty += missingQty;
        d.totalSurplusQty += surplusQty;
        d.totalFinancialLoss += financialLoss;
      }
    };

    if (audit.driverId) addAuditToDriver(audit.driverId);
    if (audit.helperId) addAuditToDriver(audit.helperId);
  });

  const rankedDrivers = Object.values(driverStatsMap)
    .filter(d => d.totalTrips > 0)
    .sort((a, b) => b.divergentTrips - a.divergentTrips || b.totalFinancialLoss - a.totalFinancialLoss);

  // Productivity by Conferente
  const confProductivity: Record<string, { 
    id: string,
    name: string, 
    username: string, 
    count: number, 
    totalSeconds: number,
    okCount: number,
    divergentCount: number
  }> = {};

  finishedAudits.forEach(audit => {
    if (audit.conferenteId && audit.startTime && audit.endTime) {
      const seconds = Math.max(0, Math.floor((new Date(audit.endTime).getTime() - new Date(audit.startTime).getTime()) / 1000));
      
      let confName = audit.conferenteId;
      let confUsername = '';
      
      const userObj = users.find(u => u.id === audit.conferenteId || u.username === audit.conferenteId)
        || DEFAULT_USERS.find(u => u.id === audit.conferenteId || u.username === audit.conferenteId);
        
      if (!userObj || userObj.role !== 'conferente') {
        return;
      }
      
      confName = userObj.name;
      confUsername = userObj.username;
      
      const key = audit.conferenteId;
      if (!confProductivity[key]) {
        confProductivity[key] = { 
          id: key,
          name: confName, 
          username: confUsername, 
          count: 0, 
          totalSeconds: 0,
          okCount: 0,
          divergentCount: 0
        };
      }
      
      confProductivity[key].count += 1;
      confProductivity[key].totalSeconds += seconds;
      if (audit.status === 'finalizado_ok') {
        confProductivity[key].okCount += 1;
      } else if (audit.status === 'finalizado_divergente') {
        confProductivity[key].divergentCount += 1;
      }
    }
  });

  // Calculation of Refugos (Waste/Avarias) statistics for Drivers, Motives tree, and Active Assets (Ativos de Giro)
  const driverRefugoMap: Record<string, { driverId: string; name: string; totalTripsWithRefugo: number; totalRefugoQty: number; reasons: Record<string, number> }> = {};
  const assetRefugoMap: Record<string, { assetId: string; assetName: string; totalQty: number; reasons: Record<string, number> }> = {};
  const globalRefugoMotiveMap: Record<string, number> = {
    'BICADA EXTERNA': 0,
    'BICADA INTERNA': 0,
    'QUEBRADA': 0,
    'SEGUNDA (OUTRAS EMPRESAS)': 0,
    'COLORAÇÃO FORA DO PADRÃO': 0,
    'TAMPADA': 0,
    'SUJIDADE INTERNA': 0,
    'SUJIDADE EXTERNA': 0,
    'GARRAFEIRA QUEBRADA': 0,
  };
  let totalRefugosOverallQty = 0;

  audits.forEach(audit => {
    if (!audit.refugos || audit.refugos.length === 0) return;

    const drvName = drivers.find(d => d.id === audit.driverId)?.name || audit.driverId || 'Motorista Não Cadastrado';
    const drvId = audit.driverId || 'desconhecido';

    if (!driverRefugoMap[drvId]) {
      driverRefugoMap[drvId] = {
        driverId: drvId,
        name: drvName,
        totalTripsWithRefugo: 0,
        totalRefugoQty: 0,
        reasons: {
          'BICADA EXTERNA': 0,
          'BICADA INTERNA': 0,
          'QUEBRADA': 0,
          'SEGUNDA (OUTRAS EMPRESAS)': 0,
          'COLORAÇÃO FORA DO PADRÃO': 0,
          'TAMPADA': 0,
          'SUJIDADE INTERNA': 0,
          'SUJIDADE EXTERNA': 0,
          'GARRAFEIRA QUEBRADA': 0,
        }
      };
    }

    driverRefugoMap[drvId].totalTripsWithRefugo += 1;

    audit.refugos.forEach(ref => {
      const q = ref.qty || 0;
      totalRefugosOverallQty += q;
      driverRefugoMap[drvId].totalRefugoQty += q;
      
      const rName = ref.reason;
      if (driverRefugoMap[drvId].reasons[rName] !== undefined) {
        driverRefugoMap[drvId].reasons[rName] += q;
      } else {
        driverRefugoMap[drvId].reasons[rName] = q;
      }

      if (globalRefugoMotiveMap[rName] !== undefined) {
        globalRefugoMotiveMap[rName] += q;
      } else {
        globalRefugoMotiveMap[rName] = q;
      }

      // Track asset rankings for refugo
      const aId = ref.assetId || 'desconhecido';
      const aName = ref.assetName || 'Ativo de Giro Desconhecido';
      if (!assetRefugoMap[aId]) {
        assetRefugoMap[aId] = {
          assetId: aId,
          assetName: aName,
          totalQty: 0,
          reasons: {}
        };
      }
      assetRefugoMap[aId].totalQty += q;
      assetRefugoMap[aId].reasons[rName] = (assetRefugoMap[aId].reasons[rName] || 0) + q;
    });
  });

  const rankedRefugoDrivers = Object.values(driverRefugoMap)
    .sort((a, b) => b.totalRefugoQty - a.totalRefugoQty);

  const rankedRefugoMotives = Object.entries(globalRefugoMotiveMap)
    .map(([motive, qty]) => ({
      motive,
      qty,
      percentage: totalRefugosOverallQty > 0 ? (qty / totalRefugosOverallQty) * 100 : 0
    }))
    .sort((a, b) => b.qty - a.qty);

  const rankedRefugoAssets = Object.values(assetRefugoMap)
    .map(asset => ({
      ...asset,
      percentage: totalRefugosOverallQty > 0 ? (asset.totalQty / totalRefugosOverallQty) * 100 : 0
    }))
    .sort((a, b) => b.totalQty - a.totalQty);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Não informada';
    try {
      if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  };

  const getAuditDuration = (start?: string, end?: string) => {
    if (!start || !end) return 'Não registrado';
    try {
      const diffMs = new Date(end).getTime() - new Date(start).getTime();
      if (isNaN(diffMs) || diffMs < 0) return 'N/I';
      const mins = Math.floor(diffMs / 60000);
      const secs = Math.floor((diffMs % 60000) / 1000);
      return `${mins}m ${secs}s`;
    } catch (e) {
      return 'N/I';
    }
  };

  // Action Add User
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserUsername || !newUserPassword) {
      alert('Por favor, preencha todos os campos, incluindo a senha.');
      return;
    }

    if (editingUserId) {
      // Editing Mode
      const exists = users.some(u => u.id !== editingUserId && u.username.toLowerCase() === newUserUsername.toLowerCase());
      if (exists) {
        alert('Este nome de usuário já está cadastrado.');
        return;
      }
      const updatedUsers = users.map(u => {
        if (u.id === editingUserId) {
          return {
            ...u,
            name: newUserName.trim(),
            role: newUserRole,
            username: newUserUsername.trim().toLowerCase(),
            password: newUserPassword.trim()
          };
        }
        return u;
      });
      onSaveUsers(updatedUsers);
      setEditingUserId(null);
      setNewUserName('');
      setNewUserUsername('');
      setNewUserPassword('');
      alert('Usuário editado com sucesso!');
    } else {
      // Creation Mode
      const exists = users.some(u => u.username.toLowerCase() === newUserUsername.toLowerCase());
      if (exists) {
        alert('Este nome de usuário já está cadastrado.');
        return;
      }
      const newUser: User = {
        id: 'usr_' + Date.now(),
        name: newUserName.trim(),
        role: newUserRole,
        username: newUserUsername.trim().toLowerCase(),
        password: newUserPassword.trim()
      };
      onSaveUsers([...users, newUser]);
      setNewUserName('');
      setNewUserUsername('');
      setNewUserPassword('');
      alert('Usuário cadastrado com sucesso!');
    }
  };

  const handleStartEditUser = (user: User) => {
    setEditingUserId(user.id);
    setNewUserName(user.name);
    setNewUserUsername(user.username);
    setNewUserPassword(user.password || '');
    setNewUserRole(user.role);
  };

  const handleCancelEditUser = () => {
    setEditingUserId(null);
    setNewUserName('');
    setNewUserUsername('');
    setNewUserPassword('');
    setNewUserRole('conferente');
  };

  const handleRemoveUser = (id: string) => {
    if (id === currentUser.id) {
      alert('Você não pode excluir o seu próprio usuário logado!');
      return;
    }
    requestConfirm(
      "Excluir Colaborador",
      "Tem certeza de que deseja excluir este usuário da plataforma?",
      () => {
        onSaveUsers(users.filter(u => u.id !== id));
        if (editingUserId === id) {
          handleCancelEditUser();
        }
      }
    );
  };

  // Action Add Product
  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdCode || !newProdDesc || !newProdCost) return;
    const exists = products.some(p => p.code === newProdCode);
    if (exists) {
      alert('Já existe um produto cadastrado com este código.');
      return;
    }
    const newProduct: Product = {
      code: newProdCode.trim(),
      description: newProdDesc.trim().toUpperCase(),
      group: newProdGroup,
      unit: newProdUnit,
      palletFactor: Number(newProdPallet) || 1,
      skuFactor: 1,
      hectoFactor: Number(newProdHectoFactor) || 0.01,
      cost: Number(newProdCost),
      curve: 'C'
    };
    onSaveProducts([newProduct, ...products]);
    setNewProdCode('');
    setNewProdDesc('');
    setNewProdCost('');
    setNewProdHectoFactor('');
    alert('Produto cadastrado com sucesso!');
  };

  const handleProductImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      // Handle carriage returns and split into trimmed lines
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length <= 1) {
        alert("O arquivo importado está vazio ou não possui linhas suficientes.");
        return;
      }

      // Robustly detect the header line within the first 15 lines of the file
      // to skip potential report titles or metadata lines exported from Promax
      let headerLineIdx = 0;
      let sep = ',';
      let headers: string[] = [];

      for (let idx = 0; idx < Math.min(15, lines.length); idx++) {
        const line = lines[idx];
        const possibleSep = line.includes(';') ? ';' : (line.includes('\t') ? '\t' : ',');
        const parts = line.split(possibleSep).map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
        const hasCode = parts.some(h => h.includes('codigo') || h.includes('código') || h.includes('sku') || h.includes('cod') || h.includes('cód'));
        const hasDesc = parts.some(h => h.includes('descricao') || h.includes('descrição') || h.includes('desc') || h.includes('nome') || h.includes('produto') || h.includes('item'));
        
        if (hasCode || hasDesc) {
          headerLineIdx = idx;
          sep = possibleSep;
          headers = parts;
          break;
        }
      }

      // Fallback if no matching header keywords were found in the first 15 lines
      if (headers.length === 0) {
        sep = lines[0].includes(';') ? ';' : (lines[0].includes('\t') ? '\t' : ',');
        headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
        headerLineIdx = 0;
      }

      // Detect column indices based on common names
      let codeIdx = headers.findIndex(h => h.includes('codigo') || h.includes('código') || h.includes('sku') || h.includes('cod') || h.includes('cód'));
      
      // Ensure descIdx does not find the same index as codeIdx
      let descIdx = headers.findIndex((h, idx) => idx !== codeIdx && (h.includes('descricao') || h.includes('descrição') || h.includes('desc') || h.includes('nome') || h.includes('produto') || h.includes('item')));
      
      let costSkuIdx = headers.findIndex((h, idx) => idx !== codeIdx && idx !== descIdx && (h.includes('custo') || h.includes('preco') || h.includes('preço') || h.includes('valor') || h.includes('val')));
      let hectoIdx = headers.findIndex((h, idx) => idx !== codeIdx && idx !== descIdx && idx !== costSkuIdx && (h.includes('hectolitro') || h.includes('hecto') || h.includes('hl') || h.includes('fator') || h.includes('fator hl') || h.includes('fator_hl')));

      // Safe fallbacks for index detection
      if (codeIdx === -1) {
        codeIdx = 0;
      }
      if (descIdx === -1 || descIdx === codeIdx) {
        descIdx = codeIdx === 0 ? 1 : 0;
      }
      if (costSkuIdx === -1) {
        costSkuIdx = [0, 1, 2, 3].find(idx => idx !== codeIdx && idx !== descIdx && idx !== hectoIdx) ?? 2;
      }
      if (hectoIdx === -1) {
        hectoIdx = [0, 1, 2, 3].find(idx => idx !== codeIdx && idx !== descIdx && idx !== costSkuIdx) ?? 3;
      }

      let importedCount = 0;
      let updatedCount = 0;
      const updatedProductsList = productImportMode === 'replace' ? [] : [...products];

      // Start reading data from the line immediately after the header line
      for (let i = headerLineIdx + 1; i < lines.length; i++) {
        const row = lines[i];
        const cols = row.split(sep).map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length <= Math.max(codeIdx, descIdx)) continue;

        const code = cols[codeIdx]?.trim();
        const description = cols[descIdx]?.trim().toUpperCase();
        if (!code || !description) continue;

        const parseValue = (val: string | undefined): number => {
          if (!val) return 0;
          let cleaned = val.replace(/[R$\s]/gi, '').trim();
          if (cleaned === '-' || cleaned === '' || cleaned === '.-' || cleaned === '-,') return 0;
          if (cleaned.includes(',') && cleaned.includes('.')) {
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
          } else {
            cleaned = cleaned.replace(',', '.');
          }
          const parsed = Number(cleaned);
          return isNaN(parsed) ? 0 : parsed;
        };

        const costSku = costSkuIdx !== -1 ? parseValue(cols[costSkuIdx]) : 0;
        const hectoVal = hectoIdx !== -1 ? (parseValue(cols[hectoIdx]) || 0.01) : 0.01;

        const existingIdx = updatedProductsList.findIndex(p => p.code === code);

        if (existingIdx >= 0) {
          if (productImportMode === 'merge') {
            // Update existing
            updatedProductsList[existingIdx] = {
              ...updatedProductsList[existingIdx],
              description,
              cost: costSku > 0 ? costSku : updatedProductsList[existingIdx].cost,
              hectoFactor: hectoVal > 0 ? hectoVal : updatedProductsList[existingIdx].hectoFactor,
            };
            updatedCount++;
          }
        } else {
          // Add new product
          const newProduct: Product = {
            code,
            description,
            group: 'CERVEJA', // Default product group
            unit: 'un',
            palletFactor: 84,
            skuFactor: 1,
            hectoFactor: hectoVal,
            cost: costSku,
            curve: 'C'
          };
          updatedProductsList.push(newProduct);
          importedCount++;
        }
      }

      onSaveProducts(updatedProductsList);
      alert(`Importação concluída!\nProdutos novos adicionados: ${importedCount}\nProdutos existentes atualizados/mesclados: ${updatedCount}`);
    };
    reader.readAsText(file);
  };

  const handleRemoveProduct = (code: string) => {
    requestConfirm(
      "Excluir Produto",
      "Deseja realmente excluir este produto?",
      () => {
        onSaveProducts(products.filter(p => p.code !== code));
      }
    );
  };

  // Action Add Vehicle
  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehPlate || !newVehCapacity) return;
    const cleanPlate = newVehPlate.trim().toUpperCase();
    
    // Allow saving if the existing entry is temporary (upgrading)
    const existing = vehicles.find(v => v.plate === cleanPlate);
    if (existing && !existing.isTemporary) {
      alert('Veículo com esta placa já está cadastrado.');
      return;
    }
    const newVehicle: Vehicle = {
      plate: cleanPlate,
      capacityPallets: Number(newVehCapacity)
    };
    
    // Remove temporary one if present
    const filtered = vehicles.filter(v => v.plate !== cleanPlate);
    onSaveVehicles([newVehicle, ...filtered]);
    setNewVehPlate('');
    setNewVehCapacity('');
    alert('Veículo cadastrado e homologado com sucesso!');
  };

  const handleRemoveVehicle = (plate: string) => {
    requestConfirm(
      "Remover Veículo",
      "Deseja realmente remover este veículo?",
      () => {
        onSaveVehicles(vehicles.filter(v => v.plate !== plate));
      }
    );
  };

  // Action Add Driver/Helper
  const handleAddDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDrvId || !newDrvName || !newDrvCpf) return;
    const cleanId = newDrvId.trim().toUpperCase();
    if (drivers.some(d => d.id === cleanId && d.id !== editingTempDriverId)) {
      alert('Já existe um colaborador com esta matrícula.');
      return;
    }
    const newDriver: Driver = {
      id: cleanId,
      name: newDrvName.trim().toUpperCase(),
      role: newDrvRole,
      cpf: newDrvCpf.trim()
    };
    
    let updatedDrivers = [...drivers];
    
    if (editingTempDriverId) {
      // Remove temporary driver
      updatedDrivers = updatedDrivers.filter(d => d.id !== editingTempDriverId);
      
      // Update existing audits pointing to temporary driver/helper ID
      const updatedAudits = audits.map(audit => {
        let changed = false;
        const newAudit = { ...audit };
        if (audit.driverId === editingTempDriverId) {
          newAudit.driverId = cleanId;
          changed = true;
        }
        if (audit.helperId === editingTempDriverId) {
          newAudit.helperId = cleanId;
          changed = true;
        }
        if (changed) {
          newAudit.history = [
            ...(newAudit.history || []),
            {
              timestamp: new Date().toISOString(),
              action: 'Cadastro Homologado',
              user: currentUser.name,
              details: `Cadastro temporário de ${newDrvRole === 'MOTORISTA' ? 'Motorista' : 'Ajudante'} convertido em definitivo (ID: ${cleanId}).`
            }
          ];
        }
        return newAudit;
      });
      onSaveAudits(updatedAudits);
    }
    
    // Save official driver
    onSaveDrivers([...updatedDrivers.filter(d => d.id !== cleanId), newDriver]);
    
    setNewDrvId('');
    setNewDrvName('');
    setNewDrvCpf('');
    setEditingTempDriverId('');
    alert('Colaborador cadastrado e homologado com sucesso!');
  };

  const handleRemoveDriver = (id: string) => {
    requestConfirm(
      "Remover Colaborador",
      "Deseja realmente remover este colaborador?",
      () => {
        onSaveDrivers(drivers.filter(d => d.id !== id));
      }
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8" id="gestor_view">
      
      {/* Tab Switcher upper bar */}
      {forceTab !== 'cadastros' && (
        <div className="flex flex-wrap border-b border-slate-200 mb-8 gap-y-2" id="gestor_tabs">
          <button
            onClick={() => setGestorTab('dashboard')}
            className={`pb-4 px-5 font-sans font-bold text-sm tracking-tight border-b-2 transition flex items-center space-x-2 cursor-pointer ${
              gestorTab === 'dashboard' 
                ? 'border-amber-500 text-slate-900' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="h-4 w-4 text-slate-500" />
            <span>Painel de Indicadores</span>
          </button>

          <button
            onClick={() => setGestorTab('sobras_faltas')}
            className={`pb-4 px-5 font-sans font-bold text-sm tracking-tight border-b-2 transition flex items-center space-x-2 cursor-pointer ${
              gestorTab === 'sobras_faltas' 
                ? 'border-amber-500 text-slate-900' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCheck className="h-4 w-4 text-amber-600" />
            <span className="flex items-center space-x-1.5">
              <span>Sobras & Faltas (Visão Master)</span>
              <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded-full font-sans font-bold">Analista Master</span>
            </span>
          </button>

          <button
            onClick={() => setGestorTab('map_tracking')}
            className={`pb-4 px-5 font-sans font-bold text-sm tracking-tight border-b-2 transition flex items-center space-x-2 cursor-pointer ${
              gestorTab === 'map_tracking' 
                ? 'border-amber-500 text-slate-900' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Monitoramento de Mapas</span>
          </button>

          <button
            onClick={() => setGestorTab('refugos_dashboard')}
            className={`pb-4 px-5 font-sans font-bold text-sm tracking-tight border-b-2 transition flex items-center space-x-2 cursor-pointer ${
              gestorTab === 'refugos_dashboard' 
                ? 'border-amber-500 text-slate-900' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            id="tab_refugos_dashboard"
          >
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span>Controle de Refugos & Avarias</span>
          </button>

          <button
            onClick={() => setGestorTab('historico')}
            className={`pb-4 px-5 font-sans font-bold text-sm tracking-tight border-b-2 transition flex items-center space-x-2 cursor-pointer ${
              gestorTab === 'historico' 
                ? 'border-amber-500 text-slate-900' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            id="tab_historico"
          >
            <Clock className="h-4 w-4 text-emerald-500" />
            <span>Histórico de Retornos</span>
          </button>

          <button
            onClick={() => setGestorTab('audit_logs')}
            className={`pb-4 px-5 font-sans font-bold text-sm tracking-tight border-b-2 transition flex items-center space-x-2 cursor-pointer ${
              gestorTab === 'audit_logs' 
                ? 'border-amber-500 text-slate-900' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            id="tab_audit_logs"
          >
            <Shield className="h-4 w-4 text-indigo-600" />
            <span>Logs de Operações</span>
          </button>

          <button
            onClick={() => setGestorTab('firebase_sync')}
            className={`pb-4 px-5 font-sans font-bold text-sm tracking-tight border-b-2 transition flex items-center space-x-2 cursor-pointer ${
              gestorTab === 'firebase_sync' 
                ? 'border-amber-500 text-slate-900' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            id="tab_firebase_sync"
          >
            <HardDrive className="h-4 w-4 text-orange-600" />
            <span>Conexão Firebase</span>
          </button>
        </div>
      )}

      {gestorTab === 'dashboard' && (
        /* DASHBOARD SECTION */
        <div className="space-y-8" id="gestor_dashboard">

          {/* Alertas de Envios Pendentes (Sobras) */}
          {(() => {
            const pendingSurplus = audits.filter(audit => {
              if (audit.status !== 'finalizado_ok' && audit.status !== 'finalizado_divergente') return false;
              const isSent = audit.surplusActionStatus === 'enviado_cliente';
              if (isSent) return false;

              const hasProductSurplus = audit.items.some(item => {
                const phys = item.rePhysicalQty !== undefined ? item.rePhysicalQty : item.physicalQty;
                return phys > (item.fiscalQty ?? 0);
              });

              const hasAssetSurplus = audit.assets.some(asset => {
                const phys = asset.rePhysicalQty !== undefined ? asset.rePhysicalQty : asset.physicalQty;
                return phys > (asset.fiscalQty ?? 0);
              });

              return hasProductSurplus || hasAssetSurplus;
            });

            if (pendingSurplus.length === 0) return null;

            return (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3.5 shadow-xs" id="shipment_notifications">
                <div className="flex items-center space-x-2 text-amber-800">
                  <CircleAlert className="h-5 w-5 text-amber-500 animate-pulse" />
                  <h4 className="font-sans font-extrabold text-sm uppercase tracking-wider">Notificações de Envios Pendentes ({pendingSurplus.length})</h4>
                </div>
                <p className="text-xxs text-amber-700">
                  As seguintes rotas apresentaram <strong>Sobras Físicas</strong> na reconciliação fiscal e necessitam que o gestor realize o envio ou dê a respectiva baixa operacional.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[250px] overflow-y-auto">
                  {pendingSurplus.map(audit => {
                    const drv = drivers.find(d => d.id === audit.driverId)?.name || audit.driverId;
                    return (
                      <div key={audit.id} className="bg-white p-3.5 rounded-lg border border-amber-100 flex justify-between items-center text-xs gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-800 font-sans">{audit.routeMap}</span>
                            <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-mono">{audit.plate}</span>
                          </div>
                          <p className="text-[10px] text-slate-400">Motorista: {drv}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            handleUpdateAuditDiscrepancyAction(audit.id, {
                              surplusActionStatus: 'enviado_cliente',
                              correctiveActionNotes: 'Envio realizado pelo Painel de Alertas de Gestão.'
                            });
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded text-[10px] flex items-center space-x-1 cursor-pointer transition"
                        >
                          <Check className="h-3 w-3" />
                          <span>Realizar Envio</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
          
          {/* Key Metrics Bento-Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* KPI 1 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs hover:shadow transition">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block font-mono">Rotas Baixadas</span>
                  <span className="text-3xl font-sans font-bold text-slate-900 block mt-1">
                    {totalAuditsCount}
                  </span>
                </div>
                <div className="bg-slate-100 p-2 rounded-lg text-slate-700">
                  <Truck className="h-5 w-5" />
                </div>
              </div>
              <div className="text-xxs text-slate-400 mt-4 font-sans">
                Aferições físicas e fiscais totalmente concluídas.
              </div>
            </div>

            {/* KPI 2 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs hover:shadow transition">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block font-mono">Índice de Acerto (OK)</span>
                  <span className="text-3xl font-sans font-bold text-emerald-600 block mt-1">
                    {matchRate.toFixed(1)}%
                  </span>
                </div>
                <div className="bg-emerald-50 p-2 rounded-lg text-emerald-700">
                  <Percent className="h-5 w-5" />
                </div>
              </div>
              <div className="text-xxs text-slate-400 mt-4 flex items-center space-x-1 font-sans">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>{okAuditsCount} rotas em perfeita conformidade.</span>
              </div>
            </div>

            {/* KPI 3 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs hover:shadow transition">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block font-mono">Produtividade de Aferição</span>
                  <span className="text-3xl font-sans font-bold text-slate-900 block mt-1">
                    {avgMinsText}
                  </span>
                </div>
                <div className="bg-amber-50 p-2 rounded-lg text-amber-700 animate-pulse">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
              <div className="text-xxs text-slate-400 mt-4 font-sans">
                Tempo médio do início ao fim da contagem física.
              </div>
            </div>

            {/* KPI 4 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs hover:shadow transition">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block font-mono">Divergência de Estoque</span>
                  <div className="mt-1 space-y-0.5">
                    <span className="text-sm font-bold text-red-600 block leading-tight">
                      Perdas: R$ {totalMissingCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-sm font-bold text-amber-600 block leading-tight">
                      Sobras: R$ {totalSurplusCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <div className="bg-red-50 p-2 rounded-lg text-red-700">
                  <Landmark className="h-5 w-5" />
                </div>
              </div>
              <div className="text-xxs text-slate-400 mt-3 font-sans">
                Valorização monetária dos desvios de rota.
              </div>
            </div>

          </div>

          {/* Graphics Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Top Product Discrepancies (Pareto) */}
            <div className="lg:col-span-8 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-sans font-bold text-base text-slate-900 mb-2 flex items-center space-x-2">
                <span>Produtos & Ativos com Maior Impacto de Divergência</span>
              </h3>
              <p className="text-xxs text-slate-400 mb-6">Lista dos itens com maiores perdas/sobras financeiras acumuladas.</p>

              {topDiscrepantProducts.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 rounded-lg text-slate-400 text-sm border border-dashed border-slate-200">
                  Nenhuma divergência registrada no dia de hoje.
                </div>
              ) : (
                <div className="space-y-4">
                  {topDiscrepantProducts.map((p, idx) => {
                    const isLoss = p.financial < 0;
                    return (
                      <div key={p.code + idx} className="p-3.5 rounded-lg border border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xxs font-bold bg-slate-200 px-1.5 py-0.5 rounded text-slate-600">
                              {p.code}
                            </span>
                          </div>
                          <span className="font-sans font-semibold text-slate-800 text-xs block pt-1">{p.desc}</span>
                        </div>

                        <div className="flex items-center space-x-6">
                          <div className="text-right">
                            <span className="text-xxs text-slate-400 block font-mono">Divergência Física</span>
                            <span className="font-semibold text-xs text-slate-700">
                              {p.missing > 0 && <span className="text-red-600 mr-2">-{p.missing} Faltas</span>}
                              {p.surplus > 0 && <span className="text-amber-600">+{p.surplus} Sobras</span>}
                            </span>
                          </div>

                          <div className="text-right min-w-[120px] bg-white p-2 rounded border border-slate-100">
                            <span className="text-xxs text-slate-400 block font-mono">Custo do Desvio</span>
                            <span className={`font-mono font-bold text-xs ${isLoss ? 'text-red-600' : 'text-amber-600'}`}>
                              {isLoss ? '-' : '+'}R$ {Math.abs(p.financial).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Productivity by Conferente */}
            <div className="lg:col-span-4 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-sans font-bold text-base text-slate-900 mb-2">Produtividade por Conferente</h3>
              <p className="text-xxs text-slate-400 mb-6">Métricas de tempo de contagem física e assertividade por login individual.</p>

              {Object.keys(confProductivity).length === 0 ? (
                <div className="text-center py-16 bg-slate-50 rounded-lg text-slate-400 text-sm border border-dashed border-slate-200">
                  Sem dados de cronometragem acumulados.
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.values(confProductivity)
                    .sort((a, b) => b.count - a.count || (a.totalSeconds / a.count) - (b.totalSeconds / b.count))
                    .map((item) => {
                      const avgSec = item.totalSeconds / item.count;
                      const min = Math.floor(avgSec / 60);
                      const sec = Math.floor(avgSec % 60);
                      
                      const totalRated = item.okCount + item.divergentCount;
                      const accuracyRate = totalRated > 0 ? (item.okCount / totalRated) * 100 : 100;
                      
                      return (
                        <div key={item.id} className="bg-slate-50 rounded-xl p-3 border border-slate-100 hover:border-slate-200 transition space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-semibold text-slate-900 text-xs block">{item.name}</span>
                              {item.username && (
                                <span className="font-mono text-xxs text-[#0f35a9] font-medium block">
                                  Login: @{item.username}
                                </span>
                              )}
                            </div>
                            <span className="bg-blue-50 text-blue-700 font-mono text-xxs px-2 py-0.5 rounded font-bold">
                              {item.count} {item.count === 1 ? 'rota' : 'rotas'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-100">
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase font-mono tracking-wider">Tempo Médio</span>
                              <span className="text-xs font-bold text-slate-700 font-mono">
                                {min}m {sec}s
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase font-mono tracking-wider">Acerto (OK)</span>
                              <span className={`text-xs font-bold font-mono ${accuracyRate >= 80 ? 'text-emerald-600' : accuracyRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                                {accuracyRate.toFixed(1)}%
                              </span>
                            </div>
                          </div>

                          {/* Progress bar based on speed (up to 15 minutes = 900s) */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xxs text-slate-400">
                              <span>Velocidade de Contagem</span>
                              <span className="font-mono font-medium">
                                {avgSec < 300 ? 'Rápida' : avgSec < 600 ? 'Média' : 'Abaixo da Média'}
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  avgSec < 300 ? 'bg-emerald-500' : avgSec < 600 ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${Math.max(5, Math.min(100, (1 - avgSec / 900) * 100))}%` }} // shorter time = higher progress bar
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

          </div>

          {/* NEW ROW: PRESTADORES DE CONTA WITH MOST DISCREPANCIES & PHOTO STORAGE SETTINGS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Prestadores de Contas Discrepancy Ranking */}
            <div className="lg:col-span-8 bg-white rounded-xl shadow-sm border border-slate-200 p-6" id="ranking_prestadores">
              <h3 className="font-sans font-bold text-base text-slate-900 mb-1 flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <span>Ranking de Prestadores de Contas com Divergências</span>
              </h3>
              <p className="text-xxs text-slate-400 mb-6">Visualização consolidada de motoristas e ajudantes com maior índice de desvios físicos/fiscais e passivo financeiro acumulado.</p>

              {rankedDrivers.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-lg text-slate-400 text-xs">
                  Sem histórico de viagens finalizadas para calcular o ranking de divergências.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left divide-y divide-slate-100 text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2.5 font-bold text-slate-500 uppercase">Colaborador / Função</th>
                        <th className="px-3 py-2.5 font-bold text-slate-500 uppercase text-center">Viagens Totais</th>
                        <th className="px-3 py-2.5 font-bold text-slate-500 uppercase text-center text-red-600 bg-red-50/50">Viagens c/ Desvio</th>
                        <th className="px-3 py-2.5 font-bold text-slate-500 uppercase text-center">Faltas Físicas</th>
                        <th className="px-3 py-2.5 font-bold text-slate-500 uppercase text-right">Passivo Gerado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {rankedDrivers.map((item, idx) => {
                        const divRate = item.totalTrips > 0 ? (item.divergentTrips / item.totalTrips) * 100 : 0;
                        const isHighRisk = divRate > 50 && item.divergentTrips > 0;
                        
                        return (
                          <tr key={item.id} className={`hover:bg-slate-50/80 transition-colors ${isHighRisk ? 'bg-red-50/10' : ''}`}>
                            <td className="px-3 py-3 font-semibold text-slate-800">
                              <div className="flex items-center space-x-2">
                                <span className="font-mono text-[10px] text-slate-400 bg-slate-150 px-1.5 py-0.5 rounded">
                                  {idx + 1}º
                                </span>
                                <div>
                                  <span className="block leading-tight font-sans font-bold">{item.name}</span>
                                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mt-0.5">
                                    {item.role === 'MOTORISTA' ? '👨‍✈️ Motorista' : '👤 Ajudante'} (Matr: {item.id})
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center font-mono font-bold text-slate-700">
                              {item.totalTrips}
                            </td>
                            <td className="px-3 py-3 text-center font-mono font-bold text-red-600 bg-red-50/15">
                              {item.divergentTrips} 
                              <span className="text-[10px] font-normal text-slate-400 ml-1.5">({divRate.toFixed(0)}%)</span>
                              
                              {/* Small health gauge */}
                              <div className="w-16 bg-slate-100 h-1.5 rounded-full mx-auto mt-1 overflow-hidden border">
                                <div 
                                  className="bg-red-600 h-full rounded-full" 
                                  style={{ width: `${Math.min(100, divRate)}%` }}
                                />
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center font-mono text-slate-600">
                              {item.totalMissingQty} un
                            </td>
                            <td className="px-3 py-3 text-right font-mono font-extrabold text-slate-900">
                              {item.totalFinancialLoss > 0 ? (
                                <span className="text-red-700">
                                  -R$ {item.totalFinancialLoss.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              ) : (
                                <span className="text-emerald-700">R$ 0,00</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Proof Security & Retention Administration */}
            <div className="lg:col-span-4 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
              <div>
                <h3 className="font-sans font-bold text-base text-slate-900 mb-1 flex items-center space-x-2">
                  <HardDrive className="h-5 w-5 text-[#0f35a9]" />
                  <span>Segurança de Provas & Imagens</span>
                </h3>
                <p className="text-xxs text-slate-400 mb-5">Administre o banco de dados IndexedDB de evidências fotográficas anexadas como prova fiscal.</p>

                {/* Storage usage display card */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-5 text-center">
                  <Camera className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <span className="text-xxs text-slate-400 uppercase tracking-wider block font-mono">Uso de Armazenamento Local</span>
                  <span className="text-2xl font-bold font-mono text-[#0f35a9] block mt-1">
                    {photoStats.sizeMb} MB
                  </span>
                  <span className="text-xs text-slate-600 font-bold block mt-1">
                    {photoStats.count} fotos gravadas no banco
                  </span>
                </div>

                {/* Retention policy inputs */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xxs font-bold text-slate-500 uppercase mb-1">Política de Limpeza de Imagens</label>
                    <select
                      value={retentionDays}
                      onChange={e => setRetentionDays(Number(e.target.value))}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      <option value={1}>Prunar maiores que 1 dia (Simular Limpeza)</option>
                      <option value={15}>Apagar mais antigas que 15 dias</option>
                      <option value={30}>Apagar mais antigas que 30 dias (Mínimo Processual)</option>
                      <option value={180}>Apagar mais antigas que 6 meses</option>
                      <option value={365}>Apagar mais antigas que 12 meses (Máximo Armazenamento)</option>
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      Conforme as diretrizes, a empresa exige retenção mínima de 30 dias para fotos de divergências. Caso a memória do navegador esteja livre, pode-se reter por até 12 meses.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-5 border-t border-slate-100 mt-5">
                <button
                  type="button"
                  onClick={handlePrunePhotos}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-lg text-xs transition flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Prunar e Praticar Limpeza Local</span>
                </button>
              </div>
            </div>

          </div>

          {/* VISÃO GERENCIAL DE REFUGOS, PERCENTUAIS E RANKINGS */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6" id="gerencia_refugos">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-sans font-bold text-base text-slate-900 flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <span>Controle de Refugos, Percentuais e Rankings (Visão Gerencial)</span>
                </h3>
                <p className="text-xxs text-slate-400 mt-0.5">Motivos de descarte aferidos pelos conferentes separados por motorista com cálculos percentuais automáticos.</p>
              </div>
              <span className="text-xs bg-red-100 text-red-800 font-bold px-3 py-1 rounded-full font-sans">
                Total Geral: {totalRefugosOverallQty} itens refugados
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Card 1: Motivos de Refugo (Percentuais) */}
              <div className="lg:col-span-6 bg-slate-50/50 p-5 rounded-xl border border-slate-100 space-y-4">
                <h4 className="font-sans font-bold text-xs text-slate-800 uppercase tracking-wider">Avarias por Motivo e Percentuais</h4>
                
                {rankedRefugoMotives.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs italic">
                    Nenhum refugo ou avaria registrado nesta base de dados.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rankedRefugoMotives.map((item, idx) => (
                      <div key={item.motive + idx} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-sans font-semibold text-slate-800 uppercase text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded shadow-xs">{item.motive}</span>
                          <span className="font-mono text-slate-600 font-bold">
                            {item.qty} un • <strong>{item.percentage.toFixed(1)}%</strong>
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                          <div 
                            className="bg-red-500 h-full rounded-full transition-all"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card 2: Ranking de Motoristas com maior Refugo */}
              <div className="lg:col-span-6 bg-slate-50/50 p-5 rounded-xl border border-slate-100 space-y-4">
                <h4 className="font-sans font-bold text-xs text-slate-800 uppercase tracking-wider">Ranking de Motoristas com Maior Percentual de Avarias</h4>
                
                {rankedRefugoDrivers.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs italic">
                    Nenhum motorista possui histórico de produtos refugados.
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                    {rankedRefugoDrivers.map((drv, idx) => {
                      const driverNameStr = drivers.find(d => d.id === drv.driverId)?.name || drv.driverId;
                      const driverPercentage = totalRefugosOverallQty > 0 ? (drv.totalRefugoQty / totalRefugosOverallQty) * 100 : 0;
                      return (
                        <div key={drv.driverId + idx} className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between text-xs hover:border-red-300 transition-colors">
                          <div className="space-y-0.5">
                            <span className="font-mono text-[10px] font-extrabold text-slate-400 block">{idx + 1}º COLABORADOR</span>
                            <span className="font-bold text-slate-800 block">{driverNameStr}</span>
                            <span className="text-[10px] font-mono text-slate-400">Matrícula: {drv.driverId}</span>
                          </div>
                          
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block font-mono">Volume Descartado</span>
                            <span className="font-bold text-red-600 block">{drv.totalRefugoQty} un</span>
                            <span className="text-[10px] font-mono bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-extrabold">{driverPercentage.toFixed(1)}% do total</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* PAINEL DE GESTÃO E IMPACTO FINANCEIRO DE VALES */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6" id="dashboard_vales_gerenciais">
            <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
              <div className="space-y-0.5">
                <span className="text-emerald-600 font-mono text-xxs uppercase tracking-widest block font-bold">Faturamento & Prestação de Contas</span>
                <h3 className="font-sans font-bold text-base text-slate-900 flex items-center space-x-2">
                  <Landmark className="h-5.5 w-5.5 text-emerald-600" />
                  <span>Painel de Gestão e Impacto Financeiro de Vales</span>
                </h3>
                <p className="text-xxs text-slate-400">Visão analítica do fluxo de termos de autorização de desconto, assinaturas e faturamento compensado por colaborador.</p>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xxs bg-emerald-50 text-emerald-800 border border-emerald-200 font-extrabold px-3 py-1 rounded-full font-mono uppercase">
                  Gestão Mensal Ativa
                </span>
              </div>
            </div>

            {/* Vales KPIs Cards Grid */}
            {(() => {
              const pendingValesList = vales.filter(v => v.status === 'PENDENTE_ASSINATURA');
              const signedValesList = vales.filter(v => v.status === 'ASSINADO');
              const compensatedValesList = vales.filter(v => v.status === 'COMPENSADO');

              const pendingSum = pendingValesList.reduce((s, v) => s + v.valor, 0);
              const signedSum = signedValesList.reduce((s, v) => s + v.valor, 0);
              const compensatedSum = compensatedValesList.reduce((s, v) => s + v.valor, 0);
              const totalSum = vales.reduce((s, v) => s + v.valor, 0);

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total Card */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Total de Vales Emitidos</span>
                    <span className="text-xl font-bold text-slate-900 block mt-1">R$ {totalSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    <span className="text-xxs text-slate-500 block mt-1 font-sans font-medium">{vales.length} termos de desconto gerados</span>
                  </div>

                  {/* Pending Card */}
                  <div className="bg-amber-50/75 p-4 rounded-xl border border-amber-200">
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block font-mono">Pendente Assinatura (Passivo)</span>
                    <span className="text-xl font-bold text-amber-600 block mt-1">R$ {pendingSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    <span className="text-xxs text-amber-700 block mt-1 font-sans font-semibold">{pendingValesList.length} termos aguardando assinatura</span>
                  </div>

                  {/* Signed Card */}
                  <div className="bg-blue-50/75 p-4 rounded-xl border border-blue-200">
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block font-mono">Termos Assinados (Garantido)</span>
                    <span className="text-xl font-bold text-blue-600 block mt-1">R$ {signedSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    <span className="text-xxs text-blue-700 block mt-1 font-sans font-semibold">{signedValesList.length} prontos para desconto</span>
                  </div>

                  {/* Compensated Card */}
                  <div className="bg-emerald-50/75 p-4 rounded-xl border border-emerald-200">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block font-mono">Faturado / Compensado</span>
                    <span className="text-xl font-bold text-emerald-600 block mt-1">R$ {compensatedSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    <span className="text-xxs text-emerald-700 block mt-1 font-sans font-semibold">{compensatedValesList.length} compensados no financeiro</span>
                  </div>
                </div>
              );
            })()}

            {/* Split layout: Left (Aggregated List by Colab), Right (Interactive filterable list of Vales with actions) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Aggregated List by Collaborator */}
              <div className="lg:col-span-4 bg-slate-50/55 p-4 rounded-xl border border-slate-150 space-y-4">
                <div className="space-y-1">
                  <h4 className="font-sans font-bold text-xs text-slate-800 uppercase tracking-wider">Passivo Financeiro por Colaborador</h4>
                  <p className="text-[10px] text-slate-400">Total acumulado de desvios e vales gerados por motorista ou ajudante.</p>
                </div>

                {(() => {
                  const valesByColab = vales.reduce((acc, v) => {
                    if (!acc[v.colaboradorId]) {
                      acc[v.colaboradorId] = {
                        id: v.colaboradorId,
                        name: v.colaboradorName,
                        role: v.colaboradorRole,
                        totalVales: 0,
                        totalAmount: 0,
                        pendingAmount: 0,
                        signedAmount: 0,
                        compensatedAmount: 0
                      };
                    }
                    acc[v.colaboradorId].totalVales += 1;
                    acc[v.colaboradorId].totalAmount += v.valor;
                    if (v.status === 'PENDENTE_ASSINATURA') acc[v.colaboradorId].pendingAmount += v.valor;
                    else if (v.status === 'ASSINADO') acc[v.colaboradorId].signedAmount += v.valor;
                    else if (v.status === 'COMPENSADO') acc[v.colaboradorId].compensatedAmount += v.valor;
                    return acc;
                  }, {} as Record<string, any>);

                  const sortedColabs = Object.values(valesByColab).sort((a, b) => b.totalAmount - a.totalAmount);

                  if (sortedColabs.length === 0) {
                    return (
                      <div className="text-center py-12 text-slate-400 text-xs italic">
                        Nenhum colaborador com vales registrados.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                      {sortedColabs.map((col, idx) => {
                        const isHighRisk = col.totalAmount > 350;
                        return (
                          <div key={col.id + idx} className={`p-3 rounded-lg border bg-white flex flex-col space-y-1.5 transition ${isHighRisk ? 'border-red-200' : 'border-slate-200'}`}>
                            <div className="flex justify-between items-start">
                              <div className="space-y-0.5">
                                <span className="font-bold text-slate-800 block text-xs truncate max-w-[150px]">{col.name}</span>
                                <span className="text-[9px] font-mono text-slate-400 uppercase block">{col.role} • {col.totalVales} {col.totalVales === 1 ? 'vale' : 'vales'}</span>
                              </div>
                              <span className="font-mono font-bold text-xs text-slate-900">
                                R$ {col.totalAmount.toFixed(2)}
                              </span>
                            </div>

                            {/* Small visual bar representing proportions */}
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex">
                              <div 
                                className="bg-amber-400 h-full" 
                                style={{ width: `${(col.pendingAmount / col.totalAmount) * 100}%` }}
                                title={`Pendente: R$ ${col.pendingAmount.toFixed(2)}`}
                              />
                              <div 
                                className="bg-blue-400 h-full" 
                                style={{ width: `${(col.signedAmount / col.totalAmount) * 100}%` }}
                                title={`Assinado: R$ ${col.signedAmount.toFixed(2)}`}
                              />
                              <div 
                                className="bg-emerald-400 h-full" 
                                style={{ width: `${(col.compensatedAmount / col.totalAmount) * 100}%` }}
                                title={`Compensado: R$ ${col.compensatedAmount.toFixed(2)}`}
                              />
                            </div>

                            {/* Risk alert badge */}
                            {isHighRisk && (
                              <div className="text-[9px] bg-red-50 text-red-600 font-extrabold px-1.5 py-0.5 rounded flex items-center gap-1">
                                <AlertTriangle className="h-2.5 w-2.5 text-red-500 animate-pulse" />
                                ALTO PASSIVO ACUMULADO (Atenção no Faturamento)
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Filterable List of Vales with actions */}
              <div className="lg:col-span-8 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-150">
                  {/* Status Filters */}
                  <div className="flex flex-wrap gap-1">
                    {[
                      { key: 'todos', label: 'Todos' },
                      { key: 'PENDENTE_ASSINATURA', label: 'Pendentes' },
                      { key: 'ASSINADO', label: 'Assinados' },
                      { key: 'COMPENSADO', label: 'Compensados' }
                    ].map(f => (
                      <button
                        key={f.key}
                        onClick={() => setValesFilter(f.key as any)}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition cursor-pointer ${
                          valesFilter === f.key 
                            ? 'bg-slate-900 text-white shadow-3xs' 
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Search bar inside Vales dashboard */}
                  <div className="relative max-w-xs w-full">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por colaborador..."
                      value={valesSearch}
                      onChange={(e) => setValesSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-slate-500"
                    />
                  </div>
                </div>

                {/* File Input and Handler for Vales Dashboard */}
                <input
                  type="file"
                  ref={dashboardValeInputRef}
                  accept="application/pdf,image/*"
                  className="hidden"
                  id="dashboard_vale_file_input_direct"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file || !selectedValeIdForUploadDash) return;

                    const reader = new FileReader();
                    reader.onload = () => {
                      const dataUrl = reader.result as string;
                      const updated = vales.map(v => 
                        v.id === selectedValeIdForUploadDash 
                          ? { ...v, status: 'ASSINADO' as const, signedPdfUrl: dataUrl, signedPdfName: file.name } 
                          : v
                      );
                      onSaveVales(updated);
                      setSelectedValeIdForUploadDash(null);
                      alert(`Termo assinado anexado com sucesso para o vale! O arquivo "${file.name}" foi importado.`);
                    };
                    reader.readAsDataURL(file);
                  }}
                />

                {/* Vales Cards / Table */}
                {(() => {
                  const filteredVales = vales.filter(v => {
                    const matchesStatus = valesFilter === 'todos' || v.status === valesFilter;
                    const matchesSearch = v.colaboradorName.toLowerCase().includes(valesSearch.toLowerCase()) || 
                                          v.descricao.toLowerCase().includes(valesSearch.toLowerCase()) ||
                                          v.routeMap?.toLowerCase().includes(valesSearch.toLowerCase());
                    return matchesStatus && matchesSearch;
                  });

                  if (filteredVales.length === 0) {
                    return (
                      <div className="text-center py-16 bg-slate-50 rounded-xl text-slate-400 text-xs italic border border-dashed border-slate-200">
                        Nenhum termo de vale encontrado com os critérios de busca aplicados.
                      </div>
                    );
                  }

                  return (
                    <div className="border border-slate-150 rounded-xl overflow-hidden bg-white">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-150 text-[9px] text-slate-400 font-bold uppercase tracking-wider font-sans">
                              <th className="py-2.5 px-3">Colaborador</th>
                              <th className="py-2.5 px-3">Origem / Descrição</th>
                              <th className="py-2.5 px-3 text-right">Valor</th>
                              <th className="py-2.5 px-3 text-center">Status</th>
                              <th className="py-2.5 px-3 text-center">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                            {filteredVales.map((vale) => (
                              <tr key={vale.id} className="hover:bg-slate-50/50 transition">
                                <td className="py-3 px-3">
                                  <span className="font-bold text-slate-900 block leading-tight">{vale.colaboradorName}</span>
                                  <span className="text-[9px] font-mono text-slate-400 block uppercase">{vale.colaboradorRole}</span>
                                </td>
                                <td className="py-3 px-3">
                                  <span className="text-slate-600 block line-clamp-1 max-w-[200px] leading-tight" title={vale.descricao}>{vale.descricao}</span>
                                  <span className="text-[10px] text-slate-400 block font-sans">
                                    {vale.routeMap !== 'AVULSO' ? `Mapa ${vale.routeMap}` : 'Mapa Avulso'} • {new Date(vale.dataGeracao + 'T00:00:00').toLocaleDateString('pt-BR')}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                                  R$ {vale.valor.toFixed(2)}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span className={`inline-block px-2 py-0.5 text-[8px] font-black uppercase rounded-full ${
                                    vale.status === 'COMPENSADO'
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : vale.status === 'ASSINADO'
                                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                        : 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                                  }`}>
                                    {vale.status === 'PENDENTE_ASSINATURA' ? 'Pendente' : vale.status === 'ASSINADO' ? 'Assinado' : 'Compensado'}
                                  </span>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="flex justify-center items-center gap-1.5">
                                    {/* View details */}
                                    <button
                                      type="button"
                                      onClick={() => setViewingValeDetails(vale)}
                                      className="p-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer transition"
                                      title="Visualizar Detalhes do Termo"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </button>

                                    {/* Upload/Assign manual term */}
                                    {vale.status === 'PENDENTE_ASSINATURA' && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedValeIdForUploadDash(vale.id);
                                          setTimeout(() => {
                                            dashboardValeInputRef.current?.click();
                                          }, 50);
                                        }}
                                        className="p-1 text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded cursor-pointer transition"
                                        title="Importar vale assinado (PDF ou Imagem)"
                                      >
                                        <UploadCloud className="h-3.5 w-3.5" />
                                      </button>
                                    )}

                                    {/* Compensate / Invoice */}
                                    {(vale.status === 'ASSINADO' || vale.status === 'PENDENTE_ASSINATURA') && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          requestConfirm(
                                            'Confirmar Compensação',
                                            `Tem certeza de que deseja faturar e marcar este vale de R$ ${vale.valor.toFixed(2)} para ${vale.colaboradorName} como COMPENSADO?`,
                                            () => {
                                              const updated = vales.map(v => v.id === vale.id ? { ...v, status: 'COMPENSADO' as const } : v);
                                              onSaveVales(updated);
                                            }
                                          );
                                        }}
                                        className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[9px] rounded uppercase transition cursor-pointer"
                                        title="Faturar e marcar como compensado"
                                      >
                                        Compensar
                                      </button>
                                    )}

                                    {/* Download signed attachment if present */}
                                    {(vale.status === 'ASSINADO' || vale.status === 'COMPENSADO') && vale.signedPdfUrl && (
                                      <a
                                        href={vale.signedPdfUrl}
                                        download={vale.signedPdfName || `vale_assinado_${vale.id}.pdf`}
                                        className="p-1 text-emerald-600 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded cursor-pointer transition flex items-center justify-center"
                                        title={`Baixar anexo: ${vale.signedPdfName || 'PDF'}`}
                                      >
                                        <FileText className="h-3.5 w-3.5" />
                                      </a>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>

            </div>
          </div>



        </div>
      )}

      {gestorTab === 'cadastros' && (
        /* CADASTROS & BASES MANAGEMENT SECTION */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="gestor_cadastros">
          
          {/* Left Sub-navigation Bar */}
          <div className="lg:col-span-3 space-y-2">
            <span className="text-xxs font-bold text-slate-400 uppercase tracking-widest pl-3 block mb-2">Seções de Cadastro</span>
            
            <button
              id="subtab_usuarios"
              onClick={() => { setCadastroSubTab('usuarios'); setSearchQuery(''); }}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center space-x-2.5 transition ${
                cadastroSubTab === 'usuarios' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Cadastro de Usuários</span>
            </button>

            <button
              id="subtab_produtos"
              onClick={() => { setCadastroSubTab('produtos'); setSearchQuery(''); }}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center space-x-2.5 transition ${
                cadastroSubTab === 'produtos' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Cadastro de Produtos (PA)</span>
            </button>

            <button
              id="subtab_veiculos"
              onClick={() => { setCadastroSubTab('veiculos'); setSearchQuery(''); }}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center space-x-2.5 transition ${
                cadastroSubTab === 'veiculos' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Truck className="h-4 w-4" />
              <span>Base de Veículos / Placas</span>
            </button>

            <button
              id="subtab_motoristas"
              onClick={() => { setCadastroSubTab('motoristas'); setSearchQuery(''); }}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center space-x-2.5 transition ${
                cadastroSubTab === 'motoristas' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Motoristas e Ajudantes</span>
            </button>

            <button
              id="subtab_manutencao"
              onClick={() => { setCadastroSubTab('manutencao'); setSearchQuery(''); }}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center space-x-2.5 transition ${
                cadastroSubTab === 'manutencao' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <HardDrive className="h-4 w-4" />
              <span>Manutenção do Sistema</span>
            </button>
          </div>

          {/* Right Work Form & Table lists */}
          <div className="lg:col-span-9 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            
            {/* 1. USUARIOS TAB */}
            {cadastroSubTab === 'usuarios' && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
                  <div>
                    <h3 className="font-sans font-bold text-base text-slate-900">Gerenciamento de Usuários</h3>
                    <p className="text-xxs text-slate-400 mt-0.5">Cadastre Conferentes, Auxiliares de Logística ou Gestores.</p>
                  </div>
                </div>

                {/* Form users */}
                <form onSubmit={handleAddUser} className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                  <div className="sm:col-span-3">
                    <label className="block text-xxs font-semibold text-slate-600 mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Lucas Ferreira"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded p-2 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xxs font-semibold text-slate-600 mb-1">Nome de Usuário (Username) *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: lucas.log"
                      value={newUserUsername}
                      onChange={(e) => setNewUserUsername(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded p-2 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xxs font-semibold text-slate-600 mb-1">Senha de Acesso *</label>
                    <input
                      type="password"
                      required
                      placeholder="Ex: 123"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded p-2 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xxs font-semibold text-slate-600 mb-1">Função / Perfil *</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                      className="w-full text-xs bg-white border border-slate-200 rounded p-2 focus:outline-none"
                    >
                      <option value="conferente">Conferente de Pátio</option>
                      <option value="auxiliar_logistica">Auxiliar de Logística (Fiscal)</option>
                      <option value="monitoramento">Monitoramento</option>
                      <option value="gestor">Gestor Master</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 flex flex-col space-y-1.5">
                    <button
                      type="submit"
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 px-3 rounded flex items-center justify-center space-x-1 text-xs shadow-xs cursor-pointer"
                    >
                      {editingUserId ? <Check className="h-4 w-4 text-emerald-400" /> : <Plus className="h-4 w-4 text-amber-400" />}
                      <span>{editingUserId ? 'Salvar' : 'Cadastrar'}</span>
                    </button>
                    {editingUserId && (
                      <button
                        type="button"
                        onClick={handleCancelEditUser}
                        className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-1 px-3 rounded text-[10px] cursor-pointer text-center"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>

                {/* List of users */}
                <div className="border border-slate-100 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 font-bold text-slate-500 uppercase">Nome</th>
                        <th className="px-4 py-2 font-bold text-slate-500 uppercase">Username</th>
                        <th className="px-4 py-2 font-bold text-slate-500 uppercase">Senha</th>
                        <th className="px-4 py-2 font-bold text-slate-500 uppercase">Perfil / Permissões</th>
                        <th className="px-4 py-2 w-24 text-right pr-6">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {users.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-800">{u.name}</td>
                          <td className="px-4 py-3 font-mono text-slate-500">{u.username}</td>
                          <td className="px-4 py-3 font-mono text-slate-500">{u.password || '123'}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xxs font-bold border uppercase ${
                              u.role === 'conferente' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                              u.role === 'auxiliar_logistica' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                              u.role === 'monitoramento' ? 'bg-sky-50 text-sky-800 border-sky-200' :
                              'bg-purple-50 text-purple-800 border-purple-200'
                            }`}>
                              {u.role === 'conferente' ? '👨‍✈️ Conferente' : 
                               u.role === 'auxiliar_logistica' ? '👩‍💻 Auxiliar de Logística' : 
                               u.role === 'monitoramento' ? '📡 Monitoramento' : '👑 Gestor'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right flex items-center justify-end space-x-1.5 pr-4">
                            <button
                              type="button"
                              onClick={() => handleStartEditUser(u)}
                              className="text-slate-400 hover:text-blue-600 transition p-1 cursor-pointer"
                              title="Editar Colaborador"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveUser(u.id)}
                              className="text-slate-400 hover:text-red-600 transition p-1 cursor-pointer"
                              title="Excluir Colaborador"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 2. PRODUTOS TAB */}
            {cadastroSubTab === 'produtos' && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div>
                    <h3 className="font-sans font-bold text-base text-slate-900 font-sans">Cadastro de Produtos Acabados (PA)</h3>
                    <p className="text-xxs text-slate-400 mt-0.5">Base cadastrada para a conferência às cegas e valorização financeira.</p>
                  </div>

                  {/* Search inside Products */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Filtrar por código/nome..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5 pl-7 focus:outline-none"
                    />
                    <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-slate-400" />
                  </div>
                </div>

                {/* Form product */}
                <form onSubmit={handleAddProduct} className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-2">
                    <label className="block text-xxs font-semibold text-slate-600 mb-1">Cód SKU *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 2542"
                      value={newProdCode}
                      onChange={(e) => setNewProdCode(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded p-2 font-mono"
                    />
                  </div>

                  <div className="sm:col-span-6">
                    <label className="block text-xxs font-semibold text-slate-600 mb-1">Descrição Completa *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: SKOL OW 300ML"
                      value={newProdDesc}
                      onChange={(e) => setNewProdDesc(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded p-2"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xxs font-semibold text-slate-600 mb-1">Custo SKU (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="Ex: 53.35"
                      value={newProdCost}
                      onChange={(e) => setNewProdCost(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full text-xs bg-white border border-slate-200 rounded p-2 font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xxs font-semibold text-slate-600 mb-1">Hectolitro do SKU (HL) *</label>
                    <input
                      type="number"
                      step="0.0001"
                      required
                      placeholder="Ex: 0.0350"
                      value={newProdHectoFactor}
                      onChange={(e) => setNewProdHectoFactor(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full text-xs bg-white border border-slate-200 rounded p-2 font-mono"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <button
                      type="submit"
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 px-1 rounded flex items-center justify-center space-x-0.5 text-xs h-9"
                    >
                      <Plus className="h-4 w-4 text-amber-400" />
                      <span>Add</span>
                    </button>
                  </div>
                </form>

                {/* Product Bulk Excel/CSV Import Section */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-200 pb-2">
                    <div className="flex items-center space-x-2">
                      <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Importador em Massa de Produtos (Excel / CSV)</span>
                    </div>
                    <div className="flex items-center space-x-3 text-xxs font-semibold bg-white px-3 py-1 rounded-full border border-slate-200">
                      <span className="text-slate-500 uppercase">Modo de Importação:</span>
                      <label className="flex items-center space-x-1 cursor-pointer">
                        <input
                          type="radio"
                          name="prodImportMode"
                          value="replace"
                          checked={productImportMode === 'replace'}
                          onChange={() => setProductImportMode('replace')}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className={productImportMode === 'replace' ? 'text-red-700 font-bold' : 'text-slate-500'}>Substituir (Apagar Anteriores)</span>
                      </label>
                      <label className="flex items-center space-x-1 cursor-pointer">
                        <input
                          type="radio"
                          name="prodImportMode"
                          value="merge"
                          checked={productImportMode === 'merge'}
                          onChange={() => setProductImportMode('merge')}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className={productImportMode === 'merge' ? 'text-emerald-700 font-bold' : 'text-slate-500'}>Mesclar (Atualizar Existentes)</span>
                      </label>
                      <label className="flex items-center space-x-1 cursor-pointer">
                        <input
                          type="radio"
                          name="prodImportMode"
                          value="add"
                          checked={productImportMode === 'add'}
                          onChange={() => setProductImportMode('add')}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className={productImportMode === 'add' ? 'text-emerald-700 font-bold' : 'text-slate-500'}>Adicionar (Apenas Novos)</span>
                      </label>
                    </div>
                  </div>

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsProductDragOver(true);
                    }}
                    onDragLeave={() => setIsProductDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsProductDragOver(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleProductImport(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => document.getElementById('product-file-input')?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 ${
                      isProductDragOver
                        ? 'border-emerald-500 bg-emerald-50/40'
                        : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <input
                      id="product-file-input"
                      type="file"
                      accept=".csv,.txt"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleProductImport(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                    <UploadCloud className="h-8 w-8 text-slate-400 mx-auto" />
                    <div>
                      <p className="text-xs font-bold text-slate-700">
                        Arraste e solte o arquivo aqui ou <span className="text-emerald-600 underline">procure nos arquivos</span>
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Formatos suportados: CSV delimitado por ponto e vírgula (.csv, .txt)
                      </p>
                    </div>
                    <div className="bg-slate-50 text-slate-500 p-2 rounded border border-slate-200 text-[10px] text-center max-w-xl">
                      <strong>Colunas esperadas no arquivo de importação:</strong> Código (ou SKU), Descrição (ou Nome), Custo SKU e Hectolitro.
                    </div>
                  </div>
                </div>

                {/* Table of Products */}
                <div className="border border-slate-100 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 font-bold text-slate-500 uppercase">Cód SKU</th>
                        <th className="px-4 py-2 font-bold text-slate-500 uppercase">Descrição</th>
                        <th className="px-4 py-2 font-bold text-slate-500 uppercase text-right">Custo SKU</th>
                        <th className="px-4 py-2 font-bold text-slate-500 uppercase text-right">Hectolitro</th>
                        <th className="px-4 py-2 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {products
                        .filter(p => p.description.toLowerCase().includes(searchQuery.toLowerCase()) || p.code.includes(searchQuery))
                        .map(p => (
                          <tr key={p.code} className="hover:bg-slate-50">
                            <td className="px-4 py-2 font-mono font-bold text-slate-600 bg-slate-50/50">{p.code}</td>
                            <td className="px-4 py-2 font-semibold text-slate-800">{p.description}</td>
                            <td className="px-4 py-2 text-right font-mono font-semibold text-slate-900">
                              R$ {p.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-2 text-right font-mono font-semibold text-slate-500">
                              {(p.hectoFactor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 4 })} HL
                            </td>
                            <td className="px-4 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveProduct(p.code)}
                                className="text-slate-400 hover:text-red-600 transition p-1"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. VEICULOS TAB */}
            {cadastroSubTab === 'veiculos' && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="font-sans font-bold text-base text-slate-900">Base de Veículos da Frota</h3>
                  <p className="text-xxs text-slate-400 mt-0.5">Cadastre as placas dos caminhões de entrega com suas respectivas capacidades.</p>
                </div>

                {/* Pending Requests Box */}
                {vehicles.some(v => v.isTemporary) && (
                  <div className="bg-amber-50/40 rounded-xl p-4 border border-amber-200 shadow-sm space-y-3">
                    <div className="flex items-center space-x-2">
                      <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border border-amber-200">Atenção</span>
                      <h4 className="font-sans font-bold text-sm text-slate-800">Solicitações de Cadastro de Veículo ({vehicles.filter(v => v.isTemporary).length})</h4>
                    </div>
                    <p className="text-[11px] text-slate-500">Os conferentes de pátio solicitaram o cadastro temporário dos seguintes veículos durante a pesagem. Insira a capacidade oficial para homologar.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {vehicles.filter(v => v.isTemporary).map(v => (
                        <div key={v.plate} className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between shadow-xs">
                          <div className="space-y-0.5">
                            <span className="font-mono font-bold text-slate-950 block text-sm">{v.plate}</span>
                            <span className="text-[9px] text-amber-600 font-bold uppercase tracking-wider block">⚠️ AGUARDANDO CAPACIDADE</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setNewVehPlate(v.plate);
                              setNewVehCapacity(10); // default suggestion
                            }}
                            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[10px] px-2.5 py-1.5 rounded transition shadow-xs flex items-center space-x-1 cursor-pointer"
                          >
                            <span>Homologar</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Form vehicle */}
                <form onSubmit={handleAddVehicle} className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                  <div className="sm:col-span-5">
                    <label className="block text-xxs font-semibold text-slate-600 mb-1">Placa do Veículo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: XYZ9K12"
                      value={newVehPlate}
                      onChange={(e) => setNewVehPlate(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded p-2 uppercase font-mono"
                    />
                  </div>

                  <div className="sm:col-span-5">
                    <label className="block text-xxs font-semibold text-slate-600 mb-1">Capacidade em Pallets *</label>
                    <input
                      type="number"
                      required
                      placeholder="Ex: 10"
                      value={newVehCapacity}
                      onChange={(e) => setNewVehCapacity(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full text-xs bg-white border border-slate-200 rounded p-2"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 px-3 rounded flex items-center justify-center space-x-1 text-xs"
                    >
                      <Plus className="h-4 w-4 text-amber-400" />
                      <span>Cadastrar</span>
                    </button>
                  </div>
                </form>

                {/* Table of vehicles */}
                <div className="border border-slate-100 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 font-bold text-slate-500 uppercase">Placa</th>
                        <th className="px-4 py-2 font-bold text-slate-500 uppercase">Capacidade Pallets</th>
                        <th className="px-4 py-2 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {vehicles.map(v => (
                        <tr key={v.plate} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono font-bold text-slate-800 flex items-center">
                            <span>{v.plate}</span>
                            {v.isTemporary && (
                              <span className="ml-2 text-[8px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded shadow-xxs">
                                ⚠️ Solicitação Pendente
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-600">
                            {v.isTemporary ? (
                              <span className="text-amber-600 italic">Capacidade pendente</span>
                            ) : (
                              `${v.capacityPallets} pallets`
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveVehicle(v.plate)}
                              className="text-slate-400 hover:text-red-600 transition p-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. MOTORISTAS TAB */}
            {cadastroSubTab === 'motoristas' && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div>
                    <h3 className="font-sans font-bold text-base text-slate-900">Cadastro de Motoristas e Ajudantes</h3>
                    <p className="text-xxs text-slate-400 mt-0.5">Base de prestadores de conta responsáveis pelos retornos de rota.</p>
                  </div>

                  {/* Search drivers */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Filtrar por nome/CPF..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5 pl-7 focus:outline-none"
                    />
                    <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-slate-400" />
                  </div>
                </div>

                {/* Pending Requests Box */}
                {drivers.some(d => d.isTemporary) && (
                  <div className="bg-amber-50/40 rounded-xl p-4 border border-amber-200 shadow-sm space-y-3">
                    <div className="flex items-center space-x-2">
                      <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border border-amber-200">Atenção</span>
                      <h4 className="font-sans font-bold text-sm text-slate-800">Solicitações de Cadastro de Colaborador ({drivers.filter(d => d.isTemporary).length})</h4>
                    </div>
                    <p className="text-[11px] text-slate-500">Os conferentes de pátio inseriram colaboradores temporários que não estavam cadastrados na base. Insira a matrícula e CPF oficiais para homologar os registros.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {drivers.filter(d => d.isTemporary).map(d => (
                        <div key={d.id} className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col justify-between gap-2 shadow-xs">
                          <div>
                            <span className="font-sans font-bold text-slate-950 block text-sm truncate" title={d.name}>{d.name}</span>
                            <span className="text-[9px] text-amber-600 font-bold uppercase tracking-wider block">⚠️ {d.role} PENDENTE</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setNewDrvId('');
                              setNewDrvName(d.name);
                              setNewDrvRole(d.role);
                              setNewDrvCpf('');
                              setEditingTempDriverId(d.id);
                            }}
                            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[10px] px-2.5 py-1.5 rounded transition shadow-xs self-start cursor-pointer"
                          >
                            <span>Preencher e Homologar</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Form helper */}
                <form onSubmit={handleAddDriver} className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-2">
                    <label className="block text-xxs font-semibold text-slate-600 mb-1">
                      Matrícula (Ex: G1170) * {editingTempDriverId && <span className="text-amber-600 font-bold">(Promovendo...)</span>}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="GXXXX"
                      value={newDrvId}
                      onChange={(e) => setNewDrvId(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded p-2 font-mono uppercase"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-xxs font-semibold text-slate-600 mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: JOSÉ ALENCAR"
                      value={newDrvName}
                      onChange={(e) => setNewDrvName(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded p-2 uppercase"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xxs font-semibold text-slate-600 mb-1">Função *</label>
                    <select
                      value={newDrvRole}
                      onChange={(e) => setNewDrvRole(e.target.value as any)}
                      className="w-full text-xs bg-white border border-slate-200 rounded p-2"
                    >
                      <option value="MOTORISTA">Motorista</option>
                      <option value="AJUDANTE">Ajudante</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xxs font-semibold text-slate-600 mb-1">CPF *</label>
                    <input
                      type="text"
                      required
                      placeholder="000.000.000-00"
                      value={newDrvCpf}
                      onChange={(e) => setNewDrvCpf(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded p-2 font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 px-2 rounded flex items-center justify-center space-x-1 text-xs"
                    >
                      <Plus className="h-4 w-4 text-amber-400" />
                      <span>{editingTempDriverId ? 'Homologar' : 'Adicionar'}</span>
                    </button>
                  </div>
                </form>

                {/* Table of drivers/helpers */}
                <div className="border border-slate-100 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 font-bold text-slate-500 uppercase">Matrícula</th>
                        <th className="px-4 py-2 font-bold text-slate-500 uppercase">Nome</th>
                        <th className="px-4 py-2 font-bold text-slate-500 uppercase">Função</th>
                        <th className="px-4 py-2 font-bold text-slate-500 uppercase">CPF</th>
                        <th className="px-4 py-2 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {drivers
                        .filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.cpf.includes(searchQuery) || d.id.includes(searchQuery))
                        .map(d => (
                          <tr key={d.id} className="hover:bg-slate-50">
                            <td className="px-4 py-2 font-mono font-bold text-slate-600 bg-slate-50/50 flex items-center">
                              <span>{d.id}</span>
                              {d.isTemporary && (
                                <span className="ml-2 text-[8px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded shadow-xxs">
                                  ⚠️ Solicitação
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2 font-semibold text-slate-800">{d.name}</td>
                            <td className="px-4 py-2 text-xxs text-slate-500 font-semibold">{d.role}</td>
                            <td className="px-4 py-2 font-mono text-slate-500">{d.cpf}</td>
                            <td className="px-4 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveDriver(d.id)}
                                className="text-slate-400 hover:text-red-600 transition p-1"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 5. MANUTENÇÃO TAB */}
            {cadastroSubTab === 'manutencao' && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="font-sans font-bold text-base text-slate-900">Manutenção do Sistema</h3>
                  <p className="text-xxs text-slate-400 mt-0.5">Procedimentos de exportação e reinicialização de transações locais.</p>
                </div>

                <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 space-y-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h4 className="font-sans font-bold text-sm text-slate-900 flex items-center space-x-2">
                        <HardDrive className="h-4 w-4 text-amber-500" />
                        <span>Manutenção de Ciclo Anual & Limpeza de Memória</span>
                      </h4>
                      <p className="text-xxs text-slate-500 mt-1">
                        Exporte o backup anual consolidado das conferências e rotas para liberar a memória local do navegador (prevenindo problemas de armazenamento e desempenho futuramente).
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handleExportAnnualBackup}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 px-4 rounded-lg flex items-center space-x-2 transition shadow-3xs cursor-pointer font-sans"
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        <span>Exportar Backup Anual (.json)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowResetModal(true)}
                        className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-2.5 px-4 rounded-lg flex items-center space-x-2 transition shadow-3xs cursor-pointer font-sans"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Resetar Base de Dados</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* RESET CONFIRM MODAL */}
                {showResetModal && (
                  <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-5 border border-slate-200 shadow-xl">
                      <div className="text-center space-y-2">
                        <div className="mx-auto bg-red-100 text-red-700 p-3 rounded-full w-12 h-12 flex items-center justify-center">
                          <AlertTriangle className="h-6 w-6 animate-pulse" />
                        </div>
                        <h3 className="font-sans font-bold text-lg text-slate-900">Atenção: Ação Irreversível</h3>
                        <p className="text-xs text-slate-500">
                          Você está prestes a resetar e apagar permanentemente todas as auditorias físicas, rotas importadas e evidências fotográficas locais.
                        </p>
                      </div>

                      <div className="bg-red-50 text-red-950 p-3 rounded-lg text-xxs leading-relaxed border border-red-100">
                        <strong>Importante:</strong> Certifique-se de ter feito o download do arquivo de <b>Backup Anual</b> clicando no botão verde antes de prosseguir. Sem o backup, estes dados não poderão ser recuperados!
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xxs font-bold text-slate-600 uppercase">Para confirmar, digite <b>RESETAR</b> abaixo:</label>
                        <input
                          type="text"
                          placeholder="RESETAR"
                          value={resetConfirmWord}
                          onChange={e => setResetConfirmWord(e.target.value)}
                          className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none uppercase font-mono tracking-widest text-center"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xxs font-bold text-slate-600 uppercase text-red-600 font-sans">Senha de Segurança (Obrigatória):</label>
                        <input
                          type="password"
                          placeholder="Digite a senha"
                          value={resetPassword}
                          onChange={e => setResetPassword(e.target.value)}
                          className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none text-center"
                        />
                      </div>

                      <div className="flex space-x-3">
                        <button
                          type="button"
                          onClick={() => {
                            setShowResetModal(false);
                            setResetConfirmWord('');
                            setResetPassword('');
                          }}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2.5 rounded-lg transition"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleResetDatabaseWipe}
                          disabled={resetConfirmWord !== 'RESETAR' || resetPassword !== '!Bud0102'}
                          className={`flex-1 text-white text-xs font-bold py-2.5 rounded-lg transition ${
                            (resetConfirmWord === 'RESETAR' && resetPassword === '!Bud0102') ? 'bg-red-600 hover:bg-red-700 cursor-pointer' : 'bg-slate-300 cursor-not-allowed'
                          }`}
                        >
                          Confirmar e Apagar Base
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: SOBRAS E FALTAS (VISÃO MASTER) */}
      {gestorTab === 'sobras_faltas' && (
        <div className="space-y-6 animate-fade-in" id="gestor_sobras_faltas">
                <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-2">
                  <h3 className="font-sans font-bold text-lg text-slate-900 flex items-center space-x-2">
                    <FileCheck className="h-5.5 w-5.5 text-amber-500" />
                    <span>Controle Master de Sobras & Faltas</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Gerenciamento estratégico de desvios físicos pós-reconciliação. Sobras devem retornar em rota em até <strong>30 dias</strong> (prazo legal). Faltas geram vales aos motoristas e devem ser dadas baixas após compensação.
                  </p>
                </div>

                {/* SEÇÃO INTEGRADA: MONITORAMENTO DE AÇÕES DO AUXILIAR DE SOBRAS & VALES GERADOS (MOVIDO PARA O TOPO) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* PANEL 1: AÇÕES REALIZADAS PELO AUXILIAR DE ENVIO DE SOBRAS */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm">
                    <div className="border-b border-slate-100 pb-2 flex items-center space-x-2">
                      <Truck className="h-5 w-5 text-emerald-600" />
                      <h4 className="font-sans font-bold text-sm text-slate-900 uppercase">Ações do Auxiliar de Envio de Sobras</h4>
                    </div>
                    <p className="text-xxs text-slate-500">
                      Rastreamento em tempo real dos envios, alinhamentos e baixas de sobras físicas de P.A. e A.G. realizados pelo auxiliar de expedição.
                    </p>

                    {(() => {
                      // Get all audits that have been sent or have history actions by 'auxiliar_logistica'
                      const auxiliarActions = audits.filter(audit => {
                        const hasAuxiliarHistory = audit.history.some(h => h.user.includes('Auxiliar') || h.user.toLowerCase().includes('auxiliar'));
                        const isSent = audit.surplusFlowStatus === 'ENVIADO';
                        return hasAuxiliarHistory || isSent;
                      });

                      if (auxiliarActions.length === 0) {
                        return (
                          <div className="text-center py-12 text-slate-400 text-xs italic bg-slate-50 rounded-lg">
                            Nenhuma ação realizada pelo auxiliar registrada até o momento.
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3.5 max-h-[450px] overflow-y-auto pr-1">
                          {auxiliarActions.map(audit => {
                            const lastAction = audit.history[audit.history.length - 1];
                            return (
                              <div key={audit.id} className="bg-slate-50 p-3 rounded-lg border border-slate-150 space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-bold text-slate-900">Mapa {audit.routeMap}</span>
                                    <span className="font-mono text-xxs text-slate-500 bg-white border border-slate-200 px-1 py-0.5 rounded">{audit.plate}</span>
                                  </div>
                                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                    audit.surplusFlowStatus === 'ENVIADO' 
                                      ? 'bg-emerald-100 text-emerald-800' 
                                      : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {audit.surplusFlowStatus}
                                  </span>
                                </div>

                                <div className="text-xxs text-slate-600 bg-white p-2 rounded border border-slate-100 space-y-1">
                                  <div><strong>Última Atividade:</strong> {lastAction ? lastAction.action : 'Sem registro'}</div>
                                  <div><strong>Responsável:</strong> {lastAction ? lastAction.user : 'N/A'}</div>
                                  {audit.reconciliationNotes && (
                                    <div className="text-[10px] text-amber-900 bg-amber-50/50 p-1.5 rounded mt-1 border border-amber-100 font-sans">
                                      <strong>Obs Auxiliar:</strong> {audit.reconciliationNotes}
                                    </div>
                                  )}
                                  {audit.clientCodeNB && (
                                    <div className="text-[10px] mt-1 text-slate-700 font-sans">
                                      <strong>Código NB:</strong> <span className="font-mono font-bold bg-slate-100 px-1 py-0.2 rounded text-slate-800">{audit.clientCodeNB}</span>
                                      {audit.deliveryDate && <span className="ml-2">| <strong>Previsão:</strong> {new Date(audit.deliveryDate + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  {/* PANEL 2: CONTROLE DE VALES FINANCEIROS GERADOS */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm">
                    <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-red-500 animate-pulse" />
                        <h4 className="font-sans font-bold text-sm text-slate-900 uppercase">Vales de Desconto Gerados</h4>
                      </div>
                      <span className="text-xxs bg-red-100 text-red-800 px-2 py-0.5 rounded font-black font-mono">
                        Pendente: R$ {vales.filter(v => v.status === 'PENDENTE_ASSINATURA').reduce((s, v) => s + v.valor, 0).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xxs text-slate-500">
                      Vales financeiros vinculados a prestadores de contas decorrentes de faltas operacionais em auditoria física.
                    </p>

                    {vales.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-xs italic bg-slate-50 rounded-lg">
                        Nenhum vale emitido até o momento.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                        {/* Hidden File Input for uploading signed PDF or image */}
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="application/pdf,image/*"
                          className="hidden"
                          id="gestor_vale_file_input"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file || !selectedValeIdForUpload) return;

                            const reader = new FileReader();
                            reader.onload = () => {
                              const dataUrl = reader.result as string;
                              const updated = vales.map(v => 
                                v.id === selectedValeIdForUpload 
                                  ? { ...v, status: 'ASSINADO' as const, signedPdfUrl: dataUrl, signedPdfName: file.name } 
                                  : v
                              );
                              onSaveVales(updated);
                              setSelectedValeIdForUpload(null);
                              alert(`Vale assinado com sucesso! O arquivo "${file.name}" foi anexado.`);
                            };
                            reader.readAsDataURL(file);
                          }}
                        />

                        {vales.map((vale) => (
                          <div key={vale.id} className="bg-slate-50 p-3 rounded-lg border border-slate-150 space-y-2 hover:border-slate-300 transition">
                            <div className="flex justify-between items-start text-xs">
                              <div>
                                <span className="font-bold text-slate-900 block">{vale.colaboradorName}</span>
                                <span className="text-[9px] text-slate-400 font-mono uppercase block">{vale.colaboradorRole}</span>
                              </div>
                              <span className="font-mono font-bold text-red-600 bg-white border border-slate-200 px-2 py-0.5 rounded text-xxs">
                                R$ {vale.valor.toFixed(2)}
                              </span>
                            </div>

                            <p className="text-[10px] text-slate-600 leading-tight font-sans">
                              <strong>Motivo:</strong> {vale.descricao}
                            </p>

                            <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xxs">
                              <span className={`inline-block px-2 py-0.5 text-[8px] font-black uppercase rounded-full ${
                                vale.status === 'COMPENSADO'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : vale.status === 'ASSINADO'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800 animate-pulse'
                              }`}>
                                {vale.status === 'PENDENTE_ASSINATURA' ? 'Pendente Assinatura' : vale.status === 'ASSINADO' ? 'Termo Assinado' : 'Compensado'}
                              </span>

                              <div className="flex items-center gap-1.5">
                                {vale.status === 'PENDENTE_ASSINATURA' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedValeIdForUpload(vale.id);
                                      setTimeout(() => {
                                        fileInputRef.current?.click();
                                      }, 50);
                                    }}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-2 py-0.5 rounded text-[9px] transition cursor-pointer"
                                    title="Selecionar e enviar termo assinado (PDF ou Imagem)"
                                  >
                                    Assinar Termo
                                  </button>
                                )}

                                {/* O gestor pode faturar e compensar qualquer vale ativo (pendente ou assinado) */}
                                {(vale.status === 'ASSINADO' || vale.status === 'PENDENTE_ASSINATURA') && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      requestConfirm(
                                        'Confirmar Compensação',
                                        `Tem certeza de que deseja faturar e marcar este vale no valor de R$ ${vale.valor.toFixed(2)} para ${vale.colaboradorName} como COMPENSADO?`,
                                        () => {
                                          const updated = vales.map(v => v.id === vale.id ? { ...v, status: 'COMPENSADO' as const } : v);
                                          onSaveVales(updated);
                                        }
                                      );
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-0.5 rounded text-[9px] transition cursor-pointer"
                                    title="Faturar e marcar como compensado no faturamento mensal"
                                  >
                                    Compensar
                                  </button>
                                )}

                                {/* Download do termo anexado */}
                                {(vale.status === 'ASSINADO' || vale.status === 'COMPENSADO') && vale.signedPdfUrl && (
                                  <a
                                    href={vale.signedPdfUrl}
                                    download={vale.signedPdfName || `vale_assinado_${vale.id}.pdf`}
                                    className="p-1 text-emerald-600 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded cursor-pointer transition flex items-center justify-center"
                                    title={`Baixar anexo: ${vale.signedPdfName || 'PDF'}`}
                                  >
                                    <FileText className="h-3.5 w-3.5" />
                                  </a>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    requestConfirm(
                                      'Excluir Vale',
                                      'Deseja realmente excluir este vale de desconto do sistema?',
                                      () => {
                                        const updated = vales.filter(v => v.id !== vale.id);
                                        onSaveVales(updated);
                                      }
                                    );
                                  }}
                                  className="text-red-500 hover:text-red-700 font-bold px-1 py-0.5 hover:bg-red-50 rounded text-[9px] cursor-pointer"
                                >
                                  Excluir
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  
                  {/* LEFT PANEL: SOBRAS (SURPLUS) */}
                  <div className="bg-amber-50/15 border border-amber-200/80 rounded-xl p-5 space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-amber-200/50">
                      <div className="flex items-center space-x-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                        <h4 className="font-sans font-bold text-sm text-amber-900 uppercase tracking-wider">Painel de Sobras (Foco Clientes)</h4>
                      </div>
                      <span className="text-[10px] bg-amber-100/80 text-amber-800 px-2.5 py-1 rounded font-bold uppercase">
                        30 Dias Limite
                      </span>
                    </div>

                    {(() => {
                      // Filter audits with surplus (at least one item physical > fiscal) and within the last 30 days (or anytime if not yet sent)
                      const surplusAudits = audits.filter(audit => {
                        if (audit.status !== 'finalizado_ok' && audit.status !== 'finalizado_divergente') return false;
                        
                        const arrivalDateObj = new Date(audit.arrivalDate + 'T00:00:00');
                        const daysElapsed = Math.floor((new Date().getTime() - arrivalDateObj.getTime()) / (1000 * 60 * 60 * 24));
                        const isSent = audit.surplusFlowStatus === 'ENVIADO' || audit.surplusActionStatus === 'enviado_cliente';
                        
                        // If it is already sent and older than 30 days, we can hide it to avoid clutter
                        if (isSent && daysElapsed > 30) return false;

                        const hasProductSurplus = audit.items.some(item => {
                          const phys = item.rePhysicalQty !== undefined ? item.rePhysicalQty : item.physicalQty;
                          return phys > (item.fiscalQty ?? 0);
                        });

                        const hasAssetSurplus = audit.assets.some(asset => {
                          const phys = asset.rePhysicalQty !== undefined ? asset.rePhysicalQty : asset.physicalQty;
                          return phys > (asset.fiscalQty ?? 0);
                        });

                        return hasProductSurplus || hasAssetSurplus;
                      });

                      if (surplusAudits.length === 0) {
                        return (
                          <div className="bg-white p-8 rounded-lg border border-amber-100 text-center text-slate-400 text-xs italic">
                            Nenhuma sobra física detectada nas auditorias finalizadas.
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          {surplusAudits.map(audit => {
                            // Calculate days elapsed since arrival to check 30-day rule
                            const arrivalDateObj = new Date(audit.arrivalDate + 'T00:00:00');
                            const daysElapsed = Math.floor((new Date().getTime() - arrivalDateObj.getTime()) / (1000 * 60 * 60 * 24));
                            const remainingDays = Math.max(0, 30 - daysElapsed);
                            
                            // Determine status completely online
                            let calculatedStatus: 'prazo_envio_ok' | 'fora_do_prazo' | 'enviado_cliente';
                            if (audit.surplusFlowStatus === 'ENVIADO' || audit.surplusActionStatus === 'enviado_cliente') {
                              calculatedStatus = 'enviado_cliente';
                            } else if (daysElapsed > 30) {
                              calculatedStatus = 'fora_do_prazo';
                            } else {
                              calculatedStatus = 'prazo_envio_ok';
                            }

                            // Match driver name
                            const driverName = drivers.find(d => d.id === audit.driverId)?.name || audit.driverId;
                            const helperName = audit.helperId ? (drivers.find(d => d.id === audit.helperId)?.name || audit.helperId) : 'N/A';

                            // List surplus details
                            const surplusProducts = audit.items.filter(i => {
                              const phys = i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty;
                              return phys > (i.fiscalQty ?? 0);
                            });
                            const surplusAssets = audit.assets.filter(a => {
                              const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
                              return phys > (a.fiscalQty ?? 0);
                            });

                            return (
                              <div key={audit.id} className="bg-white p-4 rounded-xl border border-amber-100 shadow-2xs space-y-3.5 hover:border-amber-400 transition-colors">
                                <div className="flex justify-between items-start gap-2">
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <span className="font-sans font-extrabold text-sm text-slate-900 bg-amber-500/10 px-2 py-0.5 rounded">Mapa {audit.routeMap}</span>
                                      <span className="font-mono text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{audit.plate}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1 font-sans">
                                      Motorista: <strong>{driverName}</strong> • Ajudante: <strong>{helperName}</strong>
                                    </p>
                                  </div>

                                  <div className="text-right">
                                    {calculatedStatus === 'enviado_cliente' ? (
                                      <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-1 rounded shadow-3xs uppercase">Enviado ao Cliente</span>
                                    ) : calculatedStatus === 'fora_do_prazo' ? (
                                      <span className="text-[9px] bg-red-100 text-red-800 font-bold px-2 py-1 rounded shadow-3xs uppercase">FORA DO PRAZO ({daysElapsed}d)</span>
                                    ) : (
                                      <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-2 py-1 rounded shadow-3xs uppercase">Prazo OK ({remainingDays} dias restam)</span>
                                    )}
                                  </div>
                                </div>

                                {/* Items & Durations */}
                                <div className="bg-slate-50/50 p-2.5 rounded border border-slate-100 space-y-2">
                                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                                    <span>Início: {audit.startTime ? new Date(audit.startTime).toLocaleTimeString() : 'N/A'}</span>
                                    <span>Fim: {audit.endTime ? new Date(audit.endTime).toLocaleTimeString() : 'N/A'}</span>
                                  </div>

                                  <div className="space-y-1">
                                    {surplusProducts.map(i => {
                                      const diff = (i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty) - (i.fiscalQty ?? 0);
                                      return (
                                        <div key={i.productCode} className="flex justify-between text-xs text-amber-950 font-medium">
                                          <span>{i.productDescription}</span>
                                          <span className="font-bold font-mono">+{diff} cx (Sobra)</span>
                                        </div>
                                      );
                                    })}
                                    {surplusAssets.map(a => {
                                      const diff = (a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty) - (a.fiscalQty ?? 0);
                                      return (
                                        <div key={a.assetId} className="flex justify-between text-xs text-blue-900 font-medium">
                                          <span>{a.assetName}</span>
                                          <span className="font-bold font-mono">+{diff} un (Ativo)</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Actions & Inputs */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2.5 border-t border-slate-100">
                                  <div>
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Status de Ação</label>
                                    <select
                                      value={calculatedStatus}
                                      onChange={e => handleUpdateAuditDiscrepancyAction(audit.id, { surplusActionStatus: e.target.value as any })}
                                      className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded focus:outline-none"
                                    >
                                      <option value="prazo_envio_ok">Prazo Envio OK</option>
                                      <option value="fora_do_prazo">Fora do Prazo</option>
                                      <option value="enviado_cliente">Enviado ao Cliente</option>
                                    </select>
                                  </div>

                                  <div className="flex flex-col justify-end">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Ação Corretiva / Observação</label>
                                    <div className="flex space-x-1.5">
                                      <input
                                        type="text"
                                        placeholder="Ex: Reenviado na rota 302..."
                                        defaultValue={audit.correctiveActionNotes || ''}
                                        onBlur={e => {
                                          const val = e.target.value;
                                          setCorrectiveNotesMap(prev => ({ ...prev, [audit.id]: val }));
                                        }}
                                        className="flex-1 text-xs p-1 bg-white border border-slate-200 rounded focus:outline-none"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const notes = correctiveNotesMap[audit.id] || audit.correctiveActionNotes || '';
                                          handleUpdateAuditDiscrepancyAction(audit.id, { correctiveActionNotes: notes });
                                        }}
                                        className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] px-2.5 rounded font-sans font-bold cursor-pointer"
                                      >
                                        Salvar
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  {/* RIGHT PANEL: FALTAS (DEFICITS) */}
                  <div className="bg-red-50/15 border border-red-200/80 rounded-xl p-5 space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-red-200/50">
                      <div className="flex items-center space-x-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-600 animate-pulse" />
                        <h4 className="font-sans font-bold text-sm text-red-900 uppercase tracking-wider">Painel de Faltas (Vales & Descontos)</h4>
                      </div>
                      <span className="text-[10px] bg-red-100/80 text-red-800 px-2.5 py-1 rounded font-bold uppercase">
                        Cobrança & Baixa
                      </span>
                    </div>

                    {(() => {
                      // Filter audits with deficit (at least one item physical < fiscal) and within the last 30 days
                      const deficitAudits = audits.filter(audit => {
                        if (audit.status !== 'finalizado_ok' && audit.status !== 'finalizado_divergente') return false;
                        
                        // Last 30 days constraint
                        const arrivalDateObj = new Date(audit.arrivalDate + 'T00:00:00');
                        const daysElapsed = Math.floor((new Date().getTime() - arrivalDateObj.getTime()) / (1000 * 60 * 60 * 24));
                        if (daysElapsed > 30) return false;

                        const hasProductDeficit = audit.items.some(item => {
                          const phys = item.rePhysicalQty !== undefined ? item.rePhysicalQty : item.physicalQty;
                          return phys < (item.fiscalQty ?? 0);
                        });

                        const hasAssetDeficit = audit.assets.some(asset => {
                          const phys = asset.rePhysicalQty !== undefined ? asset.rePhysicalQty : asset.physicalQty;
                          return phys < (asset.fiscalQty ?? 0);
                        });

                        return hasProductDeficit || hasAssetDeficit;
                      });

                      if (deficitAudits.length === 0) {
                        return (
                          <div className="bg-white p-8 rounded-lg border border-red-100 text-center text-slate-400 text-xs italic">
                            Nenhuma falta física detectada nas auditorias finalizadas.
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          {deficitAudits.map(audit => {
                            const calculatedDeficitStatus = audit.deficitActionStatus || 'pendente_baixa';
                            const driverName = drivers.find(d => d.id === audit.driverId)?.name || audit.driverId;
                            const helperName = audit.helperId ? (drivers.find(d => d.id === audit.helperId)?.name || audit.helperId) : 'N/A';

                            // List missing details
                            const missingProducts = audit.items.filter(i => {
                              const phys = i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty;
                              return phys < (i.fiscalQty ?? 0);
                            });
                            const missingAssets = audit.assets.filter(a => {
                              const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
                              return phys < (a.fiscalQty ?? 0);
                            });

                            // Calculate financial damage
                            let auditLoss = 0;
                            missingProducts.forEach(i => {
                              const diff = (i.fiscalQty ?? 0) - (i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty);
                              auditLoss += diff * i.cost;
                            });
                            missingAssets.forEach(a => {
                              const diff = (a.fiscalQty ?? 0) - (a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty);
                              auditLoss += diff * a.cost;
                            });

                            return (
                              <div key={audit.id} className="bg-white p-4 rounded-xl border border-red-100 shadow-2xs space-y-3.5 hover:border-red-400 transition-colors">
                                <div className="flex justify-between items-start gap-2">
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <span className="font-sans font-extrabold text-sm text-slate-900 bg-red-600/10 px-2 py-0.5 rounded">Mapa {audit.routeMap}</span>
                                      <span className="font-mono text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{audit.plate}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1 font-sans">
                                      Responsável Conta: <strong className="text-red-950 font-bold">{driverName}</strong> • Ajudante: <strong>{helperName}</strong>
                                    </p>
                                  </div>

                                  <div className="text-right">
                                    {calculatedDeficitStatus === 'baixado' ? (
                                      <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded shadow-3xs uppercase">Baixado / Compensado</span>
                                    ) : (
                                      <span className="text-[9px] bg-red-100 text-red-800 font-bold px-2.5 py-1 rounded shadow-3xs uppercase animate-pulse">Pendente de Baixa</span>
                                    )}
                                  </div>
                                </div>

                                {/* Items & Cost damage */}
                                <div className="bg-red-50/20 p-2.5 rounded border border-red-100/50 space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[9px] text-slate-400 font-mono">Duração: {audit.startTime && audit.endTime ? `${Math.floor((new Date(audit.endTime).getTime() - new Date(audit.startTime).getTime()) / 60000)} min` : 'N/A'}</span>
                                    <span className="text-[10px] font-bold text-red-700 bg-red-100/60 px-1.5 py-0.5 rounded font-mono">Dano: R$ {auditLoss.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                  </div>

                                  <div className="space-y-1">
                                    {missingProducts.map(i => {
                                      const diff = (i.fiscalQty ?? 0) - (i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty);
                                      return (
                                        <div key={i.productCode} className="flex justify-between text-xs text-red-950 font-semibold">
                                          <span>{i.productDescription}</span>
                                          <span className="font-bold font-mono">-{diff} cx (Falta)</span>
                                        </div>
                                      );
                                    })}
                                    {missingAssets.map(a => {
                                      const diff = (a.fiscalQty ?? 0) - (a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty);
                                      return (
                                        <div key={a.assetId} className="flex justify-between text-xs text-red-900 font-semibold">
                                          <span>{a.assetName}</span>
                                          <span className="font-bold font-mono">-{diff} un (Ativo)</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Actions & Observations */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2.5 border-t border-slate-100">
                                  <div>
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Status da Baixa</label>
                                    <select
                                      value={calculatedDeficitStatus}
                                      onChange={e => handleUpdateAuditDiscrepancyAction(audit.id, { deficitActionStatus: e.target.value as any })}
                                      className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded focus:outline-none"
                                    >
                                      <option value="pendente_baixa">Pendente Baixa</option>
                                      <option value="baixado">Baixado / Resolvido</option>
                                    </select>
                                  </div>

                                  <div className="flex flex-col justify-end">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Ação Corretiva (Ex: Vale gerado)</label>
                                    <div className="flex space-x-1.5">
                                      <input
                                        type="text"
                                        placeholder="Ex: Vale-Desconto nº 502 assinado..."
                                        defaultValue={audit.correctiveActionNotes || ''}
                                        onBlur={e => {
                                          const val = e.target.value;
                                          setCorrectiveNotesMap(prev => ({ ...prev, [audit.id]: val }));
                                        }}
                                        className="flex-1 text-xs p-1 bg-white border border-slate-200 rounded focus:outline-none"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const notes = correctiveNotesMap[audit.id] || audit.correctiveActionNotes || '';
                                          handleUpdateAuditDiscrepancyAction(audit.id, { correctiveActionNotes: notes });
                                        }}
                                        className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] px-2.5 rounded font-sans font-bold cursor-pointer"
                                      >
                                        Salvar
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>


              </div>
            )}

      {/* TAB: MONITORAMENTO DE MAPAS DIÁRIOS & DASHBOARD */}
      {gestorTab === 'map_tracking' && (
        <div className="space-y-6 animate-fade-in" id="gestor_map_tracking">
                
                {/* Dashboard summary stats for maps */}
                {(() => {
                  const uniqueDates = Array.from(new Set(importedRoutes.map(r => r.routeDate))).sort();
                  const selectedDateRoutes = importedRoutes.filter(r => r.routeDate === importDateFilter);
                  
                  const totalCount = selectedDateRoutes.length;
                  const closedCount = selectedDateRoutes.filter(r => r.status === 'fechado').length;
                  const openCount = totalCount - closedCount;
                  const pctClosed = totalCount > 0 ? (closedCount / totalCount) * 100 : 0;

                  return (
                    <div className="space-y-6">
                      
                      {/* Date selection bar */}
                      <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center space-x-3">
                          <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
                          <div>
                            <h3 className="font-sans font-bold text-slate-900 text-sm uppercase">Sincronizador de Liberação Diária</h3>
                            <p className="text-xxs text-slate-400">Gerenciamento e conciliação de rotas importadas por data específica.</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <label className="text-xxs font-bold text-slate-500 uppercase">Filtrar Data:</label>
                          <select
                            value={importDateFilter}
                            onChange={e => setImportDateFilter(e.target.value)}
                            className="text-xs p-2 bg-white border border-slate-200 rounded font-sans focus:outline-none"
                          >
                            {uniqueDates.length === 0 ? (
                              <option value={new Date().toISOString().split('T')[0]}>Sem rotas importadas</option>
                            ) : (
                              uniqueDates.map(d => (
                                <option key={d} value={d}>
                                  {new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')}
                                </option>
                              ))
                            )}
                          </select>
                        </div>
                      </div>

                      {/* Map Dashboard Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        <div className="bg-white p-5 rounded-xl border border-slate-200 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total de Mapas Importados</span>
                            <span className="text-3xl font-bold font-sans text-slate-900 mt-1 block">{totalCount}</span>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded-lg text-slate-600">
                            <FileSpreadsheet className="h-5 w-5" />
                          </div>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-slate-200 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mapas em Aberto / Pendentes</span>
                            <span className="text-3xl font-bold font-sans text-amber-600 mt-1 block">{openCount}</span>
                          </div>
                          <div className="bg-amber-50 p-2.5 rounded-lg text-amber-600">
                            <Clock className="h-5 w-5" />
                          </div>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-slate-200 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mapas Fechados / Baixados</span>
                            <span className="text-3xl font-bold font-sans text-emerald-600 mt-1 block">{closedCount}</span>
                          </div>
                          <div className="bg-emerald-50 p-2.5 rounded-lg text-emerald-600">
                            <CheckCircle2 className="h-5 w-5" />
                          </div>
                        </div>

                      </div>

                      {/* Map Status list */}
                      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                          <h4 className="font-sans font-bold text-sm text-slate-900 uppercase">Detalhamento dos Mapas da Rota</h4>
                          <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded">
                            {pctClosed.toFixed(0)}% Concluído
                          </span>
                        </div>

                        {selectedDateRoutes.length === 0 ? (
                          <p className="text-xs text-slate-400 italic py-12 text-center">Nenhum mapa importado para a data selecionada.</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {selectedDateRoutes.map(route => {
                              const isClosed = route.status === 'fechado';
                              const isAuditing = route.status === 'conferindo';

                              return (
                                <div key={route.id} className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 shadow-3xs transition-all ${
                                  isClosed 
                                    ? 'bg-emerald-50/10 border-emerald-200' 
                                    : isAuditing 
                                      ? 'bg-amber-50/10 border-amber-300 animate-pulse' 
                                      : 'bg-white border-slate-200'
                                }`}>
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <span className="text-[9px] text-slate-400 block uppercase font-mono">Código do Mapa</span>
                                      <span className="font-sans font-bold text-base text-slate-950 block">{route.routeMap}</span>
                                    </div>

                                    <div>
                                      {isClosed ? (
                                        <span className="text-[8px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded shadow-3xs uppercase">Fechado</span>
                                      ) : isAuditing ? (
                                        <span className="text-[8px] bg-amber-100 text-amber-800 font-extrabold px-2 py-0.5 rounded shadow-3xs uppercase">Conferindo</span>
                                      ) : (
                                        <span className="text-[8px] bg-slate-100 text-slate-600 font-extrabold px-2 py-0.5 rounded shadow-3xs uppercase">Pendente</span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="pt-2 border-t border-slate-100/60 flex justify-between items-center text-xs">
                                    <div>
                                      <span className="text-[9px] text-slate-400 block font-sans">Veículo</span>
                                      <span className="font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{route.plate}</span>
                                    </div>
                                    
                                    {!isClosed && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          requestConfirm(
                                            "Forçar Fechamento",
                                            `Deseja forçar a baixa e o fechamento do mapa ${route.routeMap}?`,
                                            () => {
                                              const updatedRoutes = importedRoutes.map(r => {
                                                if (r.id === route.id) {
                                                  return { ...r, status: 'fechado' as const };
                                                }
                                                return r;
                                              });
                                              onSaveImportedRoutes(updatedRoutes);
                                              alert(`Mapa ${route.routeMap} fechado com sucesso.`);
                                            }
                                          );
                                        }}
                                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[9px] px-2.5 py-1.5 rounded cursor-pointer transition shadow-3xs uppercase font-sans"
                                      >
                                        Dar Baixa / Fechar
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Map Status Closure History Log */}
                      <div className="bg-slate-900 text-slate-300 rounded-xl p-5 border border-slate-800 space-y-4">
                        <div className="border-b border-slate-800 pb-2 flex justify-between items-center">
                          <h4 className="font-sans font-bold text-xs text-amber-400 uppercase tracking-widest flex items-center space-x-2">
                            <Clock className="h-4 w-4" />
                            <span>Histórico de Registro e Baixas de Mapas (Log de Trânsito)</span>
                          </h4>
                          <span className="text-[9px] text-slate-500 font-mono">Seguro</span>
                        </div>

                        <div className="space-y-2.5 max-h-56 overflow-y-auto pr-2 text-xs font-mono">
                          {importedRoutes.filter(r => r.status === 'fechado').length === 0 ? (
                            <p className="text-[10px] text-slate-500 italic">Sem registros de baixa gravados no histórico fiscal.</p>
                          ) : (
                            importedRoutes.filter(r => r.status === 'fechado').map((r, idx) => (
                              <div key={r.id + idx} className="flex justify-between items-start gap-3 py-1.5 border-b border-slate-800/40">
                                <div>
                                  <span className="text-emerald-500 font-bold">● BAIXA_CONCLUÍDA</span>
                                  <span className="text-slate-400 ml-2">MAPA: {r.routeMap} • PLACA: {r.plate}</span>
                                </div>
                                <span className="text-slate-500 text-[10px]">
                                  {r.importedAt ? new Date(r.importedAt).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })()}

        </div>
      )}

      {gestorTab === 'refugos_dashboard' && (
        <div className="space-y-8" id="gestor_refugos_dashboard">
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-lg border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-amber-500 font-mono text-xxs uppercase tracking-widest block font-bold">Logística de Reverso & Qualidade</span>
              <h2 className="font-sans font-extrabold text-2xl tracking-tight mt-1">Dashboard de Refugo & Avarias de Ativos</h2>
              <p className="text-slate-400 text-xs mt-1">Análise consolidada de garrafas bicadas, quebradas, sujidade e integridade dos ativos de giro por motorista.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 shrink-0 w-full md:w-auto">
              {(() => {
                let totalVolumeHandled = 0;
                let totalBlitzBoxesChecked = 0;
                let totalBlitzAvariasFound = 0;

                audits.forEach(audit => {
                  audit.items.forEach(i => {
                    totalVolumeHandled += (i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty) || 0;
                  });
                  audit.assets.forEach(a => {
                    totalVolumeHandled += (a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty) || 0;
                  });
                  totalBlitzBoxesChecked += audit.blitzBoxesChecked || 0;
                  totalBlitzAvariasFound += audit.blitzAvariasFound || 0;
                });

                const totalRefugosCombined = totalRefugosOverallQty + totalBlitzAvariasFound;
                // Since a box/garrafeira has 24 bottles, we convert boxes checked to units for accurate ratio if appropriate,
                // or keep them as direct units. Let's add them as units (1 box = 24 units of A.G. checked)
                const blitzVolumeUnits = totalBlitzBoxesChecked * 24;
                const totalVolumeCombined = totalVolumeHandled + blitzVolumeUnits;
                const refugoIndexCombined = totalVolumeCombined > 0 ? (totalRefugosCombined / totalVolumeCombined) * 100 : 0;

                return (
                  <>
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center flex-1 md:flex-initial min-w-[150px]">
                      <span className="text-[10px] text-slate-400 font-mono uppercase block">Total de Refugos</span>
                      <span className="text-2xl font-sans font-bold text-red-500 block mt-1">
                        {totalRefugosCombined} <span className="text-xs text-slate-400 font-normal">un</span>
                      </span>
                      <span className="text-[8px] text-slate-500 block uppercase mt-0.5">
                        Rotina: {totalRefugosOverallQty} | Blitz: {totalBlitzAvariasFound}
                      </span>
                    </div>

                    <div className="bg-slate-800 p-4 rounded-xl border border-amber-500/20 text-center flex-1 md:flex-initial min-w-[200px] relative overflow-hidden">
                      <span className="text-[10px] text-amber-400 font-mono uppercase block font-bold tracking-wider">Índice de Refugo</span>
                      <span className="text-3xl font-sans font-bold text-amber-500 block mt-1">
                        {refugoIndexCombined.toFixed(3)}%
                      </span>
                      <div className="text-[8px] text-slate-400 block uppercase mt-1 space-y-0.5 leading-tight">
                        <div>A.G. Rotina: {totalVolumeHandled} un</div>
                        <div>A.G. Blitz: {blitzVolumeUnits} un ({totalBlitzBoxesChecked} cx)</div>
                        <div className="font-semibold text-slate-300 border-t border-slate-700 pt-0.5 mt-0.5">Total Auditado: {totalVolumeCombined} un</div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* ÁRVORE DE MOTIVOS */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-5">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-sans font-bold text-slate-900 text-sm uppercase">Árvore de Motivos de Avaria</h3>
                  <p className="text-xxs text-slate-400 mt-0.5">Distribuição das avarias classificadas pelos conferentes físicos.</p>
                </div>
                <span className="text-[10px] bg-red-50 text-red-700 font-mono px-2 py-0.5 rounded-full font-bold">Qualidade</span>
              </div>

              <div className="space-y-4">
                {rankedRefugoMotives.map((item, idx) => {
                  let barColor = 'bg-red-500';
                  if (item.motive.includes('BICADA')) barColor = 'bg-amber-500';
                  else if (item.motive.includes('SUJIDADE')) barColor = 'bg-blue-500';
                  else if (item.motive.includes('SEGUNDA')) barColor = 'bg-purple-500';

                  return (
                    <div key={item.motive} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="text-slate-400 font-mono text-xxs">#{idx + 1}</span>
                          <span className="font-bold text-slate-800 uppercase tracking-tight text-xxs truncate max-w-[150px]">{item.motive}</span>
                        </div>
                        <div className="font-mono text-[11px] text-slate-500">
                          <strong className="text-slate-900">{item.qty} un</strong> ({item.percentage.toFixed(1)}%)
                        </div>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${barColor} rounded-full transition-all duration-500`}
                          style={{ width: `${item.percentage || 1}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {rankedRefugoMotives.length === 0 && (
                  <div className="text-center py-12 text-xxs text-slate-400 italic">
                    Nenhum motivo registrado até o momento.
                  </div>
                )}
              </div>
            </div>

            {/* RANKING POR MOTORISTA / PRESTADOR DE CONTA */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-5">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-sans font-bold text-slate-900 text-sm uppercase">Ranking por Condutor (Prestador de Conta)</h3>
                  <p className="text-xxs text-slate-400 mt-0.5">Quais condutores possuem maior recorrência de ativos danificados.</p>
                </div>
                <span className="text-[10px] bg-amber-50 text-amber-700 font-mono px-2 py-0.5 rounded-full font-bold">Filtro Motorista</span>
              </div>

              <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                {rankedRefugoDrivers.map((drv, idx) => {
                  const percentOfTotal = totalRefugosOverallQty > 0 ? (drv.totalRefugoQty / totalRefugosOverallQty) * 100 : 0;
                  
                  // Get the top reason for this driver
                  const topReason = Object.entries(drv.reasons)
                    .sort((a, b) => b[1] - a[1])[0];

                  return (
                    <div key={drv.driverId} className="p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="bg-slate-100 text-slate-700 font-bold text-xxs px-2 py-0.5 rounded-md font-mono">#{idx + 1}</span>
                          <span className="font-sans font-bold text-slate-900 text-xs">{drv.name}</span>
                        </div>
                        <span className="block text-[10px] text-slate-500">
                          Matrícula: <strong className="font-mono">{drv.driverId}</strong> • Viagens com refugo: <strong className="text-slate-700">{drv.totalTripsWithRefugo}</strong>
                        </span>
                        {topReason && topReason[1] > 0 && (
                          <div className="text-[9px] bg-red-50 text-red-700 px-2 py-0.5 rounded inline-block font-sans uppercase">
                            Principal ofensa: <strong>{topReason[0]} ({topReason[1]} un)</strong>
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-mono">Refugado</span>
                        <strong className="text-slate-900 font-mono text-sm block">{drv.totalRefugoQty} un</strong>
                        <span className="text-xxs font-bold text-red-500 font-mono block">({percentOfTotal.toFixed(1)}%)</span>
                      </div>
                    </div>
                  );
                })}
                {rankedRefugoDrivers.length === 0 && (
                  <div className="text-center py-12 text-xxs text-slate-400 italic">
                    Nenhum registro de avaria atribuído a motoristas até o momento.
                  </div>
                )}
              </div>
            </div>

            {/* RANKING POR ATIVO DE GIRO */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-5">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-sans font-bold text-slate-900 text-sm uppercase">Ranking por Ativo de Giro</h3>
                  <p className="text-xxs text-slate-400 mt-0.5">Ativos de giro com maior perda e descarte por avaria.</p>
                </div>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 font-mono px-2 py-0.5 rounded-full font-bold">Filtro Ativo</span>
              </div>

              <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                {rankedRefugoAssets.map((asset, idx) => {
                  // Get the top motive for this asset
                  const topMotive = Object.entries(asset.reasons)
                    .sort((a, b) => b[1] - a[1])[0];

                  return (
                    <div key={asset.assetId} className="p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="bg-slate-100 text-slate-700 font-bold text-xxs px-2 py-0.5 rounded-md font-mono">#{idx + 1}</span>
                          <span className="font-sans font-bold text-slate-900 text-xs">{asset.assetName}</span>
                        </div>
                        <span className="block text-[10px] text-slate-500">
                          Código: <strong className="font-mono">{asset.assetId}</strong>
                        </span>
                        {topMotive && topMotive[1] > 0 && (
                          <div className="text-[9px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded inline-block font-sans uppercase">
                            Ofensa principal: <strong>{topMotive[0]} ({topMotive[1]} un)</strong>
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-mono">Total</span>
                        <strong className="text-slate-900 font-mono text-sm block">{asset.totalQty} un</strong>
                        <span className="text-xxs font-bold text-indigo-650 font-mono block">({asset.percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                  );
                })}
                {rankedRefugoAssets.length === 0 && (
                  <div className="text-center py-12 text-xxs text-slate-400 italic">
                    Nenhum registro de avaria por ativo de giro até o momento.
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* HISTÓRICO VISUAL DE COMPROVAÇÕES */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-sans font-bold text-slate-900 text-sm uppercase">Registros de Refugos e Avarias Baixados</h3>
                <p className="text-xxs text-slate-400 mt-0.5">Visualização consolidada de cada mapa com perdas e avariados e registros de fotos do refugo realizadas pelo conferente.</p>
              </div>
              <span className="text-[10px] text-red-600 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full font-bold font-mono">Controle de Reverso</span>
            </div>

            {(() => {
              const auditsWithRefugos = audits.filter(audit => audit.refugos && audit.refugos.length > 0);

              if (auditsWithRefugos.length === 0) {
                return (
                  <div className="text-center py-12 text-xxs text-slate-400 italic border border-dashed border-slate-200 rounded-xl">
                    Nenhum registro de mapa finalizado com refugos e avarias de ativos gravados no histórico.
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {auditsWithRefugos.map(audit => {
                    const totalQty = audit.refugos ? audit.refugos.reduce((sum, r) => sum + r.qty, 0) : 0;
                    const drvName = drivers.find(d => d.id === audit.driverId)?.name || audit.driverId || 'Não Informado';
                    const helperName = audit.helperId ? (drivers.find(d => d.id === audit.helperId)?.name || audit.helperId) : 'N/A';
                    const dateText = formatDate(audit.arrivalDate);
                    const durationText = getAuditDuration(audit.startTime, audit.endTime);

                    return (
                      <div 
                        key={audit.id} 
                        className="p-5 rounded-2xl border border-slate-200 bg-slate-50/40 hover:bg-white hover:border-red-400 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                      >
                        {/* Header Section styled like Registros Baixados */}
                        <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                          <div className="flex items-center space-x-2.5">
                            <div className="p-2 bg-red-50 text-red-700 rounded-xl">
                              <FileSpreadsheet className="h-4.5 w-4.5" />
                            </div>
                            <div>
                              <span className="font-sans font-extrabold text-slate-900 block text-sm sm:text-base">{audit.routeMap}</span>
                              <span className="font-mono text-xxs text-slate-400 font-bold">Placa: {audit.plate}</span>
                            </div>
                          </div>
                          <span className="text-[9px] font-extrabold bg-red-100 text-red-800 px-2 py-0.5 rounded-full uppercase font-mono">
                            {totalQty} un refugo
                          </span>
                        </div>

                        {/* Info list exactly mimicking Registros Baixados */}
                        <div className="text-xxs text-slate-600 space-y-2">
                          <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100">
                            <span className="text-slate-400 font-sans uppercase font-bold tracking-wider text-[8px]">Motorista:</span>
                            <span className="font-sans font-bold text-slate-800 text-right truncate max-w-[150px]">{drvName}</span>
                          </div>
                          <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100">
                            <span className="text-slate-400 font-sans uppercase font-bold tracking-wider text-[8px]">Ajudante:</span>
                            <span className="font-sans font-bold text-slate-800 text-right truncate max-w-[150px]">{helperName}</span>
                          </div>
                          <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100">
                            <span className="text-slate-400 font-sans uppercase font-bold tracking-wider text-[8px]">Data Chegada:</span>
                            <span className="font-mono font-bold text-slate-800 text-right">{dateText}</span>
                          </div>
                          <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100">
                            <span className="text-slate-400 font-sans uppercase font-bold tracking-wider text-[8px]">Tempo Auditoria:</span>
                            <span className="font-mono font-bold text-slate-800 text-right">{durationText}</span>
                          </div>
                        </div>

                        {/* List of refugo items */}
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Itens Danificados</span>
                          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                            {audit.refugos?.map((ref, rIdx) => (
                              <div key={ref.id || rIdx} className="flex justify-between items-center text-xxs p-1.5 bg-slate-100/60 rounded-lg border border-slate-100/80">
                                <div className="space-y-0.5 truncate max-w-[180px]">
                                  <span className="font-sans font-bold text-slate-700 uppercase block truncate">{ref.assetName}</span>
                                  <span className="text-[8px] text-red-600 font-extrabold uppercase bg-red-50 px-1 py-0.5 rounded border border-red-100 inline-block">
                                    {ref.reason}
                                  </span>
                                </div>
                                <span className="font-mono font-extrabold text-slate-900 bg-white border border-slate-200 px-1.5 py-0.5 rounded text-xxs">
                                  {ref.qty} un
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Only Refugo Photos taken by Conferente */}
                        <div className="space-y-2 pt-2.5 border-t border-slate-100/60">
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Evidências Fotográficas do Refugo (Conferência)</span>
                          <div className="grid grid-cols-3 gap-2">
                            {audit.refugos?.map((ref, rIdx) => {
                              if (!ref.photoUrl) return null;
                              return (
                                <div 
                                  key={ref.id || rIdx}
                                  onClick={() => {
                                    setSelectedPhotoForPreview({
                                      photoUrl: ref.photoUrl || '',
                                      title: ref.assetName,
                                      subtitle: `${ref.reason} - ${ref.qty} unidades`,
                                      category: `Mapa: ${audit.routeMap} • Condutor: ${drvName}`
                                    });
                                    setSelectedPhotoScale(1);
                                  }}
                                  className="group relative h-16 bg-slate-950 rounded-lg overflow-hidden border border-slate-200 cursor-pointer hover:border-red-400 hover:scale-[1.03] transition-all"
                                >
                                  <img src={ref.photoUrl} alt="Avaria" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" referrerPolicy="no-referrer" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <ZoomIn className="h-4 w-4 text-white" />
                                  </div>
                                  <div className="absolute bottom-0 inset-x-0 bg-slate-900/85 text-[7px] text-white font-sans text-center py-0.5 uppercase truncate px-1">
                                    {ref.reason}
                                  </div>
                                </div>
                              );
                            })}
                            {audit.refugos?.filter(ref => ref.photoUrl).length === 0 && (
                              <span className="col-span-3 text-[9px] text-slate-400 italic block py-2 text-center bg-slate-100/50 rounded-lg border border-dashed border-slate-200">
                                Nenhuma foto anexada pelo conferente.
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {gestorTab === 'audit_logs' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden p-6 space-y-6" id="audit_logs_section">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="font-sans font-bold text-lg text-slate-900 uppercase">Logs de Operações do Sistema</h2>
              <p className="text-xs text-slate-400 mt-0.5">Histórico em tempo real de criações, edições e remoções de dados por colaboradores.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  window.location.reload();
                }}
                className="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold px-3 py-1.5 rounded-lg transition text-xs flex items-center space-x-1 cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Atualizar</span>
              </button>
            </div>
          </div>

          {/* Table display */}
          <div className="overflow-x-auto">
            {auditLogs.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Shield className="h-8 w-8 text-slate-300 mx-auto mb-2 animate-pulse" />
                <p className="text-xs text-slate-400">Nenhum log operacional registrado até o momento.</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 font-sans rounded-l-lg">Data/Hora</th>
                    <th className="py-3 px-4 font-sans">Usuário Responsável</th>
                    <th className="py-3 px-4 font-sans">Operação</th>
                    <th className="py-3 px-4 font-sans rounded-r-lg">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {auditLogs.map((log: any) => {
                    let opColor = "bg-blue-50 text-blue-700 border-blue-200";
                    if (log.operation === "CRIAÇÃO") opColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                    if (log.operation === "EXCLUSÃO") opColor = "bg-red-50 text-red-700 border-red-200";
                    if (log.operation === "EDIÇÃO") opColor = "bg-amber-50 text-amber-700 border-amber-200";

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-500 font-medium whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString('pt-BR')}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {log.user || "Sistema"}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-sans font-bold tracking-wide uppercase ${opColor}`}>
                            {log.operation}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-sans max-w-md break-words">
                          {log.details}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {gestorTab === 'historico' && (
        <div className="space-y-8 animate-fade-in" id="gestor_historico_tab">
          {/* Dashboard Summary for History */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-850 text-white p-6 rounded-2xl shadow-lg border border-slate-800">
            <h3 className="font-sans font-bold text-xs text-amber-500 uppercase tracking-widest mb-4">
              Dashboard de Status & Quantidades do Histórico (Visão Gestor)
            </h3>
            {(() => {
              const closedAudits = audits.filter(a => a.status === 'finalizado_ok' || a.status === 'finalizado_divergente');
              const totalMaps = closedAudits.length;
              const okMaps = closedAudits.filter(a => a.status === 'finalizado_ok').length;
              const divMaps = closedAudits.filter(a => a.status === 'finalizado_divergente').length;

              let missingQtyTotal = 0;
              let surplusQtyTotal = 0;

              closedAudits.forEach(audit => {
                audit.items.forEach(item => {
                  const phys = item.rePhysicalQty !== undefined ? item.rePhysicalQty : item.physicalQty;
                  const fisc = item.fiscalQty ?? 0;
                  const diff = phys - fisc;
                  if (diff < 0) missingQtyTotal += Math.abs(diff);
                  else if (diff > 0) surplusQtyTotal += diff;
                });
                audit.assets.forEach(asset => {
                  const phys = asset.rePhysicalQty !== undefined ? asset.rePhysicalQty : asset.physicalQty;
                  const fisc = asset.fiscalQty ?? 0;
                  const diff = phys - fisc;
                  if (diff < 0) missingQtyTotal += Math.abs(diff);
                  else if (diff > 0) surplusQtyTotal += diff;
                });
              });

              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/50 text-center">
                    <span className="text-[10px] text-slate-400 font-mono uppercase block">Total de Baixas</span>
                    <span className="text-2xl font-bold text-white block mt-1">{totalMaps} mapas</span>
                  </div>

                  <div className="bg-emerald-950/30 p-4 rounded-xl border border-emerald-900/30 text-center">
                    <span className="text-[10px] text-emerald-400 font-mono uppercase block">Status 100% OK</span>
                    <span className="text-2xl font-bold text-emerald-400 block mt-1">{okMaps} mapas</span>
                  </div>

                  <div className="bg-red-950/30 p-4 rounded-xl border border-red-900/30 text-center">
                    <span className="text-[10px] text-red-400 font-mono uppercase block">Divergências</span>
                    <span className="text-2xl font-bold text-red-400 block mt-1">{divMaps} mapas</span>
                  </div>

                  <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/50 text-center">
                    <span className="text-[10px] text-slate-400 font-mono uppercase block">Volume do Desvio</span>
                    <span className="text-lg font-bold text-slate-200 block mt-1">Faltas: {missingQtyTotal} | Sobras: {surplusQtyTotal}</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
            <span className="text-xxs font-mono font-bold text-slate-400 uppercase block">
              Filtros de Pesquisa do Histórico
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase block">Buscar Mapa/Placa/Motorista:</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ex: MAPA-ROTA-115..."
                    value={historySearchQuery}
                    onChange={e => setHistorySearchQuery(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 pr-8 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <Search className="absolute left-2.5 top-3 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase block">De (Data de Chegada):</label>
                <input
                  type="date"
                  value={historyStartDate}
                  onChange={e => setHistoryStartDate(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase block">Até (Data de Chegada):</label>
                <input
                  type="date"
                  value={historyEndDate}
                  onChange={e => setHistoryEndDate(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase block">Status da Aferição:</label>
                <select
                  value={historyStatusFilter}
                  onChange={e => setHistoryStatusFilter(e.target.value as any)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-amber-500 h-[34px]"
                >
                  <option value="all">Todos os Status</option>
                  <option value="ok">100% OK (Sem divergências)</option>
                  <option value="divergentes">Divergentes (Com sobras/faltas)</option>
                </select>
              </div>
            </div>

            {(historySearchQuery || historyStartDate || historyEndDate || historyStatusFilter !== 'all') && (
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => {
                    setHistorySearchQuery('');
                    setHistoryStartDate('');
                    setHistoryEndDate('');
                    setHistoryStatusFilter('all');
                  }}
                  className="text-xxs font-bold text-red-600 hover:text-red-700 flex items-center space-x-1 cursor-pointer"
                >
                  <XCircle className="h-3 w-3" />
                  <span>Limpar Todos os Filtros</span>
                </button>
              </div>
            )}
          </div>

          {/* List of audits */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-4">
            <h4 className="font-sans font-bold text-sm text-slate-900 uppercase">
              Mapas Baixados e Finalizados
            </h4>

            {(() => {
              const closedAudits = audits.filter(a => a.status === 'finalizado_ok' || a.status === 'finalizado_divergente');
              const filtered = closedAudits.filter(a => {
                const driverName = drivers.find(d => d.id === a.driverId)?.name || a.driverId || '';
                const matchesSearch = a.routeMap.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
                                      a.plate.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
                                      driverName.toLowerCase().includes(historySearchQuery.toLowerCase());
                
                let matchesDate = true;
                if (historyStartDate) matchesDate = matchesDate && (a.arrivalDate >= historyStartDate);
                if (historyEndDate) matchesDate = matchesDate && (a.arrivalDate <= historyEndDate);

                const matchesStatus = historyStatusFilter === 'all' ||
                                      (historyStatusFilter === 'ok' && a.status === 'finalizado_ok') ||
                                      (historyStatusFilter === 'divergentes' && a.status === 'finalizado_divergente');

                return matchesSearch && matchesDate && matchesStatus;
              });

              if (filtered.length === 0) {
                return (
                  <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                    Nenhum mapa baixado coincide com as datas ou filtros informados.
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filtered.map(audit => {
                    const isOk = audit.status === 'finalizado_ok';
                    const drvName = drivers.find(d => d.id === audit.driverId)?.name || audit.driverId || 'Não Informado';
                    const arrivalDateFormatted = audit.arrivalDate ? new Date(audit.arrivalDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A';

                    return (
                      <div 
                        key={audit.id} 
                        onClick={() => setSelectedHistoryAudit(audit)}
                        className="p-5 rounded-2xl border border-slate-200 bg-slate-50/40 hover:bg-white hover:border-amber-400 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between space-y-4"
                      >
                        <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                          <div className="flex items-center space-x-2.5">
                            <div className={`p-2 rounded-xl ${isOk ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                              <FileSpreadsheet className="h-4.5 w-4.5" />
                            </div>
                            <div>
                              <span className="font-sans font-extrabold text-slate-900 block text-sm sm:text-base">{audit.routeMap}</span>
                              <span className="font-mono text-xxs text-slate-400 font-bold">Placa: {audit.plate}</span>
                            </div>
                          </div>
                          <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase font-mono ${
                            isOk ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {isOk ? '100% OK' : 'Divergente'}
                          </span>
                        </div>

                        <div className="text-xxs text-slate-600 space-y-2">
                          <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100">
                            <span className="text-slate-400 font-sans uppercase font-bold tracking-wider text-[8px]">Motorista:</span>
                            <span className="font-sans font-bold text-slate-800 text-right truncate max-w-[150px]">{drvName}</span>
                          </div>
                          <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100">
                            <span className="text-slate-400 font-sans uppercase font-bold tracking-wider text-[8px]">Data de Chegada:</span>
                            <span className="font-mono font-bold text-slate-800 text-right">{arrivalDateFormatted}</span>
                          </div>
                          {audit.reconciliationNotes && (
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 italic text-[10px] text-slate-500 block truncate max-w-full">
                              "{audit.reconciliationNotes}"
                            </div>
                          )}
                        </div>

                        <div className="text-[10px] text-amber-600 pt-2 border-t border-slate-100 text-center font-bold uppercase hover:text-amber-700 flex items-center justify-center space-x-1">
                          <span>Analisar Detalhes & Evidências</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* History Detail Dialog */}
          {selectedHistoryAudit && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
                  <div className="flex items-center space-x-2.5">
                    <div className="bg-amber-500 text-slate-950 p-1.5 rounded-lg">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-sans font-extrabold text-sm sm:text-base leading-tight">
                        Detalhamento Técnico do Mapa {selectedHistoryAudit.routeMap}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Placa: {selectedHistoryAudit.plate} • Chegada: {selectedHistoryAudit.arrivalDate ? new Date(selectedHistoryAudit.arrivalDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedHistoryAudit(null)}
                    className="bg-slate-850 hover:bg-slate-800 text-white p-1 px-3 rounded-lg transition text-xs font-bold font-mono border border-slate-700 cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold block uppercase">Motorista</span>
                      <span className="text-xs font-semibold text-slate-800 block truncate">
                        {drivers.find(d => d.id === selectedHistoryAudit.driverId)?.name || selectedHistoryAudit.driverId || 'N/I'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold block uppercase">Ajudante</span>
                      <span className="text-xs font-semibold text-slate-800 block truncate">
                        {selectedHistoryAudit.helperId ? (drivers.find(d => d.id === selectedHistoryAudit.helperId)?.name || selectedHistoryAudit.helperId) : 'Sem Ajudante'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold block uppercase">Status Fiscal</span>
                      <span className={`text-[9px] font-bold uppercase block ${selectedHistoryAudit.status === 'finalizado_ok' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {selectedHistoryAudit.status === 'finalizado_ok' ? '● 100% OK' : '● Divergente'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold block uppercase">Auditor Responsável</span>
                      <span className="text-xs font-semibold text-slate-800 block truncate">
                        {selectedHistoryAudit.auxiliarId || 'Fiscal de Pátio'}
                      </span>
                    </div>
                  </div>

                  {/* Products */}
                  {selectedHistoryAudit.items && selectedHistoryAudit.items.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-800 uppercase block font-sans">
                        Produtos Acabados (PA)
                      </span>
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 text-slate-500 font-bold border-b border-slate-200 font-mono text-[10px]">
                            <tr>
                              <th className="p-2.5">Código / Item</th>
                              <th className="p-2.5 text-center">Contagem Física</th>
                              <th className="p-2.5 text-center">Saldo Fiscal</th>
                              <th className="p-2.5 text-right">Divergência</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {selectedHistoryAudit.items.map(item => {
                              const phys = item.rePhysicalQty !== undefined ? item.rePhysicalQty : item.physicalQty;
                              const fisc = item.fiscalQty ?? 0;
                              const diff = phys - fisc;
                              return (
                                <tr key={item.productCode} className="hover:bg-slate-50/50">
                                  <td className="p-2.5 font-medium">
                                    <span className="font-mono text-[10px] bg-slate-100 p-0.5 px-1 rounded mr-1.5">{item.productCode}</span>
                                    {item.productDescription}
                                  </td>
                                  <td className="p-2.5 text-center font-mono">{phys}</td>
                                  <td className="p-2.5 text-center font-mono">{fisc}</td>
                                  <td className={`p-2.5 text-right font-bold font-mono ${
                                    diff === 0 ? 'text-emerald-600' : diff > 0 ? 'text-amber-600' : 'text-red-600'
                                  }`}>
                                    {diff === 0 ? 'OK' : diff > 0 ? `+${diff}` : `${diff}`}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Assets */}
                  {selectedHistoryAudit.assets && selectedHistoryAudit.assets.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-800 uppercase block font-sans">
                        Ativos de Giro (AG)
                      </span>
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 text-slate-500 font-bold border-b border-slate-200 font-mono text-[10px]">
                            <tr>
                              <th className="p-2.5">Ativo</th>
                              <th className="p-2.5 text-center">Contagem Física</th>
                              <th className="p-2.5 text-center">Saldo Fiscal</th>
                              <th className="p-2.5 text-right">Divergência</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {selectedHistoryAudit.assets.map(asset => {
                              const phys = asset.rePhysicalQty !== undefined ? asset.rePhysicalQty : asset.physicalQty;
                              const fisc = asset.fiscalQty ?? 0;
                              const diff = phys - fisc;
                              return (
                                <tr key={asset.assetId} className="hover:bg-slate-50/50">
                                  <td className="p-2.5 font-medium">{asset.assetName || asset.assetId}</td>
                                  <td className="p-2.5 text-center font-mono">{phys}</td>
                                  <td className="p-2.5 text-center font-mono">{fisc}</td>
                                  <td className={`p-2.5 text-right font-bold font-mono ${
                                    diff === 0 ? 'text-emerald-600' : diff > 0 ? 'text-amber-600' : 'text-red-600'
                                  }`}>
                                    {diff === 0 ? 'OK' : diff > 0 ? `+${diff}` : `${diff}`}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Photo Evidences inside the Gestor History Dialog */}
                  <div className="border-t border-slate-150 pt-4">
                    <AuditPhotoViewer 
                      auditId={selectedHistoryAudit.id} 
                      onSelectPhoto={(photo) => {
                        const drvName = drivers.find(d => d.id === selectedHistoryAudit.driverId)?.name || selectedHistoryAudit.driverId || 'Não Informado';
                        setSelectedPhotoForPreview({
                          photoUrl: photo.photoUrl,
                          title: photo.itemName || 'Evidência fotográfica',
                          subtitle: `Registrado por: ${photo.conferenteId}`,
                          category: `Mapa: ${selectedHistoryAudit.routeMap} • Motorista: ${drvName}`
                        });
                        setSelectedPhotoScale(1);
                      }} 
                    />
                  </div>

                  {/* Comments and Notes */}
                  {selectedHistoryAudit.reconciliationNotes && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                      <strong className="block text-slate-700 uppercase mb-1 font-sans">Parecer do Fiscal / Observações:</strong>
                      <p className="text-slate-600 italic">"{selectedHistoryAudit.reconciliationNotes}"</p>
                    </div>
                  )}

                  {/* Event Log list */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                      Log Cronológico de Eventos da Rota:
                    </span>
                    <div className="space-y-1.5 pl-3 border-l-2 border-slate-200">
                      {selectedHistoryAudit.history && selectedHistoryAudit.history.map((h, i) => (
                        <div key={i} className="text-xxs text-slate-500">
                          <span className="font-mono text-slate-400">[{new Date(h.timestamp).toLocaleTimeString('pt-BR')}]</span>{' '}
                          <strong className="text-slate-700">{h.action}</strong> • Autor: {h.user}
                          {h.details && <span className="text-slate-400 block pl-3 italic">({h.details})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end">
                  <button 
                    onClick={() => setSelectedHistoryAudit(null)}
                    className="bg-slate-900 hover:bg-slate-850 text-white font-bold text-xs py-2 px-5 rounded-lg transition"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Zoomable Photo Lightbox Modal */}
      {selectedPhotoForPreview && (
        <div 
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 z-50 animate-fade-in select-none"
          onClick={() => setSelectedPhotoForPreview(null)}
        >
          <div 
            className="max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div className="space-y-0.5">
                <span className="text-[9px] font-extrabold text-amber-500 font-mono tracking-wider block uppercase">
                  {selectedPhotoForPreview.category}
                </span>
                <h4 className="text-sm font-sans font-extrabold text-white">
                  {selectedPhotoForPreview.title}
                </h4>
                <p className="text-xxs text-slate-400 font-mono">
                  {selectedPhotoForPreview.subtitle}
                </p>
              </div>
              
              {/* Zoom controls */}
              <div className="flex items-center space-x-2 bg-slate-850 px-2.5 py-1.5 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedPhotoScale(prev => Math.max(1, prev - 0.5))}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded cursor-pointer transition"
                  title="Zoom Out (-)"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="text-[10px] text-slate-300 font-mono w-8 text-center">
                  {selectedPhotoScale.toFixed(1)}x
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedPhotoScale(prev => Math.min(4, prev + 0.5))}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded cursor-pointer transition"
                  title="Zoom In (+)"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <div className="h-3 w-px bg-slate-800 mx-1" />
                <button
                  type="button"
                  onClick={() => setSelectedPhotoScale(1)}
                  className="text-[9px] text-slate-400 hover:text-white font-mono px-1.5 py-0.5 hover:bg-slate-800 rounded cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Body / Image Container */}
            <div className="relative flex-1 bg-slate-950 flex items-center justify-center p-6 overflow-auto max-h-[70vh] min-h-[350px]">
              <div className="overflow-hidden max-w-full max-h-full flex items-center justify-center rounded-lg border border-slate-850 bg-slate-900 shadow-inner">
                <img
                  src={selectedPhotoForPreview.photoUrl}
                  alt="Zoomed"
                  referrerPolicy="no-referrer"
                  className="max-w-full max-h-[60vh] object-contain transition-transform duration-200 select-none pointer-events-none"
                  style={{ transform: `scale(${selectedPhotoScale})` }}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-900/50 border-t border-slate-800 flex justify-between items-center text-slate-400 text-xxs">
              <span>Dica: Use os botões superiores para ajustar a aproximação.</span>
              <button
                type="button"
                onClick={() => setSelectedPhotoForPreview(null)}
                className="bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-200 font-bold px-4 py-2 rounded-lg cursor-pointer transition text-xxs"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" id="custom_confirm_modal">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center space-x-3 text-amber-600">
              <div className="p-2 bg-amber-50 rounded-lg">
                <CircleAlert className="h-5 w-5 text-amber-600 animate-bounce" />
              </div>
              <h3 className="font-sans font-bold text-slate-950 text-sm">{confirmModal.title}</h3>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed">
              {confirmModal.message}
            </p>
            
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xxs font-bold rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-[#0f35a9] hover:bg-[#0c2a86] text-white text-xxs font-bold rounded-lg transition shadow-3xs"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETALHES DO VALE / TERMO DE AUTORIZAÇÃO MODAL */}
      {viewingValeDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in" id="viewing_vale_modal_dash">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl flex flex-col my-8 max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-250 flex justify-between items-center rounded-t-2xl">
              <div className="flex items-center space-x-2 text-slate-800">
                <FileText className="h-5 w-5 text-emerald-600" />
                <h3 className="font-sans font-bold text-sm text-slate-950 uppercase">Termo Oficial de Autorização de Desconto</h3>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded-full ${
                  viewingValeDetails.status === 'COMPENSADO'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : viewingValeDetails.status === 'ASSINADO'
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                }`}>
                  {viewingValeDetails.status === 'PENDENTE_ASSINATURA' ? 'Pendente' : viewingValeDetails.status === 'ASSINADO' ? 'Assinado' : 'Compensado'}
                </span>
                
                <button
                  type="button"
                  onClick={() => setViewingValeDetails(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200 cursor-pointer text-xs"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body / Paper layout */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 font-sans text-xs text-slate-800 leading-relaxed max-w-3xl mx-auto">
              <div className="border border-slate-300 rounded-xl p-6 bg-slate-50/50 shadow-inner space-y-5">
                {/* Official Header */}
                <div className="text-center border-b border-slate-200 pb-4 space-y-1">
                  <span className="font-extrabold text-slate-900 tracking-wider text-xs">PAU BRASIL DISTRIBUIDORA LTDA</span>
                  <h4 className="font-black text-sm uppercase tracking-wider text-slate-950">AUTORIZAÇÃO DE DESCONTO EM FOLHA DE PAGAMENTO</h4>
                  <span className="text-[10px] font-mono text-slate-400 font-bold block">Código do Termo: {viewingValeDetails.id}</span>
                </div>

                {/* Content */}
                <p className="text-justify leading-relaxed">
                  Eu, <strong>{viewingValeDetails.colaboradorName}</strong>, registrado no papel de <strong>{viewingValeDetails.colaboradorRole}</strong>, autorizo expressamente a empresa <strong>PAU BRASIL DISTRIBUIDORA LTDA</strong> a descontar em minha folha de pagamento, em conformidade com o Artigo 462, § 1º da CLT, a importância líquida de <strong>R$ {viewingValeDetails.valor.toFixed(2)}</strong> ({viewingValeDetails.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}), referente aos desvios físicos ou avarias constatados no fechamento logístico do <strong>{viewingValeDetails.routeMap !== 'AVULSO' ? `Mapa de Carga nº ${viewingValeDetails.routeMap}` : 'Mapa de Carga Avulso'}</strong>.
                </p>

                {/* Route/Team Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white border border-slate-200 rounded-lg p-4 text-[11px]">
                  <div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase block mb-1">Informações Operacionais</span>
                    <div className="space-y-1">
                      <div><strong>Mapa de Carga:</strong> <span className="font-mono bg-slate-50 border px-1 py-0.2 rounded font-bold">{viewingValeDetails.routeMap}</span></div>
                      <div><strong>Data de Geração:</strong> <span className="font-mono">{new Date(viewingValeDetails.dataGeracao + 'T00:00:00').toLocaleDateString('pt-BR')}</span></div>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase block mb-1">Responsabilidade</span>
                    <div className="space-y-1">
                      <div><strong>Colaborador Principal:</strong> <span className="font-semibold text-slate-900">{viewingValeDetails.colaboradorName}</span></div>
                      <div><strong>Cargo do Responsável:</strong> <span className="text-slate-700 uppercase font-mono text-[10px]">{viewingValeDetails.colaboradorRole}</span></div>
                    </div>
                  </div>
                </div>

                {/* Detailed Description */}
                <div className="border border-slate-250 bg-white rounded-lg p-4 space-y-1.5">
                  <span className="text-slate-900 font-bold text-[10px] uppercase tracking-wider block">Descrição do Fechamento & Desvios Aferidos:</span>
                  <p className="font-mono text-slate-800 text-[11px] whitespace-pre-wrap leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-200">
                    {viewingValeDetails.descricao}
                  </p>
                </div>

                {/* Attached Signature Preview if available */}
                {viewingValeDetails.signedPdfUrl && (
                  <div className="space-y-2 border border-blue-200 bg-blue-50/50 p-4 rounded-lg">
                    <span className="text-blue-900 font-bold text-[10px] uppercase tracking-wider block">Documento de Assinatura Anexado:</span>
                    <div className="flex items-center justify-between text-xs text-blue-800">
                      <span className="truncate max-w-[250px] font-mono font-semibold">{viewingValeDetails.signedPdfName || 'documento_vale_assinado.pdf'}</span>
                      <a
                        href={viewingValeDetails.signedPdfUrl}
                        download={viewingValeDetails.signedPdfName || `vale_assinado_${viewingValeDetails.id}.pdf`}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded transition shadow-3xs text-[10px] uppercase tracking-wider cursor-pointer"
                      >
                        Download do Anexo
                      </a>
                    </div>
                  </div>
                )}

                {/* Mock Signatures Visual Layout */}
                <div className="grid grid-cols-2 gap-8 pt-8 text-center text-[10px] leading-relaxed">
                  <div className="space-y-1">
                    <div className="border-b border-slate-300 mx-auto w-10/12 pt-4" />
                    <span className="font-bold text-slate-900 block truncate">{viewingValeDetails.colaboradorName}</span>
                    <span className="text-[8px] text-slate-400 block uppercase font-mono">Assinatura do Colaborador</span>
                  </div>
                  <div className="space-y-1">
                    <div className="border-b border-slate-300 mx-auto w-10/12 pt-4" />
                    <span className="font-bold text-slate-900 block truncate">Gestão Pau Brasil</span>
                    <span className="text-[8px] text-slate-400 block uppercase font-mono">Aferidor Responsável</span>
                  </div>
                </div>

                <p className="text-[9px] text-slate-400 text-justify leading-relaxed font-sans pt-4 border-t border-slate-200">
                  O desconto autorizado neste termo está em total conformidade com as diretrizes de responsabilidade civil e patrimonial de Pau Brasil Distribuidora S/A e amparado legalmente pelas normas da Consolidação das Leis do Trabalho (CLT).
                </p>
              </div>
            </div>

            {/* Modal Footer with Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center rounded-b-2xl">
              <button
                type="button"
                onClick={() => setViewingValeDetails(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-4 py-2 rounded-lg transition text-xs cursor-pointer"
              >
                Fechar
              </button>

              <div className="flex items-center gap-2">
                {/* PDF/JPEG upload if pending */}
                {viewingValeDetails.status === 'PENDENTE_ASSINATURA' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedValeIdForUploadDash(viewingValeDetails.id);
                      setTimeout(() => {
                        dashboardValeInputRef.current?.click();
                      }, 50);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg transition text-xs flex items-center space-x-1 cursor-pointer"
                  >
                    <UploadCloud className="h-4 w-4" />
                    <span>Anexar Assinatura</span>
                  </button>
                )}

                {/* Compensate directly */}
                {(viewingValeDetails.status === 'ASSINADO' || viewingValeDetails.status === 'PENDENTE_ASSINATURA') && (
                  <button
                    type="button"
                    onClick={() => {
                      requestConfirm(
                        'Confirmar Compensação',
                        `Tem certeza de que deseja faturar e marcar este vale de R$ ${viewingValeDetails.valor.toFixed(2)} para ${viewingValeDetails.colaboradorName} como COMPENSADO?`,
                        () => {
                          const updated = vales.map(v => v.id === viewingValeDetails.id ? { ...v, status: 'COMPENSADO' as const } : v);
                          onSaveVales(updated);
                          setViewingValeDetails(updated.find(v => v.id === viewingValeDetails.id) || null);
                        }
                      );
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg transition text-xs cursor-pointer"
                  >
                    Compensar Vale
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {gestorTab === 'firebase_sync' && (
        <FirebaseManagerView />
      )}

    </div>
  );
}
