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
  ssao: boolean;
  chromatic: boolean;
  vignetteStrength: number;
}

export function detectQuality(): QualitySettings {
  const cores = navigator.hardwareConcurrency || 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  let preset: QualityPreset = 'medium';
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
        shadowMapSize: 1024,
        shadows: true,
        antialias: false,
        maxLights: 4,
        postAA: 'fxaa',
        bloom: false,
        bloomStrength: 0,
        ssao: false,
        chromatic: false,
        vignetteStrength: 0.45,
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
        bloomStrength: 0.22,
        ssao: true,
        chromatic: true,
        vignetteStrength: 0.7,
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
        bloomStrength: 0.16,
        ssao: false,
        chromatic: true,
        vignetteStrength: 0.6,
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
