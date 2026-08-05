# Repository guide for future agents & contributors

This file captures the high-level architectural and design decisions we
converged on. If you're picking up this repo, read this before making
significant changes.

## What this is

A **100% client-side** static web app that generates print-ready A4-landscape
PDFs for DVD / Blu-Ray / CD case covers. No backend. No server. Deploy the
contents of `dist/disc-cover-generator-app/browser/` to any static host
(GitHub Pages, Netlify, S3, ...).

- Framework: **Angular 22** (standalone components, signals, `@if` / `@for`)
- PDF: `pdf-lib` in the browser
- Runtime deps at the time of writing: **only `pdf-lib`** (plus Angular runtime)

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
   The web build imports directly from `core/**/*.ts` via the `@core/*`
   TypeScript path alias, so any Node dep there breaks the browser bundle.
6. **Do not reintroduce PrimeNG (or any dual-license UI kit).** PrimeNG
   v22 ships under Community/Commercial with registration + annual key
   renewal. We rebuilt the form on native HTML + SCSS + a custom
   `<app-segmented>`. Free MIT/OFL only from here on.
7. **No inline error banners.** All user-facing feedback goes through
   `ToastService` (bottom-center toasts). Success + error paths both use it.

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
                               ready — otherwise browsers flag it as blocked.
      theme.service.ts         'light' | 'dark' | 'system' signal, persisted
                               to localStorage, syncs to <html data-theme>.
      toast.service.ts         signal-based queue with success()/error()/
                               info()/show()/dismiss(). Auto-dismiss timers.
    components/
      cover-form/              Left-column form. Uses <app-segmented> for
                               kind/fit/borders/textAlign and native
                               <input>/<select>/<input type="color">.
      cover-preview-single/    Preview stage for single-image mode.
      cover-preview-separate/  Preview stage for back/spine/front with
                               section-divider borders + PS2 front-top logic.
      section-image/           Placeholder + <img> + hover overlay pill
                               (replace/remove) for a single cover section.
      file-input/              Reusable file picker (drop target-friendly).
      drop-overlay/            The "Drop file here" affordance shown per zone
                               during a drag.
      spine-preset-preview/    Inline <svg> preview of buildSpineSvg output,
                               used inside the separate preview's spine cell.
    ui/                        Zero-domain UI primitives.
      segmented/               <app-segmented [options] [(model)]>. Used 6+
                               times in cover-form. Replaces PrimeNG buttons.
      toast-container/         Fixed to bottom-center. Renders the toast queue.
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

## Spine rendering — read this before you touch spines

The spine has been the source of every subtle bug in this project.

**The pipeline is always: `buildSpineSvg()` → pixels.** Preview draws the
SVG inline. PDF rasterizes the SVG through a canvas via `spine/rasterize.ts`
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
too high.

If you change the spine font, re-run the empirical tuning:

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

## PDF output

- The Generate PDF button opens the result in a **new tab**. To dodge
  popup blockers, `PdfGeneratorService.generateAndOpen` calls
  `window.open('', '_blank')` **synchronously inside the click gesture**,
  then navigates the placeholder tab to the blob URL once bytes are
  ready. If gen throws we close the placeholder. If the browser blocks
  the initial open we surface a toast.
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
  Never hardcode a hex in a component SCSS — always use a token.
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

## Build / dev / release

```
pnpm install       # requires pnpm-workspace.yaml allowBuilds for postinstall scripts
pnpm dev           # ng serve on :4200
pnpm typecheck     # tsc -p tsconfig.app.json --noEmit
pnpm build         # ng build → dist/disc-cover-generator-app/browser/
pnpm build:pages   # same as build but with --base-href /disc-cover-generator/
```

### pnpm gotcha (allowBuilds)

pnpm 11+ refuses to run any dependency postinstall scripts unless
allow-listed. `esbuild`, `@parcel/watcher`, `lmdb`, `msgpackr-extract`
all need theirs. `pnpm-workspace.yaml` at repo root contains:

```yaml
allowBuilds:
  '@parcel/watcher': true
  esbuild: true
  lmdb: true
  msgpackr-extract: true
```

Do not remove this or `pnpm install` will refuse to build native modules
and Angular's dev server will fail to start.

### Deploy

`.github/workflows/deploy-pages.yml` runs `pnpm run build:pages` on push
to `main`, copies `index.html` → `404.html`, and uploads
`dist/disc-cover-generator-app/browser` to GitHub Pages.

## What we tried and rejected (do not redo)

- **Server + CLI package** (Fastify + Commander + sharp + pdf-lib on the
  backend). Redundant once the browser could do everything. Deleted.
- **React + Vite frontend.** Migrated to Angular 22 for signals + first-
  class dependency injection. Do not undo without a strong reason.
- **PrimeNG for form controls.** v22 dropped MIT for Community/Commercial
  with registration + annual key. Replaced with native HTML + custom
  `<app-segmented>`. Do not reintroduce PrimeNG or any dual-license kit.
- **PrimeIcons / @primeicons/angular.** Replaced with inline lucide-style
  SVGs. Keep icons inline — no icon font dep.
- **Runtime `getBBox()` measurement in the preview.** Solved centering
  for the preview only. Replaced with a constant tuned once
  (`VISUAL_CENTER_RATIO`).
- **`@pdf-lib/fontkit` for vector spine text in the PDF.** Drifted from
  the preview, added ~600 KB to the bundle, gave up. Removed.
- **`dominant-baseline="middle"` / `"central"`.** Center on the em-box,
  which puts caps too high. Rejected in favor of empirical
  `VISUAL_CENTER_RATIO`.
- **External CDN fonts inside SVG-in-`<img>`.** Browsers block external
  resource loads there. Fonts must be embedded as data URIs. Rejected.
- **Counter-based drag tracking (`dragenter++/dragleave--`).** Bounces
  every time the mouse crosses a child element. Replaced with document-
  level `dragover` + `drop`.
- **`e.stopPropagation()` inside drop handlers.** Combined with the
  document `drop` listener, this leaves the overlay visible after a
  drop. Always let drop events bubble.
- **Inline error banners in the form.** Replaced with `ToastService`
  bottom-center toasts.
- **`baseUrl` in tsconfig.** TS 6 flags it as deprecated. Use paths
  relative to the tsconfig location instead: `"@core/*": ["./core/*"]`.

## Coding style

- Prefer standalone Angular components with `changeDetection:
  ChangeDetectionStrategy.OnPush`. Use signals + computeds; avoid RxJS
  unless needed.
- Prefer small, pure functions. `core/` is a library the app consumes.
- No comments explaining what code does. Comments explain **why**, or
  the rare non-obvious constraint (e.g. why crop marks are drawn first,
  or why VISUAL_CENTER_RATIO exists).
- All colors go through the theme tokens in `styles.scss`.
- Icons are inline lucide-style SVGs.
