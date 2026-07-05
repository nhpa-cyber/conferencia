import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Github, RefreshCw, LogOut, FileCode, CheckCircle2, Layout, BookOpen, MessageSquare } from 'lucide-react';
import RepoSelector from './components/RepoSelector';
import RepoStats from './components/RepoStats';
import FileExplorer from './components/FileExplorer';
import FileViewer from './components/FileViewer';
import AiAnalyzer from './components/AiAnalyzer';
import { RepoInfo, FileNode } from './types';

// Tree construction algorithm
function buildFileTree(items: any[]): FileNode[] {
  const root: FileNode[] = [];
  items.sort((a, b) => a.path.localeCompare(b.path));

  const pathMap: Record<string, FileNode> = {};

  for (const item of items) {
    const parts = item.path.split('/');
    const name = parts[parts.length - 1];
    const isDir = item.type === 'tree';

    const node: FileNode = {
      path: item.path,
      name: name,
      type: isDir ? 'dir' : 'file',
      size: item.size || 0,
      downloadUrl: item.url,
      children: isDir ? [] : undefined,
    };

    pathMap[item.path] = node;

    if (parts.length === 1) {
      root.push(node);
    } else {
      const parentPath = parts.slice(0, parts.length - 1).join('/');
      const parentNode = pathMap[parentPath];
      if (parentNode && parentNode.children) {
        parentNode.children.push(node);
      } else {
        root.push(node);
      }
    }
  }

  const sortTree = (nodes: FileNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'dir' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    for (const node of nodes) {
      if (node.children) {
        sortTree(node.children);
      }
    }
  };

  sortTree(root);
  return root;
}

export default function App() {
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [githubToken, setGithubToken] = useState('');
  
  // File State
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [selectedFileContent, setSelectedFileContent] = useState<string | null>(null);
  
  // Loading & Error states
  const [isLoading, setIsLoading] = useState(false);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Trigger Repository Import
  const handleImport = async (owner: string, repo: string, token: string) => {
    setIsLoading(true);
    setError(null);
    setGithubToken(token);
    setSelectedFilePath(null);
    setSelectedFileContent(null);

    try {
      // 1. Fetch Repository General Metadata
      const repoRes = await fetch(`/api/github/repo?owner=${owner}&repo=${repo}&token=${token}`);
      if (!repoRes.ok) {
        const errData = await repoRes.json();
        throw new Error(errData.error || 'Não foi possível buscar as informações do repositório.');
      }
      const repoData: RepoInfo = await repoRes.json();

      // 2. Fetch Recursive Git Tree
      const treeRes = await fetch(`/api/github/tree?owner=${owner}&repo=${repo}&branch=${repoData.defaultBranch}&token=${token}`);
      if (!treeRes.ok) {
        const errData = await treeRes.json();
        throw new Error(errData.error || 'Não foi possível buscar a estrutura de pastas do repositório.');
      }
      const treeData = await treeRes.json();

      // Build tree
      if (!treeData.tree || !Array.isArray(treeData.tree)) {
        throw new Error('Formato da árvore de arquivos retornado pelo GitHub é inválido.');
      }

      const nestedTree = buildFileTree(treeData.tree);
      
      setRepoInfo(repoData);
      setFileTree(nestedTree);

      // Try auto-loading README.md or standard files to give an outstanding initial view
      const flatFiles = treeData.tree.filter((t: any) => t.type === 'blob');
      const readmeFile = flatFiles.find((f: any) => f.path.toLowerCase() === 'readme.md');
      
      if (readmeFile) {
        handleFileSelect(readmeFile.path, repoData, token);
      } else if (flatFiles.length > 0) {
        handleFileSelect(flatFiles[0].path, repoData, token);
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch individual File Content
  const handleFileSelect = async (path: string, currentRepo = repoInfo, token = githubToken) => {
    if (!currentRepo) return;
    
    setSelectedFilePath(path);
    setIsFileLoading(true);
    setFileError(null);
    setSelectedFileContent(null);

    try {
      const res = await fetch(
        `/api/github/file?owner=${currentRepo.owner}&repo=${currentRepo.repo}&path=${path}&branch=${currentRepo.defaultBranch}&token=${token}`
      );

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `Erro ao carregar arquivo: ${res.statusText}`);
      }

      const data = await res.json();
      setSelectedFileContent(data.content);
    } catch (err: any) {
      setFileError(err.message);
    } finally {
      setIsFileLoading(false);
    }
  };

  const handleBackToSelector = () => {
    setRepoInfo(null);
    setFileTree([]);
    setSelectedFilePath(null);
    setSelectedFileContent(null);
    setError(null);
    setGithubToken('');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-indigo-500 selection:text-white">
      <AnimatePresence mode="wait">
        {!repoInfo ? (
          <RepoSelector
            key="selector"
            onSelect={handleImport}
            isLoading={isLoading}
            error={error}
          />
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col min-h-screen"
          >
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 backdrop-blur-md px-4 py-3 md:px-6">
              <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                {/* Title and Repo info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-slate-100 shadow-sm flex items-center justify-center bg-slate-50">
                    {repoInfo.avatarUrl ? (
                      <img
                        src={repoInfo.avatarUrl}
                        alt={repoInfo.owner}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Github className="w-5 h-5 text-slate-700" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-400 truncate max-w-[100px] md:max-w-none">
                        {repoInfo.owner}
                      </span>
                      <span className="text-slate-300 font-bold">/</span>
                      <h1 className="text-sm md:text-base font-bold text-slate-900 truncate">
                        {repoInfo.name}
                      </h1>
                    </div>
                    <p className="text-[10px] md:text-xs text-slate-500 truncate max-w-[200px] md:max-w-md font-medium">
                      {repoInfo.description || 'Sem descrição cadastrada.'}
                    </p>
                  </div>
                </div>

                {/* Return button */}
                <button
                  onClick={handleBackToSelector}
                  className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs border border-slate-200/40"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Mudar Repositório</span>
                </button>
              </div>
            </header>

            {/* Dashboard Workspace */}
            <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
              {/* Repository stats bar */}
              <RepoStats repoInfo={repoInfo} />

              {/* Core Layout: Sidebar Explorer + Contents Viewers */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Left panel: File Tree */}
                <div className="lg:col-span-4 h-full">
                  <FileExplorer
                    files={fileTree}
                    onFileSelect={(path) => handleFileSelect(path)}
                    selectedFilePath={selectedFilePath}
                  />
                </div>

                {/* Right Panel: File Preview and AI Analyser */}
                <div className="lg:col-span-8 flex flex-col gap-5">
                  {/* File Preview */}
                  <FileViewer
                    filePath={selectedFilePath || ''}
                    fileContent={selectedFileContent}
                    isLoading={isFileLoading}
                    error={fileError}
                  />

                  {/* AI reviewer block */}
                  <AiAnalyzer
                    filePath={selectedFilePath}
                    fileContent={selectedFileContent}
                    repoInfo={repoInfo}
                  />
                </div>
              </div>
            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
