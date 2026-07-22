import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GRAVITY, JUMP_SPEED, LEVEL_END, PLAYER_WIDTH, RUN_SPEED, SECTIONS,
  calculateScore, formatScore, sectionIndexForX
} from '../src/config.js';
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
  pipe.cleared = true;
  assert.equal(activeTrapBox(pipe), null);
});

test('every fallen pipe can be cleared by the configured jump', () => {
  const jumpRise = JUMP_SPEED ** 2 / (2 * GRAVITY);
  const pipes = createLevel().traps.filter((trap) => trap.type === 'fallingPipe');
  assert.ok(pipes.length > 0);
  for (const pipe of pipes) {
    assert.ok(pipe.height <= jumpRise - 25, `${pipe.id} is too tall to jump`);
    const airTime = 2 * JUMP_SPEED / GRAVITY;
    assert.ok(pipe.width + PLAYER_WIDTH < RUN_SPEED * airTime, `${pipe.id} is too wide to jump`);
  }
});

test('every raised chimney-cap spike field can be jumped', () => {
  const jumpRise = JUMP_SPEED ** 2 / (2 * GRAVITY);
  const airTime = 2 * JUMP_SPEED / GRAVITY;
  const spikes = createLevel().traps.filter((trap) => trap.type === 'spikes');
  for (const spike of spikes) {
    assert.ok(spike.height < jumpRise, `${spike.id} is too high to jump`);
    assert.ok(spike.width + PLAYER_WIDTH < RUN_SPEED * airTime, `${spike.id} is too wide to jump`);
  }
});

test('every gap between consecutive platforms is reachable', () => {
  const platforms = createLevel().platforms;
  for (let index = 1; index < platforms.length; index += 1) {
    const previous = platforms[index - 1];
    const next = platforms[index];
    const gap = next.x - (previous.x + previous.width);
    const deltaY = next.y - previous.y;
    const discriminant = JUMP_SPEED ** 2 + 2 * GRAVITY * deltaY;
    assert.ok(discriminant >= 0, `${next.id} is above the maximum jump height`);
    const descendingTime = (JUMP_SPEED + Math.sqrt(discriminant)) / GRAVITY;
    const reachableGap = RUN_SPEED * descendingTime;
    assert.ok(gap + PLAYER_WIDTH * .25 < reachableGap, `${next.id} is beyond jump range`);
  }
});

test('the moving DW-VISION platform remains reachable at its highest point', () => {
  const platforms = createLevel().platforms;
  const liftIndex = platforms.findIndex((platform) => platform.id === 'vision-lift');
  const previous = platforms[liftIndex - 1];
  const lift = platforms[liftIndex];
  const highestY = lift.y - 52;
  const deltaY = highestY - previous.y;
  const descendingTime = (JUMP_SPEED + Math.sqrt(JUMP_SPEED ** 2 + 2 * GRAVITY * deltaY)) / GRAVITY;
  const physicalGap = lift.x - (previous.x + previous.width);
  const playerAssistedGap = Math.max(0, physicalGap - (PLAYER_WIDTH - 16));
  assert.ok(playerAssistedGap < RUN_SPEED * descendingTime);
});

test('pressure blasts leave a safe ground-level route', () => {
  const level = createLevel();
  const pressureTraps = level.traps.filter((trap) => trap.type === 'pressure');
  for (const trap of pressureTraps) {
    const approach = level.platforms.find((platform) => trap.triggerX >= platform.x && trap.triggerX < platform.x + platform.width);
    assert.ok(approach, `${trap.id} has no approach platform`);
    const standingPlayerTop = approach.y - 82 + 5;
    const blastBottom = trap.y - 40;
    assert.ok(blastBottom < standingPlayerTop, `${trap.id} blocks the safe ground route`);
  }
});

test('collapsing roofs stay stable long enough to traverse', () => {
  const roofs = createLevel().platforms.filter((platform) => platform.collapsible);
  for (const roof of roofs) {
    const crossingTime = (roof.width - PLAYER_WIDTH) / RUN_SPEED;
    assert.ok(roof.collapseDelay > crossingTime, `${roof.id} collapses before it can be crossed`);
  }
});

test('score rewards fast, clean runs and collected Jeremias clamp bands', () => {
  assert.equal(calculateScore(100, 0, 0), 82000);
  assert.equal(calculateScore(100, 1, 0), 77800);
  assert.equal(calculateScore(100, 0, 1), 82900);
  assert.equal(calculateScore(10000, 99, 0), 0);
  assert.equal(formatScore(42.9), '000042');
});
