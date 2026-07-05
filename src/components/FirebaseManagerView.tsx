import React, { useState, useEffect } from 'react';
import { HardDrive, RefreshCw, CheckCircle2, AlertTriangle, Trash2, HelpCircle, Key, Globe, Layers, Folder, Send, Laptop, ShieldCheck } from 'lucide-react';

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
  firestoreDatabaseId: string;
}

export default function FirebaseManagerView() {
  const [config, setConfig] = useState<FirebaseConfig>({
    apiKey: 'AIzaSyA_ykhJGRkIDbPuDNYooMIVvB2DeVzp2VE',
    authDomain: 'armazemfacil-b2292.firebaseapp.com',
    projectId: 'armazemfacil-b2292',
    storageBucket: 'armazemfacil-b2292.appspot.com',
    messagingSenderId: '688234941301',
    appId: '1:688234941301:web:153e2ad3f634379fe3213c',
    measurementId: 'G-6HFDEKWVDB',
    firestoreDatabaseId: '(default)'
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [clearing, setClearing] = useState<boolean>(false);
  const [status, setStatus] = useState<'connected' | 'error' | 'not_configured'>('not_configured');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load current config from server
  const fetchConfig = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/firebase/config');
      const data = await response.json();
      if (data.success) {
        if (data.configured && data.config) {
          setConfig(data.config);
          setStatus(data.connectionStatus);
        } else {
          setStatus('not_configured');
        }
      } else {
        setErrorMessage(data.error || 'Erro ao carregar configurações do servidor.');
      }
    } catch (err: any) {
      setErrorMessage('Erro de rede ao conectar com o servidor: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: value.trim()
    }));
  };

  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) {
      setErrorMessage('Os campos com asterisco (*) são obrigatórios para a conexão Firebase.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/firebase/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      const data = await response.json();

      if (data.success) {
        if (data.connected) {
          setStatus('connected');
          setSuccessMessage('Conexão com o Firebase Firestore validada com sucesso! Todos os dados operacionais agora estão sincronizados em nuvem.');
        } else {
          setStatus('error');
          setErrorMessage('Configuração gravada, mas a conexão de teste com o Firestore falhou. Verifique se as credenciais estão corretas ou se as regras do Firestore permitem escrita.');
        }
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Erro ao processar a validação do Firebase no servidor.');
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMessage('Falha ao enviar dados para o servidor: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const handleClearConfig = async () => {
    if (!confirm('Tem certeza de que deseja desconectar o Firebase? A plataforma voltará a salvar os dados em arquivo local (database.json) no servidor.')) {
      return;
    }

    setClearing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/firebase/clear', {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        setConfig({
          apiKey: '',
          authDomain: '',
          projectId: '',
          storageBucket: '',
          messagingSenderId: '',
          appId: '',
          measurementId: '',
          firestoreDatabaseId: ''
        });
        setStatus('not_configured');
        setSuccessMessage('Firebase desconectado com sucesso! A plataforma agora opera em modo offline local.');
      } else {
        setErrorMessage(data.error || 'Erro ao desconectar Firebase no servidor.');
      }
    } catch (err: any) {
      setErrorMessage('Falha ao enviar solicitação para o servidor: ' + (err.message || err));
    } finally {
      setClearing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 bg-white rounded-2xl border border-slate-200 shadow-xs" id="firebase_loading">
        <RefreshCw className="h-10 w-10 text-amber-500 animate-spin" />
        <p className="text-sm font-sans font-semibold text-slate-600">Verificando status da conexão Firebase...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in" id="gestor_firebase_tab">
      
      {/* Upper Status Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h3 className="font-sans font-bold text-xs text-amber-500 uppercase tracking-widest">
            Sincronização de Dados e Infraestrutura Nuvem
          </h3>
          <h2 className="text-xl sm:text-2xl font-extrabold font-sans tracking-tight">
            Gerenciamento de Conexão Firebase (Firestore)
          </h2>
          <p className="text-slate-400 text-xxs max-w-2xl leading-relaxed">
            Configure as credenciais do seu projeto Firebase para ativar a persistência em tempo real multiusuário. Quando conectado, o sistema sincroniza automaticamente todas as auditorias, vales, motoristas, veículos e produtos com o Google Cloud Firestore.
          </p>
        </div>

        {/* Connection Status Badge */}
        <div className="flex-shrink-0 flex items-center">
          {status === 'connected' && (
            <div className="bg-emerald-950/80 border border-emerald-500 text-emerald-300 px-4 py-3 rounded-xl flex items-center space-x-3 shadow-md" id="status_connected">
              <CheckCircle2 className="h-6 w-6 text-emerald-400 flex-shrink-0" />
              <div>
                <span className="font-extrabold text-[10px] uppercase tracking-wider block">Status da Conexão</span>
                <span className="text-xs font-semibold">ATIVO & CONECTADO</span>
              </div>
            </div>
          )}
          {status === 'error' && (
            <div className="bg-red-950/80 border border-red-500 text-red-300 px-4 py-3 rounded-xl flex items-center space-x-3 shadow-md" id="status_error">
              <AlertTriangle className="h-6 w-6 text-red-400 flex-shrink-0" />
              <div>
                <span className="font-extrabold text-[10px] uppercase tracking-wider block">Status da Conexão</span>
                <span className="text-xs font-semibold">FALHA NA CONEXÃO</span>
              </div>
            </div>
          )}
          {status === 'not_configured' && (
            <div className="bg-slate-850 border border-slate-700 text-slate-300 px-4 py-3 rounded-xl flex items-center space-x-3 shadow-md" id="status_not_configured">
              <HardDrive className="h-6 w-6 text-slate-400 flex-shrink-0" />
              <div>
                <span className="font-extrabold text-[10px] uppercase tracking-wider block">Status da Conexão</span>
                <span className="text-xs font-semibold">MODO LOCAL (OFFLINE)</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Alert Messages */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-start space-x-3 shadow-3xs" id="success_alert">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs font-medium leading-relaxed">{successMessage}</div>
        </div>
      )}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start space-x-3 shadow-3xs" id="error_alert">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs font-medium leading-relaxed">{errorMessage}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Form Settings */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-extrabold font-sans text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-500" />
              Credenciais de Acesso à Nuvem
            </h3>
            <p className="text-xxs text-slate-500 mt-1">
              Insira abaixo os parâmetros do SDK do Firebase do seu console do Google. Os dados de faturamento serão gravados com segurança.
            </p>
          </div>

          <form onSubmit={handleSaveAndTest} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* API Key */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Key className="h-3 w-3 text-slate-400" />
                  API Key <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="apiKey"
                  value={config.apiKey}
                  onChange={handleInputChange}
                  placeholder="AIzaSyB..."
                  required
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              {/* Auth Domain */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Globe className="h-3 w-3 text-slate-400" />
                  Auth Domain <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="authDomain"
                  value={config.authDomain}
                  onChange={handleInputChange}
                  placeholder="meu-projeto.firebaseapp.com"
                  required
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              {/* Project ID */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Layers className="h-3 w-3 text-slate-400" />
                  Project ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="projectId"
                  value={config.projectId}
                  onChange={handleInputChange}
                  placeholder="meu-projeto"
                  required
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              {/* Storage Bucket */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Folder className="h-3 w-3 text-slate-400" />
                  Storage Bucket
                </label>
                <input
                  type="text"
                  name="storageBucket"
                  value={config.storageBucket}
                  onChange={handleInputChange}
                  placeholder="meu-projeto.appspot.com"
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              {/* Messaging Sender ID */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Send className="h-3 w-3 text-slate-400" />
                  Messaging Sender ID
                </label>
                <input
                  type="text"
                  name="messagingSenderId"
                  value={config.messagingSenderId}
                  onChange={handleInputChange}
                  placeholder="1234567890"
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              {/* App ID */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Laptop className="h-3 w-3 text-slate-400" />
                  App ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="appId"
                  value={config.appId}
                  onChange={handleInputChange}
                  placeholder="1:1234:web:abcd"
                  required
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              {/* Measurement ID */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Laptop className="h-3 w-3 text-slate-400" />
                  Measurement ID <span className="text-slate-400 font-sans font-normal text-[9px]">(Opcional)</span>
                </label>
                <input
                  type="text"
                  name="measurementId"
                  value={config.measurementId}
                  onChange={handleInputChange}
                  placeholder="G-XXXXXX"
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              {/* Firestore Database ID */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <HardDrive className="h-3 w-3 text-slate-400" />
                  Firestore Database ID <span className="text-slate-400 font-sans font-normal text-[9px]">(Opcional)</span>
                </label>
                <input
                  type="text"
                  name="firestoreDatabaseId"
                  value={config.firestoreDatabaseId}
                  onChange={handleInputChange}
                  placeholder="ai-studio-remix..."
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

            </div>

            {/* Actions Panel */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-3 justify-between items-center">
              
              {/* Reset/Clear Config Button */}
              {status !== 'not_configured' ? (
                <button
                  type="button"
                  disabled={clearing || saving}
                  onClick={handleClearConfig}
                  className="bg-red-50 hover:bg-red-100 text-red-700 font-extrabold px-4 py-2 rounded-xl border border-red-200 transition text-xxs tracking-wider uppercase flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  id="btn_disconnect_firebase"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{clearing ? 'Desconectando...' : 'Desconectar Firebase'}</span>
                </button>
              ) : <div />}

              <div className="flex flex-wrap gap-3">
                {/* Auto-preencher Padrão */}
                <button
                  type="button"
                  onClick={() => {
                    setConfig({
                      apiKey: 'AIzaSyA_ykhJGRkIDbPuDNYooMIVvB2DeVzp2VE',
                      authDomain: 'armazemfacil-b2292.firebaseapp.com',
                      projectId: 'armazemfacil-b2292',
                      storageBucket: 'armazemfacil-b2292.appspot.com',
                      messagingSenderId: '688234941301',
                      appId: '1:688234941301:web:153e2ad3f634379fe3213c',
                      measurementId: 'G-6HFDEKWVDB',
                      firestoreDatabaseId: '(default)'
                    });
                    setSuccessMessage('Campos preenchidos com as credenciais padrão do projeto!');
                    setTimeout(() => setSuccessMessage(null), 3000);
                  }}
                  className="bg-amber-50 hover:bg-amber-100 text-amber-800 font-extrabold px-4 py-2.5 rounded-xl border border-amber-200 transition text-xxs tracking-wider uppercase flex items-center space-x-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Preencher Padrão</span>
                </button>

                {/* Save/Test Button */}
                <button
                  type="submit"
                  disabled={saving || clearing}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold px-6 py-2.5 rounded-xl transition text-xxs tracking-wider uppercase flex items-center space-x-2 cursor-pointer shadow-sm disabled:opacity-50"
                  id="btn_save_firebase"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Conectando & Testando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Salvar e Testar Conexão</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </form>
        </div>

        {/* Right Column: Instructions */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-6">
          <h3 className="text-sm font-extrabold font-sans text-slate-900 flex items-center gap-2">
            <HelpCircle className="h-4.5 w-4.5 text-amber-600" />
            Como criar seu Firebase?
          </h3>
          
          <div className="space-y-4 text-xxs text-slate-600 leading-relaxed font-sans">
            <div className="space-y-1">
              <span className="font-bold text-slate-800 block">1. Acesse o Console</span>
              <p>Abra o <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-amber-600 font-bold hover:underline">Console do Firebase</a> e faça login com sua conta do Google.</p>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-slate-800 block">2. Crie ou Selecione um Projeto</span>
              <p>Clique em <strong>"Adicionar projeto"</strong>, dê um nome (ex: <code>Pau Brasil Guarabira</code>) e continue até concluir.</p>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-slate-800 block">3. Registre um Web App</span>
              <p>No painel do projeto, clique no ícone web <code>(&lt;/&gt;)</code> para registrar um aplicativo. Dê um nome de identificação e clique em Registrar.</p>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-slate-800 block">4. Copie o objeto firebaseConfig</span>
              <p>O Firebase exibirá um bloco de código contendo o <code>firebaseConfig</code>. Copie os valores e cole nos respectivos campos ao lado.</p>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-slate-800 block">5. Ative o Cloud Firestore</span>
              <p>No menu lateral esquerdo, vá em <strong>Build &gt; Firestore Database</strong> e clique em <strong>Criar banco de dados</strong>. Escolha o modo de teste ou de produção e selecione uma região próxima do Brasil.</p>
            </div>

            <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-900 p-3 rounded-lg space-y-1.5">
              <span className="font-extrabold uppercase tracking-wider block text-[9px]">Segurança Máxima</span>
              <p className="text-[10px] leading-snug">
                As credenciais cadastradas são gravadas de forma segura e exclusiva no servidor Cloud Run privado da sua distribuidora. Nenhum dado ou chave vaza no navegador de terceiros.
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
