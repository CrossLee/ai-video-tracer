import JSZip from 'jszip';
import { writeFile, mkdir, readdir } from 'fs/promises';
import { createWriteStream, existsSync } from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ZIP_DIR = path.join(__dirname, 'zip');

/**
 * Downloads and processes a ZIP file from a URL.
 * @param {string} url - The URL of the ZIP file.
 * @returns {Promise<Object>} - Analysis result.
 */
export async function processZip(url) {
  const timestamp = new Date().toISOString();
  const startTime = Date.now();

  try {
    // 1. Download ZIP
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to download ZIP: ${response.statusText}`);
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique filename
    const zipName = `download_${Date.now()}.zip`;
    const zipPath = path.join(ZIP_DIR, zipName);
    const extractDirName = `extract_${Date.now()}`;
    const extractPath = path.join(ZIP_DIR, extractDirName);

    // Save ZIP to disk
    await writeFile(zipPath, buffer);

    // 2. Load with JSZip
    const zip = await JSZip.loadAsync(buffer);

    // 3. Extract and Analyze
    if (!existsSync(extractPath)) {
      await mkdir(extractPath, { recursive: true });
    }

    let imageCount = 0;
    let videoFile = null;
    let videoPath = null;
    const extractedFiles = [];

    const entries = Object.keys(zip.files);
    
    // Process files in parallel for performance
    await Promise.all(entries.map(async (filename) => {
      const file = zip.files[filename];
      if (file.dir) return;

      const destPath = path.join(extractPath, filename);
      
      // Ensure directory exists for nested files
      const destDir = path.dirname(destPath);
      if (!existsSync(destDir)) {
        await mkdir(destDir, { recursive: true });
      }

      // Read and write file content
      const content = await file.async('nodebuffer');
      await writeFile(destPath, content);
      extractedFiles.push(filename);

      // Analyze
      const lowerName = filename.toLowerCase();
      if (lowerName.endsWith('.mp4')) {
        videoFile = filename;
        // Construct public URL path (assuming /zip static mount)
        videoPath = `/zip/${extractDirName}/${filename}`;
      } else if (lowerName.endsWith('.jpg') || lowerName.endsWith('.png') || lowerName.endsWith('.jpeg')) {
        imageCount++;
      }
    }));

    const endTime = Date.now();
    const duration = endTime - startTime;

    return {
      success: true,
      zipName,
      zipPath, // Absolute path
      extractPath, // Absolute path
      videoPath, // Web accessible path
      imageCount,
      timestamp,
      durationMs: duration,
      fileCount: extractedFiles.length
    };

  } catch (error) {
    console.error("ZIP Analysis Error:", error);
    return {
      success: false,
      error: error.message,
      timestamp
    };
  }
}
