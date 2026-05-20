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
  const { GoogleGenAI } = await import('@google/genai');

  const apiKey = process.env.GEMINI_API_KEY;

  // Process Vertex JSON auth if provided via env var (common in Vercel/Render)
  if (!apiKey && process.env.GOOGLE_CREDENTIALS_JSON) {
    try {
      const parsed = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
      if (parsed.project_id && !process.env.VERTEX_PROJECT_ID) {
        process.env.VERTEX_PROJECT_ID = parsed.project_id;
      }

      const fs = await import('fs');
      const os = await import('os');
      const path = await import('path');
      const tempPath = path.join(os.tmpdir(), 'vertex-key.json');
      fs.writeFileSync(tempPath, process.env.GOOGLE_CREDENTIALS_JSON);
      process.env.GOOGLE_APPLICATION_CREDENTIALS = tempPath;
    } catch (err) {
      console.error('Failed to parse Vertex JSON or write temp file:', err);
    }
  }

  const hasVertexAuth = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.VERTEX_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;

  if (!apiKey && hasVertexAuth) {
    console.log('Initialized using Vertex AI Credentials');
    const project = process.env.VERTEX_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
    const location = process.env.VERTEX_LOCATION || 'us-central1';
    
    if (project) {
       ai = new GoogleGenAI({ vertexai: true, project, location });
    } else {
       console.warn('WARNING: Could not determine Vertex project ID. Vertex AI might fail to initialize.');
       ai = new GoogleGenAI({ vertexai: true, project: "missing-project-id", location });
    }
    return ai;
  }

  // Standard API key path - prevent accidental Vertex auto-trigger if explicitly using GEMINI_API_KEY
  if (apiKey) {
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    delete process.env.GOOGLE_CREDENTIALS_JSON;
    delete process.env.GOOGLE_CLOUD_PROJECT;
    delete process.env.GCLOUD_PROJECT;
    delete process.env.VERTEX_PROJECT_ID;
  } else {
    console.error('CRITICAL: GEMINI_API_KEY and Vertex credentials are both missing.');
  }

  ai = new GoogleGenAI({ 
    apiKey: apiKey || '',
    vertexai: false,
    enterprise: false
  });
  console.log('Initialized using standard Gemini API Key');
  return ai;
}

async function generateContentWithFallback(aiClient: any, params: any) {
  const models = ['gemini-3.1-pro-preview', 'gemini-3.5-flash', 'gemini-2.5-pro', 'gemini-3.1-flash'];
  let lastError;
  
  for (const model of models) {
    try {
      params.model = model;
      console.log(`[AI] Attempting request with model: ${model}...`);
      const response = await aiClient.models.generateContent(params);
      return response;
    } catch (error: any) {
      lastError = error;
      const status = error?.status || error?.response?.status;
      console.warn(`[AI] Model ${model} failed (Status: ${status}, Msg: ${error.message}). Falling back to next...`);
      // Continue to next model on error (e.g. 429 Too Many Requests, 503, or invalid model)
    }
  }
  
  console.error('[AI] All fallback models failed.');
  throw lastError;
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

// --- Utility: Chunk Processor ---
async function processInChunks(text: string, processChunk: (chunk: string, index: number, total: number) => Promise<any>, maxChunkSize: number = 3000) {
  const chunks: string[] = [];
  let currentChunk = '';
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = '';
    }
    currentChunk += sentence;
  }
  if (currentChunk.trim().length > 0) chunks.push(currentChunk);

  const results: any[] = [];
  for (let i = 0; i < chunks.length; i++) {
    // We already use generateContentWithFallback inside processChunk, so if one chunk fails
    // it will automatically retry across models. Only if ALL 4 models fail for this specific chunk
    // will it throw an error here, at which point we can still return partial results if needed,
    // or let it throw. The user requested: "khi nào cả 4 model ko dc mới dùng và báo lỗi".
    // "báo lỗi" means throw the error.
    console.log(`[Chunking] Processing chunk ${i + 1}/${chunks.length}...`);
    const res = await processChunk(chunks[i], i, chunks.length);
    results.push(res);
  }
  return results;
}

// --- AI Detect Endpoint ---
app.post('/api/ai-detect', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text is required' });

  try {
    const { Type } = await import('@google/genai');
    const ai = await getAI();

    const results = await processInChunks(text, async (chunk) => {
      const prompt = `You are a forensic linguistic analyzer determining the probability of text being AI-generated vs. human-written. 
      To ensure deterministic, highly consistent results across multiple evaluations of the same text, you MUST follow this precise mathematical scoring rubric.

      CRITICAL: Evaluate the text strictly against these 4 metrics. Start with a baseline AI score of 50, then adjust based on evidence:

      METRIC 1: Burstiness & Sentence Variance (Max impact: ±25)
      - AI creates uniform sentence lengths. Humans mix very short (1-5 words) with very long sentences.
      - If uniform/robotic: add up to +25 AI score.
      - If highly varied/erratic lengths: subtract up to -25 AI score (more human).

      METRIC 2: Lexical Predictability & Vocabulary (Max impact: ±30)
      - AI overuses specific transition words and academic fluff.
      - Check for AI catchphrases: "delve", "tapestry", "fosters", "testament", "realm", "crucial", "multifaceted", "seamlessly", "underscores", "in conclusion", "it is important to note".
      - If 2+ catchphrases present: add +20 to +30 AI score.
      - If phrasing is highly idiosyncratic, uses conversational slang, or unusual idioms: subtract -20 to -30 AI score (more human).
      - If text is short and simple with no markers: 0 adjustment.

      METRIC 3: Structural Symmetry (Max impact: ±20)
      - AI loves perfectly balanced lists, matching paragraph lengths, and predictable "Introduction, Body, Conclusion" structures.
      - If perfectly balanced and formulaic: add +10 to +20 AI score.
      - If paragraphs are asymmetrical, structure meanders, or formatting is messy: subtract -10 to -20 AI score.

      METRIC 4: Emotional Depth & Subjectivity (Max impact: ±25)
      - AI text lacks genuine personal experience, faking it with vague generalities.
      - If purely informational/neutral without true subjective vulnerability: add +10 to +25 AI score.
      - If it contains highly specific personal anecdotes, informal formatting, or raw emotion: subtract -15 to -25 AI score.

      SCORING RULES:
      1. Start at Base AI Score = 50.
      2. Apply the adjustments from the 4 metrics.
      3. Final AI Score must be capped between 0 and 100.
      4. Human Score = 100 - Final AI Score.
      5. Your 'explanation' MUST be a step-by-step calculation showing exactly how you applied the 4 metrics. Show the math (+X for Metric 1, -Y for Metric 2, etc, Total AI Score: Z).
      6. Risk Level = 'High' if AI > 70, 'Moderate' if 40-70, 'Low' if < 40.
      7. Confidence = how clearly the signals match the rubric (0-100).

      Text to Analyze:
      ${chunk}`;

      const response = await generateContentWithFallback(ai, {
        contents: prompt,
        config: { 
          responseMimeType: 'application/json',
          temperature: 0.0, // Strictly deterministic
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              explanation: { type: Type.STRING },
              humanScore: { type: Type.NUMBER },
              aiScore: { type: Type.NUMBER },
              riskLevel: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
              segments: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING },
                    reason: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      });
      return JSON.parse(response.text?.replace(/```json|```/g, '').trim() || '{}');
    }, 10000); // 10000 char chunks (~2000-2500 words)

    // Aggregate results
    let totalAiScore = 0;
    let totalHumanScore = 0;
    let totalConfidence = 0;
    let combinedExplanation = '';
    let allSegments: any[] = [];
    
    for (let i = 0; i < results.length; i++) {
        const resObj = results[i];
        totalAiScore += resObj.aiScore || 0;
        totalHumanScore += resObj.humanScore || 0;
        totalConfidence += resObj.confidence || 0;
        if (results.length > 1) {
            combinedExplanation += `\nPart ${i+1}: ${resObj.explanation}\n`;
        } else {
            combinedExplanation = resObj.explanation;
        }
        if (resObj.segments) allSegments.push(...resObj.segments);
    }
    
    const count = results.length;
    res.json({
        aiScore: Math.round(totalAiScore / count),
        humanScore: Math.round(totalHumanScore / count),
        confidence: Math.round(totalConfidence / count),
        riskLevel: (totalAiScore / count) > 70 ? 'High' : (totalAiScore / count) > 40 ? 'Moderate' : 'Low',
        explanation: combinedExplanation.trim(),
        segments: allSegments
    });

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

    const { Type } = await import('@google/genai');
    const ai = await getAI();
    const response = await generateContentWithFallback(ai, {
      contents: prompt,
      config: { 
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            humanizedText: { type: Type.STRING },
            changes: { type: Type.STRING },
            warnings: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
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

    const { Type } = await import('@google/genai');
    const ai = await getAI();
    const response = await generateContentWithFallback(ai, {
      contents: prompt,
      config: { 
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            humanizedText: { type: Type.STRING },
            changes: { type: Type.STRING }
          }
        }
      }
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
    
    const { Type } = await import('@google/genai');
    const queryResponse = await generateContentWithFallback(ai, {
      contents: queryPrompt,
      config: { 
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topic: { type: Type.STRING },
            queries: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            language: { type: Type.STRING }
          }
        }
      }
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

    const scanResponse = await generateContentWithFallback(ai, {
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

    const { Type } = await import('@google/genai');
    const ai = await getAI();
    const response = await generateContentWithFallback(ai, {
      contents: prompt,
      config: { 
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            paraphrasedText: { type: Type.STRING },
            explanation: { type: Type.STRING },
            citationWarnings: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
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
