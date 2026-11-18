export const TOTAL_SEQUENCE_FRAMES = 235;

export function getSequenceFramePath(index1Based: number): string {
  const clamped = Math.max(
    1,
    Math.min(TOTAL_SEQUENCE_FRAMES, Math.round(index1Based))
  );
  return `/sequence/ezgif-frame-${String(clamped).padStart(3, "0")}.jpg`;
}

type ProgressListener = (percent: number, loadedFrameIndex0: number) => void;

class SharedSequenceStore {
  private images: Array<HTMLImageElement | null> = new Array(
    TOTAL_SEQUENCE_FRAMES
  ).fill(null);
  private loaded: boolean[] = new Array(TOTAL_SEQUENCE_FRAMES).fill(false);
  private loadedCount = 0;
  private started = false;
  private listeners = new Set<ProgressListener>();

  public startPreloading(): void {
    if (this.started || typeof window === "undefined") return;
    this.started = true;

    const order: number[] = [];
    const seen = new Set<number>();
    const pushIdx = (idx: number) => {
      if (idx >= 0 && idx < TOTAL_SEQUENCE_FRAMES && !seen.has(idx)) {
        seen.add(idx);
        order.push(idx);
      }
    };

    // Priority: Frame 1 (hero), Frame 235 (exploded), keyframe strides, then all remaining
    pushIdx(0);
    pushIdx(TOTAL_SEQUENCE_FRAMES - 1);
    for (let i = 0; i < TOTAL_SEQUENCE_FRAMES; i += 4) pushIdx(i);
    for (let i = 2; i < TOTAL_SEQUENCE_FRAMES; i += 4) pushIdx(i);
    for (let i = 0; i < TOTAL_SEQUENCE_FRAMES; i++) pushIdx(i);

    let cursor = 0;
    const CONCURRENCY = 16;

    const loadNext = () => {
      if (cursor >= order.length) return;
      const idx = order[cursor++];
      const img = new Image();
      img.decoding = "async";

      img.onload = () => {
        this.images[idx] = img;
        this.loaded[idx] = true;
        this.loadedCount++;
        const pct = Math.round(
          (this.loadedCount / TOTAL_SEQUENCE_FRAMES) * 100
        );
        this.listeners.forEach((fn) => fn(pct, idx));
        loadNext();
      };

      img.onerror = () => {
        this.loadedCount++;
        loadNext();
      };

      img.src = getSequenceFramePath(idx + 1);
    };

    for (let w = 0; w < CONCURRENCY; w++) {
      loadNext();
    }
  }

  public subscribe(listener: ProgressListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getLoadPercent(): number {
    return Math.round((this.loadedCount / TOTAL_SEQUENCE_FRAMES) * 100);
  }

  public isLoaded(idx0: number): boolean {
    return (
      idx0 >= 0 && idx0 < TOTAL_SEQUENCE_FRAMES && this.loaded[idx0] === true
    );
  }

  public getExactImage(idx0: number): HTMLImageElement | null {
    if (!this.isLoaded(idx0)) return null;
    return this.images[idx0];
  }

  public getNearestImage(idx0: number): HTMLImageElement | null {
    const clamped = Math.max(0, Math.min(TOTAL_SEQUENCE_FRAMES - 1, idx0));
    if (this.loaded[clamped] && this.images[clamped]) {
      return this.images[clamped];
    }
    for (let offset = 1; offset < TOTAL_SEQUENCE_FRAMES; offset++) {
      const right = clamped + offset;
      if (
        right < TOTAL_SEQUENCE_FRAMES &&
        this.loaded[right] &&
        this.images[right]
      ) {
        return this.images[right];
      }
      const left = clamped - offset;
      if (left >= 0 && this.loaded[left] && this.images[left]) {
        return this.images[left];
      }
    }
    return null;
  }
}

export const sequenceStore = new SharedSequenceStore();
