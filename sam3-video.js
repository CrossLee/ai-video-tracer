import { writeFile } from "fs/promises";
import Replicate from "replicate";

const token = process.env.REPLICATE_API_TOKEN;
if (!token) {
  console.error("REPLICATE_API_TOKEN 未设置。请先在环境变量中配置。");
  process.exit(1);
}

const replicate = new Replicate({ auth: token });

const input = {
  video:
    "https://public-temp-no-auth.oss-cn-shanghai.aliyuncs.com/sam3/boy.mp4",
  prompt: "blue boy",
  mask_color: "red",
  mask_opacity: 0.8,
  mask_only: false,
  return_zip: false,
};

const sanitizedInput = { ...input, video: String(input.video).replace(/`/g, "").trim() };

const output = await replicate.run(
  "lucataco/sam3-video:8cbab4c2a3133e679b5b863b80527f6b5c751ec7b33681b7e0b7c79c749df961",
  { input: sanitizedInput }
);

console.log(output.url());
const videoUrl = new URL(sanitizedInput.video);
const baseVideoName = (videoUrl.pathname.split("/").pop() || "video").replace(/\.[^/.]+$/, "");
const promptName = (input.prompt || "default").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outName = `output_${promptName}_${baseVideoName}_${timestamp}.zip`;
console.log(outName);
await writeFile(outName, output);
