import { AudioEngine } from './audio.js';
import {
  DEATH_MESSAGES, GRAVITY, JUMP_SPEED, LEVEL_END, PLAYER_HEIGHT, PLAYER_WIDTH,
  RUN_SPEED, SECTIONS, STEAM_BOOST, VIEW_HEIGHT, calculateScore, formatScore, sectionIndexForX
} from './config.js';
import { UnfairRenderer } from './renderer.js';
import { QualityMonitor } from './quality.js';
import { loadHighScore, loadSettings, saveHighScore, saveSettings } from './storage.js';
import { TouchControls } from './touch.js';
import { activeTrapBox, createLevel, overlaps } from './track.js';
import { cameraTarget, onMediaChange } from './viewport.js';

const STEP = 1 / 120;
export class UnfairJeremias {
  constructor(canvas) {
    this.canvas = canvas;
    this.settings = loadSettings();
    this.bestScore = loadHighScore();
    this.audio = new AudioEngine(this.settings);
    this.renderer = new UnfairRenderer(canvas, this.settings);
    this.state = null;
    this.ui = this.collectUi();
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.cardTimer = 0;
    this.calloutTimer = 0;
    this.input = new PlatformInput({
      canvas,
      jump: () => this.requestJump(),
      releaseJump: () => this.releaseJump(),
      restart: () => this.restartFromCheckpoint(),
      pause: () => this.togglePause()
    });
    this.touch = new TouchControls({
      layer: this.ui.touchLayer,
      zones: { left: this.ui.touchLeft, right: this.ui.touchRight, jump: this.ui.touchJump },
      input: this.input,
      jump: () => this.requestJump(),
      releaseJump: () => this.releaseJump()
    });
    this.quality = new QualityMonitor(() => this.renderer.applyQuality());
    if (this.settings.quality !== 'auto') this.quality.lock(this.settings.quality);
    this.wakeLock = null;
  }

  collectUi() {
    const ids = [
      'loading-screen', 'loading-progress', 'menu-screen', 'menu-highscore', 'start-button',
      'how-button', 'how-screen', 'hud', 'hud-section', 'timer', 'death-count', 'band-count',
      'campaign-progress', 'audio-button', 'pause-button', 'ready-overlay', 'death-overlay',
      'death-message', 'pause-screen', 'resume-button', 'restart-pause-button', 'menu-pause-button',
      'win-screen', 'final-score', 'final-time', 'final-deaths', 'final-bands', 'new-best',
      'restart-button', 'menu-button', 'section-card', 'section-kicker', 'section-title',
      'section-copy', 'callout', 'flash', 'touch-layer', 'touch-left', 'touch-right', 'touch-jump',
      'rotate-hint', 'rotate-anyway', 'rotate-flip', 'rotate-reset-button',
      'install-bar', 'install-text', 'install-button', 'install-dismiss',
      'update-bar', 'update-button'
    ];
    return Object.fromEntries(ids.map((id) => [camel(id), document.getElementById(id)]));
  }

  async boot() {
    this.bindUi();
    this.applyInputMode();
    this.applyStandalone();
    this.applyRotation();
    this.setupInstall();
    this.registerWorker();
    this.ui.menuHighscore.textContent = formatScore(this.bestScore);
    this.ui.audioButton.classList.toggle('muted', this.settings.muted);
    try {
      await this.renderer.load((progress) => {
        this.ui.loadingProgress.style.width = Math.round(progress * 100) + '%';
      });
    } catch (error) {
      this.ui.loadingScreen.querySelector('p').textContent = 'MATERIAL FEHLT — ' + error.message;
      return;
    }
    await this.loadCanvasFonts();
    await new Promise((resolve) => setTimeout(resolve, 220));
    this.showOnly(this.ui.menuScreen);
    requestAnimationFrame((time) => this.frame(time));
  }

  applyInputMode() {
    const coarse = matchMedia('(pointer: coarse)');
    const noHover = matchMedia('(hover: none)');
    const decide = () => {
      const touch = coarse.matches || noHover.matches || navigator.maxTouchPoints > 0;
      this.setInputMode(touch ? 'touch' : 'keyboard');
    };
    onMediaChange(coarse, decide);
    onMediaChange(noHover, decide);
    decide();
    addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'mouse') this.setInputMode('touch');
    }, { capture: true });
    addEventListener('keydown', (event) => {
      if (!event.metaKey && !event.ctrlKey && navigator.maxTouchPoints === 0) this.setInputMode('keyboard');
    }, { capture: true });
  }

  applyStandalone() {
    const modes = ['fullscreen', 'standalone', 'minimal-ui'];
    this.standalone = navigator.standalone === true
      || modes.some((mode) => matchMedia('(display-mode: ' + mode + ')').matches);
    document.documentElement.classList.toggle('standalone', this.standalone);
    // Installiert erzwingt Android Querformat - eine gemerkte Drehung waere dann
    // ein Zustand ohne Wirkung, aber mit abweichendem Panel-Look.
    if (this.standalone && this.settings.rotate !== 'auto') {
      this.settings.rotate = 'auto';
      saveSettings(this.settings);
    }
  }

  setupInstall() {
    const bar = this.ui.installBar;
    if (this.standalone || this.settings.installDismissed) return;
    const short = () => document.documentElement.classList.contains('compact');
    const show = (text, shortText, withButton) => {
      this.ui.installText.textContent = short() ? shortText : text;
      this.ui.installText.hidden = short() && withButton;
      this.ui.installButton.hidden = !withButton;
      bar.classList.add('install-bar--show');
    };
    this.ui.installDismiss.addEventListener('click', () => {
      bar.classList.remove('install-bar--show');
      this.settings.installDismissed = true;
      saveSettings(this.settings);
    });
    addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.installPrompt = event;
      show('Als App auf den Homescreen legen — startet im Vollbild und läuft offline.', '', true);
    });
    this.ui.installButton.addEventListener('click', async () => {
      if (!this.installPrompt) return;
      this.ui.installButton.disabled = true;
      try {
        await this.installPrompt.prompt();
      } finally {
        this.installPrompt = null;
        bar.classList.remove('install-bar--show');
      }
    });
    addEventListener('appinstalled', () => bar.classList.remove('install-bar--show'));
    // Safari kennt beforeinstallprompt nicht, Firefox auf Android ebenso wenig.
    // Nach kurzer Wartezeit bleibt nur die Anleitung - iPadOS meldet dabei eine
    // Desktop-Kennung, deshalb entscheidet die Touch-Faehigkeit, nicht die Kennung.
    setTimeout(() => {
      if (this.installPrompt || bar.classList.contains('install-bar--show')) return;
      if (navigator.maxTouchPoints > 0) {
        show('Als App auf den Homescreen: im Browsermenü „Teilen" bzw. „⋮" öffnen und „Zum Home-Bildschirm" wählen.',
             'Teilen-Menü, dann „Zum Home-Bildschirm" — macht daraus eine App.', false);
      }
    }, 2500);
  }

  async registerWorker() {
    if (!navigator.serviceWorker || !isSecureContext) return;
    try {
      const registration = await navigator.serviceWorker.register('sw.js');
      const offerUpdate = (worker) => {
        if (!worker || !navigator.serviceWorker.controller) return;
        this.ui.updateBar.classList.add('update-bar--show');
        this.ui.updateButton.onclick = () => {
          worker.postMessage({ type: 'SKIP_WAITING' });
          this.ui.updateButton.disabled = true;
        };
      };
      offerUpdate(registration.waiting);
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed') offerUpdate(worker);
        });
      });
      let reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloading) return;
        reloading = true;
        location.reload();
      });
    } catch { /* privater Modus, altes iOS: Spiel laeuft ohne Offline-Betrieb */ }
  }

  setInputMode(mode) {
    const root = document.documentElement.classList;
    if (root.contains(mode)) return;
    root.toggle('touch', mode === 'touch');
    root.toggle('keyboard', mode === 'keyboard');
  }

  async loadCanvasFonts() {
    if (!document.fonts) return;
    const faces = ['700 15px "Barlow Condensed"', '800 22px "Barlow Condensed"'];
    const loaded = Promise.all(faces.map((face) => document.fonts.load(face)));
    const deadline = new Promise((resolve) => setTimeout(resolve, 1500));
    try {
      await Promise.race([loaded, deadline]);
    } catch { /* Canvas faellt auf die Systemschrift zurueck */ }
  }

  bindUi() {
    this.ui.startButton.addEventListener('click', () => {
      if (matchMedia('(pointer: coarse)').matches) this.enterImmersiveMode();
      this.start();
    });
    this.ui.howButton.addEventListener('click', () => this.ui.howScreen.classList.add('screen--active'));
    document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => {
      document.getElementById(button.dataset.close).classList.remove('screen--active');
    }));
    this.ui.pauseButton.addEventListener('click', () => this.pause());
    this.ui.resumeButton.addEventListener('click', () => this.resume());
    this.ui.restartPauseButton.addEventListener('click', () => this.restartFromCheckpoint());
    this.ui.menuPauseButton.addEventListener('click', () => this.toMenu());
    this.ui.restartButton.addEventListener('click', () => this.start());
    this.ui.menuButton.addEventListener('click', () => this.toMenu());
    this.ui.audioButton.addEventListener('click', () => {
      const muted = this.audio.toggleMute();
      this.ui.audioButton.classList.toggle('muted', muted);
      saveSettings(this.settings);
    });
    this.ui.rotateAnyway.addEventListener('click', () => this.setRotation('cw'));
    this.ui.rotateFlip.addEventListener('click', () => this.setRotation('ccw'));
    this.ui.rotateResetButton.addEventListener('click', () => this.setRotation(
      { auto: 'cw', cw: 'ccw', ccw: 'auto' }[this.settings.rotate]
    ));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.state?.mode === 'playing') this.pause();
        this.audio.suspend();
      } else {
        this.requestWakeLock();
        this.audio.ensure().catch(() => {});
      }
    });
    document.addEventListener('fullscreenchange', () => this.requestWakeLock());
    for (const name of ['pointerdown', 'keydown']) {
      addEventListener(name, () => { if (this.audio.context?.state === 'suspended') this.audio.ensure().catch(() => {}); });
    }
  }

  setRotation(mode) {
    this.settings.rotate = mode;
    saveSettings(this.settings);
    this.applyRotation();
  }

  applyRotation() {
    document.body.classList.toggle('forced', this.settings.rotate !== 'auto');
    document.body.classList.toggle('ccw', this.settings.rotate === 'ccw');
  }

  async requestWakeLock() {
    if (document.hidden || !navigator.wakeLock) return;
    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
    } catch {
      this.wakeLock = null;
    }
  }

  async enterImmersiveMode() {
    try { await document.documentElement.requestFullscreen?.(); } catch { /* iOS Safari */ }
    try { await screen.orientation?.lock?.('landscape'); } catch { /* iOS Safari */ }
    this.requestWakeLock();
  }

  async start() {
    this.state = {
      mode: 'ready',
      level: createLevel(),
      elapsed: 0,
      deaths: 0,
      bands: 0,
      deathsBySource: {},
      section: 0,
      checkpoint: { x: 120, y: 700 - PLAYER_HEIGHT, id: null },
      cameraX: 0,
      renderDelta: .016,
      respawnTimer: 0,
      player: this.makePlayer(120, 700 - PLAYER_HEIGHT)
    };
    this.hideScreens();
    this.ui.hud.classList.add('hud--active');
    document.body.classList.add('running');
    this.ui.readyOverlay.classList.add('ready-overlay--active');
    this.ui.deathOverlay.classList.remove('death-overlay--active');
    document.querySelector('.site-footer').style.display = 'none';
    this.updateHud();
    await this.audio.ensure();
    this.lastTime = performance.now();
    this.accumulator = 0;
  }

  makePlayer(x, y) {
    return {
      x, y,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      vx: 0,
      vy: 0,
      facing: 1,
      onGround: true,
      onIce: false,
      coyote: .1,
      jumpBuffer: 0,
      invulnerable: 0,
      animationTime: 0,
      lastVx: 0
    };
  }

  requestJump() {
    if (!this.state) return;
    if (this.state.mode === 'ready') {
      this.state.mode = 'playing';
      this.ui.readyOverlay.classList.remove('ready-overlay--active');
      this.audio.start();
      this.showSection(0);
    }
    if (this.state.mode === 'playing') this.state.player.jumpBuffer = .14;
  }

  releaseJump() {
    if (this.state?.player.vy < -250) this.state.player.vy = -250;
  }

  update(dt) {
    const state = this.state;
    if (!state) return;
    if (state.mode === 'dead') {
      state.respawnTimer -= dt;
      if (state.respawnTimer <= 0) this.respawn();
      return;
    }
    if (state.mode !== 'playing') return;

    state.elapsed += dt;
    state.renderDelta = dt;
    const player = state.player;
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);
    player.coyote = player.onGround ? .11 : Math.max(0, player.coyote - dt);

    const direction = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
    if (direction !== 0) {
      player.vx += direction * (player.onIce ? 620 : 2400) * dt;
      player.facing = direction;
    } else {
      player.vx *= Math.pow(player.onIce ? .45 : .0007, dt);
    }
    player.vx = Math.max(-RUN_SPEED, Math.min(RUN_SPEED, player.vx));
    if (player.jumpBuffer > 0 && (player.onGround || player.coyote > 0)) {
      player.vy = -JUMP_SPEED;
      player.onGround = false;
      player.coyote = 0;
      player.jumpBuffer = 0;
      this.audio.sfx('jump');
      this.renderer.emit(player.x + 26, player.y + PLAYER_HEIGHT, '#62c8ff', 9);
    }

    this.updatePlatforms(dt);
    this.updateTraps(dt);
    this.updateBands(dt);

    player.x += player.vx * dt;
    for (const zone of state.level.traps) {
      if (zone.type !== 'windZone' || !zone.active) continue;
      const center = player.x + PLAYER_WIDTH / 2;
      if (center >= zone.x && center <= zone.x + zone.width) player.x += zone.direction * zone.strength * dt;
    }
    player.x = Math.max(-100, player.x);
    const previousBottom = player.y + PLAYER_HEIGHT;
    player.vy += GRAVITY * dt;
    player.y += player.vy * dt;
    player.onGround = false;
    let standingPlatform = null;
    for (const platform of state.level.platforms) {
      if (platform.phantom) continue;
      const y = platform.y + platform.fallY;
      const horizontal = player.x + PLAYER_WIDTH - 8 > platform.x && player.x + 8 < platform.x + platform.width;
      const bottom = player.y + PLAYER_HEIGHT;
      if (horizontal && player.vy >= 0 && previousBottom <= y + 5 && bottom >= y) {
        player.y = y - PLAYER_HEIGHT;
        player.vy = 0;
        player.onGround = true;
        standingPlatform = platform;
        break;
      }
    }
    this.collideGhostBlocks(previousBottom);
    player.onIce = !!(standingPlatform && standingPlatform.ice);
    if (standingPlatform?.ice && !standingPlatform.iceAnnounced) {
      standingPlatform.iceAnnounced = true;
      this.callout('VEREISTES BLECH — BREMSWEG BEACHTEN');
    }
    if (standingPlatform?.collapsible && !standingPlatform.triggered) {
      standingPlatform.triggered = true;
      standingPlatform.timer = 0;
      this.callout('DAS WAR ZU EINFACH …');
    }

    this.checkTrapCollisions();
    this.checkBands();
    this.checkCheckpoints();

    if (player.y > VIEW_HEIGHT + 140) {
      const center = player.x + PLAYER_WIDTH / 2;
      const phantom = state.level.platforms.find((item) => item.phantom && center >= item.x && center <= item.x + item.width);
      const gust = state.level.traps.find((item) => item.type === 'windZone' && item.active && center >= item.x && center <= item.x + item.width);
      if (phantom) this.kill('DURCHGEROSTETES BLECH. KEIN ORIGINAL-JEREMIAS-MATERIAL.', phantom.id);
      else if (gust) this.kill('ABGASBÖE NICHT EINKALKULIERT.', gust.id);
      else this.kill('ABSTURZ ZWISCHEN DEN ABGASSYSTEMEN', 'absturz');
    }
    if (player.x >= state.level.finish.x + 105 && player.y < state.level.finish.y) this.win();

    const section = sectionIndexForX(player.x);
    if (section !== state.section) {
      state.section = section;
      this.showSection(section);
    }
    const targetCamera = cameraTarget(player.x);
    state.cameraX += (targetCamera - state.cameraX) * Math.min(1, dt * 4.8);
    this.audio.setIntensity(.3 + section * .15);
    this.updateHud();
  }

  collideGhostBlocks(previousBottom) {
    const player = this.state.player;
    for (const trap of this.state.level.traps) {
      if (trap.type !== 'ghostBlock') continue;
      const box = { x: player.x + 8, y: player.y + 5, width: PLAYER_WIDTH - 16, height: PLAYER_HEIGHT - 7 };
      if (!overlaps(box, trap)) continue;
      const reveal = !trap.revealed;
      if (player.vy < 0) {
        player.y = trap.y + trap.height;
        player.vy = 60;
      } else if (previousBottom <= trap.y + 5) {
        player.y = trap.y - PLAYER_HEIGHT;
        player.vy = 0;
        player.onGround = true;
      } else {
        continue;
      }
      if (reveal) {
        trap.revealed = true;
        this.audio.sfx('near');
        this.renderer.emit(trap.x + trap.width / 2, trap.y + trap.height / 2, '#9fb8c8', 14);
        this.callout('UNSICHTBARES DW-ELEMENT — NICHT IM KATALOG.');
      }
    }
  }

  updatePlatforms(dt) {
    for (const platform of this.state.level.platforms) {
      if (platform.moving && !platform.triggered) {
        platform.fallY = Math.sin(this.state.elapsed * 1.6) * 52;
      }
      if (platform.collapsible && platform.triggered) {
        platform.timer += dt;
        if (platform.timer > (platform.collapseDelay || .9)) {
          platform.fallSpeed += 1250 * dt;
          platform.fallY += platform.fallSpeed * dt;
        }
      }
    }
  }

  updateTraps(dt) {
    const playerX = this.state.player.x;
    for (const trap of this.state.level.traps) {
      if (!trap.triggered && playerX >= trap.triggerX) {
        trap.triggered = true;
        if (trap.type === 'fallingPipe') trap.phase = 'falling';
        if (trap.type === 'swingCap') trap.phase = 'arming';
        if (trap.type === 'spikes') this.audio.sfx('near');
        if (trap.type === 'finaleCap') {
          trap.phase = 'wobble';
          this.audio.sfx('near');
        }
      }
      if (!trap.triggered) continue;
      if (trap.type === 'spikes') trap.progress = Math.min(1, trap.progress + dt * 4.8);
      if (trap.type === 'fallingPipe') {
        if (trap.phase === 'falling') {
          trap.vy += 1500 * dt;
          trap.y = Math.min(trap.floorY - trap.height, trap.y + trap.vy * dt);
          if (trap.y >= trap.floorY - trap.height) {
            trap.phase = 'resting';
            trap.timer = 0;
            this.callout('DW-ELEMENT UNTEN — SPRINGEN ODER KURZ WARTEN');
          }
        } else if (trap.phase === 'resting') {
          trap.timer += dt;
          if (trap.timer >= .8) trap.phase = 'retracting';
        } else if (trap.phase === 'retracting') {
          trap.y -= 820 * dt;
          if (trap.y + trap.height < -20) {
            trap.phase = 'cleared';
            trap.cleared = true;
            this.callout('DW-ELEMENT EINGEZOGEN — WEG FREI');
          }
        }
      }
      if (trap.type === 'pressure') trap.timer += dt;
      if (trap.type === 'swingCap') {
        if (trap.phase === 'arming') {
          trap.timer += dt;
          trap.angle = Math.sin(trap.timer * 80) * .06;
          if (trap.timer >= .16) {
            trap.phase = 'launching';
            this.audio.sfx('near');
          }
        } else if (trap.phase === 'launching') {
          trap.x += trap.vx * dt;
          trap.angle += trap.direction * dt * 8.5;
          if (Math.abs(trap.x - trap.baseX) > 470) {
            trap.phase = 'cleared';
            trap.cleared = true;
          }
        }
      }
      if (trap.type === 'windZone') {
        const wasActive = trap.active;
        trap.active = (this.state.elapsed + trap.offset) % trap.period < trap.onTime;
        const center = playerX + PLAYER_WIDTH / 2;
        if (trap.active && !wasActive && center >= trap.x - 400 && center <= trap.x + trap.width) {
          this.callout('ABGASBÖE — GEGENHALTEN!');
          this.audio.sfx('near');
        }
      }
      if (trap.type === 'dripper') {
        const cycle = (this.state.elapsed + trap.offset) % trap.period;
        const fallTime = Math.sqrt(2 * (trap.floorY - trap.outletY) / 1500);
        if (cycle < fallTime) {
          trap.dropActive = true;
          trap.dropY = trap.outletY + 750 * cycle * cycle;
        } else if (trap.dropActive) {
          trap.dropActive = false;
          this.renderer.emit(trap.x + 13, trap.floorY, '#8fe08a', 6);
        }
      }
      if (trap.type === 'fan') trap.angle += trap.speed * dt;
      if (trap.type === 'steamVent') {
        trap.active = (this.state.elapsed + trap.offset) % trap.period < trap.onTime;
        if (trap.active) {
          const player = this.state.player;
          const jet = { x: trap.x, y: trap.floorY - trap.jetHeight, width: trap.width, height: trap.jetHeight };
          const playerBox = { x: player.x + 8, y: player.y + 5, width: PLAYER_WIDTH - 16, height: PLAYER_HEIGHT - 7 };
          if (overlaps(playerBox, jet)) {
            const boosting = player.vy > -STEAM_BOOST;
            player.vy = Math.min(player.vy, -STEAM_BOOST);
            if (boosting && !trap.boosting) {
              trap.boosting = true;
              player.onGround = false;
              this.audio.sfx('charge');
              this.renderer.emit(trap.x + trap.width / 2, trap.floorY - 40, '#cfe8f2', 12);
            }
          } else {
            trap.boosting = false;
          }
        } else {
          trap.boosting = false;
        }
      }
      if (trap.type === 'sootZone' && !trap.announced) {
        const center = playerX + PLAYER_WIDTH / 2;
        if (center >= trap.x && center <= trap.x + trap.width) {
          trap.announced = true;
          this.callout('RUSSNEBEL — SICHT EINGESCHRÄNKT');
        }
      }
      if (trap.type === 'crusher') {
        const cycle = (this.state.elapsed + trap.offset) % trap.period;
        const downY = trap.floorY - trap.plateHeight;
        if (cycle < 1) {
          trap.plateY = trap.raisedY;
          trap.slammed = false;
        } else if (cycle < 1.15) {
          trap.plateY = trap.raisedY + (downY - trap.raisedY) * ((cycle - 1) / .15);
        } else if (cycle < 1.6) {
          trap.plateY = downY;
          if (!trap.slammed) {
            trap.slammed = true;
            this.audio.sfx('slam');
            this.renderer.emit(trap.x + trap.width / 2, trap.floorY, '#cfdce3', 12);
          }
        } else {
          trap.plateY = downY + (trap.raisedY - downY) * ((cycle - 1.6) / (trap.period - 1.6));
        }
      }
      if (trap.type === 'finaleCap') {
        if (trap.phase === 'wobble') {
          trap.timer += dt;
          trap.angle = Math.sin(trap.timer * 70) * .08;
          if (trap.timer >= .4) {
            trap.phase = 'falling';
            trap.timer = 0;
            this.audio.sfx('near');
          }
        } else if (trap.phase === 'falling') {
          trap.vy += 2400 * dt;
          trap.y = Math.min(trap.floorY - trap.height, trap.y + trap.vy * dt);
          if (trap.y >= trap.floorY - trap.height) {
            trap.phase = 'resting';
            trap.timer = 0;
            trap.angle = 0;
            this.audio.sfx('slam');
            this.renderer.emit(trap.x + trap.width / 2, trap.floorY, '#cfdce3', 22);
          }
        } else if (trap.phase === 'resting') {
          trap.timer += dt;
          if (trap.timer >= 1.4) {
            trap.phase = 'toppled';
            trap.cleared = true;
            this.callout('MÜNDUNGSHAUBE GELANDET — JETZT ABER.');
          }
        }
      }
    }
  }

  updateBands(dt) {
    const elapsed = this.state.elapsed;
    const playerX = this.state.player.x;
    for (const band of this.state.level.bands) {
      if (band.collected) continue;
      if (band.motion === 'railX') {
        band.x = band.baseX + Math.sin(elapsed * band.speed + band.baseX) * band.amplitude;
        band.y = band.baseY + Math.cos(elapsed * band.speed * .7) * 6;
      } else if (band.motion === 'railY') {
        band.y = band.baseY + Math.sin(elapsed * band.speed) * band.amplitude;
      } else if (band.motion === 'flee') {
        if (!band.activated && playerX >= band.triggerX) {
          band.activated = true;
          this.callout('DAS KLEMMBAND HAUT AB!');
        }
        if (band.activated) band.x = Math.min(band.baseX + band.travel, band.x + 175 * dt);
        band.y = band.baseY + Math.sin(elapsed * 8) * 5;
      } else {
        band.y = band.baseY + Math.sin(elapsed * 2.8 + band.baseX * .01) * 8;
      }
    }
  }

  checkTrapCollisions() {
    const state = this.state;
    const player = state.player;
    const playerBox = { x: player.x + 8, y: player.y + 5, width: PLAYER_WIDTH - 16, height: PLAYER_HEIGHT - 7 };
    for (const trap of state.level.traps) {
      const box = activeTrapBox(trap);
      if (box && overlaps(playerBox, box)) {
        let reason = 'DW-ELEMENT IM ANFLUG — SPRINGEN ODER WARTEN, BIS ES HOCHGEZOGEN WIRD';
        if (trap.type === 'spikes') reason = 'KAMINHAUBE VON UNTEN. GEMEIN.';
        if (trap.type === 'swingCap') reason = 'DIE KAMINHAUBE WAR WOHL NICHT FEST VERSCHRAUBT';
        if (trap.type === 'fakeCheckpoint') {
          reason = 'DIESER SERVICEPUNKT WAR NICHT ZERTIFIZIERT.';
          trap.exposed = true;
        }
        if (trap.type === 'finaleCap') reason = 'DIE MÜNDUNGSHAUBE HAT DAS LETZTE WORT.';
        if (trap.type === 'dripper') reason = 'KONDENSAT OHNE ABLAUF. DAS ÄTZT.';
        if (trap.type === 'fan') reason = 'DER ABLUFTVENTILATOR HATTE VORFAHRT.';
        if (trap.type === 'crusher') reason = 'QUALITÄTSPRÜFUNG NICHT BESTANDEN. GESTEMPELT.';
        if (trap.type === 'mimicBand') {
          reason = 'FÄLSCHUNG! KEIN ORIGINAL-JEREMIAS-KLEMMBAND.';
          trap.sprung = true;
        }
        this.kill(reason, trap.id);
        return;
      }
      if (trap.type === 'pressure' && trap.triggered && trap.timer > .28 && trap.timer < 1.1) {
        const blast = { x: trap.x - 190, y: trap.y - 170, width: 210, height: 130 };
        if (overlaps(playerBox, blast)) {
          this.kill('DRUCKSTOSS AUS DER PRÜFÖFFNUNG', trap.id);
          return;
        }
      }
    }
  }

  checkBands() {
    const player = this.state.player;
    const box = { x: player.x, y: player.y, width: PLAYER_WIDTH, height: PLAYER_HEIGHT };
    for (const band of this.state.level.bands) {
      if (band.collected) continue;
      if (overlaps(box, { x: band.x - 28, y: band.y - 28, width: 56, height: 56 })) {
        band.collected = true;
        this.state.bands += 1;
        this.audio.sfx('charge');
        this.renderer.emit(band.x, band.y, '#ff8a24', 18);
        this.callout('KLEMMBAND GESICHERT  +900');
      }
    }
  }

  checkCheckpoints() {
    for (const checkpoint of this.state.level.checkpoints) {
      if (!checkpoint.active && this.state.player.x >= checkpoint.x) {
        checkpoint.active = true;
        const platform = this.state.level.platforms.find((item) => !item.phantom && checkpoint.x >= item.x && checkpoint.x < item.x + item.width);
        this.state.checkpoint = {
          id: checkpoint.id,
          x: checkpoint.x + 28,
          y: (platform?.y || checkpoint.y) - PLAYER_HEIGHT
        };
        this.audio.sfx('stage');
        this.callout('JEREMIAS SERVICEPUNKT AKTIV');
      }
    }
  }

  kill(reason, sourceId = null) {
    if (!this.state || this.state.mode !== 'playing') return;
    this.state.mode = 'dead';
    this.state.deaths += 1;
    this.state.respawnTimer = 1.05;
    this.audio.sfx('hit');
    let suffix = DEATH_MESSAGES[(this.state.deaths - 1) % DEATH_MESSAGES.length];
    if (sourceId) {
      this.state.deathsBySource[sourceId] = (this.state.deathsBySource[sourceId] || 0) + 1;
      const count = this.state.deathsBySource[sourceId];
      if (count >= 3) suffix = 'ZUM ' + count + '. MAL GENAU HIER.';
    }
    this.ui.deathMessage.textContent = reason + ' — ' + suffix;
    this.ui.deathOverlay.classList.add('death-overlay--active');
    this.ui.flash.classList.remove('hit');
    void this.ui.flash.offsetWidth;
    this.ui.flash.classList.add('hit');
    this.updateHud();
  }

  respawn() {
    const deaths = this.state.deaths;
    const elapsed = this.state.elapsed;
    const bands = this.state.bands;
    const collected = this.state.level.bands.map((band) => band.collected);
    const checkpoint = this.state.checkpoint;
    const level = createLevel();
    collected.forEach((value, index) => { if (level.bands[index]) level.bands[index].collected = value; });
    level.checkpoints.forEach((item) => { item.active = checkpoint.id && item.x <= checkpoint.x; });
    this.state.level = level;
    this.state.deaths = deaths;
    this.state.elapsed = elapsed;
    this.state.bands = bands;
    this.state.player = this.makePlayer(checkpoint.x, checkpoint.y);
    this.state.player.invulnerable = .65;
    this.state.cameraX = cameraTarget(checkpoint.x);
    this.state.mode = 'playing';
    this.ui.deathOverlay.classList.remove('death-overlay--active');
  }

  restartFromCheckpoint() {
    if (!this.state || this.state.mode === 'menu') return;
    if (this.state.mode === 'paused') {
      this.ui.pauseScreen.classList.remove('screen--active');
      this.state.mode = 'playing';
    }
    this.kill('MANUELLER NEUSTART');
    if (this.state.mode === 'dead') this.state.respawnTimer = .05;
  }

  win() {
    if (this.state.mode !== 'playing') return;
    this.state.mode = 'won';
    this.audio.stop();
    this.audio.sfx('stage');
    const score = calculateScore(this.state.elapsed, this.state.deaths, this.state.bands);
    const best = score > this.bestScore;
    if (best) {
      this.bestScore = score;
      saveHighScore(score);
    }
    this.ui.finalScore.textContent = formatScore(score);
    this.ui.finalTime.textContent = formatTime(this.state.elapsed);
    this.ui.finalDeaths.textContent = String(this.state.deaths);
    this.ui.finalBands.textContent = this.state.bands + ' / ' + this.state.level.bands.length;
    this.ui.newBest.classList.toggle('show', best);
    this.ui.winScreen.classList.add('screen--active');
  }

  updateHud() {
    const state = this.state;
    this.ui.timer.textContent = formatTime(state.elapsed);
    this.ui.deathCount.textContent = String(state.deaths).padStart(2, '0');
    this.ui.bandCount.textContent = state.bands + ' / ' + state.level.bands.length;
    this.ui.hudSection.textContent = SECTIONS[state.section].title + ' // ' + SECTIONS[state.section].kicker.split('//')[0].trim();
    this.ui.campaignProgress.style.width = Math.max(0, Math.min(100, state.player.x / LEVEL_END * 100)) + '%';
  }

  showSection(index) {
    const section = SECTIONS[index];
    this.ui.sectionKicker.textContent = section.kicker;
    this.ui.sectionTitle.textContent = section.title;
    this.ui.sectionCopy.textContent = section.copy;
    this.ui.sectionCard.classList.add('show');
    clearTimeout(this.cardTimer);
    this.cardTimer = setTimeout(() => this.ui.sectionCard.classList.remove('show'), 2600);
    this.audio.sfx('stage');
  }

  callout(text) {
    this.ui.callout.textContent = text;
    this.ui.callout.classList.add('show');
    clearTimeout(this.calloutTimer);
    this.calloutTimer = setTimeout(() => this.ui.callout.classList.remove('show'), 1050);
  }

  pause() {
    if (!this.state || !['playing', 'ready'].includes(this.state.mode)) return;
    this.state.previousMode = this.state.mode;
    this.state.mode = 'paused';
    this.ui.pauseScreen.classList.add('screen--active');
    this.touch.releaseAll();
    this.audio.stop();
  }

  async resume() {
    if (this.state?.mode !== 'paused') return;
    this.state.mode = this.state.previousMode || 'playing';
    this.ui.pauseScreen.classList.remove('screen--active');
    this.lastTime = performance.now();
    this.accumulator = 0;
    if (this.state.mode === 'playing') await this.audio.start();
  }

  togglePause() {
    if (this.state?.mode === 'paused') this.resume();
    else this.pause();
  }

  toMenu() {
    this.touch.releaseAll();
    this.audio.stop();
    if (this.state) this.state.mode = 'menu';
    this.hideScreens();
    this.ui.hud.classList.remove('hud--active');
    document.body.classList.remove('running');
    this.ui.readyOverlay.classList.remove('ready-overlay--active');
    this.ui.deathOverlay.classList.remove('death-overlay--active');
    this.ui.menuHighscore.textContent = formatScore(this.bestScore);
    this.ui.menuScreen.classList.add('screen--active');
    document.querySelector('.site-footer').style.display = '';
  }

  hideScreens() {
    document.querySelectorAll('.screen').forEach((screen) => screen.classList.remove('screen--active'));
    this.ui.sectionCard.classList.remove('show');
    this.ui.callout.classList.remove('show');
  }

  showOnly(screen) {
    this.hideScreens();
    screen.classList.add('screen--active');
  }

  frame(time) {
    const started = performance.now();
    const dt = Math.min(.05, Math.max(0, (time - this.lastTime) / 1000));
    this.lastTime = time;
    if (this.state && ['playing', 'dead'].includes(this.state.mode)) {
      this.accumulator += dt;
      while (this.accumulator >= STEP) {
        this.update(STEP);
        this.accumulator -= STEP;
      }
    }
    if (this.state) {
      this.state.renderDelta = dt;
      this.renderer.render(this.state, time);
    }
    this.quality.sample(time, performance.now() - started);
    requestAnimationFrame((next) => this.frame(next));
  }
}

class PlatformInput {
  constructor({ canvas, jump, releaseJump, restart, pause }) {
    this.keyLeft = false;
    this.keyRight = false;
    this.touchLeft = false;
    this.touchRight = false;
    addEventListener('keydown', (event) => {
      if (['KeyA', 'ArrowLeft'].includes(event.code)) this.keyLeft = true;
      if (['KeyD', 'ArrowRight'].includes(event.code)) this.keyRight = true;
      if (['Space', 'KeyW', 'ArrowUp'].includes(event.code)) {
        event.preventDefault();
        if (!event.repeat) jump();
      }
      if (!event.repeat && event.code === 'KeyR') restart();
      if (!event.repeat && (event.code === 'Escape' || event.code === 'KeyP')) pause();
    }, { passive: false });
    addEventListener('keyup', (event) => {
      if (['KeyA', 'ArrowLeft'].includes(event.code)) this.keyLeft = false;
      if (['KeyD', 'ArrowRight'].includes(event.code)) this.keyRight = false;
      if (['Space', 'KeyW', 'ArrowUp'].includes(event.code)) releaseJump();
    });
    canvas.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse') jump();
    });
    canvas.addEventListener('pointerup', releaseJump);
  }

  get left() { return this.keyLeft || this.touchLeft; }

  get right() { return this.keyRight || this.touchRight; }
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  const hundredths = Math.floor(seconds % 1 * 100);
  return String(minutes).padStart(2, '0') + ':' + String(rest).padStart(2, '0') + '.' + String(hundredths).padStart(2, '0');
}

function camel(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}
