# boAt Rockerz 440 — Interactive 3D Scrollytelling Website

An interactive, scroll-driven product showcase for the **boAt Rockerz 440 Wireless Headphones**, built with Next.js 14, Tailwind CSS, Framer Motion, and a real-time WebGL fragment-shader image-sequence renderer.

## Highlights

- **Smooth Scroll-Driven Disassembly**: Velocity-remapped 235-frame sequence with GPU sub-frame cross-fade interpolation for gradual separation, clean exploded engineering view, smooth reassembly, and deterministic reverse scroll.
- **Interactive Product Showcase & Colour Customization**: Live two-column configurator with disassembly progress slider (`Assembled` ↔ `Exploded View`), `Replay 3D Disassembly` / `Show Exploded` controls, and real-time GPU material-aware recolouring (**Active Black**, **Crimson Red**, **Arctic White**, **Gunmetal Grey**) synchronized across the full page.
- **Responsive Dark Editorial UI**: Glassmorphism sticky navigation bar with active section tracking, mobile drawer, verified boAt Rockerz 440 specifications, and `prefers-reduced-motion` support.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
