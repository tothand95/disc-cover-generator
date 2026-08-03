import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import {
  generateCoverPdf,
  listPresets,
  type BorderMode,
  type CasePresetId,
  type FitMode,
  type SpinePresetId,
} from "../core/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIST = path.resolve(__dirname, "../web");

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "127.0.0.1";

const app = Fastify({ logger: true });

await app.register(multipart, {
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 3,
  },
});

app.get("/api/presets", async () => ({ presets: listPresets() }));

interface FieldMap {
  [key: string]: string;
}

async function writeTempImage(
  data: NodeJS.ReadableStream,
  ext: string,
): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "disc-cover-"));
  const file = path.join(dir, `input${ext || ".bin"}`);
  const out = await import("node:fs").then((m) => m.createWriteStream(file));
  await new Promise<void>((resolve, reject) => {
    data.pipe(out);
    data.on("end", () => resolve());
    data.on("error", reject);
    out.on("error", reject);
  });
  return file;
}

function extFromMimetype(m: string): string {
  if (m.includes("png")) return ".png";
  if (m.includes("jpeg") || m.includes("jpg")) return ".jpg";
  if (m.includes("webp")) return ".webp";
  return "";
}

app.post("/api/generate", async (req, reply) => {
  const fields: FieldMap = {};
  const files: Record<string, string> = {};
  const cleanup: string[] = [];

  for await (const part of req.parts()) {
    if (part.type === "file") {
      const ext = extFromMimetype(part.mimetype ?? "");
      const filePath = await writeTempImage(part.file, ext);
      files[part.fieldname] = filePath;
      cleanup.push(path.dirname(filePath));
    } else {
      fields[part.fieldname] = String(part.value ?? "");
    }
  }

  try {
    const preset = fields.preset as CasePresetId;
    const kind = fields.kind ?? "three";
    const fit = (fields.fit ?? "fill") as FitMode;
    const borderMode = (fields.borderMode ?? "none") as BorderMode;
    const borderThickness = Number(fields.borderThickness ?? "2");
    const borderColor = fields.borderColor || "#000000";
    const dpi = Number(fields.dpi ?? "300");

    const outDir = await fs.mkdtemp(path.join(os.tmpdir(), "disc-cover-out-"));
    cleanup.push(outDir);
    const outputPath = path.join(outDir, "cover.pdf");

    if (kind === "single") {
      if (!files.image) throw new Error("Missing 'image' file");
      await generateCoverPdf({
        preset,
        input: { kind: "single", imagePath: files.image, fit },
        border: { mode: borderMode, thicknessPx: borderThickness, color: borderColor },
        outputPath,
        dpi,
      });
    } else {
      if (!files.back || !files.front) {
        throw new Error("'back' and 'front' files are required for three-image mode");
      }
      const spinePresetId = fields.spinePreset as SpinePresetId | undefined;
      const spineTitle = fields.spineTitle ?? "";
      await generateCoverPdf({
        preset,
        input: {
          kind: "three",
          backImagePath: files.back,
          frontImagePath: files.front,
          spineImagePath: files.spine,
          spinePreset:
            !files.spine && spinePresetId
              ? { preset: spinePresetId, title: spineTitle }
              : undefined,
          fit,
        },
        border: { mode: borderMode, thicknessPx: borderThickness, color: borderColor },
        outputPath,
        dpi,
      });
    }

    const pdf = await fs.readFile(outputPath);
    reply
      .header("Content-Type", "application/pdf")
      .header("Content-Disposition", 'attachment; filename="cover.pdf"')
      .send(pdf);
  } catch (err) {
    req.log.error(err);
    reply.code(400).send({ error: err instanceof Error ? err.message : String(err) });
  } finally {
    for (const dir of cleanup) {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }
});

// Serve built SPA in production. During `pnpm dev`, Vite handles this on 5173.
try {
  await fs.access(WEB_DIST);
  await app.register(fastifyStatic, { root: WEB_DIST });
} catch {
  app.log.info("web/dist not built; run `pnpm build:web` to serve the SPA");
}

app.listen({ port: PORT, host: HOST }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
