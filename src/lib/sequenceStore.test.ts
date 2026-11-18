import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildLoadOrder,
  getSequenceFramePath,
  pickConcurrency,
  pickFrameVariant,
  TOTAL_SEQUENCE_FRAMES,
} from "@/lib/sequenceStore";

const desktop = { smallViewport: false, saveData: false, effectiveType: "4g" };

describe("pickFrameVariant", () => {
  it("serves large frames to desktop on a fast connection", () => {
    expect(pickFrameVariant(desktop)).toBe("lg");
  });

  it("serves small frames to phones, data saver, and slow networks", () => {
    expect(pickFrameVariant({ ...desktop, smallViewport: true })).toBe("sm");
    expect(pickFrameVariant({ ...desktop, saveData: true })).toBe("sm");
    expect(pickFrameVariant({ ...desktop, effectiveType: "3g" })).toBe("sm");
  });
});

describe("pickConcurrency", () => {
  it("throttles parallel downloads on constrained networks", () => {
    expect(pickConcurrency({ ...desktop, saveData: true })).toBeLessThan(
      pickConcurrency(desktop)
    );
  });
});

describe("buildLoadOrder", () => {
  const order = buildLoadOrder(TOTAL_SEQUENCE_FRAMES);

  it("loads every frame exactly once", () => {
    expect(order).toHaveLength(TOTAL_SEQUENCE_FRAMES);
    expect(new Set(order).size).toBe(TOTAL_SEQUENCE_FRAMES);
  });

  it("prioritises the hero frame, then the exploded frame", () => {
    expect(order[0]).toBe(0);
    expect(order[1]).toBe(TOTAL_SEQUENCE_FRAMES - 1);
  });
});

describe("getSequenceFramePath", () => {
  it("clamps and zero-pads frame numbers", () => {
    expect(getSequenceFramePath(0, "lg")).toMatch(/\/lg\/001\.jpg$/);
    expect(getSequenceFramePath(999, "sm")).toMatch(/\/sm\/235\.webp$/);
  });

  it("points at a generated file for every frame and variant", () => {
    const publicDir = path.resolve(__dirname, "../../public");
    for (const variant of ["sm", "lg"] as const) {
      for (let i = 1; i <= TOTAL_SEQUENCE_FRAMES; i++) {
        const file = path.join(publicDir, getSequenceFramePath(i, variant));
        expect(existsSync(file), file).toBe(true);
      }
    }
  });
});
