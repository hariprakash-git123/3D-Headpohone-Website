import { clamp01, easeInOutCubic, smoothstep } from "@/lib/easing";
import { TOTAL_SEQUENCE_FRAMES } from "@/lib/sequenceStore";

/**
 * Deterministic, velocity-remapped scroll-to-frame curve across the 235-frame sequence.
 * Stretches the disassembly frames (102 -> 172) for gradual separation, then reverses
 * back to the assembled hero shot over the final 15% of the scroll stage.
 */
export function mapScrollProgressToFrame(progress: number): number {
  const p = clamp01(progress);

  // Phase 1 (0% -> 20%): assembled, gentle lift from the hero pose
  if (p <= 0.2) {
    return 1 + smoothstep(p / 0.2) * 44; // frames 1 -> 45
  }

  // Phase 2 (20% -> 40%): initial separation
  if (p <= 0.4) {
    return 45 + ((p - 0.2) / 0.2) * 57; // frames 45 -> 102
  }

  // Phase 3 (40% -> 70%): full disassembly, slowed down across 30% of the scroll
  if (p <= 0.7) {
    return 102 + ((p - 0.4) / 0.3) * 70; // frames 102 -> 172
  }

  // Phase 4 (70% -> 85%): settles into the exploded diagram
  if (p <= 0.85) {
    const t = smoothstep((p - 0.7) / 0.15);
    return 172 + t * (TOTAL_SEQUENCE_FRAMES - 172); // frames 172 -> 235
  }

  // Phase 5 (85% -> 100%): reassembly back to the hero shot
  const t = easeInOutCubic((p - 0.85) / 0.15);
  return TOTAL_SEQUENCE_FRAMES - t * (TOTAL_SEQUENCE_FRAMES - 1); // frames 235 -> 1
}

/**
 * Explore-section slider [0..1] -> sequence frame [1..235].
 * Stretches the mid-sequence separation frames (102 -> 172) for smooth scrubbing.
 */
export function mapSliderToFrame(t: number): number {
  const p = clamp01(t);
  if (p <= 0.25) return 1 + (p / 0.25) * 44; // 1 -> 45
  if (p <= 0.5) return 45 + ((p - 0.25) / 0.25) * 57; // 45 -> 102
  if (p <= 0.85) return 102 + ((p - 0.5) / 0.35) * 70; // 102 -> 172
  return 172 + ((p - 0.85) / 0.15) * (TOTAL_SEQUENCE_FRAMES - 172); // 172 -> 235
}
