import { readdir } from "fs/promises";
import path from "path";
import sharp from "sharp";

const framesDir = path.resolve("output_zip_extracted");
const THRESHOLD_PIXELS = 1000; // 掩码像素阈值，超过则认为该帧有人物
const MIN_CONSECUTIVE_FRAMES = 2; // 至少连续多少帧为“出现”以去除抖动

function numericIndexFromName(name) {
  const m = name.match(/mask_(\d+)\.png$/);
  return m ? parseInt(m[1], 10) : -1;
}

async function listMaskFrames() {
  const files = await readdir(framesDir);
  const masks = files.filter((f) => f.startsWith("mask_") && f.endsWith(".png"));
  masks.sort((a, b) => numericIndexFromName(a) - numericIndexFromName(b));
  return masks.map((f) => path.join(framesDir, f));
}

async function maskPixelCount(file) {
  const img = sharp(file).ensureAlpha();
  const { width, height } = await img.metadata();
  const raw = await img.raw().toBuffer();
  // raw 格式为 RGBA，判断非黑非透明像素
  let count = 0;
  for (let i = 0; i < raw.length; i += 4) {
    const r = raw[i];
    const g = raw[i + 1];
    const b = raw[i + 2];
    const a = raw[i + 3];
    if (a > 0 && (r > 0 || g > 0 || b > 0)) count++;
  }
  return { count, total: width * height };
}

async function computePresenceSeries() {
  const masks = await listMaskFrames();
  const series = [];
  for (const m of masks) {
    const { count } = await maskPixelCount(m);
    series.push(count >= THRESHOLD_PIXELS);
  }
  return series;
}

function countAppearances(presence) {
  // 去抖：需要连续 MIN_CONSECUTIVE_FRAMES 为 true 才算进入；连续为 false 才算离开
  let appearances = 0;
  let runTrue = 0;
  let runFalse = 0;
  let inScene = false;

  for (const p of presence) {
    if (p) {
      runTrue += 1;
      runFalse = 0;
      if (!inScene && runTrue >= MIN_CONSECUTIVE_FRAMES) {
        inScene = true;
        appearances += 1; // 新出现
      }
    } else {
      runFalse += 1;
      runTrue = 0;
      if (inScene && runFalse >= MIN_CONSECUTIVE_FRAMES) {
        inScene = false; // 离开
      }
    }
  }

  return appearances;
}

async function main() {
  const presence = await computePresenceSeries();
  const appearances = countAppearances(presence);
  console.log("总帧数:", presence.length);
  console.log("出现次数:", appearances);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

