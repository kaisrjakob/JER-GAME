export function createLevel() {
  return {
    platforms: [
      platform('roof-0', -300, 700, 1300, 0),
      platform('roof-1', 1120, 650, 430, 0),
      platform('dw-collapse', 1680, 610, 360, 0, { collapsible: true }),
      platform('roof-3', 2190, 680, 500, 0),
      platform('vision-0', 2810, 640, 590, 1),
      platform('vision-lift', 3540, 555, 300, 1, { moving: true }),
      platform('vision-2', 3990, 690, 690, 1),
      platform('industry-0', 4810, 630, 520, 2),
      platform('industry-collapse', 5480, 550, 330, 2, { collapsible: true }),
      platform('industry-2', 5940, 670, 500, 2),
      platform('finish-roof', 6590, 620, 980, 2)
    ],
    traps: [
      spikeTrap('clamp-spikes-1', 610, 810, 700, 120, 0),
      fallingPipe('falling-dw', 1200, 1435, 170, 650, 68, 180, 0),
      spikeTrap('landing-spikes', 1510, 1770, 610, 105, 0),
      pressureTrap('inspection-blast', 2210, 2490, 590, 1),
      spikeTrap('vision-spikes', 2870, 3090, 640, 135, 1),
      fallingPipe('falling-offset', 4050, 4320, 170, 690, 74, 205, 1),
      spikeTrap('fsa-landing', 4740, 4930, 630, 140, 2),
      pressureTrap('industrial-blast', 5200, 5350, 500, 2),
      spikeTrap('fake-finish', 5970, 6240, 670, 135, 2),
      fallingPipe('last-pipe', 6660, 6860, 110, 620, 92, 250, 2)
    ],
    checkpoints: [
      { id: 'cp-dw', x: 2280, y: 680, label: 'JEREMIAS SERVICEPUNKT 01', active: false },
      { id: 'cp-vision', x: 4430, y: 690, label: 'JEREMIAS SERVICEPUNKT 02', active: false },
      { id: 'cp-industry', x: 6110, y: 670, label: 'JEREMIAS SERVICEPUNKT 03', active: false }
    ],
    bands: [
      band(380, 610), band(1280, 540), band(1870, 490), band(2360, 565),
      band(2980, 520), band(3660, 410), band(4220, 555), band(5000, 505),
      band(5600, 410), band(6030, 535), band(6740, 485), band(7020, 475)
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
  return { id, type: 'fallingPipe', triggerX, x, y: startY, startY, floorY, width, height, section, triggered: false, vy: 0 };
}

function pressureTrap(id, triggerX, x, y, section) {
  return { id, type: 'pressure', triggerX, x, y, width: 170, height: 150, section, triggered: false, timer: 0 };
}

function band(x, y) {
  return { x, y, collected: false };
}

export function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function activeTrapBox(trap) {
  if (trap.type === 'spikes' && trap.progress > 0.55) {
    return { x: trap.x, y: trap.y - trap.height * trap.progress, width: trap.width, height: trap.height * trap.progress };
  }
  if (trap.type === 'fallingPipe' && trap.triggered) {
    return { x: trap.x, y: trap.y, width: trap.width, height: trap.height };
  }
  return null;
}
