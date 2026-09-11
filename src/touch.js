const ZONES = ['left', 'right', 'jump'];

export class TouchControls {
  constructor({ layer, zones, input, jump, releaseJump }) {
    this.layer = layer;
    this.zones = zones;
    this.input = input;
    this.jump = jump;
    this.releaseJump = releaseJump;
    this.pointers = new Map();
    this.rects = {};

    layer.addEventListener('pointerdown', (event) => this.onDown(event));
    addEventListener('pointermove', (event) => this.onMove(event));
    addEventListener('pointerup', (event) => this.onUp(event));
    addEventListener('pointercancel', (event) => this.onUp(event));
    addEventListener('blur', () => this.releaseAll());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.releaseAll(); });
  }

  measure() {
    for (const name of ZONES) this.rects[name] = this.zones[name].getBoundingClientRect();
  }

  zoneAt(x, y) {
    for (const name of ZONES) {
      const rect = this.rects[name];
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return name;
    }
    return null;
  }

  onDown(event) {
    if (event.pointerType === 'mouse') return;
    event.preventDefault();
    this.measure();
    const zone = this.zoneAt(event.clientX, event.clientY) || 'jump';
    this.pointers.set(event.pointerId, zone);
    if (zone === 'jump') this.jump();
    this.apply();
  }

  onMove(event) {
    if (!this.pointers.has(event.pointerId)) return;
    const previous = this.pointers.get(event.pointerId);
    if (previous === 'jump') return;
    const zone = this.zoneAt(event.clientX, event.clientY);
    const next = zone === 'left' || zone === 'right' ? zone : null;
    if (next === previous) return;
    this.pointers.set(event.pointerId, next);
    this.apply();
  }

  onUp(event) {
    if (!this.pointers.has(event.pointerId)) return;
    const zone = this.pointers.get(event.pointerId);
    this.pointers.delete(event.pointerId);
    if (zone === 'jump' && !this.hasJump()) this.releaseJump();
    this.apply();
  }

  hasJump() {
    for (const zone of this.pointers.values()) if (zone === 'jump') return true;
    return false;
  }

  releaseAll() {
    const hadJump = this.hasJump();
    this.pointers.clear();
    this.apply();
    if (hadJump) this.releaseJump();
  }

  apply() {
    let left = false;
    let right = false;
    for (const zone of this.pointers.values()) {
      if (zone === 'left') left = true;
      else if (zone === 'right') right = true;
    }
    this.input.touchLeft = left;
    this.input.touchRight = right;
    for (const name of ZONES) {
      this.zones[name].classList.toggle('touch-zone--held', [...this.pointers.values()].includes(name));
    }
  }
}
