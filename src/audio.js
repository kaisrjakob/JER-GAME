export class AudioEngine {
  constructor(settings) {
    this.settings = settings;
    this.context = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.timer = null;
    this.beat = 0;
    this.intensity = 0;
    this.bgMusic = null;
    this.bgMusicLoaded = false;
  }

  async ensure() {
    if (!this.context) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      this.context = new Context();
      this.master = this.context.createGain();
      this.musicGain = this.context.createGain();
      this.sfxGain = this.context.createGain();
      this.musicGain.connect(this.master);
      this.sfxGain.connect(this.master);
      this.master.connect(this.context.destination);
      this.applySettings();
    }
    if (!this.bgMusic) {
      const elem = document.getElementById('bg-music');
      if (elem) {
        this.bgMusic = elem;
        this.bgMusic.addEventListener('canplay', () => {
          this.bgMusicLoaded = true;
        });
      }
    }
    if (this.context.state === 'suspended') await this.context.resume();
  }

  applySettings() {
    if (!this.context) return;
    const now = this.context.currentTime;
    this.master.gain.setTargetAtTime(this.settings.muted ? 0 : 0.72, now, 0.02);
    this.musicGain.gain.setTargetAtTime(this.settings.music || 0.5, now, 0.02);
    this.sfxGain.gain.setTargetAtTime(this.settings.sfx || 0.5, now, 0.02);
    if (this.bgMusic && this.bgMusicLoaded) {
      this.bgMusic.volume = this.settings.muted ? 0 : (this.settings.music || 0.5) * 0.5;
    }
  }

  async start() {
    await this.ensure();
    if (!this.context || this.timer) return;
    this.beat = 0;
    this.timer = window.setInterval(() => this.musicTick(), 145);
    if (this.bgMusic && this.bgMusicLoaded && this.bgMusic.paused) {
      try {
        await this.bgMusic.play();
      } catch (err) {
        console.warn('Background music autoplay failed:', err);
      }
    }
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.bgMusic && this.bgMusicLoaded) {
      this.bgMusic.pause();
      this.bgMusic.currentTime = 0;
    }
  }

  setIntensity(value) {
    this.intensity = Math.max(0, Math.min(1, value));
  }

  toggleMute() {
    this.settings.muted = !this.settings.muted;
    this.applySettings();
    return this.settings.muted;
  }

  musicTick() {
    if (!this.context || this.context.state !== 'running') return;
    const step = this.beat++;
    if (step % 4 === 0) this.tone(48 + (step % 16 === 12 ? 7 : 0), 0.13, 0.16, 'sine', this.musicGain);
    if (step % 2 === 0) this.noise(0.035, 0.028 + this.intensity * 0.018, this.musicGain);
    if (this.intensity > 0.32 && step % 4 === 2) this.tone(96, 0.055, 0.045, 'square', this.musicGain);
    if (this.intensity > 0.68 && step % 2 === 1) this.tone(360 + (step % 8) * 24, 0.035, 0.018, 'triangle', this.musicGain);
  }

  sfx(name) {
    if (!this.context || this.settings.muted) return;
    if (name === 'gate' || name === 'service') {
      this.tone(520, 0.1, 0.12, 'sine', this.sfxGain);
      this.tone(780, 0.16, 0.07, 'triangle', this.sfxGain, 0.055);
    } else if (name === 'jump') {
      this.tone(190, 0.08, 0.08, 'triangle', this.sfxGain);
      this.tone(330, 0.09, 0.05, 'sine', this.sfxGain, 0.035);
    } else if (name === 'charge') {
      this.tone(260, 0.08, 0.12, 'sawtooth', this.sfxGain);
      this.tone(620, 0.22, 0.08, 'sine', this.sfxGain, 0.06);
    } else if (name === 'near') {
      this.noise(0.1, 0.08, this.sfxGain);
    } else if (name === 'slam') {
      this.noise(0.2, 0.18, this.sfxGain);
      this.tone(85, 0.26, 0.2, 'sawtooth', this.sfxGain);
      this.tone(52, 0.34, 0.14, 'sine', this.sfxGain, 0.03);
    } else if (name === 'hit') {
      this.noise(0.28, 0.22, this.sfxGain);
      this.tone(62, 0.3, 0.24, 'sawtooth', this.sfxGain);
    } else if (name === 'world' || name === 'stage') {
      [180, 270, 405].forEach((frequency, index) => this.tone(frequency, 0.24, 0.08, 'triangle', this.sfxGain, index * 0.1));
    }
  }

  tone(frequency, duration, level, type, destination, delay = 0) {
    const start = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(level, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  noise(duration, level, destination) {
    const length = Math.max(1, Math.floor(this.context.sampleRate * duration));
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 850;
    gain.gain.value = level;
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    source.start();
  }
}
