import * as THREE from 'three';
import { detectQuality, type QualitySettings } from './quality';

export class GameRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  quality: QualitySettings;

  constructor(canvas: HTMLCanvasElement) {
    this.quality = detectQuality();

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.quality.antialias,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setPixelRatio(this.quality.pixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = this.quality.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Physically correct lights are default in modern three; silence legacy if present
    const r = this.renderer as THREE.WebGLRenderer & { useLegacyLights?: boolean };
    if (typeof r.useLegacyLights === 'boolean') {
      r.useLegacyLights = false;
    }

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0d12);
    this.scene.fog = new THREE.FogExp2(0x0c1018, 0.018);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.08, 220);
    this.camera.rotation.order = 'YXZ';
    this.camera.position.set(0, 1.7, 8);

    window.addEventListener('resize', () => this.onResize());
  }

  setQuality(settings: QualitySettings): void {
    this.quality = settings;
    this.renderer.setPixelRatio(settings.pixelRatio);
    this.renderer.shadowMap.enabled = settings.shadows;
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
  }

  onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(this.quality.pixelRatio);
    this.renderer.setSize(w, h, false);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}
