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
  private bloomPass: UnrealBloomPass | null = null;
  private ssaoPass: SSAOPass | null = null;
  private vignettePass: ShaderPass;
  private chromaticPass: ShaderPass;
  private fxaaPass: ShaderPass | null = null;
  private smaaPass: SMAAPass | null = null;
  private reducedMotion: boolean;

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
    this.renderer.toneMappingExposure = 1.02;
    this.renderer.shadowMap.enabled = this.quality.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const r = this.renderer as THREE.WebGLRenderer & { useLegacyLights?: boolean };
    if (typeof r.useLegacyLights === 'boolean') {
      r.useLegacyLights = false;
    }

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x090c12);
    this.scene.fog = new THREE.FogExp2(0x0b1018, 0.016);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.08, 220);
    this.camera.rotation.order = 'YXZ';
    this.camera.position.set(0, 1.7, 8);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    if (this.quality.ssao) {
      this.ssaoPass = new SSAOPass(this.scene, this.camera, window.innerWidth, window.innerHeight);
      this.ssaoPass.kernelRadius = 12;
      this.ssaoPass.minDistance = 0.002;
      this.ssaoPass.maxDistance = 0.08;
      this.composer.addPass(this.ssaoPass);
    }

    if (this.quality.bloom) {
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        this.quality.bloomStrength,
        0.55,
        0.82,
      );
      this.composer.addPass(this.bloomPass);
    }

    this.chromaticPass = new ShaderPass(ChromaticShader);
    this.chromaticPass.uniforms['amount'].value =
      this.quality.chromatic && !this.reducedMotion ? 0.00115 : 0;
    this.composer.addPass(this.chromaticPass);

    this.vignettePass = new ShaderPass(VignetteShader);
    const vig = this.reducedMotion ? this.quality.vignetteStrength * 0.35 : this.quality.vignetteStrength;
    this.vignettePass.uniforms['offset'].value = 0.85;
    this.vignettePass.uniforms['darkness'].value = vig;
    this.composer.addPass(this.vignettePass);

    if (this.quality.postAA === 'smaa') {
      this.smaaPass = new SMAAPass(window.innerWidth * this.quality.pixelRatio, window.innerHeight * this.quality.pixelRatio);
      this.composer.addPass(this.smaaPass);
    } else if (this.quality.postAA === 'fxaa') {
      this.fxaaPass = new ShaderPass(FXAAShader);
      const pr = this.renderer.getPixelRatio();
      this.fxaaPass.material.uniforms['resolution'].value.x = 1 / (window.innerWidth * pr);
      this.fxaaPass.material.uniforms['resolution'].value.y = 1 / (window.innerHeight * pr);
      this.composer.addPass(this.fxaaPass);
    }

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
  }

  setQuality(settings: QualitySettings): void {
    this.quality = settings;
    this.renderer.setPixelRatio(settings.pixelRatio);
    this.renderer.shadowMap.enabled = settings.shadows;
    if (this.bloomPass) {
      this.bloomPass.strength = settings.bloom ? settings.bloomStrength : 0;
      this.bloomPass.enabled = settings.bloom;
    }
    if (this.ssaoPass) this.ssaoPass.enabled = settings.ssao;
    this.applyMotionPrefs();
    this.onResize();
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

  render(): void {
    this.composer.render();
  }
}
