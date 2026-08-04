# Angular migration plan

Goal: replace `web/` (Vite + React + TypeScript + Tailwind) with an Angular
app in `angular/` while keeping the app **100% client-side**, keeping
`core/` untouched, and shipping to the same GitHub Pages URL.

Do not break the golden rules in `AGENTS.md`:
- no backend, no CLI
- one SVG builder (`core/spine/svg.ts`) is the single source of truth
- no fontkit / vector text in PDF
- `core/` stays Node-free

---

## 1. Why we're doing this

- Personal preference: no more React.
- Real signals the current code has bloated:
  - `App.tsx` = 218 lines, mostly state + prop drilling.
  - `CoverForm.tsx` = 303 lines: props interface repeats every state field
    once as a value and once as a setter (~50 lines of boilerplate).
  - `CoverPreviewSeparate.tsx` = 240 lines: mixes stage math, section
    rendering, drop overlays, borders, preset overlays.
  - Three different places touch spine sizing math: `useCoverStage`,
    `CoverPreviewSeparate`, `pdf/sections`.

Angular's DI + reactive state (signals) fits our shape better: one
`CoverStore` service holds the state, components read via `computed()`,
and template bindings replace the prop-drill.

---

## 2. Tooling & versions

- **Angular v18** (stable at the time of writing; standalone components
  by default, signals stable).
- **Angular CLI** for scaffolding and the dev server.
- **TailwindCSS** — same config as today. Angular v18 supports it natively.
- **TypeScript** — reuse existing tsconfig style, strict on.
- **pnpm** — keep the workspace. `angular/` becomes a workspace member.
- **Vite via `@angular-devkit/build-angular`'s esbuild builder** — we
  keep the fast dev loop and small production bundles.
- No SSR, no zone.js (opt into zoneless with `provideExperimentalZonelessChangeDetection()`
  if we go fully signal-based; otherwise leave zone.js on to keep it simple).

---

## 3. Target directory layout

```
core/                          UNCHANGED. Framework-free logic.
  types.ts
  presets.ts
  spine/svg.ts

assets/                        UNCHANGED. Fonts + preset images.

angular/                       NEW. Angular workspace root.
  angular.json
  package.json                 (Angular app deps; hoisted via pnpm workspace)
  tsconfig.json
  tsconfig.app.json
  src/
    main.ts                    bootstrapApplication(AppComponent, appConfig)
    index.html
    styles.css                 @tailwind base/components/utilities + globals
    app/
      app.component.ts         shell; hosts cover-form + preview
      app.config.ts            providers (router not needed; DomSanitizer, etc.)
      cover.store.ts           signal-based state (replaces App.tsx state)
      services/
        pdf-generator.service.ts       wraps pdf/generate.ts logic
        spine-assets.service.ts        wraps spine/assets.ts logic
        drag-drop.service.ts           replaces useGlobalFileDrag hook
      components/
        cover-form/            replaces CoverForm.tsx
        cover-preview-single/  replaces CoverPreviewSingle.tsx
        cover-preview-separate/ replaces CoverPreviewSeparate.tsx
        section-image/         replaces SectionImage.tsx
        spine-preset-preview/  replaces SpinePresetPreview.tsx
      ui/
        field/                 replaces ui/Field.tsx
        section/               replaces ui/Section.tsx
        radio-group/           replaces ui/RadioGroup.tsx
        file-input/            replaces ui/FileInput.tsx
        select/                replaces ui/Select.tsx
        drop-overlay/          replaces ui/DropOverlay.tsx
      pdf/                     copy-pasted from web/src/pdf/ with types
        borders.ts             ...unchanged
        cropMarks.ts           ...unchanged
        generate.ts            ...unchanged (public entry)
        layout.ts              ...unchanged
        sections.ts            ...unchanged
      spine/
        assets.ts              minor changes: use HttpClient or plain fetch
        buildOptions.ts        unchanged
        rasterize.ts           unchanged
      utils/
        image.ts               unchanged
        color.ts               unchanged

web/                           DELETED once angular/ reaches parity.

.github/workflows/
  deploy-pages.yml             switched to build angular/ instead of web/
```

Notes:
- `pdf/`, `spine/`, `utils/` move under `angular/src/app/` but their code
  is essentially the same TypeScript — they were already framework-free.
  Everything they need is either DOM APIs or `core/`.
- The Angular CLI does not love importing outside its `src/` root, so
  either symlink `../../core` and `../../assets` in via `paths`, or (my
  recommendation) add them to `angular.json`'s `sourceRoot` allow-list
  and to `tsconfig.json`'s `compilerOptions.paths`:
  ```json
  {
    "paths": {
      "@core/*": ["../core/*"],
      "@assets/*": ["../assets/*"]
    }
  }
  ```
  and `angular.json`'s `assets` array picks up `../assets/**`.

---

## 4. React → Angular mapping cheatsheet

| React construct               | Angular equivalent                                    |
|-------------------------------|--------------------------------------------------------|
| `useState`                    | `signal()`                                             |
| `useEffect` (derived)         | `computed()`                                           |
| `useEffect` (side effect)     | `effect()`                                             |
| Prop drilling                 | Inject `CoverStore` service                            |
| `useRef` for a DOM element    | `viewChild()` signal (Angular 17.3+) or `@ViewChild`  |
| `useMemo`                     | `computed()`                                           |
| Custom hooks                  | Injectable services                                    |
| JSX                           | Template `.html` (or inline `template:` string)        |
| CSS `className={...}`         | `[class]="..."` / `[ngClass]="..."`                    |
| Conditional rendering         | `@if` / `@for` control flow (Angular 17+)              |
| `dangerouslySetInnerHTML`     | `[innerHTML]` (SVG safe via `DomSanitizer.bypassSecurityTrustHtml`) |
| Event handlers `onChange`     | `(change)="..."` / `(input)="..."`                     |
| React fragments               | `<ng-container>`                                       |
| Portals                       | `CdkPortal` from Angular CDK (not needed yet)          |

Signals-first is important — that's the "no more React feel" the user
wanted. Skip RxJS `BehaviorSubject` glue for state; use signals.

---

## 5. Refactor opportunities the migration should take

These are all things we noticed while writing the current code. The
Angular rewrite is the natural moment to address them without churning
the React codebase.

### 5.1 Collapse the state prop-drill

Current: `App.tsx` owns ~15 state slots, passes both value and setter
into `CoverForm` (30 props) and split subsets into each preview
component. `CoverFormProps` alone is 50+ lines.

Target:
- `CoverStore` service holds all signals grouped semantically:
  - `case = { presetId, activePreset }` (activePreset is `computed`)
  - `mode = { kind, fit, fitBackground }`
  - `borders = { mode, thickness, color }`
  - `images = { single, back, front, spine }`
  - `spine = { preset, title, bg, textColor, textAlign, showFrontImage,
    frontImageWidening, showFrontSeparator }`
  - `ui = { busy, error, isDraggingFile }`
- Components inject the store. Templates read `store.spine.title()` etc.
- Zero props except for the leaf UI primitives (Field, RadioGroup, etc.).

### 5.2 Extract layout math into a service

Currently duplicated between `useCoverStage.ts`, `CoverPreviewSeparate.tsx`
and `pdf/sections.ts`.

Target: `CoverLayoutService`:
- given a preset + stage container size → `{ stageWidth, stageHeight,
  spineWidthPx, sideWidthPx, mmToPx }`
- given a preset + dpi → `{ sideWidthPxAt(dpi), spineWidthPxAt(dpi) }`
- constant `MM_PER_INCH` lives here.

Both preview and PDF use the same numbers via the same service.

### 5.3 One place for the spine preset registry

Right now the info about presets is spread across:
- `core/types.ts` (union of preset ids)
- `web/src/spine/assets.ts` (image specs, natural sizes)
- `web/src/spine/buildOptions.ts` (defaults per preset)
- `web/src/components/CoverForm.tsx` (dropdown labels)

Target: single `SPINE_PRESETS` record in `core/spine/presets.ts`:
```ts
export interface SpinePresetDef {
  id: SpinePresetId;
  label: string;
  hasSpineImage: boolean;
  hasFrontImage: boolean;
  supportsSeparator: boolean;
  defaults: { title?: string; bg?: string; textColor?: string; ... };
  // asset URLs stay web-side (they're bundler-resolved), so the def
  // exposes a `key` and the web layer maps it to bundled URLs.
}
```
Everything else (the form dropdown, buildOptions, section renderer, form
visibility) reads from this record via signals/computed.

### 5.4 Move image compositing out of `utils/image.ts`

`renderImageWithPresetTopToPng` grew 3 optional parameters (top padding,
bottom padding, separator height). Signature is fragile.

Target: builder-style options object:
```ts
export interface CompositeFrontOptions {
  file: File;
  widthPx: number;
  heightPx: number;
  fit: FitMode;
  fitBackground: string;
  topLayer?: {
    href: string;
    aspectRatio: number;
    topPaddingPx?: number;
    bottomPaddingPx?: number;
    separator?: { color: string; heightPx: number };
  };
}
export function renderFrontToPng(opts: CompositeFrontOptions): Promise<Uint8Array>
```
Preview overlay component uses the same options struct — one abstraction.

### 5.5 UI primitives → Angular components with content projection

`Field`, `Section`, `FileInput`, `RadioGroup`, `Select` all become
standalone components. Use content projection (`<ng-content>`) instead
of `children` prop. This is more idiomatic in Angular than trying to
mimic React's composition.

### 5.6 Delete the mm/pt/px maze

Constants live in `pdf/layout.ts` but conversions happen ad-hoc across
the codebase (`(borderThicknessPx / dpi) * MM_PER_INCH` is duplicated).

Target: `Units` service with `mmToPx(mm, dpi)`, `pxToMm(px, dpi)`,
`mmToPt(mm)` — used everywhere.

---

## 6. Phased migration

### Phase 0 — Scaffolding (this branch, this commit)
- [x] Branch `migrate-to-angular` cut.
- [x] `angular/` folder placeholder + this plan.

### Phase 1 — Bootstrap Angular workspace (small commit)
- [ ] `pnpm dlx @angular/cli@18 new disc-cover-generator-app --directory angular
      --routing false --style css --skip-install --standalone --package-manager pnpm`
- [ ] Wire pnpm workspace so `pnpm --filter angular ...` works.
- [ ] Add Tailwind: `pnpm --filter angular add -D tailwindcss postcss autoprefixer`
      + config identical to today's `tailwind.config.js` (adjust `content`
      globs to `angular/src/**/*.{html,ts}`).
- [ ] Add `paths` for `@core/*` and `@assets/*`, wire `angular.json` assets.
- [ ] Verify `ng serve` renders "hello".

### Phase 2 — Port framework-free code (no UI yet)
- [ ] Copy `web/src/pdf/**` → `angular/src/app/pdf/**` (adjust imports).
- [ ] Copy `web/src/spine/**` → `angular/src/app/spine/**` (drop React
      hooks, keep everything else).
- [ ] Copy `web/src/utils/**` → `angular/src/app/utils/**` unchanged.
- [ ] Apply refactor 5.4 (options object).
- [ ] Apply refactor 5.6 (Units service).
- [ ] Add a scratch component that calls `generateCoverPdfInBrowser` with
      dummy files and opens the PDF, to verify the PDF path works before
      touching UI.

### Phase 3 — State layer
- [ ] Implement `CoverStore` with signals per refactor 5.1.
- [ ] Implement `CoverLayoutService` per refactor 5.2.
- [ ] Implement `SPINE_PRESETS` registry per refactor 5.3.
- [ ] Unit tests for the store transitions.

### Phase 4 — UI primitives
- [ ] `field`, `section`, `radio-group`, `file-input`, `select`,
      `drop-overlay` standalone components.
- [ ] Same styling (Tailwind classes) as today.
- [ ] Storybook-lite: a `dev/` route that renders each primitive.

### Phase 5 — Domain components
- [ ] `section-image` (uses `<img>` + hover overlay).
- [ ] `spine-preset-preview` (renders SVG via `[innerHTML]` + `DomSanitizer`).
- [ ] `cover-preview-single`, `cover-preview-separate`.
- [ ] `cover-form`.
- [ ] `app.component` composes form + preview + drag-drop backdrop.

### Phase 6 — Parity check
- [ ] Manual matrix: DVD/BluRay/CD × single/three × ps2/xbox/text/blank
      × borders none/outer/all × fit stretch/fill/fit × widening/separator.
- [ ] Compare generated PDFs bit-for-bit vs. current app for the same inputs.
- [ ] Compare screenshots of the preview (Playwright screenshot diff).

### Phase 7 — Cutover
- [ ] Delete `web/`.
- [ ] Delete `vite.config.ts`.
- [ ] Update root `package.json`: scripts point at `angular/`.
- [ ] Rewrite `.github/workflows/deploy-pages.yml` to `pnpm --filter
      angular build --base-href /disc-cover-generator/`.
- [ ] Update `AGENTS.md` — replace React sections with Angular equivalents.
- [ ] Update `README.md`.

### Phase 8 — Polish
- [ ] Bundle-size check: Angular + our code should stay ≤ current 596 KB.
- [ ] Bring back `lucide` icons via `lucide-angular` (matches migration
      goal of familiar iconography).
- [ ] Prod build test on GH Pages preview.

Each phase = one PR, mergeable to `migrate-to-angular`.
`migrate-to-angular` merges to `main` only after Phase 7 passes parity.

---

## 7. Risks & how we mitigate

| Risk | Mitigation |
|------|------------|
| SVG font parity (fonts don't load inside `<img data:image/svg+xml>`) | Same trick as today: FontFace API preload + inline `@font-face` data URIs in the SVG. Live in `SpineAssetsService`. |
| Signals + `[innerHTML]` re-render thrash on every keystroke | Use a `debounce(50)` in a computed pipeline or a manual `effect()` with a timer. |
| Angular's zoneless mode still marked experimental | Ship v1 with zone.js; revisit zoneless after v18 goes stable-stable. |
| `pnpm` monorepo + Angular CLI | Angular CLI v18 works with pnpm workspaces if `packageManager` is set in root `package.json`. Confirmed with vanilla scaffold in a spike before Phase 1. |
| Bundle bloat (Angular > React) | Standalone components + `esbuild` builder + tree-shaken `lucide-angular` keeps prod bundle competitive. Budget: ≤ 800 KB gzipped total. |
| Base href for GH Pages | `--base-href /disc-cover-generator/` at build time; add `404.html` copy step to preserve deep-link handling. |

---

## 8. Open questions

- Do we want Angular Material for form controls, or keep the hand-rolled
  Tailwind primitives? Recommendation: **stay hand-rolled** to keep the
  bundle small and the visual style unchanged.
- Do we want the store as a single class or split (CaseStore, SpineStore,
  UiStore)? Recommendation: **single `CoverStore`** — the state is
  small enough that splitting adds ceremony without benefit.
- Zoneless now or later? Recommendation: **later** — ship with zone.js.

---

## 9. Definition of done

- `pnpm --filter angular build` produces a `dist/angular/disc-cover-generator-app/`
  that GH Pages serves at the same URL as today.
- Every current feature works: single/three input, presets, spine
  presets (ps2/xbox/text/blank), title, front top image + widening +
  ps2 separator, borders (none/outer/all), fit (stretch/fill/fit), drag
  and drop into every slot, clickable preview slots, generated PDF opens
  in a new tab.
- `web/` folder is gone.
- `AGENTS.md` reflects Angular conventions.
