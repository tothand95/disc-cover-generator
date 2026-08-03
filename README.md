# disc-cover-generator

Generate print-ready PDF covers for DVD, Blu-Ray, and CD cases.

## Features

- Predefined case sizes: DVD Normal, DVD Slim, Blu-Ray, CD Jewel, CD Jewel (folded front)
- Single-image mode: one image stretched/filled/fitted across the whole cover
- 3-image mode: back + front + optional spine
- Auto-generated spine styles (PS2 first; XBOX, XBOX360, PS1 planned)
- Fit modes: `stretch` | `fill` (cover) | `fit` (contain)
- Border modes: `none` | `outer` | `sections`
- Input formats: PNG, JPEG, WebP

## Layout

- `core/`   — image + PDF generation (framework-agnostic)
- `cli/`    — command-line interface
- `server/` — Fastify HTTP wrapper around `core` + static SPA hosting
- `web/`    — Vite + React + Tailwind UI

## Getting started

```bash
pnpm install
pnpm build            # compiles server (tsc) + web (vite)
pnpm start            # runs Fastify at http://127.0.0.1:3000
```

### Development

```bash
pnpm dev              # server on :3000, Vite dev server on :5173 (proxies /api)
```

Open http://localhost:5173 for the UI with hot reload.

### CLI

```bash
pnpm cli list-presets
pnpm cli three --preset dvd-normal --back back.png --front front.png \
  --spine-preset ps2 --spine-title "Game Title" --border sections -o cover.pdf
```


