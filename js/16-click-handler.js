// ═══════════════════════════════════════════════════════════
//  CLICK HANDLER (menu + game over buttons)
// ═══════════════════════════════════════════════════════════
function handleClick(clientX, clientY) {
  const r  = canvas.getBoundingClientRect();
  const wx = (clientX - r.left - offsetX) / scale;
  const wy = (clientY - r.top  - offsetY) / scale;

  if (Game.state === 'menu')     UI.clickMenu(wx, wy);
  if (Game.state === 'gameover') UI.clickGameOver(wx, wy);
}

canvas.addEventListener('click', e => handleClick(e.clientX, e.clientY));
canvas.addEventListener('touchend', e => {
  e.preventDefault();
  const t = e.changedTouches[0];
  handleClick(t.clientX, t.clientY);
}, { passive: false });


