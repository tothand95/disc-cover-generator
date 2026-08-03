import { promises as fs } from "node:fs";
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const HIND_WEIGHTS: { file: string; weight: number }[] = [
  { file: "Hind-Light.ttf", weight: 300 },
  { file: "Hind-Regular.ttf", weight: 400 },
  { file: "Hind-Medium.ttf", weight: 500 },
  { file: "Hind-SemiBold.ttf", weight: 600 },
  { file: "Hind-Bold.ttf", weight: 700 },
];

function resolveFontsDir(): string {
  let dir = __dirname;
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, "assets", "fonts");
    if (fsSync.existsSync(path.join(candidate, "Hind-SemiBold.ttf"))) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("Bundled Hind font files not found (searched upward from " + __dirname + ")");
}

let cached: string | null = null;

async function loadAllWeightsBase64(): Promise<{ weight: number; b64: string }[]> {
  const dir = resolveFontsDir();
  const out: { weight: number; b64: string }[] = [];
  for (const w of HIND_WEIGHTS) {
    const buf = await fs.readFile(path.join(dir, w.file));
    out.push({ weight: w.weight, b64: buf.toString("base64") });
  }
  return out;
}

/**
 * Returns an SVG <style> block that embeds all bundled Hind weights so librsvg
 * can render text with any of them, without touching system fontconfig.
 */
export async function spineFontStyleBlock(): Promise<string> {
  if (cached) return cached;
  const weights = await loadAllWeightsBase64();
  const faces = weights
    .map(
      ({ weight, b64 }) => `    @font-face {
      font-family: "SpineFont";
      src: url("data:font/ttf;base64,${b64}") format("truetype");
      font-weight: ${weight};
      font-style: normal;
    }`,
    )
    .join("\n");
  cached = `<style>\n${faces}\n  </style>`;
  return cached;
}

export const SPINE_FONT_FAMILY = "SpineFont";

