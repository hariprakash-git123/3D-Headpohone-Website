export type RockerzColorwayId =
  | "active-black"
  | "crimson-red"
  | "arctic-white"
  | "gunmetal-grey";

export interface ShaderMaterialParams {
  /** Strength of recolouring [0 = original untouched Active Black, 1 = full recolour] */
  mixAmount: number;
  /** Target surface tint RGB in 0..1 */
  tintR: number;
  tintG: number;
  tintB: number;
  /** Gamma curve for luminance remapping (<1 lifts dark matte black cleanly) */
  lumaGamma: number;
  /** Linear luminance gain */
  lumaGain: number;
  /** Subtle shadow floor lift */
  lumaLift: number;
  /** Saturation boost for chromatic finishes like Crimson Red */
  tintSaturation: number;
}

export interface RockerzColorway {
  id: RockerzColorwayId;
  name: string;
  swatch: string;
  glow: string;
  description: string;
  shader: ShaderMaterialParams;
}

export const ROCKERZ_COLORWAYS: RockerzColorway[] = [
  {
    id: "active-black",
    name: "Active Black",
    swatch: "#16171B",
    glow: "rgba(255, 59, 48, 0.2)",
    description: "Matte obsidian finish with subtle metallic acoustic trim",
    shader: {
      mixAmount: 0.0,
      tintR: 1.0,
      tintG: 1.0,
      tintB: 1.0,
      lumaGamma: 1.0,
      lumaGain: 1.0,
      lumaLift: 0.0,
      tintSaturation: 0.0,
    },
  },
  {
    id: "crimson-red",
    name: "Crimson Red",
    swatch: "#C9241E",
    glow: "rgba(255, 59, 48, 0.34)",
    description: "Deep anodized crimson shells with signature metallic accents",
    shader: {
      mixAmount: 1.0,
      tintR: 0.92,
      tintG: 0.14,
      tintB: 0.12,
      lumaGamma: 0.82,
      lumaGain: 1.06,
      lumaLift: 0.025,
      tintSaturation: 0.92,
    },
  },
  {
    id: "arctic-white",
    name: "Arctic White",
    swatch: "#EAECEF",
    glow: "rgba(226, 232, 240, 0.18)",
    description: "Clean satin arctic-white shells with crisp studio reflections",
    shader: {
      mixAmount: 1.0,
      tintR: 0.95,
      tintG: 0.96,
      tintB: 0.99,
      lumaGamma: 0.48,
      lumaGain: 0.96,
      lumaLift: 0.1,
      tintSaturation: 0.12,
    },
  },
  {
    id: "gunmetal-grey",
    name: "Gunmetal Grey",
    swatch: "#5A5E68",
    glow: "rgba(161, 161, 170, 0.22)",
    description: "Brushed gunmetal titanium finish with cool metallic highlights",
    shader: {
      mixAmount: 1.0,
      tintR: 0.64,
      tintG: 0.68,
      tintB: 0.75,
      lumaGamma: 0.66,
      lumaGain: 0.94,
      lumaLift: 0.055,
      tintSaturation: 0.22,
    },
  },
];

export function getColorwayById(id: RockerzColorwayId): RockerzColorway {
  return ROCKERZ_COLORWAYS.find((c) => c.id === id) || ROCKERZ_COLORWAYS[0];
}
