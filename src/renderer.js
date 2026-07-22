import {
  GAME_ASSETS, LEVEL_END, PLAYER_HEIGHT, PLAYER_WIDTH, SECTIONS, VIEW_HEIGHT,
  VIEW_WIDTH, sectionIndexForX
} from './config.js';

export class UnfairRenderer {
  constructor(canvas, settings) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.settings = settings;
    this.images = [];
    this.logo = null;
    this.clampBand = null;
    this.dwPipe = null;
    this.rainCap = null;
    this.particles = [];
    this.width = 1;
    this.height = 1;
    this.dpr = 1;
    addEventListener('resize', () => this.resize());
    this.resize();
  }

  async load(progress = () => {}) {
    const sources = [
      ...SECTIONS.map((section) => section.asset), 'assets/jeremias-logo.png',
      GAME_ASSETS.clampBand, GAME_ASSETS.dwPipe, GAME_ASSETS.rainCap
    ];
    let loaded = 0;
    const images = await Promise.all(sources.map((source) => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        loaded += 1;
        progress(loaded / sources.length);
        resolve(image);
      };
      image.onerror = reject;
      image.src = source;
    })));
    const sectionCount = SECTIONS.length;
    this.images = images.slice(0, sectionCount);
    this.logo = images[sectionCount];
    this.clampBand = images[sectionCount + 1];
    this.dwPipe = images[sectionCount + 2];
    this.rainCap = images[sectionCount + 3];
  }

  resize() {
    this.width = Math.max(1, this.canvas.clientWidth);
    this.height = Math.max(1, this.canvas.clientHeight);
    this.dpr = Math.min(2, devicePixelRatio || 1);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
  }

  render(state, time) {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#020814';
    ctx.fillRect(0, 0, this.width, this.height);
    this.drawBackdrop(state);
    const scale = Math.min(this.width / VIEW_WIDTH, this.height / VIEW_HEIGHT);
    const offsetX = (this.width - VIEW_WIDTH * scale) * 0.5;
    const offsetY = (this.height - VIEW_HEIGHT * scale) * 0.5;
    ctx.setTransform(this.dpr * scale, 0, 0, this.dpr * scale, offsetX * this.dpr, offsetY * this.dpr);
    this.drawParallax(state);
    this.drawPlatforms(state, time);
    this.drawCheckpoints(state, time);
    this.drawBands(state, time);
    this.drawTraps(state, time);
    this.drawFinish(state, time);
    this.drawFinaleCaps(state);
    this.drawParticles(state);
    this.drawPlayer(state, time);
    this.drawSoot(state);
    this.drawVignette();
  }

  drawBackdrop(state) {
    const ctx = this.ctx;
    const index = sectionIndexForX(state.player.x);
    const image = this.images[index];
    const scale = Math.max(this.width / image.width, this.height / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    const parallax = this.settings.reducedMotion ? 0 : -(state.cameraX * 0.025) % 100;
    ctx.drawImage(image, (this.width - width) / 2 + parallax, (this.height - height) / 2, width, height);
    if (SECTIONS[index].tint) {
      ctx.fillStyle = SECTIONS[index].tint;
      ctx.fillRect(0, 0, this.width, this.height);
    }
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, 'rgba(1,8,20,.48)');
    gradient.addColorStop(.48, 'rgba(3,16,34,.73)');
    gradient.addColorStop(1, 'rgba(2,7,15,.97)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  worldX(x, state) {
    return x - state.cameraX;
  }

  drawParallax(state) {
    const ctx = this.ctx;
    for (let layer = 0; layer < 3; layer += 1) {
      const base = 535 + layer * 55;
      const speed = .08 + layer * .07;
      ctx.fillStyle = 'rgba(' + (10 + layer * 8) + ',' + (29 + layer * 11) + ',' + (49 + layer * 17) + ',' + (.78 - layer * .16) + ')';
      ctx.beginPath();
      ctx.moveTo(0, VIEW_HEIGHT);
      for (let i = -2; i < 15; i += 1) {
        const x = i * 145 - (state.cameraX * speed) % 145;
        const h = 70 + ((i * 61 + layer * 43) % 150);
        ctx.lineTo(x, base - h);
        ctx.lineTo(x + 105, base - h);
        ctx.lineTo(x + 105, VIEW_HEIGHT);
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  drawPlatforms(state, time) {
    const ctx = this.ctx;
    for (const platform of state.level.platforms) {
      const x = this.worldX(platform.x, state);
      const y = platform.y + platform.fallY;
      if (x > VIEW_WIDTH + 100 || x + platform.width < -100 || y > VIEW_HEIGHT + 150) continue;
      const section = SECTIONS[platform.section];
      const body = ctx.createLinearGradient(0, y, 0, VIEW_HEIGHT);
      body.addColorStop(0, '#1d3449');
      body.addColorStop(.08, '#0f2337');
      body.addColorStop(1, '#06101e');
      ctx.fillStyle = body;
      ctx.fillRect(x, y, platform.width, VIEW_HEIGHT - y + 100);
      const steel = ctx.createLinearGradient(0, y - 18, 0, y + 12);
      steel.addColorStop(0, '#f4f7f8');
      steel.addColorStop(.22, '#617c90');
      steel.addColorStop(.58, '#dce8ed');
      steel.addColorStop(1, '#2e465b');
      ctx.fillStyle = steel;
      ctx.fillRect(x, y - 18, platform.width, 24);
      ctx.fillStyle = '#344e63';
      for (let clampX = x + 85; clampX < x + platform.width; clampX += 150) {
        ctx.fillRect(clampX, y - 22, 11, 32);
        ctx.fillStyle = '#c5d4dc';
        ctx.fillRect(clampX + 3, y - 22, 3, 32);
        ctx.fillStyle = '#344e63';
      }
      if (platform.width >= 220) {
        ctx.fillStyle = 'rgba(181,214,234,.25)';
        ctx.font = '700 15px "Barlow Condensed",sans-serif';
        ctx.fillText(section.title + ' // JEREMIAS', x + 28, y + 43);
      }
      if (platform.phantom) {
        ctx.fillStyle = 'rgba(96,52,24,.16)';
        ctx.fillRect(x, y - 14, platform.width, 8);
      }
      if (platform.ice) {
        ctx.fillStyle = 'rgba(196,232,252,.55)';
        ctx.fillRect(x, y - 20, platform.width, 10);
        ctx.fillStyle = 'rgba(255,255,255,.75)';
        for (let shineX = x + 30; shineX < x + platform.width - 40; shineX += 120) {
          ctx.fillRect(shineX, y - 18, 44, 3);
        }
      }
      if (platform.moving) {
        ctx.strokeStyle = '#ff8624';
        ctx.setLineDash([8, 8]);
        ctx.strokeRect(x + 8, y - 27, platform.width - 16, 42);
        ctx.setLineDash([]);
      }
      if (platform.collapsible && platform.triggered && platform.timer < .6) {
        ctx.fillStyle = 'rgba(255,122,26,' + (.15 + Math.sin(time * .03) * .1) + ')';
        ctx.fillRect(x, y - 18, platform.width, 45);
      }
    }
  }

  drawBands(state, time) {
    const ctx = this.ctx;
    for (const band of state.level.bands) {
      if (band.collected) continue;
      const x = this.worldX(band.x, state);
      if (x < -70 || x > VIEW_WIDTH + 70) continue;
      const y = band.y;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(time * .003 + band.baseX) * .08);
      ctx.shadowColor = '#ff7a1a';
      ctx.shadowBlur = 18;
      ctx.drawImage(this.clampBand, -46, -30, 92, 60);
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,126,28,.85)';
      ctx.beginPath(); ctx.arc(0, 1, 4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  drawCheckpoints(state, time) {
    const ctx = this.ctx;
    for (const checkpoint of state.level.checkpoints) {
      const x = this.worldX(checkpoint.x, state);
      if (x < -150 || x > VIEW_WIDTH + 150) continue;
      ctx.strokeStyle = checkpoint.active ? '#43e39a' : '#0d83d5';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(x, checkpoint.y);
      ctx.lineTo(x, checkpoint.y - 180);
      ctx.stroke();
      ctx.fillStyle = checkpoint.active ? '#1b9f6b' : '#0065ad';
      ctx.beginPath();
      ctx.moveTo(x, checkpoint.y - 180);
      ctx.lineTo(x + 125, checkpoint.y - 153 + Math.sin(time * .004) * 4);
      ctx.lineTo(x, checkpoint.y - 116);
      ctx.closePath();
      ctx.fill();
      if (this.logo) ctx.drawImage(this.logo, x + 13, checkpoint.y - 166, 91, 23);
      ctx.fillStyle = '#d8e8f2';
      ctx.font = '700 12px "Barlow Condensed",sans-serif';
      ctx.fillText(checkpoint.active ? 'CHECKPOINT AKTIV' : 'SERVICEPUNKT', x + 12, checkpoint.y - 196);
    }
  }

  drawTraps(state, time) {
    for (const trap of state.level.traps) {
      if (trap.type === 'spikes') this.drawSpikes(trap, state);
      else if (trap.type === 'fallingPipe') this.drawFallingPipe(trap, state);
      else if (trap.type === 'swingCap') this.drawSwingCap(trap, state);
      else if (trap.type === 'ghostBlock') this.drawGhostBlock(trap, state);
      else if (trap.type === 'fakeCheckpoint') this.drawFakeCheckpoint(trap, state, time);
      else if (trap.type === 'pressure') this.drawPressure(trap, state, time);
      else if (trap.type === 'windZone') this.drawWindZone(trap, state, time);
      else if (trap.type === 'dripper') this.drawDripper(trap, state, time);
      else if (trap.type === 'fan') this.drawFan(trap, state);
      else if (trap.type === 'steamVent') this.drawSteamVent(trap, state, time);
      else if (trap.type === 'crusher') this.drawCrusher(trap, state);
      else if (trap.type === 'mimicBand') this.drawMimicBand(trap, state, time);
    }
    const ctx = this.ctx;
    const fakeX = this.worldX(6070, state);
    if (fakeX > -200 && fakeX < VIEW_WIDTH + 200) {
      ctx.fillStyle = '#f5f7f8';
      ctx.fillRect(fakeX, 505, 9, 165);
      ctx.fillStyle = '#ff7a1a';
      ctx.fillRect(fakeX, 505, 126, 55);
      ctx.fillStyle = '#fff';
      ctx.font = '800 18px "Barlow Condensed",sans-serif';
      ctx.fillText('ZIEL?', fakeX + 22, 540);
    }
  }

  drawSpikes(trap, state) {
    const ctx = this.ctx;
    const x = this.worldX(trap.x, state);
    if (x < -200 || x > VIEW_WIDTH + 200 || trap.progress <= 0) return;
    const height = trap.height * trap.progress;
    const count = Math.ceil(trap.width / 30);
    ctx.fillStyle = '#cfdce3';
    ctx.strokeStyle = '#ff7a1a';
    ctx.lineWidth = 3;
    for (let i = 0; i < count; i += 1) {
      const spikeX = x + i * trap.width / count;
      ctx.beginPath();
      ctx.moveTo(spikeX, trap.y);
      ctx.lineTo(spikeX + trap.width / count / 2, trap.y - height);
      ctx.lineTo(spikeX + trap.width / count, trap.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  drawFallingPipe(trap, state) {
    if (trap.cleared) return;
    const ctx = this.ctx;
    const x = this.worldX(trap.x, state);
    if (x < -180 || x > VIEW_WIDTH + 180) return;
    if (!trap.triggered) return;
    const housingY = trap.startY - 28;
    ctx.fillStyle = '#172b3d';
    ctx.fillRect(x - 18, housingY, trap.width + 36, 28);
    ctx.fillStyle = '#869aa8';
    ctx.fillRect(x - 12, housingY + 5, trap.width + 24, 9);
    ctx.fillStyle = '#ff7a1a';
    for (let stripe = x - 10; stripe < x + trap.width + 8; stripe += 22) ctx.fillRect(stripe, housingY + 18, 11, 5);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.65)';
    ctx.shadowBlur = 10;
    ctx.drawImage(this.dwPipe, x - 7, trap.y - 5, trap.width + 14, trap.height + 10);
    ctx.restore();
  }

  drawSwingCap(trap, state) {
    if (trap.cleared) return;
    const ctx = this.ctx;
    const x = this.worldX(trap.x, state);
    if (x < -180 || x > VIEW_WIDTH + 180) return;
    ctx.save();
    ctx.translate(x + trap.width / 2, trap.y + trap.height / 2);
    ctx.rotate(trap.angle);
    ctx.shadowColor = 'rgba(0,0,0,.6)';
    ctx.shadowBlur = 12;
    ctx.drawImage(this.rainCap, -trap.width / 2, -trap.height / 2, trap.width, trap.height);
    ctx.restore();
    if (trap.phase === 'idle') {
      ctx.fillStyle = '#486175';
      ctx.fillRect(x + 34, trap.y + trap.height - 2, 24, 18);
    }
  }

  drawGhostBlock(trap, state) {
    if (!trap.revealed) return;
    const ctx = this.ctx;
    const x = this.worldX(trap.x, state);
    if (x < -120 || x > VIEW_WIDTH + 120) return;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.55)';
    ctx.shadowBlur = 9;
    ctx.drawImage(this.dwPipe, x - 4, trap.y - 4, trap.width + 8, trap.height + 8);
    ctx.restore();
    ctx.strokeStyle = 'rgba(159,184,200,.7)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, trap.y, trap.width, trap.height);
  }

  drawFakeCheckpoint(trap, state, time) {
    const ctx = this.ctx;
    const x = this.worldX(trap.x, state);
    if (x < -150 || x > VIEW_WIDTH + 150) return;
    const baseY = trap.y;
    ctx.strokeStyle = trap.exposed ? '#e6483d' : '#0d83d5';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x, baseY - 180);
    ctx.stroke();
    ctx.fillStyle = trap.exposed ? '#a3271e' : '#0065ad';
    ctx.beginPath();
    ctx.moveTo(x, baseY - 180);
    ctx.lineTo(x + 125, baseY - 153 + Math.sin(time * .004) * 4);
    ctx.lineTo(x, baseY - 116);
    ctx.closePath();
    ctx.fill();
    if (trap.exposed) {
      ctx.strokeStyle = '#ffd9d5';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x + 24, baseY - 168);
      ctx.lineTo(x + 66, baseY - 128);
      ctx.moveTo(x + 66, baseY - 168);
      ctx.lineTo(x + 24, baseY - 128);
      ctx.stroke();
    } else if (this.logo) {
      ctx.drawImage(this.logo, x + 13, baseY - 166, 91, 23);
    }
    ctx.fillStyle = '#d8e8f2';
    ctx.font = '700 12px "Barlow Condensed",sans-serif';
    ctx.fillText(trap.exposed ? 'NICHT ZERTIFIZIERT' : 'SERVICEPUNKT', x + 12, baseY - 196);
  }

  drawFinaleCaps(state) {
    const ctx = this.ctx;
    for (const trap of state.level.traps) {
      if (trap.type !== 'finaleCap') continue;
      const x = this.worldX(trap.x, state);
      if (x < -260 || x > VIEW_WIDTH + 260) continue;
      ctx.save();
      if (trap.phase === 'toppled') {
        ctx.translate(x + trap.width + 46, trap.floorY - 34);
        ctx.rotate(1.35);
        ctx.globalAlpha = .9;
        ctx.drawImage(this.rainCap, -trap.width / 2, -trap.height / 2, trap.width, trap.height);
      } else {
        ctx.translate(x + trap.width / 2, trap.y + trap.height / 2);
        ctx.rotate(trap.angle);
        ctx.shadowColor = 'rgba(0,0,0,.6)';
        ctx.shadowBlur = 14;
        ctx.drawImage(this.rainCap, -trap.width / 2, -trap.height / 2, trap.width, trap.height);
      }
      ctx.restore();
    }
  }

  drawPressure(trap, state, time) {
    const ctx = this.ctx;
    const x = this.worldX(trap.x, state);
    if (x < -260 || x > VIEW_WIDTH + 260) return;
    ctx.fillStyle = '#5c7487';
    ctx.fillRect(x, trap.y - 95, 56, 95);
    ctx.fillStyle = '#d9e5ea';
    ctx.beginPath();
    ctx.ellipse(x + 28, trap.y - 95, 34, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#17364f';
    ctx.font = '700 11px "Barlow Condensed",sans-serif';
    ctx.fillText('PRÜFÖFFNUNG', x - 8, trap.y + 25);
    if (trap.triggered && trap.timer > .28 && trap.timer < 1.1) {
      const length = 190 + Math.sin(time * .03) * 15;
      const blast = ctx.createLinearGradient(x, 0, x - length, 0);
      blast.addColorStop(0, 'rgba(255,155,61,.9)');
      blast.addColorStop(1, 'rgba(79,186,255,0)');
      ctx.fillStyle = blast;
      ctx.beginPath();
      ctx.moveTo(x, trap.y - 112);
      ctx.lineTo(x - length, trap.y - 170);
      ctx.lineTo(x - length, trap.y - 45);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawWindZone(trap, state, time) {
    if (!trap.active) return;
    const ctx = this.ctx;
    const x = this.worldX(trap.x, state);
    if (x + trap.width < -100 || x > VIEW_WIDTH + 100) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(190,224,248,.5)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    const drift = this.settings.reducedMotion ? 0 : (time * .45) % 90;
    for (let row = 0; row < 5; row += 1) {
      const streakY = 300 + row * 78 + Math.sin(time * .002 + row * 2) * 14;
      for (let streakX = x + trap.width; streakX > x - 90; streakX -= 130) {
        const sx = streakX - drift * -trap.direction;
        ctx.globalAlpha = .28 + row % 2 * .18;
        ctx.beginPath();
        ctx.moveTo(sx, streakY);
        ctx.lineTo(sx + trap.direction * 68, streakY + 5);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  drawDripper(trap, state, time) {
    const ctx = this.ctx;
    const x = this.worldX(trap.x, state);
    if (x < -100 || x > VIEW_WIDTH + 100) return;
    ctx.fillStyle = '#42586a';
    ctx.fillRect(x - 8, trap.outletY - 46, trap.width + 16, 46);
    ctx.fillStyle = '#243a4c';
    ctx.fillRect(x - 2, trap.outletY - 12, trap.width + 4, 12);
    ctx.fillStyle = 'rgba(143,224,138,.85)';
    ctx.beginPath();
    ctx.ellipse(x + 13, trap.outletY + 2, 8, 5 + Math.sin(time * .01) * 2, 0, 0, Math.PI * 2);
    ctx.fill();
    if (trap.dropActive) {
      ctx.fillStyle = '#8fe08a';
      ctx.shadowColor = '#8fe08a';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.ellipse(x + 13, trap.dropY + 17, 9, 17, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.fillStyle = 'rgba(120,200,120,.3)';
    ctx.beginPath();
    ctx.ellipse(x + 13, trap.floorY, 26, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawFan(trap, state) {
    const ctx = this.ctx;
    const x = this.worldX(trap.x, state);
    if (x < -200 || x > VIEW_WIDTH + 200) return;
    const cx = x + trap.thickness / 2;
    ctx.fillStyle = '#17364e';
    ctx.fillRect(x - 14, trap.cy - trap.radius - 26, trap.thickness + 28, 26);
    ctx.fillStyle = '#ff7a1a';
    for (let stripe = x - 10; stripe < x + trap.thickness + 12; stripe += 18) {
      ctx.fillRect(stripe, trap.cy - trap.radius - 18, 9, 5);
    }
    ctx.save();
    ctx.translate(cx, trap.cy);
    ctx.rotate(0);
    ctx.strokeStyle = '#b7cdd9';
    ctx.lineWidth = 11;
    ctx.lineCap = 'round';
    for (let blade = 0; blade < 4; blade += 1) {
      const angle = trap.angle + blade * Math.PI / 2;
      ctx.globalAlpha = .95;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * 8, Math.sin(angle) * trap.radius);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#0d83d5';
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#cfdce3';
    ctx.font = '700 11px "Barlow Condensed",sans-serif';
    ctx.fillText('ABLUFT', x - 6, trap.cy - trap.radius - 34);
  }

  drawSteamVent(trap, state, time) {
    const ctx = this.ctx;
    const x = this.worldX(trap.x, state);
    if (x < -150 || x > VIEW_WIDTH + 150) return;
    ctx.fillStyle = '#42586a';
    ctx.fillRect(x - 6, trap.floorY - 16, trap.width + 12, 16);
    ctx.fillStyle = '#ff7a1a';
    ctx.fillRect(x, trap.floorY - 12, trap.width, 4);
    if (trap.active) {
      const jet = ctx.createLinearGradient(0, trap.floorY, 0, trap.floorY - trap.jetHeight);
      jet.addColorStop(0, 'rgba(226,242,250,.85)');
      jet.addColorStop(1, 'rgba(226,242,250,0)');
      ctx.fillStyle = jet;
      const wobble = this.settings.reducedMotion ? 0 : Math.sin(time * .02) * 6;
      ctx.beginPath();
      ctx.moveTo(x + 4, trap.floorY - 12);
      ctx.lineTo(x - 10 + wobble, trap.floorY - trap.jetHeight);
      ctx.lineTo(x + trap.width + 10 + wobble, trap.floorY - trap.jetHeight);
      ctx.lineTo(x + trap.width - 4, trap.floorY - 12);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#cfdce3';
    ctx.font = '700 11px "Barlow Condensed",sans-serif';
    ctx.fillText('DAMPF', x + 8, trap.floorY + 20);
  }

  drawCrusher(trap, state) {
    const ctx = this.ctx;
    const x = this.worldX(trap.x, state);
    if (x < -220 || x > VIEW_WIDTH + 220) return;
    ctx.fillStyle = '#17364e';
    ctx.fillRect(x - 20, trap.raisedY - 60, 16, trap.floorY - trap.raisedY + 60);
    ctx.fillRect(x + trap.width + 4, trap.raisedY - 60, 16, trap.floorY - trap.raisedY + 60);
    ctx.fillRect(x - 20, trap.raisedY - 76, trap.width + 40, 24);
    ctx.fillStyle = '#5c7487';
    ctx.fillRect(x + trap.width / 2 - 9, trap.raisedY - 52, 18, trap.plateY - trap.raisedY + 52);
    const plate = ctx.createLinearGradient(0, trap.plateY, 0, trap.plateY + trap.plateHeight);
    plate.addColorStop(0, '#dce8ed');
    plate.addColorStop(.5, '#617c90');
    plate.addColorStop(1, '#2e465b');
    ctx.fillStyle = plate;
    ctx.fillRect(x, trap.plateY, trap.width, trap.plateHeight);
    ctx.fillStyle = '#ff7a1a';
    for (let stripe = x + 6; stripe < x + trap.width - 10; stripe += 26) {
      ctx.fillRect(stripe, trap.plateY + trap.plateHeight - 12, 14, 6);
    }
    ctx.fillStyle = '#fff';
    ctx.font = '700 12px "Barlow Condensed",sans-serif';
    ctx.fillText('PRÜFSTEMPEL', x + 18, trap.raisedY - 58);
  }

  drawMimicBand(trap, state, time) {
    if (trap.sprung) return;
    const ctx = this.ctx;
    const x = this.worldX(trap.x, state);
    if (x < -70 || x > VIEW_WIDTH + 70) return;
    ctx.save();
    ctx.translate(x, trap.y);
    ctx.rotate(.25 + Math.sin(time * .003 + trap.x) * .08);
    ctx.shadowColor = '#e6483d';
    ctx.shadowBlur = 18;
    ctx.drawImage(this.clampBand, -46, -30, 92, 60);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(230,72,61,.85)';
    ctx.beginPath(); ctx.arc(0, 1, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  drawSoot(state) {
    const zones = state.level.traps.filter((trap) => trap.type === 'sootZone');
    if (!zones.length) return;
    const center = state.player.x + PLAYER_WIDTH / 2;
    let penetration = 0;
    for (const zone of zones) {
      if (center < zone.x - 150 || center > zone.x + zone.width + 150) continue;
      const inLeft = Math.min(1, Math.max(0, (center - (zone.x - 150)) / 150));
      const inRight = Math.min(1, Math.max(0, ((zone.x + zone.width + 150) - center) / 150));
      penetration = Math.max(penetration, Math.min(inLeft, inRight));
    }
    if (penetration <= 0) return;
    const ctx = this.ctx;
    const px = this.worldX(center, state);
    const py = state.player.y + PLAYER_HEIGHT / 2;
    const gradient = ctx.createRadialGradient(px, py, 60, px, py, 640);
    gradient.addColorStop(0, 'rgba(2,4,10,0)');
    gradient.addColorStop(.35, 'rgba(2,4,10,0)');
    gradient.addColorStop(1, 'rgba(2,4,10,' + (.93 * penetration) + ')');
    ctx.fillStyle = gradient;
    ctx.fillRect(-100, -100, VIEW_WIDTH + 200, VIEW_HEIGHT + 200);
  }

  drawFinish(state, time) {
    const ctx = this.ctx;
    const x = this.worldX(state.level.finish.x, state);
    if (x < -300 || x > VIEW_WIDTH + 400) return;
    const y = state.level.finish.y;
    const width = 135;
    const tower = ctx.createLinearGradient(x, 0, x + width, 0);
    tower.addColorStop(0, '#243f56');
    tower.addColorStop(.2, '#dce7eb');
    tower.addColorStop(.5, '#627d91');
    tower.addColorStop(.8, '#f3f6f7');
    tower.addColorStop(1, '#274258');
    ctx.fillStyle = tower;
    ctx.fillRect(x, y - 470, width, 470);
    ctx.fillStyle = '#314b60';
    for (let py = y - 390; py < y; py += 95) ctx.fillRect(x - 18, py, width + 36, 12);
    ctx.strokeStyle = '#96aabd';
    ctx.lineWidth = 6;
    ctx.strokeRect(x - 26, y - 285, width + 52, 28);
    ctx.fillStyle = '#ff7a1a';
    ctx.globalAlpha = .65 + Math.sin(time * .006) * .25;
    ctx.fillRect(x + width / 2 - 5, y - 520, 10, 55);
    ctx.globalAlpha = 1;
    if (this.logo) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(x - 60, y - 215, 255, 78);
      ctx.drawImage(this.logo, x - 38, y - 197, 208, 52);
    }
    ctx.fillStyle = '#fff';
    ctx.font = '800 22px "Barlow Condensed",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ECHTES ZIEL // FSA-X', x + width / 2, y - 545);
  }

  drawPlayer(state, time) {
    const ctx = this.ctx;
    const player = state.player;
    const x = this.worldX(player.x, state);
    const phase = time * .015;
    const leg = player.onGround && Math.abs(player.vx) > 20 ? Math.sin(phase) * 17 : 5;
    const arm = player.onGround && Math.abs(player.vx) > 20 ? -leg * .7 : -9;
    ctx.save();
    ctx.translate(x + PLAYER_WIDTH / 2, player.y + PLAYER_HEIGHT / 2);
    if (player.invulnerable > 0 && Math.floor(time / 80) % 2 === 0) ctx.globalAlpha = .28;
    ctx.scale(player.facing, 1);
    ctx.rotate(player.onGround ? 0 : Math.max(-.18, Math.min(.22, player.vy / 1800)));
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#08243d';
    ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.moveTo(-8, 24); ctx.lineTo(-13 + leg, 49);
    ctx.moveTo(8, 24); ctx.lineTo(13 - leg, 49);
    ctx.stroke();
    ctx.strokeStyle = '#0871bd';
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(-18, -8); ctx.lineTo(-25 + arm, 16);
    ctx.moveTo(18, -8); ctx.lineTo(25 - arm, 16);
    ctx.stroke();
    ctx.fillStyle = '#075d9e';
    roundRect(ctx, -23, -31, 46, 63, 14); ctx.fill();
    ctx.fillStyle = '#ff7a1a'; ctx.fillRect(-23, -7, 46, 16);
    ctx.fillStyle = '#dceaf1'; ctx.beginPath(); ctx.arc(0, -42, 20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff892b'; ctx.fillRect(-24, -54, 48, 12);
    ctx.fillStyle = '#17364e'; ctx.fillRect(4, -45, 17, 7);
    ctx.fillStyle = '#fff'; ctx.font = '800 13px "Barlow Condensed",sans-serif'; ctx.textAlign = 'center'; ctx.fillText('J', 0, 7);
    ctx.restore();
  }

  emit(x, y, color, count = 18) {
    if (this.settings.reducedMotion) return;
    for (let i = 0; i < count; i += 1) this.particles.push({
      x, y, color,
      vx: (Math.random() - .5) * 270,
      vy: -90 - Math.random() * 280,
      life: .55 + Math.random() * .5,
      size: 3 + Math.random() * 6
    });
  }

  drawParticles(state) {
    const ctx = this.ctx;
    const dt = Math.min(.033, state.renderDelta || .016);
    this.particles = this.particles.filter((p) => {
      p.life -= dt;
      if (p.life <= 0) return false;
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 520 * dt;
      ctx.globalAlpha = Math.min(1, p.life * 2);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(this.worldX(p.x, state), p.y, p.size, 0, Math.PI * 2); ctx.fill();
      return true;
    });
    ctx.globalAlpha = 1;
  }

  drawVignette() {
    const ctx = this.ctx;
    const gradient = ctx.createRadialGradient(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, 300, VIEW_WIDTH / 2, VIEW_HEIGHT / 2, 900);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,3,10,.48)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  }
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}
