export const TOTAL_SEQUENCE_FRAMES = 235;

/**
 * Folder version for the generated frames in /public/frames. Bump it whenever the frames are
 * regenerated (see scripts/optimize-frames.mjs) so the immutable cache headers stay correct.
 */
export const FRAMES_VERSION = "v1";

/** "sm" = 960w WebP for phones, "lg" = 1920w JPEG for everything else. */
export type FrameVariant = "sm" | "lg";

/** Must match the `media` attributes of the frame-1 preload links in app/layout.tsx. */
export const SMALL_FRAMES_MEDIA_QUERY = "(max-width: 767px)";

export function getSequenceFramePath(
  index1Based: number,
  variant: FrameVariant
): string {
  const clamped = Math.max(
    1,
    Math.min(TOTAL_SEQUENCE_FRAMES, Math.round(index1Based))
  );
  const id = String(clamped).padStart(3, "0");
  const ext = variant === "sm" ? "webp" : "jpg";
  return `/frames/${FRAMES_VERSION}/${variant}/${id}.${ext}`;
}

export interface NetworkHints {
  smallViewport: boolean;
  saveData: boolean;
  effectiveType?: string;
}

const SLOW_CONNECTION_TYPES = new Set(["slow-2g", "2g", "3g"]);

export function isConstrainedNetwork(hints: NetworkHints): boolean {
  return (
    hints.saveData ||
    (hints.effectiveType !== undefined &&
      SLOW_CONNECTION_TYPES.has(hints.effectiveType))
  );
}

export function pickFrameVariant(hints: NetworkHints): FrameVariant {
  return hints.smallViewport || isConstrainedNetwork(hints) ? "sm" : "lg";
}

export function pickConcurrency(hints: NetworkHints): number {
  return isConstrainedNetwork(hints) ? 3 : 8;
}

/**
 * Load order: hero frame, final exploded frame, every 4th frame, every other frame, then the
 * rest, so a coarse version of the whole animation is available as early as possible.
 */
export function buildLoadOrder(total: number): number[] {
  const order: number[] = [];
  const seen = new Set<number>();
  const push = (idx: number) => {
    if (idx >= 0 && idx < total && !seen.has(idx)) {
      seen.add(idx);
      order.push(idx);
    }
  };
  push(0);
  push(total - 1);
  for (let i = 0; i < total; i += 4) push(i);
  for (let i = 2; i < total; i += 4) push(i);
  for (let i = 0; i < total; i++) push(i);
  return order;
}

function readNetworkHints(): NetworkHints {
  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  return {
    smallViewport: window.matchMedia(SMALL_FRAMES_MEDIA_QUERY).matches,
    saveData: connection?.saveData === true,
    effectiveType: connection?.effectiveType,
  };
}

/**
 * Called after each frame settles. `ok` is false when the frame failed after all retries.
 * `percent` counts settled frames (loaded or failed), so it always reaches 100.
 */
type ProgressListener = (percent: number, frameIdx0: number, ok: boolean) => void;

const MAX_ATTEMPTS = 3;

class SharedSequenceStore {
  private images: Array<HTMLImageElement | null> = new Array(
    TOTAL_SEQUENCE_FRAMES
  ).fill(null);
  private settled: boolean[] = new Array(TOTAL_SEQUENCE_FRAMES).fill(false);
  private settledCount = 0;
  private loadedCount = 0;
  private started = false;
  private listeners = new Set<ProgressListener>();

  public startPreloading(): void {
    if (this.started || typeof window === "undefined") return;
    this.started = true;

    const hints = readNetworkHints();
    const variant = pickFrameVariant(hints);
    const concurrency = pickConcurrency(hints);
    const order = buildLoadOrder(TOTAL_SEQUENCE_FRAMES);

    let cursor = 0;
    const loadNext = () => {
      if (cursor >= order.length) return;
      const idx = order[cursor++];
      this.loadFrame(idx, variant, 1, loadNext);
    };

    // The hero frame goes first on its own so it isn't competing with the rest.
    cursor = 1;
    this.loadFrame(order[0], variant, 1, () => {});

    const startBulk = () => {
      for (let w = 0; w < concurrency; w++) loadNext();
    };

    if (isConstrainedNetwork(hints)) {
      // Data saver / slow network: only fetch the full sequence once the visitor engages.
      const events = ["scroll", "pointerdown", "keydown", "touchstart"] as const;
      const onEngage = () => {
        events.forEach((e) => window.removeEventListener(e, onEngage));
        startBulk();
      };
      events.forEach((e) =>
        window.addEventListener(e, onEngage, { passive: true, once: true })
      );
      return;
    }

    // Otherwise wait for the page itself to finish loading, then use idle time.
    const scheduleIdle = () => {
      const ric = (
        window as Window & {
          requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
        }
      ).requestIdleCallback;
      if (ric) ric(startBulk, { timeout: 1500 });
      else window.setTimeout(startBulk, 200);
    };
    if (document.readyState === "complete") scheduleIdle();
    else window.addEventListener("load", scheduleIdle, { once: true });
  }

  private loadFrame(
    idx: number,
    variant: FrameVariant,
    attempt: number,
    onSettled: () => void
  ): void {
    const img = new Image();
    img.decoding = "async";
    if (idx === 0) img.fetchPriority = "high";

    img.onload = () => {
      // Decode off the main thread before the renderer uploads it as a texture.
      img
        .decode()
        .catch(() => undefined)
        .then(() => {
          this.images[idx] = img;
          this.loadedCount++;
          this.settle(idx, true);
          onSettled();
        });
    };

    img.onerror = () => {
      if (attempt < MAX_ATTEMPTS) {
        window.setTimeout(
          () => this.loadFrame(idx, variant, attempt + 1, onSettled),
          600 * attempt
        );
        return;
      }
      this.settle(idx, false);
      onSettled();
    };

    img.src = getSequenceFramePath(idx + 1, variant);
  }

  private settle(idx: number, ok: boolean): void {
    if (this.settled[idx]) return;
    this.settled[idx] = true;
    this.settledCount++;
    const pct = this.getLoadPercent();
    this.listeners.forEach((fn) => fn(pct, idx, ok));
  }

  public subscribe(listener: ProgressListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getLoadPercent(): number {
    return Math.round((this.settledCount / TOTAL_SEQUENCE_FRAMES) * 100);
  }

  /** True once at least one frame can be drawn (ideally the hero frame). */
  public canDrawHero(): boolean {
    return this.isLoaded(0) || (this.settled[0] && this.loadedCount > 0);
  }

  public isLoaded(idx0: number): boolean {
    return (
      idx0 >= 0 && idx0 < TOTAL_SEQUENCE_FRAMES && this.images[idx0] !== null
    );
  }

  public getExactImage(idx0: number): HTMLImageElement | null {
    return this.isLoaded(idx0) ? this.images[idx0] : null;
  }

  public getNearestImage(idx0: number): HTMLImageElement | null {
    const clamped = Math.max(0, Math.min(TOTAL_SEQUENCE_FRAMES - 1, idx0));
    if (this.images[clamped]) return this.images[clamped];
    for (let offset = 1; offset < TOTAL_SEQUENCE_FRAMES; offset++) {
      const right = clamped + offset;
      if (right < TOTAL_SEQUENCE_FRAMES && this.images[right]) {
        return this.images[right];
      }
      const left = clamped - offset;
      if (left >= 0 && this.images[left]) return this.images[left];
    }
    return null;
  }
}

export const sequenceStore = new SharedSequenceStore();
