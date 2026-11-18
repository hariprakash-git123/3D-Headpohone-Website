import {
  getColorwayById,
  RockerzColorwayId,
  ShaderMaterialParams,
} from "@/lib/rockerz440Config";
import { sequenceStore, TOTAL_SEQUENCE_FRAMES } from "@/lib/sequenceStore";

const VERTEX_SHADER = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  vUv.y = 1.0 - vUv.y;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision mediump float;

varying vec2 vUv;

uniform sampler2D uTexA;
uniform sampler2D uTexB;
uniform float uBlend;

// Image placement inside viewport [x, y, w, h] in normalized 0..1 screen coords
uniform vec4 uRect;

// Material colourway uniforms (smoothly interpolated on CPU for fluid colour transitions)
uniform float uMixAmount;
uniform vec3 uTint;
uniform float uLumaGamma;
uniform float uLumaGain;
uniform float uLumaLift;
uniform float uTintSat;

const vec3 BG_COLOR = vec3(5.0 / 255.0);

void main() {
  // Map screen UV -> image UV
  vec2 imgUv = (vUv - uRect.xy) / uRect.zw;

  if (imgUv.x < 0.0 || imgUv.x > 1.0 || imgUv.y < 0.0 || imgUv.y > 1.0) {
    gl_FragColor = vec4(BG_COLOR, 1.0);
    return;
  }

  vec3 colA = texture2D(uTexA, imgUv).rgb;
  vec3 colB = texture2D(uTexB, imgUv).rgb;
  vec3 base = mix(colA, colB, uBlend);

  // Compute pixel luminance & HSV saturation for material segmentation
  float maxC = max(base.r, max(base.g, base.b));
  float minC = min(base.r, min(base.g, base.b));
  float chroma = maxC - minC;
  float sat = maxC > 0.001 ? chroma / maxC : 0.0;
  float luma = dot(base, vec3(0.299, 0.587, 0.114));

  // 1. Preserve chromatic metallic/internal parts (gold trim, gold hinge, copper coil, green PCB)
  float lowChroma = 1.0 - smoothstep(0.085, 0.21, sat);

  // 2. Preserve pure #050505 dark studio background void
  float aboveBg = smoothstep(0.048, 0.145, luma);

  // 3. Preserve dark studio floor gradient at the bottom of the frame
  float floorGuard = 1.0 - smoothstep(0.75, 0.90, imgUv.y) * (1.0 - smoothstep(0.22, 0.38, luma));

  // 4. Preserve outer extreme edges where only ambient dark background lives
  float edgeXGuard = smoothstep(0.02, 0.08, imgUv.x) * (1.0 - smoothstep(0.92, 0.98, imgUv.x));

  float shellMask = clamp(lowChroma * aboveBg * floorGuard * edgeXGuard, 0.0, 1.0);

  // Physically plausible luminance remapping preserving shadows, creases & studio specular sheen
  float remappedLuma = clamp(pow(max(luma, 0.0001), uLumaGamma) * uLumaGain + uLumaLift * aboveBg, 0.0, 1.0);

  // Blend neutral lifted tone with chromatic tint while preserving clean white specular highlights
  float specPreserve = smoothstep(0.68, 0.96, luma);
  vec3 tintedShell = mix(vec3(remappedLuma), vec3(remappedLuma) * uTint * 1.18, uTintSat);

  // Restore crisp neutral metallic rim specular highlights on top of the painted shell
  vec3 finalShell = mix(tintedShell, vec3(min(remappedLuma * 1.12 + 0.08, 1.0)), specPreserve * 0.55);

  vec3 color = mix(base, finalShell, shellMask * uMixAmount);

  // Seamless bottom-right corner feather into #050505 studio void
  vec2 cornerDelta = (imgUv - vec2(0.955, 0.925)) * vec2(1.0, 0.5625);
  float cornerDist = length(cornerDelta);
  float cornerMask = smoothstep(0.068, 0.112, cornerDist);
  color = mix(BG_COLOR, color, cornerMask);

  // Subtle perimeter edge feather so image boundaries blend seamlessly into #050505
  float fx = smoothstep(0.0, 0.045, imgUv.x) * (1.0 - smoothstep(0.955, 1.0, imgUv.x));
  float fy = smoothstep(0.0, 0.055, imgUv.y) * (1.0 - smoothstep(0.935, 1.0, imgUv.y));
  color = mix(BG_COLOR, color, fx * fy);

  gl_FragColor = vec4(color, 1.0);
}
`;

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function cloneParams(p: ShaderMaterialParams): ShaderMaterialParams {
  return { ...p };
}

export interface SequenceRendererOptions {
  /** Slightly lift frame on mobile screens to avoid lower text overlay */
  mobileVerticalShift?: boolean;
  /** Fit mode scale multiplier (default 0.98) */
  fitScale?: number;
  /** Fractional vertical offset relative to canvas height (negative moves image up) */
  verticalOffsetPct?: number;
}

export interface SequenceRendererHandle {
  setFrame: (frameFloat: number, force?: boolean) => void;
  setColorway: (id: RockerzColorwayId, instant?: boolean) => void;
  resize: () => void;
  dispose: () => void;
}

export function createSequenceRenderer(
  canvas: HTMLCanvasElement,
  initialColorway: RockerzColorwayId,
  options: SequenceRendererOptions = {}
): SequenceRendererHandle {
  const fitScale = options.fitScale ?? 0.98;
  const mobileVerticalShift = options.mobileVerticalShift ?? false;
  const verticalOffsetPct = options.verticalOffsetPct ?? 0;

  // A single full-screen textured quad gains nothing from MSAA, and "default" lets dual-GPU
  // laptops stay on the integrated GPU instead of waking the discrete one.
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    premultipliedAlpha: false,
    powerPreference: "default",
  });

  let currentFrameFloat = 1;
  let currentParams = cloneParams(getColorwayById(initialColorway).shader);
  let targetParams = cloneParams(currentParams);
  let tweenRafId: number | null = null;
  let drawRafId: number | null = null;
  let disposed = false;
  let contextLost = false;

  // WebGL resources
  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;

  /**
   * Two texture slots, each remembering which frame image it currently holds. When the scroll
   * crosses a frame boundary the "next" frame becomes the "current" one; reusing its slot means
   * only one new 1920x1080 upload per boundary instead of two.
   */
  interface TextureSlot {
    tex: WebGLTexture | null;
    img: HTMLImageElement | null;
  }
  let slots: [TextureSlot, TextureSlot] = [
    { tex: null, img: null },
    { tex: null, img: null },
  ];

  let uTexALoc: WebGLUniformLocation | null = null;
  let uTexBLoc: WebGLUniformLocation | null = null;
  let uBlendLoc: WebGLUniformLocation | null = null;
  let uRectLoc: WebGLUniformLocation | null = null;
  let uMixLoc: WebGLUniformLocation | null = null;
  let uTintLoc: WebGLUniformLocation | null = null;
  let uGammaLoc: WebGLUniformLocation | null = null;
  let uGainLoc: WebGLUniformLocation | null = null;
  let uLiftLoc: WebGLUniformLocation | null = null;
  let uSatLoc: WebGLUniformLocation | null = null;

  const initWebGL = (): boolean => {
    if (!gl) return false;
    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vs || !fs) return false;

    program = gl.createProgram();
    if (!program) return false;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      program = null;
      return false;
    }

    gl.useProgram(program);

    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const createTex = (): WebGLTexture | null => {
      const t = gl.createTexture();
      if (!t) return null;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      return t;
    };

    slots = [
      { tex: createTex(), img: null },
      { tex: createTex(), img: null },
    ];

    uTexALoc = gl.getUniformLocation(program, "uTexA");
    uTexBLoc = gl.getUniformLocation(program, "uTexB");
    uBlendLoc = gl.getUniformLocation(program, "uBlend");
    uRectLoc = gl.getUniformLocation(program, "uRect");
    uMixLoc = gl.getUniformLocation(program, "uMixAmount");
    uTintLoc = gl.getUniformLocation(program, "uTint");
    uGammaLoc = gl.getUniformLocation(program, "uLumaGamma");
    uGainLoc = gl.getUniformLocation(program, "uLumaGain");
    uLiftLoc = gl.getUniformLocation(program, "uLumaLift");
    uSatLoc = gl.getUniformLocation(program, "uTintSat");

    gl.uniform1i(uTexALoc, 0);
    gl.uniform1i(uTexBLoc, 1);

    return true;
  };

  let hasWebGL = initWebGL();
  const ctx2d = hasWebGL ? null : canvas.getContext("2d", { alpha: false });

  /**
   * Ensures `imgA` and `imgB` are resident in texture slots and binds them to units 0 and 1.
   * Slots already holding the right image are reused; at most the missing ones are uploaded.
   */
  const bindFrameTextures = (imgA: HTMLImageElement, imgB: HTMLImageElement) => {
    if (!gl) return;

    let slotA = slots.find((s) => s.img === imgA);
    let slotB = imgB === imgA ? slotA : slots.find((s) => s.img === imgB);

    const upload = (slot: TextureSlot, img: HTMLImageElement) => {
      gl.bindTexture(gl.TEXTURE_2D, slot.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      slot.img = img;
    };

    if (!slotA) {
      slotA = slots.find((s) => s !== slotB) ?? slots[0];
      upload(slotA, imgA);
    }
    if (!slotB) {
      slotB = imgB === imgA ? slotA : slots.find((s) => s !== slotA) ?? slots[1];
      upload(slotB, imgB);
    }

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, slotA.tex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, slotB.tex);
  };

  // Mobile browsers drop WebGL contexts under memory pressure or after backgrounding the tab.
  // Without these handlers the canvas would stay black until a full reload.
  const onContextLost = (e: Event) => {
    e.preventDefault(); // signals that we will handle restoration
    contextLost = true;
    if (drawRafId !== null) {
      cancelAnimationFrame(drawRafId);
      drawRafId = null;
    }
  };

  const onContextRestored = () => {
    contextLost = false;
    program = null;
    buffer = null;
    slots = [
      { tex: null, img: null },
      { tex: null, img: null },
    ];
    hasWebGL = initWebGL();
    renderNow();
  };

  if (gl) {
    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", onContextRestored);
  }

  const renderNow = () => {
    if (disposed || contextLost) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const vw = canvas.clientWidth;
    const vh = canvas.clientHeight;
    if (vw === 0 || vh === 0) return;

    const targetW = Math.floor(vw * dpr);
    const targetH = Math.floor(vh * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const clampedFloat = Math.max(
      1,
      Math.min(TOTAL_SEQUENCE_FRAMES, currentFrameFloat)
    );
    const baseIdx = Math.floor(clampedFloat) - 1;
    const nextIdx = Math.min(TOTAL_SEQUENCE_FRAMES - 1, baseIdx + 1);
    const frac = clampedFloat - Math.floor(clampedFloat);

    const imgA = sequenceStore.getNearestImage(baseIdx);
    const exactNext =
      frac > 0.03 && nextIdx !== baseIdx
        ? sequenceStore.getExactImage(nextIdx)
        : null;
    const imgB = exactNext || imgA;
    const blend = exactNext ? frac : 0;

    if (!imgA || imgA.naturalWidth === 0 || imgA.naturalHeight === 0) {
      if (gl) {
        gl.viewport(0, 0, targetW, targetH);
        gl.clearColor(5 / 255, 5 / 255, 5 / 255, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
      } else if (ctx2d) {
        ctx2d.fillStyle = "#050505";
        ctx2d.fillRect(0, 0, targetW, targetH);
      }
      return;
    }

    const imgAspect = imgA.naturalWidth / imgA.naturalHeight;
    const viewAspect = vw / vh;
    const isMobile = vw < 768;

    let drawW: number;
    let drawH: number;
    if (viewAspect > imgAspect) {
      drawH = vh * fitScale;
      drawW = drawH * imgAspect;
    } else {
      drawW = vw * (isMobile ? Math.min(1.06, fitScale + 0.06) : fitScale);
      drawH = drawW / imgAspect;
    }

    const drawX = (vw - drawW) / 2;
    const extraShiftY =
      (mobileVerticalShift && isMobile ? -vh * 0.06 : 0) +
      vh * verticalOffsetPct;
    const drawY = (vh - drawH) / 2 + extraShiftY;

    if (hasWebGL && gl && program) {
      gl.viewport(0, 0, targetW, targetH);
      gl.useProgram(program);

      bindFrameTextures(imgA, imgB ?? imgA);

      gl.uniform1f(uBlendLoc, blend);
      gl.uniform4f(uRectLoc, drawX / vw, drawY / vh, drawW / vw, drawH / vh);
      gl.uniform1f(uMixLoc, currentParams.mixAmount);
      gl.uniform3f(
        uTintLoc,
        currentParams.tintR,
        currentParams.tintG,
        currentParams.tintB
      );
      gl.uniform1f(uGammaLoc, currentParams.lumaGamma);
      gl.uniform1f(uGainLoc, currentParams.lumaGain);
      gl.uniform1f(uLiftLoc, currentParams.lumaLift);
      gl.uniform1f(uSatLoc, currentParams.tintSaturation);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return;
    }

    // Graceful Canvas 2D Fallback
    if (ctx2d) {
      ctx2d.save();
      ctx2d.scale(dpr, dpr);
      ctx2d.fillStyle = "#050505";
      ctx2d.fillRect(0, 0, vw, vh);
      ctx2d.drawImage(imgA, drawX, drawY, drawW, drawH);
      if (exactNext && blend > 0.03) {
        ctx2d.globalAlpha = blend;
        ctx2d.drawImage(exactNext, drawX, drawY, drawW, drawH);
        ctx2d.globalAlpha = 1;
      }
      ctx2d.restore();
    }
  };

  const scheduleRender = () => {
    if (disposed || drawRafId !== null) return;
    drawRafId = window.requestAnimationFrame(() => {
      drawRafId = null;
      renderNow();
    });
  };

  const setFrame = (frameFloat: number, force = false) => {
    const quantized = Math.round(frameFloat * 4) / 4;
    if (!force && Math.round(currentFrameFloat * 4) / 4 === quantized) {
      return;
    }
    currentFrameFloat = frameFloat;
    scheduleRender();
  };

  const setColorway = (id: RockerzColorwayId, instant = false) => {
    const next = getColorwayById(id).shader;
    targetParams = cloneParams(next);

    if (tweenRafId !== null) {
      cancelAnimationFrame(tweenRafId);
      tweenRafId = null;
    }

    if (instant) {
      currentParams = cloneParams(next);
      scheduleRender();
      return;
    }

    const startParams = cloneParams(currentParams);
    const startTime = performance.now();
    const duration = 340;

    const tick = (now: number) => {
      if (disposed) return;
      const rawT = Math.min(1, (now - startTime) / duration);
      const t = 1 - Math.pow(1 - rawT, 3); // smooth easeOutCubic

      currentParams.mixAmount = lerp(
        startParams.mixAmount,
        targetParams.mixAmount,
        t
      );
      currentParams.tintR = lerp(startParams.tintR, targetParams.tintR, t);
      currentParams.tintG = lerp(startParams.tintG, targetParams.tintG, t);
      currentParams.tintB = lerp(startParams.tintB, targetParams.tintB, t);
      currentParams.lumaGamma = lerp(
        startParams.lumaGamma,
        targetParams.lumaGamma,
        t
      );
      currentParams.lumaGain = lerp(
        startParams.lumaGain,
        targetParams.lumaGain,
        t
      );
      currentParams.lumaLift = lerp(
        startParams.lumaLift,
        targetParams.lumaLift,
        t
      );
      currentParams.tintSaturation = lerp(
        startParams.tintSaturation,
        targetParams.tintSaturation,
        t
      );

      renderNow();

      if (rawT < 1) {
        tweenRafId = requestAnimationFrame(tick);
      } else {
        tweenRafId = null;
      }
    };

    tweenRafId = requestAnimationFrame(tick);
  };

  const resize = () => {
    renderNow();
  };

  const dispose = () => {
    disposed = true;
    if (drawRafId !== null) cancelAnimationFrame(drawRafId);
    if (tweenRafId !== null) cancelAnimationFrame(tweenRafId);
    if (gl) {
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      if (!contextLost) {
        slots.forEach((s) => s.tex && gl.deleteTexture(s.tex));
        if (buffer) gl.deleteBuffer(buffer);
        if (program) gl.deleteProgram(program);
      }
    }
  };

  return { setFrame, setColorway, resize, dispose };
}
