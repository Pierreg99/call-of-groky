import './style.css';
import * as THREE from 'three';
import { GameRenderer } from './engine/renderer';
import { FpsController } from './player/fpsController';
import { buildArena } from './world/arena';
import { applyEnvironment } from './world/env';
import { CombatEffects } from './combat/effects';
import { createLoadout } from './combat/weapon';
import { createEnemies, spawnEnemyAt, type EnemyTarget } from './enemies/target';
import { loadSoldierAssets } from './enemies/gltfAssets';
import { Hud } from './ui/hud';
import { FpsCounter } from './ui/fps';
import { gameAudio } from './audio/sfx';
import { settingsFor } from './engine/quality';
import { TouchControls, prefersTouchControls } from './ui/touchControls';
import { loadWorldPbrTextures } from './world/materials';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const startBtn = document.getElementById('start-btn') as HTMLButtonElement;

// Apply capture-mode immediately (before async HDRI/GLB) so screenshots never catch overlay
const __CAPTURE_EARLY__ = new URLSearchParams(location.search).get('capture');
if (__CAPTURE_EARLY__) {
  document.documentElement.classList.add('capture-mode');
  document.getElementById('overlay')?.classList.remove('visible');
}

const OBJECTIVE_GOAL = 10;
/** Wave reinforcements: at 5 kills and at 10 kills */
const WAVE_AT_5 = 3;
const WAVE_AT_10 = 4;
const DEFEND_SECONDS = 30;
const TOWER_ZONE_RADIUS = 5.8;
const SETTINGS_KEY = 'cog-settings-v1';

interface PersistedSettings {
  sensitivity: number;
  quality: 'low' | 'medium' | 'high';
}

function loadPersisted(): PersistedSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { sensitivity: 1, quality: detectDefaultQuality() };
    const j = JSON.parse(raw) as Partial<PersistedSettings>;
    const sens = typeof j.sensitivity === 'number' ? j.sensitivity : 1;
    const q = j.quality === 'low' || j.quality === 'medium' || j.quality === 'high' ? j.quality : detectDefaultQuality();
    return { sensitivity: Math.min(2, Math.max(0.3, sens)), quality: q };
  } catch {
    return { sensitivity: 1, quality: detectDefaultQuality() };
  }
}

function detectDefaultQuality(): 'low' | 'medium' | 'high' {
  return settingsFor(
    (() => {
      const cores = navigator.hardwareConcurrency || 4;
      const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
      if (cores <= 4 || mem <= 4) return 'low';
      if (cores >= 8 && mem >= 8) return 'high';
      return 'medium';
    })(),
  ).preset;
}

function savePersisted(s: PersistedSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

async function boot(): Promise<void> {
  const gfx = new GameRenderer(canvas);
  await applyEnvironment(gfx.renderer, gfx.scene);
  await loadWorldPbrTextures();

  const persisted = loadPersisted();
  // URL ?quality= overrides saved preset (captures / benchmarks)
  const urlQEarly = new URLSearchParams(location.search).get('quality');
  const bootQuality =
    urlQEarly === 'low' || urlQEarly === 'medium' || urlQEarly === 'high'
      ? urlQEarly
      : persisted.quality;
  if (bootQuality !== gfx.quality.preset) {
    gfx.setQuality(settingsFor(bootQuality));
    gfx.applyShadowMapSize(gfx.scene);
  }

  const arena = buildArena(gfx.scene, gfx.quality.shadowMapSize);
  const player = new FpsController(gfx.camera, document.body);
  player.setSensitivity(persisted.sensitivity);
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
  const enemies: EnemyTarget[] = createEnemies(
    arena.spawnPoints,
    arena.colliders,
    arena.coverPoints,
    4,
    assets,
  );
  for (const e of enemies) gfx.scene.add(e.mesh);
  let nextEnemyId = enemies.length + 1;

  const worldTargets: THREE.Object3D[] = [];
  arena.root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) worldTargets.push(o);
  });
  loadout.setWorldTargets(worldTargets, enemies);

  const hud = new Hud();
  const fps = new FpsCounter();
  const touchMode = prefersTouchControls();
  let touchUi: TouchControls | null = null;
  let kills = 0;
  let objectiveComplete = false;
  let wave5Done = false;
  let wave10Done = false;
  let phase: 'eliminate' | 'defend' | 'won' = 'eliminate';
  let defendHeld = 0;
  let settingsOpen = false;
  let fKeyHeld = 0;
  let fInspectArmed = false;

  const syncHud = (): void => {
    hud.sync(player, loadout.active, loadout.slot);
    hud.setObjective({
      label: 'SECURE TOWER · ELIMINATE',
      kills,
      goal: OBJECTIVE_GOAL,
      complete: objectiveComplete || phase === 'won',
      phase,
      defendHeld,
      defendGoal: DEFEND_SECONDS,
      inZone: false,
    });
  };
  syncHud();
  hud.setAds(false);
  hud.setSensDisplay(persisted.sensitivity);
  hud.setQualityButtons(gfx.quality.preset);

  const bindEnemyShots = (list: EnemyTarget[]): void => {
    for (const e of list) {
      e.setShotCallback((ev) => {
        if (!player.isLocked || player.state.health <= 0) return;
        player.takeDamage(ev.damage);
        hud.flashDamage();
        syncHud();
        gameAudio.play('hit');
      });
    }
  };
  bindEnemyShots(enemies);

  const spawnWave = (count: number, waveNum: number): void => {
    const spawned: EnemyTarget[] = [];
    for (let i = 0; i < count; i++) {
      const sp = arena.spawnPoints[(nextEnemyId + i) % arena.spawnPoints.length]!.clone();
      // Slight jitter so they don't stack
      sp.x += (Math.random() - 0.5) * 2.5;
      sp.z += (Math.random() - 0.5) * 2.5;
      const e = spawnEnemyAt(nextEnemyId++, sp, arena.colliders, arena.coverPoints, assets);
      e.state = 'chase';
      enemies.push(e);
      gfx.scene.add(e.mesh);
      spawned.push(e);
    }
    bindEnemyShots(spawned);
    loadout.setWorldTargets(worldTargets, enemies);
    hud.showWaveToast(waveNum, count);
    gameAudio.play('kill');
  };

  // Killcam-lite: brief FOV punch + timescale dip
  let killPunch = 0;
  let timeScale = 1;

  loadout.setCallbacks(
    (enemy: EnemyTarget, killed: boolean, damage: number) => {
      hud.showHitmarker();
      const hitPos = enemy.mesh.position.clone();
      hitPos.y += 1.35;
      hud.showDamageNumber(gfx.camera, hitPos, damage, killed);
      if (killed) {
        hud.pushKill(String(enemy.id));
        killPunch = 1;
        timeScale = 0.35;
        kills += 1;
        if (!wave5Done && kills >= 5) {
          wave5Done = true;
          spawnWave(WAVE_AT_5, 2);
        }
        if (!wave10Done && kills >= 10) {
          wave10Done = true;
          spawnWave(WAVE_AT_10, 3);
        }
        if (!objectiveComplete && kills >= OBJECTIVE_GOAL) {
          objectiveComplete = true;
          phase = 'defend';
          defendHeld = 0;
          hud.showPickup('DEFEND THE TOWER · 30s');
        }
        syncHud();
      }
    },
    () => syncHud(),
  );

  let firing = false;
  let adsHeld = false;
  let elapsed = 0;
  const clock = new THREE.Clock();
  const bob = new THREE.Vector3();
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

  function setTouchPlaying(on: boolean): void {
    player.setTouchActive(on);
    touchUi?.setVisible(on && !settingsOpen);
    if (!on) {
      firing = false;
      adsHeld = false;
      loadout.setAds(false);
      hud.setAds(false);
    }
  }

  function beginPlay(): void {
    gameAudio.ensure();
    if (touchMode) {
      setTouchPlaying(true);
      hud.showOverlay(false);
      hud.showSettings(false);
      settingsOpen = false;
    } else {
      player.lock();
    }
  }

  function openSettings(): void {
    settingsOpen = true;
    hud.showSettings(true);
    hud.showOverlay(false);
    firing = false;
    adsHeld = false;
    loadout.setAds(false);
    hud.setAds(false);
    if (touchMode) {
      setTouchPlaying(false);
    } else if (player.isPointerLocked) {
      player.controls.unlock();
    }
  }

  function closeSettings(relock: boolean): void {
    settingsOpen = false;
    hud.showSettings(false);
    if (relock) {
      beginPlay();
    } else {
      hud.showOverlay(true);
      touchUi?.setVisible(false);
    }
  }

  function applyQuality(preset: 'low' | 'medium' | 'high'): void {
    gfx.setQuality(settingsFor(preset));
    gfx.applyShadowMapSize(gfx.scene);
    hud.setQualityButtons(preset);
    persisted.quality = preset;
    savePersisted(persisted);
    loadout.setMotionScale(gfx.motionScale);
  }

  function bindInput(): void {
    if (touchMode) {
      const hint = document.querySelector('#overlay .hint');
      if (hint) {
        hint.textContent =
          'Tap Deploy to start · Left stick move · Right drag look · Icon buttons: fire / ADS (tap toggle or hold) / jump / reload / sprint / switch · Esc/⚙ settings';
      }
      startBtn.textContent = 'TAP TO START';
      document.documentElement.classList.add('touch-ui');
    }

    startBtn.addEventListener('click', () => {
      if (settingsOpen) closeSettings(true);
      else beginPlay();
    });

    const gearBtn = document.getElementById('gear-btn');
    gearBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (settingsOpen) closeSettings(false);
      else openSettings();
    });

    document.getElementById('settings-resume')?.addEventListener('click', () => {
      closeSettings(true);
    });

    const sensSlider = document.getElementById('sens-slider') as HTMLInputElement | null;
    sensSlider?.addEventListener('input', () => {
      const v = parseFloat(sensSlider.value);
      player.setSensitivity(v);
      hud.setSensDisplay(v);
      persisted.sensitivity = v;
      savePersisted(persisted);
    });

    for (const id of ['q-low', 'q-med', 'q-high']) {
      document.getElementById(id)?.addEventListener('click', (ev) => {
        const btn = ev.currentTarget as HTMLElement;
        const q = btn.getAttribute('data-quality');
        if (q === 'low' || q === 'medium' || q === 'high') applyQuality(q);
      });
    }

    player.controls.addEventListener('lock', () => {
      hud.showOverlay(false);
      if (!settingsOpen) hud.showSettings(false);
      gameAudio.ensure();
    });
    player.controls.addEventListener('unlock', () => {
      firing = false;
      adsHeld = false;
      loadout.setAds(false);
      hud.setAds(false);
      // Touch mode never uses PointerLock; ignore spurious unlock
      if (touchMode) return;
      // Esc while playing → settings (not start overlay)
      if (!settingsOpen && !__CAPTURE__) {
        openSettings();
      } else if (!settingsOpen) {
        hud.showOverlay(true);
      }
    });

    document.addEventListener('mousedown', (e) => {
      if (!player.isLocked || settingsOpen) return;
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
      if (!player.isLocked || settingsOpen) return;
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
      if (e.code === 'Escape' && settingsOpen) {
        e.preventDefault();
        closeSettings(false);
        return;
      }
      if (!player.isLocked || settingsOpen) return;
      if (e.code === 'KeyR') loadout.startReload();
      if (e.code === 'KeyF') {
        // Tap F = inspect; long-press tracked in frame via fKeyHeld
        fInspectArmed = true;
        fKeyHeld = 0;
      }
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
    document.addEventListener('keyup', (e) => {
      if (e.code === 'KeyF' && fInspectArmed) {
        // Short tap → inspect; long-press already fired in frame
        if (fKeyHeld < 0.35 && player.isLocked && !settingsOpen) {
          if (loadout.startInspect()) {
            adsHeld = false;
            loadout.setAds(false);
            hud.setAds(false);
            syncHud();
          }
        }
        fInspectArmed = false;
        fKeyHeld = 0;
      }
    });

    if (touchMode) {
      const hudRoot = document.getElementById('hud') ?? document.body;
      touchUi = new TouchControls(hudRoot, {
        onMove: (right, forward) => player.setTouchMove(right, forward),
        onLook: (dx, dy) => player.applyTouchLook(dx, dy),
        onFire: (pressed) => {
          if (!player.isLocked || settingsOpen) {
            firing = false;
            return;
          }
          firing = pressed;
        },
        onAds: (pressed) => {
          if (!player.isLocked || settingsOpen) {
            adsHeld = false;
            loadout.setAds(false);
            hud.setAds(false);
            return;
          }
          adsHeld = pressed;
          loadout.setAds(pressed);
          hud.setAds(pressed);
        },
        onJump: () => {
          if (player.isLocked && !settingsOpen) player.queueTouchJump();
        },
        onReload: () => {
          if (player.isLocked && !settingsOpen) loadout.startReload();
        },
        onSprint: (pressed) => player.setTouchSprint(pressed),
        onSwitch: () => {
          if (!player.isLocked || settingsOpen) return;
          if (loadout.cycle(1)) {
            adsHeld = false;
            loadout.setAds(false);
            hud.setAds(false);
            syncHud();
          }
        },
        onInspect: () => {
          if (!player.isLocked || settingsOpen) return;
          if (loadout.startInspect()) {
            adsHeld = false;
            loadout.setAds(false);
            hud.setAds(false);
            syncHud();
          }
        },
      });
    }
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
      const kick = killPunch * 4 * (1 - loadout.active.adsBlend * 0.85);
      // Compose on weapon hip→ADS FOV (do not fight ADS lerp)
      gfx.camera.fov = loadout.active.getTargetFov() + kick;
      gfx.camera.updateProjectionMatrix();
    }

    const pos = player.object.position;
    gameAudio.setListener(pos.x, pos.y, pos.z);

    if (player.isLocked && !settingsOpen) {
      player.update(dt);
      if (fInspectArmed) {
        fKeyHeld += dt;
        if (fKeyHeld >= 0.35) {
          if (loadout.startInspect()) {
            adsHeld = false;
            loadout.setAds(false);
            hud.setAds(false);
            syncHud();
          }
          fInspectArmed = false;
          fKeyHeld = 0;
        }
      }
      loadout.setAds(adsHeld && !loadout.active.reloading && !loadout.inspecting);
      player.setAdsLookScale(loadout.active.getAdsLookMul());
      hud.setAds(loadout.active.adsBlend > 0.5);
      loadout.tryFire(firing && !loadout.inspecting, dt);
      tryCollectAmmo();
      gameAudio.updateFootsteps(
        dt,
        player.horizontalSpeed > 0.5,
        player.state.sprinting,
        player.state.grounded,
      );

      // Defend tower zone after 10 kills
      if (phase === 'defend') {
        const dx = pos.x - arena.towerCenter.x;
        const dz = pos.z - arena.towerCenter.z;
        const inZone = dx * dx + dz * dz <= TOWER_ZONE_RADIUS * TOWER_ZONE_RADIUS;
        if (inZone) defendHeld = Math.min(DEFEND_SECONDS, defendHeld + dt);
        hud.setZoneHint(true, inZone, defendHeld, DEFEND_SECONDS);
        hud.setObjective({
          label: 'DEFEND TOWER',
          kills,
          goal: OBJECTIVE_GOAL,
          complete: false,
          phase: 'defend',
          defendHeld,
          defendGoal: DEFEND_SECONDS,
          inZone,
        });
        if (defendHeld >= DEFEND_SECONDS) {
          phase = 'won';
          hud.setZoneHint(false, false, DEFEND_SECONDS, DEFEND_SECONDS);
          hud.showWin(true);
          hud.showPickup('TOWER SECURED');
          hud.setObjective({
            label: 'MISSION COMPLETE',
            kills,
            goal: OBJECTIVE_GOAL,
            complete: true,
            phase: 'won',
            defendHeld: DEFEND_SECONDS,
            defendGoal: DEFEND_SECONDS,
          });
          gameAudio.play('kill');
        }
      }
    } else {
      player.setAdsLookScale(1);
      if (phase === 'defend') {
        hud.setZoneHint(true, false, defendHeld, DEFEND_SECONDS);
      }
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
    hud.updateMinimap(
      gfx.camera,
      pos,
      arena.objectivePoint,
      enemies.map((e) => ({
        x: e.mesh.position.x,
        z: e.mesh.position.z,
        alive: e.alive && e.mesh.visible,
      })),
    );
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
    gfx.applyShadowMapSize(gfx.scene);
    hud.setQualityButtons(forceQuality);
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
        enemies[0].state = 'shoot';
        enemies[0].snapFaceToward(player.object.position);
        for (let i = 0; i < 28; i++) enemies[0].update(1 / 30, 1 + i / 30, player.object.position, true);
        enemies[0].snapFaceToward(player.object.position);
      }
      if (enemies[1]) {
        enemies[1].mesh.position.set(14.2, 0, -13.5);
        enemies[1].state = 'cover';
        enemies[1].snapFaceToward(player.object.position);
        for (let i = 0; i < 28; i++) enemies[1].update(1 / 30, 1 + i / 30, player.object.position, true);
        enemies[1].snapFaceToward(player.object.position);
      }
      if (enemies[2]) {
        enemies[2].mesh.position.set(9.5, 0, -12.5);
        enemies[2].state = 'chase';
        enemies[2].snapFaceToward(player.object.position);
        for (let i = 0; i < 20; i++) enemies[2].update(1 / 30, 1 + i / 30, player.object.position, true);
        enemies[2].snapFaceToward(player.object.position);
      }
    }
    if (__CAPTURE__ === 'combat') {
      // Close combat: player slightly elevated, enemies between camera and mid-ground, facing camera
      player.object.position.set(3.2, 1.72, 9.2);
      gfx.camera.rotation.set(-0.08, 0.02, 0);
      loadout.select(2);
      syncHud();
      kills = 3;
      syncHud();
    }
    if (__CAPTURE__ === 'hud') {
      player.object.position.set(2, 1.7, 4);
      gfx.camera.rotation.set(-0.05, -0.2, 0);
      kills = 4;
      syncHud();
    }
    if (__CAPTURE__ === 'defend') {
      player.object.position.set(12, 1.7, -16.5);
      gfx.camera.rotation.set(-0.12, 0.05, 0);
      kills = 10;
      objectiveComplete = true;
      phase = 'defend';
      defendHeld = 18;
      syncHud();
      hud.setZoneHint(true, true, defendHeld, DEFEND_SECONDS);
      hud.setObjective({
        label: 'DEFEND TOWER',
        kills,
        goal: OBJECTIVE_GOAL,
        complete: false,
        phase: 'defend',
        defendHeld,
        defendGoal: DEFEND_SECONDS,
        inZone: true,
      });
    }
    if (__CAPTURE__ === 'tower') {
      player.object.position.set(12, 4.9, -16.5);
      gfx.camera.rotation.set(-0.18, 0.05, 0);
      if (enemies[0]) {
        enemies[0].mesh.position.set(13.5, 3.55, -18.5);
        enemies[0].state = 'cover';
        enemies[0].snapFaceToward(player.object.position);
        for (let i = 0; i < 30; i++) enemies[0].update(1 / 30, 1 + i / 30, player.object.position, true);
        enemies[0].snapFaceToward(player.object.position);
      }
    }
    const steps = __CAPTURE__ === 'combat' ? 20 : 60;
    for (let i = 0; i < steps; i++) {
      const dt = 1 / 30;
      elapsed += dt;
      for (const e of enemies) e.update(dt, elapsed, player.object.position, true);
    }
    if (__CAPTURE__ === 'combat') {
      // Place AFTER warmup; force frontal silhouettes (chest accent / helmet toward camera)
      const poseCombat = (
        e: EnemyTarget,
        x: number,
        z: number,
        state: 'shoot' | 'cover' | 'chase',
        pose: 'aim' | 'cover' | 'walk',
        iters: number,
      ): void => {
        e.mesh.position.set(x, 0, z);
        e.state = state;
        e.snapFaceToward(player.object.position);
        for (let i = 0; i < iters; i++) {
          e.update(1 / 24, 2.5 + i / 24, player.object.position, true);
        }
        e.mesh.position.set(x, 0, z);
        e.snapFaceToward(player.object.position);
        e.snapPose(pose);
      };
      if (enemies[0]) poseCombat(enemies[0], 3.2, 6.2, 'shoot', 'aim', 40);
      if (enemies[1]) poseCombat(enemies[1], 5.1, 5.5, 'cover', 'cover', 28);
      if (enemies[2]) poseCombat(enemies[2], 1.5, 5.0, 'shoot', 'aim', 28);
      hud.showDamageNumber(
        gfx.camera,
        new THREE.Vector3(3.2, 1.45, 6.2),
        18,
        false,
      );
    }
    hud.updateCompass(gfx.camera, player.object.position, arena.objectivePoint);
    hud.updateMinimap(
      gfx.camera,
      player.object.position,
      arena.objectivePoint,
      enemies.map((e) => ({
        x: e.mesh.position.x,
        z: e.mesh.position.z,
        alive: e.alive && e.mesh.visible,
      })),
    );
    (window as unknown as { __COG_READY__?: boolean }).__COG_READY__ = true;
  }

  (window as unknown as { __COG_FPS__?: FpsCounter }).__COG_FPS__ = fps;

  requestAnimationFrame(frame);

  console.info(
    `%cCall of Groky%c loop8 quality=${gfx.quality.preset} aa=${gfx.quality.postAA} bloom=${gfx.quality.bloom} ssao=${gfx.quality.ssao} gltf=${assets.ok} weapons=${loadout.weapons.length} enemies=${enemies.length} sens=${persisted.sensitivity}`,
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
