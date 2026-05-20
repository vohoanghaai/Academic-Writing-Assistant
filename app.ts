import * as expressModule from 'express';
import path from 'path';
import * as dotenvModule from 'dotenv';
import * as multerModule from 'multer';
import * as cookieParserModule from 'cookie-parser';

const express = (expressModule as any).default || expressModule;
const dotenv = (dotenvModule as any).default || dotenvModule;
const multer = (multerModule as any).default || multerModule;
const cookieParser = (cookieParserModule as any).default || cookieParserModule;

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cookieParser());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

import type { GoogleGenAI } from '@google/genai';
import fs from 'fs';

// Setup polyfills for pdf-parse / pdfjs-dist internally if needed
if (typeof globalThis !== 'undefined') {
  (globalThis as any).DOMMatrix = (globalThis as any).DOMMatrix || class DOMMatrix {};
  (globalThis as any).Path2D = (globalThis as any).Path2D || class Path2D {};
  (globalThis as any).ImageData = (globalThis as any).ImageData || class ImageData {};
}

let ai: any = null;

async function getAI() {
  if (ai) return ai;
  
  // We must delete these GCP environment variables so the Google Auth Library
  // does not try to use Vertex AI automatically instead of the standard Gemini API
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  delete process.env.GOOGLE_CREDENTIALS_JSON;
  delete process.env.GOOGLE_CLOUD_PROJECT;
  delete process.env.GCLOUD_PROJECT;
  delete process.env.VERTEX_PROJECT_ID;

  const { GoogleGenAI } = await import('@google/genai');

  ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY || '',
    vertexai: false,
    enterprise: false
  });
  console.log('Initialized using standard Gemini API Key');
  return ai;
}


// Auth Endpoints
app.post('/api/auth/login', (req, res) => {
  const { username, key } = req.body;
  if (!process.env.LOGIN_KEY || !process.env.LOGIN_USERNAME) {
    return res.status(500).json({ error: 'Server configuration error: LOGIN_KEY or LOGIN_USERNAME is not set.' });
  }
  if (username !== process.env.LOGIN_USERNAME || key !== process.env.LOGIN_KEY) {
    return res.status(401).json({ error: 'Invalid username or access key.' });
  }
  
  const user = { username: username, team: 'Team EK', credits: 1106.5 };
  // Set cookie for 30 days
  res.cookie('user_session', JSON.stringify(user), {
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: false, // So frontend can read it
  });
  res.json({ success: true, user });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('user_session');
  res.json({ success: true });
});

// In-memory reports store for MVP
const reports: any[] = [];

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: 4 });
});

// --- File Upload Endpoint ---
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  try {
    let text = '';
    const buffer = req.file.buffer;
    
    const filename = req.file.originalname.toLowerCase();
    
    if (filename.endsWith('.pdf') || req.file.mimetype === 'application/pdf') {
      const pdfParseModule = await import('pdf-parse');
      const pdfParse = pdfParseModule.default || pdfParseModule;
      const data = await pdfParse(buffer);
      text = data.text;
    } else if (
      filename.endsWith('.docx') || filename.endsWith('.doc') || 
      req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      req.file.mimetype === 'application/msword'
    ) {
      const mammoth = await import('mammoth');
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
    const prompt = `As an expert linguist and forensic AI detection system, analyze the provided text.
    You MUST output a strict JSON object responding to these requirements based on an empirical evaluation, not guessing.

    Evaluation Methodology:
    1. Burstiness (Sentence variation): Humans mix very short and very long sentences. AI tends to use uniform sentence lengths.
    2. Perplexity: AI uses highly predictable word choices. Humans use idiosyncratic phrasing.
    3. Structural Symmetry: AI often creates perfectly balanced paragraphs and lists.
    4. Vocabulary Markers: AI frequently uses words like "fosters", "delve", "crucial", "realm", "tapestry", "seamlessly", "testament", "multifaceted", "underscores".

    Calculate scores strictly based on these four factors.

    JSON Output format: 
    {
      "humanScore": 80,
      "aiScore": 20,
      "riskLevel": "Low",
      "confidence": 90,
      "explanation": "Brief forensic justification",
      "segments": [{"text": "exact sentence that looks like AI", "reason": "brief reason based on methodology"}]
    }

    Text to Analyze:
    ${text.slice(0, 10000)}`;

    const ai = await getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { 
        responseMimeType: 'application/json',
        temperature: 0.1 
      }
    });
    const jsonStr = response.text?.replace(/```json|```/g, '').trim() || '{}';
    res.json(JSON.parse(jsonStr));
  } catch (error: any) {
    console.error('AI Detect Error details:', error, error?.response?.data);
    res.status(500).json({ error: error.message || 'Failed to analyze text' });
  }
});

// --- Humanize Endpoint ---
app.post('/api/humanize', async (req, res) => {
  const { text, tone } = req.body;
  
  try {
    const prompt = `Rewrite the text to sound exceptionally natural, human, and not like an AI. 
    Selected Tone: ${tone || 'Academic'}.
    Preserve the original meaning and avoid adding unsupported facts. 
    CRITICAL OBJECTIVE: You must completely bypass AI detection. Your output will be tested by a strict AI detector, and your goal is to achieve an AI score of 0%.
    - Eliminate all common AI vocabulary (e.g., 'fosters', 'crucial', 'delve', 'moreover', 'not only... but also', 'testament', 'tapestry', 'realm').
    - Vary sentence lengths aggressively. Mix very short, punchy sentences with longer, complex ones.
    - Introduce subtle, intentional human-like phrasing or slight conversational imperfections where appropriate.
    - Avoid perfectly balanced clauses and predictable transition words.
    Return JSON: { "humanizedText": "string", "changes": "string", "warnings": ["string"] }

    Text: ${text}`;

    const ai = await getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    const jsonStr = response.text?.replace(/```json|```/g, '').trim() || '{}';
    res.json(JSON.parse(jsonStr));
  } catch (error) {
    res.status(500).json({ error: 'Failed to humanize' });
  }
});

// --- Humanize Segments Endpoint ---
app.post('/api/humanize-segments', async (req, res) => {
  const { text, segments } = req.body;
  
  try {
    if (!segments || segments.length === 0) {
      return res.json({ humanizedText: text, changes: "No AI segments to humanize." });
    }

    const segmentsList = segments.map((s: any) => s.text || s).join('\n- ');
    
    const prompt = `You are a talented editor and copywriter. I am providing you with a full text, and a list of specific segments from that text that sound too much like an AI. 
    Your task is to rewrite ONLY those specified segments to sound completely natural and undeniably human, and seamlessly integrate them back into the full text. 
    CRITICAL OBJECTIVE: The resulting text will be run through a strict AI detector. Your single goal is to ensure the rewritten segments get an AI score of 0%.
    - Eliminate all common AI vocabulary (e.g., 'crucial', 'delve', 'moreover', 'testament', 'tapestry').
    - Vary sentence structures aggressively. 
    - Use intentional human-like conversational nuances or slight imperfections.
    DO NOT change any part of the text that is not in the segments list.
    
    Return the result as JSON: { "humanizedText": "the entire rewritten text including the new segments", "changes": "brief summary of how you rewrote the segments" }

    Segments to rewrite:
    - ${segmentsList}

    Full Text: 
    ${text}`;

    const ai = await getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    const jsonStr = response.text?.replace(/```json|```/g, '').trim() || '{}';
    res.json(JSON.parse(jsonStr));
  } catch (error) {
    console.error('Humanize Segments Error:', error);
    res.status(500).json({ error: 'Failed to humanize segments' });
  }
});

// --- Plagiarism Checker (inc. Web Scan Mock) ---
app.post('/api/plagiarism-check', async (req, res) => {
  const { text, scanDepth } = req.body;

  try {
    const ai = await getAI();
    // Phase 1: Topic & Query Generation
    const queryPrompt = `Act as an academic integrity tool. Analyze the following text and generate 5 specialized search queries to find similar sources on the internet. Identify the main topic and language.
    CRITICAL: If the text is in Vietnamese, you MUST generate search queries in BOTH Vietnamese (to match local sources) AND English (to catch cross-lingual or translated plagiarism from global English sources).
    Return JSON: { "topic": "string", "queries": ["string"], "language": "string" }
    
    Text: ${text.slice(0, 1000)}`;
    
    const queryResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
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
      "overallSimilarity": 10,
      "exactMatch": 5,
      "fuzzyMatch": 5,
      "semanticMatch": 0,
      "sources": [{"title": "Example Title", "url": "https://example.com", "percentage": 10, "type": "exact"}],
      "highlights": [{"text": "sentence similar to source", "type": "exact", "source": "https://example.com"}],
      "explanation": "Explanation of findings."
    }

    Text: ${text}`;

    const config: any = { responseMimeType: 'application/json' };
    if (tools.length > 0) config.tools = tools;

    const scanResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
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

    const ai = await getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
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

export default app;
