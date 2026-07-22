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
      platform('finish-roof', 6590, 620, 980, 2),
      platform('storm-0', 7690, 660, 620, 3, { ice: true }),
      platform('storm-1', 8390, 640, 700, 3),
      platform('storm-2', 9170, 600, 560, 3, { ice: true }),
      platform('pruef-0', 9810, 660, 640, 4),
      platform('pruef-rost', 10530, 660, 120, 4, { phantom: true }),
      platform('pruef-2', 10650, 660, 800, 4),
      platform('finale-roof', 11530, 620, 1250, 4)
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
      windZone('gust-1', 8350, 780, -1, 235, 3.4, 1.4, 0, 3),
      spikeTrap('gust-spikes', 8480, 8760, 640, 120, 3),
      dripper('kondensat-1', 9300, 300, 600, 1.6, 0, 3),
      dripper('kondensat-2', 9520, 280, 600, 1.6, 0.8, 3),
      sootZone('russnebel', 10050, 770, 4),
      steamVent('dampf-1', 10740, 660, 2.4, 0.9, 0, 4),
      fan('abluft-fan', 10900, 550, 85, 1.2, 4),
      mimicBand('fake-band', 11080, 515, 4),
      crusher('presse-1', 11150, 660, 2.2, 0, 4),
      crusher('presse-2', 11700, 620, 2.2, 1.1, 4),
      finaleCap('finale-cap', 11820, 11950, 60, 620, 140, 100, 4)
    ],
    checkpoints: [
      { id: 'cp-dw', x: 2280, y: 680, label: 'JEREMIAS SERVICEPUNKT 01', active: false },
      { id: 'cp-vision', x: 4430, y: 690, label: 'JEREMIAS SERVICEPUNKT 02', active: false },
      { id: 'cp-industry', x: 6110, y: 670, label: 'JEREMIAS SERVICEPUNKT 03', active: false },
      { id: 'cp-storm', x: 7760, y: 660, label: 'JEREMIAS SERVICEPUNKT 04', active: false },
      { id: 'cp-pruefstand', x: 9900, y: 660, label: 'JEREMIAS SERVICEPUNKT 05', active: false },
      { id: 'cp-finale', x: 11560, y: 620, label: 'JEREMIAS SERVICEPUNKT 06', active: false }
    ],
    bands: [
      band(380, 610), band(1280, 540, { motion: 'railX', amplitude: 58, speed: 1.5 }),
      band(1870, 490), band(2360, 565), band(2980, 520),
      band(3660, 410, { motion: 'railY', amplitude: 44, speed: 1.8 }),
      band(4220, 555), band(5000, 505),
      band(5600, 410, { motion: 'flee', triggerX: 5420, travel: 135 }),
      band(6030, 535), band(6740, 485, { motion: 'railX', amplitude: 65, speed: 2.1 }),
      band(7020, 475),
      band(7900, 530), band(8650, 480, { motion: 'railY', amplitude: 40, speed: 1.7 }),
      band(9420, 460), band(10770, 380), band(11380, 540), band(11930, 460)
    ],
    finish: { x: 11940, y: 620 }
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

function windZone(id, x, width, direction, strength, period, onTime, offset, section) {
  return {
    id, type: 'windZone', triggerX: -Infinity, x, y: 0, width, height: 0,
    direction, strength, period, onTime, offset, section, triggered: false, active: false, announced: false
  };
}

function dripper(id, x, outletY, floorY, period, offset, section) {
  return {
    id, type: 'dripper', triggerX: -Infinity, x, y: outletY, outletY, floorY, width: 26, height: 34,
    period, offset, section, triggered: false, dropY: outletY, dropActive: false
  };
}

function fan(id, x, cy, radius, speed, section) {
  return {
    id, type: 'fan', triggerX: -Infinity, x, y: cy - radius, cy, radius, width: 36, height: radius * 2,
    thickness: 36, speed, angle: 0, section, triggered: false
  };
}

function steamVent(id, x, floorY, period, onTime, offset, section) {
  return {
    id, type: 'steamVent', triggerX: -Infinity, x, y: floorY, floorY, width: 60, height: 0,
    jetHeight: 180, period, onTime, offset, section, triggered: false, active: false
  };
}

function sootZone(id, x, width, section) {
  return {
    id, type: 'sootZone', triggerX: -Infinity, x, y: 0, width, height: 0,
    section, triggered: false, announced: false
  };
}

function crusher(id, x, floorY, period, offset, section) {
  return {
    id, type: 'crusher', triggerX: -Infinity, x, y: floorY - 160, floorY, width: 130, height: 60,
    plateHeight: 60, raisedY: floorY - 160, period, offset, section, triggered: false,
    plateY: floorY - 160, slammed: false
  };
}

function mimicBand(id, x, y, section) {
  return {
    id, type: 'mimicBand', triggerX: Infinity, x, y, width: 36, height: 34,
    section, triggered: false, sprung: false
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
  if (trap.type === 'dripper' && trap.dropActive) {
    return { x: trap.x + 2, y: trap.dropY, width: 22, height: 34 };
  }
  if (trap.type === 'fan' && Math.abs(Math.sin(trap.angle)) > 0.45) {
    return { x: trap.x, y: trap.cy - trap.radius, width: trap.thickness, height: trap.radius * 2 };
  }
  if (trap.type === 'crusher') {
    return { x: trap.x, y: trap.plateY, width: trap.width, height: trap.plateHeight };
  }
  if (trap.type === 'mimicBand' && !trap.sprung) {
    return { x: trap.x - 18, y: trap.y - 16, width: 36, height: 34 };
  }
  return null;
}
