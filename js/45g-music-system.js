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
    this._audio.addEventListener('loadeddata',     () => console.log('[BGM-DBG] loadeddata — arquivo baixado'));
    this._audio.addEventListener('canplaythrough', () => console.log('[BGM-DBG] canplaythrough — pronto pra tocar'));
    this._audio.addEventListener('play',           () => console.log('[BGM-DBG] play disparado'));
    this._audio.addEventListener('playing',        () => console.log('[BGM-DBG] PLAYING — tocando de verdade'));
    this._audio.addEventListener('pause',          () => console.log('[BGM-DBG] pause disparado'));
    this._audio.addEventListener('ended',          () => console.log('[BGM-DBG] ended'));
    this._audio.addEventListener('stalled',        () => console.warn('[BGM-DBG] stalled — download travou'));
    this._audio.addEventListener('error', () => {
      const err = this._audio.error;
      console.error('[BGM-DBG] ERRO no audio:', err && err.code, err && err.message);
    });
    console.log('[BGM-DBG] init concluído. audio:', this._audio,
                'src:', this._audio.src,
                'volume:', this._volume, 'muted:', this._muted);
  },

  startMatch() {
    console.log('[BGM-DBG] startMatch chamado. _audio:', !!this._audio,
                '_muted:', this._muted, 'volume:', this._audio && this._audio.volume);
    if (!this._audio || this._muted) return;
    this._audio.currentTime = 0;
    console.log('[BGM-DBG] tentando play(). paused:', this._audio.paused,
                'currentTime:', this._audio.currentTime, 'volume:', this._audio.volume);
    const p = this._audio.play();
    if (p && typeof p.then === 'function') {
      p.then(() => console.log('[BGM-DBG] play() resolveu — música deve estar tocando'))
       .catch(err => console.error('[BGM-DBG] play() REJEITOU:', err.name, err.message));
    }
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
