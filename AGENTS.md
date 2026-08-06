# Repository guide for future agents & contributors

This file captures the architectural and design decisions this repo runs on.
If you're picking up the codebase, read this before making significant changes.

## What this is

A **100% client-side** static web app that generates print-ready A4-landscape
PDFs for DVD / Blu-Ray / CD case covers. Deploy the contents of
`dist/disc-cover-generator-app/browser/` to any static host (GitHub Pages,
Netlify, S3, …).

- Framework: **Angular 22** (standalone components, signals, `@if` / `@for`)
- PDF: `pdf-lib` in the browser
- Runtime dep set: **`pdf-lib`** + the Angular runtime

## Design invariants

These are the constraints the codebase relies on. New work should preserve them.

1. **All functionality runs in the browser.** Images stay on the user's
   machine. Everything from image decoding to PDF assembly happens
   client-side.
2. **The static site is the whole product.** Batch or scripted generation,
   if ever needed, is done by driving the static site via headless
   Chrome — not by adding a Node CLI or server.
3. **`buildSpineSvg()` in `core/spine/svg.ts` is the single source of
   truth for the spine.** The live preview and the PDF both consume it.
   Change spine visuals only there — the preview and PDF stay in lockstep
   because they share the same SVG string.
4. **The spine reaches the PDF as a rasterized PNG.** The SVG that
   `buildSpineSvg()` produces is drawn to a canvas and embedded as an
   image. This is the only way to guarantee the printed spine matches the
   preview pixel-for-pixel (Chrome's SVG text engine and pdf-lib's text
   engine disagree on baselines).
5. **`core/` is browser-safe TypeScript.** It uses no `fs`, `path`, or
   `node:*` imports. The web build imports directly from `core/**/*.ts`
   via the `@core/*` TypeScript path alias, so keeping `core/` Node-free
   keeps the browser bundle buildable.
6. **UI is built on native HTML + SCSS + local primitives (MIT/OFL only).**
   Form controls, layout, and iconography are hand-rolled. Ship-in-bundle
   fonts are Hind (OFL). No dual-licensed UI kits.
7. **User-facing feedback goes through `ToastService`.** Success and
   error paths both surface via bottom-center toasts rendered by
   `<app-toast-container>`. Form inputs stay focused on data entry.

## Architecture

```
public/assets/fonts/     Bundled Hind font family (OFL). Angular CLI copies
                         public/** into the build; @font-face rules live in
                         src/styles.scss.
public/assets/images/    Preset spine/front images (PS2, XBOX, XBOX360).
core/                    Pure, browser-safe TypeScript. Consumed via the
                         @core/* path alias in tsconfig.json.
  types.ts               Domain types (CasePreset, FitMode, SpinePresetInput...)
  presets.ts             Case dimensions (DVD normal/slim, Blu-Ray, CD, ...).
  spine/svg.ts           THE spine SVG builder. Preview AND PDF go through here.
src/                     Angular app.
  main.ts                Bootstraps App with app.config.ts providers.
  index.html             Root HTML shell; loads main.ts.
  styles.scss            Global CSS: @font-face, theme tokens (light + dark),
                         html/body reset. All colors in the app are tokens.
  app/
    app.ts / .html / .scss     App shell: 2×2 CSS grid (header, form, preview),
                               responsive wrap under 1000px, sun/moon theme
                               toggle, hosts <app-toast-container>.
    app.config.ts              Standalone providers (currently just the browser
                               global error listener).
    services/
      cover.store.ts           Signal-based store. Groups signals by domain
                               (case, mode, images, spine, borders, ui) so
                               templates read `store.spine.title()` instead of
                               a huge prop bag. Computeds `activePreset()` and
                               `spinePresetInput()` live here too.
      drag-drop.service.ts     Global drag detection (document-level dragover/
                               drop listeners). Exposes `isDraggingFile()`.
      pdf-generator.service.ts Wraps pdf/generate.ts. Opens a placeholder tab
                               synchronously inside the click gesture, then
                               navigates it to the blob URL once the PDF is
                               ready — so browsers treat it as user-initiated.
      theme.service.ts         'light' | 'dark' | 'system' signal, persisted
                               to localStorage, syncs to <html data-theme>.
      toast.service.ts         signal-based queue with success()/error()/
                               info()/show()/dismiss(). Auto-dismiss timers.
    components/
      cover-form/              Left-column form. Uses <app-segmented> for
                               kind/fit/borders/textAlign and native
                               <input>/<select>/<input type="color">. Emits a
                               `generate` output (named distinct from the
                               native `submit` event to avoid collision when
                               the inner <form>'s submit bubbles up).
      cover-preview-single/    Preview stage for single-image mode.
      cover-preview-separate/  Preview stage for back/spine/front with
                               section-divider borders + PS2 front-top logic.
                               Owns the spine-cell "Add spine image" pill
                               overlay so the pure spine renderer stays free
                               of picker concerns.
      section-image/           Placeholder + <img> + hover overlay pill
                               (replace/clear) for a single cover section.
      file-input/              Reusable file picker (drop target-friendly).
      drop-overlay/            The "Drop file here" affordance shown per zone
                               during a drag.
      spine-preset-preview/    Inline <svg> preview of buildSpineSvg output,
                               used inside the separate preview's spine cell.
                               Pure renderer — no input concerns.
    ui/                        Zero-domain UI primitives.
      segmented/               <app-segmented [options] [(model)]>. Used 6+
                               times in cover-form.
      toast-container/         Fixed to bottom-center. Renders the toast queue.
      icon/                    <app-icon [name] [size] [strokeWidth]>. Renders
                               lucide-style stroked SVGs from a PATHS lookup
                               with stroke="currentColor" so parents tint via
                               CSS color. Add icons by extending the IconName
                               union + PATHS map.
    pdf/                       PDF generation, split by concern.
      generate.ts              Orchestrator + public types (GenerateBrowserOptions).
      layout.ts                mm/pt/A4 constants, mmToPt, mmToPx.
      cropMarks.ts             Dashed crop marks (grey rgb(0.25, 0.25, 0.25)).
      borders.ts               Outer + section-divider borders.
      sections.ts              Renders each section to PNG (uses utils/image
                               and spine/rasterize).
    spine/
      assets.ts                Loads PS2 PNG + Hind fonts as data URIs
                               (browser only).
      buildOptions.ts          Preset → SpineSvgOptions bridge shared by the
                               preview and PDF.
      rasterize.ts             buildSpineSvg() → <img data:svg> → canvas
                               → PNG bytes.
    utils/
      image.ts                 Canvas-based image fit (stretch/fill/fit) →
                               PNG bytes.
      color.ts                 parseHex.
      stage-layout.ts          Computes the preview stage's px dimensions
                               (contain-style fit inside the container).
    directives/
      object-url.directive.ts  Manages URL.createObjectURL lifecycles.
      container-size.directive.ts  ResizeObserver → signal wrapper.
```

## Spine rendering

**The pipeline is: `buildSpineSvg()` → pixels.** The preview draws the
SVG inline. The PDF rasterizes the same SVG through a canvas via
`spine/rasterize.ts` and embeds the PNG. Same string in, same pixels
out — this is why the preview and the printed spine match.

### Centering constant

`VISUAL_CENTER_RATIO` in `core/spine/svg.ts` is tuned empirically for
the bundled Hind SemiBold. The text uses
`dominant-baseline="alphabetic"` and the baseline is shifted down by
`fontSize * VISUAL_CENTER_RATIO`. This makes caps land visually centered
in the spine strip. Keep alphabetic + this ratio for consistent results.

If the spine font changes, re-run the empirical tuning:

1. Set `y = 0` and try `dominant-baseline="middle"`, record above/below px.
2. Try `dominant-baseline="alphabetic"` with `y = fontSize * K` for several K.
3. Pick the K that makes above == below (or interpolate).

## Font handling

- The bundled font is Hind (OFL). All 5 static weights are shipped.
- Preview uses the fonts via `@font-face` rules in `src/styles.scss`.
  Angular CLI serves `public/assets/fonts/*.ttf` at `/assets/fonts/…`.
- Spine PDF rasterization uses `src/app/spine/assets.ts`, which does
  **two** things:
  1. Fetches all Hind weights and inlines them as data-URI `@font-face`
     blocks embedded in the SVG. This is required because the browser
     loads the SVG via `<img data:image/svg+xml,...>` in an isolated
     context that does not inherit page CSS.
  2. Registers the same weights on `document.fonts` via the `FontFace`
     API and awaits `document.fonts.ready` before rasterizing. This
     warms Chrome's font cache so the SVG-in-`<img>` picks the fonts up
     synchronously.
- Both preload and font-block calls are memoized after the first PDF
  generation, so subsequent generations are fast.
- The PDF contains **no font data and no text objects** — only the
  rasterized PNG of the spine. That's why the app ships with zero
  fontkit-related deps.

## PDF output

- The Generate PDF button opens the result in a **new tab**.
  `PdfGeneratorService.generateAndOpen` calls `window.open('', '_blank')`
  **synchronously inside the click gesture** and later navigates the
  placeholder tab to the blob URL once bytes are ready. This keeps the
  popup a direct product of the user click. Generation errors close the
  placeholder; a browser-blocked open surfaces a toast.
- Blob URL is revoked 60s after navigation.

## PDF layout

- Page: A4 landscape, hardcoded (`297 × 210 mm`).
- Cover is centered on the page. Every preset fits with default bleed.
- Crop marks are drawn **first** (dotted grey `rgb(0.25, 0.25, 0.25)`,
  6 mm long, from all four corners plus the two spine folds), so images
  and borders sit on top.
- Outer border is grown by `thickness/2` so its centered stroke sits
  fully outside the cover — the cover's visible area equals the preset
  dimensions.
- Section dividers (`borderMode = "sections"`) are centered on the
  section boundary, evenly biting into both neighboring sections.

## Image fit modes

Implemented once in `src/app/utils/image.ts` via canvas. Mirrored in the
preview via CSS `object-fit`:

| Fit mode | Canvas / CSS         |
|----------|----------------------|
| stretch  | `fill`               |
| fill     | `cover`              |
| fit      | `contain` + bg color |

## Theming

- **All colors are CSS custom-property tokens** defined in `src/styles.scss`.
  Component SCSS references tokens; the token layer is the only place
  raw hex values live.
- Tokens: `--bg`, `--surface`, `--surface-2`, `--surface-3`, `--border`,
  `--border-strong`, `--text`, `--text-muted`, `--text-subtle`,
  `--accent(-hover/-fg/-ring)` (neutral buttons — segmented active,
  theme toggle), `--primary(-hover/-fg/-ring)` (vibrant CTA — submit
  button), `--danger(-bg/-border)`, `--overlay`, `--shadow`, `--paper`
  (always white — printed PDF surface), `--select-chevron` (theme-aware
  URL for `<select>` dropdown arrow).
- **Light palette:** PrimeNG Noir preset + Tailwind Zinc surface scale.
- **Dark palette:** One Dark Pro Darker (sourced from
  `Binaryify/OneDark-Pro-darker.json`).
- Selection: `ThemeService` writes `data-theme="light" | "dark"` on
  `<html>`; without an attribute the `prefers-color-scheme` media query
  decides. Persisted in `localStorage`.
- **Hover overlays are unified:** empty-cell placeholder, filled-image
  overlay, and the spine preset overlay all use `var(--surface-3)`
  (empty placeholder = solid; overlays = `::before` scrim at opacity
  0.75 so the pill button on top stays fully opaque).

## Build / dev / release

```
pnpm install       # requires pnpm-workspace.yaml allowBuilds for postinstall scripts
pnpm dev           # ng serve on :4200
pnpm typecheck     # tsc -p tsconfig.app.json --noEmit
pnpm build         # ng build → dist/disc-cover-generator-app/browser/
pnpm build:pages   # same as build but with --base-href /disc-cover-generator/
```

### pnpm allowBuilds

pnpm 11+ requires postinstall scripts to be allow-listed. `esbuild`,
`@parcel/watcher`, `lmdb`, and `msgpackr-extract` all need theirs to
build native modules for Angular's dev server. Keep this block in
`pnpm-workspace.yaml`:

```yaml
allowBuilds:
  '@parcel/watcher': true
  esbuild: true
  lmdb: true
  msgpackr-extract: true
```

### CommonJS allow-list

`pdf-lib` depends on the CommonJS `pako` module. Angular's builder
would otherwise warn about a CJS optimization bailout. `angular.json`
lists it under the build options:

```json
"allowedCommonJsDependencies": ["pako"]
```

### Deploy

`.github/workflows/deploy-pages.yml` runs `pnpm run build:pages` on push
to `main`, copies `index.html` → `404.html`, and uploads
`dist/disc-cover-generator-app/browser` to GitHub Pages.

## Notable decisions worth preserving

- **Single SVG spine pipeline (no vector text in PDF).** Rasterizing the
  same SVG the preview shows guarantees the printed spine matches the
  preview. This is why the app has no fontkit dep and no PDF text
  objects for the spine.
- **`dominant-baseline="alphabetic"` + `VISUAL_CENTER_RATIO`.** Chrome
  centers `middle`/`central` on the em-box, which sits caps too high;
  the alphabetic baseline plus an empirical vertical shift gives visual
  center.
- **Fonts embedded as data URIs inside the SVG.** Browsers isolate
  `<img data:image/svg+xml,…>` from page CSS and block external network
  loads inside it, so inline data URIs are the reliable path.
- **Document-level `dragover` + `drop` for drag detection.** Uses the
  bubbled events instead of counter-based `dragenter++/dragleave--`, so
  the overlay state doesn't bounce as the mouse crosses child elements.
- **Drop handlers let events bubble.** The document-level `drop`
  listener needs to see the event to clear the dragging state, so
  handlers avoid `stopPropagation()`.
- **`tsconfig` uses tsconfig-relative paths (no `baseUrl`).** TS 6 flags
  `baseUrl` as deprecated. The `@core/*` alias resolves to `./core/*`
  directly.
- **`cover-form` output is named `generate`.** The inner `<form>`'s
  native `submit` event bubbles up to the host element, so the output
  gets a distinct name to keep the parent binding unambiguous.

## Coding style

- Standalone Angular components with
  `changeDetection: ChangeDetectionStrategy.OnPush`.
- Signals + `computed()` for state; RxJS only when a stream shape
  genuinely fits.
- Small, pure functions. `core/` is a library the app consumes.
- Comments explain **why** or capture non-obvious constraints (e.g. why
  crop marks are drawn first, or why `VISUAL_CENTER_RATIO` exists).
- All colors go through the theme tokens in `styles.scss`.
- Icons render through `<app-icon>` (lucide-style, inline, tinted via
  `currentColor`).
