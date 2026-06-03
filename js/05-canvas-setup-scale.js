// ═══════════════════════════════════════════════════════════
//  CANVAS SETUP & SCALE
// ═══════════════════════════════════════════════════════════
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let scale = 1;
let offsetX = 0, offsetY = 0;

// ── MOBILE DETECTION ─────────────────────────────────────────
// Detecta mobile uma vez; usado para ajustes de escala e HUD.
const MobileDetect = {
  isMobile: /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints > 1 && window.innerWidth < 1024),
  isLandscape() { return window.innerWidth > window.innerHeight; },
  safeTop()    { return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0') || 0; },
  safeBottom() { return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sab') || '0') || 0; },
};

// ── CANVAS RESIZE — ocupa toda a tela sem distorção ──────────
// No mobile: escala maximizada com letterbox mínimo.
// No PC: comportamento original (letterbox centralizado).
function resizeCanvas() {
  // Usa visualViewport quando disponível (mais preciso no mobile)
  const vvp = window.visualViewport;
  const sw  = vvp ? vvp.width  : window.innerWidth;
  const sh  = vvp ? vvp.height : window.innerHeight;

  canvas.width  = sw;
  canvas.height = sh;

  if (MobileDetect.isMobile) {
    // MOBILE: escala para preencher toda a tela.
    // Usa o MAIOR dos dois eixos para minimizar letterbox.
    // O canvas interno (800×600) é escalado para cobrir o máximo possível.
    const scaleX = sw / CONFIG.TARGET_W;
    const scaleY = sh / CONFIG.TARGET_H;

    // "contain" adaptativo: se landscape e tela muito curta, usa scaleY
    // para não perder a arena verticalmente. Senão, usa o menor (contain padrão).
    scale = MobileDetect.isLandscape() && sh < 420
      ? scaleY
      : Math.min(scaleX, scaleY);

    // Em portrait mobile: aumenta escala ligeiramente para reduzir barras laterais
    if (!MobileDetect.isLandscape() && scaleX < scaleY) {
      // Ocupa 100% da largura e centraliza verticalmente
      scale = scaleX;
    }
    scale = scale * 1.35;
  } else {
    // PC: comportamento original
    scale = Math.min(sw / CONFIG.TARGET_W, sh / CONFIG.TARGET_H);
  }

  scale   = scale * CAMERA_ZOOM;
  offsetX = (sw - CONFIG.TARGET_W * scale) / 2;
  offsetY = (sh - CONFIG.TARGET_H * scale) / 2;
}
resizeCanvas();

// Escuta resize e visualViewport (mobile browser chrome show/hide)
window.addEventListener('resize', resizeCanvas);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', resizeCanvas);
  window.visualViewport.addEventListener('scroll', resizeCanvas);
}

// Atualiza ao mudar orientação
window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 120));

