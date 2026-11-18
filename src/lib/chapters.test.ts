import { describe, expect, it } from "vitest";
import {
  chapterIndexForProgress,
  getChapter,
  STORY_CHAPTERS,
} from "@/lib/chapters";

describe("STORY_CHAPTERS", () => {
  it("has strictly increasing start points beginning at 0", () => {
    expect(STORY_CHAPTERS[0].start).toBe(0);
    for (let i = 1; i < STORY_CHAPTERS.length; i++) {
      expect(STORY_CHAPTERS[i].start).toBeGreaterThan(STORY_CHAPTERS[i - 1].start);
    }
  });

  it("jumps land inside their own chapter", () => {
    for (const ch of STORY_CHAPTERS) {
      expect(STORY_CHAPTERS[chapterIndexForProgress(ch.jumpTo)].id).toBe(ch.id);
    }
  });
});

describe("chapterIndexForProgress", () => {
  it("switches chapter exactly at each boundary", () => {
    expect(chapterIndexForProgress(0)).toBe(0);
    expect(chapterIndexForProgress(0.1999)).toBe(0);
    expect(chapterIndexForProgress(0.2)).toBe(1);
    expect(chapterIndexForProgress(0.4)).toBe(2);
    expect(chapterIndexForProgress(0.7)).toBe(3);
    expect(chapterIndexForProgress(0.85)).toBe(4);
    expect(chapterIndexForProgress(1)).toBe(4);
  });
});

describe("getChapter", () => {
  it("returns undefined for sections outside the scroll stage", () => {
    expect(getChapter("specifications")).toBeUndefined();
    expect(getChapter("design")?.jumpTo).toBe(0.3);
  });
});
