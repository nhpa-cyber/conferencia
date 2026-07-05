import React, { useState, useMemo } from 'react';
import { Folder, FolderOpen, File, ChevronRight, ChevronDown, Search, FolderClosed, Filter } from 'lucide-react';
import { FileNode } from '../types';

interface FileExplorerProps {
  files: FileNode[];
  onFileSelect: (path: string) => void;
  selectedFilePath: string | null;
}

export default function FileExplorer({ files, onFileSelect, selectedFilePath }: FileExplorerProps) {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set<string>());
  const [searchQuery, setSearchQuery] = useState('');

  // Toggle directory expand/collapse
  const toggleDir = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(expandedDirs);
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
    }
    setExpandedDirs(next);
  };

  // Helper to auto-expand directories containing searched files
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files;

    const query = searchQuery.toLowerCase();
    const newExpanded = new Set<string>();

    const filterNode = (nodes: FileNode[]): FileNode[] => {
      const result: FileNode[] = [];

      for (const node of nodes) {
        if (node.type === 'dir') {
          const childrenMatched = filterNode(node.children || []);
          if (childrenMatched.length > 0 || node.name.toLowerCase().includes(query)) {
            newExpanded.add(node.path);
            result.push({
              ...node,
              children: childrenMatched
            });
          }
        } else {
          if (node.name.toLowerCase().includes(query) || node.path.toLowerCase().includes(query)) {
            result.push(node);
          }
        }
      }

      return result;
    };

    const filtered = filterNode(files);
    // Update expanded directories state if searching
    setTimeout(() => {
      setExpandedDirs(newExpanded);
    }, 0);

    return filtered;
  }, [files, searchQuery]);

  // Render a single tree node recursively
  const renderNode = (node: FileNode, depth: number = 0) => {
    const isDir = node.type === 'dir';
    const isExpanded = expandedDirs.has(node.path);
    const isSelected = selectedFilePath === node.path;

    const paddingLeft = `${depth * 14 + 10}px`;

    return (
      <div key={node.path} className="select-none font-sans text-sm">
        <div
          onClick={() => isDir ? toggleDir(node.path, { stopPropagation: () => {} } as any) : onFileSelect(node.path)}
          style={{ paddingLeft }}
          className={`flex items-center gap-1.5 py-1.5 pr-2 rounded-lg cursor-pointer group transition-all duration-150 ${
            isSelected
              ? 'bg-slate-900 text-white font-medium shadow-xs'
              : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
          }`}
        >
          {/* Arrow / Chevron for dirs */}
          <div className="w-4 h-4 flex items-center justify-center shrink-0">
            {isDir && (
              isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
            )}
          </div>

          {/* Icon */}
          <div className="shrink-0">
            {isDir ? (
              isExpanded ? (
                <FolderOpen className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-amber-500'}`} />
              ) : (
                <FolderClosed className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-amber-500'}`} />
              )
            ) : (
              <File className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
            )}
          </div>

          {/* Name */}
          <span className="truncate flex-1 text-xs md:text-sm" title={node.path}>
            {node.name}
          </span>

          {/* File Size Badge for files (visible on hover) */}
          {!isDir && node.size > 0 && (
            <span className={`text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity shrink-0 px-1 bg-slate-100 text-slate-500 rounded border border-slate-200 ${isSelected ? 'bg-slate-800 text-slate-300 border-slate-700' : ''}`}>
              {(node.size / 1024).toFixed(1)} KB
            </span>
          )}
        </div>

        {/* Render children recursively if directory and expanded */}
        {isDir && isExpanded && node.children && (
          <div className="mt-0.5">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
      {/* Title & Explorer Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3">
          <Folder className="w-4 h-4 text-slate-400" />
          Árvore de Arquivos
        </h2>
        
        {/* Search input inside explorer */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar arquivos..."
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 focus:border-slate-900 rounded-lg text-xs placeholder:text-slate-400 outline-none font-medium transition-all"
          />
        </div>
      </div>

      {/* List container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 max-h-[60vh] lg:max-h-[70vh]">
        {filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Filter className="w-6 h-6 text-slate-300 mb-2" />
            <p className="text-xs text-slate-400 font-medium">Nenhum arquivo encontrado.</p>
          </div>
        ) : (
          filteredFiles.map((node) => renderNode(node, 0))
        )}
      </div>
    </div>
  );
}
