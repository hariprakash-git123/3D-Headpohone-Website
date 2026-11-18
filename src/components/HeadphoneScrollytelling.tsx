"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { ArrowDown, ArrowRight, ChevronRight } from "lucide-react";
import type { NavSectionId } from "@/components/Navbar";
import type { RockerzColorwayId } from "@/lib/rockerz440Config";
import { sequenceStore } from "@/lib/sequenceStore";
import { mapScrollProgressToFrame } from "@/lib/frameMapping";
import {
  chapterIndexForProgress,
  scrollToStageProgress,
  STORY_CHAPTERS,
} from "@/lib/chapters";
import {
  createSequenceRenderer,
  SequenceRendererHandle,
} from "@/lib/sequenceRenderer";

const FOCUS_RING =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-boatRed focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian";

/** Stage progress after which the final CTA buttons become interactive */
const CTA_INTERACTIVE_FROM = 0.87;

interface HeadphoneScrollytellingProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  colorway: RockerzColorwayId;
  onActiveBeatChange?: (section: NavSectionId) => void;
  onJumpToSpecs: () => void;
  onJumpToExplore: () => void;
}


export default function HeadphoneScrollytelling({
  containerRef,
  colorway,
  onActiveBeatChange,
  onJumpToSpecs,
  onJumpToExplore,
}: HeadphoneScrollytellingProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<SequenceRendererHandle | null>(null);
  const currentFrameRef = useRef<number>(1);

  const reducedMotion = Boolean(useReducedMotion());
  const [heroReady, setHeroReady] = useState(false);
  const [loadPercent, setLoadPercent] = useState(0);
  const [activeChapterIdx, setActiveChapterIdx] = useState(0);
  const [ctaInteractive, setCtaInteractive] = useState(false);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Directly connected scroll momentum — smooth without lagging behind fast scroll
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: reducedMotion ? 1000 : 280,
    damping: reducedMotion ? 100 : 34,
    mass: 0.16,
    restDelta: 0.0003,
  });

  // Initialize shared preloader + GPU material-recolouring sequence renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    sequenceStore.startPreloading();
    const renderer = createSequenceRenderer(canvas, colorway, {
      mobileVerticalShift: true,
      fitScale: 0.98,
    });
    rendererRef.current = renderer;

    let lastReportedPct = -1;
    const syncLoadState = () => {
      if (sequenceStore.canDrawHero()) setHeroReady(true);
      const pct = sequenceStore.getLoadPercent();
      // Throttle re-renders to every 5%, but always report completion.
      if (pct === 100 || pct - lastReportedPct >= 5) {
        lastReportedPct = pct;
        setLoadPercent(pct);
      }
    };
    syncLoadState();
    if (sequenceStore.canDrawHero()) {
      renderer.setFrame(currentFrameRef.current, true);
    }

    const unsubscribe = sequenceStore.subscribe((_pct, settledIdx, ok) => {
      syncLoadState();
      if (
        ok &&
        (settledIdx === 0 ||
          Math.abs(settledIdx + 1 - currentFrameRef.current) <= 2)
      ) {
        renderer.setFrame(currentFrameRef.current, true);
      }
    });

    const handleResize = () => renderer.resize();
    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      unsubscribe();
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      rendererRef.current = null;
    };
    // Initial mount only; live colourway updates handled smoothly below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Synchronize live colourway selection to the hero scroll disassembly seamlessly
  useEffect(() => {
    rendererRef.current?.setColorway(colorway, reducedMotion);
  }, [colorway, reducedMotion]);

  useMotionValueEvent(smoothProgress, "change", (latest) => {
    const frameFloat = mapScrollProgressToFrame(latest);
    currentFrameRef.current = frameFloat;
    rendererRef.current?.setFrame(frameFloat);

    const nextIdx = chapterIndexForProgress(latest);
    setActiveChapterIdx(nextIdx);
    setCtaInteractive(latest >= CTA_INTERACTIVE_FROM);
    onActiveBeatChange?.(STORY_CHAPTERS[nextIdx].id);
  });

  const jumpToProgress = (progress: number) => {
    if (containerRef.current) {
      scrollToStageProgress(containerRef.current, progress, !reducedMotion);
    }
  };

  // --- Synchronized Storytelling Beats ---

  const canvasScale = useTransform(
    smoothProgress,
    [0, 0.2, 0.7, 0.82, 1],
    reducedMotion ? [1, 1, 1, 1, 1] : [1, 1.015, 1.0, 1.03, 1]
  );

  const auraOpacity = useTransform(
    smoothProgress,
    [0, 0.2, 0.55, 0.78, 0.94, 1],
    [0.45, 0.35, 0.68, 0.78, 0.42, 0.5]
  );

  const heroOpacity = useTransform(smoothProgress, [0, 0.13, 0.2], [1, 1, 0]);
  const heroY = useTransform(smoothProgress, [0, 0.2], [0, reducedMotion ? 0 : -28]);
  const scrollCueOpacity = useTransform(smoothProgress, [0, 0.06], [1, 0]);

  const designOpacity = useTransform(
    smoothProgress,
    [0.19, 0.25, 0.35, 0.41],
    [0, 1, 1, 0]
  );
  const designX = useTransform(
    smoothProgress,
    [0.19, 0.26, 0.35, 0.41],
    reducedMotion ? [0, 0, 0, 0] : [-36, 0, 0, -20]
  );

  const engOpacity = useTransform(
    smoothProgress,
    [0.4, 0.46, 0.64, 0.7],
    [0, 1, 1, 0]
  );
  const engX = useTransform(
    smoothProgress,
    [0.4, 0.47, 0.64, 0.7],
    reducedMotion ? [0, 0, 0, 0] : [36, 0, 0, 20]
  );

  const soundOpacity = useTransform(
    smoothProgress,
    [0.69, 0.74, 0.81, 0.86],
    [0, 1, 1, 0]
  );
  const soundY = useTransform(
    smoothProgress,
    [0.69, 0.75, 0.81, 0.86],
    reducedMotion ? [0, 0, 0, 0] : [26, 0, 0, -18]
  );

  const ctaOpacity = useTransform(smoothProgress, [0.85, 0.92, 1], [0, 1, 1]);
  const ctaY = useTransform(
    smoothProgress,
    [0.85, 0.93],
    reducedMotion ? [0, 0] : [26, 0]
  );

  return (
    <section
      ref={containerRef}
      id="overview"
      aria-label="boAt Rockerz 440 Interactive Scroll Disassembly"
      className="relative h-[460vh] w-full bg-obsidian"
    >
      {/* Sticky Full-Screen Cinematic Stage */}
      <div className="sticky top-0 h-svh w-full overflow-hidden bg-obsidian">
        {/* Restrained Studio Ambient Glow Behind Original Product */}
        <motion.div
          style={{ opacity: auraOpacity }}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
        >
          <div
            className="absolute left-1/2 top-1/2 h-[48vh] w-[48vw] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[130px]"
            style={{
              background:
                "radial-gradient(circle, rgba(255, 59, 48, 0.1) 0%, rgba(255, 255, 255, 0.02) 48%, transparent 74%)",
            }}
          />
        </motion.div>

        {/* Original boAt Rockerz 440 WebGL/Canvas Sequence Renderer */}
        <motion.canvas
          ref={canvasRef}
          role="img"
          aria-label="boAt Rockerz 440 headphones, animating from assembled to an exploded view of their internal parts as you scroll"
          style={{ scale: canvasScale }}
          className={`absolute inset-0 h-full w-full will-change-transform transition-opacity duration-500 ${
            heroReady ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* GPU-composited seamless perimeter edge vignette into #050505 */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[5]"
          style={{
            boxShadow: "inset 0 0 100px 32px #050505",
          }}
        />

        {/* Minimal Architectural Phase Header (Desktop) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 top-[72px] z-10 hidden justify-between text-[10.5px] font-medium tracking-[0.22em] text-white/55 uppercase lg:flex"
        >
          <span>BOAT ROCKERZ 440 // INTERACTIVE DISASSEMBLY</span>
          <span className="tabular-nums">
            0{activeChapterIdx + 1} / 0{STORY_CHAPTERS.length} —{" "}
            {STORY_CHAPTERS[activeChapterIdx].phase}
          </span>
        </div>

        {/* PHASE 1: HERO – MEET ROCKERZ 440 (0–20%) */}
        <motion.div
          style={{ opacity: heroOpacity, y: heroY }}
          className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-between px-6 pt-[10.5vh] pb-[5.5vh] text-center"
        >
          <div className="max-w-3xl">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.26em] text-boatRed uppercase"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-boatRed shadow-[0_0_10px_#FF3B30]" />
              boAt Rockerz 440
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className="text-gradient-hero text-[clamp(2.45rem,6.4vw,5.25rem)] font-bold leading-[1.02] tracking-[-0.04em] drop-shadow-[0_14px_36px_rgba(0,0,0,0.75)]"
            >
              Sound. Without Limits.
            </motion.h1>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-5"
          >
            <p className="max-w-xl text-[15px] sm:text-[17px] leading-relaxed text-mutedZinc">
              Meet boAt Rockerz 440. A closer look at the design behind your
              listening experience.
            </p>

            <motion.div
              style={{ opacity: scrollCueOpacity }}
              className="flex flex-col items-center gap-2 text-[11px] font-medium tracking-[0.22em] text-white/60 uppercase"
            >
              <span>Scroll to explore</span>
              <motion.div
                animate={reducedMotion ? undefined : { y: [0, 5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <ArrowDown className="h-3.5 w-3.5 text-boatRed" />
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* PHASE 2: DESIGN – EVERY DETAIL MATTERS (20–40%) */}
        <motion.div
          style={{ opacity: designOpacity }}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[8] h-[48vh] bg-gradient-to-t from-obsidian/95 via-obsidian/70 to-transparent md:inset-y-0 md:left-0 md:right-auto md:h-auto md:w-[54vw] md:max-w-[600px] md:bg-gradient-to-r md:from-obsidian/92 md:via-obsidian/55 md:to-transparent"
        />
        <motion.div
          style={{ opacity: designOpacity, x: designX }}
          className="pointer-events-none absolute inset-0 z-10 flex items-end px-6 pb-[7vh] sm:px-12 md:items-center md:pb-0 lg:px-20"
        >
          <div className="max-w-[430px]">
            <p className="mb-3 text-[11px] font-semibold tracking-[0.24em] text-boatRed uppercase">
              Design &nbsp;·&nbsp; Every Detail Matters
            </p>
            <h2 className="text-gradient-editorial text-[clamp(2rem,4vw,3.35rem)] font-bold leading-[1.06] tracking-[-0.035em]">
              Designed to stand out.
            </h2>
            <p className="mt-4 text-[15.5px] sm:text-[17px] leading-[1.65] text-mutedZinc">
              Soft foam-padded ear cushions, contoured rounded-oval ear cups,
              and a lightweight padded headband with foldable hinges come
              together for effortless all-day wear.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {["Plush Foam Cushions", "Foldable Hinges", "On-Ear Controls"].map(
                (item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/[0.1] bg-carbon/80 px-3.5 py-1 text-[11.5px] font-medium text-white/80 backdrop-blur-md"
                  >
                    {item}
                  </span>
                )
              )}
            </div>
          </div>
        </motion.div>

        {/* PHASE 3: ENGINEERING – INSIDE THE EXPERIENCE (40–70%) */}
        <motion.div
          style={{ opacity: engOpacity }}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[8] h-[48vh] bg-gradient-to-t from-obsidian/95 via-obsidian/70 to-transparent md:inset-y-0 md:left-auto md:right-0 md:h-auto md:w-[54vw] md:max-w-[600px] md:bg-gradient-to-l md:from-obsidian/92 md:via-obsidian/55 md:to-transparent"
        />
        <motion.div
          style={{ opacity: engOpacity, x: engX }}
          className="pointer-events-none absolute inset-0 z-10 flex items-end justify-start px-6 pb-[7vh] sm:px-12 md:items-center md:justify-end md:pb-0 lg:px-20 xl:pr-36"
        >
          <div className="max-w-[430px] text-left">
            <p className="mb-3 text-[11px] font-semibold tracking-[0.24em] text-boatRed uppercase">
              Engineering &nbsp;·&nbsp; Inside the Experience
            </p>
            <h2 className="text-gradient-editorial text-[clamp(2rem,4vw,3.35rem)] font-bold leading-[1.06] tracking-[-0.035em]">
              Built from the inside out.
            </h2>
            <p className="mt-4 text-[15.5px] sm:text-[17px] leading-[1.65] text-mutedZinc">
              Every layer aligns with purpose—from the reinforced adjustable
              headband core and precision-mounted 40mm dynamic drivers to the
              integrated control board and rechargeable battery pack.
            </p>

            <ul className="mt-6 space-y-2.5 text-[14px] text-white/75">
              {[
                "40mm dynamic driver assembly with copper voice coil",
                "Reinforced adjustable headband with metallic accent hardware",
                "Integrated ear-cup control board & rechargeable power cell",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-boatRed" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        {/* PHASE 4: SOUND – MADE FOR YOUR MOMENTS (70–85%) */}
        <motion.div
          style={{ opacity: soundOpacity }}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[8] h-[44vh] bg-gradient-to-t from-obsidian/95 via-obsidian/70 to-transparent"
        />
        <motion.div
          style={{ opacity: soundOpacity, y: soundY }}
          className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-end px-6 pb-[6.5vh] sm:px-12 lg:px-20"
        >
          <div className="mx-auto flex w-full max-w-[1220px] flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-[520px]">
              <p className="mb-2.5 text-[11px] font-semibold tracking-[0.24em] text-boatRed uppercase">
                Sound &nbsp;·&nbsp; Made for Your Moments
              </p>
              <h2 className="text-gradient-editorial text-[clamp(2rem,4vw,3.35rem)] font-bold leading-[1.06] tracking-[-0.035em]">
                Your world. Your sound.
              </h2>
              <p className="mt-3.5 text-[15.5px] sm:text-[17px] leading-[1.6] text-mutedZinc">
                Tuned for boAt Signature Sound through 40mm dynamic drivers,
                with wireless Bluetooth connectivity, 3.5mm AUX dual-mode
                flexibility, and built-in call controls.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 lg:justify-end">
              {[
                { label: "Drivers", value: "40mm Dynamic" },
                { label: "Modes", value: "Bluetooth + AUX" },
                { label: "Controls", value: "Built-In Mic & MFB" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white/[0.08] bg-carbon/85 px-4 py-3 backdrop-blur-md"
                >
                  <p className="text-[10.5px] font-medium tracking-[0.16em] text-mutedZinc uppercase">
                    {stat.label}
                  </p>
                  <p className="mt-0.5 text-[14px] font-semibold tracking-[-0.01em] text-white">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* PHASE 5: FINAL CTA – BACK TOGETHER (85–100%) */}
        <motion.div
          style={{ opacity: ctaOpacity }}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[8]"
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 68% 54% at 50% 48%, rgba(5, 5, 5, 0.32) 0%, rgba(5, 5, 5, 0.72) 72%, rgba(5, 5, 5, 0.92) 100%)",
            }}
          />
        </motion.div>
        <motion.div
          style={{ opacity: ctaOpacity, y: ctaY }}
          aria-hidden={!ctaInteractive}
          className={`absolute inset-0 z-20 flex flex-col items-center justify-between px-6 pt-[11vh] pb-[6.5vh] text-center ${
            ctaInteractive ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          <div className="max-w-3xl">
            <p className="mb-3 text-[11px] font-semibold tracking-[0.26em] text-boatRed uppercase">
              Back Together
            </p>
            <h2 className="text-gradient-hero text-[clamp(2.2rem,5.2vw,4.3rem)] font-bold leading-[1.04] tracking-[-0.04em] drop-shadow-[0_14px_40px_rgba(0,0,0,0.8)]">
              Ready to experience Rockerz 440?
            </h2>
          </div>

          {/* inert keeps the hidden buttons out of the Tab order until they fade in */}
          <div className="flex flex-col items-center gap-4" inert={!ctaInteractive}>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={onJumpToExplore}
                className={`btn-boat-cta group inline-flex items-center gap-2.5 rounded-full px-7 py-3.5 text-[14.5px] font-semibold tracking-[-0.01em] text-white ${FOCUS_RING}`}
              >
                <span>Explore Rockerz 440</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </button>

              <button
                type="button"
                onClick={onJumpToSpecs}
                className={`group inline-flex items-center gap-1.5 rounded-full border border-white/[0.14] bg-carbon/80 px-6 py-3.5 text-[14px] font-medium text-white/90 backdrop-blur-md transition-all duration-300 hover:border-boatRed/55 hover:text-white ${FOCUS_RING}`}
              >
                <span>View Specifications</span>
                <ChevronRight className="h-4 w-4 text-boatRed transition-transform duration-300 group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Minimal Right-Edge Chapter Scrubber Rail (Desktop) */}
        <nav
          aria-label="Story chapters"
          className="absolute right-6 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-end gap-3.5 xl:flex"
        >
          {STORY_CHAPTERS.map((ch, idx) => {
            const active = activeChapterIdx === idx;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => jumpToProgress(ch.jumpTo)}
                className={`group flex items-center gap-2.5 rounded-sm py-0.5 ${FOCUS_RING}`}
                aria-label={`Jump to ${ch.label}`}
                aria-current={active ? "step" : undefined}
              >
                <span
                  className={`text-[10px] font-medium tracking-[0.16em] uppercase transition-all duration-300 ${
                    active
                      ? "translate-x-0 text-white opacity-90"
                      : "translate-x-1 text-mutedZinc opacity-0 group-hover:translate-x-0 group-hover:opacity-85 group-focus-visible:translate-x-0 group-focus-visible:opacity-85"
                  }`}
                >
                  {ch.label}
                </span>
                <span
                  className={`block rounded-full transition-all duration-300 ${
                    active
                      ? "h-5 w-[3px] bg-boatRed shadow-[0_0_12px_rgba(255,59,48,0.85)]"
                      : "h-2.5 w-[2px] bg-white/20 group-hover:bg-white/55"
                  }`}
                />
              </button>
            );
          })}
        </nav>

        {/* Unobtrusive sequence buffer indicator */}
        {loadPercent < 100 && (
          <div
            role="status"
            className="pointer-events-none absolute bottom-5 left-6 z-30 flex items-center gap-2 rounded-full border border-white/[0.08] bg-carbon/80 px-3 py-1.5 text-[10.5px] tracking-[0.14em] text-mutedZinc uppercase backdrop-blur-md">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-boatRed" />
            <span className="tabular-nums">Loading frames {loadPercent}%</span>
          </div>
        )}
      </div>
    </section>
  );
}
