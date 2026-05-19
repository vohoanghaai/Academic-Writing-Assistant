import * as expressModule from 'express';
import path from 'path';
import * as dotenvModule from 'dotenv';
import * as multerModule from 'multer';
import * as cookieParserModule from 'cookie-parser';
import * as mammoth from 'mammoth';
import * as pdfParseModule from 'pdf-parse';

const express = (expressModule as any).default || expressModule;
const dotenv = (dotenvModule as any).default || dotenvModule;
const multer = (multerModule as any).default || multerModule;
const cookieParser = (cookieParserModule as any).default || cookieParserModule;
const pdfParse = (pdfParseModule as any).default || pdfParseModule;

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cookieParser());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

import type { GoogleGenAI } from '@google/genai';
import fs from 'fs';

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

    const ai = await getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    const jsonStr = response.text?.replace(/```json|```/g, '').trim() || '{}';
    res.json(JSON.parse(jsonStr));
  } catch (error) {
    console.error('AI Detect Error details:', error);
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
    
    const prompt = `You are an expert editor. I am providing you with a full text, and a list of specific segments from that text that sound too much like an AI. 
    Your task is to rewrite ONLY those specified segments to sound more natural and human, and seamlessly integrate them back into the full text. 
    DO NOT change any part of the text that is not in the segments list.
    
    Return the result as JSON: { "humanizedText": "the entire rewritten text", "changes": "brief summary of how you rewrote the segments" }

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
