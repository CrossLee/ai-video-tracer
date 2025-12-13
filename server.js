import express from 'express';
import cors from 'cors';
import Replicate from 'replicate';
import { writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve static files from 'public' directory

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

    // Generate a local filename for reference (we aren't downloading it here to keep it fast, 
    // but we could if we wanted to proxy it. For now just return the Replicate URL).
    // The previous implementation downloaded it. Let's stick to returning the URL 
    // but maybe we don't need to save it locally unless the user wants to.
    // The previous code DID save it locally. Let's replicate that behavior if useful, 
    // or just return the URL to be faster.
    // The user's prompt "在右边就是播放返回输出的mp4" implies we need a playable URL.
    // Replicate URLs are public for a while.
    
    // Let's try to save it locally to be safe, as per previous logic
    // But downloading takes time. Let's just return the URL for the frontend to play directly.
    // This is faster and better for UX.
    
    // However, for the "filename" part in the frontend, we can generate a name but not save it.
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const videoUrlObj = new URL(sanitizedVideo);
    const baseVideoName = (videoUrlObj.pathname.split('/').pop() || 'video').replace(/\.[^/.]+$/, '');
    const promptName = (prompt || 'default').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const outName = `output_${promptName}_${baseVideoName}_${timestamp}.${return_zip ? 'zip' : 'mp4'}`;

    // If we want to save it locally we would need to fetch outputUrl and write to outName.
    // I will skip local saving for now to make the response faster, 
    // unless the previous implementation relied on local serving.
    // The frontend uses `result.url` to play/download. Replicate URL is fine.
    
    res.json({ 
      url: outputUrl, 
      filename: outName // Just for display
    });

  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
