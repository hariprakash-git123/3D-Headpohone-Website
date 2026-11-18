# boAt Rockerz 440 — Interactive 3D Scrollytelling Website

An interactive, scroll-driven product showcase for the **boAt Rockerz 440 Wireless Headphones**, built with Next.js 16, React 19, Tailwind CSS, Framer Motion, and a real-time WebGL fragment-shader image-sequence renderer.

> Unofficial concept showcase — not affiliated with, endorsed by, or sponsored by boAt. Product imagery is illustrative.

## Highlights

- **Scroll-driven disassembly**: velocity-remapped 235-frame sequence with GPU sub-frame cross-fades, an exploded engineering view, and smooth reassembly.
- **Live configurator**: disassembly slider, `Replay 3D Disassembly` / `Show Exploded` controls, and real-time GPU recolouring (**Active Black**, **Crimson Red**, **Arctic White**, **Gunmetal Grey**) synced across the page. The chosen finish is shareable via `?color=crimson-red`.
- **Mobile-aware loading**: phones and data-saver / slow connections get a 960px WebP frame set (~5 MB instead of ~12 MB); the bulk download waits until the page has loaded (or, on constrained networks, until the visitor interacts).
- **Accessible**: visible keyboard focus, `prefers-reduced-motion` support, labelled canvases, an ARIA radio group with arrow-key navigation, and an Escape-closable mobile menu.

## Getting started

Requires Node.js 22.13 or newer. The repo's `.node-version` file pins Node 22, and Cloudflare's build uses it too.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view it locally.

**Live site:** [https://boatheadphones.hariprakashmit.workers.dev/](https://boatheadphones.hariprakashmit.workers.dev/)

## Scripts

| Command                   | What it does                                              |
| ------------------------- | --------------------------------------------------------- |
| `npm run dev`             | Start the dev server                                      |
| `npm run build`           | Static export to `out/` (deployed by Wrangler)            |
| `npm run lint`            | ESLint (Next.js core-web-vitals + TypeScript rules)       |
| `npm run typecheck`       | TypeScript check                                          |
| `npm test`                | Unit tests (Vitest)                                       |
| `npm run optimize:frames` | Regenerate `public/frames/` and `public/og-image.jpg`     |

## Configuration

Set `NEXT_PUBLIC_SITE_URL` at build time (e.g. in Cloudflare's build environment variables) to your production URL, such as `https://example.com`. It's needed for the canonical URL and the social share image, since crawlers need absolute URLs. Without it, those tags are left out and the build prints a warning.

The value must be a full `https://` URL. Plain `http://` is accepted only for `localhost` and `127.0.0.1`. Surrounding whitespace and trailing slashes are removed. If the value is invalid (for example `example.com` with no scheme, or a `javascript:` URL), the build doesn't fail: it prints a warning naming `NEXT_PUBLIC_SITE_URL` and leaves those tags out.

## Image pipeline

High-resolution sources live in `assets-src/` and are **not** deployed. `npm run optimize:frames` builds:

- `public/frames/<version>/lg/NNN.jpg`: the 1920px originals, copied as-is (re-encoding gave no size win).
- `public/frames/<version>/sm/NNN.webp`: 960px WebP for phones and slow connections.
- `public/og-image.jpg`: the 1200×630 share image.

If you change the frames, bump `FRAMES_VERSION` in `src/lib/sequenceStore.ts` and run `FRAMES_VERSION=v2 npm run optimize:frames`. The versioned folder lets `public/_headers` cache frames as immutable.

## Project structure

```
src/app/            layout (metadata, font, hero preload), page, icon
src/components/     Navbar, HeadphoneScrollytelling, SpecsAndOrderSection, ExploreShowcase
src/lib/            chapters (scroll story config), frameMapping, sequenceStore (loader),
                    sequenceRenderer (WebGL), rockerz440Config (colourways), site, easing
scripts/            optimize-frames.mjs
public/_headers     Cloudflare cache + security headers
```
