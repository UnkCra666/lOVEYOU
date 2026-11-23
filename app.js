const TITLE = 'Ангелина';   // единственный текст на экране ('' — убрать совсем)
const HUE_PERIOD = 8;       // секунд на полный круг радуги

// ---------- Telegram ----------
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  try { tg.disableVerticalSwipes?.(); } catch {}
  try { tg.setHeaderColor('#0b1016'); tg.setBackgroundColor('#0b1016'); tg.setBottomBarColor?.('#0b1016'); } catch {}
  if (['android', 'ios'].includes(tg.platform)) { try { tg.requestFullscreen?.(); } catch {} }
}
document.getElementById('name').textContent = TITLE;

// ---------- WebGL (без three.js) ----------
const canvas = document.getElementById('c');
const gl = canvas.getContext('webgl', { antialias: false, powerPreference: 'high-performance' });
let scale = Math.min(window.devicePixelRatio || 1, 1.25) * 0.6;
function resize() {
  canvas.width = Math.round(innerWidth * scale);
  canvas.height = Math.round(innerHeight * scale);
  gl.viewport(0, 0, canvas.width, canvas.height);
}
addEventListener('resize', resize);
resize();

const PREC = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';
const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
function onPointer(e) {
  mouse.tx = (e.clientX / innerWidth) * 2 - 1;
  mouse.ty = -((e.clientY / innerHeight) * 2 - 1);
}
addEventListener('pointermove', onPointer);
addEventListener('pointerdown', onPointer);

// ---------- звук ----------
const audio = document.getElementById('a'), btn = document.getElementById('btn'),
      start = document.getElementById('start'), ico = document.getElementById('ico');
const PLAY = 'M8 5v14l11-7z', PAUSE = 'M6 5h4v14H6zM14 5h4v14h-4z';
let ctx = null, an = null, fft = null, bass = 0;
function setupAudio() {
  if (an) return;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createMediaElementSource(audio);
    an = ctx.createAnalyser(); an.fftSize = 256; an.smoothingTimeConstant = 0.8;
    src.connect(an); an.connect(ctx.destination);
    fft = new Uint8Array(an.frequencyBinCount);
  } catch { an = null; }
}
const label = () => { ico.innerHTML = `<path d="${audio.paused ? PLAY : PAUSE}"/>`; };
start.addEventListener('click', () => {
  setupAudio(); ctx?.resume?.();
  audio.play().catch(() => {});
  start.classList.add('hide');
  tg?.HapticFeedback?.impactOccurred('light');
  label();
audio.addEventListener('error', () => { start.classList.add('hide'); btn.style.display = 'none'; });
});
btn.addEventListener('click', () => { ctx?.resume?.(); audio.paused ? audio.play() : audio.pause(); });
['play', 'pause', 'ended'].forEach((ev) => audio.addEventListener(ev, label));
document.addEventListener('visibilitychange', () => { if (document.hidden) audio.pause(); });
label();

// ---------- запуск ----------
(async function init() {
  const frag = await (await fetch('shader.frag')).text();
  const compile = (type, code) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, code); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, PREC + frag));
  gl.linkProgram(prog); gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = (n) => gl.getUniformLocation(prog, n);
  const uTime = U('uTime'), uGlide = U('uGlide'), uHue = U('uHue'), uBass = U('uBass'),
        uRes = U('uResolution'), uMouse = U('uMouse');

  let last = performance.now(), time = 0, glide = 0, accT = 0, accN = 0;
  (function tick(now) {
    const raw = (now - last) / 1000; last = now;
    const dt = Math.min(raw, 0.1);
    time += dt;

    // автоподстройка качества под слабые телефоны
    if (raw < 0.2 && time > 2) {
      accT += raw; accN++;
      if (accT >= 1.5) {
        if (accN / accT < 40 && scale > 0.35) { scale *= 0.85; resize(); }
        accT = 0; accN = 0;
      }
    }

    if (an && !audio.paused) {
      an.getByteFrequencyData(fft);
      let s = 0; for (let i = 0; i < 6; i++) s += fft[i];
      bass += (s / 6 / 255 - bass) * 0.2;
    } else bass *= 0.95;
    glide += dt * (0.42 + bass * 0.9);
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;

    gl.uniform1f(uTime, time);
    gl.uniform1f(uGlide, glide);
    gl.uniform1f(uBass, bass);
    gl.uniform1f(uHue, (time / HUE_PERIOD) % 1);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(tick);
  })(last);
})().catch((e) => { document.body.insertAdjacentHTML('beforeend', '<pre style="position:fixed;z-index:99;top:60px;left:12px;right:12px;font-size:11px;white-space:pre-wrap">' + e.message + '</pre>'); });
