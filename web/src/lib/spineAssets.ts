import ps2SpineUrl from "../../../assets/images/ps2-spine.png?url";
import type { SpineTopImage } from "../../../core/spine/svg";

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
