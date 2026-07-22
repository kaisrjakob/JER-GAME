import { CAMPAIGN_END, TAU, difficultyForDistance, worldIndexForDistance } from './config.js';

export function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

export function normalizeAngle(angle) {
  let value = angle % TAU;
  if (value > Math.PI) value -= TAU;
  if (value < -Math.PI) value += TAU;
  return value;
}

export function angularDistance(a, b) {
  return Math.abs(normalizeAngle(a - b));
}

export function classifyPass(object, playerAngle) {
  const difference = angularDistance(object.angle, playerAngle);
  if (object.kind === 'gate') return difference <= object.opening * 0.5 ? 'perfect' : 'hit';
  if (object.kind === 'charge') return difference <= object.width ? 'charge' : 'miss';
  if (difference <= object.width) return 'hit';
  if (difference <= object.width + 0.32) return 'near';
  return 'clear';
}

export class TrackGenerator {
  constructor(seed = 1974) {
    this.random = mulberry32(seed);
    this.cursor = 620;
    this.lastAngle = -Math.PI / 2;
    this.sequence = 0;
  }

  fill(playerDistance, ahead = 2700) {
    const result = [];
    while (this.cursor < playerDistance + ahead) {
      result.push(this.next());
    }
    return result;
  }

  next() {
    const difficulty = difficultyForDistance(this.cursor);
    const world = worldIndexForDistance(this.cursor);
    const campaignProtected = this.cursor < 1250;
    const roll = this.random();
    let kind = roll < (campaignProtected ? 0.7 : 0.51) ? 'gate' : roll < 0.84 ? 'obstacle' : 'charge';
    if (this.sequence % 7 === 6) kind = 'charge';

    const maxTurn = campaignProtected ? 0.75 : 1.05 + difficulty * 0.18;
    const turn = (this.random() * 2 - 1) * maxTurn;
    this.lastAngle = normalizeAngle(this.lastAngle + turn);
    const object = {
      id: this.sequence,
      kind,
      angle: this.lastAngle,
      distance: this.cursor,
      world,
      processed: false,
      opening: Math.max(0.48, 1.12 - difficulty * 0.18),
      width: kind === 'charge' ? 0.34 : Math.min(0.52, 0.34 + difficulty * 0.045),
      variant: Math.floor(this.random() * 3)
    };

    const baseGap = campaignProtected ? 330 : 285 - difficulty * 26;
    this.cursor += Math.max(185, baseGap + this.random() * 95);
    this.sequence += 1;
    return object;
  }
}

export function isEndless(distance) {
  return distance >= CAMPAIGN_END;
}
