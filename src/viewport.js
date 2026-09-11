import { LEVEL_END, VIEW_HEIGHT, VIEW_WIDTH_MAX, VIEW_WIDTH_MIN } from './config.js';

export const viewport = {
  width: VIEW_WIDTH_MIN,
  height: VIEW_HEIGHT,
  cssWidth: 1,
  cssHeight: 1,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  dpr: 1
};

export function updateViewport(cssWidth, cssHeight, dpr = 1) {
  const w = Math.max(1, cssWidth);
  const h = Math.max(1, cssHeight);
  const desired = VIEW_HEIGHT * (w / h);
  const width = Math.round(Math.min(VIEW_WIDTH_MAX, Math.max(VIEW_WIDTH_MIN, desired)) / 10) * 10;
  const scale = Math.min(w / width, h / VIEW_HEIGHT);
  viewport.cssWidth = w;
  viewport.cssHeight = h;
  viewport.dpr = dpr;
  viewport.width = width;
  viewport.scale = scale;
  viewport.offsetX = (w - width * scale) * 0.5;
  viewport.offsetY = (h - VIEW_HEIGHT * scale) * 0.5;
  return viewport;
}

export function cameraTarget(playerX, viewWidth = viewport.width) {
  return Math.max(0, Math.min(LEVEL_END - viewWidth + 500, playerX - viewWidth * 0.2625));
}

export function observeViewport(element, onChange) {
  let pending = 0;
  const schedule = () => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(onChange);
  };
  if (typeof ResizeObserver === 'function') new ResizeObserver(schedule).observe(element);
  else addEventListener('resize', schedule);
  addEventListener('pageshow', schedule);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
  const watchDpr = () => {
    const query = matchMedia('(resolution: ' + devicePixelRatio + 'dppx)');
    query.addEventListener('change', () => { watchDpr(); schedule(); }, { once: true });
  };
  watchDpr();
  return schedule;
}
