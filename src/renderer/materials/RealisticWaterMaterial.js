import * as THREE from 'three';

// Realistic, transparent, performant water shader
// Goals:
// - Transparent water with subtle physically-inspired Fresnel
// - Cheap normal animation using 2 moving normal maps (procedural noise in-shader)
// - Soft shoreline foam using the existing land/water mask
// - Minimal branching; no geometry displacement
// - Same public options subset as StylizedWaterMaterial for drop-in use

export default function createRealisticWaterMaterial(options = {}) {
  const opt = {
    baseColor: new THREE.Color(0x2d6ea3),
    shallowColor: new THREE.Color(0x7fc8c1),
    skyColor: new THREE.Color(0xbad4ff),
    opacity: 0.7,
    foamColor: new THREE.Color(0xffffff),
    foamShoreStrength: 0.6,
  maskTexture: null,
  coverageTexture: null, // R: 1 where a rendered hex exists, 0 otherwise
  hexW: 1.0, hexH: 1.0, gridN: 1, gridOffset: 0,
  gridQ0: 0, gridR0: 0, // axial origin (center) that the mask/seabed/coverage textures are built around
    shoreWidth: 0.12, // kept for API compatibility
    // Animation
    timeScale: 1.0,
    flowDir1: new THREE.Vector2(0.86, 0.5).normalize(),
    flowDir2: new THREE.Vector2(-0.35, 0.94).normalize(),
    flowSpeed1: 0.06,
    flowSpeed2: 0.04,
    normalAmp: 0.06,
    specularStrength: 0.15,
    shininess: 48.0,
  // Depth-based transparency
  seabedTexture: null,
  hexMaxYScaled: 1.0, // hexMaxY * modelScaleFactor passed from WorldMap
  seaLevelY: 0.0,     // world Y of water plane
  depthMax: 1.0,      // world units at which opacity reaches farAlpha
  nearAlpha: 0.12,    // alpha near shore (shallow)
  farAlpha: 0.85,     // alpha at/max depth
  // Shoreline wave bands (near-hex waves)
  shoreWaveStrength: 0.45,
  shoreWaveSpacing: 0.42, // in units of min(hexW,hexH)
  shoreWaveWidth: 0.28,   // 0..1 threshold for band width
  shoreWaveSpeed: 0.12,
  ...options,
  };

  const uniforms = {
    uTime: { value: 0 },
    uBase: { value: opt.baseColor },
    uShallow: { value: opt.shallowColor },
    uSky: { value: opt.skyColor },
    uOpacity: { value: opt.opacity },
    uFoamCol: { value: opt.foamColor },
    uFoamShoreStrength: { value: opt.foamShoreStrength },
  uMask: { value: opt.maskTexture },
  uCoverage: { value: opt.coverageTexture },
  uSeabed: { value: opt.seabedTexture },
  uHexW: { value: opt.hexW }, uHexH: { value: opt.hexH }, uGridN: { value: opt.gridN }, uGridOffset: { value: opt.gridOffset },
  uGridQ0: { value: opt.gridQ0 }, uGridR0: { value: opt.gridR0 },
    uSpecularStrength: { value: opt.specularStrength },
    uShininess: { value: opt.shininess },
    uNormalAmp: { value: opt.normalAmp },
    uFlowDir1: { value: opt.flowDir1 },
    uFlowDir2: { value: opt.flowDir2 },
    uFlowSpeed1: { value: opt.flowSpeed1 },
    uFlowSpeed2: { value: opt.flowSpeed2 },
  uHexMaxYScaled: { value: opt.hexMaxYScaled },
  uSeaLevelY: { value: opt.seaLevelY },
  uDepthMax: { value: opt.depthMax },
  uNearAlpha: { value: opt.nearAlpha },
  uFarAlpha: { value: opt.farAlpha },
  // Shore waves
  uShoreWaveStrength: { value: opt.shoreWaveStrength },
  uShoreWaveSpacing: { value: opt.shoreWaveSpacing },
  uShoreWaveWidth: { value: opt.shoreWaveWidth },
  uShoreWaveSpeed: { value: opt.shoreWaveSpeed },
  };

  const vertexShader = `
    varying vec3 vWorldPos;
    varying vec3 vViewPos;
    void main(){
      vec4 wp = modelMatrix * vec4(position,1.0);
      vWorldPos = wp.xyz;
      vViewPos = (viewMatrix * wp).xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `;

  const fragmentShader = `
    precision highp float;
    precision highp int;
    precision mediump sampler2D;
    varying vec3 vWorldPos;
    varying vec3 vViewPos;
    uniform float uTime;
    uniform vec3 uBase, uShallow, uSky;
    uniform float uOpacity;
    uniform vec3 uFoamCol;
    uniform float uFoamShoreStrength;
  uniform sampler2D uMask; // R:1 land, 0 water
  uniform sampler2D uCoverage; // R:1 inside rendered hex area, 0 outside
  uniform sampler2D uSeabed; // R: normalized yScale for seabed top
  uniform float uHexW, uHexH; uniform float uGridN, uGridOffset; uniform float uGridQ0, uGridR0;
    uniform float uSpecularStrength, uShininess;
    uniform float uNormalAmp;
    uniform vec2 uFlowDir1, uFlowDir2;
    uniform float uFlowSpeed1, uFlowSpeed2;
  uniform float uHexMaxYScaled, uSeaLevelY, uDepthMax;
  uniform float uNearAlpha, uFarAlpha;
  // Shore waves
  uniform float uShoreWaveStrength;
  uniform float uShoreWaveSpacing;
  uniform float uShoreWaveWidth;
  uniform float uShoreWaveSpeed;

    // Simple value noise
    float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    float valueNoise(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); float a=hash12(i); float b=hash12(i+vec2(1.0,0.0)); float c=hash12(i+vec2(0.0,1.0)); float d=hash12(i+vec2(1.0,1.0)); vec2 u=f*f*(3.0-2.0*f); return mix(mix(a,b,u.x), mix(c,d,u.x), u.y); }
    float fbm(vec2 p){ float v=0.0; float amp=0.6; float freq=1.0; for(int k=0;k<3;k++){ v += amp * valueNoise(p*freq); freq *= 2.0; amp *= 0.5; } return v; }

    vec2 worldToAxial(vec2 xz){ float q = xz.x / uHexW; float r = xz.y / uHexH - q * 0.5; return vec2(q,r); }
  float insideGridXZ(vec2 xz){ float N=uGridN; float S=uGridOffset; if(N<=0.5) return 1.0; vec2 qr=worldToAxial(xz); float iq=(qr.x - uGridQ0)+S; float ir=(qr.y - uGridR0)+S; float lo=-0.5; float hi=N-0.5; float sx = step(lo, iq) * step(lo, ir) * step(iq, hi) * step(ir, hi); return sx; }
  float sampleMaskXZ(vec2 xz){ float N=uGridN; float S=uGridOffset; if(N<=0.5) return 0.0; vec2 qr = worldToAxial(xz); float iq=(qr.x - uGridQ0)+S; float ir=(qr.y - uGridR0)+S; float u=clamp((iq+0.5)/N, 0.0, 1.0); float v=clamp((ir+0.5)/N, 0.0, 1.0); float m = texture2D(uMask, vec2(u,v)).r; float inside = insideGridXZ(xz); return mix(0.0, m, inside); }
  float sampleCoverageXZ(vec2 xz){ float N=uGridN; float S=uGridOffset; if(N<=0.5) return 1.0; vec2 qr=worldToAxial(xz); float iq=(qr.x - uGridQ0)+S; float ir=(qr.y - uGridR0)+S; float u=clamp((iq+0.5)/N, 0.0, 1.0); float v=clamp((ir+0.5)/N, 0.0, 1.0); float c = texture2D(uCoverage, vec2(u,v)).r; return c * insideGridXZ(xz); }
  float sampleSeabedXZ(vec2 xz){ float N=uGridN; float S=uGridOffset; if(N<=0.5) return 0.0; vec2 qr=worldToAxial(xz); float iq=(qr.x - uGridQ0)+S; float ir=(qr.y - uGridR0)+S; float u=clamp((iq+0.5)/N, 0.0, 1.0); float v=clamp((ir+0.5)/N, 0.0, 1.0); float sb = texture2D(uSeabed, vec2(u,v)).r; return sb; }

    void main(){
      vec2 xz = vWorldPos.xz;
      vec3 V = normalize(-vViewPos);

      // Two scrolling normal fields
      float s = 0.06; // scale
      float t1 = uTime * uFlowSpeed1;
      float t2 = uTime * uFlowSpeed2;
      vec2 n1uv = xz * s + uFlowDir1 * t1 * 8.0;
      vec2 n2uv = xz * (s * 1.6) + uFlowDir2 * t2 * 8.0;
      float n1 = fbm(n1uv);
      float n2 = fbm(n2uv);
      float nx = (n1 - 0.5) * 2.0;
      float nz = (n2 - 0.5) * 2.0;
      vec3 N = normalize(vec3(nx * uNormalAmp, 1.0, nz * uNormalAmp));

      float fresnel = pow(clamp(1.0 - dot(N, V), 0.0, 1.0), 5.0);
      vec3 env = uSky;

      float depthFac = 0.55 + 0.45 * clamp(0.5 + 0.5 * (n1 + n2) * 0.5, 0.0, 1.0);
      vec3 waterCol = mix(uBase, uShallow, depthFac);
      vec3 baseCol = mix(waterCol, env, fresnel * 0.35);

      // Simple Phong specular
      vec3 L = normalize(vec3(0.4, 1.0, 0.35));
      vec3 H = normalize(L + V);
      float spec = pow(max(0.0, dot(N, H)), uShininess) * uSpecularStrength;

  // Shoreline detection with circular (isotropic) gradient to avoid diamond artifacts
  float stepLen = 0.14 * min(uHexW, uHexH);
  vec2 ex = vec2(stepLen, 0.0);
  vec2 ey = vec2(0.0, stepLen);
  float m0 = sampleMaskXZ(xz);
  float m1 = sampleMaskXZ(xz + ex);
  float m2 = sampleMaskXZ(xz - ex);
  float m3 = sampleMaskXZ(xz + ey);
  float m4 = sampleMaskXZ(xz - ey);
  float mS = (m0 + m1 + m2 + m3 + m4) / 5.0;
  vec2 g = vec2((m1 - m2) / max(1e-4, (2.0 * stepLen)), (m3 - m4) / max(1e-4, (2.0 * stepLen)));
  float gmag = max(1e-4, length(g));
  // Remove gradient foam to avoid white smearing; keep only banded waves
  float foam = 0.0;
  // Signed distance into water side
  float signedDist = (mS - 0.5) / gmag;
  float d = clamp(-signedDist, 0.0, 1e6);

  // Animated wave bands along the shore (subtle, fades after a few bands)
  float spacing = uShoreWaveSpacing * min(uHexW, uHexH);
  float pos = (d / max(1e-4, spacing)) + uTime * uShoreWaveSpeed;
  float stripe = 0.5 + 0.5 * sin(6.2831853 * pos);
  float bands = smoothstep(1.0 - uShoreWaveWidth, 1.0, stripe);
  float nearFade = 1.0 - smoothstep(0.0, 3.0, d / max(1e-4, spacing));
  // Strictly restrict to water side using signed distance
  float insideWater = step(1e-4, d);
  float waveIntensity = clamp(bands * nearFade * insideWater, 0.0, 1.0);
  float shoreWaves = waveIntensity * uShoreWaveStrength;

  // Crisp binary stripes: pure white bands, no gradient; hide outside coverage
  float cov = sampleCoverageXZ(xz);
  float covSoft = smoothstep(0.25, 0.75, cov);
  float inside = insideGridXZ(xz);
  float waveMask = step(0.5, waveIntensity) * covSoft * inside;
  vec3 col = mix(baseCol, uFoamCol, waveMask);
  // Keep specular off on the white bands
  col += spec * (1.0 - waveMask);

  // Depth-based transparency using seabed height field
  float yScale = sampleSeabedXZ(xz);
  float seabedY = yScale * uHexMaxYScaled;
  float depth = max(0.0, uSeaLevelY - seabedY);
  float aDepth = mix(uNearAlpha, uFarAlpha, smoothstep(0.0, max(1e-4, uDepthMax), depth));
  float alpha = clamp(aDepth * uOpacity, 0.0, 1.0);
  // Opaque where stripes are; base water alpha elsewhere
  alpha = max(alpha, waveMask);
  gl_FragColor = vec4(col, alpha);
    }
  `;

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: true,
  });
  return mat;
}
