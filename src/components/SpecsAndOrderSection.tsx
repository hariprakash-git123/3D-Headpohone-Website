"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  BatteryCharging,
  Bluetooth,
  Cable,
  Feather,
  Headphones,
  SlidersHorizontal,
} from "lucide-react";
import type { RockerzColorwayId } from "@/lib/rockerz440Config";
import ExploreShowcase from "@/components/ExploreShowcase";

interface SpecsAndOrderSectionProps {
  selectedColorway: RockerzColorwayId;
  onSelectColorway: (id: RockerzColorwayId) => void;
}

/**
 * Playback time, 40mm drivers and passive noise cancellation are from boAt's official product
 * page. Bluetooth version, charge time and weight are left out because published sources disagree.
 */
const SPECS = [
  {
    icon: Headphones,
    category: "Audio Drivers",
    headline: "40mm Dynamic Drivers",
    detail:
      "Engineered to deliver boAt Signature Sound with punchy low-end response and clear everyday detail across genres.",
    tag: "boAt Signature Sound",
  },
  {
    icon: BatteryCharging,
    category: "Battery",
    headline: "Up to 8 Hours Playback",
    detail:
      "A rechargeable built-in battery keeps the music going through a full day of commuting, work, and workouts.",
    tag: "8H Playback",
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
    category: "Controls & Calling",
    headline: "On-Ear Controls & Built-In Mic",
    detail:
      "Physical Multi-Function and volume buttons handle playback, calls, and voice assistant, while the integrated mic keeps hands-free calls clear.",
    tag: "Integrated MFB",
  },
  {
    icon: Feather,
    category: "Ergonomics & Build",
    headline: "Lightweight Foldable Fit",
    detail:
      "Soft foam ear cushions with passive noise cancellation, a padded adjustable headband, and compact foldable hinges for daily portability.",
    tag: "Passive Noise Cancellation",
  },
];

export default function SpecsAndOrderSection({
  selectedColorway,
  onSelectColorway,
}: SpecsAndOrderSectionProps) {
  return (
    <div className="relative z-20 bg-obsidian">
      {/* Hairline divider */}
      <div className="mx-auto max-w-[1280px] px-6 sm:px-10">
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/[0.1] to-transparent" />
      </div>

      {/* SPECIFICATIONS (#specifications) */}
      <section
        id="specifications"
        aria-labelledby="specifications-heading"
        className="relative overflow-hidden bg-carbon py-24 sm:py-32"
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
            <p className="mb-3 text-[11px] font-semibold tracking-[0.24em] text-boatRed uppercase">
              Specifications
            </p>
            <h2
              id="specifications-heading"
              className="text-gradient-editorial text-[clamp(2rem,4vw,3.3rem)] font-bold leading-[1.06] tracking-[-0.035em]"
            >
              Engineered for everyday rhythm.
            </h2>
            <p className="mt-4 text-[16px] sm:text-[17.5px] leading-[1.6] text-mutedZinc">
              Every essential element of boAt Rockerz 440—balanced for comfort,
              portability, and dependable daily listening.
            </p>
          </motion.div>

          <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {SPECS.map((spec, idx) => {
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
                  className="group relative flex flex-col justify-between rounded-2xl border border-white/[0.07] bg-obsidian/80 p-7 transition-all duration-300 hover:border-boatRed/30 hover:bg-[#08080B]"
                >
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/85 transition-colors duration-300 group-hover:border-boatRed/40 group-hover:text-boatRed">
                        <Icon aria-hidden="true" className="h-4 w-4" />
                      </span>
                      <span className="text-right text-[10.5px] font-medium tracking-[0.14em] text-mutedZinc uppercase">
                        {spec.tag}
                      </span>
                    </div>

                    <p className="mt-6 text-[11px] font-semibold tracking-[0.18em] text-mutedZinc uppercase">
                      {spec.category}
                    </p>
                    <h3 className="mt-1.5 text-[19.5px] font-semibold tracking-[-0.025em] text-white">
                      {spec.headline}
                    </h3>
                    <p className="mt-3 text-[14.5px] leading-[1.65] text-mutedZinc">
                      {spec.detail}
                    </p>
                  </div>

                  <div className="mt-6 h-[1px] w-full bg-gradient-to-r from-transparent via-white/[0.06] to-transparent transition-all duration-500 group-hover:via-boatRed/45" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <ExploreShowcase
        selectedColorway={selectedColorway}
        onSelectColorway={onSelectColorway}
      />

      {/* FOOTER */}
      <footer className="border-t border-white/[0.06] bg-obsidian py-12">
        <div className="mx-auto flex max-w-[1240px] flex-col items-center justify-between gap-4 px-6 text-center text-[12px] text-mutedZinc sm:flex-row sm:px-10 sm:text-left">
          <div className="flex items-center gap-3">
            <span className="text-[14px] font-bold tracking-[-0.03em] text-white">
              bo<span className="text-boatRed">A</span>t
            </span>
            <span aria-hidden="true" className="h-3 w-[1px] bg-white/15" />
            <span>Rockerz 440 Wireless Headphones</span>
          </div>
          <p className="max-w-[560px] text-white/60 sm:text-right">
            Unofficial interactive concept showcase. Not affiliated with,
            endorsed by, or sponsored by boAt. boAt and Rockerz are trademarks
            of their respective owner. Product imagery is illustrative.
          </p>
        </div>
      </footer>
    </div>
  );
}
