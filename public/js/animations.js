// Confeti en <canvas> (sin DOM permanente), sonidos sintetizados y cielo ambiental.
(() => {
'use strict';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
const cv = document.getElementById('fx'), cx = cv.getContext('2d');
const PAL = ['#ff8fb0', '#ffd35e', '#7fe0ff', '#b69cff', '#8ff0b2', '#ffa86b'], GOLD = ['#ffe08a', '#ffd35e', '#fff3c4'];
let W, H, ps = [], raf = 0, last = 0;

function size() { const d = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; cv.style.width = W + 'px'; cv.style.height = H + 'px'; cx.setTransform(d, 0, 0, d, 0, 0); }
addEventListener('resize', size); size();
const add = o => { if (ps.length < 260) ps.push(Object.assign({ vx: 0, vy: 0, g: 0, rot: 0, vr: 0, age: 0, d: 0, wf: 4, w: 0, max: 4, s: 8, c: '#fff' }, o)); };

function draw(p, a) {
  cx.save(); cx.globalAlpha = Math.max(0, a); cx.translate(p.x, p.y); cx.rotate(p.rot); cx.fillStyle = cx.strokeStyle = p.c;
  if (p.t === 'r') { cx.scale(1, Math.abs(Math.cos(p.age * p.wf))); cx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * .66); }
  else if (p.t === 'b') { cx.lineWidth = 3; cx.lineCap = 'round'; cx.beginPath(); cx.moveTo(0, -p.s); for (let k = -p.s; k <= p.s; k += 6) cx.lineTo(Math.sin(k * .25 + p.age * 6) * 5, k); cx.stroke(); }
  else if (p.t === 'o') { cx.globalCompositeOperation = 'lighter'; cx.beginPath(); cx.arc(0, 0, p.s * (1 - p.age / p.max * .75), 0, 6.283); cx.fill(); }
  else if (p.t === 'h') { const s = p.s / 2; cx.beginPath(); cx.moveTo(0, s * .9); cx.bezierCurveTo(-s * 1.6, -s * .2, -s * .6, -s * 1.3, 0, -s * .4); cx.bezierCurveTo(s * .6, -s * 1.3, s * 1.6, -s * .2, 0, s * .9); cx.fill(); }
  else { const s = p.s, k = s * .14; cx.beginPath(); cx.moveTo(0, -s); cx.quadraticCurveTo(k, -k, s, 0); cx.quadraticCurveTo(k, k, 0, s); cx.quadraticCurveTo(-k, k, -s, 0); cx.quadraticCurveTo(-k, -k, 0, -s); cx.fill(); }
  cx.restore();
}
function loop(t) {
  const dt = Math.min(.05, (t - last) / 1000 || 0); last = t; cx.clearRect(0, 0, W, H);
  for (let i = ps.length - 1; i >= 0; i--) {
    const p = ps[i]; if (p.d > 0) { p.d -= dt; continue; }
    p.age += dt; p.vy += p.g * dt; p.x += p.vx * dt + Math.sin(p.age * p.wf) * p.w * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    if (p.age > p.max || p.y > H + 40 || p.y < -80) { ps.splice(i, 1); continue; }
    draw(p, Math.min(1, (p.max - p.age) / .8));
  }
  if (ps.length) raf = requestAnimationFrame(loop); else { raf = 0; cx.clearRect(0, 0, W, H); }   // limpieza: el bucle se detiene solo
}
const run = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } };

function celebrate() {
  const n = reduce ? .4 : 1;
  for (let i = 0; i < 90 * n; i++) add({ t: 'r', x: rnd(0, W), y: rnd(-H * .4, -10), vx: rnd(-30, 30), vy: rnd(60, 160), g: rnd(20, 60), rot: rnd(0, 6), vr: rnd(-5, 5), s: rnd(7, 13), c: pick(PAL), max: rnd(4, 6.5), d: rnd(0, 1.2), wf: rnd(3, 8), w: rnd(10, 40) });
  for (let i = 0; i < 30 * n; i++) add({ t: 'b', x: rnd(0, W), y: rnd(-H * .4, -10), vy: rnd(80, 170), g: 30, rot: rnd(-.5, .5), vr: rnd(-1, 1), s: rnd(30, 60), c: pick(PAL), max: 7, d: rnd(0, 1.2), wf: rnd(2, 4), w: 25 });
  for (let i = 0; i < 24 * n; i++) add({ t: 's', x: rnd(0, W), y: rnd(-H * .3, -10), vy: rnd(40, 100), g: 10, s: rnd(4, 8), c: pick(GOLD), max: 6, d: rnd(0, 1.5), vr: rnd(-2, 2) });
  for (let i = 0; i < 14 * n; i++) add({ t: i % 2 ? 'h' : 's', x: rnd(0, W), y: H + 10, vy: rnd(-150, -80), g: 18, s: rnd(12, 20), c: i % 2 ? '#f29bb5' : '#cdb8ec', max: 5, d: rnd(0, 1.5), wf: 2, w: 25 });
  run();
}
function fire(x, y, dir = 1, n = 42) {
  const cols = ['#fff6b0', '#ffd23f', '#ff9a1f', '#ff5a1f', '#e8341c'];
  for (let i = 0; i < (reduce ? Math.ceil(n / 3) : n); i++) add({ t: 'o', x, y: y + rnd(-3, 3), vx: dir * rnd(160, 330), vy: rnd(-40, 25), g: -60, s: rnd(7, 15), c: pick(cols), max: rnd(.35, .8), wf: 6, w: 12 });
  run();
}
function spark(x, y, n = 26) {
  for (let i = 0; i < (reduce ? n / 3 : n); i++) { const a = rnd(0, 6.28), v = rnd(60, 220), h = i % 4 === 0; add({ t: h ? 'h' : 's', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, g: 120, s: h ? rnd(9, 14) : rnd(3, 7), c: h ? '#f29bb5' : pick(GOLD), max: rnd(.8, 1.6) }); }
  run();
}

// Sonidos suaves sintetizados (sin archivos, sin licencias). No suenan hasta que el usuario interactúa.
const Sfx = (() => {
  let ac, on = true; const ctx = () => { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); return ac; };
  function tone(f, t0, d, v = .05) {
    if (!on) return; try { const c = ctx(), o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0;
      o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + .05); } catch (e) {}
  }
  return {
    get on() { return on; }, set(v) { on = v; },
    chime() { [784, 988, 1175].forEach((f, i) => tone(f, i * .12, .9)); },
    open() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * .1, 1.1, .04)); },
    soft() { tone(880, 0, .8, .035); },
    puff() {
      if (!on) return; try { const c = ctx(), n = c.sampleRate * .4, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
        const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'lowpass'; f.frequency.value = 900; g.gain.value = .08;
        s.buffer = b; s.connect(f).connect(g).connect(c.destination); s.start(); } catch (e) {}
    }
  };
})();

function sky() {
  const s = document.getElementById('sky'), f = document.createDocumentFragment(), SC = ['#ffffff', '#ffd35e', '#ff9ec4', '#7fe0ff', '#b69cff', '#8ff0b2', '#ffa86b'];
  for (let i = 0; i < 44; i++) { const e = document.createElement('i'); e.style.cssText = `left:${rnd(0, 100)}%;top:${rnd(0, 100)}%;--s:${rnd(6, 15)}px;--c:${pick(SC)};--d:${rnd(2, 5)}s;animation-delay:-${rnd(0, 5)}s`; f.append(e); }
  for (let i = 0; i < 10; i++) { const e = document.createElement('b'); e.textContent = pick(['★', '✦', '✶', '✧']); e.style.cssText = `left:${rnd(0, 100)}%;font-size:${rnd(14, 26)}px;color:${pick(SC)};--d:${rnd(16, 28)}s;--x:${rnd(-60, 60)}px;animation-delay:-${rnd(0, 20)}s`; f.append(e); }
  s.append(f);
}
sky();
window.Fx = { celebrate, spark, fire }; window.Sfx = Sfx;
})();
