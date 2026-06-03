// ═══════════════════════════════════════════════════════════
//  AUDIO SETTINGS
// ═══════════════════════════════════════════════════════════
const AudioSettings = {
  apply(data) {
    const vol = data.muted ? 0 : (data.sfxVol / 100) * (data.masterVol / 100);
    SFX.setVolume(vol);
  },
};

