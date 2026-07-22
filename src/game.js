import { AudioEngine } from './audio.js';
import { CAMPAIGN_END, WORLDS, formatScore, worldIndexForDistance } from './config.js';
import { TunnelRenderer } from './renderer.js';
import { loadHighScore, loadSettings, markTutorialSeen, saveHighScore, saveSettings, tutorialSeen } from './storage.js';
import { TrackGenerator, classifyPass, normalizeAngle } from './track.js';

const FIXED_STEP = 1 / 120;

export class DraughtRider {
  constructor(canvas) {
    this.canvas = canvas;
    this.settings = loadSettings();
    this.highScore = loadHighScore();
    this.renderer = new TunnelRenderer(canvas, this.settings);
    this.audio = new AudioEngine(this.settings);
    this.input = new InputController(canvas, () => this.togglePause());
    this.state = null;
    this.generator = null;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.animationFrame = 0;
    this.toastTimer = 0;
    this.worldCardTimer = 0;
    this.calloutTimer = 0;
    this.ui = this.collectUi();
  }

  collectUi() {
    const ids = [
      'loading-screen', 'loading-progress', 'menu-screen', 'menu-highscore', 'how-screen',
      'start-button', 'how-button', 'settings-button', 'settings-screen', 'music-range',
      'sfx-range', 'motion-toggle', 'control-select', 'hud', 'hud-world', 'score', 'multiplier', 'speed-label',
      'boost-fill', 'stability-bars', 'campaign-progress', 'audio-button', 'pause-button',
      'pause-screen', 'resume-button', 'restart-pause-button', 'settings-pause-button', 'menu-pause-button',
      'gameover-screen', 'final-score', 'final-distance', 'final-gates', 'final-combo',
      'result-kicker', 'result-title', 'new-best', 'restart-button', 'menu-button',
      'world-card', 'world-index', 'world-kicker', 'world-title', 'world-copy',
      'combo-callout', 'flash', 'toast'
    ];
    return Object.fromEntries(ids.map((id) => [toCamel(id), document.getElementById(id)]));
  }

  async boot() {
    this.bindUi();
    this.ui.menuHighscore.textContent = formatScore(this.highScore);
    this.ui.audioButton.textContent = this.settings.muted ? '×' : '♫';
    await this.renderer.load((value) => {
      this.ui.loadingProgress.style.width = Math.round(value * 100) + '%';
    });
    await new Promise((resolve) => setTimeout(resolve, 280));
    this.showOnly('menuScreen');
    this.ui.loadingScreen.classList.remove('screen--active');
    document.querySelector('.site-footer').style.display = '';
    this.animationFrame = requestAnimationFrame((time) => this.frame(time));
  }

  bindUi() {
    this.ui.startButton.addEventListener('click', () => this.start());
    this.ui.howButton.addEventListener('click', () => this.ui.howScreen.classList.add('screen--active'));
    this.ui.settingsButton.addEventListener('click', () => this.openSettings());
    this.ui.settingsPauseButton.addEventListener('click', () => this.openSettings());
    document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => {
      document.getElementById(button.dataset.close).classList.remove('screen--active');
    }));
    this.ui.pauseButton.addEventListener('click', () => this.pause());
    this.ui.resumeButton.addEventListener('click', () => this.resume());
    this.ui.restartPauseButton.addEventListener('click', () => this.start());
    this.ui.menuPauseButton.addEventListener('click', () => this.toMenu());
    this.ui.restartButton.addEventListener('click', () => this.start());
    this.ui.menuButton.addEventListener('click', () => this.toMenu());
    this.ui.audioButton.addEventListener('click', () => {
      const muted = this.audio.toggleMute();
      this.ui.audioButton.textContent = muted ? '×' : '♫';
      this.ui.audioButton.setAttribute('aria-label', muted ? 'Audio einschalten' : 'Audio stummschalten');
      saveSettings(this.settings);
    });
    this.ui.musicRange.addEventListener('input', () => this.updateSettings());
    this.ui.sfxRange.addEventListener('input', () => this.updateSettings());
    this.ui.motionToggle.addEventListener('change', () => this.updateSettings());
    this.ui.controlSelect.addEventListener('change', () => this.updateSettings());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state?.mode === 'playing') this.pause();
    });
  }

  async start() {
    this.generator = new TrackGenerator((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
    this.state = {
      mode: 'playing',
      distance: 0,
      score: 0,
      speed: WORLDS[0].speed,
      boost: 100,
      stability: 3,
      angle: -Math.PI / 2,
      angularVelocity: 0,
      multiplier: 1,
      maxMultiplier: 1,
      gates: 0,
      nearMisses: 0,
      objects: [],
      hitTimer: 0,
      runTime: 0,
      worldIndex: 0,
      zone: 0,
      endless: false,
      renderDelta: 0.016,
      tutorialStep: tutorialSeen() ? 99 : 0
    };
    this.state.objects.push(...this.generator.fill(0));
    this.input.reset();
    this.hideScreens();
    this.ui.hud.classList.add('hud--active');
    document.querySelector('.site-footer').style.display = 'none';
    this.showWorld(0);
    await this.audio.start();
    this.audio.sfx('world');
    this.lastTime = performance.now();
    this.accumulator = 0;
  }

  update(dt) {
    const state = this.state;
    if (!state || state.mode !== 'playing') return;
    state.runTime += dt;
    state.hitTimer = Math.max(0, state.hitTimer - dt);
    state.renderDelta = dt;

    this.updateSteering(dt);
    const world = WORLDS[worldIndexForDistance(state.distance)];
    const endlessRamp = state.distance > CAMPAIGN_END ? Math.min(38, (state.distance - CAMPAIGN_END) / 240) : 0;
    const boosting = this.input.boost && state.boost > 0.5;
    const braking = this.input.brake;
    let targetSpeed = world.speed + endlessRamp;
    if (boosting) {
      targetSpeed += 48;
      state.boost = Math.max(0, state.boost - dt * 24);
    } else {
      state.boost = Math.min(100, state.boost + dt * (braking ? 12 : 7));
    }
    if (braking) targetSpeed -= 28;
    state.speed += (targetSpeed - state.speed) * Math.min(1, dt * 3.4);
    state.distance += state.speed * dt;
    state.score += state.speed * dt * 0.17 * state.multiplier;

    state.objects.push(...this.generator.fill(state.distance));
    for (const object of state.objects) {
      if (!object.processed && object.distance - state.distance <= 24) {
        object.processed = true;
        this.resolveObject(object);
      }
    }
    state.objects = state.objects.filter((object) => object.distance > state.distance - 180);

    const zone = state.distance < CAMPAIGN_END ? Math.floor(state.distance / 2800) : 3 + Math.floor((state.distance - CAMPAIGN_END) / 2200);
    if (zone !== state.zone) {
      state.zone = zone;
      if (zone < 3) this.showWorld(zone);
      else if (zone === 3) this.showEndless();
      else this.showWorld(worldIndexForDistance(state.distance), 'ENDLESS SEKTOR ' + String(zone - 2).padStart(2, '0'));
    }
    state.worldIndex = worldIndexForDistance(state.distance);
    state.endless = state.distance >= CAMPAIGN_END;
    this.audio.setIntensity(Math.min(1, (state.speed - 70) / 70));
    this.updateTutorial();
    this.updateHud();
  }

  updateSteering(dt) {
    const state = this.state;
    const keyboard = this.settings.control === 'pointer' ? 0 : (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
    if (keyboard !== 0) {
      state.angularVelocity += keyboard * dt * 9.5;
      this.input.pointerActive = false;
    } else {
      state.angularVelocity *= Math.pow(0.04, dt);
    }
    state.angularVelocity = Math.max(-3.15, Math.min(3.15, state.angularVelocity));
    state.angle = normalizeAngle(state.angle + state.angularVelocity * dt);
    if (this.input.pointerActive && this.settings.control !== 'keyboard') {
      const difference = normalizeAngle(this.input.pointerAngle - state.angle);
      state.angle = normalizeAngle(state.angle + difference * Math.min(1, dt * 8.5));
    }
  }

  openSettings() {
    this.ui.musicRange.value = String(Math.round(this.settings.music * 100));
    this.ui.sfxRange.value = String(Math.round(this.settings.sfx * 100));
    this.ui.motionToggle.checked = this.settings.reducedMotion;
    this.ui.controlSelect.value = this.settings.control;
    this.ui.settingsScreen.classList.add('screen--active');
  }

  updateSettings() {
    this.settings.music = Number(this.ui.musicRange.value) / 100;
    this.settings.sfx = Number(this.ui.sfxRange.value) / 100;
    this.settings.reducedMotion = this.ui.motionToggle.checked;
    this.settings.control = this.ui.controlSelect.value;
    this.audio.applySettings();
    saveSettings(this.settings);
  }

  resolveObject(object) {
    const result = classifyPass(object, this.state.angle);
    if (result === 'perfect') {
      this.state.gates += 1;
      this.state.multiplier = Math.min(8, this.state.multiplier + 0.25);
      this.state.maxMultiplier = Math.max(this.state.maxMultiplier, this.state.multiplier);
      this.state.score += 250 * this.state.multiplier;
      this.state.boost = Math.min(100, this.state.boost + 5);
      this.renderer.emit('gate', object.angle);
      this.audio.sfx('gate');
      this.callout(this.state.multiplier >= 4 ? 'MAXIMUM FLOW' : 'PERFECT FLOW');
    } else if (result === 'charge') {
      this.state.boost = Math.min(100, this.state.boost + 32);
      this.state.score += 120 * this.state.multiplier;
      this.renderer.emit('charge', object.angle);
      this.audio.sfx('charge');
      this.callout('BOOST +32');
    } else if (result === 'near') {
      this.state.nearMisses += 1;
      this.state.multiplier = Math.min(8, this.state.multiplier + 0.15);
      this.state.maxMultiplier = Math.max(this.state.maxMultiplier, this.state.multiplier);
      this.state.score += 160 * this.state.multiplier;
      this.renderer.emit('gate', object.angle);
      this.audio.sfx('near');
      this.callout('CLOSE FLOW +160');
    } else if (result === 'hit') {
      this.hit(object.angle);
    }
  }

  hit(angle) {
    if (this.state.hitTimer > 0) return;
    this.state.stability -= 1;
    this.state.multiplier = 1;
    this.state.speed *= 0.62;
    this.state.boost = Math.max(0, this.state.boost - 22);
    this.state.hitTimer = 1.15;
    this.renderer.emit('hit', angle);
    this.audio.sfx('hit');
    this.ui.flash.classList.remove('hit');
    void this.ui.flash.offsetWidth;
    this.ui.flash.classList.add('hit');
    this.callout(this.state.stability ? 'STRÖMUNG KORRIGIEREN' : 'FLOW ABGERISSEN');
    if (this.state.stability <= 0) window.setTimeout(() => this.endGame(), 420);
  }

  updateTutorial() {
    const state = this.state;
    if (state.tutorialStep === 0 && state.runTime > 1.2) {
      this.toast('MAUS ODER A / D — LINIE HALTEN', 3000);
      state.tutorialStep = 1;
    } else if (state.tutorialStep === 1 && state.runTime > 5.2) {
      this.toast('DURCH DIE BLAUEN STRÖMUNGSTORE', 2800);
      state.tutorialStep = 2;
    } else if (state.tutorialStep === 2 && state.runTime > 10) {
      this.toast('W / LEERTASTE — BOOST ZÜNDEN', 2800);
      state.tutorialStep = 3;
      markTutorialSeen();
    }
  }

  updateHud() {
    const state = this.state;
    this.ui.score.textContent = formatScore(state.score);
    this.ui.multiplier.textContent = '×' + state.multiplier.toFixed(1);
    this.ui.speedLabel.textContent = String(Math.round(state.speed * 2.45)).padStart(3, '0') + ' KM/H';
    this.ui.boostFill.style.width = state.boost + '%';
    this.ui.hudWorld.textContent = state.endless ? WORLDS[state.worldIndex].title + ' // ENDLESS' : WORLDS[state.worldIndex].hud;
    [...this.ui.stabilityBars.children].forEach((bar, index) => bar.classList.toggle('off', index >= state.stability));
    this.ui.campaignProgress.style.width = Math.min(100, state.distance / CAMPAIGN_END * 100) + '%';
  }

  showWorld(index, kickerOverride) {
    const world = WORLDS[index];
    this.ui.worldIndex.textContent = String(index + 1).padStart(2, '0');
    this.ui.worldKicker.textContent = kickerOverride || world.kicker;
    this.ui.worldTitle.textContent = world.title;
    this.ui.worldCopy.textContent = world.copy;
    this.ui.worldCard.classList.add('show');
    clearTimeout(this.worldCardTimer);
    this.worldCardTimer = setTimeout(() => this.ui.worldCard.classList.remove('show'), 2700);
    if (this.state?.runTime > 1) this.audio.sfx('world');
  }

  showEndless() {
    this.ui.worldIndex.textContent = '∞';
    this.ui.worldKicker.textContent = 'KAMPAGNE GEMEISTERT';
    this.ui.worldTitle.textContent = 'ENDLESS FLOW';
    this.ui.worldCopy.textContent = 'Wie weit trägt dich deine Linie?';
    this.ui.worldCard.classList.add('show');
    clearTimeout(this.worldCardTimer);
    this.worldCardTimer = setTimeout(() => this.ui.worldCard.classList.remove('show'), 3400);
    this.audio.sfx('world');
    this.toast('ENDLESS FLOW FREIGESCHALTET', 3200);
  }

  callout(text) {
    this.ui.comboCallout.textContent = text;
    this.ui.comboCallout.classList.add('show');
    clearTimeout(this.calloutTimer);
    this.calloutTimer = setTimeout(() => this.ui.comboCallout.classList.remove('show'), 700);
  }

  toast(text, duration = 2200) {
    this.ui.toast.textContent = text;
    this.ui.toast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.ui.toast.classList.remove('show'), duration);
  }

  pause() {
    if (!this.state || this.state.mode !== 'playing') return;
    this.state.mode = 'paused';
    this.ui.pauseScreen.classList.add('screen--active');
    this.audio.stop();
  }

  async resume() {
    if (!this.state || this.state.mode !== 'paused') return;
    this.ui.pauseScreen.classList.remove('screen--active');
    this.state.mode = 'playing';
    this.lastTime = performance.now();
    this.accumulator = 0;
    await this.audio.start();
  }

  togglePause() {
    if (this.state?.mode === 'playing') this.pause();
    else if (this.state?.mode === 'paused') this.resume();
  }

  endGame() {
    if (!this.state || this.state.mode === 'gameOver') return;
    this.state.mode = 'gameOver';
    this.audio.stop();
    const score = Math.floor(this.state.score);
    const isBest = score > this.highScore;
    if (isBest) {
      this.highScore = score;
      saveHighScore(score);
    }
    this.ui.finalScore.textContent = formatScore(score);
    this.ui.finalDistance.textContent = Math.floor(this.state.distance / 10) + ' M';
    this.ui.finalGates.textContent = String(this.state.gates);
    this.ui.finalCombo.textContent = '×' + this.state.maxMultiplier.toFixed(1);
    this.ui.newBest.classList.toggle('show', isBest);
    this.ui.resultKicker.textContent = this.state.endless ? 'ENDLESS FLOW' : 'FLOW BEENDET';
    this.ui.resultTitle.textContent = this.state.endless ? 'Grenzen verschoben.' : 'Starke Linie.';
    this.ui.gameoverScreen.classList.add('screen--active');
  }

  toMenu() {
    this.audio.stop();
    if (this.state) this.state.mode = 'menu';
    this.hideScreens();
    this.ui.menuScreen.classList.add('screen--active');
    this.ui.hud.classList.remove('hud--active');
    this.ui.menuHighscore.textContent = formatScore(this.highScore);
    document.querySelector('.site-footer').style.display = '';
  }

  hideScreens() {
    document.querySelectorAll('.screen').forEach((screen) => screen.classList.remove('screen--active'));
    this.ui.worldCard.classList.remove('show');
    this.ui.toast.classList.remove('show');
  }

  showOnly(key) {
    this.hideScreens();
    this.ui[key].classList.add('screen--active');
  }

  frame(time) {
    const delta = Math.min(0.05, Math.max(0, (time - this.lastTime) / 1000));
    this.lastTime = time;
    if (this.state?.mode === 'playing') {
      this.accumulator += delta;
      while (this.accumulator >= FIXED_STEP) {
        this.update(FIXED_STEP);
        this.accumulator -= FIXED_STEP;
      }
    }
    if (this.state) {
      this.state.renderDelta = delta;
      this.renderer.render(this.state, time);
    }
    this.animationFrame = requestAnimationFrame((nextTime) => this.frame(nextTime));
  }
}

class InputController {
  constructor(canvas, onPause) {
    this.canvas = canvas;
    this.left = false;
    this.right = false;
    this.boost = false;
    this.brake = false;
    this.pointerActive = false;
    this.pointerAngle = -Math.PI / 2;
    this.touchBoost = false;
    const setKey = (event, pressed) => {
      const code = event.code;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyA', 'KeyD', 'KeyW', 'KeyS'].includes(code)) event.preventDefault();
      if (code === 'ArrowLeft' || code === 'KeyA') this.left = pressed;
      if (code === 'ArrowRight' || code === 'KeyD') this.right = pressed;
      if (code === 'ArrowUp' || code === 'KeyW' || code === 'Space') this.boost = pressed;
      if (code === 'ArrowDown' || code === 'KeyS') this.brake = pressed;
      if (pressed && (code === 'Escape' || code === 'KeyP')) onPause();
    };
    window.addEventListener('keydown', (event) => setKey(event, true), { passive: false });
    window.addEventListener('keyup', (event) => setKey(event, false), { passive: false });
    canvas.addEventListener('pointermove', (event) => this.updatePointer(event));
    canvas.addEventListener('pointerdown', (event) => {
      canvas.setPointerCapture?.(event.pointerId);
      this.updatePointer(event);
      if (event.pointerType === 'touch' && event.clientX > innerWidth * 0.72) {
        this.touchBoost = true;
        this.boost = true;
      }
    });
    canvas.addEventListener('pointerup', (event) => {
      if (event.pointerType === 'touch' && this.touchBoost) {
        this.touchBoost = false;
        this.boost = false;
      }
    });
  }

  updatePointer(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width * 0.5;
    const y = (event.clientY - rect.top - rect.height * 0.5) / 0.68;
    if (Math.hypot(x, y) < 20) return;
    this.pointerAngle = Math.atan2(y, x);
    this.pointerActive = true;
  }

  reset() {
    this.left = false;
    this.right = false;
    this.boost = false;
    this.brake = false;
    this.pointerActive = false;
    this.pointerAngle = -Math.PI / 2;
  }
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}
