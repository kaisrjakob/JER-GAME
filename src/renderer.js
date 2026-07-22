import { TAU, WORLDS, worldIndexForDistance } from './config.js';

const CAMERA_DEPTH = 255;
const VIEW_DISTANCE = 2450;

export class TunnelRenderer {
  constructor(canvas, settings) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d', { alpha: false });
    this.settings = settings;
    this.width = 1;
    this.height = 1;
    this.dpr = 1;
    this.images = [];
    this.particles = [];
    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
  }

  async load(progress = () => {}) {
    let loaded = 0;
    this.images = await Promise.all(WORLDS.map((world) => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        loaded += 1;
        progress(loaded / WORLDS.length);
        resolve(image);
      };
      image.onerror = reject;
      image.src = world.asset;
    })));
  }

  resize() {
    this.width = Math.max(1, this.canvas.clientWidth);
    this.height = Math.max(1, this.canvas.clientHeight);
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  render(state, time) {
    const ctx = this.context;
    const worldIndex = worldIndexForDistance(state.distance);
    const world = WORLDS[worldIndex];
    const shake = state.hitTimer > 0 && !this.settings.reducedMotion ? state.hitTimer * 8 : 0;
    const shakeX = shake ? (Math.random() - 0.5) * shake : 0;
    const shakeY = shake ? (Math.random() - 0.5) * shake : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);
    this.drawBackground(worldIndex, state, time);
    this.drawSpeedLines(state, time);
    this.drawTunnel(world, state, time);
    this.drawObjects(state);
    this.drawParticles(state);
    this.drawRider(state, time);
    ctx.restore();
  }

  drawBackground(worldIndex, state, time) {
    const ctx = this.context;
    const image = this.images[worldIndex];
    const scale = Math.max(this.width / image.width, this.height / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    const parallax = this.settings.reducedMotion ? 0 : Math.sin(state.angle) * 18;
    ctx.drawImage(image, (this.width - width) * 0.5 + parallax, (this.height - height) * 0.5, width, height);
    const gradient = ctx.createRadialGradient(this.width * 0.5, this.height * 0.5, 10, this.width * 0.5, this.height * 0.5, Math.max(this.width, this.height) * 0.75);
    gradient.addColorStop(0, 'rgba(3,14,31,.68)');
    gradient.addColorStop(0.55, 'rgba(2,10,23,.88)');
    gradient.addColorStop(1, 'rgba(1,5,13,.98)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.fillStyle = 'rgba(11,60,105,' + (0.05 + Math.sin(time * 0.0004) * 0.02) + ')';
    ctx.fillRect(0, 0, this.width, this.height);
  }

  centerAt(z, state) {
    const progress = 1 - Math.min(1, z / VIEW_DISTANCE);
    const world = worldIndexForDistance(state.distance);
    const bend = world === 0 ? 0.022 : world === 1 ? 0.055 : 0.038;
    return {
      x: this.width * 0.5 + Math.sin((state.distance + z) * bend * 0.012) * this.width * 0.12 * progress,
      y: this.height * 0.5 + Math.cos((state.distance + z) * bend * 0.009) * this.height * 0.075 * progress
    };
  }

  radiusAt(z) {
    const perspective = CAMERA_DEPTH / Math.max(1, z + CAMERA_DEPTH);
    const farRadius = Math.min(this.width, this.height) * 0.035;
    const nearRadius = Math.max(this.width, this.height) * 0.82;
    return farRadius + (nearRadius - farRadius) * perspective;
  }

  project(z, angle, radial, state) {
    const center = this.centerAt(z, state);
    const radius = this.radiusAt(z) * radial;
    return {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius * 0.68,
      radius
    };
  }

  drawTunnel(world, state, time) {
    const ctx = this.context;
    const spacing = world.ringSpacing;
    const offset = state.distance % spacing;
    const roll = state.distance * 0.0014;
    for (let z = VIEW_DISTANCE - offset; z > 18; z -= spacing) {
      const radius = this.radiusAt(z);
      const center = this.centerAt(z, state);
      const alpha = Math.max(0.035, Math.min(0.34, 1 - z / VIEW_DISTANCE));
      ctx.strokeStyle = hexToRgba(world.colors[2], alpha);
      ctx.lineWidth = Math.max(0.6, 3.5 * CAMERA_DEPTH / (z + CAMERA_DEPTH));
      ctx.beginPath();
      ctx.ellipse(center.x, center.y, radius, radius * 0.68, 0, 0, TAU);
      ctx.stroke();
      if (z % (spacing * 4) < spacing) {
        ctx.strokeStyle = 'rgba(255,122,26,' + alpha * 0.75 + ')';
        ctx.beginPath();
        ctx.ellipse(center.x, center.y, radius, radius * 0.68, 0, roll, roll + 0.55);
        ctx.stroke();
      }
    }

    const ribs = 12;
    for (let index = 0; index < ribs; index += 1) {
      const angle = index / ribs * TAU + roll;
      const far = this.project(VIEW_DISTANCE, angle, 1, state);
      const near = this.project(30, angle, 1, state);
      const gradient = ctx.createLinearGradient(far.x, far.y, near.x, near.y);
      gradient.addColorStop(0, 'rgba(94,157,211,.02)');
      gradient.addColorStop(1, index % 3 === 0 ? 'rgba(255,132,39,.18)' : 'rgba(128,188,239,.12)');
      ctx.strokeStyle = gradient;
      ctx.lineWidth = index % 3 === 0 ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(far.x, far.y);
      ctx.lineTo(near.x, near.y);
      ctx.stroke();
    }

    const vignette = ctx.createRadialGradient(this.width / 2, this.height / 2, Math.min(this.width, this.height) * 0.25, this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.7);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,4,12,.62)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  drawSpeedLines(state, time) {
    if (this.settings.reducedMotion) return;
    const ctx = this.context;
    const count = 20 + Math.floor((state.speed - 60) * 0.35);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < count; i += 1) {
      const phase = ((i * 97.31 + state.distance * (1.2 + i % 4 * 0.08)) % 1100) / 1100;
      const angle = (i * 2.399 + time * 0.00003) % TAU;
      const r1 = Math.min(this.width, this.height) * (0.08 + phase * 0.55);
      const r2 = r1 + 18 + state.speed * 0.18;
      const cx = this.width * 0.5;
      const cy = this.height * 0.5;
      ctx.strokeStyle = i % 5 === 0 ? 'rgba(255,133,42,.24)' : 'rgba(110,190,255,.14)';
      ctx.lineWidth = phase * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1 * 0.68);
      ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2 * 0.68);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawObjects(state) {
    const visible = state.objects
      .filter((object) => {
        const z = object.distance - state.distance;
        return z > 5 && z < VIEW_DISTANCE;
      })
      .sort((a, b) => b.distance - a.distance);
    for (const object of visible) {
      const z = object.distance - state.distance;
      if (object.kind === 'gate') this.drawGate(object, z, state);
      else if (object.kind === 'charge') this.drawCharge(object, z, state);
      else this.drawObstacle(object, z, state);
    }
  }

  drawGate(object, z, state) {
    const ctx = this.context;
    const center = this.centerAt(z, state);
    const radius = this.radiusAt(z) * 0.79;
    const perspective = CAMERA_DEPTH / (z + CAMERA_DEPTH);
    const gap = object.opening;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.shadowColor = '#4eb1ff';
    ctx.shadowBlur = 8 + perspective * 20;
    ctx.strokeStyle = 'rgba(88,181,255,' + (0.45 + perspective * 0.45) + ')';
    ctx.lineWidth = 2 + perspective * 11;
    ctx.beginPath();
    ctx.ellipse(center.x, center.y, radius, radius * 0.68, 0, object.angle + gap * 0.5, object.angle + TAU - gap * 0.5);
    ctx.stroke();
    const left = this.project(z, object.angle - gap * 0.5, 0.79, state);
    const right = this.project(z, object.angle + gap * 0.5, 0.79, state);
    [left, right].forEach((point) => {
      ctx.fillStyle = '#ff8c2d';
      ctx.shadowColor = '#ff6a00';
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2 + perspective * 8, 0, TAU);
      ctx.fill();
    });
    ctx.restore();
  }

  drawObstacle(object, z, state) {
    const ctx = this.context;
    const point = this.project(z, object.angle, 0.73, state);
    const perspective = CAMERA_DEPTH / (z + CAMERA_DEPTH);
    const size = 4 + perspective * 38;
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(object.angle + state.distance * 0.002 * (object.variant + 1));
    ctx.shadowColor = '#ff542f';
    ctx.shadowBlur = 8 + perspective * 16;
    ctx.fillStyle = object.variant === 0 ? '#8d4538' : object.variant === 1 ? '#a56445' : '#6d7580';
    ctx.beginPath();
    for (let i = 0; i < 7; i += 1) {
      const angle = i / 7 * TAU;
      const radius = size * (i % 2 ? 0.62 : 1);
      ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawCharge(object, z, state) {
    const ctx = this.context;
    const point = this.project(z, object.angle, 0.72, state);
    const perspective = CAMERA_DEPTH / (z + CAMERA_DEPTH);
    const size = 3 + perspective * 24;
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(Math.PI / 4 + state.distance * 0.006);
    ctx.globalCompositeOperation = 'screen';
    ctx.shadowColor = '#ff7a1a';
    ctx.shadowBlur = 12 + perspective * 25;
    const gradient = ctx.createLinearGradient(-size, -size, size, size);
    gradient.addColorStop(0, '#fff4d0');
    gradient.addColorStop(0.45, '#ff9a32');
    gradient.addColorStop(1, '#ff5a00');
    ctx.fillStyle = gradient;
    ctx.fillRect(-size, -size, size * 2, size * 2);
    ctx.restore();
  }

  drawRider(state, time) {
    const ctx = this.context;
    const base = Math.min(this.width, this.height) * 0.315;
    const x = this.width * 0.5 + Math.cos(state.angle) * base;
    const y = this.height * 0.5 + Math.sin(state.angle) * base * 0.68;
    const rotation = state.angle + Math.PI / 2;
    const pulse = 1 + Math.sin(time * 0.012) * 0.08;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.globalCompositeOperation = 'screen';
    const trail = ctx.createLinearGradient(0, 8, 0, 68 + state.speed * 0.18);
    trail.addColorStop(0, 'rgba(255,180,82,.85)');
    trail.addColorStop(1, 'rgba(255,86,0,0)');
    ctx.fillStyle = trail;
    ctx.beginPath();
    ctx.moveTo(-6, 7);
    ctx.quadraticCurveTo(0, 48 + state.speed * 0.22, 7, 7);
    ctx.closePath();
    ctx.fill();
    ctx.shadowColor = state.hitTimer > 0 ? '#ff3154' : '#ff8a28';
    ctx.shadowBlur = 28;
    ctx.fillStyle = state.hitTimer > 0 ? '#ff617b' : '#fff3d5';
    ctx.beginPath();
    ctx.moveTo(0, -15 * pulse);
    ctx.lineTo(11 * pulse, 10 * pulse);
    ctx.lineTo(0, 5 * pulse);
    ctx.lineTo(-11 * pulse, 10 * pulse);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff7417';
    ctx.beginPath();
    ctx.arc(0, 1, 4.5 * pulse, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  emit(kind, angle) {
    if (this.settings.reducedMotion) return;
    const color = kind === 'hit' ? '#ff496b' : kind === 'charge' ? '#ff8b22' : '#65c8ff';
    for (let index = 0; index < (kind === 'hit' ? 28 : 16); index += 1) {
      this.particles.push({
        angle,
        radius: Math.min(this.width, this.height) * 0.31,
        life: 0.55 + Math.random() * 0.45,
        speed: 45 + Math.random() * 130,
        drift: (Math.random() - 0.5) * 2.2,
        size: 1.5 + Math.random() * 4,
        color
      });
    }
  }

  drawParticles(state) {
    const ctx = this.context;
    const dt = Math.min(0.033, state.renderDelta || 0.016);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    this.particles = this.particles.filter((particle) => {
      particle.life -= dt;
      if (particle.life <= 0) return false;
      particle.radius += particle.speed * dt;
      particle.angle += particle.drift * dt;
      const x = this.width * 0.5 + Math.cos(particle.angle) * particle.radius;
      const y = this.height * 0.5 + Math.sin(particle.angle) * particle.radius * 0.68;
      ctx.globalAlpha = Math.min(1, particle.life * 2);
      ctx.fillStyle = particle.color;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 9;
      ctx.beginPath();
      ctx.arc(x, y, particle.size, 0, TAU);
      ctx.fill();
      return true;
    });
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

function hexToRgba(hex, alpha) {
  const value = parseInt(hex.slice(1), 16);
  return 'rgba(' + (value >> 16) + ',' + ((value >> 8) & 255) + ',' + (value & 255) + ',' + alpha + ')';
}
