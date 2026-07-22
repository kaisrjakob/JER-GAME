export const VIEW_WIDTH = 1600;
export const VIEW_HEIGHT = 900;
export const PLAYER_WIDTH = 80;
export const PLAYER_HEIGHT = 120;
export const LEVEL_END = 12000;
export const GRAVITY = 2050;
export const JUMP_SPEED = 850;
export const RUN_SPEED = 420;
export const STEAM_BOOST = 980;

export const GAME_ASSETS = {
  clampBand: 'assets/game/clamp-band.png',
  dwPipe: 'assets/game/dw-pipe.png',
  rainCap: 'assets/game/rain-cap.png'
};

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
  },
  {
    id: 'sturm-dach',
    from: 7200,
    title: 'STURMTRASSE',
    kicker: 'ABSCHNITT 04 // WINTERDACH',
    copy: 'Böen, Glatteis und Kondensat. Der Wetterbericht war deutlich.',
    asset: 'assets/world-dw.jpg',
    tint: 'rgba(70,110,170,.30)'
  },
  {
    id: 'pruefstand',
    from: 9600,
    title: 'PRÜFSTAND',
    kicker: 'ABSCHNITT 05 // QUALITÄTSPRÜFUNG',
    copy: 'Sicht null, Takt gnadenlos. Bestehe die Endabnahme.',
    asset: 'assets/world-industry.jpg',
    tint: 'rgba(140,60,20,.28)'
  }
];

export const DEATH_MESSAGES = [
  'JETZT KENNST DU DIE STELLE.',
  'FALLE DOKUMENTIERT. NOCH EINMAL.',
  'DER SERVICE GIBT NICHT AUF.',
  'KLEMMBAND FEST. NERVEN AUCH?',
  'DIE NACHTSCHICHT GEHT WEITER.',
  'DIE FRÜHSCHICHT LACHT SCHON.',
  'DAS KOMMT INS PRÜFPROTOKOLL.',
  'MONTAGEANLEITUNG GELESEN? EBEN.',
  'DER WERKSLEITER HAT ES GESEHEN.',
  'GARANTIE DECKT DAS NICHT AB.',
  'DER WIND STEHT JETZT IM PRÜFBERICHT.',
  'GLATTEISWARNUNG WAR AUSGEHÄNGT.',
  'KONDENSAT: 1 — MONTEUR: 0.',
  'DIE ENDABNAHME KENNT KEINE GNADE.'
];

export function sectionIndexForX(x) {
  for (let index = SECTIONS.length - 1; index > 0; index -= 1) {
    if (x >= SECTIONS[index].from) return index;
  }
  return 0;
}

export function formatScore(value) {
  return String(Math.max(0, Math.floor(value))).padStart(6, '0');
}

export function calculateScore(elapsed, deaths, bands) {
  return Math.max(0, 100000 - Math.floor(elapsed * 180) - deaths * 4200 + bands * 900);
}
