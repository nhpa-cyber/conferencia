export interface RepoInfo {
  owner: string;
  repo: string;
  name: string;
  description: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  language: string | null;
  license: string | null;
  defaultBranch: string;
  avatarUrl: string;
}

export interface FileNode {
  path: string;
  name: string;
  type: 'file' | 'dir';
  size: number;
  downloadUrl: string | null;
  children?: FileNode[];
  content?: string;
  isLoaded?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface FileAnalysis {
  filePath: string;
  summary: string;
  explanation: string;
  suggestions: string[];
  complexity: 'Low' | 'Medium' | 'High' | 'Unknown';
}
