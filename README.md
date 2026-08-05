# disc-cover-generator

Generate print-ready PDF covers for DVD, Blu-Ray, and CD cases — 100% in
the browser, no backend, no upload. Ships as a static Angular app.

## Features

- Predefined case sizes: DVD Normal, DVD Slim, Blu-Ray, CD Jewel, CD Jewel (folded front)
- Single-image mode: one image stretched / filled / fitted across the whole cover
- 3-image mode: back + front + optional spine image
- Auto-generated spine styles (PS2, XBOX, XBOX360 — configurable title / colors / alignment)
- Fit modes: `stretch` | `fill` (cover) | `fit` (contain)
- Border modes: `none` | `outer` | `sections`
- Input formats: PNG, JPEG, WebP
- Live preview with drag-and-drop image slots
- Light / dark theme (One Dark Pro Darker in dark, PrimeNG Noir + Zinc in light)

## Tech stack

- Angular 22 (standalone components, signals, `@if` / `@for` control flow)
- TypeScript 6, SCSS
- pdf-lib for PDF generation (browser-side)
- Bundled Hind font family (OFL)
- No backend, no CLI — everything runs client-side

## Repository layout

```
src/                 Angular app (standalone components, signals, SCSS).
core/                Framework-free TypeScript: presets + spine SVG builder.
                     Consumed via the `@core/*` path alias. Must stay Node-free.
public/              Static assets served at the origin root.
public/assets/       Fonts (Hind family, OFL) + preset images (PS2, XBOX...).
angular.json         Angular workspace config.
tsconfig*.json       TS config for app + specs.
```

## Getting started

```bash
pnpm install
pnpm dev              # ng serve on http://localhost:4200
pnpm build            # production build → dist/disc-cover-generator-app/browser
pnpm build:pages      # production build with GitHub Pages base-href
pnpm typecheck        # tsc --noEmit on the app
```

## Deployment

Push to `main` and the `Deploy to GitHub Pages` workflow builds with
`--base-href /disc-cover-generator/` and publishes
`dist/disc-cover-generator-app/browser` to Pages.
