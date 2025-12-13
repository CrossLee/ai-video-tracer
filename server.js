import express from 'express';
import cors from 'cors';
import Replicate from 'replicate';
import { writeFile, readFile, appendFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { processZip } from './zip-analysis.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HISTORY_FILE = path.join(__dirname, 'history.txt');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve static files from 'public' directory
app.use('/zip', express.static('zip')); // Serve extracted ZIP files

// Replicate Setup
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const MODEL_VERSION = "lucataco/sam3-video:8cbab4c2a3133e679b5b863b80527f6b5c751ec7b33681b7e0b7c79c749df961";

// API Endpoint
app.post('/api/run', async (req, res) => {
  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      throw new Error("REPLICATE_API_TOKEN is not set");
    }

    const { video, prompt, mask_color, mask_opacity, mask_only, return_zip } = req.body;

    if (!video) {
      return res.status(400).json({ error: "Video URL is required" });
    }

    // Sanitize input
    const sanitizedVideo = video.replace(/`/g, '').trim();

    const input = {
      video: sanitizedVideo,
      prompt: prompt || "object",
      mask_color: mask_color || "red",
      mask_opacity: mask_opacity !== undefined ? parseFloat(mask_opacity) : 0.8,
      mask_only: Boolean(mask_only),
      return_zip: Boolean(return_zip)
    };

    console.log("Running SAM3 with input:", input);

    const output = await replicate.run(MODEL_VERSION, { input });

    console.log("Replicate output:", output);

    // output is usually a URL (string) or an object with url() method depending on SDK version/model return
    // For this model, it returns a URL string (or stream).
    // The previous code used output.url() which implies output is a FileOutput object.
    // Let's handle both cases safely.
    let outputUrl;
    if (typeof output === 'string') {
      outputUrl = output;
    } else if (output && typeof output.url === 'function') {
      outputUrl = output.url().href;
    } else if (output && output.href) {
        outputUrl = output.href;
    } else {
        // Fallback or inspect
        outputUrl = String(output);
    }

    // Generate a local filename for reference
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const videoUrlObj = new URL(sanitizedVideo);
    const baseVideoName = (videoUrlObj.pathname.split('/').pop() || 'video').replace(/\.[^/.]+$/, '');
    const promptName = (prompt || 'default').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const outName = `output_${promptName}_${baseVideoName}_${timestamp}.${return_zip ? 'zip' : 'mp4'}`;

    // Process ZIP if requested
    let responseData = {
      url: outputUrl,
      filename: outName
    };

    if (return_zip && outputUrl) {
      console.log("Processing ZIP result...");
      const zipAnalysis = await processZip(outputUrl);
      if (zipAnalysis.success) {
        // Override URL with the local extracted video path if found, or keep original if not
        if (zipAnalysis.videoPath) {
            responseData.url = zipAnalysis.videoPath;
        }
        responseData.zipAnalysis = zipAnalysis;
      }
    }

    res.json(responseData);

  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Helper to ensure history file exists
async function ensureHistoryFile() {
  if (!existsSync(HISTORY_FILE)) {
    await writeFile(HISTORY_FILE, '', 'utf8');
  }
}

// History APIs
app.get('/api/history', async (req, res) => {
  try {
    await ensureHistoryFile();
    const data = await readFile(HISTORY_FILE, 'utf8');
    const records = data.trim().split('\n')
      .filter(line => line.trim())
      .map(line => {
        try { return JSON.parse(line); } catch (e) { return null; }
      })
      .filter(r => r !== null)
      .reverse();
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/history', async (req, res) => {
  try {
    const record = req.body;
    if (!record) return res.status(400).json({ error: "No data" });

    // Add metadata if missing
    if (!record.timestamp) record.timestamp = new Date().toISOString();
    if (!record.id) record.id = Date.now().toString(36) + Math.random().toString(36).substr(2);

    const line = JSON.stringify(record) + '\n';
    await appendFile(HISTORY_FILE, line, 'utf8');
    
    res.json({ success: true, id: record.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/history', async (req, res) => {
  try {
    await writeFile(HISTORY_FILE, '', 'utf8');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/history/:id', async (req, res) => {
  try {
    await ensureHistoryFile();
    const { id } = req.params;
    const data = await readFile(HISTORY_FILE, 'utf8');
    const lines = data.trim().split('\n').filter(l => l.trim());
    
    const newLines = lines.filter(line => {
      try {
        const r = JSON.parse(line);
        return r.id !== id;
      } catch (e) { return false; }
    });

    await writeFile(HISTORY_FILE, newLines.join('\n') + (newLines.length ? '\n' : ''), 'utf8');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
