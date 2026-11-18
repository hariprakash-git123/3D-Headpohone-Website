/**
 * Single source of truth for the scroll story: where each chapter starts (for the active
 * indicator) and where navigation jumps to (for the navbar and chapter rail).
 */
export type StoryChapterId =
  | "overview"
  | "design"
  | "engineering"
  | "sound"
  | "explore";

export interface StoryChapter {
  id: StoryChapterId;
  label: string;
  phase: string;
  /** Stage progress [0..1] at which this chapter becomes active */
  start: number;
  /** Stage progress [0..1] that navigation scrolls to */
  jumpTo: number;
}

export const STORY_CHAPTERS: readonly StoryChapter[] = [
  { id: "overview", label: "Overview", phase: "Assembled", start: 0, jumpTo: 0 },
  { id: "design", label: "Design", phase: "Initial Separation", start: 0.2, jumpTo: 0.3 },
  { id: "engineering", label: "Engineering", phase: "Full Disassembly", start: 0.4, jumpTo: 0.56 },
  { id: "sound", label: "Sound", phase: "Exploded Showcase", start: 0.7, jumpTo: 0.78 },
  { id: "explore", label: "Rockerz 440", phase: "Reassembled", start: 0.85, jumpTo: 0.98 },
];

export function chapterIndexForProgress(progress: number): number {
  let idx = 0;
  for (let i = 0; i < STORY_CHAPTERS.length; i++) {
    if (progress >= STORY_CHAPTERS[i].start) idx = i;
  }
  return idx;
}

/** Returns the story chapter for an id, or undefined for ids outside the scroll stage. */
export function getChapter(id: string): StoryChapter | undefined {
  return STORY_CHAPTERS.find((c) => c.id === id);
}

/** Scrolls the window so the sticky stage inside `el` shows the given progress. */
export function scrollToStageProgress(
  el: HTMLElement,
  progress: number,
  smooth: boolean
): void {
  const top = window.scrollY + el.getBoundingClientRect().top;
  const scrollable = Math.max(0, el.offsetHeight - window.innerHeight);
  window.scrollTo({
    top: top + scrollable * progress,
    behavior: smooth ? "smooth" : "auto",
  });
}
