import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { initializeApp as initAdminApp, getApps as getAdminApps } from 'firebase-admin/app';
import { getAuth as getAdminAuth, DecodedIdToken } from 'firebase-admin/auth';

dotenv.config();

// ============================================================
// Firebase Admin SDK Initialization (Application Default Credentials)
// ============================================================
if (!getAdminApps().length) {
  let defaultProjectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
  if (!defaultProjectId) {
    try {
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
        const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        defaultProjectId = cfg.projectId;
      }
    } catch {
      // ignore
    }
  }

  initAdminApp({
    projectId: defaultProjectId || 'paygentic-fraud-detector',
  });
}

// Request type with verified Firebase credentials
export interface AuthenticatedRequest extends express.Request {
  firebaseUser?: DecodedIdToken;
  uid?: string;
}

// ============================================================
// Server-Side Firebase Authentication Verification Middleware
// ============================================================
const verifyFirebaseToken: express.RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized: Missing or invalid Authorization header. A valid Firebase ID token is required.',
    });
    return;
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    res.status(401).json({
      error: 'Unauthorized: Bearer token is empty.',
    });
    return;
  }

  try {
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    (req as AuthenticatedRequest).firebaseUser = decodedToken;
    (req as AuthenticatedRequest).uid = decodedToken.uid;
    next();
  } catch (err: any) {
    console.error('Server-side Firebase ID token verification failed:', err.message);
    res.status(401).json({
      error: 'Unauthorized: Invalid or expired Firebase ID token.',
      code: err.code || 'auth/invalid-token',
    });
    return;
  }
};

// ============================================================
// Google GenAI Client (Server-Side Only)
// ============================================================
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not set. Protected endpoints will return descriptive error messages.');
  }
  return new GoogleGenAI({
    apiKey: apiKey || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // JSON parser for API requests
  app.use(express.json({ limit: '10mb' }));

  // ============================================================
  // API Routes (must precede Vite middleware)
  // ============================================================

  // Health check for Cloud Run and ingress probes (no secrets exposed)
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'MindMate – Personal Gemini Journal',
      timestamp: new Date().toISOString(),
    });
  });

  // Multi-turn Gemini chat endpoint (Protected by Firebase ID token verification)
  app.post('/api/gemini/chat', verifyFirebaseToken, async (req: express.Request, res: express.Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const authenticatedUid = authReq.uid;

      if (!authenticatedUid) {
        return res.status(401).json({ error: 'Unauthorized: Unable to resolve authenticated user UID.' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({
          error: 'Gemini API key is not configured on the server. Please ensure GEMINI_API_KEY is set via Secret Manager or environment.',
        });
      }

      const { messages, contextEntries } = req.body;
      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'Messages array is required.' });
      }

      const ai = getGeminiClient();

      // Assemble system instruction with verified context
      let systemInstruction = `You are MindMate, a compassionate, emotionally intelligent, and deeply attentive personal journal companion.
Your purpose: Help the authenticated user explore their reflections, gain self-awareness, untangle complex emotions, and cultivate mindfulness.
Guidelines:
- Speak warmly, authentically, and gently.
- Validate the user's emotional experience before offering new perspectives.
- Avoid generic cliches; refer specifically to details they share.
- Ask thoughtful, open-ended questions that invite deeper self-inquiry.
- Keep responses conversational, concise, and focused (usually 2-4 short, punchy paragraphs).
- Do not provide medical or psychiatric diagnoses; if extreme distress is mentioned, suggest reaching out to trusted loved ones or professional care with kindness.`;

      if (Array.isArray(contextEntries) && contextEntries.length > 0) {
        systemInstruction += `\n\nRecent Journal Entries from the User's Private Log (for contextual understanding):`;
        contextEntries.slice(0, 5).forEach((entry: any, index: number) => {
          systemInstruction += `\n[Entry ${index + 1}: "${entry.title || 'Untitled'}" (${entry.createdAt || 'Recent'}, Mood: ${entry.mood || 'Unspecified'})]\n${entry.content || ''}\n`;
        });
      }

      // Format conversation history for @google/genai
      const contents = messages.map((m: any) => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.content || '' }],
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction,
          temperature: 0.75,
          maxOutputTokens: 1200,
        },
      });

      const reply = response.text || "I'm reflecting on what you've shared. What feels most significant to you right now?";
      return res.json({ reply });
    } catch (error: any) {
      console.error('Server error in /api/gemini/chat:', error);
      return res.status(500).json({
        error: error.message || 'An error occurred while communicating with Gemini.',
      });
    }
  });

  // Mood & Reflection Summary endpoint (Protected by Firebase ID token verification)
  app.post('/api/gemini/reflect', verifyFirebaseToken, async (req: express.Request, res: express.Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const authenticatedUid = authReq.uid;

      if (!authenticatedUid) {
        return res.status(401).json({ error: 'Unauthorized: Unable to resolve authenticated user UID.' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({
          error: 'Gemini API key is not configured on the server. Please ensure GEMINI_API_KEY is set via Secret Manager or environment.',
        });
      }

      const { entries } = req.body;
      if (!Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({
          error: 'At least one journal entry is required to generate a reflection summary.',
        });
      }

      const ai = getGeminiClient();

      const journalText = entries
        .map(
          (e: any, idx: number) =>
            `--- Entry ${idx + 1}: ${e.title || 'Untitled'} (${e.createdAt || 'Recent'}, User self-rated mood: ${e.mood || 'N/A'})\n${e.content || ''}`
        )
        .join('\n\n');

      const prompt = `Analyze the following private journal entries written by the authenticated user and synthesize a thoughtful "Mood & Reflection Summary".

Journal Entries:
${journalText}

Please return your analysis strictly as a valid JSON object with the following schema:
{
  "detectedMood": "A nuanced 2-4 word description of their overall emotional state (e.g., 'Grounded & Contemplative', 'Optimistic yet Overwhelmed', 'Restless Seeking Clarity')",
  "moodScore": 7, // integer between 1 (very distressed/low) and 10 (exceptionally joyful/peaceful)
  "moodColor": "#059669", // a subtle hex color representing this mood (e.g., #059669 for calm, #d97706 for contemplative, #2563eb for focused, #e11d48 for intense)
  "keyThemes": ["Theme 1", "Theme 2", "Theme 3"], // array of 3 to 5 central topics or recurring motifs
  "positiveHighlights": ["Highlight 1", "Highlight 2"], // 2 to 3 notable wins, moments of gratitude, strengths, or positive self-talk identified
  "areasOfConcern": ["Challenge 1", "Challenge 2"], // 1 to 3 stressors, dilemmas, or friction points the user is wrestling with
  "shortReflection": "A warm, insightful, empathetic 2-paragraph reflection addressing the user directly ('You...'). Synthesize their experiences, acknowledge their effort, and offer a mindful, grounded takeaway.",
  "mindfulPrompt": "A single resonant question or prompt for their next journaling session to help them continue their growth."
}

Ensure the output is strictly valid JSON without markdown wrapping.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.6,
        },
      });

      let parsedResult;
      const rawText = response.text || '{}';
      try {
        parsedResult = JSON.parse(rawText);
      } catch (err) {
        // Fallback cleanup if response includes markdown backticks
        const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        parsedResult = JSON.parse(cleaned);
      }

      return res.json({
        ...parsedResult,
        entryCountAnalyzed: entries.length,
      });
    } catch (error: any) {
      console.error('Server error in /api/gemini/reflect:', error);
      return res.status(500).json({
        error: error.message || 'An error occurred while generating the reflection summary.',
      });
    }
  });

  // Prompt spark generation (Protected by Firebase ID token verification)
  app.post('/api/gemini/prompt-spark', verifyFirebaseToken, async (req: express.Request, res: express.Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const authenticatedUid = authReq.uid;

      if (!authenticatedUid) {
        return res.status(401).json({ error: 'Unauthorized: Unable to resolve authenticated user UID.' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.json({
          prompts: [
            "What brought you unexpected peace or gratitude today?",
            "What is something you are holding onto that you're ready to gently release?",
            "If your future self visited you right now, what reassurance would they offer?"
          ]
        });
      }

      const { recentMood } = req.body;
      const ai = getGeminiClient();

      const prompt = `Generate 3 evocative, thoughtful, and psychologically grounded journal prompts for someone whose current mood is "${recentMood || 'reflective'}".
Return strictly valid JSON:
{
  "prompts": ["Prompt 1", "Prompt 2", "Prompt 3"]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.8,
        },
      });

      const parsed = JSON.parse(response.text || '{"prompts": []}');
      return res.json(parsed);
    } catch (error: any) {
      console.error('Server error in /api/gemini/prompt-spark:', error);
      return res.json({
        prompts: [
          "What is an emotion you've noticed recurring this week, and what might it be asking for?",
          "What was a small moment of beauty or stillness you experienced recently?",
          "How can you treat yourself with more gentleness tomorrow?"
        ]
      });
    }
  });

  // ============================================================
  // Vite Integration for Dev / Static Serving for Production
  // ============================================================
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
    console.log(`MindMate server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
