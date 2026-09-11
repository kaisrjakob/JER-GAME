const TIERS = {
  high: { shadows: true, particles: 1, parallaxLayers: 3, dprCap: 2 },
  medium: { shadows: false, particles: .7, parallaxLayers: 2, dprCap: 1.5 },
  low: { shadows: false, particles: .3, parallaxLayers: 1, dprCap: 1 }
};
const ORDER = ['low', 'medium', 'high'];

export const QUALITY = { tier: 'medium', ...TIERS.medium };

export class QualityMonitor {
  constructor(onChange) {
    this.onChange = onChange;
    this.samples = [];
    this.windowStart = 0;
    this.bad = 0;
    this.good = 0;
    this.warmup = 2;
    this.lockUntil = 0;
    this.lockSeconds = 20;
    this.locked = false;
  }

  lock(tier) {
    this.locked = true;
    this.applyTier(tier);
  }

  sample(now, workMs) {
    if (this.locked) return;
    if (!this.windowStart) this.windowStart = now;
    this.samples.push(workMs);
    if (now - this.windowStart < 1000) return;
    this.windowStart = now;
    const median = this.samples.sort((a, b) => a - b)[this.samples.length >> 1];
    this.median = median;
    this.fps = this.samples.length;
    this.samples.length = 0;
    if (this.warmup > 0) {
      this.warmup -= 1;
      return;
    }
    const struggling = median > 6 || (this.fps < 45 && median > 2.5);
    const comfortable = median < 4 && this.fps >= 50;
    if (struggling) { this.bad += 1; this.good = 0; } else if (comfortable) { this.good += 1; this.bad = 0; } else { this.bad = 0; this.good = 0; }
    if (this.bad >= 3) this.shift(-1, now);
    else if (this.good >= 8 && now > this.lockUntil) this.shift(1, now);
  }

  shift(delta, now) {
    const next = ORDER[Math.max(0, Math.min(ORDER.length - 1, ORDER.indexOf(QUALITY.tier) + delta))];
    this.bad = 0;
    this.good = 0;
    if (next === QUALITY.tier) return;
    if (delta > 0) {
      this.lockUntil = now + this.lockSeconds * 1000;
      this.lockSeconds = Math.min(180, this.lockSeconds * 3);
    }
    this.applyTier(next);
  }

  applyTier(tier) {
    QUALITY.tier = tier;
    Object.assign(QUALITY, TIERS[tier]);
    this.onChange(QUALITY);
  }
}
