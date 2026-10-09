// Selected shared camera, glass and pointer renderer. Portfolio keeps its live page sampling.
import { captureScreenSource, previewSampleHeight } from "./konami-screen-source.js?v=24";
import { entryFittedTarget } from "./konami-canvas-entry.js?v=2";
import { applyComputerLayout, allowsComputerCameraMotion } from "./konami-layout.js";
import {
  previewScroll,
  createPreviewTimeline,
  runEntryTransition,
  isPortfolioSnapshotCompatible,
  fadeToPortfolio,
  promoteEntryCanvas,
  hasComplexEntryTransform,
  entryPortfolioTarget,
  fadeCanvasToPreview,
  ZOOM_MS,
} from "./konami-transition.js?v=31";
const Tt = "/experience/models/ivory-classic/";
const kt = 12,
  Gt = ZOOM_MS,
  Ne = 19,
  Je = 3,
  $ = 9,
  V = 1,
  Xt = -0.34,
  Yt = 0.01,
  Ht = -0.055,
  qt = 0.015,
  Qe = 0.155,
  Ct = Math.hypot(1.35, 0.22 - Qe),
  jt = Math.atan2(0.22 - Qe, 1.35),
  St = Math.tan((17 * Math.PI) / 180),
  Be = { left: 0.2, top: 0.22, size: 0.6 },
  Kt = 0.119,
  Zt = 0.093,
  Rt = 0.203,
  Mt = Math.tan((10 * Math.PI) / 180),
  Ee = -0.0025,
  fe = [0.116, -0.15 + Mt * (0.078 - 0.035) - 0.0023, 0.078 + Ee],
  Jt = 0.0069,
  ne = 24,
  Oe = 18,
  Qt = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const oo = `#version 300 es
in vec2 aFrame; in vec2 aUV;
uniform vec3 uRect; uniform vec2 uView;
out vec2 vFrame; out vec2 vUV;
void main() {
  vFrame = aFrame; vUV = aUV;
  vec2 p = uRect.xy + aFrame * uRect.z;
  gl_Position = vec4(p.x / uView.x * 2. - 1., 1. - p.y / uView.y * 2., 0., 1.);
}`,
  ro = `#version 300 es
precision highp float;
in vec2 vFrame; in vec2 vUV;
uniform float uApertureCover;
uniform bool uExternal;
uniform sampler2D uSite, uG0, uG1, uG2, uG3, uCue, uK0, uK1, uK2, uK3;
uniform vec3 uCueBox; // width, height (screen UV), burst 0..1
uniform vec4 uW;
uniform vec4 uPage; // page box in tube UV (w, h), then window/snapshot size ratios (x, y)
uniform float uScroll, uLines, uCrt, uReflect, uHover, uPower, uFlash, uAlpha;
uniform mat3 uColour; // same grade as the case: the glass reflects the graded shell
uniform vec4 uTube;   // the tube's footprint (centre, half size) in frame units
out vec4 outColor;
// Tube UV to snapshot UV: the visitor's window, centred in the tube at 1:1 CSS scale. Outside it
// the snapshot extends (page background at the sides, more page below), like the live page.
vec2 st(vec2 uv) {
  if (uExternal) return vec2(uv.x, uScroll + (1. - uv.y) * uPage.w);
  vec2 p = (uv - .5) / uPage.xy;
  return vec2(.5 + p.x * uPage.z, uScroll + (.5 - p.y) * uPage.w);
}
void main() {
  // Extra tube curvature on top of the real glass bulge in the mesh.
  vec2 c = vUV * 2. - 1.;
  c *= 1. + uCrt * .018 * dot(c, c);
  vec2 uv = c * .5 + .5;
  // Antialiased raster edge: a one-pixel ramp instead of a stair-stepped cut. It belongs to the
  // CRT look, so it fades with it; the flattened page on entry gets no dark frame.
  vec2 edge = min(uv, 1. - uv) / max(fwidth(uv), vec2(1e-5));
  float inside = mix(1., clamp(min(edge.x, edge.y), 0., 1.), uCrt);
  // Passing through the glass on entry adds a brief colour fringe, never a white flash.
  vec2 fringe = c * (uCrt * .0005 + uFlash * .0015);
  vec3 col = vec3(texture(uSite, st(uv + fringe)).r, texture(uSite, st(uv)).g, texture(uSite, st(uv - fringe)).b);
  vec3 glow = textureLod(uSite, st(uv), 4.).rgb;
  col = mix(col, max(col, glow), (.04 + .04 * uHover) * uCrt);
  col *= 1. + .04 * uHover * uCrt;
  // The click cue is part of the picture: drawn before the scanlines, so it bends with the
  // glass and picks up every CRT effect. Hover lifts it; on entry it swells and fades.
  vec2 cueSize = uCueBox.xy * (1. + .5 * uCueBox.z);
  vec2 cueUv = (uv - .5) / cueSize + .5;
  // Sampled unconditionally: inside a branch, neighbouring pixels disagree on the mip level and
  // the outline breaks up along the box edge. The drawing has a transparent margin, so the box
  // mask never cuts into it.
  vec4 cue = texture(uCue, clamp(vec2(cueUv.x, 1. - cueUv.y), 0., 1.)); // premultiplied
  cue *= step(0., cueUv.x) * step(cueUv.x, 1.) * step(0., cueUv.y) * step(cueUv.y, 1.);
  cue.rgb = mix(cue.rgb, cue.a - cue.rgb, uHover);                        // hover inverts, the classic pressed button
  cue *= (1. - uCueBox.z) * smoothstep(.8, 1., uPower);
  col = col * (1. - cue.a) + cue.rgb;
  // Power-on: a dot stretches into a bright line, the line opens into the picture, phosphor settles.
  vec2 d = abs(vUV - .5) * 2.;
  // Spans open past the edges (1.1), so once on, the mask never darkens the picture's border.
  float spanX = 1.1 * smoothstep(0., .35, uPower), spanY = mix(.012, 1.1, smoothstep(.3, .75, uPower));
  float lit = (1. - smoothstep(spanX - .03, spanX, d.x)) * (1. - smoothstep(spanY - .03, spanY, d.y));
  float settle = 1. - smoothstep(.3, 1., uPower);
  col = mix(vec3(.85, .93, 1.), col, smoothstep(.45, .9, uPower)) * lit * (1. + .9 * settle * step(.001, uPower));
  // Soft scanlines, after power-on so the line and the opening picture are made of them too.
  // Faded out wherever a line would be under ~3 device pixels (moiré).
  float period = 1. / max(uLines * fwidth(uv.y), 1e-5);
  float scan = .5 + .5 * cos(uv.y * uLines * 6.2831853);
  col *= mix(1., mix(.97, 1.01, scan * scan), uCrt * smoothstep(2.5, 3.8, period));
  col *= 1. - uCrt * .08 * smoothstep(.5, 1.45, length(c));
  // Page colors remain exactly those of the destination.
  vec3 reflection = clamp(uColour * (texture(uG0, vFrame).rgb * uW.x + texture(uG1, vFrame).rgb * uW.y
    + texture(uG2, vFrame).rgb * uW.z + texture(uG3, vFrame).rgb * uW.w), 0., 1.);
  // Screen blend: reflections lift dark content but cannot blow out a light page.
  vec3 rgb = 1. - (1. - col * inside) * (1. - reflection * uReflect);
  // The flattened screen can be wider than the computer; only the tube's footprint (under the
  // bezel) is drawn, so it never pokes out past the case.
  float footprint = step(abs(vFrame.x - uTube.x), uTube.z) * step(abs(vFrame.y - uTube.y), uTube.w);
  float cover = (texture(uK0, vFrame).a * uW.x + texture(uK1, vFrame).a * uW.y
    + texture(uK2, vFrame).a * uW.z + texture(uK3, vFrame).a * uW.w);
  float keep = uAlpha * footprint * (1. - cover * uApertureCover);
  outColor = vec4(rgb, 1.) * keep;
}`,
  no = `#version 300 es
precision highp float;
in vec2 vFrame; in vec2 vUV;
uniform sampler2D uC0, uC1, uC2, uC3;
uniform vec4 uW; uniform float uDark, uWall, uFade;
uniform mat3 uColour; // the poster's CSS filter as a colour matrix
uniform vec4 uLed;   // frame x, y, radius, level
uniform vec4 uSpill; // frame x, y, radius x, radius y
uniform vec4 uSpillColour; // rgb, level
uniform int uMaterial;
out vec4 outColor;
void main() {
  // The cast shadow runs past the render crop; feather it out instead of a hard square edge.
  vec2 edge = min(vFrame, 1. - vFrame);
  float feather = smoothstep(0., .12, min(edge.x, edge.y));
  vec4 frame = texture(uC0, vFrame) * uW.x + texture(uC1, vFrame) * uW.y
    + texture(uC2, vFrame) * uW.z + texture(uC3, vFrame) * uW.w;
  if (frame.a > .002) {
    vec3 raw = clamp(frame.rgb / frame.a, 0., 1.);
    float plastic = smoothstep(.03, .18, raw.r - raw.b) * smoothstep(.005, .1, raw.g - raw.b) * smoothstep(-.12, .1, raw.r - raw.g);
    float luminance = dot(raw, vec3(.2126, .7152, .0722));
    float chroma = max(raw.r, max(raw.g, raw.b)) - min(raw.r, min(raw.g, raw.b));
    vec3 green = clamp(vec3(luminance) + chroma * vec3(-.7, .2, .08), 0., 1.);
    vec3 straight = uMaterial == 3 ? raw : mix(raw, green, plastic);
    // On a dark page a black studio shadow reads as a muddy hole, so it is lightened there.
    float shadow = (1. - smoothstep(.0, .04, max(straight.r, max(straight.g, straight.b)))) * (1. - step(.995, frame.a));
    frame = vec4(straight, 1.) * frame.a * (1. - shadow * .45 * uDark);
    // On entry the tube's black graphite inner wall clears away, so the page runs straight up
    // to the plastic instead of being framed in black as the case flies past.
    float graphite = 1. - smoothstep(.22, .5, max(straight.r, max(straight.g, straight.b)));
    frame *= 1. - uWall * graphite;
  }
  // Power LED: the white button warms up and throws a soft halo.
  float ledLevel = uLed.w;
  float led = length(vFrame - uLed.xy) / uLed.z;
  frame.rgb = mix(frame.rgb, vec3(1., .97, .9) * frame.a, smoothstep(1.1, .5, led) * .55 * ledLevel);
  float halo = exp(-led * led * .18) * mix(.35, .12, uDark) * ledLevel;
  frame += vec4(vec3(1., .95, .85), 1.) * halo * (1. - frame.a);
  // Screen light spilling onto the floor in front, tinted by the page on the tube.
  vec2 s = (vFrame - uSpill.xy) / uSpill.zw;
  float spill = exp(-dot(s, s) * 2.) * uSpillColour.a;
  frame += vec4(uSpillColour.rgb, 1.) * spill * (1. - frame.a);
  outColor = frame * (uMaterial == 3 ? 1. : feather) * uFade;
}`;
async function so() {
  const p = `Chicago, Charcoal, Geneva, ${getComputedStyle(document.body).fontFamily}`;
  await Promise.race([
    document.fonts.load(`700 19px ${p}`),
    new Promise((R) => setTimeout(R, 300)),
  ]);
  const s = matchMedia("(hover: none) and (pointer: coarse)").matches ? "Tap" : "Click",
    x = 3,
    h = 3,
    g = 112 + h * 2,
    T = 52 + h * 2,
    u = document.createElement("canvas"),
    e = u.getContext("2d");
  ((u.width = g * x), (u.height = T * x), e.scale(x, x));
  const i = (R, me) => {
    const F = R + h;
    (e.beginPath(), e.roundRect(F, F, g - F * 2, T - F * 2, me));
  };
  return (
    (e.fillStyle = "#000"),
    i(0, 18),
    e.fill(),
    (e.fillStyle = "#fff"),
    i(4, 14),
    e.fill(),
    (e.fillStyle = "#000"),
    i(7, 11),
    e.fill(),
    (e.fillStyle = "#fff"),
    i(8, 10),
    e.fill(),
    (e.fillStyle = "#000"),
    (e.font = `700 19px ${p}`),
    (e.textAlign = "center"),
    (e.textBaseline = "middle"),
    e.fillText(s, g / 2, T / 2 + 1),
    u
  );
}
function io(p) {
  const s = document.createElement("canvas");
  s.width = s.height = 1;
  const x = s.getContext("2d");
  x.drawImage(p, 0, 0, p.naturalWidth, Math.min(p.naturalHeight, 1e3), 0, 0, 1, 1);
  const [h, g, T] = x.getImageData(0, 0, 1, 1).data;
  return [h / 255, g / 255, T / 255];
}
function uo(p, s, x, h) {
  const g = (u, e, i) => 3 * u * i * (1 - i) ** 2 + 3 * e * i * i * (1 - i) + i ** 3,
    T = (u, e, i) => 3 * u * (1 - i) ** 2 + 6 * (e - u) * i * (1 - i) + 3 * (1 - e) * i * i;
  return (u) => {
    let e = u;
    for (let i = 0; i < 6; i++) e -= (g(p, x, e) - u) / (T(p, x, e) || 1e-6);
    return g(s, h, Math.min(Math.max(e, 0), 1));
  };
}
const co = uo(0.45, 0, 0.15, 1),
  K = (p, s, x) => {
    const h = Math.min(Math.max((x - p) / (s - p), 0), 1);
    return h * h * (3 - 2 * h);
  };
async function lo(p, s, options = {}) {
  const kind = p.dataset.kind || "portfolio";
  if (!["portfolio", "scout", "references"].includes(kind))
    throw new Error("Unknown computer destination");
  // Inflatable Scout has one measured pose and its own aperture. It must never
  // request the retired acrylic angle bank, including direct runtime callers.
  if (kind === "scout") {
    const { mountCanvasComputer } = await import("./konami-canvas-scene.js?v=ship-4");
    return mountCanvasComputer(p, s, options);
  }
  const external = kind !== "portfolio";
  let visible = options.initiallyVisible !== false,
    active = true,
    hasPainted = false,
    inputGeneration = 0,
    prefetchTimer;
  const x = p.querySelector("[data-computer-stage]"),
    h = p.querySelector("[data-computer-enter]"),
    g = matchMedia("(prefers-reduced-motion: reduce)"),
    T = matchMedia("(hover: hover) and (pointer: fine)").matches,
    u = document.createElement("canvas"),
    e = u.getContext("webgl2", {
      alpha: !0,
      premultipliedAlpha: !0,
      antialias: !0,
      powerPreference: "low-power",
    });
  if (!x || !h) throw new Error("Computer stage or entry button missing");
  if (!e) throw new Error("WebGL2 unavailable");
  u.className = "konami-computer-canvas";
  u.style.visibility = visible ? "visible" : "hidden";
  x.append(u);
  const i = `${V}-${$}`;
  let R = 0,
    me = 0,
    F = !1,
    D = !1;
  const earlyCleanup = () => {
    F = true;
    clearTimeout(prefetchTimer);
    cancelAnimationFrame(R);
    e.getExtension("WEBGL_lose_context")?.loseContext();
    u.remove();
  };
  s.addEventListener("abort", earlyCleanup, { once: true });
  s.throwIfAborted();
  const fail = (error) => {
    if (!s.aborted && !F) options.onError?.(error);
  };
  let Ve = document.documentElement.classList.contains("dark");
  const We = { css: innerWidth },
    Pt = captureScreenSource({
      kind,
      signal: s,
      maxTextureSize: Math.min(4096, e.getParameter(e.MAX_TEXTURE_SIZE)),
    });
  Pt.catch(() => {});
  function et(t) {
    const o = e.createProgram();
    for (const [n, a] of [
      [e.VERTEX_SHADER, oo],
      [e.FRAGMENT_SHADER, t],
    ]) {
      const c = e.createShader(n);
      if ((e.shaderSource(c, a), e.compileShader(c), !e.getShaderParameter(c, e.COMPILE_STATUS)))
        throw new Error(e.getShaderInfoLog(c) ?? "shader");
      (e.attachShader(o, c), e.deleteShader(c));
    }
    if (
      (e.bindAttribLocation(o, 0, "aFrame"),
      e.bindAttribLocation(o, 1, "aUV"),
      e.linkProgram(o),
      !e.getProgramParameter(o, e.LINK_STATUS))
    )
      throw new Error(e.getProgramInfoLog(o) ?? "link");
    const r = new Proxy(
      {},
      { get: (n, a) => (a in n ? n[a] : (n[a] = e.getUniformLocation(o, a))) },
    );
    return { program: o, uniforms: r };
  }
  const tt = et(ro),
    ot = et(no),
    he = (ne + 1) * (Oe + 1),
    Ae = new Float32Array(he * 2),
    I = new Float32Array(he * 2),
    Te = new Float32Array(he * 3);
  for (let t = 0; t <= Oe; t++)
    for (let o = 0; o <= ne; o++) {
      const r = t * (ne + 1) + o,
        n = o / ne,
        a = t / Oe,
        c = (2 * n - 1) * Kt,
        m = Rt + (2 * a - 1) * Zt,
        d =
          -0.15 +
          Mt * (m - 0.035) -
          0.018 +
          0.245 -
          Math.sqrt(0.245 ** 2 - c * c - (m - Rt) ** 2) +
          0.002;
      (Ae.set([n, a], r * 2), Te.set([c, d, m + Ee], r * 3));
    }
  const $e = [];
  for (let t = 0; t < Oe; t++)
    for (let o = 0; o < ne; o++) {
      const r = t * (ne + 1) + o,
        n = r + 1,
        a = r + ne + 1,
        c = a + 1;
      $e.push(r, n, a, n, c, a);
    }
  const rt = [];
  function Ce(t, o, r) {
    const n = e.createBuffer();
    return (rt.push(n), e.bindBuffer(t, n), e.bufferData(t, o, r), n);
  }
  const De = e.createVertexArray();
  e.bindVertexArray(De);
  const Lt = Ce(e.ARRAY_BUFFER, I, e.DYNAMIC_DRAW);
  (e.enableVertexAttribArray(0),
    e.vertexAttribPointer(0, 2, e.FLOAT, !1, 0, 0),
    Ce(e.ARRAY_BUFFER, Ae, e.STATIC_DRAW),
    e.enableVertexAttribArray(1),
    e.vertexAttribPointer(1, 2, e.FLOAT, !1, 0, 0),
    Ce(e.ELEMENT_ARRAY_BUFFER, new Uint16Array($e), e.STATIC_DRAW));
  const ke = e.createVertexArray();
  (e.bindVertexArray(ke),
    Ce(e.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), e.STATIC_DRAW),
    e.enableVertexAttribArray(0),
    e.vertexAttribPointer(0, 2, e.FLOAT, !1, 0, 0),
    e.bindVertexArray(null));
  const ze = new Set();
  function Se(t, o, r = !1) {
    const n = e.createTexture();
    return (
      ze.add(n),
      e.activeTexture(e.TEXTURE15),
      e.bindTexture(e.TEXTURE_2D, n),
      e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL, o),
      e.texImage2D(e.TEXTURE_2D, 0, e.RGBA, e.RGBA, e.UNSIGNED_BYTE, t),
      e.texParameteri(e.TEXTURE_2D, e.TEXTURE_MIN_FILTER, r ? e.LINEAR_MIPMAP_LINEAR : e.LINEAR),
      e.texParameteri(e.TEXTURE_2D, e.TEXTURE_WRAP_S, e.CLAMP_TO_EDGE),
      e.texParameteri(e.TEXTURE_2D, e.TEXTURE_WRAP_T, e.CLAMP_TO_EDGE),
      r && e.generateMipmap(e.TEXTURE_2D),
      n
    );
  }
  let cueActive = false;
  const bakedCase = external;
  const frameRoot = external ? "/experience/models/references-chrome-baked/" : Tt;
  const Ge = new Map(),
    W = new Map(),
    Xe = new Set();
  async function nt(t) {
    const o = (r) =>
      fetch(`${r === "case" ? frameRoot : Tt}frames/${r === "coverage" ? "case" : r}-${t}.webp`, {
        signal: s,
      }).then((n) => {
        if (!n.ok) throw new Error(`Scout frame ${n.status}: ${r}-${t}`);
        return n.blob();
      });
    const pair = await Promise.all([o("case"), o("glass"), Promise.resolve(null)]);
    if (!F && !s.aborted) Ge.set(t, pair);
  }
  async function at(t) {
    Xe.add(t);
    let decoded = [];
    try {
      const [caseBlob, glassBlob, coverageBlob] = Ge.get(t);
      decoded = await Promise.allSettled([
        createImageBitmap(caseBlob, { premultiplyAlpha: "premultiply" }),
        createImageBitmap(glassBlob, { premultiplyAlpha: "none" }),
        coverageBlob
          ? createImageBitmap(coverageBlob, { premultiplyAlpha: "none" })
          : Promise.resolve(null),
      ]);
      const failed = decoded.find((item) => item.status === "rejected");
      if (failed) throw failed.reason;
      const [body, glass, coverage] = decoded.map((item) => item.value);
      if (!F && !s.aborted)
        W.set(t, [
          Se(body, false, true),
          Se(glass, false, true),
          coverage ? Se(coverage, false, true) : null,
        ]);
      if (W.size > (T ? kt : 6)) {
        const [key, textures] = W.entries().next().value;
        W.delete(key);
        for (const texture of textures)
          if (texture) {
            e.deleteTexture(texture);
            ze.delete(texture);
          }
      }
    } finally {
      Xe.delete(t);
      for (const item of decoded) if (item.status === "fulfilled") item.value?.close();
    }
  }
  function Ft(t) {
    !D && !F && !W.has(t) && Ge.has(t) && !Xe.has(t) && at(t).then(H).catch(fail);
  }
  function st(t) {
    const o = W.get(t);
    return (W.delete(t), W.set(t, o), o);
  }
  let Re, Ye;
  try {
    [Re, Ye] = await Promise.all([Pt, so(), nt(i)]);
  } catch (error) {
    e.getExtension("WEBGL_lose_context")?.loseContext();
    u.remove();
    throw error;
  }
  s.throwIfAborted();
  We.css = Re.cssWidth;
  await at(i);
  s.throwIfAborted();
  const _t = Se(Re, !1, !0),
    X = Qt,
    it = new Float32Array([X[0], X[3], X[6], X[1], X[4], X[7], X[2], X[5], X[8]]),
    It = io(Re),
    Ut = Se(Ye, !0, !0);
  let ut = 0,
    ae = V,
    se = $,
    ie = ae,
    ue = se,
    de = 0,
    pe = 0,
    U = 1,
    k = 1,
    Me = 1,
    lt = 60,
    l = { x: 0, y: 0, s: 1 },
    ft = 0,
    Pe = 1,
    mt = 0,
    ht = 1,
    dt = 0,
    Z = 0,
    xe = 0,
    Y = 0,
    qe = 1 / 0;
  const previewTimeline = createPreviewTimeline();
  let entryScroll = 0,
    caseAlpha = 1,
    entryPlate;
  let powerNotified = false;
  function ve(t, o) {
    const r = `${t}-${o}`;
    if ((Ft(r), W.has(r))) return r;
    let n = W.keys().next().value,
      a = 1 / 0;
    for (const c of W.keys()) {
      const [m, d] = c.split("-").map(Number),
        E = (m - t) ** 2 + (d - o) ** 2;
      E < a && ((a = E), (n = c));
    }
    return n;
  }
  function pt() {
    const t = Math.min(Math.max(se, 0), Ne - 1),
      o = Math.min(Math.max(ae, 0), Je - 1),
      r = Math.min(Math.floor(t), Ne - 2),
      n = Math.min(Math.floor(o), Je - 2),
      a = t - r,
      c = o - n,
      m = [ve(n, r), ve(n, r + 1), ve(n + 1, r), ve(n + 1, r + 1)],
      d = [(1 - a) * (1 - c), a * (1 - c), (1 - a) * c, a * c];
    let E = 0,
      P = 0;
    return (
      m.forEach((L, z) => {
        const [ee, _] = L.split("-").map(Number);
        ((E += _ * d[z]), (P += ee * d[z]));
      }),
      { ids: m, weights: d, ex: E, ey: P }
    );
  }
  function Bt(t, o) {
    const r = Xt + (t - $) * Yt,
      n = jt - (Ht + (o - V) * qt),
      a = Math.cos(r),
      c = Math.sin(r),
      m = Math.cos(n),
      d = Math.sin(n),
      E = -m * Ct,
      P = Qe + d * Ct;
    return (L, z, ee) => {
      const _ = a * L - c * z,
        we = c * L + a * z - E,
        te = ee - P,
        y = we * m - te * d,
        le = we * d + te * m;
      return [
        (0.5 + (0.5 * _) / (y * St) - Be.left) / Be.size,
        (0.5 - (0.5 * le) / (y * St) - Be.top) / Be.size,
      ];
    };
  }
  function ge(t, o) {
    const r = Bt(t, o);
    for (let n = 0; n < he; n++) I.set(r(Te[n * 3], Te[n * 3 + 1], Te[n * 3 + 2]), n * 2);
    return r;
  }
  function ce() {
    let t = 1 / 0,
      o = 1 / 0,
      r = -1 / 0,
      n = -1 / 0;
    for (let a = 0; a < I.length; a += 2)
      ((t = Math.min(t, I[a])),
        (r = Math.max(r, I[a])),
        (o = Math.min(o, I[a + 1])),
        (n = Math.max(n, I[a + 1])));
    return { x0: t, y0: o, x1: r, y1: n };
  }
  function Ot() {
    const { x0: t, y0: o, x1: r, y1: n } = ce();
    return { x: t, y: o, w: r - t, h: n - o };
  }
  function xt(t) {
    const o = (t.x1 - t.x0) / (t.y1 - t.y0),
      r = U / k;
    return r > o ? { w: 0.8, h: (0.8 * o) / r } : { w: (0.8 * r) / o, h: 0.8 };
  }
  function Vt(t) {
    if (!t) return;
    const o = Ot();
    for (let r = 0; r < he; r++) {
      const n = o.x + Ae[r * 2] * o.w,
        a = o.y + (1 - Ae[r * 2 + 1]) * o.h;
      ((I[r * 2] += (n - I[r * 2]) * t), (I[r * 2 + 1] += (a - I[r * 2 + 1]) * t));
    }
  }
  function Wt() {
    return applyComputerLayout(p, U, k);
  }
  const vt = new ResizeObserver(gt);
  vt.observe(x);
  function gt() {
    if (D) return;
    if (F || !active || !x.clientWidth || !x.clientHeight) return;
    (((U = x.clientWidth), (k = x.clientHeight)),
      (Me = Math.min(devicePixelRatio, 2)),
      (u.width = Math.round(U * Me)),
      (u.height = Math.round(k * Me)),
      D || (l = Wt()),
      ge($, V));
    const { y0: t, y1: o } = ce();
    ((lt = Math.round(Math.min(Math.max(((o - t) * l.s * Me) / 4, 40), 320))), H());
    queueSnapshot();
  }
  function H() {
    !R &&
      !F &&
      active &&
      visible &&
      !document.hidden &&
      x.clientWidth > 0 &&
      x.clientHeight > 0 &&
      (R = requestAnimationFrame(je));
  }
  function ye(t, o, r) {
    (e.activeTexture(e.TEXTURE0 + t), e.bindTexture(e.TEXTURE_2D, o), e.uniform1i(r, t));
  }
  function je(t, force = false) {
    R = 0;
    if (F || (!active && !force && !D) || !visible || !x.clientWidth || !x.clientHeight) return;
    if (
      ((R = 0),
      !force && !D && t - Y > 800 && Math.abs(xe - Z) < 0.01 && t - qe > 900 && t - me < 30)
    ) {
      R = requestAnimationFrame(je);
      return;
    }
    const r = Math.min((t - me) / 1e3 || 0.016, 0.05);
    me = t;
    const n = g.matches;
    previewTimeline.setRunning(active && visible && !document.hidden && !D && !n && !cueActive, t);
    if (!D && allowsComputerCameraMotion(T, n) && !q && Le && t - Y > 2500) {
      const f = t / 1e3;
      ((ue = $ + Math.sin(f * 0.42) * $ * 0.55), (ie = V + Math.sin(f * 0.29) * V * 0.6));
    }
    if (!D && n) ((se = ue), (ae = ie), (de = pe = 0));
    else if (!D) {
      const A = 2 * Math.sqrt(60);
      ((de += (60 * (ue - se) - A * de) * r),
        (se += de * r),
        (pe += (60 * (ie - ae) - A * pe) * r),
        (ae += pe * r));
    }
    Z += (xe - Z) * (1 - Math.exp(-r * 24));
    const a = n ? 1 : Math.min(Math.max((t - qe) / 700, 0), 1);
    if (a > 0 && !powerNotified) {
      powerNotified = true;
      p.dispatchEvent(new Event("computer-screen-on"));
    }
    const { ids: c, weights: m, ex: d, ey: E } = pt(),
      P = ge(d, E),
      L = ce();
    Vt(ft);
    const z = xt(L),
      previewHeight = previewSampleHeight(Re, external, k),
      fittedHeight = (((L.y1 - L.y0) / (L.x1 - L.x0)) * Re.naturalWidth) / Re.naturalHeight,
      _ = external && D ? previewHeight + (fittedHeight - previewHeight) * ft : previewHeight,
      te = D ? entryScroll : previewScroll(previewTimeline.elapsed(t), Math.max(0, 1 - _), n),
      y = c.map(st),
      { program: le, uniforms: v } = tt,
      { program: N, uniforms: C } = ot;
    p.dataset.previewScroll = te.toFixed(6);
    (e.viewport(0, 0, u.width, u.height),
      e.clearColor(0, 0, 0, 0),
      e.clear(e.COLOR_BUFFER_BIT),
      e.enable(e.BLEND),
      e.blendFunc(e.ONE, e.ONE_MINUS_SRC_ALPHA));
    function B(f, A, G, S, w) {
      (e.useProgram(le),
        e.uniform3f(v.uRect, f.x, f.y, f.s),
        e.uniform2f(v.uView, U, k),
        e.uniform4fv(v.uW, G),
        e.uniform1f(v.uScroll, te),
        e.uniform4f(v.uPage, z.w, z.h, U / We.css, _),
        e.uniform1f(v.uLines, lt),
        e.uniform1f(v.uCrt, Pe),
        e.uniform1f(v.uReflect, 0.16 * Pe),
        e.uniform1f(v.uHover, cueActive ? 0 : Z),
        e.uniform1f(v.uPower, a),
        e.uniform1f(v.uFlash, mt),
        e.uniform1f(v.uAlpha, w),
        e.uniformMatrix3fv(v.uColour, !1, it),
        e.uniform4f(
          v.uTube,
          (S.x0 + S.x1) / 2,
          (S.y0 + S.y1) / 2,
          (S.x1 - S.x0) / 2,
          (S.y1 - S.y0) / 2,
        ),
        e.uniform1f(v.uApertureCover, 0),
        e.uniform1i(v.uExternal, external ? 1 : 0),
        ye(0, _t, v.uSite),
        ye(5, Ut, v.uCue),
        e.uniform3f(
          v.uCueBox,
          cueActive ? 0.9 : (0.38 * Ye.width) / Ye.height / 1.28,
          cueActive ? 0.83 : 0.38,
          ut,
        ),
        A.forEach(([M, O, coverage], j) => {
          (ye(1 + j, O, v[`uG${j}`]), ye(6 + j, coverage || M, v[`uK${j}`]));
        }),
        e.bindVertexArray(De),
        e.bindBuffer(e.ARRAY_BUFFER, Lt),
        e.bufferSubData(e.ARRAY_BUFFER, 0, I),
        e.drawElements(e.TRIANGLES, $e.length, e.UNSIGNED_SHORT, 0));
    }
    function oe(f, A, G, b, w) {
      (e.useProgram(N),
        e.uniform3f(C.uRect, f.x, f.y, f.s),
        e.uniform2f(C.uView, U, k),
        e.uniform4fv(C.uW, G),
        e.uniformMatrix3fv(C.uColour, !1, it),
        e.uniform1f(C.uDark, Ve ? 1 : 0),
        e.uniform1f(C.uWall, dt),
        e.uniform1f(C.uFade, b));
      const [M, O] = P(fe[0], fe[1], fe[2]),
        [j] = P(fe[0] + Jt, fe[1], fe[2]);
      e.uniform1i(C.uMaterial, bakedCase ? 3 : 0);
      e.uniform4f(C.uLed, M, O, Math.abs(j - M), w ? K(0.35, 0.8, a) * (0.6 + 0.4 * Z) : 0);
      const [_e, re] = P(0, -0.3, Ee),
        [Ie] = P(0.17, -0.3, Ee),
        [, Ue] = P(0, -0.38, Ee);
      (e.uniform4f(C.uSpill, _e, re, Math.abs(Ie - _e), Math.abs(Ue - re)),
        e.uniform4f(C.uSpillColour, ...It, w ? (Ve ? 0.06 : 0.07) * a * (1 + 0.4 * Z) * Pe : 0),
        A.forEach(([$t], At) => ye(At, $t, C[`uC${At}`])),
        e.bindVertexArray(ke),
        e.drawArrays(e.TRIANGLE_STRIP, 0, 4),
        e.bindVertexArray(null));
    }
    if (ht > 0) B(l, y, m, L, ht);
    if (caseAlpha > 0) oe(l, y, m, caseAlpha, true);
    hasPainted = true;
    if (visible) {
      p.dataset.ready = "true";
      p.dataset.renderMode = "webgl";
    }
    if (!D && visible) {
      const { x0: f, y0: A, x1: G, y1: S } = ce(),
        b = 0.08,
        w = (G - f) * l.s,
        M = (S - A) * l.s;
      Object.assign(h.style, {
        left: `${l.x + f * l.s + w * b}px`,
        top: `${l.y + A * l.s + M * b}px`,
        width: `${w * (1 - b * 2)}px`,
        height: `${M * (1 - b * 2)}px`,
      });
      const O =
        Math.abs(ue - se) + Math.abs(ie - ae) + Math.abs(de) + Math.abs(pe) + Math.abs(xe - Z) >
        0.001;
      (!n || O) && H();
    }
  }
  function bt() {
    if (!F) {
      F = !0;
      previewTimeline.setRunning(false, performance.now());
      entryPlate?.remove();
      clearTimeout(prefetchTimer);
      clearTimeout(snapshotTimer);
      Ge.clear();
      Xe.clear();
      W.clear();
      if (prefetchQueue) prefetchQueue.length = 0;
      themeObserver.disconnect();
      (cancelAnimationFrame(R),
        vt.disconnect(),
        ze.forEach((t) => e.deleteTexture(t)),
        rt.forEach((t) => e.deleteBuffer(t)),
        e.deleteVertexArray(De),
        e.deleteVertexArray(ke),
        e.deleteProgram(tt.program),
        e.deleteProgram(ot.program),
        e.getExtension("WEBGL_lose_context")?.loseContext(),
        u.remove());
    }
  }
  s.removeEventListener("abort", earlyCleanup);
  s.addEventListener("abort", bt, { once: !0 });
  let Le = false,
    prefetching = false,
    prefetchQueue;
  function be() {
    if (
      !allowsComputerCameraMotion(T, g.matches) ||
      prefetching ||
      !active ||
      !visible ||
      F ||
      D ||
      s.aborted
    )
      return;
    Le = true;
    prefetching = true;
    const t = prefetchQueue || [];
    if (!prefetchQueue) {
      for (let r = 0; r < Je; r++)
        for (let n = 0; n < Ne; n++) `${r}-${n}` !== i && t.push(`${r}-${n}`);
      t.sort((r, n) => {
        const [a, c] = r.split("-").map(Number),
          [m, d] = n.split("-").map(Number);
        return (a - V) ** 2 + (c - $) ** 2 - (m - V) ** 2 - (d - $) ** 2;
      });
      prefetchQueue = t;
    }
    const o = async () => {
      while (t.length && active && visible && !F && !D && !s.aborted) {
        const id = t.shift();
        await nt(id).catch(fail);
      }
    };
    void Promise.all([o(), o(), o()]).finally(() => {
      prefetching = false;
    });
  }
  function Fe() {
    if (!active) return;
    ((ue = $), (ie = V), H());
  }
  function Ke(t, o) {
    if (!active || !visible || F || !x.clientWidth || !x.clientHeight) return;
    Y = performance.now();
    ue = $ + Math.tanh(t) * $;
    ie = V - Math.tanh(o) * V;
    H();
  }
  let q = null;
  (document.addEventListener(
    "pointerdown",
    (t) => {
      !allowsComputerCameraMotion(T, g.matches) ||
        !active ||
        !visible ||
        F ||
        D ||
        g.matches ||
        t.pointerType === "mouse" ||
        ((q = { x: t.clientX, y: t.clientY }), (Y = performance.now()));
    },
    { signal: s },
  ),
    document.addEventListener(
      "pointermove",
      (t) => {
        if (
          allowsComputerCameraMotion(T, g.matches) &&
          active &&
          visible &&
          !F &&
          x.clientWidth > 0 &&
          x.clientHeight > 0 &&
          !(D || g.matches)
        ) {
          if (q) {
            const o = Math.min(U, k) * 0.3;
            if (Math.hypot(t.clientX - q.x, t.clientY - q.y) > 10) be();
            Ke((t.clientX - q.x) / o, (t.clientY - q.y) / o);
          } else if (t.pointerType === "mouse") {
            const o = x.getBoundingClientRect(),
              r = ((t.clientX - o.left) * U) / o.width - l.x - l.s / 2,
              n = ((t.clientY - o.top) * k) / o.height - l.y - l.s / 2;
            (Ke(r / (U * 0.4), n / (k * 0.4)), be());
          }
        }
      },
      { signal: s },
    ));
  for (const t of ["pointerup", "pointercancel"])
    document.addEventListener(
      t,
      () => {
        q && ((q = null), (Y = performance.now()), D || Fe());
      },
      { signal: s },
    );
  document.documentElement.addEventListener(
    "pointerleave",
    () => {
      !active || D || ((Y = performance.now()), Fe());
    },
    { signal: s },
  );
  // Mobile swipes drive the chosen spring feedback only. Device motion and
  // camera drag must not compete with that gesture or resize the apparent case.
  const captureKey = () =>
    `${innerWidth}:${innerHeight}:${document.documentElement.classList.contains("dark")}`;
  let snapshotKey = `${Re.viewportWidth}:${Re.viewportHeight}:${Re.themeDark}`,
    snapshotTimer,
    snapshotPending = false;
  function queueSnapshot() {
    clearTimeout(snapshotTimer);
    if (active && !external && !F && !D && captureKey() !== snapshotKey)
      snapshotTimer = setTimeout(() => {
        void refreshPortfolio().catch(() => {});
      }, 300);
  }
  const themeObserver = new MutationObserver(() => {
    const dark = document.documentElement.classList.contains("dark");
    if (dark !== Ve) {
      Ve = dark;
      if (visible && !F && !D) je(performance.now(), true);
      H();
    }
    queueSnapshot();
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  async function refreshPortfolio() {
    if (!active || external || F || D || snapshotPending) return;
    const nextKey = captureKey();
    if (nextKey === snapshotKey) return;
    snapshotPending = true;
    let current;
    try {
      current = await captureScreenSource({
        kind,
        signal: s,
        maxTextureSize: Math.min(4096, e.getParameter(e.MAX_TEXTURE_SIZE)),
      });
    } finally {
      snapshotPending = false;
    }
    if (!active || F || D || nextKey !== captureKey()) {
      if (!F && !D) queueSnapshot();
      return;
    }
    snapshotKey = nextKey;
    Re = current;
    We.css = current.cssWidth;
    e.activeTexture(e.TEXTURE15);
    e.bindTexture(e.TEXTURE_2D, _t);
    e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    e.texImage2D(e.TEXTURE_2D, 0, e.RGBA, e.RGBA, e.UNSIGNED_BYTE, Re);
    e.generateMipmap(e.TEXTURE_2D);
    H();
  }
  return (
    h.addEventListener("pointerenter", wt, { signal: s }),
    h.addEventListener("focus", wt, { signal: s }),
    h.addEventListener("pointerleave", Et, { signal: s }),
    h.addEventListener("blur", Et, { signal: s }),
    document.addEventListener(
      "visibilitychange",
      () => {
        if (!D) {
          previewTimeline.setRunning(false, performance.now());
          document.hidden ? (cancelAnimationFrame(R), (R = 0)) : H();
        }
      },
      { signal: s },
    ),
    g.addEventListener("change", Fe, { signal: s }),
    T &&
      (prefetchTimer = setTimeout(() => {
        F || be();
      }, 2e3)),
    (qe = performance.now() + (options.initiallyVisible === false ? -700 : 200)),
    gt(),
    {
      canvas: u,
      dispose: bt,
      setActive(value) {
        if (F || D || active === !!value) return;
        // An immediate pause after mount still needs one retained visible frame.
        if (!value && !hasPainted && visible) je(performance.now(), true);
        active = !!value;
        previewTimeline.setRunning(false, performance.now());
        cancelAnimationFrame(R);
        R = 0;
        if (active) {
          me = performance.now();
          Y = me;
          if (x.clientWidth !== U || x.clientHeight !== k) gt();
          je(me, true);
          H();
          queueSnapshot();
          if (Le) be();
          else if (T) prefetchTimer = setTimeout(be, 2000);
        } else {
          q = null;
          clearTimeout(prefetchTimer);
          clearTimeout(snapshotTimer);
        }
      },
      setVisible(value) {
        if (F || D) return;
        visible = !!value;
        previewTimeline.setRunning(false, performance.now());
        u.style.visibility = visible ? "visible" : "hidden";
        if (visible) {
          gt();
          cancelAnimationFrame(R);
          R = 0;
          je(performance.now(), true);
          H();
          if (Le) be();
        } else {
          cancelAnimationFrame(R);
          R = 0;
          q = null;
        }
      },
      setInput({
        history = [],
        matched = 0,
        total = 10,
        unlocked = false,
        move = "",
        preview = false,
      } = {}) {
        if (F || D) return;
        const generation = ++inputGeneration;
        cueActive = history.length > 0 && !preview;
        if (preview) {
          Ye.width = 2;
          Ye.height = 2;
          Ye.getContext("2d").clearRect(0, 0, 2, 2);
          e.activeTexture(e.TEXTURE15);
          e.bindTexture(e.TEXTURE_2D, Ut);
          e.texImage2D(e.TEXTURE_2D, 0, e.RGBA, e.RGBA, e.UNSIGNED_BYTE, Ye);
          e.generateMipmap(e.TEXTURE_2D);
          H();
          return;
        }
        if (!cueActive) {
          // Restore the original click cue without remounting the computer.
          so()
            .then((original) => {
              if (F || D || cueActive || generation !== inputGeneration) return;
              Ye.width = original.width;
              Ye.height = original.height;
              Ye.getContext("2d").drawImage(original, 0, 0);
              uploadCue();
            })
            .catch(fail);
          return;
        }
        Ye.width = 900;
        Ye.height = 700;
        const ctx = Ye.getContext("2d");
        const bg = "#e6eee1",
          ink = "#1b3324";
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, 900, 700);
        ctx.fillStyle = ink;
        ctx.textAlign = "center";
        ctx.font = "bold 45px monospace";
        ctx.fillText(
          unlocked ? "SECRET UNLOCKED" : (move || "INPUT DETECTED").toUpperCase().slice(0, 25),
          450,
          76,
        );
        ctx.font = "bold 150px monospace";
        ctx.fillText(history[history.length - 1], 450, 253);
        const shown = history.slice(-10),
          width = 124,
          gap = 20;
        for (let n = 0; n < shown.length; n++) {
          const row = Math.floor(n / 5),
            count = Math.min(5, shown.length - row * 5);
          const left = (900 - count * (width + gap) + gap) / 2 + (n % 5) * (width + gap),
            top = 305 + row * 130;
          const isMatch = n >= shown.length - matched;
          ctx.fillStyle = isMatch ? "#315d3a" : "#cfc8b7";
          ctx.fillRect(left, top, width, 108);
          ctx.fillStyle = isMatch ? "#f7f9f2" : ink;
          ctx.font = "bold 76px monospace";
          ctx.fillText(shown[n], left + width / 2, top + 80);
        }
        ctx.fillStyle = ink;
        ctx.font = "bold 39px monospace";
        ctx.fillText(
          unlocked
            ? "PICK YOUR WORLD"
            : `${matched} / ${total}  ${matched ? "COMBO" : "KEEP GOING"}`,
          450,
          641,
        );
        uploadCue();
        function uploadCue() {
          e.activeTexture(e.TEXTURE15);
          e.bindTexture(e.TEXTURE_2D, Ut);
          e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
          e.texImage2D(e.TEXTURE_2D, 0, e.RGBA, e.RGBA, e.UNSIGNED_BYTE, Ye);
          e.generateMipmap(e.TEXTURE_2D);
          be();
          H();
        }
      },
      async enter(t) {
        s.throwIfAborted();
        if (F || D) throw new Error("Computer entry unavailable");
        const useFade =
          (!external &&
            !isPortfolioSnapshotCompatible(Re, {
              width: innerWidth,
              height: innerHeight,
              themeDark: document.documentElement.classList.contains("dark"),
            })) ||
          hasComplexEntryTransform(u);
        const now = performance.now();
        const scrollStart = previewScroll(
          previewTimeline.elapsed(now),
          Math.max(0, 1 - previewSampleHeight(Re, external, k)),
          g.matches,
        );
        previewTimeline.setRunning(false, now);
        qe = Math.min(qe, now - 700);
        D = true;
        clearTimeout(snapshotTimer);
        h.style.pointerEvents = "none";
        cancelAnimationFrame(R);
        R = 0;
        if (useFade) {
          if (external) entryPlate = await fadeCanvasToPreview(u, Re, s);
          else await fadeToPortfolio(p, t, s);
          return;
        }
        const { ex, ey } = pt();
        ge(ex, ey);
        const bounds = ce();
        const promoted = promoteEntryCanvas(u, l, U, k);
        const from = promoted.from;
        U = promoted.width;
        k = promoted.height;
        u.width = Math.round(U * Me);
        u.height = Math.round(k * Me);
        l = { ...from };
        const to = external ? entryFittedTarget(bounds, U) : entryPortfolioTarget(bounds, U, k);
        je(performance.now()); // Resizing clears WebGL: paint frame zero immediately.
        if (!external) window.scrollTo({ top: 0, behavior: "instant" });
        // The real DOM stays still and hidden until the texture reaches its exact
        // landing bounds. There is no mid-zoom double exposure or moving clip.
        await runEntryTransition({
          duration: g.matches ? 0 : Gt,
          signal: s,
          frame(progress) {
            const eased = co(progress);
            l = {
              x: from.x + (to.x - from.x) * eased,
              y: from.y + (to.y - from.y) * eased,
              s: from.s + (to.s - from.s) * eased,
            };
            entryScroll = scrollStart * (1 - K(0, 0.38, progress));
            ft = K(0.05, 0.55, progress);
            Pe = 1 - K(0, 0.4, progress);
            caseAlpha = 1 - K(0.2, 0.65, progress);
            ut = K(0, 0.15, progress);
            dt = 0;
            mt = 0;
            ht = 1;
            je(performance.now());
          },
        });
        if (external) entryPlate = await fadeCanvasToPreview(u, Re, s);
      },
    }
  );
}
export async function mountComputer(element, parentSignal, options = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort(parentSignal?.reason);
  parentSignal?.addEventListener("abort", abort, { once: true });
  if (parentSignal?.aborted) controller.abort();
  let scene;
  try {
    controller.signal.throwIfAborted();
    scene = await lo(element, controller.signal, options);
    controller.signal.throwIfAborted();
  } catch (error) {
    controller.abort();
    parentSignal?.removeEventListener("abort", abort);
    if (error.message === "WebGL2 unavailable" && !parentSignal?.aborted) {
      const { mountCanvasComputer } = await import("./konami-canvas-scene.js?v=ship-4");
      return mountCanvasComputer(element, parentSignal, options);
    }
    throw error;
  }
  const dispose = scene.dispose;
  scene.dispose = () => {
    dispose();
    controller.abort();
    parentSignal?.removeEventListener("abort", abort);
  };
  return scene;
}
