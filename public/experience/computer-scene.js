import { capturePortfolio } from "./computer-snapshot.js?v=3";
import {
  previewScroll,
  runEntryTransition,
  fadeToPortfolio,
  ZOOM_MS,
} from "./computer-transition.js?v=1";
const Tt = "/experience/models/ivory-classic/";
const Dt = [
    { below: 640, suffix: "-mobile", css: 390 },
    { below: 1440, suffix: "", css: 1280 },
    { below: 1 / 0, suffix: "-wide", css: 1600 },
  ],
  kt = 12,
  zt = 32,
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
function eo(p, s) {
  return [0, 1, 2].flatMap((x) =>
    [0, 1, 2].map(
      (h) =>
        p[x * 3] * s[h] + p[x * 3 + 1] * s[3 + h] + p[x * 3 + 2] * s[6 + h],
    ),
  );
}
function to(p) {
  let s = Qt;
  for (const [, x, h] of p.matchAll(/([a-z-]+)\(([^)]*)\)/g)) {
    const g = parseFloat(h);
    let T;
    if (x === "hue-rotate") {
      const u = ((g * Math.PI) / 180) * (h.includes("rad") ? 180 / Math.PI : 1),
        e = Math.cos(u),
        i = Math.sin(u);
      T = [
        0.213 + e * 0.787 - i * 0.213,
        0.715 - e * 0.715 - i * 0.715,
        0.072 - e * 0.072 + i * 0.928,
        0.213 - e * 0.213 + i * 0.143,
        0.715 + e * 0.285 + i * 0.14,
        0.072 - e * 0.072 - i * 0.283,
        0.213 - e * 0.213 - i * 0.787,
        0.715 - e * 0.715 + i * 0.715,
        0.072 + e * 0.928 + i * 0.072,
      ];
    } else if (x === "saturate") {
      const u = g;
      T = [
        0.213 + 0.787 * u,
        0.715 - 0.715 * u,
        0.072 - 0.072 * u,
        0.213 - 0.213 * u,
        0.715 + 0.285 * u,
        0.072 - 0.072 * u,
        0.213 - 0.213 * u,
        0.715 - 0.715 * u,
        0.072 + 0.928 * u,
      ];
    } else x === "brightness" && (T = [g, 0, 0, 0, g, 0, 0, 0, g]);
    T && (s = eo(T, s));
  }
  return s;
}
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
uniform sampler2D uSite, uG0, uG1, uG2, uG3, uCue, uK0, uK1, uK2, uK3;
uniform vec3 uCueBox; // width, height (screen UV), burst 0..1
uniform vec4 uW;
uniform vec4 uPage; // page box in tube UV (w, h), then window/snapshot size ratios (x, y)
uniform float uScroll, uLines, uCrt, uReflect, uHover, uPower, uFlash, uAlpha;
uniform mat3 uColour; // same grade as the case: the glass reflects the graded shell
uniform vec4 uTube;   // the tube's footprint (centre, half size) in frame units
// Exploded view (the snippet): 0 draws everything, 1 the picture, 2 the click button, 3 the glass.
// Alone, a layer would show the tube's edge the case normally hides; uReveal lifts that cover.
uniform int uLayer; uniform float uReveal;
out vec4 outColor;
// Tube UV to snapshot UV: the visitor's window, centred in the tube at 1:1 CSS scale. Outside it
// the snapshot extends (page background at the sides, more page below), like the live page.
vec2 st(vec2 uv) {
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
  vec4 button = cue;
  if (uLayer != 1) col = col * (1. - cue.a) + cue.rgb;
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
    + texture(uK2, vFrame).a * uW.z + texture(uK3, vFrame).a * uW.w) * (1. - uReveal);
  float keep = uAlpha * footprint * (uLayer == 0 ? 1. : 1. - cover);
  vec3 glare = reflection * uReflect;
  if (uLayer == 1) outColor = vec4(col * inside, 1.) * keep;
  else if (uLayer == 2) outColor = button * keep;
  else if (uLayer == 3) outColor = vec4(glare, max(glare.r, max(glare.g, glare.b))) * keep;
  else outColor = vec4(rgb, 1.) * keep;
}`,
  no = `#version 300 es
precision highp float;
in vec2 vFrame; in vec2 vUV;
uniform sampler2D uC0, uC1, uC2, uC3;
uniform vec4 uW; uniform float uDark, uWall, uFade;
uniform int uLayer; // exploded view: 0 everything, 1 the case body, 2 the floor (shadow, bounce, light)
uniform mat3 uColour; // the poster's CSS filter as a colour matrix
uniform vec4 uLed;   // frame x, y, radius, level
uniform vec4 uSpill; // frame x, y, radius x, radius y
uniform vec4 uSpillColour; // rgb, level
out vec4 outColor;
void main() {
  // The cast shadow runs past the render crop; feather it out instead of a hard square edge.
  vec2 edge = min(vFrame, 1. - vFrame);
  float feather = smoothstep(0., .12, min(edge.x, edge.y));
  vec4 frame = texture(uC0, vFrame) * uW.x + texture(uC1, vFrame) * uW.y
    + texture(uC2, vFrame) * uW.z + texture(uC3, vFrame) * uW.w;
  // The floor is whatever the render left semi-transparent: the cast shadow and the warm light
  // the computer bounces onto it. The computer itself is solid.
  float floorPart = 1. - smoothstep(.5, .7, frame.a);
  if (frame.a > .002) {
    vec3 raw = clamp(frame.rgb / frame.a, 0., 1.);
    float plastic = smoothstep(.03, .18, raw.r - raw.b) * smoothstep(.005, .1, raw.g - raw.b) * smoothstep(-.12, .1, raw.r - raw.g);
    float luminance = dot(raw, vec3(.2126, .7152, .0722));
    float chroma = max(raw.r, max(raw.g, raw.b)) - min(raw.r, min(raw.g, raw.b));
    vec3 green = clamp(vec3(luminance) + chroma * vec3(-.7, .2, .08), 0., 1.);
    vec3 straight = mix(raw, green, plastic);
    // On a dark page a black studio shadow reads as a muddy hole, so it is lightened there.
    float shadow = (1. - smoothstep(.0, .04, max(straight.r, max(straight.g, straight.b)))) * (1. - step(.995, frame.a));
    frame = vec4(straight, 1.) * frame.a * (1. - shadow * .45 * uDark);
    // On entry the tube's black graphite inner wall clears away, so the page runs straight up
    // to the plastic instead of being framed in black as the case flies past.
    float graphite = 1. - smoothstep(.22, .5, max(straight.r, max(straight.g, straight.b)));
    frame *= 1. - uWall * graphite;
  }
  if (uLayer == 1) frame *= 1. - floorPart;
  if (uLayer == 2) frame *= floorPart;
  // Power LED: the white button warms up and throws a soft halo.
  float ledLevel = uLayer == 2 ? 0. : uLed.w;
  float led = length(vFrame - uLed.xy) / uLed.z;
  frame.rgb = mix(frame.rgb, vec3(1., .97, .9) * frame.a, smoothstep(1.1, .5, led) * .55 * ledLevel);
  float halo = exp(-led * led * .18) * mix(.35, .12, uDark) * ledLevel;
  frame += vec4(vec3(1., .95, .85), 1.) * halo * (1. - frame.a);
  // Screen light spilling onto the floor in front, tinted by the page on the tube.
  vec2 s = (vFrame - uSpill.xy) / uSpill.zw;
  float spill = exp(-dot(s, s) * 2.) * (uLayer == 1 ? 0. : uSpillColour.a);
  frame += vec4(uSpillColour.rgb, 1.) * spill * (1. - frame.a);
  outColor = frame * feather * uFade;
}`;
function ao(p) {
  const s = new Image();
  return ((s.decoding = "async"), (s.src = p), s.decode().then(() => s));
}
async function so() {
  const p = `Chicago, Charcoal, Geneva, ${getComputedStyle(document.body).fontFamily}`;
  await Promise.race([
    document.fonts.load(`700 19px ${p}`),
    new Promise((R) => setTimeout(R, 300)),
  ]);
  const s = matchMedia("(hover: none) and (pointer: coarse)").matches
      ? "Tap"
      : "Click",
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
  x.drawImage(
    p,
    0,
    0,
    p.naturalWidth,
    Math.min(p.naturalHeight, 1e3),
    0,
    0,
    1,
    1,
  );
  const [h, g, T] = x.getImageData(0, 0, 1, 1).data;
  return [h / 255, g / 255, T / 255];
}
function uo(p, s, x, h) {
  const g = (u, e, i) =>
      3 * u * i * (1 - i) ** 2 + 3 * e * i * i * (1 - i) + i ** 3,
    T = (u, e, i) =>
      3 * u * (1 - i) ** 2 + 6 * (e - u) * i * (1 - i) + 3 * (1 - e) * i * i;
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
async function lo(p, s) {
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
  if (!e) throw new Error("WebGL2 unavailable");
  x.append(u);
  const i = `${V}-${$}`;
  let R = 0,
    me = 0,
    F = !1,
    D = !1;
  const Ve = document.documentElement.classList.contains("dark"),
    We = { css: innerWidth },
    Pt = capturePortfolio({
      signal: s,
      maxTextureSize: Math.min(4096, e.getParameter(e.MAX_TEXTURE_SIZE)),
    });
  function et(t) {
    const o = e.createProgram();
    for (const [n, a] of [
      [e.VERTEX_SHADER, oo],
      [e.FRAGMENT_SHADER, t],
    ]) {
      const c = e.createShader(n);
      if (
        (e.shaderSource(c, a),
        e.compileShader(c),
        !e.getShaderParameter(c, e.COMPILE_STATUS))
      )
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
    Ce(
      e.ARRAY_BUFFER,
      new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]),
      e.STATIC_DRAW,
    ),
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
      e.texParameteri(
        e.TEXTURE_2D,
        e.TEXTURE_MIN_FILTER,
        r ? e.LINEAR_MIPMAP_LINEAR : e.LINEAR,
      ),
      e.texParameteri(e.TEXTURE_2D, e.TEXTURE_WRAP_S, e.CLAMP_TO_EDGE),
      e.texParameteri(e.TEXTURE_2D, e.TEXTURE_WRAP_T, e.CLAMP_TO_EDGE),
      r && e.generateMipmap(e.TEXTURE_2D),
      n
    );
  }
  const Ge = new Map(),
    W = new Map(),
    Xe = new Set();
  async function nt(t) {
    const o = (r) =>
      fetch(`${Tt}frames/${r}-${t}.webp`, { signal: s }).then((n) => n.blob());
    Ge.set(t, await Promise.all([o("case"), o("glass")]));
  }
  async function at(t) {
    Xe.add(t);
    const [o, r] = Ge.get(t),
      [n, a] = await Promise.all([
        createImageBitmap(o, { premultiplyAlpha: "premultiply" }),
        createImageBitmap(r, { premultiplyAlpha: "none" }),
      ]);
    if (
      (Xe.delete(t),
      F || W.set(t, [Se(n, !1, !0), Se(a, !1)]),
      n.close(),
      a.close(),
      W.size > (T ? kt : 6))
    ) {
      const [c, m] = W.entries().next().value;
      W.delete(c);
      for (const d of m) (e.deleteTexture(d), ze.delete(d));
    }
  }
  function Ft(t) {
    !D && !F && !W.has(t) && Ge.has(t) && !Xe.has(t) && at(t).then(H);
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
  We.css = Re.cssWidth;
  await at(i);
  const _t = Se(Re, !1, !0),
    X = Qt,
    it = new Float32Array([
      X[0],
      X[3],
      X[6],
      X[1],
      X[4],
      X[7],
      X[2],
      X[5],
      X[8],
    ]),
    It = io(Re),
    Ut = Se(Ye, !0, !0);
  let ut = 0,
    ct,
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
    He = 1,
    dt = 0,
    Z = 0,
    xe = 0,
    Y = 0,
    qe = 1 / 0,
    J = 0,
    Q = 0;
  const Nt = performance.now();
  let entryScroll = 0,
    caseAlpha = 1;
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
    for (let n = 0; n < he; n++)
      I.set(r(Te[n * 3], Te[n * 3 + 1], Te[n * 3 + 2]), n * 2);
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
      ((I[r * 2] += (n - I[r * 2]) * t),
        (I[r * 2 + 1] += (a - I[r * 2 + 1]) * t));
    }
  }
  function Wt() {
    const t = Math.min(k, U * 1.5),
      o = t * 0.3;
    return { x: U / 2 - o / 2, y: k / 2 + t * 0.01 - o / 2, s: o };
  }
  const vt = new ResizeObserver(gt);
  vt.observe(x);
  function gt() {
    if (F) return;
    (({ width: U, height: k } = x.getBoundingClientRect()),
      (Me = Math.min(devicePixelRatio, 2)),
      (u.width = Math.round(U * Me)),
      (u.height = Math.round(k * Me)),
      D || (l = Wt()),
      ge($, V));
    const { y0: t, y1: o } = ce();
    ((lt = Math.round(Math.min(Math.max(((o - t) * l.s * Me) / 4, 40), 320))),
      H());
    queueSnapshot();
  }
  function H() {
    !R && !F && !document.hidden && (R = requestAnimationFrame(je));
  }
  function ye(t, o, r) {
    (e.activeTexture(e.TEXTURE0 + t),
      e.bindTexture(e.TEXTURE_2D, o),
      e.uniform1i(r, t));
  }
  function je(t) {
    if (
      ((R = 0),
      !D &&
        t - Y > 800 &&
        Math.abs(xe - Z) < 0.01 &&
        t - qe > 900 &&
        t - me < 30)
    ) {
      R = requestAnimationFrame(je);
      return;
    }
    const r = Math.min((t - me) / 1e3 || 0.016, 0.05);
    me = t;
    const n = g.matches;
    if (!D && !n && !q && !Q && Le && t - Y > 2500) {
      const f = t / 1e3;
      ((ue = $ + Math.sin(f * 0.42) * $ * 0.55),
        (ie = V + Math.sin(f * 0.29) * V * 0.6));
    }
    if (!D && n) ((se = ue), (ae = ie), (de = pe = 0));
    else if (!D) {
      const A = 2 * Math.sqrt(60);
      ((de += (60 * (ue - se) - A * de) * r),
        (se += de * r),
        (pe += (60 * (ie - ae) - A * pe) * r),
        (ae += pe * r));
    }
    ((Z += (xe - Z) * (1 - Math.exp(-r * 24))),
      (J = n ? Q : J + (Q - J) * (1 - Math.exp(-r * 6))));
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
      ee = (Re.naturalHeight * We.css) / Re.naturalWidth,
      _ = k / ee,
      te = D ? entryScroll : previewScroll(t - Nt, Math.max(0, 1 - _), n),
      y = c.map(st),
      { program: le, uniforms: v } = tt,
      { program: N, uniforms: C } = ot;
    (e.viewport(0, 0, u.width, u.height),
      e.clearColor(0, 0, 0, 0),
      e.clear(e.COLOR_BUFFER_BIT),
      e.enable(e.BLEND),
      e.blendFunc(e.ONE, e.ONE_MINUS_SRC_ALPHA));
    function B(f, A, G, S, b, w) {
      (e.useProgram(le),
        e.uniform3f(v.uRect, f.x, f.y, f.s),
        e.uniform2f(v.uView, U, k),
        e.uniform4fv(v.uW, G),
        e.uniform1f(v.uScroll, te),
        e.uniform4f(v.uPage, z.w, z.h, U / We.css, _),
        e.uniform1f(v.uLines, lt),
        e.uniform1f(v.uCrt, Pe),
        e.uniform1f(v.uReflect, 0.16 * Pe),
        e.uniform1f(v.uHover, Z),
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
        e.uniform1i(v.uLayer, b),
        e.uniform1f(v.uReveal, J),
        ye(0, _t, v.uSite),
        ye(5, Ut, v.uCue),
        e.uniform3f(v.uCueBox, (0.38 * Ye.width) / Ye.height / 1.28, 0.38, ut),
        A.forEach(([M, O], j) => {
          (ye(1 + j, O, v[`uG${j}`]), ye(6 + j, M, v[`uK${j}`]));
        }),
        e.bindVertexArray(De),
        e.bindBuffer(e.ARRAY_BUFFER, Lt),
        e.bufferSubData(e.ARRAY_BUFFER, 0, I),
        e.drawElements(e.TRIANGLES, $e.length, e.UNSIGNED_SHORT, 0));
    }
    function oe(f, A, G, S, b, w) {
      (e.useProgram(N),
        e.uniform3f(C.uRect, f.x, f.y, f.s),
        e.uniform2f(C.uView, U, k),
        e.uniform4fv(C.uW, G),
        e.uniformMatrix3fv(C.uColour, !1, it),
        e.uniform1f(C.uDark, Ve ? 1 : 0),
        e.uniform1f(C.uWall, dt),
        e.uniform1i(C.uLayer, S),
        e.uniform1f(C.uFade, b));
      const [M, O] = P(fe[0], fe[1], fe[2]),
        [j] = P(fe[0] + Jt, fe[1], fe[2]);
      e.uniform4f(
        C.uLed,
        M,
        O,
        Math.abs(j - M),
        w ? K(0.35, 0.8, a) * (0.6 + 0.4 * Z) : 0,
      );
      const [_e, re] = P(0, -0.3, Ee),
        [Ie] = P(0.17, -0.3, Ee),
        [, Ue] = P(0, -0.38, Ee);
      (e.uniform4f(C.uSpill, _e, re, Math.abs(Ie - _e), Math.abs(Ue - re)),
        e.uniform4f(
          C.uSpillColour,
          ...It,
          w ? (Ve ? 0.06 : 0.07) * a * (1 + 0.4 * Z) * Pe : 0,
        ),
        A.forEach(([$t], At) => ye(At, $t, C[`uC${At}`])),
        e.bindVertexArray(ke),
        e.drawArrays(e.TRIANGLE_STRIP, 0, 4),
        e.bindVertexArray(null));
    }
    if (J < 0.001) {
      if (ht > 0) B(l, y, m, L, 0, ht);
      if (caseAlpha > 0) oe(l, y, m, 0, caseAlpha, !0);
    } else {
      const f = J,
        A = l.s * (1 - 0.35 * f),
        G = l.x + l.s / 2,
        S = l.y + l.s / 2,
        b = (w, M, O = 1) => ({
          x: G + w * A - (A * O) / 2,
          y: S + M * A - (A * O) / 2,
          s: A * O,
        });
      for (const [w, M] of [
        [0, -0.95],
        [Ne - 1, 0.95],
      ]) {
        const O = ve(V, w),
          [j, _e] = O.split("-").map(Number),
          re = st(O);
        ge(_e, j);
        const Ie = [re, re, re, re],
          Ue = [1, 0, 0, 0];
        (B(b(M * f, 0, 0.8), Ie, Ue, ce(), 0, f),
          oe(b(M * f, 0, 0.8), Ie, Ue, 0, f, !1));
      }
      (ge(d, E),
        oe(b(-0.12 * f, 0.32 * f), y, m, 2, 1, !0),
        oe(b(-0.06 * f, 0.16 * f), y, m, 1, 1, !0),
        B(b(0, 0), y, m, L, 1, 1),
        B(b(0.06 * f, -0.16 * f), y, m, L, 2, 1),
        B(b(0.12 * f, -0.32 * f), y, m, L, 3, 1));
    }
    if (!D) {
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
        Math.abs(ue - se) +
          Math.abs(ie - ae) +
          Math.abs(de) +
          Math.abs(pe) +
          Math.abs(xe - Z) +
          Math.abs(Q - J) >
        0.001;
      (!n || O) && H();
    }
  }
  const yt = [];
  function bt() {
    if (!F) {
      F = !0;
      clearTimeout(snapshotTimer);
      themeObserver.disconnect();
      for (const [t, o, r] of yt) Object.assign(t.style, { top: o, left: r });
      (cancelAnimationFrame(R),
        vt.disconnect(),
        ct?.(),
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
  s.addEventListener("abort", bt, { once: !0 });
  let Le = !1;
  function be() {
    if (Le || g.matches) return;
    Le = !0;
    const t = [];
    for (let r = 0; r < Je; r++)
      for (let n = 0; n < Ne; n++) `${r}-${n}` !== i && t.push(`${r}-${n}`);
    t.sort((r, n) => {
      const [a, c] = r.split("-").map(Number),
        [m, d] = n.split("-").map(Number);
      return (a - V) ** 2 + (c - $) ** 2 - (m - V) ** 2 - (d - $) ** 2;
    });
    const o = async () => {
      for (let r = t.shift(); r && !F && !D; r = t.shift())
        await nt(r).catch(() => {});
    };
    Promise.all([o(), o(), o()]);
  }
  function Fe() {
    ((ue = $), (ie = V), H());
  }
  function Ke(t, o) {
    ((Y = performance.now()),
      !Q && ((ue = $ + Math.tanh(t) * $), (ie = V - Math.tanh(o) * V), H()));
  }
  let q = null;
  (document.addEventListener(
    "pointerdown",
    (t) => {
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
        if (!(D || g.matches)) {
          if (q) {
            const o = Math.min(U, k) * 0.3;
            if (Math.hypot(t.clientX - q.x, t.clientY - q.y) > 10) be();
            Ke((t.clientX - q.x) / o, (t.clientY - q.y) / o);
          } else if (t.pointerType === "mouse") {
            const o = x.getBoundingClientRect(),
              r = o.left + l.x + l.s / 2,
              n = o.top + l.y + l.s / 2;
            (Ke((t.clientX - r) / (U * 0.4), (t.clientY - n) / (k * 0.4)),
              be());
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
      D || ((Y = performance.now()), Fe());
    },
    { signal: s },
  );
  let Ze = null;
  window.addEventListener(
    "deviceorientation",
    (t) => {
      if (D || g.matches || T || q || t.beta === null || t.gamma === null)
        return;
      Ze ??= { beta: t.beta, gamma: t.gamma };
      const o = (t.gamma - Ze.gamma) / 14,
        r = (t.beta - Ze.beta) / 14;
      (Math.abs(o) + Math.abs(r) < 0.12 && !Le) || (be(), Ke(o, r));
    },
    { signal: s },
  );
  const wt = () => {
      ((xe = 1), (Y = performance.now()), H());
    },
    Et = () => {
      ((xe = 0), (Y = performance.now()), H());
    };
  const captureKey = () =>
    `${innerWidth}:${innerHeight}:${document.documentElement.classList.contains("dark")}`;
  let snapshotKey = `${Re.viewportWidth}:${Re.viewportHeight}:${Re.themeDark}`,
    snapshotTimer,
    snapshotPending = false;
  function queueSnapshot() {
    clearTimeout(snapshotTimer);
    if (!F && !D && captureKey() !== snapshotKey)
      snapshotTimer = setTimeout(() => {
        void refreshPortfolio().catch(() => {});
      }, 300);
  }
  const themeObserver = new MutationObserver(queueSnapshot);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  async function refreshPortfolio() {
    if (F || D || snapshotPending) return;
    const nextKey = captureKey();
    if (nextKey === snapshotKey) return;
    snapshotPending = true;
    let current;
    try {
      current = await capturePortfolio({
        signal: s,
        maxTextureSize: Math.min(4096, e.getParameter(e.MAX_TEXTURE_SIZE)),
      });
    } finally {
      snapshotPending = false;
    }
    if (F || D || nextKey !== captureKey()) {
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
        if (!D) document.hidden ? (cancelAnimationFrame(R), (R = 0)) : H();
      },
      { signal: s },
    ),
    g.addEventListener("change", Fe, { signal: s }),
    document.addEventListener(
      "computer:explode",
      (t) => {
        ((Q = t.detail ? 1 : 0),
          (h.style.pointerEvents = Q ? "none" : ""),
          (Y = performance.now()),
          be(),
          Fe());
      },
      { signal: s },
    ),
    T &&
      setTimeout(() => {
        F || be();
      }, 2e3),
    (p.dataset.ready = "true"),
    (qe = performance.now() + 200),
    gt(),
    {
      dispose: bt,
      async enter(t) {
        if (F || D) return;
        const useFade = captureKey() !== snapshotKey;
        const now = performance.now();
        const pageHeight = (Re.naturalHeight * We.css) / Re.naturalWidth;
        const scrollStart = previewScroll(
          now - Nt,
          Math.max(0, 1 - k / pageHeight),
          g.matches,
        );
        D = true;
        clearTimeout(snapshotTimer);
        h.style.pointerEvents = "none";
        cancelAnimationFrame(R);
        R = 0;
        if (useFade) {
          await fadeToPortfolio(p, t, s);
          return;
        }
        const { ex, ey } = pt();
        ge(ex, ey);
        const bounds = ce(),
          aspect = xt(bounds);
        const width = bounds.x1 - bounds.x0,
          height = bounds.y1 - bounds.y0;
        const page = {
          x: bounds.x0 + (0.5 - aspect.w / 2) * width,
          y: bounds.y0 + (0.5 - aspect.h / 2) * height,
          w: aspect.w * width,
        };
        const from = { ...l },
          scale = U / page.w;
        const to = { x: -page.x * scale, y: -page.y * scale, s: scale };
        window.scrollTo({ top: 0, behavior: "instant" });
        // The real DOM stays still and hidden until the texture reaches its exact
        // landing bounds. There is no mid-zoom double exposure or moving clip.
        await runEntryTransition({
          duration: Gt,
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
      },
    }
  );
}
export { lo as mountComputer };
