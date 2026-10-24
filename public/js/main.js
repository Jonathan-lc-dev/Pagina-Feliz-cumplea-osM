// Navegación entre escenas, vela, botón de felicitación y soplido con micrófono.
(() => {
'use strict';
const $ = s => document.querySelector(s);
const BLOW = { threshold: .12, holdMs: 150, calibrateMs: 700, timeoutMs: 15000 };   // ← sensibilidad del soplido
const scenes = { intro: $('#intro'), cake: $('#cake'), gift: $('#gift'), final: $('#final') };
let lit = true, ct, tt, mic = null;

function toast(m) { const e = $('#toast'); e.textContent = m; e.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => e.classList.remove('on'), 3200); }
function go(n) {
  for (const [k, el] of Object.entries(scenes)) { el.classList.toggle('active', k === n); el.inert = k !== n; }
  if (n === 'cake') { Cake.init($('#cake-stage')); Cake.start(); } else { Cake.stop(); stopMic(); }
  if (window.Gift) { n === 'gift' ? Gift.appear() : Gift.pause(); }
}
window.App = { go, toast };

$('#start').addEventListener('click', e => {
  const b = e.currentTarget, r = b.getBoundingClientRect(); b.classList.add('press'); b.disabled = true;
  $('#sky').classList.add('lit'); Fx.spark(r.left + r.width / 2, r.top + r.height / 2, 36); Sfx.chime();
  setTimeout(() => go('cake'), 900); setTimeout(() => $('#sky').classList.remove('lit'), 2500);
});
$('#cheer-btn').addEventListener('click', () => {
  Fx.celebrate(); Sfx.chime(); const c = $('#cheer');
  c.textContent = '¡Feliz cumpleaños! Que todos tus deseos se cumplan.'; c.classList.add('show');
  clearTimeout(ct); ct = setTimeout(() => c.classList.remove('show'), 6000);
});

function blowOut() {
  if (!lit) return; lit = false; stopMic();
  $('#blow-btn').disabled = true; $('#mic-btn').hidden = true; $('#cheer').classList.remove('show');
  $('#wind').classList.add('on'); Cake.blow(); Sfx.puff();
  setTimeout(() => $('#wind').classList.remove('on'), 1000);
  setTimeout(() => { Fx.spark(innerWidth / 2, innerHeight * .4, 40); Sfx.chime(); $('#wish').classList.add('show'); }, 1500);
  setTimeout(() => { $('#wish').classList.remove('show'); go('gift'); }, 6800);
}
$('#blow-btn').addEventListener('click', blowOut);

function stopMic() {
  if (!mic) return; cancelAnimationFrame(mic.raf); clearTimeout(mic.to);
  mic.stream.getTracks().forEach(t => t.stop()); mic.ctx.close().catch(() => {}); mic = null;      // el micrófono nunca queda activo
  $('#mic-btn').textContent = 'o sopla de verdad 🎤';
}
async function startMic() {
  if (mic) { stopMic(); return; }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast('Este navegador no permite usar el micrófono. Usa el botón ✨'); return; }
  let stream; try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }); }
  catch (e) { toast('No pude usar el micrófono. Usa el botón ✨'); return; }
  const ctx = new (window.AudioContext || window.webkitAudioContext)(), an = ctx.createAnalyser(); an.fftSize = 1024;
  ctx.createMediaStreamSource(stream).connect(an);
  const buf = new Float32Array(an.fftSize), t0 = performance.now(); let base = 0, n = 0, since = 0;
  mic = { stream, ctx, raf: 0, to: setTimeout(() => { stopMic(); toast('No te escuché. Prueba otra vez o usa el botón ✨'); }, BLOW.timeoutMs) };
  $('#mic-btn').textContent = 'Escuchando… (toca para cancelar)'; toast('Sopla hacia el micrófono 🌬️');
  const loop = () => {
    if (!mic) return; an.getFloatTimeDomainData(buf); let s = 0; for (const v of buf) s += v * v; const rms = Math.sqrt(s / buf.length), now = performance.now();
    if (now - t0 < BLOW.calibrateMs) { base += rms; n++; }
    else if (rms > base / Math.max(n, 1) + BLOW.threshold) { since = since || now; if (now - since > BLOW.holdMs) { blowOut(); return; } } else since = 0;
    mic.raf = requestAnimationFrame(loop);
  };
  mic.raf = requestAnimationFrame(loop);
}
$('#mic-btn').addEventListener('click', startMic);
document.addEventListener('visibilitychange', () => { if (document.hidden) stopMic(); });

$('#sound').addEventListener('click', e => { const on = !Sfx.on; Sfx.set(on); e.currentTarget.textContent = on ? '🔊' : '🔇'; e.currentTarget.setAttribute('aria-pressed', on); });
$('#again-gift').addEventListener('click', () => go('gift'));
$('#again-cake').addEventListener('click', () => {
  lit = true; Cake.relight(); $('#blow-btn').disabled = false; $('#mic-btn').hidden = false;
  $('#wish').classList.remove('show'); $('#cheer').classList.remove('show'); go('cake');
});
go('intro');
})();
