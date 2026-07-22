export const TAU = Math.PI * 2;
export const WORLD_DISTANCE = 2800;
export const CAMPAIGN_END = WORLD_DISTANCE * 3;
export const STORAGE_KEYS = {
  highScore: 'jeremias-draught-rider.highScore.v1',
  settings: 'jeremias-draught-rider.settings.v1',
  tutorial: 'jeremias-draught-rider.tutorialSeen.v1'
};

export const WORLDS = [
  {
    id: 'dw-fu',
    title: 'DW-FU',
    kicker: 'ELEMENTSCHORNSTEIN',
    copy: 'Präzision beginnt im Detail.',
    hud: 'DW-FU // FLOW 01',
    asset: 'assets/world-dw.jpg',
    colors: ['#081b33', '#2b77b4', '#a9d8ff'],
    speed: 78,
    ringSpacing: 115
  },
  {
    id: 'dw-vision',
    title: 'DW-VISION',
    kicker: 'DESIGN & DYNAMIK',
    copy: 'Folge jedem Versatz.',
    hud: 'DW-VISION // FLOW 02',
    asset: 'assets/world-vision.jpg',
    colors: ['#07172e', '#296ea5', '#d7e9f8'],
    speed: 86,
    ringSpacing: 108
  },
  {
    id: 'fsa-x',
    title: 'FSA-X',
    kicker: 'INDUSTRIESCHORNSTEIN',
    copy: 'Große Dimension. Volle Kontrolle.',
    hud: 'FSA-X // FLOW 03',
    asset: 'assets/world-industry.jpg',
    colors: ['#050d22', '#154c86', '#a5c9e9'],
    speed: 94,
    ringSpacing: 102
  }
];

export function worldIndexForDistance(distance) {
  if (distance < CAMPAIGN_END) return Math.min(2, Math.floor(distance / WORLD_DISTANCE));
  return Math.floor((distance - CAMPAIGN_END) / 2200) % WORLDS.length;
}

export function difficultyForDistance(distance) {
  const campaign = Math.min(1, distance / CAMPAIGN_END);
  const endless = Math.max(0, distance - CAMPAIGN_END) / 9000;
  return Math.min(2.25, 0.2 + campaign * 0.8 + endless);
}

export function formatScore(value) {
  return String(Math.max(0, Math.floor(value))).padStart(6, '0');
}
