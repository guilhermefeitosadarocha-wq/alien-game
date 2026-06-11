// ═══════════════════════════════════════════════════════════
//  SETTINGS CONFIG — valores padrão e chave localStorage
// ═══════════════════════════════════════════════════════════
const SETTINGS_KEY = 'neonSiege_settings_v1';

const SETTINGS_DEFAULTS = {
  // Controles
  shootMode: 'mouse',       // 'mouse' | 'space'
  keys: {
    moveUp:    'KeyW',
    moveDown:  'KeyS',
    moveLeft:  'KeyA',
    moveRight: 'KeyD',
    pause:     'KeyP',
    dash:      'ShiftLeft',
  },
  // Áudio
  masterVol:  45,
  sfxVol:     45,
  muted:      false,
  musicVol:   40,
  musicMuted: false,
  // Visual
  glowIntensity:   0,
  particlesOn:     true,
  shakeOn:         true,
  flashOn:         true,
  // Mobile
  joystickSize:    140,
  mobileOpacity:   100,
  shootBtnBottom:  30,
  dashMode:        'button',
  // Zoom: mobile abre mais afastado (80 = mínimo do slider, mais campo de visão)
  cameraZoom:      MobileDetect.isMobile ? 0.80 : 1.0,
};

