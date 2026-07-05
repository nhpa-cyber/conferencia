import React, { useState } from 'react';
import { User, Driver, Vehicle, Product, ActiveAsset, AuditSession, AuditItem, AuditAssetItem, AuditExchangeItem, FiscalAlert, ImportedRoute, Vale, ReturnForecast, getAssetCode, getAssetCanonicalName } from '../types';
import { ClipboardCheck, ShieldAlert, ArrowRight, ShieldCheck, CheckSquare, AlertTriangle, HelpCircle, Search, RefreshCw, XCircle, DollarSign, Calendar, SlidersHorizontal, FileSpreadsheet, Clock, CheckCircle2, Shield, Trash2, Camera, BarChart3, AlertCircle, Plus, FileText, Check, Award, Eye, Calculator } from 'lucide-react';
import { ImageDB, PhotoRecord } from '../imageDb';
import { DEFAULT_USERS } from '../data';
import { getSkuClosedPrice } from '../utils/prices';

function AuditPhotoViewer({ auditId }: { auditId: string }) {
  const [photos, setPhotos] = React.useState<PhotoRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [previewPhoto, setPreviewPhoto] = React.useState<PhotoRecord | null>(null);
  const [scale, setScale] = React.useState(1);

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
            onClick={() => { setPreviewPhoto(p); setScale(1); }}
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

      {previewPhoto && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="absolute top-4 right-4 flex items-center space-x-3 z-50">
            <div className="bg-slate-900/90 border border-slate-700 rounded-lg p-1 flex items-center space-x-1 shadow-lg text-white">
              <button
                type="button"
                onClick={() => setScale(s => Math.max(s - 0.25, 0.5))}
                className="p-1.5 hover:bg-slate-800 rounded font-bold text-sm h-8 w-8 flex items-center justify-center cursor-pointer transition"
                title="Zoom Out"
              >
                -
              </button>
              <span className="px-2 font-mono text-xs font-bold w-12 text-center">{Math.round(scale * 100)}%</span>
              <button
                type="button"
                onClick={() => setScale(s => Math.min(s + 0.25, 4))}
                className="p-1.5 hover:bg-slate-800 rounded font-bold text-sm h-8 w-8 flex items-center justify-center cursor-pointer transition"
                title="Zoom In"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setScale(1)}
                className="px-2 py-1 hover:bg-slate-800 rounded font-bold text-xs cursor-pointer transition"
                title="Reset Zoom"
              >
                1x
              </button>
            </div>
            <button
              type="button"
              onClick={() => { setPreviewPhoto(null); setScale(1); }}
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-3 py-1.5 text-xs font-bold uppercase transition cursor-pointer font-sans"
            >
              Fechar [X]
            </button>
          </div>

          <div className="w-full h-full flex items-center justify-center overflow-auto p-4 cursor-zoom-in">
            <div 
              className="transition-transform duration-100 ease-out flex items-center justify-center"
              style={{ transform: `scale(${scale})` }}
            >
              <img
                src={previewPhoto.photoUrl}
                alt={previewPhoto.itemName}
                className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl border border-slate-800 bg-slate-950"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          <div className="absolute bottom-4 left-4 right-4 bg-slate-950/85 border border-slate-800 text-white p-3 rounded-xl max-w-2xl mx-auto flex flex-col space-y-1 text-center font-sans">
            <div className="font-bold text-xs uppercase tracking-wider">{previewPhoto.itemName || 'Sem descrição'}</div>
            <div className="text-[10px] text-slate-400 font-mono">
              Código / Ativo: {previewPhoto.itemCode} • Categoria: {
                previewPhoto.type === 'produto' ? 'PA' : 
                previewPhoto.type === 'refugo' ? 'REFUGO/AVARIA' : 
                previewPhoto.type === 'troca_reposicao' ? 'TROCA/REPOSIÇÃO' : 'AG'
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AuditHistoryDetails({ audit }: { audit: AuditSession }) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="mt-4 border-t border-slate-150/50 pt-3">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="text-xxs font-bold text-slate-700 hover:text-indigo-600 flex items-center space-x-1 uppercase focus:outline-none cursor-pointer"
      >
        <span>{isOpen ? '▲ Ocultar Detalhes da Conciliação' : '▼ Visualizar Detalhes e Itens Reconciliados'}</span>
      </button>

      {isOpen && (
        <div className="mt-3 space-y-4">
          {/* PA Products Table */}
          {audit.items && audit.items.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase font-mono block">Produtos Acabados (PA)</span>
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/30">
                <table className="w-full text-left text-[10px]">
                  <thead className="bg-slate-100 text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2">Item</th>
                      <th className="p-2 text-center">Físico</th>
                      <th className="p-2 text-center">Fiscal</th>
                      <th className="p-2 text-right">Divergência</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {audit.items.map(item => {
                      const phys = item.rePhysicalQty !== undefined ? item.rePhysicalQty : item.physicalQty;
                      const fisc = item.fiscalQty ?? 0;
                      const diff = phys - fisc;
                      return (
                        <tr key={item.productCode} className="hover:bg-slate-100/30">
                          <td className="p-2 font-medium">{item.productDescription || item.productCode}</td>
                          <td className="p-2 text-center font-mono">{phys}</td>
                          <td className="p-2 text-center font-mono">{fisc}</td>
                          <td className={`p-2 text-right font-bold font-mono ${
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

          {/* AG Assets Table */}
          {audit.assets && audit.assets.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase font-mono block">Ativos de Giro (AG)</span>
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/30">
                <table className="w-full text-left text-[10px]">
                  <thead className="bg-slate-100 text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2">Ativo</th>
                      <th className="p-2 text-center">Físico</th>
                      <th className="p-2 text-center">Fiscal</th>
                      <th className="p-2 text-center">Como.</th>
                      <th className="p-2 text-center">Rec.</th>
                      <th className="p-2 text-right">Divergência</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {audit.assets.map(asset => {
                      const phys = asset.rePhysicalQty !== undefined ? asset.rePhysicalQty : asset.physicalQty;
                      const fisc = asset.fiscalQty ?? 0;
                      const comodato = asset.comodatoQty ?? 0;
                      const recolha = asset.recolhaQty ?? 0;
                      const diff = phys - fisc + comodato - recolha;
                      return (
                        <tr key={asset.assetId} className="hover:bg-slate-100/30">
                          <td className="p-2 font-medium">{asset.assetName || asset.assetId}</td>
                          <td className="p-2 text-center font-mono">{phys}</td>
                          <td className="p-2 text-center font-mono">{fisc}</td>
                          <td className="p-2 text-center font-mono text-slate-500">{comodato || '-'}</td>
                          <td className="p-2 text-center font-mono text-slate-500">{recolha || '-'}</td>
                          <td className={`p-2 text-right font-bold font-mono ${
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

          {/* Photo viewer component */}
          <AuditPhotoViewer auditId={audit.id} />
        </div>
      )}
    </div>
  );
}

interface FiscalViewProps {
  currentUser: User;
  drivers: Driver[];
  onSaveDrivers?: (drivers: Driver[]) => void;
  vehicles: Vehicle[];
  products: Product[];
  onSaveProducts?: (products: Product[]) => void;
  activeAssets: ActiveAsset[];
  audits: AuditSession[];
  onSaveAudits: (audits: AuditSession[]) => void;
  fiscalAlerts?: FiscalAlert[];
  onSaveAlerts?: (alerts: FiscalAlert[]) => void;
  importedRoutes?: ImportedRoute[];
  onSaveImportedRoutes?: (routes: ImportedRoute[]) => void;
  vales?: Vale[];
  onSaveVales?: (vales: Vale[]) => void;
  activeTab?: string;
  onResetPlatformData?: () => void;
  returnForecasts?: ReturnForecast[];
  onSaveForecasts?: (forecasts: ReturnForecast[]) => void;
}

function selectCircularBlitzRoutes(importedRoutesForDate: ImportedRoute[]): string[] {
  if (importedRoutesForDate.length === 0) return [];
  if (importedRoutesForDate.length <= 2) {
    return importedRoutesForDate.map(r => r.routeMap);
  }

  // Get distinct plates with their corresponding map codes
  const uniquePlatesWithMaps = importedRoutesForDate.filter(r => r.plate && r.plate.trim() !== "");
  if (uniquePlatesWithMaps.length === 0) {
    // If no plates, fallback to choosing first 2 map codes
    return importedRoutesForDate.slice(0, 2).map(r => r.routeMap);
  }

  // Retrieve already checked plates in this cycle from localStorage
  let checkedPlates: string[] = [];
  try {
    const saved = localStorage.getItem("blitz_checked_plates");
    if (saved) {
      checkedPlates = JSON.parse(saved);
    }
  } catch (e) {
    console.error("Error reading blitz checked plates:", e);
  }

  // If all plates from the uniquePlatesWithMaps list are already checked, reset the checked list
  const allPlatesInImport = uniquePlatesWithMaps.map(r => r.plate.trim().toUpperCase());
  const uncheckedPlatesInImport = allPlatesInImport.filter(p => !checkedPlates.includes(p));

  let chosenPlates: string[] = [];

  if (uncheckedPlatesInImport.length >= 2) {
    // We have at least 2 unchecked plates. Pick the first 2.
    chosenPlates = uncheckedPlatesInImport.slice(0, 2);
  } else if (uncheckedPlatesInImport.length === 1) {
    // We have only 1 unchecked plate. Pick it, and reset checkedPlates to pick another one.
    chosenPlates.push(uncheckedPlatesInImport[0]);
    // Reset checked plates list
    checkedPlates = [];
    const remainingPlates = allPlatesInImport.filter(p => p !== chosenPlates[0]);
    if (remainingPlates.length > 0) {
      chosenPlates.push(remainingPlates[0]);
    }
  } else {
    // All are checked! Reset checkedPlates and pick first 2 from all
    checkedPlates = [];
    chosenPlates = allPlatesInImport.slice(0, 2);
  }

  // Update checkedPlates in history
  chosenPlates.forEach(p => {
    if (!checkedPlates.includes(p)) {
      checkedPlates.push(p);
    }
  });
  localStorage.setItem("blitz_checked_plates", JSON.stringify(checkedPlates));

  // Map chosen plates back to their route maps
  const selectedMaps: string[] = [];
  chosenPlates.forEach(plate => {
    const found = uniquePlatesWithMaps.find(r => r.plate.trim().toUpperCase() === plate);
    if (found) {
      selectedMaps.push(found.routeMap);
    }
  });

  // If we couldn't get 2 maps, pad with first available
  while (selectedMaps.length < 2 && importedRoutesForDate.length > selectedMaps.length) {
    const nextMap = importedRoutesForDate.find(r => !selectedMaps.includes(r.routeMap));
    if (nextMap) {
      selectedMaps.push(nextMap.routeMap);
    } else {
      break;
    }
  }

  return selectedMaps;
}

export default function FiscalView({
  currentUser,
  drivers,
  onSaveDrivers,
  vehicles,
  products,
  onSaveProducts,
  activeAssets,
  audits,
  onSaveAudits,
  fiscalAlerts,
  onSaveAlerts,
  importedRoutes = [],
  onSaveImportedRoutes,
  vales = [],
  onSaveVales,
  activeTab = 'reconciliacao',
  onResetPlatformData,
  returnForecasts = [],
  onSaveForecasts
}: FiscalViewProps) {
  // Navigation / Workspace selection
  const [activeSession, setActiveSession] = useState<AuditSession | null>(null);

  // Monitoramento alerts overlay toggle state
  const [showMonitorAlerts, setShowMonitorAlerts] = useState(false);

  // Bottle Calculator states
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [calc1L, setCalc1L] = useState<number | ''>('');
  const [calc600, setCalc600] = useState<number | ''>('');
  const [calc300, setCalc300] = useState<number | ''>('');

  // Filter states for Sobras & Faltas
  const [filterNB, setFilterNB] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'sobra' | 'falta'>('all');
  const [subTabDivergencias, setSubTabDivergencias] = useState<'all' | 'pa' | 'ag'>('all');
  
  // Vales State and Form States
  const [viewingVale, setViewingVale] = useState<any | null>(null);
  const [valeColaboradorId, setValeColaboradorId] = useState('');
  const [valeRouteMap, setValeRouteMap] = useState('');
  const [valeValeValor, setValeValeValor] = useState('');
  const [valeDescricao, setValeDescricao] = useState('');
  const [valeObservacao, setValeObservacao] = useState('');
  const [uploadingValeId, setUploadingValeId] = useState<string | null>(null);

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
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [resetPasswordError, setResetPasswordError] = useState('');
  const [activeSessionPhotos, setActiveSessionPhotos] = useState<PhotoRecord[]>([]);
  const [selectedPhotoForPreview, setSelectedPhotoForPreview] = useState<PhotoRecord | null>(null);
  const [selectedPhotoScale, setSelectedPhotoScale] = useState(1);
  const [reconciliationNotes, setReconciliationNotes] = useState('');

  React.useEffect(() => {
    if (activeSession?.id) {
      ImageDB.getPhotosByAudit(activeSession.id)
        .then(res => setActiveSessionPhotos(res))
        .catch(err => console.error("Erro ao carregar fotos da sessão ativa:", err));
    } else {
      setActiveSessionPhotos([]);
    }
  }, [activeSession?.id, activeSession?.status, activeSession?.refugos?.length, activeSession?.history?.length]);

  // Synchronize activeSession with updates from parent audits (real-time sync)
  React.useEffect(() => {
    if (activeSession) {
      const currentInAudits = audits.find(a => a.id === activeSession.id);
      if (currentInAudits) {
        // Construct a merged version that preserves locally typed fiscal quantities to avoid overwrites
        const mergedItems = currentInAudits.items.map(item => {
          const localItem = activeSession.items.find(i => i.productCode === item.productCode);
          return {
            ...item,
            fiscalQty: localItem && localItem.fiscalQty !== undefined ? localItem.fiscalQty : item.fiscalQty
          };
        });

        const mergedAssets = currentInAudits.assets.map(asset => {
          const localAsset = activeSession.assets.find(a => a.assetId === asset.assetId);
          return {
            ...asset,
            fiscalQty: localAsset && localAsset.fiscalQty !== undefined ? localAsset.fiscalQty : asset.fiscalQty,
            comodatoQty: localAsset && localAsset.comodatoQty !== undefined ? localAsset.comodatoQty : asset.comodatoQty,
            recolhaQty: localAsset && localAsset.recolhaQty !== undefined ? localAsset.recolhaQty : asset.recolhaQty
          };
        });

        const mergedSession: AuditSession = {
          ...currentInAudits,
          items: mergedItems,
          assets: mergedAssets
        };

        if (JSON.stringify(mergedSession) !== JSON.stringify(activeSession)) {
          setActiveSession(mergedSession);
        }
      }
    }
  }, [audits, activeSession?.id]);
  
  // Date and state for Route Import
  const [routeImportDate, setRouteImportDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });

  // Auto-assign circular blitz to 2 routes of the active date if none are assigned
  React.useEffect(() => {
    if (!importedRoutes || importedRoutes.length === 0 || !onSaveImportedRoutes) return;
    
    // Find routes of the active date
    const routesForActiveDate = importedRoutes.filter(r => r.routeDate === routeImportDate);
    if (routesForActiveDate.length === 0) return;

    // Check if any route of this date already has isBlitz
    const hasBlitz = routesForActiveDate.some(r => r.isBlitz);
    if (!hasBlitz) {
      // Choose 2 circular blitz routes
      const blitzMaps = selectCircularBlitzRoutes(routesForActiveDate);
      const updated = importedRoutes.map(r => {
        if (r.routeDate === routeImportDate && blitzMaps.includes(r.routeMap)) {
          return { ...r, isBlitz: true };
        }
        return r;
      });
      onSaveImportedRoutes(updated);
    }
  }, [importedRoutes, routeImportDate, onSaveImportedRoutes]);

  const [isDragOver, setIsDragOver] = useState(false);
  const [isMergeMode, setIsMergeMode] = useState(true);

  // States for History dashboard & search
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [selectedHistoryAudit, setSelectedHistoryAudit] = useState<AuditSession | null>(null);

  const handleFileImport = (file: File, isMerge: boolean = false) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length <= 1) {
        alert("O arquivo importado está vazio ou não possui cabeçalhos.");
        return;
      }

      // Detect separator and parse headers
      const sep = lines[0].includes(';') ? ';' : ',';
      const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
      
      let mapIndex = headers.findIndex(h => h.includes('mapa') || h.includes('nro do mapa') || h.includes('nro. do mapa'));
      let plateIndex = headers.findIndex(h => h.includes('placa'));
      let driverIndex = headers.findIndex(h => h.includes('motorista') || h.includes('condutor') || h.includes('matricula') || h.includes('matr'));

      // Fallback index-based coordinates (G, M, O) if headers not found
      if (mapIndex === -1) mapIndex = 6;
      if (plateIndex === -1) plateIndex = 12;
      if (driverIndex === -1) driverIndex = 14;

      const parsedRoutes: ImportedRoute[] = [];
      const currentDrivers = [...drivers];

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        const cols = row.split(sep).map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length <= Math.max(mapIndex, plateIndex)) continue;

        const mapCode = cols[mapIndex];
        const plate = cols[plateIndex];
        const driverCodeOrName = cols[driverIndex] || '';

        if (!mapCode) continue;

        // Discard route map if both Column L (index 11) and Column M (index 12 / plateIndex) are empty
        const colL = cols[11] ? cols[11].trim() : '';
        const colM = cols[12] ? cols[12].trim() : '';
        if (!colL && !colM) {
          continue;
        }

        // Find driver by matricula (compare numbers only to ignore any prefix like 'G')
        let matchedDriverId = '';
        if (driverCodeOrName) {
          const numCode = driverCodeOrName.replace(/\D/g, '');
          if (numCode) {
            const matched = currentDrivers.find(d => {
              const numId = d.id.replace(/\D/g, '');
              return numId === numCode;
            });
            if (matched) {
              matchedDriverId = matched.id;
            }
          } else {
            // Check name match
            const matchedByName = currentDrivers.find(d => d.name.trim().toLowerCase() === driverCodeOrName.toLowerCase());
            if (matchedByName) {
              matchedDriverId = matchedByName.id;
            }
          }
        }

        // Avoid duplicate route maps in this file import
        if (parsedRoutes.some(r => r.routeMap.trim().toUpperCase() === mapCode.trim().toUpperCase())) {
          continue;
        }

        parsedRoutes.push({
          id: `imp_${Date.now()}_csv_${i}_${Math.floor(Math.random() * 1000)}`,
          routeMap: mapCode.trim(),
          plate: plate ? plate.trim().toUpperCase() : '',
          driverId: matchedDriverId,
          routeDate: routeImportDate,
          status: 'pendente' as const,
          importedAt: new Date().toISOString(),
          itemsCount: 0,
          items: []
        });
      }

      if (parsedRoutes.length === 0) {
        alert("Não foi possível identificar nenhuma rota ou mapa válido no arquivo. Verifique as colunas de Mapa (G) e Placa (M).");
        return;
      }

      let mergedRoutes = [...importedRoutes];
      if (isMerge) {
        // Merge mode
        parsedRoutes.forEach(newR => {
          const existingIdx = mergedRoutes.findIndex(r => r.routeMap.trim().toUpperCase() === newR.routeMap.trim().toUpperCase());
          if (existingIdx >= 0) {
            const currentRoute = mergedRoutes[existingIdx];
            const isPendente = currentRoute.status === 'pendente';
            mergedRoutes[existingIdx] = {
              ...currentRoute,
              plate: newR.plate || currentRoute.plate,
              driverId: newR.driverId || currentRoute.driverId,
              itemsCount: isPendente ? 0 : currentRoute.itemsCount,
              items: isPendente ? [] : currentRoute.items
            };
          } else {
            mergedRoutes.push(newR);
          }
        });
      } else {
        // Standard overwrite if same routeMap and routeDate
        parsedRoutes.forEach(newR => {
          const duplicateIdx = mergedRoutes.findIndex(r => r.routeMap.trim().toUpperCase() === newR.routeMap.trim().toUpperCase() && r.routeDate === newR.routeDate);
          if (duplicateIdx >= 0) {
            const currentRoute = mergedRoutes[duplicateIdx];
            const isPendente = currentRoute.status === 'pendente';
            mergedRoutes[duplicateIdx] = {
              ...currentRoute,
              plate: newR.plate || currentRoute.plate,
              driverId: newR.driverId || currentRoute.driverId,
              itemsCount: isPendente ? 0 : currentRoute.itemsCount,
              items: isPendente ? [] : currentRoute.items
            };
          } else {
            mergedRoutes.push(newR);
          }
        });
      }

      if (onSaveImportedRoutes) {
        onSaveImportedRoutes(mergedRoutes);
      }

      // Sync forecast driver names
      if (onSaveForecasts && returnForecasts.length > 0) {
        const updatedForecasts = returnForecasts.map(f => {
          const matchedRoute = mergedRoutes.find(r => r.routeMap.toUpperCase() === f.routeMap.toUpperCase());
          if (matchedRoute) {
            const dObj = currentDrivers.find(d => d.id === matchedRoute.driverId);
            return dObj ? { ...f, driverName: dObj.name } : f;
          }
          return f;
        });
        onSaveForecasts(updatedForecasts);
      }

      alert(`Sucesso! ${isMerge ? 'Mesclados' : 'Importados'} ${parsedRoutes.length} mapas para a data ${new Date(routeImportDate + 'T00:00:00').toLocaleDateString('pt-BR')}.`);
    };
    reader.readAsText(file);
  };

  const handleDriverImport = (file: File) => {
    // Legacy support, deprecated since we import maps, plates and drivers simultaneously.
    alert("Para importar os motoristas, por favor use o campo unificado de Importação de Rotas.");
  };

  const handleImportRoutesClick = () => {
    const userDate = prompt("Qual a data da rota? (Atenção para fins de semana)", routeImportDate);
    if (!userDate) return;

    // Create 3 new imported routes for that date
    const suffix = Math.floor(Math.random() * 900 + 100);
    const newRoutes: ImportedRoute[] = [
      {
        id: `imp_${Date.now()}_1`,
        routeMap: `MAPA-ROTA-${suffix}A`,
        plate: 'BRA2E19',
        driverId: 'drv_1',
        routeDate: userDate,
        status: 'pendente',
        importedAt: new Date().toISOString(),
        itemsCount: 8,
        items: [
          { productCode: 'P01', productDescription: 'Spaten 350ml', qty: 24, unit: 'UN' },
          { productCode: 'P02', productDescription: 'Corona Extra 330ml', qty: 12, unit: 'UN' },
          { productCode: 'P03', productDescription: 'Stella Artois 330ml', qty: 48, unit: 'UN' }
        ]
      },
      {
        id: `imp_${Date.now()}_2`,
        routeMap: `MAPA-ROTA-${suffix}B`,
        plate: 'AMB9X42',
        driverId: 'drv_2',
        routeDate: userDate,
        status: 'pendente',
        importedAt: new Date().toISOString(),
        itemsCount: 12,
        items: [
          { productCode: 'P04', productDescription: 'Budweiser 330ml', qty: 36, unit: 'UN' },
          { productCode: 'P05', productDescription: 'Becks LN 275ml', qty: 24, unit: 'UN' }
        ]
      },
      {
        id: `imp_${Date.now()}_3`,
        routeMap: `MAPA-ROTA-${suffix}C`,
        plate: 'LOG4K88',
        driverId: 'drv_3',
        routeDate: userDate,
        status: 'pendente',
        importedAt: new Date().toISOString(),
        itemsCount: 6,
        items: [
          { productCode: 'P06', productDescription: 'Spaten Lata 350ml', qty: 120, unit: 'UN' },
          { productCode: 'P07', productDescription: 'Budweiser Lata 350ml', qty: 72, unit: 'UN' }
        ]
      }
    ];

    if (onSaveImportedRoutes) {
      onSaveImportedRoutes([...importedRoutes, ...newRoutes]);
      alert(`Sucesso! 3 novos mapas de rota foram importados para a data ${new Date(userDate + 'T00:00:00').toLocaleDateString('pt-BR')}.`);
    }
  };
  
  // History search / filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ok' | 'divergentes'>('all');

  // Pending for fiscal verification
  const pendingAudits = audits.filter(a => a.status === 'conferido_fisico');

  // History audits (finished today)
  const historyAudits = audits.filter(a => 
    a.status === 'finalizado_ok' || a.status === 'finalizado_divergente'
  );

  const getDriverName = (id: string) => id === 'temporario' ? 'Temporário' : (drivers.find(d => d.id === id)?.name || id);
  const getHelperName = (id?: string) => id ? drivers.find(d => d.id === id)?.name || id : 'Sem ajudante';

  // Helper to calculate audit duration
  const getDurationText = (start?: string, end?: string) => {
    if (!start || !end) return 'N/A';
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    const mins = Math.floor(diffMs / 60000);
    const secs = Math.floor((diffMs % 60000) / 1000);
    return `${mins}m ${secs}s`;
  };

  // Live reconciliation item helpers
  const handleUpdateFiscalQty = (productCode: string, val: number | undefined) => {
    if (!activeSession) return;
    const updatedItems = activeSession.items.map(item => {
      if (item.productCode === productCode) {
        return { ...item, fiscalQty: val };
      }
      return item;
    });
    setActiveSession({ ...activeSession, items: updatedItems });
  };

  const handleUpdateAssetFiscalQty = (assetId: string, val: number | undefined) => {
    if (!activeSession) return;
    
    const updatedAssets = activeSession.assets.map(asset => {
      if (asset.assetId === assetId) {
        return { ...asset, fiscalQty: val };
      }
      return asset;
    });
    setActiveSession({ ...activeSession, assets: updatedAssets });
  };

  const handleUpdateAssetComodatoQty = (assetId: string, val: number) => {
    if (!activeSession) return;
    
    const updatedAssets = activeSession.assets.map(asset => {
      if (asset.assetId === assetId) {
        return { ...asset, comodatoQty: val };
      }
      return asset;
    });
    setActiveSession({ ...activeSession, assets: updatedAssets });
  };

  const handleUpdateAssetRecolhaQty = (assetId: string, val: number) => {
    if (!activeSession) return;
    
    const updatedAssets = activeSession.assets.map(asset => {
      if (asset.assetId === assetId) {
        return { ...asset, recolhaQty: val };
      }
      return asset;
    });
    setActiveSession({ ...activeSession, assets: updatedAssets });
  };

  // Action: Request physical recount (Reconferência)
  const handleRequestReconferencia = () => {
    if (!activeSession) return;
    if (!reconciliationNotes.trim()) {
      alert('Por favor, informe no campo de observações o motivo da reconferência (quais produtos apresentaram divergência).');
      return;
    }

    const now = new Date().toISOString();
    const updatedSession: AuditSession = {
      ...activeSession,
      status: 'reconferencia',
      reconciliationNotes: reconciliationNotes.trim(),
      history: [
        ...activeSession.history,
        {
          timestamp: now,
          action: 'Reconferência Solicitada',
          user: currentUser.name,
          details: reconciliationNotes.trim()
        }
      ]
    };

    const updatedAudits = audits.map(a => a.id === activeSession.id ? updatedSession : a);
    onSaveAudits(updatedAudits);

    // Trigger alert for the Conferente that a recount has been requested
    if (onSaveAlerts && fiscalAlerts) {
      const newAlert: FiscalAlert = {
        id: 'al_' + Date.now(),
        routeMap: activeSession.routeMap,
        plate: activeSession.plate,
        status: 'recontagem_solicitada' as const,
        timestamp: now,
        read: false,
        title: 'Reconferência Solicitada',
        message: `O auxiliar de logística ${currentUser.name} solicitou recontagem para o mapa ${activeSession.routeMap} (${activeSession.plate}). Motivo: ${reconciliationNotes.trim()}`,
        targetRole: 'conferente'
      };
      onSaveAlerts([newAlert, ...fiscalAlerts]);
    }

    // Also set corresponding imported route's status to 'reconferir'
    if (onSaveImportedRoutes && importedRoutes) {
      const updatedRoutes = importedRoutes.map(r => {
        const isMatched = r.routeMap.toUpperCase() === activeSession.routeMap.toUpperCase() ||
          (activeSession.unifiedMaps && activeSession.unifiedMaps.some(m => m.toUpperCase() === r.routeMap.toUpperCase()));
        if (isMatched) {
          return { ...r, status: 'reconferir' as const };
        }
        return r;
      });
      onSaveImportedRoutes(updatedRoutes);
    }

    alert('Reconferência enviada com sucesso para a fila do Conferente!');
    setActiveSession(null);
    setReconciliationNotes('');
  };

  // Action: Finalize and log audit return (Dar Baixa)
  const handleFinalizeReconciliation = () => {
    if (!activeSession) return;

    // Check if monitoramento reported a discrepancy
    const matchedRoute = importedRoutes.find(r => r.routeMap.toUpperCase() === activeSession.routeMap.toUpperCase());

    const executeFinalization = () => {
      // Check if there are differences
      let hasDiscrepancy = false;
      
      // Verify products
      const itemsWithUpdatedFiscal = activeSession.items.map(item => {
        const physical = item.rePhysicalQty !== undefined ? item.rePhysicalQty : item.physicalQty;
        const fiscal = item.fiscalQty ?? 0;
        if (physical !== fiscal) hasDiscrepancy = true;
        return { ...item, fiscalQty: fiscal }; // Ensure it has fiscal quantity defined
      });

      // Verify assets
      const assetsWithUpdatedFiscal = activeSession.assets.map(asset => {
        const physical = asset.rePhysicalQty !== undefined ? asset.rePhysicalQty : asset.physicalQty;
        const fiscal = asset.fiscalQty ?? 0;
        const comodato = asset.comodatoQty ?? 0;
        const recolha = asset.recolhaQty ?? 0;
        const diff = physical - fiscal + comodato - recolha;
        if (diff !== 0) hasDiscrepancy = true;
        return { ...asset, fiscalQty: fiscal, comodatoQty: comodato, recolhaQty: recolha }; // Ensure properties are preserved
      });

      const finalStatus = hasDiscrepancy ? 'finalizado_divergente' : 'finalizado_ok';
      const now = new Date().toISOString();

      const updatedSession: AuditSession = {
        ...activeSession,
        items: itemsWithUpdatedFiscal,
        assets: assetsWithUpdatedFiscal,
        status: finalStatus,
        auxiliarId: currentUser.id,
        reconciliationNotes: reconciliationNotes.trim() || undefined,
        history: [
          ...activeSession.history,
          {
            timestamp: now,
            action: finalStatus === 'finalizado_ok' ? 'Baixa Concluída - OK' : 'Baixa Concluída com Divergências',
            user: currentUser.name,
            details: reconciliationNotes.trim() || 'Aferição concluída'
          }
        ]
      };

      const updatedAudits = audits.map(a => a.id === activeSession.id ? updatedSession : a);
      onSaveAudits(updatedAudits);

      // Also set corresponding imported route's status to 'fechado' (closed)
      if (onSaveImportedRoutes && importedRoutes) {
        const updatedRoutes = importedRoutes.map(r => {
          const isMatched = r.routeMap.toUpperCase() === activeSession.routeMap.toUpperCase() ||
            (activeSession.unifiedMaps && activeSession.unifiedMaps.some(m => m.toUpperCase() === r.routeMap.toUpperCase()));
          if (isMatched) {
            return { ...r, status: 'fechado' as const };
          }
          return r;
        });
        onSaveImportedRoutes(updatedRoutes);
      }

      // Trigger alert for the Conferente that a mapa has been given baixa (fiscal checkout)
      if (onSaveAlerts && fiscalAlerts) {
        const newAlert: FiscalAlert = {
          id: 'al_' + Date.now(),
          routeMap: activeSession.routeMap,
          plate: activeSession.plate,
          status: finalStatus,
          timestamp: now,
          read: false,
          title: finalStatus === 'finalizado_ok' ? 'Mapa Baixado (Saldo OK)' : 'Mapa Baixado com Divergências',
          message: `O mapa ${activeSession.routeMap} (${activeSession.plate}) foi finalizado e baixado por ${currentUser.name}.`,
          targetRole: 'todos'
        };
        onSaveAlerts([newAlert, ...fiscalAlerts]);
      }

      alert(finalStatus === 'finalizado_ok' ? 'Retorno baixado com sucesso! Saldo OK.' : 'Retorno baixado com divergências registradas.');
      setActiveSession(null);
      setReconciliationNotes('');
    };

    if (matchedRoute && matchedRoute.discrepancyObservation) {
      requestConfirm(
        "Divergência Reportada pelo Monitoramento",
        `ATENÇÃO: O Monitoramento reportou a seguinte divergência de ativos de giro ou P.A mapeados para este mapa:\n\n"${matchedRoute.discrepancyObservation}"\n\nDeseja realmente concluir e fechar o mapa mesmo assim? Certifique-se de que a divergência foi tratada.`,
        executeFinalization
      );
    } else {
      executeFinalization();
    }
  };

  // Filtering history lists
  const filteredHistory = historyAudits.filter(a => {
    const matchesSearch = 
      a.routeMap.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getDriverName(a.driverId).toLowerCase().includes(searchTerm.toLowerCase());
    
    // Check date bounds if configured
    let matchesDate = true;
    if (historyStartDate) {
      matchesDate = matchesDate && (a.arrivalDate >= historyStartDate);
    }
    if (historyEndDate) {
      matchesDate = matchesDate && (a.arrivalDate <= historyEndDate);
    }

    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'ok' && a.status === 'finalizado_ok') ||
      (statusFilter === 'divergentes' && a.status === 'finalizado_divergente');

    return matchesSearch && matchesDate && matchesStatus;
  });

  // Calculate stats for selected active session
  const getDiscrepancyTotals = (session: AuditSession) => {
    let missingCost = 0;
    let surplusCost = 0;
    let missingCount = 0;
    let surplusCount = 0;

    session.items.forEach(item => {
      const physical = item.rePhysicalQty !== undefined ? item.rePhysicalQty : item.physicalQty;
      const fiscal = item.fiscalQty ?? 0;
      const diff = physical - fiscal;
      if (diff < 0) {
        missingCount += Math.abs(diff);
        missingCost += Math.abs(diff) * item.cost;
      } else if (diff > 0) {
        surplusCount += diff;
        surplusCost += diff * item.cost;
      }
    });

    session.assets.forEach(asset => {
      const physical = asset.rePhysicalQty !== undefined ? asset.rePhysicalQty : asset.physicalQty;
      const fiscal = asset.fiscalQty ?? 0;
      const comodato = asset.comodatoQty ?? 0;
      const recolha = asset.recolhaQty ?? 0;
      const diff = physical - fiscal + comodato - recolha;
      if (diff < 0) {
        missingCount += Math.abs(diff);
        missingCost += Math.abs(diff) * asset.cost;
      } else if (diff > 0) {
        surplusCount += diff;
        surplusCost += diff * asset.cost;
      }
    });

    return { missingCost, surplusCost, missingCount, surplusCount };
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8" id="fiscal_view">
      {/* Upper Navigation Header */}
      <div className="bg-slate-800 rounded-2xl p-6 mb-8 text-white shadow-xl border border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="bg-amber-500 text-slate-950 font-mono text-xxs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">
            Painel Fiscal (Reconciliação & Baixas)
          </span>
          <h1 className="text-3xl font-sans font-bold tracking-tight text-white mt-3">
            Confronto de Saldo Físico vs Fiscal
          </h1>
          <p className="text-slate-300 mt-1 text-sm max-w-2xl">
            Verifique as aferições do Conferente Física, compare com o Saldo Fiscal de Retorno e aprove os retornos de rota. Lance reconferências caso encontre divergências inexplicáveis.
          </p>
        </div>
        
        <div className="flex items-center space-x-3 shrink-0 relative">
          {/* NOTIFICATION BUBBLE FROM MONITORAMENTO */}
          {(() => {
            const pernoiteForecasts = returnForecasts.filter(f => f.tripStatus === 'pernoitam' && f.status !== 'no_patio');
            const emRotaWithEta = returnForecasts.filter(f => f.tripStatus !== 'pernoitam' && f.eta && f.status !== 'no_patio');
            const totalNotifications = pernoiteForecasts.length + emRotaWithEta.length;

            return (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMonitorAlerts(!showMonitorAlerts)}
                  className={`relative p-2.5 rounded-xl border transition-all duration-300 flex items-center space-x-2 cursor-pointer ${
                    totalNotifications > 0 
                      ? 'bg-amber-500/15 border-amber-500/40 hover:bg-amber-500/25 text-amber-400 animate-pulse-slow' 
                      : 'bg-slate-700 border-slate-600 hover:bg-slate-650 text-slate-400'
                  }`}
                  title="Alertas de Rastreamento (Pernoites e Previsões)"
                >
                  <Clock className="h-4.5 w-4.5" />
                  <span className="font-sans font-bold text-xs text-white">Pernoites & Chegadas</span>
                  {totalNotifications > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white font-mono text-[9px] font-extrabold h-4.5 w-4.5 rounded-full flex items-center justify-center animate-bounce shadow-md border border-slate-800">
                      {totalNotifications}
                    </span>
                  )}
                </button>

                {showMonitorAlerts && (
                  <div className="absolute right-0 top-12 mt-2 w-80 md:w-96 bg-white border border-slate-200 text-slate-900 rounded-2xl shadow-2xl p-4 z-50 animate-fade-in space-y-4 font-sans">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <span className="font-sans font-black text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-amber-500" />
                        Alertas do Rastreamento
                      </span>
                      <button 
                        type="button"
                        onClick={() => setShowMonitorAlerts(false)}
                        className="text-slate-400 hover:text-slate-600 font-bold text-xs px-2 py-0.5 rounded hover:bg-slate-100 transition-all cursor-pointer"
                      >
                        Fechar
                      </button>
                    </div>

                    {/* SECTION 1: PERNOITE */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-extrabold text-amber-600 uppercase tracking-wider">
                        <span>🌙 IRÃO PERNOITAR ({pernoiteForecasts.length})</span>
                      </div>
                      {pernoiteForecasts.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">Nenhum veículo em pernoite cadastrado.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                          {pernoiteForecasts.map((f) => (
                            <div key={f.id} className="bg-amber-50/70 p-2 rounded-lg border border-amber-200 space-y-1 text-xxs">
                              <div className="flex justify-between items-center">
                                <span className="font-extrabold text-slate-950 font-mono">MAPA {f.routeMap}</span>
                                <span className="bg-amber-100 text-amber-800 font-black text-[8px] uppercase px-1.5 py-0.2 rounded font-mono">🌙 Pernoitar</span>
                              </div>
                              <div className="text-slate-600 font-sans">
                                <div><strong>Placa:</strong> {f.plate} | <strong>Motorista:</strong> {f.driverName}</div>
                                <div><strong>Previsão de Retorno:</strong> {f.eta}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* SECTION 2: ETA PREVISOES */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex justify-between items-center text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider">
                        <span>⏰ PREVISÕES DE CHEGADA ({emRotaWithEta.length})</span>
                      </div>
                      {emRotaWithEta.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">Nenhuma nova previsão de chegada.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                          {emRotaWithEta.map((f) => (
                            <div key={f.id} className="bg-indigo-50/40 p-2 rounded-lg border border-indigo-150 space-y-1 text-xxs">
                              <div className="flex justify-between items-center">
                                <span className="font-extrabold text-slate-950 font-mono">MAPA {f.routeMap}</span>
                                <span className="bg-indigo-100 text-indigo-800 font-bold text-[8px] uppercase px-1.5 py-0.2 rounded font-mono">⏰ Em Rota</span>
                              </div>
                              <div className="text-slate-600 font-sans">
                                <div><strong>Placa:</strong> {f.plate} | <strong>Motorista:</strong> {f.driverName}</div>
                                <div className="text-indigo-900 font-bold"><strong>Previsão ETA:</strong> {f.eta}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {activeSession && (
            <button
              onClick={() => {
                setActiveSession(null);
                setReconciliationNotes('');
              }}
              className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold px-4 py-2.5 rounded-lg border border-slate-600 transition"
            >
              Voltar para Listagem
            </button>
          )}
        </div>
      </div>

      {!activeSession ? (
        <div className="space-y-8">
          
          {/* Section: Sincronizador de Liberação Diária (Spreadsheet Route Import) */}
          {activeTab === 'sincronizador' && (currentUser.role === 'gestor' || currentUser.role === 'auxiliar_logistica') && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-slate-100 gap-4">
              <div className="flex items-center space-x-3">
                <div className="bg-emerald-100 text-emerald-800 p-2.5 rounded-xl">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-sans font-bold text-lg text-slate-900 uppercase">Sincronizador & Importador de Rotas</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Importe a planilha diária para prever as rotas e placas de amanhã.</p>
                  <div className="mt-2 inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-md border border-emerald-150 text-[11px] font-semibold">
                    <span>Rotina do Promax para exportar rotas:</span>
                    <strong className="text-emerald-900 font-mono bg-white px-1.5 py-0.2 rounded border border-emerald-200">03.11.49.02</strong>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg p-1.5 px-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Data da Rota:</span>
                  <input
                    type="date"
                    value={routeImportDate}
                    onChange={(e) => setRouteImportDate(e.target.value)}
                    className="text-xs bg-transparent border-none text-slate-900 focus:outline-none font-semibold font-mono"
                  />
                </div>

                {onResetPlatformData && (
                  <button
                    type="button"
                    onClick={() => {
                      const passwordInput = prompt("Digite a senha de segurança para resetar a plataforma:");
                      if (passwordInput !== '!Bud0102') {
                        alert("Senha de segurança incorreta ou cancelada! A operação não foi autorizada.");
                        return;
                      }
                      requestConfirm(
                        "Zerar Todos os Dados",
                        "Você tem certeza que deseja deletar permanentemente todos os mapas importados, históricos de conferência, previsões de chegada e alertas de sobras? Esta ação não pode ser desfeita.",
                        () => {
                          onResetPlatformData();
                          alert("Todos os dados operacionais foram reiniciados com sucesso!");
                        }
                      );
                    }}
                    className="px-3 py-2 bg-red-600 hover:bg-red-750 text-white text-[10px] font-bold uppercase rounded-lg transition shadow-sm flex items-center space-x-1 cursor-pointer hover:shadow-md"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Resetar Plataforma</span>
                  </button>
                )}
              </div>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-amber-50/40 p-4 rounded-xl border border-amber-200/50">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5 uppercase font-mono">
                    <span className="h-2 w-2 bg-amber-500 rounded-full animate-pulse"></span>
                    Configuração de Sincronização (Mesclagem Ativa)
                  </span>
                  <p className="text-[11px] text-slate-600 leading-relaxed max-w-xl">
                    Os mapas são importados quase que diariamente. Ativando o <strong>Modo de Mesclagem</strong>, todas as informações de mapas anteriores que ainda estão em aberto permanecem na plataforma até o fechamento e baixa total.
                  </p>
                </div>
                <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-lg shadow-3xs border border-slate-200 shrink-0">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Modo Mesclar:</span>
                  <button
                    type="button"
                    onClick={() => setIsMergeMode(!isMergeMode)}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isMergeMode ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        isMergeMode ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className={`text-[10px] font-extrabold uppercase font-mono ${isMergeMode ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {isMergeMode ? 'Ativado' : 'Inativo'}
                  </span>
                </div>
              </div>

              <div className="w-full">
                {/* Unified Route File Import */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileImport(e.dataTransfer.files[0], isMergeMode);
                    }
                  }}
                  className={`border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-4 ${
                    isDragOver
                      ? 'border-emerald-500 bg-emerald-50/40'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                  onClick={() => document.getElementById('route-file-input')?.click()}
                  id="unified-route-import-dropzone"
                >
                  <input
                    id="route-file-input"
                    type="file"
                    accept=".csv,.txt"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileImport(e.target.files[0], isMergeMode);
                      }
                    }}
                    className="hidden"
                  />

                  <div className={`p-4 rounded-full ${isDragOver ? 'bg-emerald-100 text-emerald-800 animate-bounce' : 'bg-slate-100 text-slate-500'}`}>
                    <FileSpreadsheet className="h-10 w-10" />
                  </div>

                  <div className="max-w-md">
                    <p className="text-base font-bold text-slate-800">
                      Arraste e solte a planilha de rotas aqui ou <span className="text-emerald-600 underline">procure nos arquivos</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Suporta arquivos delimitados por ponto e vírgula (.csv, .txt) contendo Mapas, Veículos e Motoristas.
                    </p>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-250 rounded-xl p-4 w-full max-w-2xl text-left text-xs text-emerald-850 space-y-2 shadow-sm">
                    <span className="font-sans font-bold text-emerald-900 block uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                      <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                      Rotina Promax Necessária para Exportação:
                    </span>
                    <p className="text-[11px] leading-relaxed text-slate-600 font-sans">
                      Para obter o arquivo correto, acesse o Promax e utilize a rotina de exportação <strong className="text-emerald-950 font-mono bg-white px-2 py-0.5 rounded border border-emerald-250 font-extrabold text-xs">03.11.49.02</strong> (Controle de Mapas de Distribuição e Acertos). O relatório exportado em formato de texto delimitado por ponto e vírgula (.csv ou .txt) deve conter as informações de Mapas, Veículos e Motoristas.
                    </p>
                    <div className="text-[10px] text-slate-450 mt-1 font-sans">
                      ⚠️ Certifique-se de que o arquivo gerado não sofreu alterações manuais antes de arrastar e soltar para a importação.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Progress Metrics */}
            {(() => {
              const selectedRoutes = importedRoutes.filter(r => {
                const isToday = r.routeDate === routeImportDate;
                const isOpen = r.status !== 'fechado';
                return isToday || isOpen;
              });
              const total = selectedRoutes.length;
              const closed = selectedRoutes.filter(r => r.status === 'fechado').length;
              const open = total - closed;
              const pct = total > 0 ? (closed / total) * 100 : 0;

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Mapas na Data</span>
                      <span className="text-xl font-sans font-bold text-slate-900 mt-1 block font-mono">{total} mapas</span>
                    </div>

                    <div className="bg-amber-50/45 p-3.5 rounded-lg border border-amber-100">
                      <span className="text-[10px] text-amber-500 font-bold uppercase block">Pendente / Conferindo</span>
                      <span className="text-xl font-sans font-bold text-amber-700 mt-1 block font-mono">{open} mapas</span>
                    </div>

                    <div className="bg-emerald-50/45 p-3.5 rounded-lg border border-emerald-100">
                      <span className="text-[10px] text-emerald-500 font-bold uppercase block">Liberado & Fechado</span>
                      <span className="text-xl font-sans font-bold text-emerald-700 mt-1 block font-mono">{closed} mapas</span>
                    </div>
                  </div>

                  {total > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xxs font-mono font-bold text-slate-400 uppercase">
                        <span>Progresso de Fechamento de Cargas</span>
                        <span>{pct.toFixed(0)}% Fechado</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                        <div className="bg-emerald-500 h-2 transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}

                  {/* List of imported route cards for Auxiliar */}
                  {selectedRoutes.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {selectedRoutes.map(route => {
                        const isClosed = route.status === 'fechado';
                        const isConferindo = route.status === 'conferindo';

                        return (
                          <div key={route.id} className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2.5 transition-all ${
                            isClosed 
                              ? 'bg-emerald-50/5 border-emerald-200/60' 
                              : isConferindo 
                                ? 'bg-amber-50/10 border-amber-300' 
                                : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-extrabold text-sm text-slate-900 block">{route.routeMap}</span>
                                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                  <span className="font-mono text-xxs text-slate-400">Placa: {route.plate}</span>
                                  {route.isBlitz && (
                                    <span className="bg-red-100 text-red-700 text-[8px] font-extrabold px-1.5 py-0.5 rounded border border-red-200 uppercase tracking-wider animate-pulse">
                                      ⚡ Blitz de Refugo (2x Dia)
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded ${
                                isClosed 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : isConferindo 
                                    ? 'bg-amber-100 text-amber-800' 
                                    : 'bg-slate-100 text-slate-600'
                              }`}>
                                {route.status}
                              </span>
                            </div>

                            {/* Driver Selection Dropdown */}
                            <div className="text-xxs text-slate-500 bg-slate-50/50 p-2 rounded-lg border border-slate-100 space-y-1">
                              <span className="font-bold text-slate-500 uppercase tracking-wider block text-[8px]">Selecione o Motorista:</span>
                              <select
                                value={route.driverId || ''}
                                onChange={(e) => {
                                  const selectedId = e.target.value;
                                  const updated = importedRoutes.map(r => {
                                    if (r.id === route.id) {
                                      return { ...r, driverId: selectedId };
                                    }
                                    return r;
                                  });
                                  if (onSaveImportedRoutes) {
                                    onSaveImportedRoutes(updated);
                                  }

                                  // Update forecast driver name too
                                  const dObj = drivers.find(d => d.id === selectedId);
                                  const dName = selectedId === 'temporario' ? 'Temporário' : (dObj ? dObj.name : '');
                                  if (dName) {
                                    const updatedForecasts = returnForecasts.map(f => {
                                      if (f.routeMap.toUpperCase() === route.routeMap.toUpperCase()) {
                                        return { ...f, driverName: dName };
                                      }
                                      return f;
                                    });
                                    if (onSaveForecasts) {
                                      onSaveForecasts(updatedForecasts);
                                    }
                                  }
                                }}
                                className="w-full text-xxs bg-white border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium text-slate-800"
                                disabled={isClosed}
                              >
                                <option value="">-- Selecione o Motorista --</option>
                                <option value="temporario">Temporário</option>
                                {drivers.map(d => (
                                  <option key={d.id} value={d.id}>
                                    {d.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {route.discrepancyObservation && (
                              <div className="bg-red-50 border border-red-200 text-red-950 text-xxs p-2 rounded-lg font-sans space-y-1">
                                <span className="font-extrabold text-[9px] text-red-700 uppercase block">⚠️ ALERTA DO MONITORAMENTO:</span>
                                <p className="italic leading-relaxed">"{route.discrepancyObservation}"</p>
                              </div>
                            )}

                            {!isClosed && (
                              <button
                                type="button"
                                onClick={() => {
                                  const confirmMsg = route.discrepancyObservation
                                    ? `ATENÇÃO CRÍTICA: O Monitoramento reportou uma divergência para este mapa:\n\n"${route.discrepancyObservation}"\n\nTem certeza absoluta de que deseja dar BAIXA DIRETA e FECHAR o mapa ${route.routeMap} mesmo assim?`
                                    : `Você tem certeza de que deseja realizar a BAIXA DIRETA no mapa ${route.routeMap}?\n\nEsta ação encerrará o mapa imediatamente no sistema sem exigir conferência de pátio ou auditoria física. Confirma?`;

                                  const confirmTitle = route.discrepancyObservation
                                    ? "⚠️ Alerta de Divergência Pendente"
                                    : "❓ Confirmar Baixa Direta?";

                                  requestConfirm(
                                    confirmTitle,
                                    confirmMsg,
                                    () => {
                                      const updated = importedRoutes.map(r => r.id === route.id ? { ...r, status: 'fechado' as const } : r);
                                      if (onSaveImportedRoutes) {
                                        onSaveImportedRoutes(updated);
                                        alert(`Mapa ${route.routeMap} baixado diretamente com sucesso.`);
                                      }
                                    }
                                  );
                                }}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-[9px] py-1.5 rounded uppercase cursor-pointer"
                              >
                                Dar Baixa Direta
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xxs text-slate-400 italic font-medium py-3 text-center border border-dashed border-slate-100 rounded">
                      Nenhuma rota importada para esta data. Altere a data acima ou clique em "Importar Planilha" para simular.
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
          )}
          
          {/* Section: Real-time Progress Charts & Three-Column Process Tracker */}
          {activeTab === 'reconciliacao' && (
            <div className="space-y-6">
            {/* Process Progress Chart */}
            {(() => {
              const totalWorking = importedRoutes.filter(r => r.status === 'conferindo' || r.status === 'reconferir').length;
              const totalPending = importedRoutes.filter(r => r.status === 'pendente' || !r.status).length;
              const totalWaiting = pendingAudits.length;
              const totalReconciled = audits.filter(a => a.status === 'finalizado_ok' || a.status === 'finalizado_divergente').length;

              const totalCalculated = totalWorking + totalPending + totalWaiting + totalReconciled;
              const pendingPct = totalCalculated > 0 ? (totalPending / totalCalculated) * 100 : 0;
              const workingPct = totalCalculated > 0 ? (totalWorking / totalCalculated) * 100 : 0;
              const waitingPct = totalCalculated > 0 ? (totalWaiting / totalCalculated) * 100 : 0;
              const reconciledPct = totalCalculated > 0 ? (totalReconciled / totalCalculated) * 100 : 0;

              return (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <h3 className="font-sans font-bold text-slate-900 text-sm uppercase flex items-center space-x-2">
                      <SlidersHorizontal className="h-5 w-5 text-indigo-600 animate-spin-slow" />
                      <span>Monitoramento Integrado de Processos</span>
                    </h3>
                    <span className="text-xxs font-mono text-slate-400 font-bold uppercase">Tempo Real</span>
                  </div>

                  <div className="space-y-4">
                    {/* Progress Bar Chart */}
                    <div className="h-7 rounded-xl overflow-hidden flex border border-slate-100 shadow-3xs bg-slate-150">
                      {pendingPct > 0 && (
                        <div 
                          className="bg-red-500 h-full flex items-center justify-center text-white text-[10px] font-bold font-mono transition-all"
                          style={{ width: `${pendingPct}%` }}
                          title={`Pendente: ${totalPending}`}
                        >
                          {pendingPct > 12 && `PENDENTE (${totalPending})`}
                        </div>
                      )}
                      {workingPct > 0 && (
                        <div 
                          className="bg-amber-500 h-full flex items-center justify-center text-slate-950 text-[10px] font-bold font-mono transition-all animate-pulse"
                          style={{ width: `${workingPct}%` }}
                          title={`Conferindo: ${totalWorking}`}
                        >
                          {workingPct > 12 && `CONFERINDO (${totalWorking})`}
                        </div>
                      )}
                      {waitingPct > 0 && (
                        <div 
                          className="bg-indigo-500 h-full flex items-center justify-center text-white text-[10px] font-bold font-mono transition-all"
                          style={{ width: `${waitingPct}%` }}
                          title={`Aguardando Conciliação: ${totalWaiting}`}
                        >
                          {waitingPct > 12 && `CONCILIAR (${totalWaiting})`}
                        </div>
                      )}
                      {reconciledPct > 0 && (
                        <div 
                          className="bg-emerald-600 h-full flex items-center justify-center text-white text-[10px] font-bold font-mono transition-all"
                          style={{ width: `${reconciledPct}%` }}
                          title={`Baixados: ${totalReconciled}`}
                        >
                          {reconciledPct > 12 && `BAIXADOS (${totalReconciled})`}
                        </div>
                      )}
                    </div>

                    {/* Legend Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div className="p-2.5 bg-red-50/50 rounded-xl border border-red-100">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block font-mono">1. Pendente</span>
                        <span className="text-base font-extrabold font-sans text-red-600 block mt-0.5">{totalPending}</span>
                      </div>
                      <div className="p-2.5 bg-amber-50/50 rounded-xl border border-amber-100">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block font-mono">2. Conferindo</span>
                        <span className="text-base font-extrabold font-sans text-amber-600 block mt-0.5">{totalWorking}</span>
                      </div>
                      <div className="p-2.5 bg-indigo-50/50 rounded-xl border border-indigo-100">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block font-mono">3. Conciliar</span>
                        <span className="text-base font-extrabold font-sans text-indigo-600 block mt-0.5">{totalWaiting}</span>
                      </div>
                      <div className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block font-mono">4. Baixados</span>
                        <span className="text-base font-extrabold font-sans text-emerald-600 block mt-0.5">{totalReconciled}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Three-Column Board */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Column 1: Sendo Trabalhados / Em Aberto */}
              <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h3 className="font-sans font-bold text-slate-900 text-sm uppercase flex items-center space-x-1.5">
                    <Clock className="h-4.5 w-4.5 text-amber-500" />
                    <span>Sendo Trabalhados</span>
                  </h3>
                  <span className="bg-amber-100 text-amber-800 text-xxs font-extrabold px-2 py-0.5 rounded-full font-mono">
                    {importedRoutes.filter(r => r.status !== 'fechado' && r.status !== 'em_analise').length} mapas
                  </span>
                </div>

                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                  {importedRoutes.filter(r => r.status !== 'fechado' && r.status !== 'em_analise').length === 0 ? (
                    <div className="text-center py-8 text-xxs italic text-slate-400 bg-slate-50 border border-dashed rounded-lg">
                      Nenhum mapa sendo trabalhado.
                    </div>
                  ) : (
                    importedRoutes.filter(r => r.status !== 'fechado' && r.status !== 'em_analise').map(route => {
                      const isPendente = route.status === 'pendente' || !route.status;
                      const isConferindo = route.status === 'conferindo';
                      const isEmAnalise = route.status === 'em_analise';
                      const isReconferir = route.status === 'reconferir';

                      let badgeColor = "bg-red-100 text-red-800 border-red-200";
                      let statusText = "Pendente";
                      if (isConferindo) {
                        badgeColor = "bg-amber-100 text-amber-800 border-amber-200 animate-pulse";
                        statusText = "Conferindo";
                      } else if (isEmAnalise) {
                        badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
                        statusText = "Em Análise";
                      } else if (isReconferir) {
                        badgeColor = "bg-purple-100 text-purple-800 border-purple-200 animate-pulse";
                        statusText = "Pedida Recontagem";
                      }

                      return (
                        <div key={route.id} className="p-3 bg-slate-50/60 rounded-xl border border-slate-200 space-y-2 text-xxs">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-extrabold text-slate-900 font-sans block text-sm">{route.routeMap}</span>
                              <span className="font-mono text-[9px] text-slate-400">Placa: {route.plate}</span>
                            </div>
                            <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${badgeColor}`}>
                              {statusText}
                            </span>
                          </div>
                          <div className="text-slate-500 space-y-0.5 pt-1 border-t border-slate-100">
                            <div><strong>Motorista:</strong> {getDriverName(route.driverId)}</div>
                            <div className="text-[9px]">Importado: {new Date(route.importedAt).toLocaleTimeString('pt-BR')}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Column 2: Aguardando Reconciliação (Pendentes) */}
              <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h3 className="font-sans font-bold text-slate-900 text-sm uppercase flex items-center space-x-1.5">
                    <ShieldAlert className="h-4.5 w-4.5 text-indigo-600 animate-pulse" />
                    <span>Aguardando Conciliação</span>
                  </h3>
                  <span className="bg-indigo-100 text-indigo-800 text-xxs font-extrabold px-2 py-0.5 rounded-full font-mono">
                    {pendingAudits.length} rotas
                  </span>
                </div>

                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                  {pendingAudits.length === 0 ? (
                    <div className="text-center py-8 text-xxs italic text-slate-400 bg-slate-50 border border-dashed rounded-lg">
                      Nenhuma conferência física aguardando conciliação.
                    </div>
                  ) : (
                    pendingAudits.map((audit) => {
                      const wasReaudited = audit.history.some(h => h.action.includes('Reconferência'));
                      return (
                        <div key={audit.id} className="p-3 bg-slate-50/60 rounded-xl border border-slate-200 hover:border-indigo-300 transition-all space-y-2.5 text-xxs flex flex-col justify-between">
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-extrabold text-slate-900 font-sans block text-sm">{audit.routeMap}</span>
                                <span className="font-mono text-[9px] text-slate-400">Placa: {audit.plate}</span>
                              </div>
                              <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                                wasReaudited 
                                  ? 'bg-purple-100 text-purple-800 border-purple-200' 
                                  : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              }`}>
                                {wasReaudited ? '♻️ Reconferido' : 'Conferido'}
                              </span>
                            </div>

                            <div className="text-slate-500 space-y-0.5 pt-1 border-t border-slate-100">
                              <div><strong>Motorista:</strong> {getDriverName(audit.driverId)}</div>
                              <div><strong>Duração:</strong> {getDurationText(audit.startTime, audit.endTime)}</div>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              // Initialize fiscal quantities to empty (undefined) by default until manually entered
                              const initializedSession = {
                                ...audit,
                                items: audit.items.map(i => {
                                  // Remain empty/undefined unless already set
                                  const fQty = i.fiscalQty !== undefined ? i.fiscalQty : undefined;
                                  return { ...i, fiscalQty: fQty };
                                }),
                                assets: audit.assets.map(a => ({
                                  ...a,
                                  fiscalQty: a.fiscalQty !== undefined ? a.fiscalQty : undefined
                                })),
                                exchanges: audit.exchanges && audit.exchanges.length > 0 ? audit.exchanges : (() => {
                                  if (audit.unifiedMaps && audit.unifiedMaps.length > 0) {
                                    const combinedExchangesMap: { [key: string]: AuditExchangeItem } = {};
                                    audit.unifiedMaps.forEach(mapCode => {
                                      const r = importedRoutes.find(route => route.routeMap.toUpperCase() === mapCode.toUpperCase());
                                      if (r && r.exchanges) {
                                        r.exchanges.forEach(ex => {
                                          const key = `${ex.productCode}_${ex.type}`;
                                          if (combinedExchangesMap[key]) {
                                            combinedExchangesMap[key].qty += ex.qty;
                                          } else {
                                            combinedExchangesMap[key] = { ...ex };
                                          }
                                        });
                                      }
                                    });
                                    return Object.values(combinedExchangesMap);
                                  } else {
                                    const matchingRoute = importedRoutes.find(r => r.routeMap.toUpperCase() === audit.routeMap.trim().toUpperCase());
                                    return (matchingRoute && matchingRoute.exchanges && matchingRoute.exchanges.length > 0)
                                      ? matchingRoute.exchanges
                                      : [];
                                  }
                                })()
                              };
                              
                              let combinedNotes = initializedSession.reconciliationNotes || '';
                              if (!combinedNotes) {
                                const mapsToSearch = (initializedSession.unifiedMaps && initializedSession.unifiedMaps.length > 0)
                                  ? initializedSession.unifiedMaps
                                  : [initializedSession.routeMap];
                                
                                const obsList: string[] = [];
                                mapsToSearch.forEach(m => {
                                  const r = importedRoutes.find(route => route.routeMap.toUpperCase() === m.toUpperCase());
                                  if (r) {
                                    if (r.routeObservations && r.routeObservations.length > 0) {
                                      r.routeObservations.forEach(o => {
                                        obsList.push(`[${o.author}]: ${o.text}`);
                                      });
                                    } else if (r.discrepancyObservation) {
                                      obsList.push(`[Monitoramento/Obs]: ${r.discrepancyObservation}`);
                                    }
                                  }
                                });
                                combinedNotes = obsList.join('\n');
                              }
                              setReconciliationNotes(combinedNotes);
                              setActiveSession(initializedSession);
                            }}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-1.5 px-2.5 rounded-lg flex items-center justify-center space-x-1 shadow-2xs transition-all cursor-pointer"
                          >
                            <span>Conciliar</span>
                            <ArrowRight className="h-3 w-3 text-amber-500" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Column 3: Dados Baixa Hoje (Reconciliados / Fechados) */}
              <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h3 className="font-sans font-bold text-slate-900 text-sm uppercase flex items-center space-x-1.5">
                    <CheckSquare className="h-4.5 w-4.5 text-emerald-600" />
                    <span>Dados Baixa Hoje</span>
                  </h3>
                  <span className="bg-emerald-100 text-emerald-800 text-xxs font-extrabold px-2 py-0.5 rounded-full font-mono">
                    {audits.filter(a => a.status === 'finalizado_ok' || a.status === 'finalizado_divergente').length} rotas
                  </span>
                </div>

                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                  {(() => {
                    const reconciledToday = audits.filter(a => a.status === 'finalizado_ok' || a.status === 'finalizado_divergente');
                    if (reconciledToday.length === 0) {
                      return (
                        <div className="text-center py-8 text-xxs italic text-slate-400 bg-slate-50 border border-dashed rounded-lg">
                          Nenhuma rota baixada hoje.
                        </div>
                      );
                    }

                    return reconciledToday.map((audit) => {
                      const isOk = audit.status === 'finalizado_ok';
                      const discrepancyStats = getDiscrepancyTotals(audit);
                      return (
                        <div key={audit.id} className="p-3 bg-slate-50/60 rounded-xl border border-slate-200 space-y-2 text-xxs">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-extrabold text-slate-900 font-sans block text-sm">{audit.routeMap}</span>
                              <span className="font-mono text-[9px] text-slate-400">Placa: {audit.plate}</span>
                            </div>
                            <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                              isOk 
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                                : 'bg-red-100 text-red-800 border-red-200'
                            }`}>
                              {isOk ? '100% OK' : 'Divergente'}
                            </span>
                          </div>

                          <div className="text-slate-500 space-y-0.5 pt-1 border-t border-slate-100">
                            <div><strong>Motorista:</strong> {getDriverName(audit.driverId)}</div>
                            {!isOk && (
                              <div className="font-bold text-red-600 text-[9px]">
                                {discrepancyStats.missingCount > 0 && `Faltas: ${discrepancyStats.missingCount} | `}
                                {discrepancyStats.surplusCount > 0 && `Sobras: ${discrepancyStats.surplusCount}`}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

            </div>
          </div>
          )}

          {/* Section: Today's History */}
          {activeTab === 'historico' && (
            <div className="space-y-8 animate-fade-in" id="tab_historico">
              
              {/* 1. DASHBOARD COM STATUS E QUANTIDADES */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-xl shadow-md border border-slate-750">
                <h3 className="font-sans font-bold text-xs text-amber-500 uppercase tracking-widest mb-4">
                  Dashboard de Status & Quantidades do Histórico
                </h3>
                
                {(() => {
                  const totalMaps = filteredHistory.length;
                  const okMaps = filteredHistory.filter(a => a.status === 'finalizado_ok').length;
                  const divMaps = filteredHistory.filter(a => a.status === 'finalizado_divergente').length;

                  let missingQtyTotal = 0;
                  let surplusQtyTotal = 0;
                  let lossValueTotal = 0;
                  let surplusValueTotal = 0;

                  filteredHistory.forEach(audit => {
                    const disc = getDiscrepancyTotals(audit);
                    missingQtyTotal += disc.missingCount;
                    surplusQtyTotal += disc.surplusCount;
                    lossValueTotal += disc.missingCost;
                    surplusValueTotal += disc.surplusCost;
                  });

                  return (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/60 text-center">
                        <span className="text-[10px] text-slate-400 font-mono uppercase block">Total Baixas</span>
                        <span className="text-xl font-bold text-white block mt-1">{totalMaps} mapas</span>
                      </div>

                      <div className="bg-emerald-950/40 p-3 rounded-lg border border-emerald-900/40 text-center">
                        <span className="text-[10px] text-emerald-400 font-mono uppercase block">Status 100% OK</span>
                        <span className="text-xl font-bold text-emerald-300 block mt-1">{okMaps} mapas</span>
                      </div>

                      <div className="bg-red-950/40 p-3 rounded-lg border border-red-900/40 text-center">
                        <span className="text-[10px] text-red-400 font-mono uppercase block">Com Divergência</span>
                        <span className="text-xl font-bold text-red-300 block mt-1">{divMaps} mapas</span>
                      </div>

                      <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/60 text-center">
                        <span className="text-[10px] text-slate-400 font-mono uppercase block">Total Faltas (Qtd)</span>
                        <span className="text-xl font-bold text-red-400 block mt-1">{missingQtyTotal} itens</span>
                        <span className="text-[9px] text-red-500 block">-R$ {lossValueTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                      </div>

                      <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/60 text-center">
                        <span className="text-[10px] text-slate-400 font-mono uppercase block">Total Sobras (Qtd)</span>
                        <span className="text-xl font-bold text-amber-400 block mt-1">{surplusQtyTotal} itens</span>
                        <span className="text-[9px] text-amber-500 block">+R$ {surplusValueTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 2. FILTROS DE PESQUISA */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <span className="text-xxs font-mono font-bold text-slate-400 uppercase block mb-3">
                  Filtros Avançados de Busca
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Date Start */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-semibold uppercase">De (Data de Chegada):</label>
                    <input
                      type="date"
                      value={historyStartDate}
                      onChange={(e) => setHistoryStartDate(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  {/* Date End */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-semibold uppercase">Até (Data de Chegada):</label>
                    <input
                      type="date"
                      value={historyEndDate}
                      onChange={(e) => setHistoryEndDate(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  {/* Search bar */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-semibold uppercase">Buscar Mapa/Placa/Motorista:</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Ex: MAPA-ROTA-142..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 pl-8 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      <Search className="absolute left-2.5 top-3 h-3.5 w-3.5 text-slate-400" />
                    </div>
                  </div>

                  {/* Status switcher */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-semibold uppercase">Status da Conciliação:</label>
                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 h-9 items-center">
                      <button
                        onClick={() => setStatusFilter('all')}
                        className={`flex-1 text-center py-1 text-xs rounded font-medium transition ${
                          statusFilter === 'all' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        Todos
                      </button>
                      <button
                        onClick={() => setStatusFilter('ok')}
                        className={`flex-1 text-center py-1 text-xs rounded font-medium transition ${
                          statusFilter === 'ok' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        OK
                      </button>
                      <button
                        onClick={() => setStatusFilter('divergentes')}
                        className={`flex-1 text-center py-1 text-xs rounded font-medium transition ${
                          statusFilter === 'divergentes' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        Divergentes
                      </button>
                    </div>
                  </div>
                </div>

                {(historyStartDate || historyEndDate || searchTerm || statusFilter !== 'all') && (
                  <div className="flex justify-end mt-3">
                    <button
                      onClick={() => {
                        setHistoryStartDate('');
                        setHistoryEndDate('');
                        setSearchTerm('');
                        setStatusFilter('all');
                      }}
                      className="text-xxs font-bold text-red-600 hover:text-red-700 flex items-center space-x-1 cursor-pointer"
                    >
                      <XCircle className="h-3 w-3" />
                      <span>Limpar Filtros</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 3. GRID DE CARTÕES DE MAPAS BAIXADOS */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="pb-3 border-b border-slate-100 mb-6 flex justify-between items-center">
                  <h2 className="font-sans font-bold text-sm text-slate-900 uppercase">
                    Registros Baixados ({filteredHistory.length})
                  </h2>
                  <span className="text-xxs text-slate-400">Clique em qualquer mapa para visualizar todo o detalhamento</span>
                </div>

                {filteredHistory.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-400 text-xs">
                    Nenhum mapa baixado coincide com os filtros aplicados.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredHistory.map((audit) => {
                      const stats = getDiscrepancyTotals(audit);
                      const isOk = audit.status === 'finalizado_ok';
                      return (
                        <div 
                          key={audit.id} 
                          onClick={() => setSelectedHistoryAudit(audit)}
                          className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-white hover:border-amber-400 hover:shadow-sm cursor-pointer transition-all space-y-3 flex flex-col justify-between"
                        >
                          <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                            <div className="flex items-center space-x-2">
                              <div className={`p-1.5 rounded-lg ${isOk ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                <FileSpreadsheet className="h-4 w-4" />
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block text-xs sm:text-sm">{audit.routeMap}</span>
                                <span className="font-mono text-[9px] text-slate-400">Placa: {audit.plate}</span>
                              </div>
                            </div>
                            <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                              isOk 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}>
                              {isOk ? '100% OK' : 'Divergente'}
                            </span>
                          </div>

                          <div className="text-xxs text-slate-500 space-y-1">
                            <div><strong>Motorista:</strong> {getDriverName(audit.driverId)}</div>
                            <div><strong>Data Chegada:</strong> {new Date(audit.arrivalDate + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
                            <div><strong>Tempo de Auditoria:</strong> {getDurationText(audit.startTime, audit.endTime)}</div>
                            
                            {!isOk && (
                              <div className="bg-red-50 text-red-700 border border-red-100 p-1.5 rounded font-semibold mt-2 text-[9px] flex justify-between items-center">
                                <span>Faltas: {stats.missingCount} | Sobras: {stats.surplusCount}</span>
                                <span>Impacto: R$ {(stats.missingCost + stats.surplusCost).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                              </div>
                            )}
                            {isOk && (
                              <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 p-1.5 rounded font-semibold mt-2 text-[9px] text-center">
                                Conformidade Fiscal Aprovada (OK)
                              </div>
                            )}
                          </div>

                          <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-100 text-center font-bold uppercase hover:text-slate-700 flex items-center justify-center space-x-1">
                            <span>Ver Detalhes do Processo</span>
                            <ArrowRight className="h-3 w-3" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 4. MODAL DIALOG COMPACTO PARA DETALHES DO PROCESSO */}
              {selectedHistoryAudit && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    
                    {/* Header */}
                    <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
                      <div className="flex items-center space-x-2.5">
                        <div className="bg-amber-500 text-slate-950 p-1.5 rounded">
                          <FileSpreadsheet className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-sans font-extrabold text-sm sm:text-base leading-tight">
                            Detalhamento do Mapa {selectedHistoryAudit.routeMap}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Placa: {selectedHistoryAudit.plate} • Chegada: {new Date(selectedHistoryAudit.arrivalDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedHistoryAudit(null)}
                        className="bg-slate-800 hover:bg-slate-700 text-white p-1 px-2.5 rounded-lg transition text-xs font-bold font-mono border border-slate-700 cursor-pointer"
                      >
                        Fechar
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto space-y-6">
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold block uppercase">Motorista</span>
                          <span className="text-xs font-semibold text-slate-800 block truncate">{getDriverName(selectedHistoryAudit.driverId)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold block uppercase">Ajudante</span>
                          <span className="text-xs font-semibold text-slate-800 block truncate">{getHelperName(selectedHistoryAudit.helperId)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold block uppercase">Duração</span>
                          <span className="text-xs font-semibold text-slate-800 block font-mono">{getDurationText(selectedHistoryAudit.startTime, selectedHistoryAudit.endTime)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold block uppercase">Status Fiscal</span>
                          <span className={`text-[9px] font-bold uppercase block ${selectedHistoryAudit.status === 'finalizado_ok' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {selectedHistoryAudit.status === 'finalizado_ok' ? '● 100% OK' : '● Divergente'}
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
                                  <th className="p-2.5 text-center">Comodato</th>
                                  <th className="p-2.5 text-center">Recolha</th>
                                  <th className="p-2.5 text-right">Divergência</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-slate-700">
                                {selectedHistoryAudit.assets.map(asset => {
                                  const phys = asset.rePhysicalQty !== undefined ? asset.rePhysicalQty : asset.physicalQty;
                                  const fisc = asset.fiscalQty ?? 0;
                                  const comodato = asset.comodatoQty ?? 0;
                                  const recolha = asset.recolhaQty ?? 0;
                                  const diff = phys - fisc + comodato - recolha;
                                  return (
                                    <tr key={asset.assetId} className="hover:bg-slate-50/50">
                                      <td className="p-2.5 font-medium">{asset.assetName || asset.assetId}</td>
                                      <td className="p-2.5 text-center font-mono">{phys}</td>
                                      <td className="p-2.5 text-center font-mono">{fisc}</td>
                                      <td className="p-2.5 text-center font-mono text-slate-500">{comodato || '-'}</td>
                                      <td className="p-2.5 text-center font-mono text-slate-500">{recolha || '-'}</td>
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

                      {/* Photo Evidences */}
                      <div className="border-t border-slate-150 pt-4">
                        <AuditPhotoViewer auditId={selectedHistoryAudit.id} />
                      </div>

                      {/* Notes */}
                      {selectedHistoryAudit.reconciliationNotes && (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                          <strong className="block text-slate-700 uppercase mb-1">Parecer de Conciliação / Notas:</strong>
                          <p className="text-slate-600 italic">"{selectedHistoryAudit.reconciliationNotes}"</p>
                        </div>
                      )}

                      {/* Event logs */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                          Histórico de Eventos:
                        </span>
                        <div className="space-y-1.5 pl-3 border-l-2 border-slate-200">
                          {selectedHistoryAudit.history.map((h, i) => (
                            <div key={i} className="text-xxs text-slate-500">
                              <span className="font-mono text-slate-400">[{new Date(h.timestamp).toLocaleTimeString('pt-BR')}]</span>{' '}
                              <strong className="text-slate-700">{h.action}</strong> • Realizado por: {h.user}
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

          {/* Section: Sobras & Faltas PA/AG (Divergências) */}
          {activeTab === 'divergencias' && (
            <div className="space-y-6 animate-fade-in" id="tab_divergencias">
              <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
                <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-slate-900">
                      <Shield className="h-6 w-6 text-amber-500 animate-pulse" />
                      <h2 className="font-sans font-bold text-lg uppercase">Controle de Sobras & Faltas</h2>
                    </div>
                    <p className="text-xs text-slate-500">
                      Gerenciamento e acompanhamento de divergências de produtos acabados (PA) e ativos de giro (AG). Sobras requerem dados de cliente (NB) e alinhamento de data de entrega.
                    </p>
                  </div>

                  {/* Gestão Separada de PA e AG */}
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 self-start lg:self-auto">
                    <button
                      type="button"
                      onClick={() => setSubTabDivergencias('all')}
                      className={`px-3 py-1.5 text-xxs font-black uppercase rounded-lg transition-all cursor-pointer ${
                        subTabDivergencias === 'all'
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Ver Tudo
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubTabDivergencias('pa')}
                      className={`px-3 py-1.5 text-xxs font-black uppercase rounded-lg transition-all cursor-pointer ${
                        subTabDivergencias === 'pa'
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Gestão P.A. (Produtos)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubTabDivergencias('ag')}
                      className={`px-3 py-1.5 text-xxs font-black uppercase rounded-lg transition-all cursor-pointer ${
                        subTabDivergencias === 'ag'
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Gestão A.G. (Ativos)
                    </button>
                  </div>
                </div>
              </div>

              {/* Filter controls */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase font-sans">Buscar NB, Mapa ou Placa</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Pesquisar..."
                      value={filterNB}
                      onChange={(e) => setFilterNB(e.target.value)}
                      className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 transition font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase font-sans">Filtrar por Data</label>
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 transition font-semibold font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase font-sans">Tipo de Desvio</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 transition"
                  >
                    <option value="all">Mostrar Todos</option>
                    <option value="sobra">Apenas Sobras (+)</option>
                    <option value="falta">Apenas Faltas (-)</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterNB('');
                      setFilterDate('');
                      setFilterType('all');
                    }}
                    disabled={!filterNB && !filterDate && filterType === 'all'}
                    className="w-full py-2 bg-slate-150 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs font-bold uppercase rounded-lg transition cursor-pointer"
                  >
                    Limpar Filtros
                  </button>
                </div>
              </div>

              {/* Grid of discrepant maps */}
              <div className="grid grid-cols-1 gap-6">
                {(() => {
                  // Find all audits that have discrepancies
                  const discrepantAudits = audits.filter(audit => {
                    const hasProductDiff = audit.items.some(item => {
                      const phys = item.rePhysicalQty !== undefined ? item.rePhysicalQty : item.physicalQty;
                      return phys !== (item.fiscalQty ?? 0);
                    });
                    const hasAssetDiff = audit.assets.some(asset => {
                      const phys = asset.rePhysicalQty !== undefined ? asset.rePhysicalQty : asset.physicalQty;
                      const fisc = asset.fiscalQty ?? 0;
                      const comodato = asset.comodatoQty ?? 0;
                      const recolha = asset.recolhaQty ?? 0;
                      return phys !== (fisc - comodato + recolha);
                    });
                    
                    if (subTabDivergencias === 'pa') return hasProductDiff;
                    if (subTabDivergencias === 'ag') return hasAssetDiff;
                    return hasProductDiff || hasAssetDiff;
                  });

                  // Apply filter controls
                  const filteredAudits = discrepantAudits.filter(audit => {
                    // Filter by NB
                    if (filterNB.trim()) {
                      const nbQuery = filterNB.trim().toLowerCase();
                      const hasMatchedNB = (audit.clientCodeNB || '').toLowerCase().includes(nbQuery) ||
                        audit.routeMap.toLowerCase().includes(nbQuery) ||
                        audit.plate.toLowerCase().includes(nbQuery);
                      if (!hasMatchedNB) return false;
                    }

                    // Filter by Date
                    if (filterDate) {
                      const matchesDate = audit.arrivalDate === filterDate || audit.deliveryDate === filterDate;
                      if (!matchesDate) return false;
                    }

                    // Filter by Type
                    if (filterType !== 'all') {
                      const hasSurplus = audit.items.some(i => {
                        const phys = i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty;
                        return phys > (i.fiscalQty ?? 0);
                      }) || audit.assets.some(a => {
                        const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
                        const fisc = a.fiscalQty ?? 0;
                        const comodato = a.comodatoQty ?? 0;
                        const recolha = a.recolhaQty ?? 0;
                        return (phys - fisc + comodato - recolha) > 0;
                      });

                      const hasDeficit = audit.items.some(i => {
                        const phys = i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty;
                        return phys < (i.fiscalQty ?? 0);
                      }) || audit.assets.some(a => {
                        const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
                        const fisc = a.fiscalQty ?? 0;
                        const comodato = a.comodatoQty ?? 0;
                        const recolha = a.recolhaQty ?? 0;
                        return (phys - fisc + comodato - recolha) < 0;
                      });

                      if (filterType === 'sobra' && !hasSurplus) return false;
                      if (filterType === 'falta' && !hasDeficit) return false;
                    }

                    return true;
                  });

                  if (filteredAudits.length === 0) {
                    return (
                      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
                        {discrepantAudits.length === 0 
                          ? "Nenhum mapa com sobras ou faltas registrado até o momento."
                          : "Nenhum resultado corresponde aos filtros aplicados."}
                      </div>
                    );
                  }

                  return filteredAudits.map(audit => {
                    // Check the 30-day "ENVIO NO PRAZO" status
                    const arrivalDateObj = new Date(audit.arrivalDate + 'T00:00:00');
                    const daysElapsed = Math.floor((new Date().getTime() - arrivalDateObj.getTime()) / (1000 * 60 * 60 * 24));
                    const isWithin30Days = daysElapsed <= 30;

                    // Get list of surpluses
                    const surpluses = [
                      ...audit.items.filter(i => (i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty) > (i.fiscalQty ?? 0)).map(i => ({
                        description: i.productDescription,
                        qty: (i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty) - (i.fiscalQty ?? 0),
                        unit: 'cx',
                        type: 'PA'
                      })),
                      ...audit.assets.filter(a => {
                        const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
                        const fisc = a.fiscalQty ?? 0;
                        const comodato = a.comodatoQty ?? 0;
                        const recolha = a.recolhaQty ?? 0;
                        return (phys - fisc + comodato - recolha) > 0;
                      }).map(a => {
                        const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
                        const fisc = a.fiscalQty ?? 0;
                        const comodato = a.comodatoQty ?? 0;
                        const recolha = a.recolhaQty ?? 0;
                        return {
                          description: a.assetName,
                          qty: phys - fisc + comodato - recolha,
                          unit: 'un',
                          type: 'AG'
                        };
                      })
                    ].filter(s => {
                      if (subTabDivergencias === 'pa') return s.type === 'PA';
                      if (subTabDivergencias === 'ag') return s.type === 'AG';
                      return true;
                    });

                    // Get list of deficits
                    const deficits = [
                      ...audit.items.filter(i => (i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty) < (i.fiscalQty ?? 0)).map(i => ({
                        description: i.productDescription,
                        qty: (i.fiscalQty ?? 0) - (i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty),
                        unit: 'cx',
                        type: 'PA'
                      })),
                      ...audit.assets.filter(a => {
                        const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
                        const fisc = a.fiscalQty ?? 0;
                        const comodato = a.comodatoQty ?? 0;
                        const recolha = a.recolhaQty ?? 0;
                        return (phys - fisc + comodato - recolha) < 0;
                      }).map(a => {
                        const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
                        const fisc = a.fiscalQty ?? 0;
                        const comodato = a.comodatoQty ?? 0;
                        const recolha = a.recolhaQty ?? 0;
                        return {
                          description: a.assetName,
                          qty: Math.abs(phys - fisc + comodato - recolha),
                          unit: 'un',
                          type: 'AG'
                        };
                      })
                    ].filter(d => {
                      if (subTabDivergencias === 'pa') return d.type === 'PA';
                      if (subTabDivergencias === 'ag') return d.type === 'AG';
                      return true;
                    });

                    return (
                      <div key={audit.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4 hover:border-slate-300 transition">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-sans font-black text-sm text-slate-900 bg-slate-100 px-2 py-0.5 rounded font-mono">Mapa {audit.routeMap}</span>
                              <span className="font-mono text-xs text-slate-500">{audit.plate}</span>
                              <span className="text-xxs text-slate-400 font-mono">Data: {new Date(audit.arrivalDate + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                            </div>
                            <div className="text-xxs text-slate-400 mt-1">
                              Motorista: <strong>{getDriverName(audit.driverId)}</strong>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {/* 30 Days Status Badge */}
                            {audit.surplusFlowStatus === 'ENVIADO' ? (
                              <span className="text-[10px] bg-emerald-600 text-white font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                ENVIADO
                              </span>
                            ) : isWithin30Days ? (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                ENVIO NO PRAZO
                              </span>
                            ) : (
                              <span className="text-[10px] bg-red-100 text-red-800 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                FORA DO PRAZO ({daysElapsed} dias)
                              </span>
                            )}

                            {audit.surplusFlowStatus === 'ENCAMINHADO' && !audit.gestorAlignedDeliveryDate && (
                              <span className="text-[10px] bg-amber-100 text-amber-900 font-black px-2.5 py-0.5 rounded-full animate-pulse uppercase tracking-wider">
                                AGUARDANDO GESTOR
                              </span>
                            )}
                            {audit.gestorAlignedDeliveryDate && audit.surplusFlowStatus !== 'ENVIADO' && (
                              <span className="text-[10px] bg-blue-100 text-blue-900 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                DATA ALINHADA PELO GESTOR
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Surpluses & Deficits Lists */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Sobras */}
                          <div className="bg-amber-50/30 border border-amber-100 rounded-xl p-4 space-y-2">
                            <h4 className="text-xs font-black text-amber-900 uppercase flex items-center space-x-1.5">
                              <span className="h-1.5 w-1.5 bg-amber-500 rounded-full" />
                              <span>Sobra Detectada</span>
                            </h4>
                            {surpluses.length === 0 ? (
                              <p className="text-slate-400 italic text-[11px]">Nenhuma sobra identificada.</p>
                            ) : (
                              <div className="space-y-1">
                                {surpluses.map((s, idx) => (
                                  <div key={idx} className="flex justify-between items-center text-xs text-amber-950 font-medium">
                                    <div className="flex items-center space-x-1.5">
                                      <span className="text-[9px] bg-amber-200 text-amber-900 font-black px-1 rounded font-mono">{s.type}</span>
                                      <span>{s.description}</span>
                                    </div>
                                    <span className="font-mono font-bold">+{s.qty} {s.unit}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Faltas */}
                          <div className="bg-red-50/20 border border-red-100 rounded-xl p-4 space-y-2">
                            <h4 className="text-xs font-black text-red-950 uppercase flex items-center space-x-1.5">
                              <span className="h-1.5 w-1.5 bg-red-500 rounded-full" />
                              <span>Falta Detectada</span>
                            </h4>
                            {deficits.length === 0 ? (
                              <p className="text-slate-400 italic text-[11px]">Nenhuma falta identificada.</p>
                            ) : (
                              <div className="space-y-1">
                                {deficits.map((d, idx) => (
                                  <div key={idx} className="flex justify-between items-center text-xs text-red-950 font-medium">
                                    <div className="flex items-center space-x-1.5">
                                      <span className="text-[9px] bg-red-200 text-red-900 font-black px-1 rounded font-mono">{d.type}</span>
                                      <span>{d.description}</span>
                                    </div>
                                    <span className="font-mono font-bold">-{d.qty} {d.unit}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Monitoramento Form or Display */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-150 space-y-3">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
                            Fluxo de Roteamento de Sobra (Ações e Registro)
                          </span>

                          {/* Interactive Section */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-sans">NB (Código Cliente)</label>
                              <input
                                type="text"
                                placeholder="NB do Cliente..."
                                disabled={currentUser.role !== 'monitoramento' && currentUser.role !== 'gestor'}
                                defaultValue={audit.clientCodeNB || ''}
                                id={`nb_input_${audit.id}`}
                                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none font-mono"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-sans">Data de Entrega</label>
                              <input
                                type="date"
                                disabled={currentUser.role !== 'monitoramento' && currentUser.role !== 'gestor'}
                                defaultValue={audit.deliveryDate || ''}
                                id={`date_input_${audit.id}`}
                                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none"
                              />
                            </div>

                            <div className="flex gap-2">
                              {/* Monitoramento or Gestor Save Button */}
                              {(currentUser.role === 'monitoramento' || currentUser.role === 'gestor') && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nbVal = (document.getElementById(`nb_input_${audit.id}`) as HTMLInputElement)?.value || '';
                                    const dateVal = (document.getElementById(`date_input_${audit.id}`) as HTMLInputElement)?.value || '';
                                    if (!nbVal || !dateVal) {
                                      alert('Por favor, informe o código NB do cliente e a data de entrega.');
                                      return;
                                    }
                                    const isGestor = currentUser.role === 'gestor';
                                    const updated = audits.map(a => {
                                      if (a.id === audit.id) {
                                        return {
                                          ...a,
                                          clientCodeNB: nbVal,
                                          deliveryDate: dateVal,
                                          surplusFlowStatus: 'ENCAMINHADO' as const,
                                          gestorAlignedDeliveryDate: isGestor ? true : false,
                                          history: [
                                            ...a.history,
                                            {
                                              timestamp: new Date().toISOString(),
                                              action: isGestor ? 'Sobra Alinhada e Registrada pelo Gestor' : 'Previsão de Entrega da Sobra Informada',
                                              user: currentUser.name,
                                              details: isGestor 
                                                ? `NB: ${nbVal} | Data de Entrega: ${dateVal}. Alinhamento automático efetuado pelo Gestor.`
                                                : `NB: ${nbVal} | Data de Entrega: ${dateVal}. Encaminhado ao gestor para alinhamento.`
                                            }
                                          ]
                                        };
                                      }
                                      return a;
                                    });
                                    onSaveAudits(updated);
                                    if (isGestor) {
                                      alert('Dados salvos e data de entrega alinhada pelo Gestor!');
                                    } else {
                                      alert('Dados salvos! Uma notificação foi enviada ao gestor para alinhamento da data.');
                                    }
                                  }}
                                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs py-2 px-3 rounded-lg transition cursor-pointer shadow-sm text-center"
                                >
                                  {currentUser.role === 'gestor' ? 'Salvar e Alinhar' : 'Salvar e Encaminhar'}
                                </button>
                              )}

                              {/* Gestor Aligned Notification Button */}
                              {currentUser.role === 'gestor' && audit.surplusFlowStatus === 'ENCAMINHADO' && !audit.gestorAlignedDeliveryDate && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = audits.map(a => {
                                      if (a.id === audit.id) {
                                        return {
                                          ...a,
                                          gestorAlignedDeliveryDate: true,
                                          history: [
                                            ...a.history,
                                            {
                                              timestamp: new Date().toISOString(),
                                              action: 'Data de Entrega Alinhada pelo Gestor',
                                              user: currentUser.name,
                                              details: `Data de Entrega alinhada: ${a.deliveryDate}`
                                            }
                                          ]
                                        };
                                      }
                                      return a;
                                    });
                                    onSaveAudits(updated);
                                    alert('Data de entrega alinhada com sucesso!');
                                  }}
                                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-3 rounded-lg transition cursor-pointer shadow-sm text-center"
                                >
                                  Alinhar Data de Entrega
                                </button>
                              )}

                              {/* Dar Baixa (Resolvido) button for Auxiliar or anyone after encaminhado */}
                              {audit.surplusFlowStatus === 'ENCAMINHADO' && (
                                <button
                                  type="button"
                                  disabled={!audit.gestorAlignedDeliveryDate && currentUser.role === 'auxiliar_logistica'}
                                  onClick={() => {
                                    const updated = audits.map(a => {
                                      if (a.id === audit.id) {
                                        return {
                                          ...a,
                                          surplusFlowStatus: 'ENVIADO' as const,
                                          surplusActionStatus: 'enviado_cliente' as const,
                                          history: [
                                            ...a.history,
                                            {
                                              timestamp: new Date().toISOString(),
                                              action: 'Baixa de Sobras Realizada - Enviado',
                                              user: currentUser.name,
                                              details: `Status de fluxo finalizado como ENVIADO.`
                                            }
                                          ]
                                        };
                                      }
                                      return a;
                                    });
                                    onSaveAudits(updated);
                                    alert('Baixa efetuada! O status foi alterado para ENVIADO.');
                                  }}
                                  className={`flex-1 font-bold text-xs py-2 px-3 rounded-lg transition shadow-sm text-center cursor-pointer ${
                                    audit.gestorAlignedDeliveryDate || currentUser.role === 'gestor'
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                  }`}
                                  title={!audit.gestorAlignedDeliveryDate && currentUser.role !== 'gestor' ? 'Aguardando o gestor alinhar a data de entrega para permitir a baixa' : 'Dar baixa e marcar como enviado'}
                                >
                                  Dar Baixa (Enviado)
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Show saved values */}
                          {(audit.clientCodeNB || audit.deliveryDate) && (
                            <div className="flex flex-wrap gap-4 pt-2 text-xs border-t border-slate-200 text-slate-600">
                              <div><strong>Código NB:</strong> <span className="font-mono bg-white border border-slate-200 px-1 py-0.5 rounded text-slate-800">{audit.clientCodeNB || 'N/A'}</span></div>
                              <div><strong>Previsão de Entrega:</strong> <span className="font-mono bg-white border border-slate-200 px-1 py-0.5 rounded text-slate-800">{audit.deliveryDate ? new Date(audit.deliveryDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</span></div>
                              {audit.gestorAlignedDeliveryDate && (
                                <div className="text-emerald-600 font-bold flex items-center space-x-1">
                                  <span>✓ Alinhado pelo Gestor</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Ações Sugeridas & Seção de Observações Salvas */}
                          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mt-3 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                              <div className="flex items-center space-x-1.5 text-amber-800">
                                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                                <span className="text-xs font-black uppercase tracking-wider font-sans font-bold">Ação Sugerida do Sistema</span>
                              </div>
                              {/* Botão de gerar vale financeiro se houver faltas */}
                              {deficits.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const valorFalta = audit.items.reduce((acc, i) => {
                                      const phys = i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty;
                                      const fQty = i.fiscalQty ?? 0;
                                      if (phys < fQty) return acc + ((fQty - phys) * getSkuClosedPrice(i.productCode, i.cost ?? 45.0));
                                      return acc;
                                    }, 0) + audit.assets.reduce((acc, a) => {
                                      const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
                                      const fQty = a.fiscalQty ?? 0;
                                      if (phys < fQty) return acc + ((fQty - phys) * (a.cost ?? 18.0));
                                      return acc;
                                    }, 0);

                                    const descFalta = deficits.map(d => `${d.qty}x ${d.description}`).join(', ');
                                    const motoristaNome = getDriverName(audit.driverId);

                                    const novoVale = {
                                      id: 'val_' + Date.now(),
                                      auditId: audit.id,
                                      routeMap: audit.routeMap,
                                      colaboradorId: audit.driverId,
                                      colaboradorName: motoristaNome,
                                      colaboradorRole: 'MOTORISTA',
                                      valor: Number(valorFalta.toFixed(2)) || 80.0,
                                      descricao: `Falta de: ${descFalta}. Mapa: ${audit.routeMap}`,
                                      dataGeracao: new Date().toISOString().split('T')[0],
                                      status: 'PENDENTE_ASSINATURA' as const,
                                      observacao: 'Gerado automaticamente por desvios identificados na aferição física.'
                                    };

                                    onSaveVales([...vales, novoVale]);
                                    alert(`Sucesso! Vale financeiro autogerado no valor de R$ ${novoVale.valor.toFixed(2)} para ${novoVale.colaboradorName}.`);
                                  }}
                                  className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-[10px] uppercase py-1 px-2.5 rounded-lg transition shadow-xs cursor-pointer flex items-center space-x-1 shrink-0"
                                >
                                  <FileText className="h-3 w-3" />
                                  <span>Gerar Vale Financeiro</span>
                                </button>
                              )}
                            </div>

                            <p className="text-[11px] text-slate-600 leading-relaxed">
                              {deficits.length > 0 
                                ? `Detectada Falta Física de ${deficits.map(d => `${d.qty} ${d.unit} de ${d.description}`).join(', ')}. Ação sugerida: Gerar e emitir Vale de Desconto para o motorista/ajudante responsável ou coletar justificativa assinada pelo fiscal de expedição.`
                                : `Detectada Sobra Física de ${surpluses.map(s => `${s.qty} ${s.unit} de ${s.description}`).join(', ')}. Ação sugerida: Identificar e inserir o código NB do cliente, alinhar data estimada de entrega e encaminhar ao gestor para efetivar baixa física.`
                              }
                            </p>

                            {/* Caixa de Comentário / Observação de Ação */}
                            <div className="space-y-1.5 pt-1">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase font-sans">Comentários e Observações da Ação Executada</label>
                              <textarea
                                id={`action_comment_${audit.id}`}
                                rows={2}
                                placeholder="Coloque observações, observações de recontagem, decisões de vales ou andamento da reentrega..."
                                defaultValue={audit.reconciliationNotes || ''}
                                className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 transition leading-normal font-sans"
                              />
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] text-slate-400 font-medium">Os comentários salvos aparecem diretamente neste card e no histórico.</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const valInput = (document.getElementById(`action_comment_${audit.id}`) as HTMLTextAreaElement)?.value || '';
                                    const updated = audits.map(a => {
                                      if (a.id === audit.id) {
                                        return {
                                          ...a,
                                          reconciliationNotes: valInput,
                                          history: [
                                            ...a.history,
                                            {
                                              timestamp: new Date().toISOString(),
                                              action: 'Observação da Ação Salva no Card',
                                              user: currentUser.name,
                                              details: valInput
                                            }
                                          ]
                                        };
                                      }
                                      return a;
                                    });
                                    onSaveAudits(updated);
                                    alert('Comentário e observação do card salvos com sucesso!');
                                  }}
                                  className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[10px] uppercase py-1 px-3 rounded-lg transition cursor-pointer"
                                >
                                  Salvar Comentário
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* Section: Gestão de Vales (Vales View) */}
          {activeTab === 'vales_view' && (
            <div className="space-y-6 animate-fade-in" id="tab_vales_view">
              <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center space-x-2 text-slate-900">
                  <FileText className="h-6 w-6 text-red-500 animate-pulse" />
                  <h2 className="font-sans font-bold text-lg uppercase">Controle & Emissão de Vales de Desvio</h2>
                </div>
                <p className="text-xs text-slate-500">
                  Registro, controle e assinatura de termos de responsabilidade de vales para desvios de conferência (produtos faltantes ou ativos de giro danificados).
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form to Issue Vale (Left) */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-xs h-fit">
                  <h3 className="font-sans font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 flex items-center space-x-1.5 font-bold">
                    <Plus className="h-4 w-4 text-amber-500" />
                    <span>Emitir Novo Vale de Desconto</span>
                  </h3>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase font-sans">Selecionar Colaborador</label>
                      <select
                        value={valeColaboradorId}
                        onChange={(e) => setValeColaboradorId(e.target.value)}
                        className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 transition"
                      >
                        <option value="">Selecione o colaborador...</option>
                        {/* Motoristas */}
                        <optgroup label="Motoristas">
                          {drivers.map(d => (
                            <option key={d.id} value={d.id}>{d.name} (Motorista)</option>
                          ))}
                        </optgroup>
                        {/* Conferentes / Outros */}
                        <optgroup label="Outros Papéis">
                          <option value="conferente_01">João Conferente (CONFERENTE)</option>
                          <option value="conferente_02">Pedro Ajudante (CONFERENTE)</option>
                          <option value="auxiliar_envio">Auxiliar de Envio de Sobras (AUXILIAR)</option>
                        </optgroup>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase font-sans">Mapa / Rota Relacionado</label>
                      <select
                        value={valeRouteMap}
                        onChange={(e) => {
                          const selectedMap = e.target.value;
                          setValeRouteMap(selectedMap);
                          if (!selectedMap) {
                            setValeColaboradorId('');
                            setValeValeValor('');
                            setValeDescricao('');
                            return;
                          }

                          // Find matching audit session
                          const matchingAudit = audits.find(a => a.routeMap.toUpperCase() === selectedMap.toUpperCase());
                          if (matchingAudit) {
                            // 1. Auto-select driver
                            if (matchingAudit.driverId) {
                              setValeColaboradorId(matchingAudit.driverId);
                            }

                            // 2. Calculate total shortage cost and build a descriptive string
                            let totalShortageValue = 0;
                            const descriptionParts: string[] = [];

                            matchingAudit.items.forEach(i => {
                              const phys = i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty;
                              const fisc = i.fiscalQty ?? 0;
                              if (phys < fisc) {
                                const diff = fisc - phys;
                                const unitCost = getSkuClosedPrice(i.productCode, i.cost ?? 45.0);
                                totalShortageValue += diff * unitCost;
                                descriptionParts.push(`Falta de ${diff} cx de ${i.productDescription || 'Produto'}`);
                              }
                            });

                            matchingAudit.assets.forEach(a => {
                              const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
                              const fisc = a.fiscalQty ?? 0;
                              if (phys < fisc) {
                                const diff = fisc - phys;
                                const unitCost = a.cost ?? 18.0;
                                totalShortageValue += diff * unitCost;
                                descriptionParts.push(`Falta de ${diff}x ${a.assetName || 'Ativo'}`);
                              }
                            });

                            setValeValeValor(totalShortageValue.toFixed(2));
                            setValeDescricao(descriptionParts.join(' e ') || `Faltas encontradas no mapa ${selectedMap}`);
                          }
                        }}
                        className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 transition font-mono"
                      >
                        <option value="">Nenhum ou selecione o mapa...</option>
                        {(() => {
                          const eligibleRoutes = importedRoutes.filter(r => {
                            // 1. Must be closed (fechado)
                            if (r.status !== 'fechado') return false;

                            // 2. Must not already have a vale in history
                            const alreadyHasVale = vales.some(v => v.routeMap?.toUpperCase() === r.routeMap.toUpperCase());
                            if (alreadyHasVale) return false;

                            // 3. Must have shortages (faltas) in the associated audit
                            const audit = audits.find(a => a.routeMap.toUpperCase() === r.routeMap.toUpperCase());
                            if (!audit) return false;

                            const itemShortages = audit.items.some(i => {
                              const phys = i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty;
                              const fisc = i.fiscalQty ?? 0;
                              return phys < fisc;
                            });

                            const assetShortages = audit.assets.some(a => {
                              const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
                              const fisc = a.fiscalQty ?? 0;
                              return phys < fisc;
                            });

                            return itemShortages || assetShortages;
                          });

                          return eligibleRoutes.map(r => (
                            <option key={r.id} value={r.routeMap}>Mapa {r.routeMap} - Placa {r.plate}</option>
                          ));
                        })()}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase font-sans">Valor do Desconto (R$)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          value={valeValeValor}
                          onChange={(e) => setValeValeValor(e.target.value)}
                          className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 transition font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase font-sans">Motivo / Descrição da Falta</label>
                      <input
                        type="text"
                        placeholder="Ex: Falta de 2 caixas de Heineken 350ml"
                        value={valeDescricao}
                        onChange={(e) => setValeDescricao(e.target.value)}
                        className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 transition"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase font-sans">Observações Gerais</label>
                      <textarea
                        rows={3}
                        placeholder="Insira detalhes sobre as circunstâncias da falta ou processo de aferição..."
                        value={valeObservacao}
                        onChange={(e) => setValeObservacao(e.target.value)}
                        className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 transition leading-normal"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (!valeColaboradorId) {
                          alert('Erro: Escolha o colaborador responsável.');
                          return;
                        }
                        if (!valeValeValor || Number(valeValeValor) <= 0) {
                          alert('Erro: Insira um valor válido maior que zero.');
                          return;
                        }
                        if (!valeDescricao.trim()) {
                          alert('Erro: Insira o motivo/descrição do desvio.');
                          return;
                        }

                        // Obter nome do colaborador
                        let colabName = '';
                        let colabRole = 'MOTORISTA';
                        const foundDriver = drivers.find(d => d.id === valeColaboradorId);
                        if (foundDriver) {
                          colabName = foundDriver.name;
                        } else if (valeColaboradorId === 'conferente_01') {
                          colabName = 'João Conferente';
                          colabRole = 'CONFERENTE';
                        } else if (valeColaboradorId === 'conferente_02') {
                          colabName = 'Pedro Ajudante';
                          colabRole = 'CONFERENTE';
                        } else if (valeColaboradorId === 'auxiliar_envio') {
                          colabName = 'Auxiliar de Envio de Sobras';
                          colabRole = 'AUXILIAR';
                        } else {
                          colabName = 'Colaborador Avulso';
                        }

                        const novo: Vale = {
                          id: 'val_' + Date.now(),
                          routeMap: valeRouteMap || 'AVULSO',
                          colaboradorId: valeColaboradorId,
                          colaboradorName: colabName,
                          colaboradorRole: colabRole,
                          valor: Number(valeValeValor),
                          descricao: valeDescricao.trim(),
                          dataGeracao: new Date().toISOString().split('T')[0],
                          status: 'PENDENTE_ASSINATURA' as const,
                          observacao: valeObservacao.trim() || 'Sem observações adicionais.'
                        };

                        onSaveVales([...vales, novo]);
                        alert(`Vale emitido com sucesso para ${colabName}!`);
                        
                        // Limpar form
                        setValeColaboradorId('');
                        setValeRouteMap('');
                        setValeValeValor('');
                        setValeDescricao('');
                        setValeObservacao('');
                      }}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-2.5 rounded-lg transition shadow-xs cursor-pointer text-center uppercase"
                    >
                      Registrar e Emitir Vale
                    </button>
                  </div>
                </div>

                {/* List of generated vales (Right) */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-xs">
                  <h3 className="font-sans font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between font-bold">
                    <span className="flex items-center space-x-1.5">
                      <FileText className="h-4 w-4 text-slate-600" />
                      <span>Histórico Geral de Vales Emitidos</span>
                    </span>
                    <span className="text-xxs bg-slate-100 text-slate-600 font-mono px-2 py-0.5 rounded font-black">
                      Total: {vales.length} Vales
                    </span>
                  </h3>

                  {vales.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 text-xs italic">
                      Nenhum vale emitido no sistema até o momento.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-150 text-[10px] text-slate-400 font-bold uppercase tracking-wider font-sans bg-slate-50/55">
                            <th className="py-2.5 px-3">Responsável</th>
                            <th className="py-2.5 px-3">Descrição / Motivo</th>
                            <th className="py-2.5 px-3">Mapa</th>
                            <th className="py-2.5 px-3 text-right">Valor</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                            <th className="py-2.5 px-3 text-center">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                          {vales.map((vale) => (
                            <tr key={vale.id} className="hover:bg-slate-50/50 transition">
                              <td className="py-3 px-3 font-medium">
                                <span className="block font-bold text-slate-900">{vale.colaboradorName}</span>
                                <span className="text-[9px] text-slate-400 font-mono block uppercase">{vale.colaboradorRole}</span>
                              </td>
                              <td className="py-3 px-3">
                                <span className="block text-slate-800 line-clamp-1">{vale.descricao}</span>
                                <span className="text-[10px] text-slate-400 block">Emitido: {new Date(vale.dataGeracao + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                              </td>
                              <td className="py-3 px-3 font-mono text-[10px]">
                                {vale.routeMap !== 'AVULSO' ? `Mapa ${vale.routeMap}` : 'AVULSO'}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                                R$ {vale.valor.toFixed(2)}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className={`inline-block px-2 py-0.5 text-[9px] font-black uppercase rounded-full ${
                                  vale.status === 'COMPENSADO'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : vale.status === 'ASSINADO'
                                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                      : 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                                }`}>
                                  {vale.status === 'PENDENTE_ASSINATURA' ? 'Pendente Assinatura' : vale.status === 'ASSINADO' ? 'Termo Assinado' : 'Compensado Fin.'}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex justify-center items-center gap-1.5">
                                  {/* Botão de Visualizar Termo */}
                                  <button
                                    type="button"
                                    onClick={() => setViewingVale(vale)}
                                    className="p-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer transition"
                                    title="Visualizar Termo de Autorização de Desconto"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </button>
                                  {vale.status === 'PENDENTE_ASSINATURA' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setUploadingValeId(vale.id);
                                      }}
                                      className="px-1.5 py-0.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[9px] rounded transition uppercase cursor-pointer"
                                      title="Importar vale assinado manualmente (PDF ou JPG)"
                                    >
                                      Assinar
                                    </button>
                                  )}

                                  {/* O gestor pode compensar qualquer vale ativo (pendente ou assinado) ao faturar no fim do mês */}
                                  {(vale.status === 'ASSINADO' || (vale.status === 'PENDENTE_ASSINATURA' && currentUser.role === 'gestor')) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        requestConfirm(
                                          'Confirmar Compensação',
                                          `Tem certeza de que deseja faturar e marcar este vale no valor de R$ ${vale.valor.toFixed(2)} para ${vale.colaboradorName} como COMPENSADO?`,
                                          () => {
                                            const updated = vales.map(v => v.id === vale.id ? { ...v, status: 'COMPENSADO' as const } : v);
                                            onSaveVales?.(updated);
                                          }
                                        );
                                      }}
                                      className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[9px] rounded transition uppercase cursor-pointer"
                                      title="Marcar como Compensado no Financeiro"
                                    >
                                      Compensar
                                    </button>
                                  )}

                                  {/* Botão de download do PDF assinado */}
                                  {(vale.status === 'ASSINADO' || vale.status === 'COMPENSADO') && vale.signedPdfUrl && (
                                    <a
                                      href={vale.signedPdfUrl}
                                      download={vale.signedPdfName || `vale_assinado_${vale.id}.pdf`}
                                      className="p-1 text-emerald-600 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded cursor-pointer transition flex items-center justify-center"
                                      title={`Baixar PDF Assinado: ${vale.signedPdfName || 'PDF'}`}
                                    >
                                      <FileText className="h-3.5 w-3.5" />
                                    </a>
                                  )}

                                  {/* Deletar Vale */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      requestConfirm(
                                        'Excluir Vale',
                                        `Deseja realmente excluir este vale no valor de R$ ${vale.valor.toFixed(2)} para ${vale.colaboradorName}?`,
                                        () => {
                                          const updated = vales.filter(v => v.id !== vale.id);
                                          onSaveVales(updated);
                                        }
                                      );
                                    }}
                                    className="p-1 text-red-600 hover:text-red-950 hover:bg-red-50 rounded cursor-pointer transition"
                                    title="Excluir Vale"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal de Importação de PDF Assinado */}
              {uploadingValeId && (() => {
                const valeToUpload = vales.find(v => v.id === uploadingValeId);
                if (!valeToUpload) return null;

                return (
                  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <h4 className="font-sans font-black text-sm text-slate-900 uppercase tracking-wide">Importar Vale Assinado (PDF/Imagem)</h4>
                        <button
                          type="button"
                          onClick={() => setUploadingValeId(null)}
                          className="text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <XCircle className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xxs space-y-1.5 text-slate-700">
                          <div><strong>Colaborador:</strong> {valeToUpload.colaboradorName}</div>
                          <div><strong>Valor:</strong> R$ {valeToUpload.valor.toFixed(2)}</div>
                          <div><strong>Descrição:</strong> {valeToUpload.descricao}</div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Selecionar Arquivo PDF ou Imagem Escaneada</label>
                          <div className="border-2 border-dashed border-slate-250 hover:border-amber-500 rounded-xl p-6 text-center cursor-pointer bg-slate-50 transition relative">
                            <input
                              type="file"
                              accept="application/pdf,image/*"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;

                                const reader = new FileReader();
                                reader.onload = () => {
                                  const dataUrl = reader.result as string;
                                  // Update the vale status to ASSINADO and save the file data
                                  const updated = vales.map(v => 
                                    v.id === valeToUpload.id 
                                      ? { ...v, status: 'ASSINADO' as const, signedPdfUrl: dataUrl, signedPdfName: file.name } 
                                      : v
                                  );
                                  onSaveVales(updated);
                                  setUploadingValeId(null);
                                  alert('Vale assinado com sucesso! O arquivo PDF foi anexado.');
                                };
                                reader.readAsDataURL(file);
                              }}
                            />
                            <div className="space-y-2 text-slate-600">
                              <Plus className="h-8 w-8 text-slate-400 mx-auto" />
                              <div className="text-xxs font-semibold">
                                <span className="text-amber-600 font-bold underline">Clique para selecionar</span> ou arraste o arquivo aqui
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">Suporta PDF, PNG, JPG (Max 15MB)</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => setUploadingValeId(null)}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-xs py-2 px-4 rounded-lg cursor-pointer transition"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* PDF Recibo Timbrado Termo de Vale Modal */}
              {viewingVale && (() => {
                const associatedAudit = audits.find(a => a.id === viewingVale.auditId || a.routeMap === viewingVale.routeMap);
                const vehiclePlate = associatedAudit?.plate || 'Não cadastrada';
                const arrivalDateFormatted = associatedAudit?.arrivalDate 
                  ? new Date(associatedAudit.arrivalDate + 'T00:00:00').toLocaleDateString('pt-BR') 
                  : new Date(viewingVale.dataGeracao + 'T00:00:00').toLocaleDateString('pt-BR');
                const helperName = associatedAudit?.helperId ? getHelperName(associatedAudit.helperId) : 'N/A';
                const usersList = typeof window !== 'undefined'
                  ? (() => {
                      const stored = localStorage.getItem('logiroute_users');
                      if (stored) {
                        try { return JSON.parse(stored) as User[]; } catch(e) {}
                      }
                      return DEFAULT_USERS;
                    })()
                  : DEFAULT_USERS;
                const foundUser = usersList.find(u => u.id === associatedAudit?.conferenteId || u.username === associatedAudit?.conferenteId);
                const conferenteName = foundUser 
                  ? foundUser.name 
                  : (associatedAudit?.conferenteId 
                      ? (associatedAudit.conferenteId === 'conferente_01' ? 'João Conferente' : associatedAudit.conferenteId === 'conferente_02' ? 'Pedro Ajudante' : associatedAudit.conferenteId) 
                      : 'N/A');

                // Calculate detailed shortages/deficits for this audit (PA/AG)
                const detailedShortages: Array<{ code: string; name: string; expected: number; found: number; diff: number; cost: number; totalCost: number }> = [];

                if (associatedAudit) {
                  associatedAudit.items.forEach(i => {
                    const phys = i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty;
                    const fisc = i.fiscalQty ?? 0;
                    if (phys < fisc) {
                      const diff = fisc - phys;
                      const unitCost = getSkuClosedPrice(i.productCode, i.cost ?? 45.0);
                      detailedShortages.push({
                        code: i.productCode,
                        name: i.productDescription || 'Produto Sem Descrição',
                        expected: fisc,
                        found: phys,
                        diff: diff,
                        cost: unitCost,
                        totalCost: diff * unitCost
                      });
                    }
                  });

                  associatedAudit.assets.forEach(a => {
                    const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
                    const fisc = a.fiscalQty ?? 0;
                    if (phys < fisc) {
                      const diff = fisc - phys;
                      const unitCost = a.cost ?? 18.0;
                      detailedShortages.push({
                        code: a.assetId,
                        name: a.assetName || 'Ativo Sem Descrição',
                        expected: fisc,
                        found: phys,
                        diff: diff,
                        cost: unitCost,
                        totalCost: diff * unitCost
                      });
                    }
                  });
                }

                return (
                  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-250 max-w-3xl w-full max-h-[95vh] overflow-y-auto flex flex-col">
                      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-950 text-white">
                        <span className="font-sans font-bold text-xs uppercase tracking-wider flex items-center space-x-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Recibo Termo de Autorização de Desconto (Modelo Definitivo)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setViewingVale(null)}
                          className="text-slate-400 hover:text-white cursor-pointer"
                        >
                          <XCircle className="h-5 w-5" />
                        </button>
                      </div>

                      {/* Printable Receipt Sheet */}
                      <div className="p-8 space-y-6 flex-1 text-slate-800" id="print-area">
                        {/* Logo & Timbre */}
                        <div className="flex justify-between items-start border-b border-slate-300 pb-4">
                          <div>
                            <span className="font-sans font-black text-lg text-slate-900 uppercase tracking-tight block">PAU BRASIL DISTRIBUIDORA LTDA</span>
                            <span className="text-[10px] text-slate-500 block uppercase font-mono tracking-wider">Logística de Retorno & Aferição Física • PAU BRASIL GUARABIRA</span>
                            <span className="text-[10px] text-amber-600 block font-bold uppercase mt-0.5">SISTEMA ATIVO DEFINTIVO</span>
                          </div>
                          <div className="bg-slate-100 px-3 py-1.5 rounded border border-slate-200 text-right">
                            <span className="text-[9px] text-slate-400 block uppercase font-bold">VALE FINANCEIRO Nº</span>
                            <span className="font-mono text-sm font-black text-red-600">{viewingVale.id}</span>
                          </div>
                        </div>

                        {/* Title */}
                        <div className="text-center space-y-1 py-1">
                          <h4 className="font-sans font-black text-sm uppercase tracking-wider text-slate-950">AUTORIZAÇÃO DE DESCONTO EM FOLHA DE PAGAMENTO</h4>
                          <span className="text-xxs font-mono text-slate-400 font-bold block">Data de Emissão: {new Date(viewingVale.dataGeracao + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                        </div>

                        {/* Main Statement */}
                        <p className="text-xs leading-relaxed text-justify">
                          Eu, <strong>{viewingVale.colaboradorName}</strong>, inscrito sob o papel de <strong>{viewingVale.colaboradorRole}</strong>, autorizo expressamente a empresa <strong>PAU BRASIL DISTRIBUIDORA LTDA</strong> a descontar em minha folha de pagamento, de acordo com o Artigo 462, § 1º da CLT, a importância líquida de <strong>R$ {viewingVale.valor.toFixed(2)}</strong> ({viewingVale.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}), referente aos desvios físicos ou avarias constatados na conferência de retorno logístico do <strong>{viewingVale.routeMap !== 'AVULSO' ? `Mapa de Carga nº ${viewingVale.routeMap}` : 'Mapa de Carga Avulso'}</strong>.
                        </p>

                        {/* Informações sobre a Rota e Equipe (Colaboradores Envolvidos) */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 text-xs">
                          <div>
                            <span className="text-slate-400 text-[10px] font-bold uppercase block">Informações da Rota / Transporte</span>
                            <div className="mt-1 space-y-1">
                              <div><strong>Mapa de Carga:</strong> <span className="font-mono bg-white border border-slate-200 px-1.5 py-0.2 rounded font-bold">{viewingVale.routeMap}</span></div>
                              <div><strong>Placa do Veículo:</strong> <span className="font-mono bg-white border border-slate-200 px-1.5 py-0.2 rounded font-bold uppercase">{vehiclePlate}</span></div>
                              <div><strong>Data da Viagem:</strong> <span className="text-slate-700">{arrivalDateFormatted}</span></div>
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] font-bold uppercase block">Colaboradores Envolvidos na Viagem & Aferição</span>
                            <div className="mt-1 space-y-1">
                              <div><strong>Motorista Responsável:</strong> <span className="font-semibold text-slate-900">{viewingVale.colaboradorName}</span></div>
                              <div><strong>Ajudante de Rota:</strong> <span className="text-slate-700">{helperName}</span></div>
                              <div><strong>Conferente de Pátio (Físico):</strong> <span className="text-slate-700">{conferenteName}</span></div>
                              <div><strong>Fiscal de Logística (Aferidor):</strong> <span className="font-semibold text-slate-900">{currentUser.name}</span></div>
                            </div>
                          </div>
                        </div>

                        {/* Detail Table of Involved Assets & Shortages */}
                        <div className="space-y-2">
                          <span className="text-slate-900 font-bold text-[10px] uppercase tracking-wider block">Ativos com Divergência de Inventário (Sobras/Faltas de P.A e A.G):</span>
                          
                          {detailedShortages.length > 0 ? (
                            <div className="border border-slate-250 rounded-lg overflow-hidden text-xxs font-sans shadow-xs">
                              <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[9px] border-b border-slate-250">
                                  <tr>
                                    <th className="p-2">Cód.</th>
                                    <th className="p-2">Descrição do Ativo / Produto</th>
                                    <th className="p-2 text-center">Faturado</th>
                                    <th className="p-2 text-center">Conferido</th>
                                    <th className="p-2 text-center text-red-600">Diferença (Falta)</th>
                                    <th className="p-2 text-right">Custo Unit.</th>
                                    <th className="p-2 text-right">Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 text-slate-800">
                                  {detailedShortages.map(item => (
                                    <tr key={item.code} className="hover:bg-slate-50">
                                      <td className="p-2 font-mono font-bold text-slate-600">{item.code}</td>
                                      <td className="p-2 font-medium">{item.name}</td>
                                      <td className="p-2 text-center font-mono">{item.expected} SKU</td>
                                      <td className="p-2 text-center font-mono">{item.found} SKU</td>
                                      <td className="p-2 text-center font-mono text-red-600 font-bold">-{item.diff} SKU</td>
                                      <td className="p-2 text-right font-mono">R$ {item.cost.toFixed(2)}</td>
                                      <td className="p-2 text-right font-mono font-bold text-slate-900">R$ {item.totalCost.toFixed(2)}</td>
                                    </tr>
                                  ))}
                                  <tr className="bg-slate-50 font-bold text-slate-900 text-[10px] border-t border-slate-250">
                                    <td colSpan={4} className="p-2.5 text-right uppercase">Total Descontado:</td>
                                    <td className="p-2.5 text-center font-mono text-red-600">-{detailedShortages.reduce((sum, d) => sum + d.diff, 0)} SKU</td>
                                    <td colSpan={2} className="p-2.5 text-right font-mono font-black text-red-600 text-xs">R$ {viewingVale.valor.toFixed(2)}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="border border-slate-300 rounded-lg p-3 text-[11px] text-slate-700 space-y-1.5 bg-slate-50 leading-relaxed">
                              <div><strong>Detalhamento dos Itens / Avarias:</strong></div>
                              <div className="font-semibold text-slate-900 font-mono bg-white border border-slate-200 px-2 py-1.5 rounded">{viewingVale.descricao}</div>
                              <div className="text-[10px] text-slate-500 font-mono">Valor Total de Autorização de Desconto de R$ {viewingVale.valor.toFixed(2)}</div>
                            </div>
                          )}
                        </div>

                        {viewingVale.observacao && (
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] italic text-slate-600 font-sans">
                            <strong>Observações e Notas do Emissor:</strong> {viewingVale.observacao}
                          </div>
                        )}

                        <p className="text-[9px] text-slate-400 leading-relaxed text-justify font-sans">
                          O desconto acima autorizado está respaldado pelas normas regulamentares internas de integridade patrimonial da Pau Brasil Distribuidora e fundamentado legalmente por ato de desvio de inventário ou avaria em trânsito de vasilhames ou mercadorias.
                        </p>

                        {/* Signatures */}
                        <div className="grid grid-cols-3 gap-6 pt-10 text-center text-[10px]">
                          <div className="space-y-1">
                            <div className="border-b border-slate-300 mx-auto w-11/12 pt-4" />
                            <span className="font-bold text-slate-900 block truncate">{viewingVale.colaboradorName}</span>
                            <span className="text-[8px] text-slate-400 block uppercase font-mono">Assinatura do Responsável</span>
                          </div>
                          <div className="space-y-1">
                            <div className="border-b border-slate-300 mx-auto w-11/12 pt-4" />
                            <span className="font-bold text-slate-900 block truncate">{currentUser.name}</span>
                            <span className="text-[8px] text-slate-400 block uppercase font-mono font-bold">Aferidor - Fiscal de Logística</span>
                          </div>
                          <div className="space-y-1">
                            <div className="border-b border-slate-300 mx-auto w-11/12 pt-4" />
                            <span className="font-bold text-slate-900 block truncate">Elisson Minervino</span>
                            <span className="text-[8px] text-slate-400 block uppercase font-mono font-bold">Gestor de Logística</span>
                          </div>
                        </div>
                      </div>

                      {/* Print buttons */}
                      <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            window.print();
                          }}
                          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs py-2 px-4 rounded-lg cursor-pointer transition shadow-xs font-bold"
                        >
                          Imprimir / Salvar PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewingVale(null)}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-xs py-2 px-4 rounded-lg cursor-pointer transition"
                        >
                          Fechar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

        </div>
      ) : (
        /* WORKSPACE MODE: ACTIVE RECONCILIATION FOR SELECTED SESSION */
        <div className="space-y-6" id="workspace_fiscal_panel">
          
          {/* Active Session Info */}
          <div className="bg-slate-900 text-white p-6 rounded-xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center shadow-lg gap-4">
            <div className="space-y-1">
              <span className="text-xs text-amber-500 font-mono tracking-widest uppercase font-bold">
                ÁREA DE CONCILIAÇÃO FISCAL ATIVA
              </span>
              <div className="flex items-center space-x-3">
                <h2 className="text-2xl font-sans font-bold tracking-tight">
                  {activeSession.routeMap}
                </h2>
                <span className="bg-slate-800 text-slate-300 font-mono text-xs px-2.5 py-0.5 rounded border border-slate-700">
                  {activeSession.plate} {activeSession.exchangePlate ? `🔄 ${activeSession.exchangePlate}` : ''}
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-x-4">
                <span><strong>Motorista:</strong> {getDriverName(activeSession.driverId)}</span>
                <span>•</span>
                <span><strong>Ajudante:</strong> {getHelperName(activeSession.helperId)}</span>
                <span>•</span>
                <span><strong>KM Chegada:</strong> {activeSession.arrivalKm}</span>
              </div>
            </div>

            <div className="bg-slate-800 px-4 py-2.5 rounded border border-slate-750 text-right">
              <span className="text-xxs text-slate-400 block uppercase">Tempo de Auditoria Física</span>
              <span className="font-mono text-sm font-bold text-amber-400">
                {getDurationText(activeSession.startTime, activeSession.endTime)}
              </span>
            </div>
          </div>

          {/* WARNING BANNER ABOUT MONITORAMENTO DISCREPANCY OBSERVATION */}
          {(() => {
            const observations: { map: string; obs: string }[] = [];
            if (activeSession.unifiedMaps && activeSession.unifiedMaps.length > 0) {
              activeSession.unifiedMaps.forEach(mapCode => {
                const r = importedRoutes.find(x => x.routeMap.toUpperCase() === mapCode.toUpperCase());
                if (r && r.discrepancyObservation) {
                  observations.push({ map: r.routeMap, obs: r.discrepancyObservation });
                }
              });
            } else {
              const r = importedRoutes.find(x => x.routeMap.toUpperCase() === activeSession.routeMap.toUpperCase());
              if (r && r.discrepancyObservation) {
                observations.push({ map: r.routeMap, obs: r.discrepancyObservation });
              }
            }

            if (observations.length > 0) {
              return (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-5 flex items-start space-x-3 text-red-950 animate-pulse shadow-md w-full">
                  <AlertTriangle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 w-full">
                    <h4 className="font-sans font-black text-xs uppercase tracking-wide text-red-800 flex items-center space-x-1.5">
                      <span>⚠️ ALERTA DO MONITORAMENTO (GUIA DE OBSERVAÇÃO)</span>
                    </h4>
                    <p className="text-xs font-semibold">
                      O setor de Monitoramento mapeou e reportou divergências para as rotas unificadas:
                    </p>
                    <div className="space-y-1.5 mt-1.5">
                      {observations.map((item, idx) => (
                        <div key={idx} className="bg-white/90 p-3 rounded-lg border border-red-200 font-mono text-xs font-bold text-red-900 leading-normal">
                          <strong>{item.map}:</strong> "{item.obs}"
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-red-700 font-extrabold uppercase mt-1">
                      ATENÇÃO AUXILIAR DE LOGÍSTICA: Verifique se essas divergências de saldo foram tratadas antes de concluir e dar baixa!
                    </p>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Reconciliation Forms: Finished Products (PA) & Active Assets (AG) */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Finished Products Reconciliation */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-sans font-bold text-base text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center space-x-2">
                  <span className="bg-emerald-500 text-white text-xxs font-bold uppercase px-2 py-0.5 rounded-full">PA</span>
                  <span>Produtos Acabados - Conferência Cega vs Saldo Fiscal</span>
                </h3>

                {activeSession.items.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-lg text-slate-400 text-xs">
                    Nenhum produto acabado lançado pelo conferente.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {[...activeSession.items].sort((a, b) => {
                      const numA = Number(a.productCode);
                      const numB = Number(b.productCode);
                      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                      return a.productCode.localeCompare(b.productCode);
                    }).map((item) => {
                      const physical = item.rePhysicalQty !== undefined ? item.rePhysicalQty : item.physicalQty;
                      const fiscal = item.fiscalQty ?? 0;
                      const diff = physical - fiscal;

                      let diffColor = 'text-emerald-800 bg-emerald-50 border-emerald-200';
                      let diffLabel = 'OK';
                      if (diff > 0) {
                        diffColor = 'text-amber-800 bg-amber-50 border-amber-200';
                        diffLabel = `+${diff} (Sobra)`;
                      } else if (diff < 0) {
                        diffColor = 'text-red-800 bg-red-50 border-red-200';
                        diffLabel = `${diff} (Falta)`;
                      }

                      const prodInfo = products.find(p => p.code === item.productCode);
                      const costValue = prodInfo ? prodInfo.cost : item.cost;
                      const hectoValue = prodInfo ? prodInfo.hectoFactor : 0.01;

                      return (
                        <div key={item.productCode} className="p-4 rounded-lg border border-slate-150 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition">
                          <div className="space-y-1 max-w-sm">
                            <div>
                              <span className="font-mono text-xxs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-bold mr-1.5">{item.productCode}</span>
                              <span className="font-sans font-semibold text-slate-800 text-xs">{item.productDescription}</span>
                            </div>
                            
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              <span className="text-[10px] text-slate-500 bg-slate-100/80 border border-slate-200/60 px-1.5 py-0.5 rounded-md font-mono flex items-center">
                                Custo: R$ {costValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-[10px] text-slate-500 bg-slate-100/80 border border-slate-200/60 px-1.5 py-0.5 rounded-md font-mono flex items-center">
                                Hecto: {hectoValue.toLocaleString('pt-BR', { minimumFractionDigits: 4 })} HL
                              </span>
                              {diff !== 0 && (
                                <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-150 px-1.5 py-0.5 rounded-md font-mono flex items-center">
                                  Custo Desvio: R$ {Math.abs(diff * costValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              )}
                              {diff !== 0 && (
                                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-150 px-1.5 py-0.5 rounded-md font-mono flex items-center">
                                  Vol. Desvio: {(Math.abs(diff) * hectoValue).toLocaleString('pt-BR', { minimumFractionDigits: 4 })} HL
                                </span>
                              )}
                            </div>

                            {item.rePhysicalQty !== undefined && (
                              <div className="text-xxs text-slate-400 pt-1">
                                Contagem original: <span className="line-through">{item.physicalQty}</span> • Recontado: <span className="font-semibold text-purple-600">{item.rePhysicalQty}</span>
                              </div>
                            )}

                            {/* Evidence Photos for this product */}
                            {activeSessionPhotos.filter(p => p.itemCode === item.productCode || p.itemCode === item.productDescription).length > 0 && (
                              <div className="mt-2 space-y-1 bg-white p-2 rounded-lg border border-slate-200">
                                <span className="text-[9px] font-bold text-slate-500 uppercase block tracking-wider font-mono">Fotos do Conferente:</span>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {activeSessionPhotos.filter(p => p.itemCode === item.productCode || p.itemCode === item.productDescription).map(p => (
                                    <div 
                                      key={p.id} 
                                      className="relative group bg-slate-100 rounded border border-slate-200 overflow-hidden w-12 h-12 flex-shrink-0 cursor-pointer" 
                                      onClick={() => setSelectedPhotoForPreview(p)}
                                    >
                                      <img src={p.photoUrl} alt={p.itemName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[7px] text-white">Ver</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center space-x-4 self-end sm:self-auto">
                            {/* Physical Display */}
                            <div className="text-center">
                              <span className="text-xxs font-bold text-slate-400 block uppercase">FÍSICO</span>
                              <span className="font-mono text-xs font-bold text-slate-900 bg-slate-200 px-2.5 py-1 rounded">
                                {physical}
                              </span>
                            </div>

                            {/* Fiscal Input */}
                            <div className="text-center">
                              <span className="text-xxs font-bold text-slate-500 block uppercase">SALDO FISCAL *</span>
                              <input
                                type="number"
                                min="0"
                                value={item.fiscalQty ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                                  handleUpdateFiscalQty(item.productCode, val);
                                }}
                                className="w-16 text-xs text-center font-bold bg-white border border-slate-300 rounded p-1 focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                            </div>

                            {/* Discrepancy Display */}
                            <div className="text-center min-w-[70px]">
                              <span className="text-xxs font-bold text-slate-400 block uppercase">DIVERG.</span>
                              <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border inline-block leading-normal ${diffColor}`}>
                                {diffLabel}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Active Circulation Assets Reconciliation */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-sans font-bold text-base text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center space-x-2">
                  <span className="bg-amber-500 text-slate-950 text-xxs font-bold uppercase px-2 py-0.5 rounded-full">AG</span>
                  <span>Ativos de Giro (Garrafeiras, Garrafas, Paletes)</span>
                </h3>

                <div className="space-y-4">
                  {(() => {
                    const sortedAssets = [...activeSession.assets].sort((a, b) => {
                      const codeA = getAssetCode(a.assetId, a.assetName);
                      const codeB = getAssetCode(b.assetId, b.assetName);
                      const numA = Number(codeA);
                      const numB = Number(codeB);
                      const isNumA = !isNaN(numA);
                      const isNumB = !isNaN(numB);
                      if (isNumA && isNumB) return numA - numB;
                      if (isNumA) return -1;
                      if (isNumB) return 1;
                      return codeA.localeCompare(codeB);
                    });
                    return sortedAssets.map((asset) => {
                      const physical = asset.rePhysicalQty !== undefined ? asset.rePhysicalQty : asset.physicalQty;
                      const fiscal = asset.fiscalQty ?? 0;
                      const comodato = asset.comodatoQty ?? 0;
                      const recolha = asset.recolhaQty ?? 0;
                      const diff = (physical + comodato - recolha) - fiscal;

                      let diffColor = 'text-emerald-800 bg-emerald-50 border-emerald-200';
                      let diffLabel = 'OK';
                      if (diff > 0) {
                        diffColor = 'text-amber-800 bg-amber-50 border-amber-200';
                        diffLabel = `+${diff} (Sobra)`;
                      } else if (diff < 0) {
                        diffColor = 'text-red-800 bg-red-50 border-red-200';
                        diffLabel = `${diff} (Falta)`;
                      }

                      const mappedCode = getAssetCode(asset.assetId, asset.assetName);
                      const canonicalName = getAssetCanonicalName(mappedCode) || asset.assetName;

                      return (
                        <div key={asset.assetId} className="p-4 rounded-lg border border-slate-150 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {mappedCode && (
                                <span className="font-mono text-xxs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-bold">{mappedCode}</span>
                              )}
                              <span className="font-sans font-semibold text-slate-800 text-xs">{canonicalName}</span>
                            </div>

                            <div className="flex flex-wrap gap-1.5 pt-1">
                              <span className="text-[10px] text-slate-500 bg-slate-100/80 border border-slate-200/60 px-1.5 py-0.5 rounded-md font-mono flex items-center">
                                Custo: R$ {asset.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                              {diff !== 0 && (
                                <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-150 px-1.5 py-0.5 rounded-md font-mono flex items-center">
                                  Custo Desvio: R$ {Math.abs(diff * asset.cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              )}
                            </div>

                            {asset.rePhysicalQty !== undefined && (
                              <div className="text-xxs text-slate-400 pt-1">
                                Contagem original: <span className="line-through">{asset.physicalQty}</span> • Recontado: <span className="font-semibold text-purple-600">{asset.rePhysicalQty}</span>
                              </div>
                            )}

                          {/* Evidence Photos for this asset */}
                          {activeSessionPhotos.filter(p => p.itemCode === asset.assetId || p.itemCode === asset.assetName).length > 0 && (
                            <div className="mt-2 space-y-1 bg-white p-2 rounded-lg border border-slate-200">
                              <span className="text-[9px] font-bold text-slate-500 uppercase block tracking-wider font-mono">Fotos do Conferente:</span>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {activeSessionPhotos.filter(p => p.itemCode === asset.assetId || p.itemCode === asset.assetName).map(p => (
                                  <div 
                                    key={p.id} 
                                    className="relative group bg-slate-100 rounded border border-slate-200 overflow-hidden w-12 h-12 flex-shrink-0 cursor-pointer" 
                                    onClick={() => setSelectedPhotoForPreview(p)}
                                  >
                                    <img src={p.photoUrl} alt={p.itemName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[7px] text-white">Ver</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 self-end sm:self-auto justify-end">
                          {/* Physical Display */}
                          <div className="text-center min-w-[50px]">
                            <span className="text-xxs font-bold text-slate-400 block uppercase">FÍSICO</span>
                            <span className="font-mono text-xs font-bold text-slate-900 bg-slate-200 px-2.5 py-1 rounded block">
                              {physical}
                            </span>
                          </div>

                          {/* Fiscal Input */}
                          <div className="text-center">
                            <span className="text-xxs font-bold text-slate-500 block uppercase">SALDO FISCAL</span>
                            <input
                              type="number"
                              min="0"
                              value={asset.fiscalQty ?? ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                                handleUpdateAssetFiscalQty(asset.assetId, val);
                              }}
                              className="w-16 text-xs text-center font-bold bg-white border border-slate-300 rounded p-1 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </div>

                          {/* Comodato Input */}
                          <div className="text-center">
                            <span className="text-xxs font-bold text-amber-600 block uppercase">COMODATO</span>
                            <input
                              type="number"
                              min="0"
                              value={asset.comodatoQty ?? ''}
                              placeholder="0"
                              onChange={(e) => handleUpdateAssetComodatoQty(asset.assetId, Number(e.target.value) || 0)}
                              className="w-16 text-xs text-center font-bold bg-white border border-amber-300 rounded p-1 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </div>

                          {/* Recolha Input */}
                          <div className="text-center">
                            <span className="text-xxs font-bold text-blue-600 block uppercase">RECOLHA</span>
                            <input
                              type="number"
                              min="0"
                              value={asset.recolhaQty ?? ''}
                              placeholder="0"
                              onChange={(e) => handleUpdateAssetRecolhaQty(asset.assetId, Number(e.target.value) || 0)}
                              className="w-16 text-xs text-center font-bold bg-white border border-blue-300 rounded p-1 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </div>

                          {/* Discrepancy Display */}
                          <div className="text-center min-w-[70px]">
                            <span className="text-xxs font-bold text-slate-400 block uppercase">DIVERG.</span>
                            <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border inline-block leading-normal w-full text-center ${diffColor}`}>
                              {diffLabel}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
                </div>
              </div>

              {/* Refugos dos Ativos de Giro Card */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-sans font-bold text-base text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center space-x-2">
                  <span className="bg-red-500 text-white text-xxs font-bold uppercase px-2 py-0.5 rounded-full">REFUGO</span>
                  <span>Refugos dos Ativos de Giro (Avariados em Rota)</span>
                </h3>

                {!activeSession.refugos || activeSession.refugos.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-lg text-slate-400 text-xs">
                    Nenhum item de refugo lançado pelo conferente.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500">
                      O conferente registrou os seguintes refugos/avarias. Faça a aferição dos itens por imagem utilizando a foto em tempo real abaixo:
                    </p>
                    <div className="border border-slate-100 rounded-lg overflow-hidden shadow-xs">
                      <table className="min-w-full divide-y divide-slate-100 text-left">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-2 font-sans font-bold text-xxs text-slate-500 uppercase tracking-wider">Ativo</th>
                            <th className="px-4 py-2 font-sans font-bold text-xxs text-slate-500 uppercase tracking-wider text-center">Quantidade</th>
                            <th className="px-4 py-2 font-sans font-bold text-xxs text-slate-500 uppercase tracking-wider">Motivo da Avaria</th>
                            <th className="px-4 py-2 font-sans font-bold text-xxs text-slate-500 uppercase tracking-wider text-center">Foto (Tempo Real)</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                          {activeSession.refugos.map((refugo) => (
                            <tr key={refugo.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-2.5">
                                <span className="font-sans font-semibold text-slate-800 text-xs block">{refugo.assetName}</span>
                                <span className="font-mono text-[10px] text-slate-400">ID: {refugo.assetId}</span>
                              </td>
                              <td className="px-4 py-2.5 text-center font-mono text-xs font-bold text-red-600 bg-red-50/20">
                                {refugo.qty}
                              </td>
                              <td className="px-4 py-2.5 text-xs font-medium text-slate-700">
                                <span className="inline-block bg-orange-50 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded border border-orange-200">
                                  {refugo.reason}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                {(() => {
                                  const displayPhotoUrl = refugo.photoUrl || activeSessionPhotos.find(p => p.itemCode === refugo.id)?.photoUrl;
                                  return displayPhotoUrl ? (
                                    <div 
                                      className="relative inline-block w-12 h-12 rounded border border-slate-200 overflow-hidden bg-slate-100 shadow-3xs cursor-pointer group"
                                      onClick={() => setSelectedPhotoForPreview({
                                        id: refugo.id,
                                        auditId: activeSession.id,
                                        itemCode: refugo.assetId,
                                        itemName: `Refugo: ${refugo.assetName} (${refugo.reason})`,
                                        photoUrl: displayPhotoUrl,
                                        conferenteId: activeSession.conferenteId,
                                        driverId: activeSession.driverId,
                                        driverName: '',
                                        type: 'refugo'
                                      })}
                                    >
                                      <img src={displayPhotoUrl} alt="Refugo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                      <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[8px] text-white">
                                        Ver
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">Sem foto</span>
                                  );
                                })()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Trocas e Reposições de PA Card */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-sans font-bold text-base text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center space-x-2">
                  <span className="bg-purple-600 text-white text-xxs font-bold uppercase px-2 py-0.5 rounded-full">TROCA</span>
                  <span>Trocas de PA</span>
                </h3>

                {!activeSession.exchanges || activeSession.exchanges.filter(e => e.type === 'TROCA').length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-lg text-slate-400 text-xs">
                    Nenhuma troca registrada para esta rota.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500">
                      Itens de troca (avariados que retornaram na rota) registrados pelo conferente:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2 border border-slate-100 rounded-lg overflow-hidden shadow-xs bg-white">
                        <table className="min-w-full divide-y divide-slate-100 text-left">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-4 py-2 font-sans font-bold text-xxs text-slate-500 uppercase tracking-wider">PA Produto</th>
                              <th className="px-4 py-2 font-sans font-bold text-xxs text-slate-500 uppercase tracking-wider text-center w-24">Qtd</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-slate-100">
                            {activeSession.exchanges
                              .filter(e => e.type === 'TROCA')
                              .map((item) => {
                                return (
                                  <tr key={item.productCode} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-2.5">
                                      <span className="font-mono text-[10px] text-purple-700 bg-purple-50 px-1 py-0.5 rounded font-bold mr-2">{item.productCode}</span>
                                      <span className="font-sans font-semibold text-slate-800 text-xs">{item.productDescription}</span>
                                    </td>
                                    <td className="px-4 py-2.5 text-center font-mono text-xs font-bold text-slate-700">
                                      {item.qty}
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>

                      <div className="border border-purple-100 rounded-xl bg-purple-50/20 p-4 space-y-2 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Evidência Fotográfica</span>
                          <h5 className="font-sans font-bold text-slate-800 text-xs mt-2">Trocas Reunidas</h5>
                          <p className="text-[10px] text-slate-500 mt-1">Foto única com todos os itens de troca agrupados juntos.</p>
                        </div>

                        {(() => {
                          // Try unified photo first, fallback to any troca_reposicao photo
                          const exPhoto = activeSessionPhotos.find(p => p.itemCode === 'TROCAS_REUNIDAS' && p.type === 'troca_reposicao') ||
                                          activeSessionPhotos.find(p => p.type === 'troca_reposicao');
                          return exPhoto ? (
                            <div className="mt-2 text-center">
                              <div 
                                className="relative inline-block w-full h-32 rounded-lg border border-purple-200 overflow-hidden bg-slate-100 shadow-sm cursor-pointer group mx-auto"
                                onClick={() => setSelectedPhotoForPreview(exPhoto)}
                                title="Clique para ampliar"
                              >
                                <img src={exPhoto.photoUrl} alt="Trocas Reunidas" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[10px] text-white">
                                  <span>Visualizar Foto</span>
                                  <span className="text-[8px] opacity-75 mt-0.5">(Clique para ampliar)</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="border border-dashed border-purple-200 rounded-lg p-4 text-center text-slate-400 text-xs bg-white/50">
                              Sem foto de evidência
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* RIGHT SIDEBAR: Actions & Impact Summary */}
            <div className="space-y-6">
              
              {/* Financial Balance Summary */}
              <div className="bg-slate-900 text-white rounded-xl shadow-md border border-slate-800 p-6">
                <h4 className="font-sans font-bold text-sm text-slate-200 border-b border-slate-800 pb-3 mb-4">
                  Resumo de Divergências
                </h4>

                {(() => {
                  const stats = getDiscrepancyTotals(activeSession);
                  const totalDiff = stats.missingCount + stats.surplusCount;
                  
                  return (
                    <div className="space-y-4">
                      {totalDiff === 0 ? (
                        <div className="bg-emerald-950/40 text-emerald-400 p-4 rounded-lg border border-emerald-800/50 text-center">
                          <ShieldCheck className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-sm font-semibold">Tudo em Perfeita Ordem!</p>
                          <p className="text-xxs text-slate-400 mt-1">Nenhuma divergência de saldo físico vs fiscal.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {stats.missingCount > 0 && (
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-400">Total Faltas (Perdas):</span>
                              <span className="text-red-400 font-bold font-mono">
                                {stats.missingCount} itens
                              </span>
                            </div>
                          )}

                          {stats.surplusCount > 0 && (
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-400">Total Sobras (Sobrantes):</span>
                              <span className="text-amber-400 font-bold font-mono">
                                {stats.surplusCount} itens
                              </span>
                            </div>
                          )}

                          <div className="border-t border-slate-800 pt-3 mt-1 space-y-1">
                            {stats.missingCost > 0 && (
                              <div className="flex justify-between items-center text-sm font-semibold">
                                <span className="text-slate-400">Impacto (Prejuízo):</span>
                                <span className="text-red-400 font-mono">
                                  -R$ {stats.missingCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            )}

                            {stats.surplusCost > 0 && (
                              <div className="flex justify-between items-center text-sm font-semibold">
                                <span className="text-slate-400">Sobrantes (Ajuste):</span>
                                <span className="text-amber-400 font-mono">
                                  +R$ {stats.surplusCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* ALL EVIDENCE PHOTOS BLOCK */}
              <div className="bg-slate-900 text-white rounded-xl shadow-md border border-slate-800 p-6 space-y-4">
                <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
                  <h4 className="font-sans font-bold text-sm text-slate-200">
                    Todas as Provas do Mapa
                  </h4>
                  <span className="text-[10px] bg-[#0f35a9] text-sky-200 px-2 py-0.5 rounded-full font-mono font-bold font-sans">
                    {activeSessionPhotos.length} fotos
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 max-h-[160px] overflow-y-auto pr-1">
                  {activeSessionPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      onClick={() => setSelectedPhotoForPreview(photo)}
                      className="relative group aspect-square bg-slate-800 border border-slate-700 rounded overflow-hidden cursor-pointer hover:border-amber-500 transition-all shadow-2xs"
                      title={`${photo.itemName || 'Sem descrição'}`}
                    >
                      <img src={photo.photoUrl} alt={photo.itemName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[8px] text-white font-sans text-center px-1">
                        Ver Prova
                      </div>
                    </div>
                  ))}
                  {activeSessionPhotos.length === 0 && (
                    <div className="col-span-4 text-center py-6 text-[10px] text-slate-500 italic">
                      Nenhuma foto vinculada a este mapa ainda.
                    </div>
                  )}
                </div>
              </div>

              {/* Action Operations */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
                <h4 className="font-sans font-bold text-sm text-slate-800">
                  Operações e Observações
                </h4>

                <div>
                  <label className="block text-xxs font-bold text-slate-500 uppercase mb-1">
                    Parecer de Conciliação / Notas *
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Descreva observações ou razões para divergências/reconferência..."
                    value={reconciliationNotes}
                    onChange={(e) => setReconciliationNotes(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={handleFinalizeReconciliation}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg text-xs shadow-xs hover:shadow-md transition flex items-center justify-center space-x-2"
                  >
                    <CheckSquare className="h-4 w-4" />
                    <span>Concluir e Dar Baixa</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRequestReconferencia}
                    className="w-full bg-red-50 hover:bg-red-100 text-red-700 font-bold py-2.5 px-4 rounded-lg text-xs border border-red-200 transition flex items-center justify-center space-x-2"
                  >
                    <RefreshCw className="h-3.5 w-3.5 animate-spin-slow" />
                    <span>Solicitar Reconferência Física</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Botão Flutuante da Calculadora de Garrafas */}
      <div className="fixed bottom-24 right-6 z-40 font-sans" id="bottle_calculator_fab_wrapper">
        <button
          type="button"
          id="btn_toggle_calculator"
          onClick={() => setIsCalculatorOpen(!isCalculatorOpen)}
          className={`flex items-center justify-center p-3.5 rounded-full shadow-lg border text-white transition-all hover:scale-105 active:scale-95 ${
            isCalculatorOpen
              ? 'bg-amber-600 border-amber-700 ring-2 ring-amber-500'
              : 'bg-indigo-600 hover:bg-indigo-700 border-indigo-700'
          }`}
          title="Calculadora de Garrafas"
        >
          <Calculator className="h-5 w-5" />
        </button>
      </div>

      {/* Janela Flutuante da Calculadora */}
      {isCalculatorOpen && (
        <div 
          id="bottle_calculator_window"
          className="fixed bottom-36 right-6 z-50 bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl w-80 p-5 text-white animate-fade-in"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center space-x-2 text-amber-400">
              <Calculator className="h-5 w-5" />
              <span className="font-sans font-bold text-sm uppercase tracking-wider">Calculadora de Garrafas</span>
            </div>
            <button
              type="button"
              onClick={() => setIsCalculatorOpen(false)}
              className="text-slate-400 hover:text-white transition-colors p-1"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Digite a quantidade de garrafeiras para obter o equivalente em garrafas individuais de forma automática.
            </p>

            {/* Garrafeira 1L */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase block font-sans">Garrafeira 1L (x12 Garrafas)</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="0"
                  placeholder="Qtd Garrafeiras"
                  value={calc1L}
                  onChange={(e) => setCalc1L(e.target.value === '' ? '' : Number(e.target.value))}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 w-full font-mono font-bold"
                />
                <span className="text-xs text-slate-400 font-bold shrink-0">➔</span>
                <div className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-400 font-mono font-extrabold w-24 text-center">
                  {calc1L !== '' ? calc1L * 12 : 0} <span className="text-[9px] text-slate-400 uppercase font-sans font-bold">gfa</span>
                </div>
              </div>
            </div>

            {/* Garrafeira 600ml */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase block font-sans">Garrafeira 600ML (Apenas Vasilhame)</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="0"
                  placeholder="Qtd Garrafeiras"
                  value={calc600}
                  onChange={(e) => setCalc600(e.target.value === '' ? '' : Number(e.target.value))}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 w-full font-mono font-bold"
                />
              </div>
            </div>

            {/* Garrafeira 300ml */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase block font-sans">Garrafeira 300ML (x23 Garrafas)</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="0"
                  placeholder="Qtd Garrafeiras"
                  value={calc300}
                  onChange={(e) => setCalc300(e.target.value === '' ? '' : Number(e.target.value))}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 w-full font-mono font-bold"
                />
                <span className="text-xs text-slate-400 font-bold shrink-0">➔</span>
                <div className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-400 font-mono font-extrabold w-24 text-center">
                  {calc300 !== '' ? calc300 * 23 : 0} <span className="text-[9px] text-slate-400 uppercase font-sans font-bold">gfa</span>
                </div>
              </div>
            </div>

            {/* Apply & Reset Buttons */}
            <div className="pt-2 flex space-x-2">
              <button
                type="button"
                onClick={() => {
                  setCalc1L('');
                  setCalc600('');
                  setCalc300('');
                }}
                className="w-1/2 bg-slate-800 hover:bg-slate-750 text-slate-300 py-1.5 rounded-lg text-[10px] font-bold uppercase transition"
              >
                Limpar
              </button>
              {activeSession ? (
                <button
                  type="button"
                  onClick={() => {
                    const updatedAssets = activeSession.assets.map(asset => {
                      const code = getAssetCode(asset.assetId, asset.assetName);
                      if (code === '188005' && calc1L !== '') {
                        return { ...asset, fiscalQty: Number(calc1L) };
                      }
                      if (code === '188006' && calc1L !== '') {
                        return { ...asset, fiscalQty: Number(calc1L) * 12 };
                      }
                      if (code === '899599' && calc600 !== '') {
                        return { ...asset, fiscalQty: Number(calc600) };
                      }
                      if (code === '863059' && calc300 !== '') {
                        return { ...asset, fiscalQty: Number(calc300) };
                      }
                      if (code === '198214' && calc300 !== '') {
                        return { ...asset, fiscalQty: Number(calc300) * 23 };
                      }
                      return asset;
                    });
                    setActiveSession({ ...activeSession, assets: updatedAssets });
                    alert('Quantidades da calculadora aplicadas com sucesso no saldo fiscal!');
                  }}
                  className="w-1/2 bg-amber-500 hover:bg-amber-600 text-slate-950 py-1.5 rounded-lg text-[10px] font-bold uppercase transition"
                >
                  Aplicar Saldo
                </button>
              ) : (
                <div className="w-1/2 text-center text-[9px] text-slate-500 py-1.5 font-sans">
                  Abra uma rota para aplicar
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Photo Preview Modal with Premium Zoom Controls */}
      {selectedPhotoForPreview && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fade-in">
          <div className="absolute top-4 right-4 flex items-center space-x-3 z-50">
            {/* Zoom controls */}
            <div className="bg-slate-900/90 border border-slate-700 rounded-lg p-1 flex items-center space-x-1 shadow-lg text-white">
              <button
                type="button"
                onClick={() => setSelectedPhotoScale(s => Math.max(s - 0.25, 0.5))}
                className="p-1.5 hover:bg-slate-800 rounded font-bold text-sm h-8 w-8 flex items-center justify-center cursor-pointer transition"
                title="Zoom Out"
              >
                -
              </button>
              <span className="px-2 font-mono text-xs font-bold w-12 text-center">{Math.round(selectedPhotoScale * 100)}%</span>
              <button
                type="button"
                onClick={() => setSelectedPhotoScale(s => Math.min(s + 0.25, 4))}
                className="p-1.5 hover:bg-slate-800 rounded font-bold text-sm h-8 w-8 flex items-center justify-center cursor-pointer transition"
                title="Zoom In"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setSelectedPhotoScale(1)}
                className="px-2 py-1 hover:bg-slate-800 rounded font-bold text-xs cursor-pointer transition"
                title="Reset Zoom"
              >
                1x
              </button>
            </div>
            <button
              type="button"
              onClick={() => { setSelectedPhotoForPreview(null); setSelectedPhotoScale(1); }}
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-3 py-1.5 text-xs font-bold uppercase transition cursor-pointer font-sans"
            >
              Fechar [X]
            </button>
          </div>

          {/* Zoomable Container */}
          <div className="w-full h-full flex items-center justify-center overflow-auto p-4 cursor-zoom-in">
            <div 
              className="transition-transform duration-100 ease-out flex items-center justify-center"
              style={{ transform: `scale(${selectedPhotoScale})` }}
            >
              <img
                src={selectedPhotoForPreview.photoUrl}
                alt={selectedPhotoForPreview.itemName}
                className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl border border-slate-800 bg-slate-950"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* Bottom Metabar */}
          <div className="absolute bottom-4 left-4 right-4 bg-slate-950/85 border border-slate-800 text-white p-3.5 rounded-xl max-w-2xl mx-auto flex flex-col space-y-1.5 text-center font-sans">
            <div className="font-bold text-xs uppercase tracking-wider">{selectedPhotoForPreview.itemName || 'Evidência de Retorno'}</div>
            <div className="text-[10px] text-slate-400 font-mono">
              Código / Ativo: <span className="bg-slate-800 px-1.5 py-0.5 rounded font-bold text-white border border-slate-700">{selectedPhotoForPreview.itemCode}</span> 
              <span className="mx-2">|</span> 
              Categoria: <span className="uppercase text-slate-300">
                {selectedPhotoForPreview.type === 'produto' ? 'PA' : 
                 selectedPhotoForPreview.type === 'refugo' ? 'Refugo/Avaria' : 
                 selectedPhotoForPreview.type === 'troca_reposicao' ? 'Troca/Reposição' : 'AG'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" id="custom_confirm_modal_fiscal">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center space-x-3 text-amber-600">
              <div className="p-2 bg-amber-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-amber-600 animate-bounce" />
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

    </div>
  );
}
