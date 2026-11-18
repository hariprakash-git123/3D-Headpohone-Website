import { describe, expect, it } from "vitest";
import { mapScrollProgressToFrame, mapSliderToFrame } from "@/lib/frameMapping";
import { TOTAL_SEQUENCE_FRAMES } from "@/lib/sequenceStore";

const samples = (n: number) => Array.from({ length: n + 1 }, (_, i) => i / n);

describe("mapScrollProgressToFrame", () => {
  it("starts and ends on the assembled hero frame", () => {
    expect(mapScrollProgressToFrame(0)).toBe(1);
    expect(mapScrollProgressToFrame(1)).toBeCloseTo(1);
  });

  it("reaches the fully exploded frame at 85%", () => {
    expect(mapScrollProgressToFrame(0.85)).toBeCloseTo(TOTAL_SEQUENCE_FRAMES);
  });

  it("hits each phase boundary exactly (no jumps between phases)", () => {
    expect(mapScrollProgressToFrame(0.2)).toBeCloseTo(45);
    expect(mapScrollProgressToFrame(0.4)).toBeCloseTo(102);
    expect(mapScrollProgressToFrame(0.7)).toBeCloseTo(172);
  });

  it("only moves forward through disassembly, then only backward", () => {
    const pts = samples(1000);
    for (let i = 1; i < pts.length; i++) {
      const prev = mapScrollProgressToFrame(pts[i - 1]);
      const cur = mapScrollProgressToFrame(pts[i]);
      if (pts[i] <= 0.85) expect(cur).toBeGreaterThanOrEqual(prev);
      else expect(cur).toBeLessThanOrEqual(prev);
    }
  });

  it("clamps out-of-range progress", () => {
    expect(mapScrollProgressToFrame(-1)).toBe(1);
    expect(mapScrollProgressToFrame(2)).toBeCloseTo(1);
  });

  it("always stays within the frame range", () => {
    for (const p of samples(500)) {
      const f = mapScrollProgressToFrame(p);
      expect(f).toBeGreaterThanOrEqual(1);
      expect(f).toBeLessThanOrEqual(TOTAL_SEQUENCE_FRAMES);
    }
  });
});

describe("mapSliderToFrame", () => {
  it("maps 0 -> first frame and 1 -> last frame", () => {
    expect(mapSliderToFrame(0)).toBe(1);
    expect(mapSliderToFrame(1)).toBeCloseTo(TOTAL_SEQUENCE_FRAMES);
  });

  it("is monotonically increasing", () => {
    const pts = samples(1000);
    for (let i = 1; i < pts.length; i++) {
      expect(mapSliderToFrame(pts[i])).toBeGreaterThanOrEqual(
        mapSliderToFrame(pts[i - 1])
      );
    }
  });

  it("clamps out-of-range input", () => {
    expect(mapSliderToFrame(-0.5)).toBe(1);
    expect(mapSliderToFrame(1.5)).toBeCloseTo(TOTAL_SEQUENCE_FRAMES);
  });
});
