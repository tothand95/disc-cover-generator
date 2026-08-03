import hindSemiBoldUrl from "../../../assets/fonts/Hind-SemiBold.ttf?url";

let cached: Uint8Array | null = null;

/** Fetch the bundled Hind SemiBold TTF as bytes for pdf-lib font embedding. */
export async function loadHindSemiBold(): Promise<Uint8Array> {
  if (cached) return cached;
  const res = await fetch(hindSemiBoldUrl);
  if (!res.ok) throw new Error(`Failed to load spine font: ${res.status}`);
  cached = new Uint8Array(await res.arrayBuffer());
  return cached;
}
