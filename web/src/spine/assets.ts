import ps2SpineUrl from "../../../assets/images/ps2-spine.png?url";
import hindLightUrl from "../../../assets/fonts/Hind-Light.ttf?url";
import hindRegularUrl from "../../../assets/fonts/Hind-Regular.ttf?url";
import hindMediumUrl from "../../../assets/fonts/Hind-Medium.ttf?url";
import hindSemiBoldUrl from "../../../assets/fonts/Hind-SemiBold.ttf?url";
import hindBoldUrl from "../../../assets/fonts/Hind-Bold.ttf?url";
import { SPINE_FONT_FAMILY, type SpineTopImage } from "../../../core/spine/svg";

const PS2_NATURAL_WIDTH = 500;
const PS2_NATURAL_HEIGHT = 1687;

let cached: SpineTopImage | null = null;

/** Fetches the bundled PS2 spine PNG and returns it as a self-contained data URI. */
export async function loadPs2SpineImage(): Promise<SpineTopImage> {
  if (cached) return cached;
  const res = await fetch(ps2SpineUrl);
  if (!res.ok) throw new Error(`Failed to load PS2 spine image: ${res.status}`);
  const blob = await res.blob();
  const dataUrl: string = await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
  cached = { href: dataUrl, aspectRatio: PS2_NATURAL_WIDTH / PS2_NATURAL_HEIGHT };
  return cached;
}

const SPINE_FONT_WEIGHTS: Array<{ weight: number; url: string }> = [
  { weight: 300, url: hindLightUrl },
  { weight: 400, url: hindRegularUrl },
  { weight: 500, url: hindMediumUrl },
  { weight: 600, url: hindSemiBoldUrl },
  { weight: 700, url: hindBoldUrl },
];

let cachedFontBlock: string | null = null;
let documentFontsRegistered: Promise<void> | null = null;

async function fetchAsArrayBuffer(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.arrayBuffer();
}

function arrayBufferToDataUrl(buf: ArrayBuffer, mime: string): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

/**
 * Register every Hind weight on document.fonts and wait for them to load.
 * Warms Chrome's font cache so the SVG-in-<img> rasterizer picks them up
 * synchronously instead of racing with async @font-face decoding. Runs once
 * and its result is memoized.
 */
export function preloadSpineDocumentFonts(): Promise<void> {
  if (documentFontsRegistered) return documentFontsRegistered;
  documentFontsRegistered = (async () => {
    const buffers = await Promise.all(
      SPINE_FONT_WEIGHTS.map(async ({ weight, url }) => ({
        weight,
        buffer: await fetchAsArrayBuffer(url),
      })),
    );
    await Promise.all(
      buffers.map(async ({ weight, buffer }) => {
        const face = new FontFace(SPINE_FONT_FAMILY, buffer, {
          weight: String(weight),
          style: "normal",
        });
        await face.load();
        document.fonts.add(face);
      }),
    );
    await document.fonts.ready;
  })();
  return documentFontsRegistered;
}

/**
 * Returns an SVG <defs><style>@font-face…</style></defs> block embedding
 * every available Hind weight (300–700) as data URIs. Required because the
 * rasterizer loads the SVG through an isolated <img> context that does not
 * inherit page CSS. Fonts are fetched once and cached across generations.
 */
export async function loadSpineFontStyleBlock(): Promise<string> {
  if (cachedFontBlock) return cachedFontBlock;
  const faces = await Promise.all(
    SPINE_FONT_WEIGHTS.map(async ({ weight, url }) => {
      const buffer = await fetchAsArrayBuffer(url);
      const dataUrl = arrayBufferToDataUrl(buffer, "font/ttf");
      return `@font-face{font-family:"${SPINE_FONT_FAMILY}";font-weight:${weight};font-style:normal;src:url("${dataUrl}") format("truetype");}`;
    }),
  );
  cachedFontBlock = `<defs><style>${faces.join("")}</style></defs>`;
  return cachedFontBlock;
}
