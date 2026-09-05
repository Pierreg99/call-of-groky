import './style.css';
import * as THREE from 'three';
import { GameRenderer } from './engine/renderer';
import { FpsController } from './player/fpsController';
import { buildArena } from './world/arena';
import { applyEnvironment } from './world/env';
import { CombatEffects } from './combat/effects';
import { createLoadout } from './combat/weapon';
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

const OBJECTIVE_GOAL = 10;

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
  const loadout = createLoadout(gfx.camera, effects, assets);
  loadout.setMotionScale(gfx.motionScale);
  const enemies = createEnemies(arena.spawnPoints, arena.colliders, arena.coverPoints, 4, assets);
  for (const e of enemies) gfx.scene.add(e.mesh);

  const worldTargets: THREE.Object3D[] = [];
  arena.root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) worldTargets.push(o);
  });
  loadout.setWorldTargets(worldTargets, enemies);

  const hud = new Hud();
  const fps = new FpsCounter();
  let kills = 0;
  let objectiveComplete = false;

  const syncHud = (): void => {
    hud.sync(player, loadout.active, loadout.slot);
    hud.setObjective({
      label: 'SECURE TOWER · ELIMINATE',
      kills,
      goal: OBJECTIVE_GOAL,
      complete: objectiveComplete,
    });
  };
  syncHud();
  hud.setAds(false);

  // Killcam-lite: brief FOV punch + timescale dip
  let killPunch = 0;
  let timeScale = 1;

  loadout.setCallbacks(
    (enemy: EnemyTarget, killed: boolean) => {
      hud.showHitmarker();
      if (killed) {
        hud.pushKill(String(enemy.id));
        killPunch = 1;
        timeScale = 0.35;
        kills += 1;
        if (!objectiveComplete && kills >= OBJECTIVE_GOAL) {
          objectiveComplete = true;
          hud.showPickup('OBJECTIVE COMPLETE');
        }
        syncHud();
      }
    },
    () => syncHud(),
  );

  for (const e of enemies) {
    e.setShotCallback((ev) => {
      if (!player.isLocked || player.state.health <= 0) return;
      player.takeDamage(ev.damage);
      hud.flashDamage();
      syncHud();
      gameAudio.play('hit');
    });
  }

  let firing = false;
  let adsHeld = false;
  let elapsed = 0;
  const clock = new THREE.Clock();
  const bob = new THREE.Vector3();
  const baseFov = { hip: 75 };
  const pickupRadius = 1.35;

  function tryCollectAmmo(): void {
    const pos = player.object.position;
    for (const p of arena.ammoPickups) {
      if (p.taken) continue;
      const dx = pos.x - p.position.x;
      const dz = pos.z - p.position.z;
      const dy = pos.y - (p.position.y + 1.0);
      if (dx * dx + dz * dz + dy * dy * 0.25 > pickupRadius * pickupRadius) continue;
      const taken = loadout.collectAmmo(p.amount);
      if (taken <= 0) continue;
      p.taken = true;
      p.mesh.visible = false;
      hud.showPickup(`+${taken} AMMO`);
      gameAudio.play('reload');
      syncHud();
    }
  }

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
      loadout.setAds(false);
      hud.setAds(false);
    });

    document.addEventListener('mousedown', (e) => {
      if (!player.isLocked) return;
      if (e.button === 0) firing = true;
      if (e.button === 2) {
        adsHeld = true;
        loadout.setAds(true);
        hud.setAds(true);
      }
    });
    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) firing = false;
      if (e.button === 2) {
        adsHeld = false;
        loadout.setAds(false);
        hud.setAds(false);
      }
    });
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('wheel', (e) => {
      if (!player.isLocked) return;
      e.preventDefault();
      if (loadout.cycle(e.deltaY > 0 ? 1 : -1)) {
        adsHeld = false;
        loadout.setAds(false);
        hud.setAds(false);
        syncHud();
      }
    }, { passive: false });
    document.addEventListener('keydown', (e) => {
      if (e.code === 'F3' || e.code === 'Backquote') {
        e.preventDefault();
        fps.toggle();
        return;
      }
      if (!player.isLocked) return;
      if (e.code === 'KeyR') loadout.startReload();
      if (e.code === 'Digit1' || e.code === 'Numpad1') {
        if (loadout.select(1)) {
          adsHeld = false;
          syncHud();
        }
      }
      if (e.code === 'Digit2' || e.code === 'Numpad2') {
        if (loadout.select(2)) {
          adsHeld = false;
          syncHud();
        }
      }
    });
  }

  function frame(): void {
    const rawDt = Math.min(0.05, clock.getDelta());
    fps.update(rawDt);

    if (timeScale < 1) {
      timeScale = Math.min(1, timeScale + rawDt * 1.8);
    }
    const dt = rawDt * timeScale;
    elapsed += dt;

    if (killPunch > 0) {
      killPunch = Math.max(0, killPunch - rawDt * 2.2);
      const kick = killPunch * 4;
      if (loadout.active.adsBlend < 0.5) {
        gfx.camera.fov = baseFov.hip + kick;
        gfx.camera.updateProjectionMatrix();
      }
    }

    const pos = player.object.position;
    gameAudio.setListener(pos.x, pos.y, pos.z);

    if (player.isLocked) {
      player.update(dt);
      loadout.setAds(adsHeld && !loadout.active.reloading);
      hud.setAds(loadout.active.adsBlend > 0.5);
      loadout.tryFire(firing, dt);
      tryCollectAmmo();
      gameAudio.updateFootsteps(
        dt,
        player.horizontalSpeed > 0.5,
        player.state.sprinting,
        player.state.grounded,
      );
    }

    player.getBobOffset(bob);
    if (gfx.motionScale < 1) bob.multiplyScalar(gfx.motionScale);
    loadout.update(dt, bob, player.isLocked);
    effects.update(dt);

    const playerAlive = player.state.health > 0;
    if (!__CAPTURE__) {
      for (const e of enemies) e.update(dt, elapsed, pos, playerAlive);
    }

    hud.setFiring(firing && player.isLocked);
    hud.updateCompass(gfx.camera, pos, arena.objectivePoint);
    hud.update(dt);

    // Subtle ammo crate bob
    for (const p of arena.ammoPickups) {
      if (p.taken) continue;
      p.mesh.position.y = p.position.y + Math.sin(elapsed * 2.2 + p.position.x) * 0.04;
      p.mesh.rotation.y = elapsed * 0.6;
    }

    gfx.render();
    requestAnimationFrame(frame);
  }

  bindInput();
  hud.showOverlay(true);

  const params = new URLSearchParams(location.search);
  const __CAPTURE__ = params.get('capture');
  const forceQuality = params.get('quality');
  if (forceQuality === 'low' || forceQuality === 'medium' || forceQuality === 'high') {
    gfx.setQuality(settingsFor(forceQuality));
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
      // Courtyard mid → control tower façade (readable landmark composition)
      player.object.position.set(7.5, 2.05, -4.5);
      gfx.camera.rotation.set(-0.1, 0.28, 0);
      if (enemies[0]) {
        enemies[0].mesh.position.set(11.5, 0, -14.0);
        enemies[0].mesh.rotation.y = Math.PI + 0.35;
        enemies[0].state = 'shoot';
        for (let i = 0; i < 28; i++) enemies[0].update(1 / 30, 1 + i / 30, player.object.position, true);
      }
      if (enemies[1]) {
        enemies[1].mesh.position.set(14.2, 0, -13.5);
        enemies[1].mesh.rotation.y = Math.PI - 0.2;
        enemies[1].state = 'cover';
        for (let i = 0; i < 28; i++) enemies[1].update(1 / 30, 1 + i / 30, player.object.position, true);
      }
      if (enemies[2]) {
        enemies[2].mesh.position.set(9.5, 0, -12.5);
        enemies[2].mesh.rotation.y = Math.PI + 0.1;
        enemies[2].state = 'chase';
        for (let i = 0; i < 20; i++) enemies[2].update(1 / 30, 1 + i / 30, player.object.position, true);
      }
    }
    if (__CAPTURE__ === 'combat') {
      player.object.position.set(4.0, 1.65, 8.5);
      gfx.camera.rotation.set(-0.06, 0.08, 0);
      // Show SMG in combat shot for dual-weapon identity
      loadout.select(2);
      syncHud();
    }
    if (__CAPTURE__ === 'hud') {
      player.object.position.set(2, 1.7, 4);
      gfx.camera.rotation.set(-0.05, -0.2, 0);
      kills = 4;
      syncHud();
    }
    if (__CAPTURE__ === 'tower') {
      // Deck-level composition looking out over aisle + consoles
      player.object.position.set(12, 4.9, -16.5);
      gfx.camera.rotation.set(-0.18, 0.05, 0);
      if (enemies[0]) {
        enemies[0].mesh.position.set(13.5, 3.55, -18.5);
        enemies[0].mesh.rotation.y = Math.PI + 0.4;
        enemies[0].state = 'cover';
        for (let i = 0; i < 30; i++) enemies[0].update(1 / 30, 1 + i / 30, player.object.position, true);
      }
    }
    const steps = __CAPTURE__ === 'combat' ? 30 : 60;
    for (let i = 0; i < steps; i++) {
      const dt = 1 / 30;
      elapsed += dt;
      for (const e of enemies) e.update(dt, elapsed, player.object.position, true);
    }
    if (__CAPTURE__ === 'combat' && enemies[0]) {
      enemies[0].mesh.position.set(4.2, 0, 5.0);
      enemies[0].mesh.rotation.y = Math.PI;
      enemies[0].state = 'shoot';
      for (let i = 0; i < 45; i++) enemies[0].update(1 / 20, 2 + i / 20, player.object.position, true);
      if (enemies[1]) {
        enemies[1].mesh.position.set(6.0, 0, 4.2);
        enemies[1].mesh.rotation.y = Math.PI + 0.35;
        enemies[1].state = 'cover';
        for (let i = 0; i < 20; i++) enemies[1].update(1 / 30, 2 + i / 30, player.object.position, true);
      }
      if (enemies[2]) {
        enemies[2].mesh.position.set(2.4, 0, 3.5);
        enemies[2].mesh.rotation.y = Math.PI - 0.4;
        enemies[2].state = 'chase';
        for (let i = 0; i < 20; i++) enemies[2].update(1 / 30, 2 + i / 30, player.object.position, true);
      }
    }
    hud.updateCompass(gfx.camera, player.object.position, arena.objectivePoint);
    (window as unknown as { __COG_READY__?: boolean }).__COG_READY__ = true;
  }

  (window as unknown as { __COG_FPS__?: FpsCounter }).__COG_FPS__ = fps;

  requestAnimationFrame(frame);

  console.info(
    `%cCall of Groky%c loop6 quality=${gfx.quality.preset} aa=${gfx.quality.postAA} bloom=${gfx.quality.bloom} ssao=${gfx.quality.ssao} gltf=${assets.ok} weapons=${loadout.weapons.length}`,
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
