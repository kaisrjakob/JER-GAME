export const VIEW_WIDTH = 1600;
export const VIEW_HEIGHT = 900;
export const PLAYER_WIDTH = 54;
export const PLAYER_HEIGHT = 82;
export const LEVEL_END = 7200;

export const STORAGE_KEYS = {
  highScore: 'jeremias-unfair-service.bestScore.v1',
  settings: 'jeremias-unfair-service.settings.v1',
  tutorial: 'jeremias-unfair-service.finished.v1'
};

export const SECTIONS = [
  {
    id: 'dw-fu',
    from: 0,
    title: 'DW-FU',
    kicker: 'ABSCHNITT 01 // ELEMENTSCHORNSTEIN',
    copy: 'Klemmbänder, Dachkanten und die erste Gemeinheit.',
    asset: 'assets/world-dw.jpg'
  },
  {
    id: 'dw-vision',
    from: 2400,
    title: 'DW-VISION',
    kicker: 'ABSCHNITT 02 // DESIGNSTRECKE',
    copy: 'Versätze sehen harmloser aus, als sie sind.',
    asset: 'assets/world-vision.jpg'
  },
  {
    id: 'fsa-x',
    from: 4800,
    title: 'FSA-X',
    kicker: 'ABSCHNITT 03 // INDUSTRIE',
    copy: 'Große Dimensionen. Größere Fallen.',
    asset: 'assets/world-industry.jpg'
  }
];

export const DEATH_MESSAGES = [
  'JETZT KENNST DU DIE STELLE.',
  'FALLE DOKUMENTIERT. NOCH EINMAL.',
  'DER SERVICE GIBT NICHT AUF.',
  'KLEMMBAND FEST. NERVEN AUCH?',
  'DIE NACHTSCHICHT GEHT WEITER.'
];

export function sectionIndexForX(x) {
  if (x >= SECTIONS[2].from) return 2;
  if (x >= SECTIONS[1].from) return 1;
  return 0;
}

export function formatScore(value) {
  return String(Math.max(0, Math.floor(value))).padStart(6, '0');
}

export function calculateScore(elapsed, deaths, bands) {
  return Math.max(0, 100000 - Math.floor(elapsed * 180) - deaths * 4200 + bands * 900);
}
