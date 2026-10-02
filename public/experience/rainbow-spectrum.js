const e=`#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uPixelRatio;
uniform float uTime;
uniform vec3 uBgLab;
uniform vec2 uAccentHue;
uniform float uDark;
uniform float uIntensity;
uniform float uSpeed;
uniform float uSpread;
uniform float uRayLength;
uniform float uReach;
uniform float uFieldWidth;
uniform float uWave;
uniform float uTint;
uniform float uChroma;
uniform float uRayContrast;
uniform float uReveal;

out vec4 fragColor;

const float TAU = 6.28318530718;

// Ease-out between two points of the reveal, so phases overlap smoothly.
float phase(float from, float to) {
  float x = clamp((uReveal - from) / (to - from), 0.0, 1.0);
  return 1.0 - (1.0 - x) * (1.0 - x) * (1.0 - x);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 linearToSrgb(vec3 c) {
  c = max(c, 0.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

// OKLab to linear sRGB from Björn Ottosson's reference implementation.
vec3 oklabToLinear(vec3 lab) {
  vec3 lms = vec3(
    lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z,
    lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z,
    lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z
  );
  lms = lms * lms * lms;
  return vec3(
    4.0767416621 * lms.x - 3.3077115913 * lms.y + 0.2309699292 * lms.z,
    -1.2684380046 * lms.x + 2.6097574011 * lms.y - 0.3413193965 * lms.z,
    -0.0041960863 * lms.x - 0.7034186147 * lms.y + 1.7076147010 * lms.z
  );
}

// Light Rays' angular pattern: brightness varies with the angle from the
// source. The original keys it off cos(angle), which is identical either
// side of centre and so mirrors the fan; the signed angle breaks that
// symmetry. Spread and length falloff are shared by both ray layers, so
// main() applies them once.
float rayPattern(float angle, float seedA, float seedB, float speed, float t) {
  return clamp(
    (0.45 + 0.15 * sin(angle * seedA + t * speed)) +
    (0.3 + 0.2 * cos(-angle * seedB + t * speed)),
    0.0, 1.0
  );
}

void main() {
  // CSS pixels with y running down from the top edge, as Light Rays uses.
  vec2 size = uResolution / uPixelRatio;
  vec2 coord = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y) / uPixelRatio;
  // Rounded field: an ellipse hanging from the top centre. 0 at the
  // centre of the top edge, 1 at its rim, so the cutoff curves instead of
  // running as a straight line across the page.
  // Narrow screens widen the field, up to 1.5x at phone width, so the
  // crown spans the screen instead of sitting as a small centred glow.
  float narrow = 1.0 - smoothstep(480.0, 900.0, size.x);
  // Reveal: a sliver of light switches on at the top, widens, then pours
  // down to full depth. Every term reaches exactly 1 when uReveal does.
  vec2 fieldRadius = vec2(
    0.5 * size.x * uFieldWidth * (1.0 + 0.5 * narrow) * mix(0.15, 1.0, phase(0.0, 0.7)),
    size.y * uReach * mix(0.1, 1.0, phase(0.1, 1.0))
  );
  float field = length(vec2(coord.x - 0.5 * size.x, coord.y) / fieldRadius);
  if (field >= 1.0) {
    fragColor = vec4(0.0);
    return;
  }

  float t = uTime * uSpeed;
  // Source sits above the top centre, pointing down, and wanders slowly
  // side to side on two unrelated periods so the fan never settles square.
  float wander = sin(t * 0.21) * 0.6 + sin(t * 0.13 + 1.7) * 0.4;
  vec2 source = vec2((0.5 + 0.05 * wander) * size.x, -0.2 * size.y);
  vec2 toCoord = coord - source;
  float rayDistance = length(toCoord);
  float angle = atan(toCoord.x, toCoord.y);
  // Light Rays' distortion: a wave travelling along each ray nudges its
  // angle, so beams sway and ripple as they fall. The angle term gives
  // each side its own phase.
  float swayAngle = angle + uWave * 0.12 * sin(t * 2.0 + rayDistance * 0.02 + angle * 2.3);

  float spread = uSpread * mix(0.25, 1.0, phase(0.15, 0.7));
  float spreadFactor = pow(max(cos(swayAngle), 0.0), 1.0 / max(spread, 0.001));
  float maxDistance = size.x * uRayLength;
  float lengthFalloff = clamp((maxDistance - rayDistance) / maxDistance, 0.0, 1.0);
  float rays = spreadFactor * lengthFalloff * (
    rayPattern(swayAngle, 21.7, 12.7, 1.5, t) * 0.5 +
    rayPattern(swayAngle, 13.4, 10.8, 1.1, t) * 0.4
  );
  // Contrast below 1 melts beams into a smooth glow; above 1 sharpens them.
  rays = max(mix(0.55, rays, uRayContrast), 0.0);

  // Hue follows the ray's angle, so the fan reads as a spectrum, and
  // drifts slowly so the colours travel across the rays over time.
  float hue = TAU * (angle * 0.55 + t * 0.02);
  float crest = smoothstep(0.55, 0.9, rays);
  float lightness = mix(0.72, 0.78, uDark) + crest * mix(0.04, 0.08, uDark);
  float chroma = uChroma * mix(0.19, 0.17, uDark) * (1.0 - 0.35 * crest * uDark);
  vec3 lab = vec3(lightness, chroma * cos(hue), chroma * sin(hue));
  // Tint: pull every hue part-way towards the site accent, keeping chroma.
  lab.yz = mix(lab.yz, uAccentHue * chroma, uTint);

  // Eased falloff: (1 - x^2)^3 leaves the centre gently and meets the rim
  // with zero slope, so the edge of the field is never visible.
  float falloff = 1.0 - field * field;
  falloff = falloff * falloff * falloff;
  // Intensity blooms slightly past full, then settles back to exactly 1.
  float bloom = phase(0.0, 0.5) * (1.0 + 0.15 * sin(3.14159265 * phase(0.4, 1.0)));
  float energy = max(uIntensity * bloom * rays * falloff, 0.0);
  // Dark mode runs hotter, and a hard clamp at 1 flattens the brightest
  // areas into one colour. A soft shoulder (film-style tone mapping) eases
  // towards 1 instead, so rays keep their texture as they brighten.
  float strength = mix(min(energy, 1.0), 1.0 - exp(-1.4 * energy), uDark);

  // Fade by mixing towards the page bg in OKLab, not by sRGB alpha.
  // Light mode mixes evenly. On the dark bg the lightness gap is far wider,
  // so an even mix passes through a lifted grey fog. Instead, lightness
  // falls away faster and chroma lingers, so the tail sinks back into the
  // ink as a deep tint of its own hue, the way coloured light fades.
  float lightnessMix = mix(strength, pow(strength, 1.7), uDark);
  float chromaMix = mix(strength, pow(strength, 0.75), uDark);
  vec3 mixed = vec3(
    mix(uBgLab.x, lab.x, lightnessMix),
    mix(uBgLab.yz, lab.yz, chromaMix)
  );
  vec3 colour = linearToSrgb(oklabToLinear(mixed));
  // Dither to stop 8-bit banding in the long soft fade.
  colour += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) / 255.0;

  // Mostly opaque, since the OKLab mix already carries the fade. The faint
  // tail still uses alpha, so a mid-transition theme toggle never shows the
  // band's edge against the page.
  float coverage = clamp(strength * 12.0, 0.0, 1.0);
  fragColor = vec4(clamp(colour, 0.0, 1.0) * coverage, coverage);
}
`,a={uIntensity:1.1,uSpeed:.6,uSpread:1.8,uRayLength:2,uReach:.85,uFieldWidth:1.5,uWave:.35,uTint:0,uChroma:1,uRayContrast:1},t={renderScale:.5,fragment:e,uniforms:a,darkUniforms:{uTint:.35,uChroma:.6,uRayContrast:.35,uWave:.5,uIntensity:1.6}};export{t as default};
