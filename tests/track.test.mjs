import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMPAIGN_END, WORLDS, difficultyForDistance, formatScore, worldIndexForDistance } from '../src/config.js';
import { TrackGenerator, angularDistance, classifyPass, mulberry32, normalizeAngle } from '../src/track.js';

test('seeded random and track generation are deterministic', () => {
  const first = new TrackGenerator(42).fill(0, 4000);
  const second = new TrackGenerator(42).fill(0, 4000);
  assert.deepEqual(first, second);
  assert.ok(first.length > 8);
  assert.ok(first.every((object, index) => index === 0 || object.distance > first[index - 1].distance));
});

test('track keeps early campaign readable and includes every pickup type', () => {
  const track = new TrackGenerator(1974).fill(0, 9000);
  const early = track.filter((object) => object.distance < 1250);
  assert.ok(early.filter((object) => object.kind === 'gate').length >= 2);
  assert.deepEqual(new Set(track.map((object) => object.kind)), new Set(['gate', 'obstacle', 'charge']));
  assert.ok(track.every((object) => object.angle >= -Math.PI && object.angle <= Math.PI));
});

test('angular calculations wrap across the seam', () => {
  assert.ok(angularDistance(Math.PI - 0.1, -Math.PI + 0.1) < 0.21);
  assert.ok(normalizeAngle(Math.PI * 3) <= Math.PI);
  assert.ok(normalizeAngle(-Math.PI * 3) >= -Math.PI);
});

test('pass classification handles gates, hazards and charges', () => {
  assert.equal(classifyPass({ kind: 'gate', angle: 0, opening: 1 }, 0.4), 'perfect');
  assert.equal(classifyPass({ kind: 'gate', angle: 0, opening: 1 }, 0.8), 'hit');
  assert.equal(classifyPass({ kind: 'obstacle', angle: 0, width: 0.3 }, 0.2), 'hit');
  assert.equal(classifyPass({ kind: 'obstacle', angle: 0, width: 0.3 }, 0.5), 'near');
  assert.equal(classifyPass({ kind: 'charge', angle: 0, width: 0.3 }, 0.2), 'charge');
});

test('campaign maps exactly to three worlds and then loops', () => {
  assert.equal(WORLDS.length, 3);
  assert.equal(worldIndexForDistance(0), 0);
  assert.equal(worldIndexForDistance(2800), 1);
  assert.equal(worldIndexForDistance(5600), 2);
  assert.equal(worldIndexForDistance(CAMPAIGN_END), 0);
  assert.ok(difficultyForDistance(CAMPAIGN_END + 9000) > difficultyForDistance(0));
  assert.equal(formatScore(42.9), '000042');
});

test('mulberry32 always returns normalized values', () => {
  const random = mulberry32(1);
  for (let index = 0; index < 1000; index += 1) {
    const value = random();
    assert.ok(value >= 0 && value < 1);
  }
});
