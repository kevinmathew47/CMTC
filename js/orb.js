// Live orb: a lit sphere with two capsule eyes that follow the pointer and blink.
// Plain-JS port of the 21st.dev "live-orb" component (WebGL), black body with white eyes.
// Usage: <span class="orb" data-orb><span class="orb-face"><i></i><i></i></span><canvas></canvas></span>
//        const orb = LiveOrb.mount(el); orb.pause(); orb.resume();
(function () {
  const BLACK = { color: '#18181B', eyeColor: '#F4F4F5' };

  const VERT = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`;

  const FRAG = `
precision highp float;
uniform vec2 u_resolution;
uniform vec2 u_look;
uniform float u_blink;
uniform vec3 u_body;
uniform vec3 u_eye;

vec3 orient(vec3 p, vec2 look) {
  float yaw = look.x * 0.92;
  float pitch = -look.y * 0.78;
  float cy = cos(yaw); float sy = sin(yaw);
  float cp = cos(pitch); float sp = sin(pitch);
  vec3 q = vec3(p.x, p.y * cp - p.z * sp, p.y * sp + p.z * cp);
  return vec3(q.x * cy + q.z * sy, q.y, -q.x * sy + q.z * cy);
}

float eyeMask(vec3 n, vec3 e, vec3 right, vec3 up, float halfH, float rad) {
  float facing = dot(n, e);
  float x = dot(n, right) - dot(e, right);
  float y = dot(n, up) - dot(e, up);
  y -= clamp(y, -halfH, halfH);
  float d = length(vec2(x, y)) - rad;
  float fill = 1.0 - smoothstep(-0.01, 0.01, d);
  return fill * smoothstep(0.12, 0.32, facing);
}

void main() {
  vec2 uv = (gl_FragCoord.xy / u_resolution.xy) * 2.0 - 1.0;
  uv.x *= u_resolution.x / max(u_resolution.y, 1.0);
  vec2 p = uv / 0.94;
  float r2 = dot(p, p);
  float edge = 1.0 - smoothstep(0.985, 1.012, sqrt(max(r2, 0.0)));
  if (edge <= 0.001) { gl_FragColor = vec4(0.0); return; }
  vec3 n = normalize(vec3(p, sqrt(max(1.0 - r2, 0.0))));
  vec2 look = u_look;
  float lm = length(look);
  if (lm > 1.0) look /= lm;
  vec3 right = orient(vec3(1.0, 0.0, 0.0), look);
  vec3 up = orient(vec3(0.0, 1.0, 0.0), look);
  vec3 eL = orient(normalize(vec3(-0.32, 0.08, 1.0)), look);
  vec3 eR = orient(normalize(vec3(0.32, 0.08, 1.0)), look);
  float halfH = mix(0.128, 0.012, u_blink);
  float rad = mix(0.054, 0.062, u_blink);
  float eyes = max(eyeMask(n, eL, right, up, halfH, rad), eyeMask(n, eR, right, up, halfH, rad));
  gl_FragColor = vec4(clamp(mix(u_body, u_eye, clamp(eyes, 0.0, 1.0)), 0.0, 1.0), edge);
}`;

  const rgb = (hex) => {
    const n = parseInt(hex.replace('#', ''), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  };

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); return null; }
    return s;
  }

  function mount(el, { color = BLACK.color, eyeColor = BLACK.eyeColor, interactive = true, blink = true } = {}) {
    const canvas = el.querySelector('canvas');
    const gl = canvas && canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: false });
    if (!gl) return { pause() {}, resume() {} }; // CSS face stays as the fallback
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return { pause() {}, resume() {} };
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return { pause() {}, resume() {} };
    gl.useProgram(prog);
    el.classList.add('gl');

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (n) => gl.getUniformLocation(prog, n);
    const uRes = u('u_resolution'), uLook = u('u_look'), uBlink = u('u_blink');
    gl.uniform3fv(u('u_body'), rgb(color));
    gl.uniform3fv(u('u_eye'), rgb(eyeColor));
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    new ResizeObserver(resize).observe(el);

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const look = { x: 0, y: 0.08 }, target = { x: 0, y: 0.08 };
    if (interactive) window.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      if (!r.width) return;
      target.x = Math.min(1, Math.max(-1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
      target.y = Math.min(1, Math.max(-1, (r.top + r.height / 2 - e.clientY) / (r.height / 2)));
    }, { passive: true });

    let raf = 0, running = true;
    let nextBlink = performance.now() + 1800 + Math.random() * 2400, blinkAt = -1e4;
    const tick = (now) => {
      if (!running) return;
      look.x += (target.x - look.x) * 0.16;
      look.y += (target.y - look.y) * 0.16;
      if (!reduce && blink && now >= nextBlink) { blinkAt = now; nextBlink = now + 2200 + Math.random() * 3800; }
      const bt = (now - blinkAt) / 1000;
      let b = 0;
      if (!reduce && blink) b = bt < 0.055 ? bt / 0.055 : bt < 0.1 ? 1 : bt < 0.18 ? 1 - (bt - 0.1) / 0.08 : 0;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform2f(uLook, look.x, look.y);
      gl.uniform1f(uBlink, b);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const api = {
      pause() { running = false; cancelAnimationFrame(raf); },
      resume() { if (running) return; running = true; raf = requestAnimationFrame(tick); },
    };
    document.addEventListener('visibilitychange', () => (document.hidden ? api.pause() : el.dataset.paused || api.resume()));
    return api;
  }

  window.LiveOrb = { mount };
})();
