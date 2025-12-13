import { readdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

const framesDir = path.resolve("output_zip_extracted");

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

async function boundingBoxForMask(file) {
  const img = sharp(file).ensureAlpha();
  const { width, height } = await img.metadata();
  const raw = await img.raw().toBuffer();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let idx = 0;
  for (let i = 0; i < raw.length; i += 4) {
    const r = raw[i];
    const g = raw[i + 1];
    const b = raw[i + 2];
    const a = raw[i + 3];
    if (a > 0 && (r > 0 || g > 0 || b > 0)) {
      const x = idx % width;
      const y = (idx / width) | 0;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    idx++;
  }
  if (!isFinite(minX)) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

async function main() {
  const masks = await listMaskFrames();
  const rows = [];
  for (let i = 0; i < masks.length; i++) {
    const box = await boundingBoxForMask(masks[i]);
    if (box) {
      rows.push([i, box.x, box.y, box.width, box.height].join(","));
    }
  }
  const header = "frame,x,y,width,height";
  const csv = [header, ...rows].join("\n");
  await writeFile("positions.csv", csv);
  console.log("positions.csv written");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

