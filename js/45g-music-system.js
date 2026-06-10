// ═══════════════════════════════════════════════════════════
//  MUSIC SYSTEM — BGM durante a partida
//  HTML5 <audio> em loop; volume e mute persistidos em ControlSettings.data
// ═══════════════════════════════════════════════════════════
const MusicSystem = {
  _audio:  null,
  _volume: 0.4,
  _muted:  false,

  init() {
    const d = (typeof ControlSettings !== 'undefined') ? ControlSettings.data : null;
    if (d) {
      if (typeof d.musicVol   === 'number')  this._volume = Math.max(0, Math.min(1, d.musicVol / 100));
      if (typeof d.musicMuted === 'boolean') this._muted  = d.musicMuted;
    }
    this._audio = new Audio('music/bgm.mp3');
    this._audio.loop    = true;
    this._audio.preload = 'auto';
    this._audio.volume  = this._muted ? 0 : this._volume;
    this._audio.addEventListener('error', () =>
      console.warn('[MusicSystem] bgm.mp3 não encontrado ou falhou ao carregar'));
  },

  startMatch() {
    if (!this._audio || this._muted) return;
    this._audio.currentTime = 0;
    const p = this._audio.play();
    if (p) p.catch(() => {});
  },

  stopMatch() {
    if (!this._audio) return;
    this._audio.pause();
    this._audio.currentTime = 0;
  },

  pause() {
    if (!this._audio) return;
    this._audio.pause();
  },

  resume() {
    if (!this._audio || this._muted) return;
    const p = this._audio.play();
    if (p) p.catch(() => {});
  },

  setVolume(v) {
    this._volume = Math.max(0, Math.min(1, v));
    if (this._audio && !this._muted) this._audio.volume = this._volume;
    this._save();
  },

  getVolume() { return this._volume; },

  setMuted(m) {
    this._muted = !!m;
    if (this._audio) {
      this._audio.volume = this._muted ? 0 : this._volume;
      if (this._muted) {
        this._audio.pause();
      } else if (typeof Game !== 'undefined' && Game.state === 'playing') {
        const p = this._audio.play();
        if (p) p.catch(() => {});
      }
    }
    this._save();
  },

  isMuted() { return this._muted; },

  _save() {
    if (typeof ControlSettings !== 'undefined' && ControlSettings.data &&
        typeof SaveSystem !== 'undefined') {
      ControlSettings.data.musicVol   = Math.round(this._volume * 100);
      ControlSettings.data.musicMuted = this._muted;
      SaveSystem.save(ControlSettings.data);
    }
  },
};
