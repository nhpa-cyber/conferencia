import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, MessageSquare, Send, Loader2, Play, AlertCircle, RefreshCw, CheckCircle, Code } from 'lucide-react';
import { FileAnalysis, ChatMessage, RepoInfo } from '../types';

interface AiAnalyzerProps {
  filePath: string | null;
  fileContent: string | null;
  repoInfo: RepoInfo | null;
}

export default function AiAnalyzer({ filePath, fileContent, repoInfo }: AiAnalyzerProps) {
  const [analysis, setAnalysis] = useState<FileAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isSendingMsg, setIsSendingMsg] = useState(false);
  const [activeTab, setActiveTab] = useState<'analysis' | 'chat'>('analysis');

  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Clear analysis on file change
  useEffect(() => {
    setAnalysis(null);
    setAnalysisError(null);
    setChatMessages([]);
  }, [filePath]);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isSendingMsg]);

  // Trigger File Analysis
  const handleAnalyze = async () => {
    if (!filePath || !fileContent) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysis(null);

    try {
      const response = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath,
          fileContent,
          repoContext: repoInfo ? `${repoInfo.owner}/${repoInfo.repo}` : undefined,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Falha ao analisar arquivo com o Gemini.');
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (err: any) {
      setAnalysisError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Trigger Chat Message sending
  const handleSendChat = async (text: string) => {
    if (!text.trim() || isSendingMsg) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setUserInput('');
    setIsSendingMsg(true);

    try {
      const payload = {
        messages: [...chatMessages, userMsg],
        filePath,
        fileContent,
        repoInfo,
      };

      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Erro ao conversar com a inteligência artificial.');
      }

      const data = await response.json();

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: data.text || 'Desculpe, não consegui formular uma resposta.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: `⚠️ Erro: ${err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSendingMsg(false);
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'Baixa':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Média':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Alta':
        return 'bg-red-50 text-red-700 border-red-100';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  // Quick Action Prompts
  const quickChips = [
    { label: '🔍 Buscar Bugs', text: 'Você consegue encontrar possíveis vulnerabilidades ou bugs lógicos neste arquivo?' },
    { label: '⚡ Otimizar Código', text: 'Quais otimizações de performance ou consumo de memória você recomendaria para este código?' },
    { label: '🧪 Criar Testes', text: 'Escreva um exemplo estruturado de testes unitários abrangentes para as funções principais deste arquivo.' },
    { label: '📝 Explicar Fluxo', text: 'Explique o fluxo de execução lógica e a arquitetura adotada neste código passo a passo.' },
  ];

  if (!filePath) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-full bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400">
        <Sparkles className="w-8 h-8 text-slate-300 mb-2 animate-pulse" />
        <p className="text-xs font-semibold">Selecione um arquivo para desbloquear as funções de IA.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
      {/* Header Tabs */}
      <div className="flex items-center justify-between px-4 border-b border-slate-100 bg-slate-50">
        <div className="flex">
          <button
            onClick={() => setActiveTab('analysis')}
            className={`flex items-center gap-2 px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'analysis'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Análise por IA
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'chat'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Chat Técnico
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto p-4 max-h-[60vh] lg:max-h-[70vh] min-h-[40vh]">
        {activeTab === 'analysis' ? (
          <div className="space-y-4">
            {!analysis && !isAnalyzing && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Sparkles className="w-12 h-12 text-indigo-100 mb-3 animate-bounce" />
                <h4 className="text-sm font-bold text-slate-800 mb-1">Avaliação Inteligente de Código</h4>
                <p className="text-xs text-slate-400 max-w-sm mb-5 leading-relaxed">
                  Utilize o Gemini para inspecionar este arquivo. Ele identificará o propósito do código, avaliará complexidade e indicará sugestões de melhoria.
                </p>
                <button
                  onClick={handleAnalyze}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Analisar com IA
                </button>
              </div>
            )}

            {isAnalyzing && (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-800 animate-pulse">Lendo estrutura do arquivo...</h4>
                  <p className="text-[11px] text-slate-400">O Gemini está extraindo a semântica e avaliando boas práticas.</p>
                </div>
              </div>
            )}

            {analysisError && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Erro ao processar análise.</span>
                </div>
                <p className="text-slate-500 leading-relaxed">{analysisError}</p>
                <button
                  onClick={handleAnalyze}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 hover:border-red-300 text-red-700 text-[10px] font-bold rounded-lg transition-all cursor-pointer shadow-xs"
                >
                  <RefreshCw className="w-3 h-3" /> Tentar Novamente
                </button>
              </div>
            )}

            {analysis && (
              <div className="space-y-4 font-sans text-slate-800">
                {/* Meta Summary Badge & Complexity */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Complexidade:</span>
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full border ${getComplexityColor(analysis.complexity)}`}>
                      {analysis.complexity}
                    </span>
                  </div>
                  <button
                    onClick={handleAnalyze}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 hover:text-indigo-600 self-start transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Reanalisar
                  </button>
                </div>

                {/* Brief Summary */}
                <div className="space-y-1">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">O que este arquivo faz?</h5>
                  <p className="text-xs md:text-sm font-medium text-slate-800 bg-slate-50 p-3 border border-slate-100 rounded-xl leading-relaxed">
                    {analysis.summary}
                  </p>
                </div>

                {/* Explanation */}
                <div className="space-y-1">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Explicação Detalhada</h5>
                  <p className="text-xs md:text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 p-3 border border-slate-100 rounded-xl leading-relaxed">
                    {analysis.explanation}
                  </p>
                </div>

                {/* Suggestions */}
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sugestões de Melhoria ({analysis.suggestions.length})</h5>
                  <div className="space-y-2">
                    {analysis.suggestions.map((suggestion, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 p-3 bg-indigo-50/50 border border-indigo-100/40 rounded-xl text-xs md:text-sm text-slate-700 leading-relaxed"
                      >
                        <CheckCircle className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                        <span>{suggestion}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* CHAT TECHNICAL VIEW */
          <div className="flex flex-col h-[50vh] max-h-[50vh]">
            {/* Conversation Flow Area */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 pb-4">
              {chatMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400 h-full">
                  <MessageSquare className="w-8 h-8 text-slate-200 mb-2" />
                  <h5 className="text-xs font-bold text-slate-700">Chat contextualizado com o código</h5>
                  <p className="text-[11px] text-slate-400 max-w-[240px] leading-relaxed mt-0.5">
                    Tire dúvidas específicas sobre este arquivo ou peça recomendações diretamente ao Gemini.
                  </p>
                </div>
              )}

              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[85%] ${
                    msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                  }`}
                >
                  <div
                    className={`p-3 rounded-2xl text-xs md:text-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-slate-900 text-white rounded-br-none'
                        : 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200/60'
                    }`}
                  >
                    {msg.sender === 'assistant' && msg.text.includes('```') ? (
                      <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs bg-slate-950 text-slate-200 p-2.5 rounded-lg border border-slate-800 my-1">
                        <code>{msg.text}</code>
                      </pre>
                    ) : (
                      <span className="whitespace-pre-wrap">{msg.text}</span>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono mt-1 px-1">
                    {msg.timestamp}
                  </span>
                </div>
              ))}

              {isSendingMsg && (
                <div className="flex items-center gap-2 max-w-[80%] bg-slate-50 border border-slate-100 p-3 rounded-2xl rounded-bl-none text-slate-500 text-xs font-medium mr-auto">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                  <span>Escrevendo resposta técnica...</span>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Quick Suggestions Chips */}
            {chatMessages.length === 0 && (
              <div className="pt-2 pb-3 flex flex-wrap gap-1.5 border-t border-slate-100 bg-white">
                {quickChips.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendChat(chip.text)}
                    disabled={isSendingMsg}
                    className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-[10px] md:text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-100 hover:border-slate-200 rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            )}

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (userInput.trim()) handleSendChat(userInput);
              }}
              className="flex gap-2 pt-2 border-t border-slate-100"
            >
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Pergunte sobre as variáveis, lógica ou bugs..."
                disabled={isSendingMsg}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 focus:border-slate-900 rounded-xl text-xs md:text-sm outline-none transition-all font-medium"
              />
              <button
                type="submit"
                disabled={isSendingMsg || !userInput.trim()}
                className="p-2 bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-xs"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
