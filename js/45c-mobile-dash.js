// ═══════════════════════════════════════════════════════════
//  MOBILE DASH BUTTON — simula a tecla Shift no touch
//  Não cria lógica nova. Apenas seta Input.keys['ShiftLeft']
//  true/false no toque, e o código existente do Player/Dash
//  faz o resto exatamente como no teclado.
// ═══════════════════════════════════════════════════════════
(function() {
  var btn = document.getElementById('dashBtn');
  if (!btn) return;

  btn.addEventListener('touchstart', function(e) {
    e.preventDefault();
    if (typeof Input !== 'undefined' && Input.keys) {
      Input.keys['ShiftLeft'] = true;
    }
  }, { passive: false });

  btn.addEventListener('touchend', function(e) {
    e.preventDefault();
    if (typeof Input !== 'undefined' && Input.keys) {
      Input.keys['ShiftLeft'] = false;
    }
  }, { passive: false });

  btn.addEventListener('touchcancel', function(e) {
    e.preventDefault();
    if (typeof Input !== 'undefined' && Input.keys) {
      Input.keys['ShiftLeft'] = false;
    }
  }, { passive: false });
})();
