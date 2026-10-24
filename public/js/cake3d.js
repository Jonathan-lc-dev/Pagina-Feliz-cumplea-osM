// Pastel 3D procedural con Three.js (r128). Expone window.Cake {init,start,stop,blow,relight}
(() => {
'use strict';
if (!window.THREE) {
  window.Cake = { init(el){ el.insertAdjacentHTML('beforeend','<p class="fallback">No se pudo cargar el pastel 3D (revisa tu conexión) 💗</p>'); }, start(){}, stop(){}, blow(){}, relight(){} };
  return;
}
const T = THREE, TAU = Math.PI * 2, H = 2.6;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
let renderer, scene, camera, root, flameG, flame, core, glow, light, container, M, smokeTex;
let raf = 0, running = false, ready = false, lastT = 0, time = 0;
let yaw = .6, pitch = .5, sy = .6, sp = .5, vy = 0, hx = 0, hy = 0, thx = 0, thy = 0, idle = 0, dragging = false, lx = 0, ly = 0;
let lit = true, blowAt = -1, smokeT = 0;
let star; const smoke = [], geo = {}, tgt = new T.Vector3(0, 2.4, 0);
const G = (k, f) => geo[k] || (geo[k] = f());

function radial(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, inner); r.addColorStop(1, outer); g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new T.CanvasTexture(c);
}
function noise() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), d = g.createImageData(128, 128);
  for (let i = 0; i < d.data.length; i += 4) { d.data[i] = d.data[i+1] = d.data[i+2] = 120 + Math.random()*100; d.data[i+3] = 255; }
  g.putImageData(d, 0, 0); const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(6, 2); return t;
}
function materials() {
  return {
    cream: new T.MeshStandardMaterial({ color: 0xffeed8, roughness: .8 }),
    bead:  new T.MeshStandardMaterial({ color: 0xfffaf0, roughness: .5 }),
    pink:  new T.MeshStandardMaterial({ color: 0xec86a4, roughness: .45 }),
    pinkL: new T.MeshStandardMaterial({ color: 0xf6b0c3, roughness: .45 }),
    pearl: new T.MeshPhysicalMaterial({ color: 0xf6b0c3, roughness: .15, metalness: .1, clearcoat: 1 }),
    plate: new T.MeshStandardMaterial({ color: 0xe6dcf0, roughness: .6 }),
    candle:new T.MeshStandardMaterial({ color: 0xf6b0c3, roughness: .5 }),
    wick:  new T.MeshBasicMaterial({ color: 0xf6b0c3 }),
    gold:  new T.MeshStandardMaterial({ color: 0xf2c964, metalness: .7, roughness: .36, emissive: 0x3a2a00 }),
    stick: new T.MeshStandardMaterial({ color: 0xfdfdff, roughness: .4 })
  };
}
// Concha de betún piped: gota con surcos que corren a lo largo (extremo redondo en +z, cola en -z)
function shellGeo() {
  return G('shell', () => {
    const g = new T.SphereGeometry(1, 28, 18), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), w = (z + 1) / 2;
      const f = (.5 + .5 * Math.pow(w, .6)) * (1 + .13 * Math.sin(Math.atan2(y, x) * 9));
      p.setXYZ(i, x * f, y * f, z);
    }
    g.computeVertexNormals(); return g;
  });
}
const pearl = (s = .05) => new T.Mesh(G('p' + s, () => new T.SphereGeometry(s, 12, 10)), M.pearl);

// ---- Forma del pastel: 'heart' (como la foto) o 'round' ----
const SHAPE = 'round', HS = .13;
function outline2D(n) {
  const a = [];
  for (let i = 0; i < n; i++) {
    const t = i / n * TAU;
    if (SHAPE === 'round') { a.push([Math.cos(t) * 2.1, Math.sin(t) * 2.1]); continue; }
    const hx = 16 * Math.pow(Math.sin(t), 3), hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    a.push([hx * HS, (hy + 2.5) * HS]);
  }
  return a;
}
let curve, sgn = 1;
function frame(u) {
  const p = curve.getPointAt(u % 1), t = curve.getTangentAt(u % 1);
  return { p, n: new T.Vector3(t.z * sgn, 0, -t.x * sgn).normalize() };
}

function build() {
  root = new T.Group(); scene.add(root);
  const pts = outline2D(160);
  curve = new T.CatmullRomCurve3(pts.map(([x, y]) => new T.Vector3(x, 0, -y)), true, 'centripetal');
  const probe = frame(.25); sgn = 1; const c0 = curve.getPointAt(.25); if (probe.n.x * c0.x + probe.n.z * c0.z < 0) sgn = -1;
  if (SHAPE === 'heart') { const f = frame(.5); sgn = f.n.z > 0 ? 1 : -1; }   // el pico del corazón mira al frente

  const add = (m, x = 0, y = 0, z = 0) => { m.position.set(x, y, z); root.add(m); return m; };
  // objeto orientado con +z hacia afuera del pastel
  const place = (m, f, off, y, droop = 0) => {
    m.rotation.order = 'YXZ'; m.rotation.y = Math.atan2(f.n.x, f.n.z); m.rotation.x = droop;
    m.position.set(f.p.x + f.n.x * off, y, f.p.z + f.n.z * off); root.add(m); return m;
  };
  const shell = (mat, s) => { const m = new T.Mesh(shellGeo(), mat); m.scale.set(s, s * .85, s * 1.5); return m; };
  const around = (n, fn, phase = 0) => { for (let i = 0; i < n; i++) fn(i, frame(i / n + phase / n)); };

  add(new T.Mesh(new T.CylinderGeometry(3.15, 3.2, .09, 72), M.plate), 0, -.045, 0).receiveShadow = true;

  const sh = new T.Shape(); pts.forEach(([x, y], i) => i ? sh.lineTo(x, y) : sh.moveTo(x, y)); sh.closePath();
  const bg = new T.ExtrudeGeometry(sh, { depth: H, bevelEnabled: false, curveSegments: 1 }); bg.rotateX(-Math.PI / 2);
  const body = add(new T.Mesh(bg, M.cream)); body.castShadow = true; body.receiveShadow = true;

  // Base: conchas rosas grandes + hilera de conchitas/perlitas
  around(24, (i, f) => place(shell(M.pink, .28), f, -.22, .2, .18));
  around(52, (i, f) => place(shell(i % 2 ? M.pinkL : M.bead, .11), f, -.05, .62, .3));
  // Borde alto: cuentas cremosas bajo las conchas
  around(58, (i, f) => place(pearl(.1), f, .02, H - .45));
  // Borde superior: conchitas blancas detrás y conchas rosas grandes
  around(44, (i, f) => place(shell(M.bead, .13), f, -.12, H - .03, .5), .5);
  around(22, (i, f) => place(shell(M.pink, .3), f, -.32, H + .08, .35));

  // Guirnaldas: cordón de perlitas rosas + volante blanco, con concha y perla en cada unión
  const NJ = SHAPE === 'heart' ? 6 : 8, yTop = H - .78, sag = .62;
  for (let k = 0; k < NJ; k++) {
    const u0 = k / NJ, u1 = (k + 1) / NJ;
    for (let j = 0; j <= 16; j++) {
      const t = j / 16, f = frame(u0 + (u1 - u0) * t), y = yTop - Math.sin(t * Math.PI) * sag;
      place(pearl(.07), f, .05, y);
      if (j % 2 === 0 && j > 0 && j < 16) { const r = shell(M.bead, .1); place(r, f, -.04, y - .17, .9); }
    }
    const f = frame(u0); place(shell(M.bead, .15), f, -.1, yTop, .5); place(pearl(.09), f, .1, yTop - .02);
  }

  // Vela de estrella: palito blanco + estrella dorada (siempre mira a la cámara)
  add(new T.Mesh(new T.CylinderGeometry(.05, .05, 1.3, 12), M.stick), 0, H + .45, 0);
  add(new T.Mesh(new T.CylinderGeometry(.07, .07, .16, 12), M.gold), 0, H + 1.12, 0);
  const sp = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? .17 : .4, a = Math.PI / 2 + i * Math.PI / 5; sp.push([Math.cos(a) * r, Math.sin(a) * r]); }
  const ss = new T.Shape(); sp.forEach(([x, y], i) => i ? ss.lineTo(x, y) : ss.moveTo(x, y)); ss.closePath();
  const sg = new T.ExtrudeGeometry(ss, { depth: .1, bevelEnabled: true, bevelThickness: .06, bevelSize: .05, bevelSegments: 4, curveSegments: 1 }); sg.translate(0, 0, -.05);
  star = new T.Mesh(sg, M.gold); star.position.set(0, H + 1.55, 0); star.castShadow = true; root.add(star);
  const ty = H + 1.55 + .46;
  add(new T.Mesh(new T.CylinderGeometry(.012, .012, .14, 6), M.wick), 0, ty + .06, 0);
  flameG = new T.Group(); flameG.position.set(0, ty + .16, 0); root.add(flameG);
  flame = new T.Mesh(new T.SphereGeometry(.13, 16, 14), new T.MeshBasicMaterial({ color: 0xffc861 })); flame.position.y = .12; flame.scale.set(.95, 1.9, .95);
  core = new T.Mesh(new T.SphereGeometry(.07, 12, 10), new T.MeshBasicMaterial({ color: 0xfff4d0 })); core.position.y = .08; core.scale.set(1, 1.8, 1);
  glow = new T.Sprite(new T.SpriteMaterial({ map: radial('rgba(255,190,90,.8)', 'rgba(255,190,90,0)'), blending: T.AdditiveBlending, depthWrite: false, transparent: true }));
  glow.scale.set(1.1, 1.1, 1); glow.position.y = .15;
  flameG.add(flame, core, glow);
  light = new T.PointLight(0xffb066, 1.5, 9, 2); light.position.set(0, ty + .3, 0); root.add(light);
}

function puff() {
  const s = new T.Sprite(new T.SpriteMaterial({ map: smokeTex, transparent: true, opacity: .35, depthWrite: false, color: 0xdddddd }));
  s.position.set(flameG.position.x + (Math.random() - .5) * .05, flameG.position.y + .1, 0); s.scale.set(.15, .15, 1);
  s.userData = { age: 0, max: 2.4, dx: (Math.random() - .5) * .2 }; root.add(s); smoke.push(s);
}
function flameStep(dt) {
  if (lit) {
    const k = reduce ? .4 : 1, f = 1 + (Math.sin(time * 17) * .06 + Math.sin(time * 29) * .04) * k;
    flame.scale.set(f * .95, 1.9 * f, f * .95); flameG.rotation.z = Math.sin(time * 4.3) * .08 * k;
    light.intensity = 1.5 + Math.sin(time * 23) * .2 * k; glow.material.opacity = .6 + Math.sin(time * 11) * .08 * k;
  } else if (blowAt >= 0) {
    const b = time - blowAt, fade = clamp((b - .5) / .9, 0, 1);
    flameG.rotation.z = -Math.min(1, b / .6);                       // la llama se inclina
    flameG.scale.setScalar(Math.max(.001, 1 - fade)); glow.material.opacity = (1 - fade) * .6; flameG.visible = fade < 1;
    light.intensity = 1.5 * (1 - clamp((b - .3) / 1.8, 0, 1));      // la luz cálida se desvanece
    if (b > .8 && b < 2.4 && (smokeT -= dt) <= 0) { puff(); smokeT = .09; }
  }
  for (let i = smoke.length - 1; i >= 0; i--) {
    const s = smoke[i], u = s.userData; u.age += dt;
    if (u.age > u.max) { root.remove(s); s.material.dispose(); smoke.splice(i, 1); continue; }
    const p = u.age / u.max; s.position.y += dt * .8; s.position.x += (Math.sin(u.age * 3) * .15 + u.dx) * dt;
    s.scale.setScalar(.15 + p * .6); s.material.opacity = .35 * Math.pow(1 - p, 1.2);
  }
}
function tick(ms) {
  raf = requestAnimationFrame(tick);
  const dt = Math.min(.05, (ms - lastT) / 1000 || 0); lastT = ms; time += dt;
  if (!dragging) { idle += dt; if (idle > 5 && !reduce) yaw += dt * .1; yaw += vy; vy *= .93; }
  hx += (thx - hx) * .08; hy += (thy - hy) * .08;
  sy += (yaw + hx * .7 - sy) * .12; sp += (clamp(pitch + hy * .2, .08, 1.25) - sp) * .12;
  const el = renderer.domElement, asp = el.clientWidth / Math.max(1, el.clientHeight);
  const d = clamp(2.9 / (Math.tan(19 * Math.PI / 180) * asp), 10, 15);
  camera.position.set(Math.sin(sy) * Math.cos(sp) * d, tgt.y + Math.sin(sp) * d, Math.cos(sy) * Math.cos(sp) * d);
  camera.lookAt(tgt); if (star) star.rotation.y = sy; flameStep(dt); renderer.render(scene, camera);
}
function resize() {
  if (!container || !renderer) return; const w = container.clientWidth, h = container.clientHeight; if (!w || !h) return;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
function bindInput(c) {
  c.style.touchAction = 'none';
  c.addEventListener('pointerdown', e => { dragging = true; idle = 0; lx = e.clientX; ly = e.clientY; c.setPointerCapture(e.pointerId); c.style.cursor = 'grabbing'; });
  c.addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse' && !dragging) { const r = c.getBoundingClientRect(); thx = (e.clientX - r.left) / r.width * 2 - 1; thy = (e.clientY - r.top) / r.height * 2 - 1; return; }
    if (!dragging) return;
    const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
    yaw -= dx * .009; vy = -dx * .0009; pitch = clamp(pitch + dy * .006, .08, 1.25);   // límites naturales de inclinación
  });
  const end = () => { dragging = false; idle = 0; c.style.cursor = 'grab'; };
  c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
  c.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { thx = 0; thy = 0; } });
}

window.Cake = {
  init(el) {
    if (ready) return; container = el;
    try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); }
    catch (e) { el.insertAdjacentHTML('beforeend', '<p class="fallback">Tu dispositivo no puede mostrar el pastel en 3D, pero el resto de la sorpresa funciona 💗</p>'); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);
    scene = new T.Scene(); camera = new T.PerspectiveCamera(38, 1, .1, 100);
    scene.add(new T.HemisphereLight(0xfff6f0, 0x9fb8e8, .7));
    const key = new T.DirectionalLight(0xfff1de, 1.15); key.position.set(4, 9, 6); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 25 }); key.shadow.bias = -.0005; scene.add(key); const fill = new T.DirectionalLight(0xcfe0ff, .4); fill.position.set(-6, 4, -3); scene.add(fill);
    M = materials(); smokeTex = radial('rgba(200,200,200,.9)', 'rgba(200,200,200,0)');
    build(); bindInput(renderer.domElement); resize(); new ResizeObserver(resize).observe(el); ready = true;
  },
  start() { if (!ready || running) return; running = true; lastT = performance.now(); resize(); raf = requestAnimationFrame(tick); },
  stop() { running = false; cancelAnimationFrame(raf); },
  blow() { lit = false; blowAt = time; },
  relight() {
    lit = true; blowAt = -1; smokeT = 0; if (!ready) return;
    flameG.visible = true; flameG.scale.setScalar(1); flameG.rotation.z = 0; glow.material.opacity = .6; light.intensity = 1.5;
    smoke.splice(0).forEach(s => { root.remove(s); s.material.dispose(); });
  }
};
})();
