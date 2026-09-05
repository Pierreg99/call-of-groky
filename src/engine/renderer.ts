import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';
import { detectQuality, prefersReducedMotion, type QualitySettings } from './quality';


/** Subtle animated film grain — intensity gated by quality + reduced-motion */
const FilmGrainShader = {
  name: 'FilmGrainShader',
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    time: { value: 0 },
    amount: { value: 0.035 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float amount;
    varying vec2 vUv;
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float n = hash(vUv * vec2(1920.0, 1080.0) + fract(time * 17.13));
      float g = (n - 0.5) * amount;
      gl_FragColor = vec4(color.rgb + g, color.a);
    }`,
};

/** Subtle RGB split — gated by quality + reduced-motion */
const ChromaticShader = {
  name: 'ChromaticShader',
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    amount: { value: 0.0012 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float amount;
    varying vec2 vUv;
    void main() {
      vec2 dir = vUv - 0.5;
      float d = dot(dir, dir);
      vec2 offset = dir * amount * (0.35 + d * 2.0);
      float r = texture2D(tDiffuse, vUv + offset).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - offset).b;
      gl_FragColor = vec4(r, g, b, 1.0);
    }`,
};

export class GameRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  quality: QualitySettings;
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass;
  private ssaoPass: SSAOPass;
  private vignettePass: ShaderPass;
  private chromaticPass: ShaderPass;
  private fxaaPass: ShaderPass;
  private smaaPass: SMAAPass;
  private grainPass: ShaderPass;
  private reducedMotion: boolean;
  private grainTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.quality = detectQuality();
    this.reducedMotion = prefersReducedMotion();

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setPixelRatio(this.quality.pixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.88;
    this.renderer.shadowMap.enabled = this.quality.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const r = this.renderer as THREE.WebGLRenderer & { useLegacyLights?: boolean };
    if (typeof r.useLegacyLights === 'boolean') {
      r.useLegacyLights = false;
    }

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x06080c);
    // Fog density ~ engagement: readable at shoot range (~11m), soft falloff past lose (~22m)
    this.scene.fog = new THREE.FogExp2(0x06080c, 0.0065);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.08, 220);
    this.camera.rotation.order = 'YXZ';
    this.camera.position.set(0, 1.7, 8);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    // Always create optional passes so runtime quality presets can toggle them
    this.ssaoPass = new SSAOPass(this.scene, this.camera, window.innerWidth, window.innerHeight);
    this.ssaoPass.kernelRadius = 12;
    this.ssaoPass.minDistance = 0.002;
    this.ssaoPass.maxDistance = 0.08;
    this.ssaoPass.enabled = this.quality.ssao;
    this.composer.addPass(this.ssaoPass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      this.quality.bloomStrength,
      0.4,
      this.quality.bloomThreshold,
    );
    this.bloomPass.enabled = this.quality.bloom;
    this.composer.addPass(this.bloomPass);

    this.chromaticPass = new ShaderPass(ChromaticShader);
    this.chromaticPass.uniforms['amount'].value =
      this.quality.chromatic && !this.reducedMotion ? 0.00115 : 0;
    this.composer.addPass(this.chromaticPass);

    this.vignettePass = new ShaderPass(VignetteShader);
    const vig = this.reducedMotion ? this.quality.vignetteStrength * 0.35 : this.quality.vignetteStrength;
    this.vignettePass.uniforms['offset'].value = 0.95;
    this.vignettePass.uniforms['darkness'].value = vig;
    this.composer.addPass(this.vignettePass);

    this.smaaPass = new SMAAPass(
      window.innerWidth * this.quality.pixelRatio,
      window.innerHeight * this.quality.pixelRatio,
    );
    this.smaaPass.enabled = this.quality.postAA === 'smaa';
    this.composer.addPass(this.smaaPass);

    this.fxaaPass = new ShaderPass(FXAAShader);
    const pr = this.renderer.getPixelRatio();
    this.fxaaPass.material.uniforms['resolution'].value.x = 1 / (window.innerWidth * pr);
    this.fxaaPass.material.uniforms['resolution'].value.y = 1 / (window.innerHeight * pr);
    this.fxaaPass.enabled = this.quality.postAA === 'fxaa';
    this.composer.addPass(this.fxaaPass);

    this.grainPass = new ShaderPass(FilmGrainShader);
    this.grainPass.uniforms['amount'].value =
      this.quality.filmGrain && !this.reducedMotion ? this.quality.filmGrainAmount : 0;
    this.composer.addPass(this.grainPass);

    this.composer.addPass(new OutputPass());

    document.documentElement.classList.toggle('reduced-motion', this.reducedMotion);

    window.addEventListener('resize', () => this.onResize());
    if (typeof matchMedia !== 'undefined') {
      matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
        this.reducedMotion = e.matches;
        document.documentElement.classList.toggle('reduced-motion', this.reducedMotion);
        this.applyMotionPrefs();
      });
    }
  }

  get motionScale(): number {
    return this.reducedMotion ? 0.25 : 1;
  }

  private applyMotionPrefs(): void {
    const vig = this.reducedMotion ? this.quality.vignetteStrength * 0.35 : this.quality.vignetteStrength;
    this.vignettePass.uniforms['darkness'].value = vig;
    this.chromaticPass.uniforms['amount'].value =
      this.quality.chromatic && !this.reducedMotion ? 0.00115 : 0;
    this.grainPass.uniforms['amount'].value =
      this.quality.filmGrain && !this.reducedMotion ? this.quality.filmGrainAmount : 0;
  }

  setQuality(settings: QualitySettings): void {
    this.quality = settings;
    this.renderer.setPixelRatio(settings.pixelRatio);
    this.renderer.shadowMap.enabled = settings.shadows;
    this.bloomPass.strength = settings.bloom ? settings.bloomStrength : 0;
    this.bloomPass.threshold = settings.bloomThreshold;
    this.bloomPass.enabled = settings.bloom;
    this.ssaoPass.enabled = settings.ssao;
    this.smaaPass.enabled = settings.postAA === 'smaa';
    this.fxaaPass.enabled = settings.postAA === 'fxaa';
    // SMAA: refresh size for crisp edges after preset swap
    if (settings.postAA === 'smaa') {
      this.smaaPass.setSize(
        window.innerWidth * settings.pixelRatio,
        window.innerHeight * settings.pixelRatio,
      );
    }
    this.applyMotionPrefs();
    this.onResize();
  }

  /** Resize directional shadow maps to match current quality (Low=512). */
  applyShadowMapSize(scene: THREE.Scene): void {
    const size = this.quality.shadowMapSize;
    scene.traverse((o) => {
      const l = o as THREE.DirectionalLight;
      if (l.isDirectionalLight && l.castShadow) {
        l.shadow.mapSize.set(size, size);
        if (l.shadow.map) {
          l.shadow.map.dispose();
          (l.shadow as THREE.LightShadow & { map: null }).map = null;
        }
        l.shadow.needsUpdate = true;
      }
    });
  }

  onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(this.quality.pixelRatio);
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.composer.setPixelRatio(this.quality.pixelRatio);
    if (this.ssaoPass) this.ssaoPass.setSize(w, h);
    if (this.bloomPass) this.bloomPass.resolution.set(w, h);
    if (this.smaaPass) this.smaaPass.setSize(w, h);
    if (this.fxaaPass) {
      const pr = this.renderer.getPixelRatio();
      this.fxaaPass.material.uniforms['resolution'].value.x = 1 / (w * pr);
      this.fxaaPass.material.uniforms['resolution'].value.y = 1 / (h * pr);
    }
  }

  render(dt = 1 / 60): void {
    this.grainTime += dt;
    if (this.grainPass?.uniforms['time']) {
      this.grainPass.uniforms['time'].value = this.grainTime;
    }
    this.composer.render();
  }
}
