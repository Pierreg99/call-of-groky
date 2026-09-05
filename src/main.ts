import './style.css';
import * as THREE from 'three';
import { GameRenderer } from './engine/renderer';
import { FpsController } from './player/fpsController';
import { buildArena } from './world/arena';
import { applyEnvironment } from './world/env';
import { CombatEffects } from './combat/effects';
import { Rifle } from './combat/weapon';
import { createEnemies, type EnemyTarget } from './enemies/target';
import { loadSoldierAssets } from './enemies/gltfAssets';
import { Hud } from './ui/hud';
import { FpsCounter } from './ui/fps';
import { gameAudio } from './audio/sfx';
import { settingsFor } from './engine/quality';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const startBtn = document.getElementById('start-btn') as HTMLButtonElement;

// Apply capture-mode immediately (before async HDRI/GLB) so screenshots never catch overlay
const __CAPTURE_EARLY__ = new URLSearchParams(location.search).get('capture');
if (__CAPTURE_EARLY__) {
  document.documentElement.classList.add('capture-mode');
  document.getElementById('overlay')?.classList.remove('visible');
}


async function boot(): Promise<void> {
  const gfx = new GameRenderer(canvas);
  await applyEnvironment(gfx.renderer, gfx.scene);

  const arena = buildArena(gfx.scene, gfx.quality.shadowMapSize);
  const player = new FpsController(gfx.camera, document.body);
  player.setColliders(arena.colliders);
  player.setFloors(arena.floors);
  gfx.scene.add(player.object);

  if (!gfx.camera.parent) {
    gfx.scene.add(gfx.camera);
  }

  const assets = await loadSoldierAssets();
  const effects = new CombatEffects(gfx.scene);
  const weapon = new Rifle(gfx.camera, effects);
  weapon.setMotionScale(gfx.motionScale);
  const enemies = createEnemies(arena.spawnPoints, arena.colliders, arena.coverPoints, 4, assets);
  for (const e of enemies) gfx.scene.add(e.mesh);

  const worldTargets: THREE.Object3D[] = [];
  arena.root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) worldTargets.push(o);
  });
  weapon.setWorldTargets(worldTargets, enemies);

  const hud = new Hud();
  const fps = new FpsCounter();
  hud.sync(player, weapon);
  hud.setAds(false);

  // Killcam-lite: brief FOV punch + timescale dip
  let killPunch = 0;
  let timeScale = 1;

  weapon.setCallbacks(
    (enemy: EnemyTarget, killed: boolean) => {
      hud.showHitmarker();
      if (killed) {
        hud.pushKill(String(enemy.id));
        killPunch = 1;
        timeScale = 0.35;
      }
    },
    () => hud.sync(player, weapon),
  );

  for (const e of enemies) {
    e.setShotCallback((ev) => {
      if (!player.isLocked || player.state.health <= 0) return;
      player.takeDamage(ev.damage);
      hud.flashDamage();
      hud.sync(player, weapon);
      gameAudio.play('hit');
    });
  }

  let firing = false;
  let adsHeld = false;
  let elapsed = 0;
  const clock = new THREE.Clock();
  const bob = new THREE.Vector3();
  const baseFov = { hip: 75 };

  function bindInput(): void {
    startBtn.addEventListener('click', () => {
      gameAudio.ensure();
      player.lock();
    });

    player.controls.addEventListener('lock', () => {
      hud.showOverlay(false);
      gameAudio.ensure();
    });
    player.controls.addEventListener('unlock', () => {
      hud.showOverlay(true);
      firing = false;
      adsHeld = false;
      weapon.setAds(false);
      hud.setAds(false);
    });

    document.addEventListener('mousedown', (e) => {
      if (!player.isLocked) return;
      if (e.button === 0) firing = true;
      if (e.button === 2) {
        adsHeld = true;
        weapon.setAds(true);
        hud.setAds(true);
      }
    });
    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) firing = false;
      if (e.button === 2) {
        adsHeld = false;
        weapon.setAds(false);
        hud.setAds(false);
      }
    });
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('keydown', (e) => {
      if (e.code === 'F3' || e.code === 'Backquote') {
        e.preventDefault();
        fps.toggle();
        return;
      }
      if (!player.isLocked) return;
      if (e.code === 'KeyR') weapon.startReload();
    });
  }

  function frame(): void {
    const rawDt = Math.min(0.05, clock.getDelta());
    fps.update(rawDt);

    // Recover timescale after killcam punch
    if (timeScale < 1) {
      timeScale = Math.min(1, timeScale + rawDt * 1.8);
    }
    const dt = rawDt * timeScale;
    elapsed += dt;

    if (killPunch > 0) {
      killPunch = Math.max(0, killPunch - rawDt * 2.2);
      // FOV kick punch
      const kick = killPunch * 4;
      if (weapon.adsBlend < 0.5) {
        gfx.camera.fov = baseFov.hip + kick;
        gfx.camera.updateProjectionMatrix();
      }
    }

    const pos = player.object.position;
    gameAudio.setListener(pos.x, pos.y, pos.z);

    if (player.isLocked) {
      player.update(dt);
      weapon.setAds(adsHeld && !weapon.reloading);
      hud.setAds(weapon.adsBlend > 0.5);
      weapon.tryFire(firing, dt);
      gameAudio.updateFootsteps(
        dt,
        player.horizontalSpeed > 0.5,
        player.state.sprinting,
        player.state.grounded,
      );
    }

    player.getBobOffset(bob);
    if (gfx.motionScale < 1) bob.multiplyScalar(gfx.motionScale);
    weapon.update(dt, bob, player.isLocked);
    effects.update(dt);

    const playerAlive = player.state.health > 0;
    if (!__CAPTURE__) {
      for (const e of enemies) e.update(dt, elapsed, pos, playerAlive);
    }

    hud.setFiring(firing && player.isLocked);
    hud.update(dt);

    gfx.render();
    requestAnimationFrame(frame);
  }

  bindInput();
  hud.showOverlay(true);

  // Critic capture: ?capture=mid|combat|hud forces camera/HUD for screenshots
  // Optional: ?quality=low&fps=1 to force low preset + FPS overlay for perf notes
  const params = new URLSearchParams(location.search);
  const __CAPTURE__ = params.get('capture');
  const forceQuality = params.get('quality');
  if (forceQuality === 'low' || forceQuality === 'medium' || forceQuality === 'high') {
    gfx.setQuality(settingsFor(forceQuality));
    // Re-apply shadow map size on sun if present
    gfx.scene.traverse((o) => {
      const l = o as THREE.DirectionalLight;
      if (l.isDirectionalLight && l.castShadow) {
        l.shadow.mapSize.set(gfx.quality.shadowMapSize, gfx.quality.shadowMapSize);
        if (l.shadow.map) {
          l.shadow.map.dispose();
          (l.shadow as THREE.LightShadow & { map: null }).map = null;
        }
      }
    });
  }
  if (params.get('fps') === '1') fps.toggle();

  if (__CAPTURE__) {
    document.documentElement.classList.add('capture-mode');
    hud.showOverlay(false);
    if (__CAPTURE__ === 'mid') {
      player.object.position.set(0, 1.7, 6);
      gfx.camera.rotation.set(-0.08, 0.35, 0);
      if (enemies[0]) {
        enemies[0].mesh.position.set(4.5, 0, 1.5);
        enemies[0].mesh.rotation.y = -0.8;
        enemies[0].state = 'patrol';
      }
    }
    if (__CAPTURE__ === 'combat') {
      player.object.position.set(4.0, 1.65, 8.5);
      gfx.camera.rotation.set(-0.06, 0.08, 0);
    }
    if (__CAPTURE__ === 'hud') {
      player.object.position.set(2, 1.7, 4);
      gfx.camera.rotation.set(-0.05, -0.2, 0);
    }
    const steps = __CAPTURE__ === 'combat' ? 30 : 60;
    for (let i = 0; i < steps; i++) {
      const dt = 1 / 30;
      elapsed += dt;
      for (const e of enemies) e.update(dt, elapsed, player.object.position, true);
    }
    if (__CAPTURE__ === 'combat' && enemies[0]) {
      enemies[0].mesh.position.set(4.2, 0, 5.0);
      enemies[0].mesh.rotation.y = 0;
      enemies[0].state = 'shoot';
      if (enemies[1]) {
        enemies[1].mesh.position.set(6.0, 0, 4.2);
        enemies[1].mesh.rotation.y = 0.35;
        enemies[1].state = 'cover';
      }
      if (enemies[2]) {
        enemies[2].mesh.position.set(2.4, 0, 3.5);
        enemies[2].mesh.rotation.y = -0.4;
        enemies[2].state = 'chase';
      }
    }
    (window as unknown as { __COG_READY__?: boolean }).__COG_READY__ = true;
  }

  (window as unknown as { __COG_FPS__?: FpsCounter }).__COG_FPS__ = fps;

  requestAnimationFrame(frame);

  console.info(
    `%cCall of Groky%c loop4 quality=${gfx.quality.preset} aa=${gfx.quality.postAA} bloom=${gfx.quality.bloom} ssao=${gfx.quality.ssao} gltf=${assets.ok}`,
    'color:#5ce1ff;font-weight:bold',
    'color:#8899aa',
  );
}

void boot().catch((err) => {
  console.error('[boot] failed', err);
  (window as unknown as { __COG_READY__?: boolean }).__COG_READY__ = true;
});

if (new URLSearchParams(location.search).has('capture')) {
  setTimeout(() => {
    const w = window as unknown as { __COG_READY__?: boolean };
    if (!w.__COG_READY__) {
      console.warn('[capture] force ready');
      w.__COG_READY__ = true;
    }
  }, 10000);
}
