import React, { useState, useMemo } from 'react';
import { FileCode, Download, Copy, Search, Eye, FileText, Check, AlertTriangle } from 'lucide-react';

interface FileViewerProps {
  filePath: string;
  fileContent: string | null;
  isLoading: boolean;
  error: string | null;
}

export default function FileViewer({ filePath, fileContent, isLoading, error }: FileViewerProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const isMarkdown = filePath.endsWith('.md') || filePath.endsWith('.markdown');

  // Switch tabs automatically based on file type
  React.useEffect(() => {
    if (isMarkdown) {
      setActiveTab('preview');
    } else {
      setActiveTab('code');
    }
  }, [filePath, isMarkdown]);

  const copyToClipboard = () => {
    if (!fileContent) return;
    navigator.clipboard.writeText(fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Safe file downloader
  const downloadRaw = () => {
    if (!fileContent) return;
    const blob = new Blob([fileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filePath.split('/').pop() || 'file.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Custom high-performance inline Markdown parser for React 19 safety
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    const elements: React.ReactNode[] = [];

    // Helper to parse bold and inline code
    const parseInline = (lineText: string) => {
      if (!lineText.includes('**') && !lineText.includes('`')) {
        return lineText;
      }
      const parts: React.ReactNode[] = [];
      const codeParts = lineText.split('`');
      
      codeParts.forEach((part, cIdx) => {
        if (cIdx % 2 === 1) {
          // Inline code
          parts.push(
            <code key={`code-${cIdx}`} className="px-1.5 py-0.5 bg-slate-100 text-red-600 font-mono text-xs rounded border border-slate-200">
              {part}
            </code>
          );
        } else {
          // Normal text, check for bold
          const boldParts = part.split('**');
          boldParts.forEach((bPart, bIdx) => {
            if (bIdx % 2 === 1) {
              parts.push(
                <strong key={`bold-${cIdx}-${bIdx}`} className="font-bold text-slate-900">
                  {bPart}
                </strong>
              );
            } else {
              parts.push(bPart);
            }
          });
        }
      });
      return <>{parts}</>;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          inCodeBlock = false;
          elements.push(
            <pre key={`block-${i}`} className="bg-slate-900 text-slate-200 font-mono text-xs p-4 rounded-xl overflow-x-auto my-3.5 border border-slate-800">
              <code>{codeBlockContent.join('\n')}</code>
            </pre>
          );
          codeBlockContent = [];
        } else {
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        continue;
      }

      // Headers
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={i} className="text-2xl md:text-3xl font-extrabold text-slate-950 mt-6 mb-3 border-b border-slate-100 pb-2">
            {line.substring(2)}
          </h1>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={i} className="text-xl md:text-2xl font-bold text-slate-900 mt-5 mb-2.5">
            {line.substring(3)}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        elements.push(
          <h3 key={i} className="text-lg md:text-xl font-semibold text-slate-800 mt-4 mb-2">
            {line.substring(4)}
          </h3>
        );
      }
      // Bullet points
      else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        elements.push(
          <li key={i} className="ml-5 list-disc text-xs md:text-sm text-slate-600 mb-1 leading-relaxed">
            {parseInline(line.trim().substring(2))}
          </li>
        );
      }
      // Blockquotes
      else if (line.trim().startsWith('> ')) {
        elements.push(
          <blockquote key={i} className="border-l-4 border-slate-300 pl-4 py-1 italic text-slate-500 my-3 text-xs md:text-sm bg-slate-50 rounded-r">
            {parseInline(line.trim().substring(2))}
          </blockquote>
        );
      }
      // Empty spaces
      else if (line.trim() === '') {
        elements.push(<div key={i} className="h-2" />);
      }
      // Normal paragraphs
      else {
        elements.push(
          <p key={i} className="text-xs md:text-sm text-slate-600 leading-relaxed my-1.5">
            {parseInline(line)}
          </p>
        );
      }
    }

    return <div className="space-y-0.5">{elements}</div>;
  };

  // Syntax highlighting mock logic by extension for high visual quality
  const highlightLine = (lineText: string) => {
    if (!lineText.trim()) return <span>&nbsp;</span>;

    // Simple visual highlights matching comments, keys, values, tags, variables
    // Comments
    if (lineText.trim().startsWith('//') || lineText.trim().startsWith('/*') || lineText.trim().startsWith('*') || lineText.trim().startsWith('#')) {
      return <span className="text-slate-400 italic">{lineText}</span>;
    }

    // Try basic keyword highlights for languages
    const words = lineText.split(/(\s+|,|\.|\(|\)|\{|\}|\[|\]|;|=)/);
    const highlighted = words.map((word, idx) => {
      const trimmed = word.trim();
      const jsKeywords = ['const', 'let', 'var', 'import', 'from', 'export', 'default', 'function', 'return', 'class', 'extends', 'if', 'else', 'for', 'while', 'interface', 'type', 'await', 'async', 'try', 'catch', 'throw', 'new'];
      const htmlKeywords = ['div', 'span', 'p', 'h1', 'h2', 'h3', 'button', 'a', 'img', 'svg', 'path', 'className', 'id', 'onClick', 'href', 'src', 'alt'];

      if (jsKeywords.includes(trimmed)) {
        return <span key={idx} className="text-indigo-600 font-semibold">{word}</span>;
      }
      if (htmlKeywords.includes(trimmed)) {
        return <span key={idx} className="text-pink-600">{word}</span>;
      }
      // Strings
      if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('`') && trimmed.endsWith('`'))) {
        return <span key={idx} className="text-emerald-600">{word}</span>;
      }
      // Numbers
      if (!isNaN(Number(trimmed)) && trimmed !== '') {
        return <span key={idx} className="text-amber-600">{word}</span>;
      }

      return word;
    });

    return <>{highlighted}</>;
  };

  // Process and filter lines inside the code viewer
  const fileLines = useMemo(() => {
    if (!fileContent) return [];
    return fileContent.split('\n');
  }, [fileContent]);

  return (
    <div className="flex flex-col h-full bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
      {/* File Viewer Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-4 border-b border-slate-100 bg-slate-50 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
            {isMarkdown ? <FileText className="w-5 h-5 text-indigo-500" /> : <FileCode className="w-5 h-5 text-slate-600" />}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-800 truncate" title={filePath}>
              {filePath.split('/').pop()}
            </h3>
            <p className="text-[10px] md:text-xs text-slate-400 font-medium truncate" title={filePath}>
              {filePath}
            </p>
          </div>
        </div>

        {/* Tab Controls & Actions */}
        <div className="flex items-center gap-2">
          {isMarkdown && (
            <div className="flex p-0.5 bg-slate-200 rounded-lg">
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'preview' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Renderizado
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'code' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                Código
              </button>
            </div>
          )}

          {/* Action buttons */}
          {fileContent && (
            <div className="flex items-center gap-1">
              <button
                onClick={copyToClipboard}
                className="p-2 text-slate-500 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 rounded-lg transition-all cursor-pointer shadow-xs"
                title="Copiar código"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                onClick={downloadRaw}
                className="p-2 text-slate-500 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 rounded-lg transition-all cursor-pointer shadow-xs"
                title="Baixar arquivo raw"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* File Content Body */}
      <div className="flex-1 overflow-auto min-h-[40vh] max-h-[60vh] lg:max-h-[70vh] p-4 relative bg-white">
        {isLoading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400 font-semibold">Carregando arquivo...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500 p-6">
            <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
            <h4 className="text-sm font-bold text-slate-800 mb-1">Erro ao abrir arquivo</h4>
            <p className="text-xs text-slate-400 max-w-sm">{error}</p>
          </div>
        )}

        {!isLoading && !error && !fileContent && (
          <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
            <FileCode className="w-12 h-12 text-slate-200 mb-2" />
            <p className="text-xs font-medium">Selecione um arquivo na árvore ao lado para visualizar seu conteúdo.</p>
          </div>
        )}

        {!isLoading && !error && fileContent && (
          <div className="h-full">
            {isMarkdown && activeTab === 'preview' ? (
              <div className="prose prose-slate max-w-none p-2 md:p-4 text-slate-800 font-sans">
                {renderMarkdown(fileContent)}
              </div>
            ) : (
              <div className="flex flex-col h-full font-mono text-xs select-text leading-relaxed">
                {/* Search bar inside code */}
                <div className="flex items-center gap-2 mb-3 bg-slate-50 border border-slate-200 p-2 rounded-lg">
                  <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Pesquisar código neste arquivo..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 text-xs bg-transparent outline-none text-slate-800 placeholder:text-slate-400 font-sans font-medium"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-[10px] text-slate-400 hover:text-slate-700 font-sans font-semibold cursor-pointer"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                {/* Line by line display */}
                <div className="overflow-x-auto bg-slate-50 border border-slate-100 rounded-xl p-4 max-h-[50vh] lg:max-h-[60vh]">
                  <table className="w-full border-collapse">
                    <tbody>
                      {fileLines.map((line, idx) => {
                        const lineNum = idx + 1;
                        const isMatch = searchQuery && line.toLowerCase().includes(searchQuery.toLowerCase());
                        
                        return (
                          <tr
                            key={idx}
                            className={`group ${isMatch ? 'bg-amber-100 border-l-4 border-amber-500 -ml-1' : 'hover:bg-slate-100/50'}`}
                          >
                            <td className="w-10 pr-4 text-right text-slate-300 group-hover:text-slate-500 font-mono text-[10px] select-none align-top border-r border-slate-200/60 pb-0.5">
                              {lineNum}
                            </td>
                            <td className="pl-4 font-mono text-xs text-slate-800 whitespace-pre align-top pb-0.5">
                              {isMatch ? (
                                <mark className="bg-amber-200 text-slate-950 font-mono rounded-sm px-0.5">{line}</mark>
                              ) : (
                                highlightLine(line)
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
