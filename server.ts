import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import multer from 'multer';
import * as mammoth from 'mammoth';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

dotenv.config();

const app = express();
const PORT = 3000;

const upload = multer({ storage: multer.memoryStorage() });

// Initialize Gemini or Vertex AI based on provided credentials
import fs from 'fs';

let ai: GoogleGenAI;

if (process.env.GOOGLE_CREDENTIALS_JSON) {
  // Using Vertex AI via Service Account JSON
  fs.writeFileSync('/tmp/gcp-credentials.json', process.env.GOOGLE_CREDENTIALS_JSON);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = '/tmp/gcp-credentials.json';
  
  let projectId = '';
  try {
    const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    projectId = creds.project_id || '';
  } catch (e) {
    console.error('Failed to parse GOOGLE_CREDENTIALS_JSON:', e);
  }

  ai = new GoogleGenAI({
    vertexai: {
      project: projectId || process.env.VERTEX_PROJECT_ID || '',
      location: process.env.VERTEX_LOCATION || 'us-central1'
    }
  });
  console.log('Initialized using Vertex AI for project:', projectId);
} else {
  // Using standard Gemini API Key
  ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY || '',
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });
  console.log('Initialized using standard Gemini API Key');
}

app.use(express.json());

// In-memory reports store for MVP
const reports: any[] = [];

// --- File Upload Endpoint ---
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  try {
    let text = '';
    const buffer = req.file.buffer;
    
    const filename = req.file.originalname.toLowerCase();
    
    if (filename.endsWith('.pdf') || req.file.mimetype === 'application/pdf') {
      const data = await pdfParse(buffer);
      text = data.text;
    } else if (
      filename.endsWith('.docx') || filename.endsWith('.doc') || 
      req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      req.file.mimetype === 'application/msword'
    ) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (filename.endsWith('.txt') || req.file.mimetype?.startsWith('text/')) {
      text = buffer.toString('utf-8');
    } else {
      return res.status(400).json({ error: 'Unsupported file format. Please upload PDF, DOCX, or TXT.' });
    }
    
    res.json({ text: text.trim() });
  } catch (error) {
    console.error('File Upload Error:', error);
    res.status(500).json({ error: 'Failed to process file' });
  }
});

// --- AI Detect Endpoint ---
app.post('/api/ai-detect', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text is required' });

  try {
    const prompt = `Analyze the following text for signs of AI generation. 
    1. Provide Human-written percentage and AI-written percentage (must sum to 100).
    2. Risk level: Low, Medium, or High.
    3. Confidence score (0-100).
    4. Highlight specific segments (JSON array) that show strong AI patterns.
    5. Explain briefly why.
    Return the response in strict JSON format: 
    {
      "humanScore": number,
      "aiScore": number,
      "riskLevel": "Low" | "Medium" | "High",
      "confidence": number,
      "explanation": "string",
      "segments": [{"text": "string", "reason": "string", "startIndex": number, "endIndex": number}]
    }

    Text: ${text.slice(0, 5000)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    const jsonStr = response.text?.replace(/```json|```/g, '').trim() || '{}';
    res.json(JSON.parse(jsonStr));
  } catch (error) {
    console.error('AI Detect Error:', error);
    res.status(500).json({ error: 'Failed to analyze text' });
  }
});

// --- Humanize Endpoint ---
app.post('/api/humanize', async (req, res) => {
  const { text, tone } = req.body;
  
  try {
    const prompt = `Rewrite the text to sound more natural, human, and academically responsible. 
    Selected Tone: ${tone || 'Academic'}.
    Preserve the original meaning, avoid adding unsupported facts, improve sentence variation, and reduce repetitive AI-like phrasing.
    Return JSON: { "humanizedText": "string", "changes": "string", "warnings": ["string"] }

    Text: ${text}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    const jsonStr = response.text?.replace(/```json|```/g, '').trim() || '{}';
    res.json(JSON.parse(jsonStr));
  } catch (error) {
    res.status(500).json({ error: 'Failed to humanize' });
  }
});

// --- Plagiarism Checker (inc. Web Scan Mock) ---
app.post('/api/plagiarism-check', async (req, res) => {
  const { text, scanDepth } = req.body;

  try {
    // Phase 1: Topic & Query Generation
    const queryPrompt = `Act as an academic integrity tool. Analyze the following text and generate 5 specialized search queries to find similar sources on the internet. Identify the main topic and language.
    CRITICAL: If the text is in Vietnamese, you MUST generate search queries in BOTH Vietnamese (to match local sources) AND English (to catch cross-lingual or translated plagiarism from global English sources).
    Return JSON: { "topic": "string", "queries": ["string"], "language": "string" }
    
    Text: ${text.slice(0, 1000)}`;
    
    const queryResponse = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: queryPrompt,
      config: { responseMimeType: 'application/json' }
    });
    const queries = JSON.parse(queryResponse.text?.replace(/```json|```/g, '').trim() || '{}');

    // Phase 2: Similarity Check with Optional Google Search Grounding
    let scanPrompt = '';
    const tools: any[] = [];
    
    if (scanDepth === 'deep') {
      scanPrompt = `Act as an advanced academic plagiarism checker. Compare the text against internet sources to detect plagiarism.
      CRITICAL: Perform a deep, exhaustive search using Google Search. Scour academic domains (e.g., site:edu, site:ac.uk, scholar.google.com), and explicitly find 20-30 online sources.
      IMPORTANT: If the input text is in Vietnamese, you MUST also analyze it for "Translated Plagiarism" (đạo văn dịch) by conceptually translating it to English and cross-referencing global English sources.
      Identify exact, fuzzy, and semantic matches for the claims or sentences.`;
      tools.push({ googleSearch: {} });
    } else if (scanDepth === 'web') {
      scanPrompt = `Act as an academic plagiarism checker. Compare the text against live internet sources to detect potential plagiarism.
      Use Google Search to find exact, fuzzy, or semantic matches. Check for cross-lingual/translated plagiarism as well.`;
      tools.push({ googleSearch: {} });
    } else {
      scanPrompt = `Act as an academic plagiarism checker. Compare the text against common knowledge databases and internal templates.
      Identify exact, fuzzy, and semantic matches. Do not use live search.`;
    }

    scanPrompt += `
    Return strict JSON:
    {
      "overallSimilarity": number,
      "exactMatch": number,
      "fuzzyMatch": number,
      "semanticMatch": number,
      "sources": [{"title": "string", "url": "string", "percentage": number, "type": "exact" | "fuzzy" | "semantic"}],
      "highlights": [{"text": "string", "type": "exact" | "fuzzy" | "semantic", "source": "string"}],
      "explanation": "string"
    }

    Text: ${text}`;

    const config: any = { responseMimeType: 'application/json' };
    if (tools.length > 0) config.tools = tools;

    const scanResponse = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: scanPrompt,
      config
    });
    const reportData = JSON.parse(scanResponse.text?.replace(/```json|```/g, '').trim() || '{}');
    
    // Save to history
    const report = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      title: text.slice(0, 50) + '...',
      ...reportData
    };
    reports.push(report);

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Failed to check plagiarism' });
  }
});

// --- Paraphrase Endpoint ---
app.post('/api/paraphrase', async (req, res) => {
  const { text, mode } = req.body;
  try {
    const prompt = `Paraphrase the text responsibly for academic writing. 
    Mode: ${mode || 'Standard'}.
    Preserve meaning, restructure sentences, use original wording, and mark where citations are needed.
    Return JSON: { "paraphrasedText": "string", "explanation": "string", "citationWarnings": ["string"] }

    Text: ${text}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    const jsonStr = response.text?.replace(/```json|```/g, '').trim() || '{}';
    res.json(JSON.parse(jsonStr));
  } catch (error) {
    res.status(500).json({ error: 'Failed to paraphrase' });
  }
});

app.get('/api/reports', (req, res) => {
  res.json(reports);
});

app.delete('/api/reports', (req, res) => {
  reports.length = 0; // Clear in-memory array
  res.json({ success: true });
});

// --- Privacy Note ---
// All user content is processed in-memory. NO data is saved to disk for model training.
// This preserves academic integrity and prevents leakage into future AI training datasets.

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
