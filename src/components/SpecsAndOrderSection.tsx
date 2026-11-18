"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  BatteryCharging,
  Bluetooth,
  Cable,
  Headphones,
  Layers,
  Mic,
  SlidersHorizontal,
} from "lucide-react";
import {
  getColorwayById,
  ROCKERZ_COLORWAYS,
  RockerzColorwayId,
} from "@/lib/rockerz440Config";
import { sequenceStore, TOTAL_SEQUENCE_FRAMES } from "@/lib/sequenceStore";
import {
  createSequenceRenderer,
  SequenceRendererHandle,
} from "@/lib/sequenceRenderer";

interface SpecsAndOrderSectionProps {
  selectedColorway: RockerzColorwayId;
  onSelectColorway: (id: RockerzColorwayId) => void;
}

const VERIFIED_SPECS = [
  {
    icon: Headphones,
    category: "Audio Drivers",
    headline: "40mm Dynamic Drivers",
    detail:
      "Engineered to deliver boAt Signature Sound with punchy low-end response and clear everyday detail across genres.",
    tag: "boAt Signature Sound",
  },
  {
    icon: Bluetooth,
    category: "Wireless Freedom",
    headline: "Bluetooth Connectivity",
    detail:
      "Reliable wireless pairing with up to 10-meter operating range for seamless music streaming and calls.",
    tag: "10m Wireless Range",
  },
  {
    icon: Cable,
    category: "Dual-Mode Playback",
    headline: "Wireless + 3.5mm AUX",
    detail:
      "Switch smoothly between wireless Bluetooth listening and wired 3.5mm AUX input whenever you want uninterrupted playback.",
    tag: "Dual Mode",
  },
  {
    icon: SlidersHorizontal,
    category: "On-Ear Controls",
    headline: "Tactile Ear-Cup Buttons",
    detail:
      "Easy-access physical Multi-Function, Volume Up, and Volume Down buttons let you control playback, calls, and voice assistant effortlessly.",
    tag: "Integrated MFB",
  },
  {
    icon: Mic,
    category: "Communication",
    headline: "Built-In Microphone",
    detail:
      "Integrated earcup microphone supports clear hands-free calling and instant voice assistant access on the move.",
    tag: "Hands-Free Calls",
  },
  {
    icon: BatteryCharging,
    category: "Ergonomics & Build",
    headline: "Lightweight Foldable Fit",
    detail:
      "On-ear silhouette wrapped in soft foam ear cushions and padded adjustable headband with compact foldable hinges for daily portability.",
    tag: "Rechargeable + Foldable",
  },
];

/**
 * Smooth velocity-remapped slider [0..1] -> original sequence frame [1..235].
 * Stretches the mid-sequence separation frames (102 -> 172) for buttery, non-burst scrubbing.
 */
function mapSliderToFrame(t: number): number {
  const p = Math.max(0, Math.min(1, t));
  if (p <= 0.25) {
    return 1 + (p / 0.25) * 44; // 1 -> 45
  }
  if (p <= 0.5) {
    return 45 + ((p - 0.25) / 0.25) * 57; // 45 -> 102
  }
  if (p <= 0.85) {
    return 102 + ((p - 0.5) / 0.35) * 70; // 102 -> 172 (stretched smooth separation)
  }
  return 172 + ((p - 0.85) / 0.15) * (TOTAL_SEQUENCE_FRAMES - 172); // 172 -> 235
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function SpecsAndOrderSection({
  selectedColorway,
  onSelectColorway,
}: SpecsAndOrderSectionProps) {
  const reducedMotion = Boolean(useReducedMotion());
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<SequenceRendererHandle | null>(null);
  const animRafRef = useRef<number | null>(null);
  const progressRef = useRef<number>(0);

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

  /**
   * Smoothly animates the disassembly slider from current (or explicit) start to target.
   */
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
        const elapsed = now - startTime;
        const rawT = Math.min(1, elapsed / durationMs);
        const eased = easeInOutCubic(rawT);
        const value = from + (to - from) * eased;

        progressRef.current = value;
        setProgress(value);
        rendererRef.current?.setFrame(mapSliderToFrame(value));

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

  // Mount shared GPU sequence renderer on the Explore preview canvas
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

    const unsubscribe = sequenceStore.subscribe((_pct, loadedIdx) => {
      const activeFrameIdx = Math.round(mapSliderToFrame(progressRef.current)) - 1;
      if (loadedIdx === 0 || Math.abs(loadedIdx - activeFrameIdx) <= 2) {
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
    // Initial setup only; colourway updates happen smoothly below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Smoothly update product material colour while preserving exact animation progress
  useEffect(() => {
    rendererRef.current?.setColorway(selectedColorway, reducedMotion);
  }, [selectedColorway, reducedMotion]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    stopAnimation();
    applyProgress(parseFloat(e.target.value));
  };

  // Replay 3D Disassembly: restarts cleanly from 0 (Assembled) -> 1 (Exploded View)
  const handleReplayDisassembly = () => {
    applyProgress(0, true);
    animateTo(0, 1, 3200);
  };

  // Show Exploded (or Reassemble if already at exploded view)
  const handleToggleExploded = () => {
    if (progressRef.current >= 0.92) {
      animateTo(progressRef.current, 0, 1250);
    } else {
      animateTo(progressRef.current, 1, 1350);
    }
  };

  const statusLabel =
    progress < 0.08
      ? "ASSEMBLED"
      : progress >= 0.92
      ? "EXPLODED VIEW"
      : "DISASSEMBLING";

  const sliderPercent = Math.round(progress * 100);

  return (
    <div className="relative z-20 bg-[#050505]">
      {/* Subtle hairline divider */}
      <div className="mx-auto max-w-[1280px] px-6 sm:px-10">
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/[0.1] to-transparent" />
      </div>

      {/* ============================================================
          SPECIFICATIONS SECTION (#specifications)
      ============================================================ */}
      <section
        id="specifications"
        className="relative overflow-hidden bg-[#0A0A0C] py-24 sm:py-32"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-28 left-1/2 h-[380px] w-[720px] -translate-x-1/2 rounded-full blur-[150px]"
          style={{
            background:
              "radial-gradient(circle, rgba(255, 59, 48, 0.1) 0%, rgba(255, 255, 255, 0.02) 55%, transparent 76%)",
          }}
        />

        <div className="relative mx-auto max-w-[1240px] px-6 sm:px-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-2xl"
          >
            <p className="mb-3 text-[11px] font-semibold tracking-[0.24em] text-[#FF3B30] uppercase">
              Specifications
            </p>
            <h2 className="text-gradient-editorial text-[clamp(2rem,4vw,3.3rem)] font-bold leading-[1.06] tracking-[-0.035em]">
              Engineered for everyday rhythm.
            </h2>
            <p className="mt-4 text-[16px] sm:text-[17.5px] leading-[1.6] text-[#A1A1AA]">
              Every essential element of boAt Rockerz 440—balanced for comfort,
              portability, and dependable daily listening.
            </p>
          </motion.div>

          <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {VERIFIED_SPECS.map((spec, idx) => {
              const Icon = spec.icon;
              return (
                <motion.div
                  key={spec.category}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{
                    duration: 0.6,
                    delay: idx * 0.05,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="group relative flex flex-col justify-between rounded-2xl border border-white/[0.07] bg-[#050505]/80 p-7 transition-all duration-300 hover:border-[#FF3B30]/30 hover:bg-[#08080B]"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/85 transition-colors duration-300 group-hover:border-[#FF3B30]/40 group-hover:text-[#FF3B30]">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-[10.5px] font-medium tracking-[0.14em] text-[#A1A1AA] uppercase">
                        {spec.tag}
                      </span>
                    </div>

                    <p className="mt-6 text-[11px] font-semibold tracking-[0.18em] text-[#A1A1AA] uppercase">
                      {spec.category}
                    </p>
                    <h3 className="mt-1.5 text-[19.5px] font-semibold tracking-[-0.025em] text-white">
                      {spec.headline}
                    </h3>
                    <p className="mt-3 text-[14.5px] leading-[1.65] text-[#A1A1AA]">
                      {spec.detail}
                    </p>
                  </div>

                  <div className="mt-6 h-[1px] w-full bg-gradient-to-r from-transparent via-white/[0.06] to-transparent transition-all duration-500 group-hover:via-[#FF3B30]/45" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================
          INTERACTIVE BOAT ROCKERZ 440 PRODUCT SHOWCASE (#explore)
      ============================================================ */}
      <section
        id="explore"
        className="relative overflow-hidden bg-[#050505] py-24 sm:py-32"
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
            {/* Subtle Ambient Red / Finish Glow on Right Side */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full blur-[130px] transition-colors duration-700"
              style={{ background: activeColor.glow }}
            />

            <div className="relative grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
              {/* LEFT COLUMN — Original boAt Rockerz 440 Preview Container */}
              <div className="lg:col-span-6">
                <div className="relative flex aspect-[4/3] w-full flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-[#050505]">
                  {/* Floating Original boAt Rockerz 440 Canvas */}
                  <canvas
                    ref={previewCanvasRef}
                    aria-label={`Interactive boAt Rockerz 440 preview in ${activeColor.name}`}
                    className="absolute inset-0 h-full w-full"
                  />

                  {/* Subtle perimeter vignette so product floats seamlessly */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                    style={{
                      boxShadow: "inset 0 0 60px 14px #050505",
                    }}
                  />

                  {/* Top-Left Status Badge */}
                  <div className="relative z-10 p-4">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-[#0A0A0C]/85 px-3.5 py-1.5 text-[10.5px] font-semibold tracking-[0.16em] text-white/85 uppercase backdrop-blur-md">
                      <Layers className="h-3.5 w-3.5 text-[#FF3B30]" />
                      <span>{statusLabel}</span>
                    </span>
                  </div>

                  {/* Bottom Animation Progress Slider Bar */}
                  <div className="relative z-10 p-3.5 sm:p-4">
                    <div className="rounded-xl border border-white/[0.08] bg-[#0A0A0C]/90 px-4 py-3 backdrop-blur-md">
                      <div className="flex items-center justify-between text-[10px] font-semibold tracking-[0.15em] text-[#A1A1AA] uppercase">
                        <span
                          className={
                            progress < 0.15 ? "text-white" : "text-[#A1A1AA]"
                          }
                        >
                          Assembled
                        </span>
                        <span
                          className={
                            progress > 0.85 ? "text-white" : "text-[#A1A1AA]"
                          }
                        >
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
                        aria-label="boAt Rockerz 440 disassembly progress"
                        className="boat-range-slider mt-2.5 w-full cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #FF3B30 0%, #FF3B30 ${sliderPercent}%, rgba(255,255,255,0.16) ${sliderPercent}%, rgba(255,255,255,0.16) 100%)`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN — Product Information & Colour Customization */}
              <div className="lg:col-span-6">
                <p className="text-[11px] font-semibold tracking-[0.24em] text-[#FF3B30] uppercase">
                  boAt Rockerz 440
                </p>

                <h2 className="mt-2.5 text-gradient-hero text-[clamp(2rem,3.8vw,3.1rem)] font-bold leading-[1.05] tracking-[-0.035em]">
                  Explore Rockerz 440
                </h2>

                <p className="mt-3.5 text-[15.5px] leading-[1.65] text-[#A1A1AA]">
                  Switch finishes to preview boAt Rockerz 440 in real time—both
                  here and across the full scroll-driven 3D disassembly
                  experience above.
                </p>

                {/* Interactive Colour Selection */}
                <div className="mt-7">
                  <p className="text-[11px] font-semibold tracking-[0.18em] text-[#A1A1AA] uppercase">
                    Colorway &nbsp;—&nbsp;{" "}
                    <span className="text-white">{activeColor.name}</span>
                  </p>

                  <div
                    role="radiogroup"
                    aria-label="Select boAt Rockerz 440 finish"
                    className="mt-3.5 flex items-center gap-3.5"
                  >
                    {ROCKERZ_COLORWAYS.map((item) => {
                      const active = item.id === activeColor.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          aria-label={item.name}
                          title={item.name}
                          onClick={() => onSelectColorway(item.id)}
                          className="relative flex h-10 w-10 items-center justify-center rounded-full transition-transform duration-250 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF3B30]"
                          style={{
                            boxShadow: active
                              ? "0 0 0 2px #070709, 0 0 0 3.5px #FF3B30"
                              : "0 0 0 1px rgba(255,255,255,0.22)",
                          }}
                        >
                          <span
                            className="h-7 w-7 rounded-full border border-white/15 transition-transform duration-200"
                            style={{ backgroundColor: item.swatch }}
                          />
                        </button>
                      );
                    })}
                  </div>

                  <p className="mt-3.5 text-[13.5px] text-[#A1A1AA]">
                    {activeColor.description}
                  </p>
                </div>

                {/* Hairline Divider & Primary / Secondary CTAs */}
                <div className="mt-8 flex flex-wrap items-center gap-3.5 border-t border-white/[0.08] pt-7">
                  <button
                    type="button"
                    onClick={handleReplayDisassembly}
                    className="btn-boat-cta rounded-full px-6 py-3 text-[14px] font-semibold tracking-[-0.01em] text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF3B30]/70"
                  >
                    {isAnimating && progress < 0.99
                      ? "Replaying Disassembly…"
                      : "Replay 3D Disassembly"}
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleExploded}
                    className="rounded-full border border-white/[0.15] bg-[#0A0A0C]/90 px-5 py-3 text-[13.5px] font-medium text-white/90 transition-all duration-250 hover:border-[#FF3B30]/55 hover:bg-white/[0.04] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  >
                    {progress >= 0.92 ? "Show Assembled" : "Show Exploded"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================
          MINIMALIST BOAT CORPORATE FOOTER
      ============================================================ */}
      <footer className="border-t border-white/[0.06] bg-[#050505] py-12">
        <div className="mx-auto flex max-w-[1240px] flex-col items-center justify-between gap-4 px-6 text-[12px] text-[#A1A1AA] sm:flex-row sm:px-10">
          <div className="flex items-center gap-3">
            <span className="text-[14px] font-bold tracking-[-0.03em] text-white">
              bo<span className="text-[#FF3B30]">A</span>t
            </span>
            <span className="h-3 w-[1px] bg-white/15" />
            <span>Rockerz 440 Wireless Headphones</span>
          </div>
          <p className="text-white/40">
            &copy; {new Date().getFullYear()} boAt. Interactive Product
            Showcase.
          </p>
        </div>
      </footer>
    </div>
  );
}
