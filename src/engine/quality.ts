export type QualityPreset = 'low' | 'medium' | 'high';

export interface QualitySettings {
  preset: QualityPreset;
  pixelRatio: number;
  shadowMapSize: number;
  shadows: boolean;
  antialias: boolean;
  maxLights: number;
  /** Post AA when using EffectComposer (MSAA off on canvas) */
  postAA: 'none' | 'fxaa' | 'smaa';
  bloom: boolean;
  bloomStrength: number;
  bloomThreshold: number;
  ssao: boolean;
  chromatic: boolean;
  vignetteStrength: number;
}

export function detectQuality(): QualitySettings {
  const cores = navigator.hardwareConcurrency || 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  // User 2026-09-05: all shaders approved — default toward high when unsure
  let preset: QualityPreset = 'high';
  if (cores <= 4 || mem <= 4) preset = 'low';
  if (cores >= 8 && mem >= 8) preset = 'high';

  return settingsFor(preset, dpr);
}

export function settingsFor(
  preset: QualityPreset,
  dpr = Math.min(window.devicePixelRatio || 1, 2),
): QualitySettings {
  switch (preset) {
    case 'low':
      return {
        preset,
        pixelRatio: Math.min(dpr, 1),
        // Loop 3 gate: low ShadowMap ≤512 — shaders ON (user approved all)
        shadowMapSize: 512,
        shadows: true,
        antialias: false,
        maxLights: 4,
        postAA: 'smaa',
        bloom: true,
        bloomStrength: 0.1,
        bloomThreshold: 0.88,
        ssao: true,
        chromatic: true,
        vignetteStrength: 0.5,
      };
    case 'high':
      return {
        preset,
        pixelRatio: Math.min(dpr, 2),
        shadowMapSize: 2048,
        shadows: true,
        antialias: false,
        maxLights: 8,
        postAA: 'smaa',
        bloom: true,
        // Punchier bloom (slight bump vs prior 0.14)
        bloomStrength: 0.16,
        bloomThreshold: 0.88,
        ssao: true,
        chromatic: true,
        vignetteStrength: 0.75,
      };
    default:
      return {
        preset: 'medium',
        pixelRatio: Math.min(dpr, 1.5),
        shadowMapSize: 1536,
        shadows: true,
        antialias: false,
        maxLights: 6,
        postAA: 'smaa',
        bloom: true,
        bloomStrength: 0.11,
        bloomThreshold: 0.86,
        ssao: true,
        chromatic: true,
        vignetteStrength: 0.65,
      };
  }
}

/** Prefers-reduced-motion: dampen shake / vignette / chromatic */
export function prefersReducedMotion(): boolean {
  return (
    typeof matchMedia !== 'undefined' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
