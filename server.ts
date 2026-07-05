import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Enable JSON parser for requests
app.use(express.json({ limit: "10mb" }));

// Initialize Gemini client safely
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Custom helper to set headers and handle GitHub requests
const getGithubHeaders = (token?: string) => {
  const headers: Record<string, string> = {
    "User-Agent": "Aistudio-Github-Importer",
    "Accept": "application/vnd.github.v3+json",
  };
  if (token && token.trim() !== "") {
    headers["Authorization"] = `Bearer ${token.trim()}`;
  }
  return headers;
};

// 1. API: Fetch Repo Info
app.get("/api/github/repo", async (req, res) => {
  const { owner, repo, token } = req.query;

  if (!owner || !repo) {
    res.status(400).json({ error: "Parâmetros 'owner' e 'repo' são obrigatórios." });
    return;
  }

  try {
    const url = `https://api.github.com/repos/${owner}/${repo}`;
    const response = await fetch(url, {
      headers: getGithubHeaders(token as string),
    });

    if (response.status === 404) {
      res.status(404).json({ error: "Repositório não encontrado. Verifique se o nome/usuário estão corretos e se o repositório é público." });
      return;
    }

    if (!response.ok) {
      const errorMsg = await response.text();
      res.status(response.status).json({ error: `Erro da API do GitHub: ${response.statusText}. ${errorMsg}` });
      return;
    }

    const data = await response.json();
    res.json({
      owner: data.owner.login,
      repo: data.name,
      name: data.name,
      description: data.description,
      stars: data.stargazers_count,
      forks: data.forks_count,
      openIssues: data.open_issues_count,
      language: data.language,
      license: data.license ? data.license.spdx_id : null,
      defaultBranch: data.default_branch,
      avatarUrl: data.owner.avatar_url,
    });
  } catch (err: any) {
    res.status(500).json({ error: `Erro no servidor: ${err.message}` });
  }
});

// 2. API: Fetch Full Recursive Git Tree
app.get("/api/github/tree", async (req, res) => {
  const { owner, repo, branch, token } = req.query;

  if (!owner || !repo || !branch) {
    res.status(400).json({ error: "Parâmetros 'owner', 'repo' e 'branch' são obrigatórios." });
    return;
  }

  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
    const response = await fetch(url, {
      headers: getGithubHeaders(token as string),
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      res.status(response.status).json({ error: `Erro ao buscar a árvore de arquivos: ${response.statusText}` });
      return;
    }

    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: `Erro no servidor: ${err.message}` });
  }
});

// 3. API: Fetch File Content
app.get("/api/github/file", async (req, res) => {
  const { owner, repo, path: filePath, token } = req.query;

  if (!owner || !repo || !filePath) {
    res.status(400).json({ error: "Parâmetros 'owner', 'repo' e 'path' são obrigatórios." });
    return;
  }

  try {
    // We can fetch contents or raw file
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/${req.query.branch || 'main'}/${filePath}`;
    let response = await fetch(url, {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    });

    // Fallback to official GitHub Contents API if raw fails
    if (!response.ok) {
      const contentsUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${req.query.branch || 'main'}`;
      response = await fetch(contentsUrl, {
        headers: getGithubHeaders(token as string),
      });

      if (!response.ok) {
        res.status(response.status).json({ error: `Erro ao obter arquivo: ${response.statusText}` });
        return;
      }

      const data = await response.json();
      if (data.encoding === "base64" && data.content) {
        const textContent = Buffer.from(data.content, "base64").toString("utf-8");
        res.json({ content: textContent });
        return;
      } else {
        res.status(400).json({ error: "O arquivo requisitado não possui codificação em base64 ou formato de texto válido." });
        return;
      }
    }

    const textContent = await response.text();
    res.json({ content: textContent });
  } catch (err: any) {
    res.status(500).json({ error: `Erro no servidor: ${err.message}` });
  }
});

// 4. API: AI File Analysis (Gemini)
app.post("/api/gemini/analyze", async (req, res) => {
  const { filePath, fileContent, repoContext } = req.body;

  if (!aiClient) {
    res.status(503).json({ error: "API do Gemini não configurada no servidor (verifique a GEMINI_API_KEY)." });
    return;
  }

  if (!filePath || !fileContent) {
    res.status(400).json({ error: "Caminho do arquivo e conteúdo são obrigatórios." });
    return;
  }

  try {
    const prompt = `Analise o arquivo '${filePath}' pertencente ao repositório '${repoContext || "desconhecido"}'.
Conteúdo do arquivo:
\`\`\`
${fileContent.substring(0, 30000)}
\`\`\`

Por favor, faça uma análise detalhada estruturada em JSON seguindo este esquema exato:
{
  "filePath": "${filePath}",
  "summary": "Um breve resumo de uma frase do que este arquivo faz.",
  "explanation": "Uma explicação detalhada das principais funções, lógica e propósitos do código.",
  "suggestions": ["Lista de 2 a 4 sugestões de melhorias de performance, legibilidade, segurança ou boas práticas."],
  "complexity": "Baixa" | "Média" | "Alta"
}

Responda SOMENTE com o JSON válido, sem comentários fora do formato.`;

    const response = await aiClient.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            filePath: { type: Type.STRING },
            summary: { type: Type.STRING },
            explanation: { type: Type.STRING },
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            complexity: { type: Type.STRING },
          },
          required: ["filePath", "summary", "explanation", "suggestions", "complexity"],
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Resposta vazia da IA.");
    }

    const json = JSON.parse(text);
    res.json(json);
  } catch (err: any) {
    console.error("Gemini Error:", err);
    res.status(500).json({ error: `Erro na análise do Gemini: ${err.message}` });
  }
});

// 5. API: AI Chat helper
app.post("/api/gemini/chat", async (req, res) => {
  const { messages, filePath, fileContent, repoInfo } = req.body;

  if (!aiClient) {
    res.status(503).json({ error: "API do Gemini não configurada no servidor (verifique a GEMINI_API_KEY)." });
    return;
  }

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: "Histórico de mensagens é obrigatório." });
    return;
  }

  try {
    // Construct system instruction with contextual repository and file details
    let systemInstruction = "Você é um assistente especialista em programação altamente capacitado. Ajude o usuário a analisar código, debugar, otimizar ou entender o projeto.";
    
    if (repoInfo) {
      systemInstruction += `\nVocê está analisando o repositório '${repoInfo.owner}/${repoInfo.repo}'. Descrição do repositório: ${repoInfo.description || 'Nenhuma'}.`;
    }
    
    if (filePath && fileContent) {
      systemInstruction += `\nO usuário selecionou atualmente o arquivo '${filePath}'. Aqui está o conteúdo do arquivo para seu contexto de resposta:\n\`\`\`\n${fileContent.substring(0, 15000)}\n\`\`\``;
    }

    // Map conversation messages to Gemini format
    const formattedContents = messages.map((m: any) => ({
      role: m.sender === "user" ? "user" : "model",
      parts: [{ text: m.text }]
    }));

    const response = await aiClient.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    res.json({ text: response.text });
  } catch (err: any) {
    res.status(500).json({ error: `Erro no chat do Gemini: ${err.message}` });
  }
});

// 6. Vite Dev Server / Static Assets handling
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
