# Repository guide for future agents & contributors

This file captures the high-level architectural and design decisions we
converged on. If you're picking up this repo, read this before making
significant changes.

## What this is

A **100% client-side** static web app that generates print-ready A4-landscape
PDFs for DVD / Blu-Ray / CD case covers. No backend. No server. Deploy the
contents of `dist/` to any static host (GitHub Pages, Netlify, S3, ...).

- Framework: Vite + React + TypeScript + Tailwind
- PDF: `pdf-lib` in the browser
- Runtime deps at the time of writing: **only `pdf-lib`**

## Golden rules

1. **Do not reintroduce a server.** Everything must run in the browser.
   Images never leave the user's machine.
2. **Do not add a CLI.** We had one, we deleted it. If you want batch
   generation, run headless Chrome against the static site.
3. **One SVG builder is the single source of truth for the spine.** The
   preview and the PDF both consume `buildSpineSvg()` from
   `core/spine/svg.ts`. If you change spine visuals, change it there and
   nowhere else. See "Spine rendering" below.
4. **Do not add fontkit / vector text.** We tried it. It drifted from the
   preview because pdf-lib's text engine is not Chrome's SVG engine. The
   only way to guarantee visual parity is to hand pdf-lib pixels.
5. **`core/` must stay Node-free.** No `fs`, `path`, `node:*` imports.
   The web build imports directly from `core/**/*.ts`, so any Node dep
   there breaks the browser bundle.

## Architecture

```
assets/fonts/            Bundled Hind font family (OFL). Vite fingerprints
                         and serves them; see web/src/index.css @font-face.
core/                    Pure, browser-safe TypeScript.
  types.ts               Domain types (CasePreset, FitMode, SpinePresetInput, ...).
  presets.ts             Case dimensions (DVD normal/slim, Blu-Ray, CD, ...).
  spine/svg.ts           THE spine SVG builder. Preview AND PDF go through here.
web/                     Vite root.
  src/App.tsx            Form state + PDF trigger (Blob -> <a download>).
  src/CoverPreview.tsx   Live preview; renders buildSpineSvg() inline via dangerouslySetInnerHTML.
  src/index.css          Global @font-face for the Hind weights.
  src/lib/image.ts       Canvas-based image fit (stretch / fill / fit) -> PNG bytes.
  src/lib/spineRaster.ts buildSpineSvg() -> <img data:svg> -> canvas -> PNG bytes.
  src/lib/pdf.ts         Assembles the final PDF via pdf-lib.
```

## Spine rendering — read this before you touch spines

The spine has been the source of every subtle bug in this project.

**The pipeline is always: `buildSpineSvg()` -> pixels.** Preview draws the
SVG inline. PDF rasterizes the SVG through a canvas via `spineRaster.ts`
and embeds the PNG. Same string in, same pixels out.

Why not vector text in the PDF? Because Chrome's SVG text baselines and
pdf-lib's text baselines don't agree. When we used both, preview and PDF
drifted by a few pixels at every font size. Rasterizing the SVG is the
only path that guarantees pixel-parity.

### Centering constant

`VISUAL_CENTER_RATIO` in `core/spine/svg.ts` was tuned empirically for the
bundled Hind SemiBold. It uses `dominant-baseline="alphabetic"` and shifts
the baseline down by `fontSize * VISUAL_CENTER_RATIO`. Do **not** switch
to `dominant-baseline="middle"` or `"central"` — Chrome centers those on
the em-box, which has more descender space than ascender, so caps land
too high (24 px above, 32 px below in our tests).

If you change the spine font, re-run the empirical tuning:
1. Set `y = 0` and try `dominant-baseline="middle"`, record above/below px.
2. Try `dominant-baseline="alphabetic"` with `y = fontSize * K` for several K.
3. Pick the K that makes above == below (or interpolate).

### Adding new spine presets

`core/spine/svg.ts` handles the geometry. If a new preset needs different
colors or fonts, extend the option shape there and update `spineRaster.ts`
to translate `SpinePresetInput` -> `buildSpineSvg` options. Do not add a
second rendering path.

## Font handling

- The bundled font is Hind (OFL). All 5 static weights are shipped.
- Preview uses the fonts via `@font-face` in `web/src/index.css` — Vite
  fingerprints the URLs at build time. No runtime loading logic needed.
- Spine PDF rasterization uses `web/src/lib/spineAssets.ts`, which does
  **two** things:
  1. Fetches all Hind weights and inlines them as data-URI `@font-face`
     blocks embedded in the SVG. Required because the browser loads the
     SVG via `<img data:image/svg+xml,...>` in an isolated context that
     does **not** inherit page CSS.
  2. Registers the same weights on `document.fonts` via the `FontFace`
     API and awaits `document.fonts.ready` before rasterizing. Warms
     Chrome's font cache so the SVG-in-`<img>` picks them up
     synchronously and doesn't fall back to sans-serif under a race.
- Both preload and font-block calls are memoized after the first PDF
  generation, so subsequent generations are fast.
- The PDF itself contains **no font data and no text objects** — only
  the rasterized PNG of the spine. That's why the app has zero
  fontkit-related deps.
- All available weights are always embedded, so if `buildSpineSvg`
  later switches `font-weight` (or exposes it as an option), no loader
  changes are needed.

## PDF output

- The Generate PDF button opens the result in a **new tab** using
  `window.open(blobUrl, "_blank")` — the browser's built-in viewer
  renders it inline. No forced download. The blob URL is revoked after
  60s so the new tab has time to load it.
- If the user's browser blocks the pop-up, the app surfaces a visible
  error asking them to allow pop-ups.

## PDF layout

- Page: A4 landscape, hardcoded (`297 x 210 mm`).
- Cover is centered on the page. Every preset fits with default bleed.
- Crop marks are drawn **first** (dotted grey `rgb(0.25, 0.25, 0.25)`,
  6 mm long, from all four corners plus the two spine folds), so images
  and borders sit on top. The grey is dark enough to see when printed
  but light enough to trim by.
- Outer border is grown by `thickness/2` so its centered stroke sits
  fully outside the cover — the cover's visible area equals the preset
  dimensions.
- Section dividers (`borderMode = "sections"`) are centered on the
  section boundary, evenly biting into both neighboring sections.

## Image fit modes

Implemented once in `web/src/lib/image.ts` via canvas. Mirrored in the
preview via CSS `object-fit`:

| Fit mode | Canvas / CSS         |
|----------|----------------------|
| stretch  | `fill`               |
| fill     | `cover`              |
| fit      | `contain` + bg color |

## Build / dev / release

```
pnpm install   # requires pnpm-workspace.yaml with allowBuilds: { esbuild: true }
pnpm dev       # Vite dev server on :5173
pnpm typecheck # tsc -p web/tsconfig.json --noEmit (also covers core/**)
pnpm build     # typecheck + vite build -> dist/
pnpm preview   # serve dist/ locally
pnpm clean     # rm -rf dist
```

### pnpm gotcha

pnpm 10+ blocks postinstall scripts unless allow-listed. Vite depends on
`esbuild`, which needs its postinstall to work on Windows. The repo ships
`pnpm-workspace.yaml` with:

```yaml
allowBuilds:
  esbuild: true
```

Do not remove this or `pnpm install` will fail on a clean checkout.

## What we tried and rejected (do not redo)

- **Server + CLI package.** Fastify + Commander + sharp + pdf-lib on the
  backend. Worked, but redundant once the browser could do everything.
  Deleted.
- **Runtime `getBBox()` measurement in the preview.** Solved one instance
  of the centering problem but only for the preview. Replaced with a
  constant tuned once (`VISUAL_CENTER_RATIO`).
- **`sharp` `.trim()` on the server for pixel-perfect glyph centering.**
  Same idea, server side. Gone with the server.
- **`@pdf-lib/fontkit` for vector spine text in the PDF.** Drifted from
  the preview, added ~600 KB to the bundle, gave up. Removed.
- **`dominant-baseline="middle"` / `"central"`.** Both put caps too high
  because they center on the em-box. Rejected in favor of empirical
  `VISUAL_CENTER_RATIO`.
- **Rendering fonts via base64 in the SVG.** Not needed once the SVG is
  rasterized in the same browser tab that has the fonts loaded.
  *(Update: partially revisited — see "Font handling" above. When the
  SVG is loaded via `<img data:image/svg+xml,...>`, the browser DOES
  NOT inherit the page's `@font-face`. Data-URI-embedded fonts inside
  the SVG plus a `FontFace`-API preload on the main document are both
  required.)*
- **Google Fonts / external CDN font URLs.** Browsers block external
  resource loads from within SVG-in-`<img>` for security. Fonts still
  need to be embedded as data URIs, so a CDN wouldn't reduce our
  work — it would only add a network dependency and remove offline
  capability. Rejected.
- **Counter-based drag tracking (`dragenter++/dragleave--`).** Bounces
  every time the mouse crosses a child element boundary, leaving the
  overlay stuck after a drop when different zone DOMs have different
  child-element structures. Replaced with `dragover` + `drop` on the
  document.
- **`e.stopPropagation()` inside drop handlers.** Combined with the
  document `drop` listener, this leaves the overlay visible after a
  drop. Always let drop events bubble.

## Drag-and-drop image inputs

The preview panel is a drop target: users can drag OS images onto the
Back / Front / Spine / Single-image slots.

- **Global drag detection** lives in `App.tsx`: two document-level
  listeners (`dragover` sets `isDraggingFile = true`, `drop` sets it
  false). Kept intentionally simple — no counter, no timers.
- **`DropOverlay`** in `CoverPreview.tsx` is the *one* component that
  renders the highlighted drop UI. Each cover section mounts one
  instance on top of its normal contents; it's `null` when no drag is
  in flight.
- Do **not** call `stopPropagation()` in local drop handlers. Doing so
  suppresses the document's `drop` listener and leaves the overlay
  stuck. All zones must use the same identical handler pattern —
  copy-paste, don't diverge.
- `FileInput` (App.tsx) syncs its underlying `<input type="file">`
  filename via `DataTransfer` in a `useEffect`, so a drop that sets
  the React `file` state also updates the native input's displayed
  filename.

## Form layout

- Left column is split into `<Section>` fieldsets (Case, Images, Spine,
  Layout, Borders). Each fieldset is a `<fieldset>` with a small
  uppercase `<legend>`. Don't add new top-level `<Field>`s outside a
  section — the layout breaks visually.
- The Spine section only renders in three-image mode when no spine
  image file is uploaded (falls back to preset-driven spine).

## Coding style

- Prefer small, pure functions. `core/` is a library the web app consumes.
- No comments explaining what code does. Comments explain **why**, or the
  rare non-obvious constraint (e.g. why crop marks are drawn first).
- Tailwind for structural/layout styling. Custom CSS only when Tailwind
  can't express the layout naturally.
