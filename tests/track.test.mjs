import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVEL_END, SECTIONS, calculateScore, formatScore, sectionIndexForX } from '../src/config.js';
import { activeTrapBox, createLevel, overlaps } from '../src/track.js';

test('the hand-authored campaign covers all three Jeremias system sections', () => {
  const level = createLevel();
  assert.equal(SECTIONS.length, 3);
  assert.deepEqual(SECTIONS.map((section) => section.id), ['dw-fu', 'dw-vision', 'fsa-x']);
  assert.deepEqual(new Set(level.platforms.map((platform) => platform.section)), new Set([0, 1, 2]));
  assert.ok(level.finish.x < LEVEL_END);
  assert.equal(level.checkpoints.length, 3);
  assert.equal(level.bands.length, 12);
});

test('fresh levels are independent and every trap starts hidden', () => {
  const first = createLevel();
  const second = createLevel();
  first.traps[0].triggered = true;
  first.bands[0].collected = true;
  assert.equal(second.traps[0].triggered, false);
  assert.equal(second.bands[0].collected, false);
  assert.ok(second.traps.every((trap) => !trap.triggered));
});

test('section mapping changes exactly at the authored boundaries', () => {
  assert.equal(sectionIndexForX(0), 0);
  assert.equal(sectionIndexForX(2399), 0);
  assert.equal(sectionIndexForX(2400), 1);
  assert.equal(sectionIndexForX(4799), 1);
  assert.equal(sectionIndexForX(4800), 2);
});

test('collision helper excludes touching edges and finds real overlap', () => {
  const box = { x: 0, y: 0, width: 50, height: 50 };
  assert.equal(overlaps(box, { x: 49, y: 20, width: 10, height: 10 }), true);
  assert.equal(overlaps(box, { x: 50, y: 20, width: 10, height: 10 }), false);
  assert.equal(overlaps(box, { x: 10, y: 60, width: 10, height: 10 }), false);
});

test('trap hitboxes activate only when the unfair surprise is live', () => {
  const level = createLevel();
  const spikes = level.traps.find((trap) => trap.type === 'spikes');
  const pipe = level.traps.find((trap) => trap.type === 'fallingPipe');
  assert.equal(activeTrapBox(spikes), null);
  spikes.progress = 0.56;
  assert.ok(activeTrapBox(spikes).height > 0);
  assert.equal(activeTrapBox(pipe), null);
  pipe.triggered = true;
  assert.deepEqual(activeTrapBox(pipe), {
    x: pipe.x, y: pipe.y, width: pipe.width, height: pipe.height
  });
});

test('score rewards fast, clean runs and collected Jeremias clamp bands', () => {
  assert.equal(calculateScore(100, 0, 0), 82000);
  assert.equal(calculateScore(100, 1, 0), 77800);
  assert.equal(calculateScore(100, 0, 1), 82900);
  assert.equal(calculateScore(10000, 99, 0), 0);
  assert.equal(formatScore(42.9), '000042');
});
