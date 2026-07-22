export function createLevel() {
  return {
    platforms: [
      platform('roof-0', -300, 700, 1300, 0),
      platform('roof-1', 1120, 650, 430, 0),
      platform('dw-collapse', 1680, 610, 360, 0, { collapsible: true, collapseDelay: 1.2 }),
      platform('roof-3', 2190, 680, 500, 0),
      platform('vision-0', 2810, 640, 590, 1),
      platform('vision-lift', 3540, 555, 300, 1, { moving: true }),
      platform('vision-2', 3990, 690, 690, 1),
      platform('industry-0', 4810, 630, 520, 2),
      platform('industry-collapse', 5480, 550, 330, 2, { collapsible: true, collapseDelay: 1.15 }),
      platform('rost-blech', 5810, 670, 130, 2, { phantom: true }),
      platform('industry-2', 5940, 670, 500, 2),
      platform('finish-roof', 6590, 620, 980, 2)
    ],
    traps: [
      spikeTrap('clamp-spikes-1', 610, 810, 700, 120, 0),
      fallingPipe('falling-dw', 1200, 1435, 170, 650, 68, 100, 0),
      spikeTrap('landing-spikes', 1510, 1770, 610, 105, 0),
      ghostBlock('ghost-dw', 1575, 441, 64, 44, 0),
      pressureTrap('inspection-blast', 2210, 2490, 590, 1),
      spikeTrap('vision-spikes', 2870, 3090, 640, 135, 1),
      swingCap('vision-cowl', 3000, 3345, 564, -1, 1),
      fallingPipe('falling-offset', 4050, 4320, 170, 690, 74, 105, 1),
      fakeCheckpoint('fake-service', 4180, 690, 1),
      spikeTrap('fsa-landing', 4740, 4930, 630, 140, 2),
      swingCap('industry-cowl', 4840, 5190, 554, -1, 2),
      pressureTrap('industrial-blast', 5200, 5350, 500, 2),
      spikeTrap('fake-finish', 5970, 6240, 670, 135, 2),
      fallingPipe('last-pipe', 6660, 6860, 110, 620, 92, 110, 2),
      finaleCap('finale-cap', 7020, 7150, 60, 620, 140, 100, 2)
    ],
    checkpoints: [
      { id: 'cp-dw', x: 2280, y: 680, label: 'JEREMIAS SERVICEPUNKT 01', active: false },
      { id: 'cp-vision', x: 4430, y: 690, label: 'JEREMIAS SERVICEPUNKT 02', active: false },
      { id: 'cp-industry', x: 6110, y: 670, label: 'JEREMIAS SERVICEPUNKT 03', active: false }
    ],
    bands: [
      band(380, 610), band(1280, 540, { motion: 'railX', amplitude: 58, speed: 1.5 }),
      band(1870, 490), band(2360, 565), band(2980, 520),
      band(3660, 410, { motion: 'railY', amplitude: 44, speed: 1.8 }),
      band(4220, 555), band(5000, 505),
      band(5600, 410, { motion: 'flee', triggerX: 5420, travel: 135 }),
      band(6030, 535), band(6740, 485, { motion: 'railX', amplitude: 65, speed: 2.1 }),
      band(7020, 475)
    ],
    finish: { x: 7140, y: 620 }
  };
}

function platform(id, x, y, width, section, extras = {}) {
  return { id, x, y, width, section, baseY: y, fallY: 0, fallSpeed: 0, timer: 0, triggered: false, ...extras };
}

function spikeTrap(id, triggerX, x, y, width, section) {
  return { id, type: 'spikes', triggerX, x, y, width, height: 50, section, triggered: false, progress: 0 };
}

function fallingPipe(id, triggerX, x, startY, floorY, width, height, section) {
  return {
    id, type: 'fallingPipe', triggerX, x, y: startY, startY, floorY, width, height,
    section, triggered: false, cleared: false, phase: 'idle', timer: 0, vy: 0
  };
}

function pressureTrap(id, triggerX, x, y, section) {
  return { id, type: 'pressure', triggerX, x, y, width: 170, height: 150, section, triggered: false, timer: 0 };
}

function swingCap(id, triggerX, x, y, direction, section) {
  return {
    id, type: 'swingCap', triggerX, x, baseX: x, y, width: 92, height: 76,
    direction, section, triggered: false, cleared: false, phase: 'idle', timer: 0,
    vx: direction * 390, angle: 0
  };
}

function ghostBlock(id, x, y, width, height, section) {
  return {
    id, type: 'ghostBlock', triggerX: Infinity, x, y, width, height,
    section, triggered: false, revealed: false
  };
}

function fakeCheckpoint(id, x, y, section) {
  return {
    id, type: 'fakeCheckpoint', triggerX: Infinity, x, y,
    width: 24, height: 120, section, triggered: false, exposed: false
  };
}

function finaleCap(id, triggerX, x, startY, floorY, width, height, section) {
  return {
    id, type: 'finaleCap', triggerX, x, y: startY, startY, floorY, width, height,
    section, triggered: false, cleared: false, phase: 'idle', timer: 0, vy: 0, angle: 0
  };
}

function band(x, y, extras = {}) {
  return { x, y, baseX: x, baseY: y, collected: false, motion: 'float', activated: false, ...extras };
}

export function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function activeTrapBox(trap) {
  if (trap.type === 'spikes' && trap.progress > 0.55) {
    return { x: trap.x, y: trap.y - trap.height * trap.progress, width: trap.width, height: trap.height * trap.progress };
  }
  if (trap.type === 'fallingPipe' && trap.triggered && !trap.cleared) {
    return { x: trap.x, y: trap.y, width: trap.width, height: trap.height };
  }
  if (trap.type === 'swingCap' && trap.phase === 'launching' && !trap.cleared) {
    return { x: trap.x + 7, y: trap.y + 7, width: trap.width - 14, height: trap.height - 12 };
  }
  if (trap.type === 'fakeCheckpoint') {
    return { x: trap.x - 6, y: trap.y - trap.height, width: trap.width, height: trap.height };
  }
  if (trap.type === 'finaleCap' && ['falling', 'resting'].includes(trap.phase) && !trap.cleared) {
    return { x: trap.x + 10, y: trap.y + 8, width: trap.width - 20, height: trap.height - 12 };
  }
  return null;
}
