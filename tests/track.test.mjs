import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GRAVITY, JUMP_SPEED, LEVEL_END, PLAYER_HEIGHT, PLAYER_WIDTH, RUN_SPEED, SECTIONS,
  STEAM_BOOST, calculateScore, formatScore, sectionIndexForX
} from '../src/config.js';
import { activeTrapBox, createLevel, overlaps } from '../src/track.js';

test('the hand-authored campaign covers all five Jeremias system sections', () => {
  const level = createLevel();
  assert.equal(SECTIONS.length, 5);
  assert.deepEqual(SECTIONS.map((section) => section.id), ['dw-fu', 'dw-vision', 'fsa-x', 'sturm-dach', 'pruefstand']);
  assert.deepEqual(new Set(level.platforms.map((platform) => platform.section)), new Set([0, 1, 2, 3, 4]));
  assert.ok(level.finish.x < LEVEL_END);
  assert.equal(level.checkpoints.length, 6);
  assert.equal(level.bands.length, 18);
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
  assert.equal(sectionIndexForX(7199), 2);
  assert.equal(sectionIndexForX(7200), 3);
  assert.equal(sectionIndexForX(9599), 3);
  assert.equal(sectionIndexForX(9600), 4);
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
  const cap = level.traps.find((trap) => trap.type === 'swingCap');
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
  assert.equal(activeTrapBox(cap), null);
  cap.phase = 'launching';
  assert.ok(activeTrapBox(cap));
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

test('every launched chimney cap is jumpable and eventually leaves the route', () => {
  const level = createLevel();
  const caps = level.traps.filter((trap) => trap.type === 'swingCap');
  const jumpRise = JUMP_SPEED ** 2 / (2 * GRAVITY);
  const horizontalRange = RUN_SPEED * 2 * JUMP_SPEED / GRAVITY;
  assert.equal(caps.length, 2);
  for (const cap of caps) {
    assert.ok(cap.triggerX < cap.baseX, `${cap.id} needs warning distance`);
    assert.ok(cap.height < jumpRise, `${cap.id} is too tall to jump`);
    assert.ok(cap.width + PLAYER_WIDTH < horizontalRange, `${cap.id} is too wide to jump`);
    assert.ok(cap.vx < 0, `${cap.id} must leave the route after activation`);
  }
});

test('every launched chimney cap can be baited from safe ground before its spike field', () => {
  const level = createLevel();
  const caps = level.traps.filter((trap) => trap.type === 'swingCap');
  for (const cap of caps) {
    const spikesBetween = level.traps.filter((trap) =>
      trap.type === 'spikes' && trap.section === cap.section &&
      trap.x + trap.width > cap.triggerX && trap.x < cap.baseX);
    for (const spike of spikesBetween) {
      assert.ok(cap.triggerX + PLAYER_WIDTH + 10 < spike.x,
        `${cap.id} arms while the player is forced over spike field ${spike.id}`);
    }
    const reaction = 0.16 + (cap.baseX - (cap.triggerX + PLAYER_WIDTH)) / Math.abs(cap.vx);
    assert.ok(reaction >= 0.6, `${cap.id} gives only ${reaction.toFixed(2)}s to react`);
  }
});

test('every invisible DW element leaves a low-hop route across its gap', () => {
  const level = createLevel();
  const blocks = level.traps.filter((trap) => trap.type === 'ghostBlock');
  assert.ok(blocks.length > 0);
  const jumpRise = JUMP_SPEED ** 2 / (2 * GRAVITY);
  for (const block of blocks) {
    const takeoff = level.platforms
      .filter((platform) => !platform.phantom && platform.x + platform.width <= block.x)
      .sort((a, b) => b.x + b.width - (a.x + a.width))[0];
    const landing = level.platforms
      .filter((platform) => !platform.phantom && platform.x >= block.x + block.width)
      .sort((a, b) => a.x - b.x)[0];
    assert.ok(takeoff && landing, `${block.id} does not span a platform gap`);
    const requiredRise = Math.max(20, takeoff.y - landing.y + 10);
    assert.ok(requiredRise < jumpRise, `${block.id} gap needs more rise than the jump allows`);
    const headAtRequiredRise = takeoff.y - PLAYER_HEIGHT - requiredRise;
    assert.ok(headAtRequiredRise > block.y + block.height, `${block.id} blocks even the minimal hop`);
    assert.ok(takeoff.y - PLAYER_HEIGHT - jumpRise < block.y + block.height,
      `${block.id} never intersects a full jump — the troll is disarmed`);
  }
});

test('the counterfeit service point can be cleared with a full jump', () => {
  const level = createLevel();
  const fakes = level.traps.filter((trap) => trap.type === 'fakeCheckpoint');
  assert.ok(fakes.length > 0);
  const jumpRise = JUMP_SPEED ** 2 / (2 * GRAVITY);
  for (const fake of fakes) {
    const box = activeTrapBox(fake);
    assert.ok(box, `${fake.id} must always be armed`);
    assert.ok(box.height < jumpRise - 10, `${fake.id} pole hitbox is too tall to jump`);
  }
});

test('phantom sheet metal hides a gap that stays jumpable and carries no checkpoint', () => {
  const level = createLevel();
  const phantoms = level.platforms.filter((platform) => platform.phantom);
  assert.ok(phantoms.length > 0);
  for (const phantom of phantoms) {
    for (const checkpoint of level.checkpoints) {
      assert.ok(checkpoint.x < phantom.x || checkpoint.x >= phantom.x + phantom.width,
        `${checkpoint.id} would respawn the player on phantom ground`);
    }
  }
});

test('the finale cap guards the finish line and eventually clears the way', () => {
  const level = createLevel();
  const finale = level.traps.find((trap) => trap.type === 'finaleCap');
  assert.ok(finale);
  const jumpRise = JUMP_SPEED ** 2 / (2 * GRAVITY);
  assert.ok(finale.height < jumpRise - 10, 'resting cap must stay jumpable in principle');
  const winLine = level.finish.x + 105;
  assert.ok(finale.x < winLine && winLine < finale.x + finale.width, 'cap must land on the finish line');
  assert.ok(finale.triggerX < finale.x - PLAYER_WIDTH, 'cap needs warning distance before its landing zone');
  assert.equal(activeTrapBox(finale), null);
  finale.phase = 'falling';
  assert.ok(activeTrapBox(finale));
  finale.phase = 'resting';
  assert.ok(activeTrapBox(finale));
  finale.phase = 'toppled';
  finale.cleared = true;
  assert.equal(activeTrapBox(finale), null);
});

test('collectibles include realistic movement patterns with a bounded runaway band', () => {
  const bands = createLevel().bands;
  assert.ok(bands.some((band) => band.motion === 'railX'));
  assert.ok(bands.some((band) => band.motion === 'railY'));
  const runaway = bands.find((band) => band.motion === 'flee');
  assert.ok(runaway.travel > 0 && runaway.travel < 150);
});

test('every gap between consecutive platforms is reachable', () => {
  const platforms = createLevel().platforms.filter((platform) => !platform.phantom);
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

test('exhaust gusts always leave forward progress and a calm window', () => {
  const zones = createLevel().traps.filter((trap) => trap.type === 'windZone');
  assert.ok(zones.length > 0);
  for (const zone of zones) {
    assert.ok(zone.strength < RUN_SPEED - 60, `${zone.id} pushes harder than the player can run against`);
    assert.ok(zone.period - zone.onTime >= 1, `${zone.id} leaves less than a second of calm per cycle`);
  }
});

test('condensate drippers leave a walk-through window every cycle', () => {
  const drippers = createLevel().traps.filter((trap) => trap.type === 'dripper');
  assert.ok(drippers.length > 0);
  for (const trap of drippers) {
    const fallTime = Math.sqrt(2 * (trap.floorY - trap.outletY) / 1500);
    const crossTime = (trap.width + PLAYER_WIDTH) / RUN_SPEED;
    assert.ok(fallTime < trap.period, `${trap.id} drop never finishes falling within its cycle`);
    assert.ok(trap.period - fallTime >= crossTime + .25, `${trap.id} leaves no window to walk through`);
  }
});

test('the exhaust fan opens a safe passage window wider than the crossing time', () => {
  const fans = createLevel().traps.filter((trap) => trap.type === 'fan');
  assert.ok(fans.length > 0);
  for (const trap of fans) {
    const safeWindow = 2 * Math.asin(0.45) / trap.speed;
    const crossTime = (trap.thickness + PLAYER_WIDTH) / RUN_SPEED;
    assert.ok(safeWindow >= crossTime + .15, `${trap.id} blades spin too fast to pass`);
    assert.equal(activeTrapBox({ ...trap, angle: 0 }), null);
    assert.ok(activeTrapBox({ ...trap, angle: Math.PI / 2 }), `${trap.id} must block at vertical blades`);
  }
});

test('steam vents never kill and their reward band sits within boost height', () => {
  const level = createLevel();
  const vents = level.traps.filter((trap) => trap.type === 'steamVent');
  assert.ok(vents.length > 0);
  const boostRise = STEAM_BOOST ** 2 / (2 * GRAVITY);
  for (const vent of vents) {
    assert.equal(activeTrapBox(vent), null);
    assert.equal(activeTrapBox({ ...vent, active: true }), null);
    const rewardBand = level.bands.find((band) => Math.abs(band.baseX - (vent.x + vent.width / 2)) < 120);
    assert.ok(rewardBand, `${vent.id} has no reward band above it`);
    const standTop = vent.floorY - PLAYER_HEIGHT;
    assert.ok(standTop - boostRise < rewardBand.baseY, `${vent.id} boost cannot reach its reward band`);
  }
});

test('the test-stand crushers park clear of the player and hold long enough to pass', () => {
  const crushers = createLevel().traps.filter((trap) => trap.type === 'crusher');
  assert.ok(crushers.length > 0);
  for (const trap of crushers) {
    assert.ok(trap.raisedY + trap.plateHeight < trap.floorY - PLAYER_HEIGHT - 8,
      `${trap.id} parked plate clips a standing player`);
    const crossTime = (trap.width + PLAYER_WIDTH) / RUN_SPEED;
    assert.ok(1 >= crossTime + .2, `${trap.id} raised hold is shorter than the crossing time`);
  }
});

test('the counterfeit clamp band can be walked under and is harder to touch than a real one', () => {
  const level = createLevel();
  const mimics = level.traps.filter((trap) => trap.type === 'mimicBand');
  assert.ok(mimics.length > 0);
  for (const mimic of mimics) {
    const box = activeTrapBox(mimic);
    assert.ok(box, `${mimic.id} must always be armed`);
    assert.ok(box.width < 56 && box.height < 56, `${mimic.id} hitbox must be smaller than the real pickup radius`);
    const carrier = level.platforms.find((platform) =>
      !platform.phantom && mimic.x >= platform.x && mimic.x < platform.x + platform.width);
    assert.ok(carrier, `${mimic.id} floats over no platform`);
    assert.ok(carrier.y - (box.y + box.height) > PLAYER_HEIGHT + 8,
      `${mimic.id} cannot be walked under without triggering`);
  }
});

test('iced sheets are wide enough to recover on and never collapse', () => {
  const iced = createLevel().platforms.filter((platform) => platform.ice);
  assert.ok(iced.length > 0);
  for (const platform of iced) {
    assert.ok(platform.width >= 250, `${platform.id} is too short to brake on ice`);
    assert.ok(!platform.collapsible, `${platform.id} combines ice with collapse — unreadable`);
  }
});

test('soot fog never hides a timing trap', () => {
  const level = createLevel();
  const zones = level.traps.filter((trap) => trap.type === 'sootZone');
  assert.ok(zones.length > 0);
  const timed = level.traps.filter((trap) => ['fan', 'crusher'].includes(trap.type));
  for (const zone of zones) {
    for (const trap of timed) {
      const trapEnd = trap.x + (trap.width || 0);
      assert.ok(trapEnd <= zone.x || trap.x >= zone.x + zone.width,
        `${trap.id} hides inside soot zone ${zone.id}`);
    }
  }
});

test('score rewards fast, clean runs and collected Jeremias clamp bands', () => {
  assert.equal(calculateScore(100, 0, 0), 82000);
  assert.equal(calculateScore(100, 1, 0), 77800);
  assert.equal(calculateScore(100, 0, 1), 82900);
  assert.equal(calculateScore(10000, 99, 0), 0);
  assert.equal(formatScore(42.9), '000042');
});
