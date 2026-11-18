"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ExternalLink, Layers } from "lucide-react";
import {
  getColorwayById,
  ROCKERZ_COLORWAYS,
  RockerzColorwayId,
} from "@/lib/rockerz440Config";
import { sequenceStore } from "@/lib/sequenceStore";
import { mapSliderToFrame } from "@/lib/frameMapping";
import { easeInOutCubic } from "@/lib/easing";
import { OFFICIAL_PRODUCT_URL } from "@/lib/site";
import {
  createSequenceRenderer,
  SequenceRendererHandle,
} from "@/lib/sequenceRenderer";

interface ExploreShowcaseProps {
  selectedColorway: RockerzColorwayId;
  onSelectColorway: (id: RockerzColorwayId) => void;
}

const FOCUS_RING =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-boatRed focus-visible:ring-offset-2 focus-visible:ring-offset-carbon";

/**
 * Interactive configurator: disassembly slider + colourway picker.
 * Kept as its own component because the slider updates state on every animation frame;
 * isolating it stops those updates from re-rendering the specification cards.
 */
export default function ExploreShowcase({
  selectedColorway,
  onSelectColorway,
}: ExploreShowcaseProps) {
  const reducedMotion = Boolean(useReducedMotion());
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<SequenceRendererHandle | null>(null);
  const animRafRef = useRef<number | null>(null);
  const progressRef = useRef<number>(0);
  const swatchRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const [progress, setProgress] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  const activeColor = getColorwayById(selectedColorway);

  const stopAnimation = useCallback(() => {
    if (animRafRef.current !== null) {
      cancelAnimationFrame(animRafRef.current);
      animRafRef.current = null;
    }
    setIsAnimating(false);
  }, []);

  const applyProgress = useCallback((nextP: number, force = false) => {
    const clamped = Math.max(0, Math.min(1, nextP));
    progressRef.current = clamped;
    setProgress(clamped);
    rendererRef.current?.setFrame(mapSliderToFrame(clamped), force);
  }, []);

  /** Smoothly animates the disassembly slider from `from` to `to`. */
  const animateTo = useCallback(
    (from: number, to: number, durationMs: number) => {
      stopAnimation();
      if (reducedMotion || durationMs <= 0) {
        applyProgress(to, true);
        return;
      }

      setIsAnimating(true);
      const startTime = performance.now();

      const step = (now: number) => {
        const rawT = Math.min(1, (now - startTime) / durationMs);
        applyProgress(from + (to - from) * easeInOutCubic(rawT));

        if (rawT < 1) {
          animRafRef.current = requestAnimationFrame(step);
        } else {
          animRafRef.current = null;
          setIsAnimating(false);
        }
      };

      animRafRef.current = requestAnimationFrame(step);
    },
    [applyProgress, reducedMotion, stopAnimation]
  );

  // Mount the shared GPU sequence renderer on the preview canvas
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    sequenceStore.startPreloading();
    const renderer = createSequenceRenderer(canvas, selectedColorway, {
      mobileVerticalShift: false,
      fitScale: 0.92,
      verticalOffsetPct: -0.055,
    });
    rendererRef.current = renderer;

    renderer.setFrame(mapSliderToFrame(progressRef.current), true);

    const unsubscribe = sequenceStore.subscribe((_pct, settledIdx, ok) => {
      if (!ok) return;
      const activeFrameIdx =
        Math.round(mapSliderToFrame(progressRef.current)) - 1;
      if (settledIdx === 0 || Math.abs(settledIdx - activeFrameIdx) <= 2) {
        renderer.setFrame(mapSliderToFrame(progressRef.current), true);
      }
    });

    const onResize = () => renderer.resize();
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      stopAnimation();
      unsubscribe();
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      rendererRef.current = null;
    };
    // Initial setup only; colourway updates are handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Smoothly update the material colour while preserving animation progress
  useEffect(() => {
    rendererRef.current?.setColorway(selectedColorway, reducedMotion);
  }, [selectedColorway, reducedMotion]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    stopAnimation();
    applyProgress(parseFloat(e.target.value));
  };

  // Replay: restarts from 0 (assembled) -> 1 (exploded view)
  const handleReplayDisassembly = () => {
    applyProgress(0, true);
    animateTo(0, 1, 3200);
  };

  // Show exploded, or reassemble if already exploded
  const handleToggleExploded = () => {
    if (progressRef.current >= 0.92) {
      animateTo(progressRef.current, 0, 1250);
    } else {
      animateTo(progressRef.current, 1, 1350);
    }
  };

  // WAI-ARIA radio group: arrow keys move selection, only the checked swatch is tabbable.
  const handleSwatchKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    const count = ROCKERZ_COLORWAYS.length;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (index + 1) % count;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      next = (index - 1 + count) % count;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = count - 1;
    if (next === null) return;
    e.preventDefault();
    onSelectColorway(ROCKERZ_COLORWAYS[next].id);
    swatchRefs.current[next]?.focus();
  };

  const statusLabel =
    progress < 0.08
      ? "ASSEMBLED"
      : progress >= 0.92
      ? "EXPLODED VIEW"
      : "DISASSEMBLING";

  const sliderPercent = Math.round(progress * 100);

  return (
    <section
      id="explore"
      aria-labelledby="explore-heading"
      className="relative overflow-hidden bg-obsidian py-24 sm:py-32"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 editorial-grid-bg opacity-35"
      />

      <div className="relative mx-auto max-w-[1160px] px-5 sm:px-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-[28px] border border-white/[0.09] bg-gradient-to-b from-[#0B0B0F] to-[#060608] p-6 sm:p-10 lg:p-14 shadow-[0_30px_100px_rgba(0,0,0,0.85)]"
        >
          {/* Ambient finish glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full blur-[130px] transition-colors duration-700"
            style={{ background: activeColor.glow }}
          />

          <div className="relative grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
            {/* LEFT — live preview */}
            <div className="lg:col-span-6">
              <div className="relative flex aspect-[4/3] w-full flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-obsidian">
                <canvas
                  ref={previewCanvasRef}
                  role="img"
                  aria-label={`boAt Rockerz 440 in ${activeColor.name}, ${sliderPercent}% disassembled`}
                  className="absolute inset-0 h-full w-full"
                />

                {/* Perimeter vignette so the product floats */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                  style={{ boxShadow: "inset 0 0 60px 14px #050505" }}
                />

                {/* Status badge */}
                <div className="relative z-10 p-4">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-carbon/85 px-3.5 py-1.5 text-[10.5px] font-semibold tracking-[0.16em] text-white/85 uppercase backdrop-blur-md">
                    <Layers aria-hidden="true" className="h-3.5 w-3.5 text-boatRed" />
                    <span>{statusLabel}</span>
                  </span>
                </div>

                {/* Disassembly slider */}
                <div className="relative z-10 p-3.5 sm:p-4">
                  <div className="rounded-xl border border-white/[0.08] bg-carbon/90 px-4 py-3 backdrop-blur-md">
                    <div
                      aria-hidden="true"
                      className="flex items-center justify-between text-[10px] font-semibold tracking-[0.15em] text-mutedZinc uppercase"
                    >
                      <span className={progress < 0.15 ? "text-white" : undefined}>
                        Assembled
                      </span>
                      <span className={progress > 0.85 ? "text-white" : undefined}>
                        Exploded View
                      </span>
                    </div>

                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.002}
                      value={progress}
                      onChange={handleSliderChange}
                      aria-label="Disassembly progress"
                      aria-valuetext={`${sliderPercent}% disassembled`}
                      className={`boat-range-slider mt-2.5 w-full cursor-pointer ${FOCUS_RING}`}
                      style={{
                        background: `linear-gradient(to right, #FF3B30 0%, #FF3B30 ${sliderPercent}%, rgba(255,255,255,0.16) ${sliderPercent}%, rgba(255,255,255,0.16) 100%)`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT — product info & colour customisation */}
            <div className="lg:col-span-6">
              <p className="text-[11px] font-semibold tracking-[0.24em] text-boatRed uppercase">
                boAt Rockerz 440
              </p>

              <h2
                id="explore-heading"
                className="mt-2.5 text-gradient-hero text-[clamp(2rem,3.8vw,3.1rem)] font-bold leading-[1.05] tracking-[-0.035em]"
              >
                Explore Rockerz 440
              </h2>

              <p className="mt-3.5 text-[15.5px] leading-[1.65] text-mutedZinc">
                Switch finishes to preview boAt Rockerz 440 in real time—both
                here and across the full scroll-driven 3D disassembly
                experience above.
              </p>

              {/* Colourway picker */}
              <div className="mt-7">
                <p
                  id="colorway-label"
                  className="text-[11px] font-semibold tracking-[0.18em] text-mutedZinc uppercase"
                >
                  Colorway &nbsp;—&nbsp;{" "}
                  <span className="text-white">{activeColor.name}</span>
                </p>

                <div
                  role="radiogroup"
                  aria-labelledby="colorway-label"
                  className="mt-3.5 flex items-center gap-3.5"
                >
                  {ROCKERZ_COLORWAYS.map((item, index) => {
                    const active = item.id === activeColor.id;
                    return (
                      <button
                        key={item.id}
                        ref={(el) => {
                          swatchRefs.current[index] = el;
                        }}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        aria-label={item.name}
                        tabIndex={active ? 0 : -1}
                        title={item.name}
                        onClick={() => onSelectColorway(item.id)}
                        onKeyDown={(e) => handleSwatchKeyDown(e, index)}
                        className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-transform duration-200 hover:scale-105 ${FOCUS_RING}`}
                        style={{
                          boxShadow: active
                            ? "0 0 0 2px #070709, 0 0 0 3.5px #FF3B30"
                            : "0 0 0 1px rgba(255,255,255,0.22)",
                        }}
                      >
                        <span
                          aria-hidden="true"
                          className="h-7 w-7 rounded-full border border-white/15 transition-transform duration-200"
                          style={{ backgroundColor: item.swatch }}
                        />
                      </button>
                    );
                  })}
                </div>

                <p className="mt-3.5 text-[13.5px] text-mutedZinc">
                  {activeColor.description}
                </p>
              </div>

              {/* CTAs */}
              <div className="mt-8 flex flex-wrap items-center gap-3.5 border-t border-white/[0.08] pt-7">
                <a
                  href={OFFICIAL_PRODUCT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`btn-boat-cta inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14px] font-semibold tracking-[-0.01em] text-white ${FOCUS_RING}`}
                >
                  Buy on boAt
                  <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>

                <button
                  type="button"
                  onClick={handleReplayDisassembly}
                  className={`rounded-full border border-white/[0.15] bg-carbon/90 px-5 py-3 text-[13.5px] font-medium text-white/90 transition-all duration-200 hover:border-boatRed/55 hover:bg-white/[0.04] hover:text-white ${FOCUS_RING}`}
                >
                  {isAnimating && progress < 0.99
                    ? "Replaying Disassembly…"
                    : "Replay 3D Disassembly"}
                </button>

                <button
                  type="button"
                  onClick={handleToggleExploded}
                  className={`rounded-full border border-white/[0.15] bg-carbon/90 px-5 py-3 text-[13.5px] font-medium text-white/90 transition-all duration-200 hover:border-boatRed/55 hover:bg-white/[0.04] hover:text-white ${FOCUS_RING}`}
                >
                  {progress >= 0.92 ? "Show Assembled" : "Show Exploded"}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
