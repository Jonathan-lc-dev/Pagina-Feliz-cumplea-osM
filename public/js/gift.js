// Caja de regalo animada, cuatro sorpresas reveladas una a una y abejita voladora.
window.Gift = (() => {
'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const cards = $$('.card'), next = $('#next'), box = $('#box'), area = $('#box-area'), wrap = $('#gift-wrap'), dragonEl = $('#dragon'), slot = $('#dragon-slot');
let opened = false, busy = false, shown = 0;

function showCard(i) {
  const c = cards[i]; c.classList.add('in'); shown = Math.max(shown, i + 1); Sfx.soft();
  setTimeout(() => { const r = c.getBoundingClientRect(); Fx.spark(r.left + r.width / 2, r.top + 30, 14); c.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); }, 150);
  next.textContent = shown >= cards.length ? 'Continuar 💌' : 'Siguiente sorpresa ✨';
}
function open() {
  if (opened || busy) return; busy = true; Sfx.soft(); box.classList.add('shake');
  setTimeout(() => { box.classList.remove('shake'); box.classList.add('unwrap'); }, 750);                       // moño y cinta se separan
  setTimeout(() => { box.classList.add('lid-up'); $('#rays').classList.add('on'); Sfx.open();                    // tapa gira hacia atrás + luz
    const r = box.getBoundingClientRect(); Fx.spark(r.left + r.width / 2, r.top + 40, 50); }, 1400);
  setTimeout(() => { opened = true; busy = false; box.disabled = true; area.classList.add('opened');
    $('#gift-msg').hidden = true; $('#open-btn').hidden = true; next.hidden = false; showCard(0); dragon.start(); }, 2600);
}
box.addEventListener('click', open); $('#open-btn').addEventListener('click', open);
next.addEventListener('click', () => { if (shown >= cards.length) App.go('final'); else showCard(shown); });

$('#disc').addEventListener('click', () => { $('#vinyl').classList.toggle('spin'); $('#disc-note').classList.add('show'); Sfx.soft(); });
$$('.note').forEach(n => n.addEventListener('click', () => {
  if (n.classList.contains('open')) return; n.classList.add('open'); n.setAttribute('aria-expanded', 'true'); Sfx.soft();
  const r = n.getBoundingClientRect(); Fx.spark(r.left + r.width / 2, r.top + 20, 10);
}));

const dragon = (() => {
  let on = false, x = 0, y = 0, vx = 0, t = 0, phase = 0, pt = 0, last = 0, raf = 0, face = 1, hold = 0, breath = 0;
  const DUR = [6, 2.6, 3.2];   // alrededor de la caja → visita una tarjeta → vuelve a su nube
  const rel = (el, fx = .5, fy = .5) => { const r = el.getBoundingClientRect(), w = wrap.getBoundingClientRect(); return [r.left - w.left + r.width * fx, r.top - w.top + r.height * fy]; };
  function target() {
    if (phase === 0) { const [cx, cy] = rel(box); return [cx + Math.cos(t * 1.1) * (reduce ? 35 : 80), cy + Math.sin(t * 2.1) * (reduce ? 8 : 34) - 6]; }
    if (phase === 1) { const [cx, cy] = rel(cards[Math.max(shown - 1, 0)], 1, 0); return [cx - 44 + Math.sin(t * 3) * 6, cy - 34 + Math.cos(t * 4) * 5]; }
    if (cards[2].classList.contains('in')) { const [sx, sy] = rel(slot); return [sx, sy - 18]; }
    return rel(box, .5, .2);
  }
  const mouth = () => { const r = dragonEl.getBoundingClientRect(); return [r.left + r.width / 2 + face * r.width * .43, r.top + r.height * .55]; };
  function loop(ms) {
    raf = requestAnimationFrame(loop); const dt = Math.min(.05, (ms - last) / 1000 || .016); last = ms; t += dt;
    if (hold > 0) {                                   // sopla fuego: se queda quieto y la llama sale pegada a la boca
      hold -= dt; if ((breath -= dt) <= 0) { breath = .05; const [mx, my] = mouth(); Fx.fire(mx, my, face, 7); }
    } else {
      pt += dt; if (pt > DUR[phase]) { phase = (phase + 1) % 3; pt = 0; }
      const [tx, ty] = target(), k = 1 - Math.exp(-dt * (phase === 0 ? 5 : 3)), px = x; x += (tx - x) * k; y += (ty - y) * k; vx += ((x - px) / dt - vx) * .1;
      if (Math.abs(vx) > 25) face = vx > 0 ? 1 : -1;
    }
    dragonEl.style.transform = `translate3d(${x - 55}px,${y - 32}px,0) scaleX(${face}) rotate(${Math.sin(t * 3) * 4}deg)`;
  }
  const hit = () => {
    dragonEl.classList.remove('hit'); void dragonEl.offsetWidth; dragonEl.classList.add('hit'); Sfx.puff(); Sfx.soft();
    const r = dragonEl.getBoundingClientRect(), c = r.left + r.width / 2;
    if (c > innerWidth * .6) face = -1; else if (c < innerWidth * .4) face = 1;   // siempre sopla hacia la pantalla
    hold = .9; breath = 0; vx = 0;
    const h = document.createElement('i'); h.className = 'pop'; h.textContent = '🔥'; h.style.left = (x - 8) + 'px'; h.style.top = (y - 64) + 'px'; wrap.append(h); setTimeout(() => h.remove(), 1000);
  };
  dragonEl.addEventListener('click', hit); dragonEl.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hit(); } });
  return {
    start() { if (on) return; on = true; dragonEl.classList.add('on'); [x, y] = rel(box, .5, .3); last = performance.now(); raf = requestAnimationFrame(loop); },
    stop() { on = false; cancelAnimationFrame(raf); }
  };
})();

return {
  appear() { if (opened) { cards.forEach(c => c.classList.add('in')); shown = cards.length; next.hidden = false; next.textContent = 'Continuar 💌'; dragon.start(); } },
  pause() { dragon.stop(); }
};
})();
