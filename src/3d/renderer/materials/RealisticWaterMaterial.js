import * as THREE from 'three';

// Realistic, transparent, performant water shader
// Goals:
// - Transparent water with subtle physically-inspired Fresnel
// - Cheap normal animation using 2 moving normal maps (procedural noise in-shader)
// - Soft shoreline foam using a land/water distance field
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
  distanceTexture: null,
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
  shoreWaveSpacing: .8, // in units of min(hexW,hexH) - much larger spacing
  shoreWaveWidth: 0.08,   // much thinner foam band
  shoreWaveSpeed: 0.15,
  shoreWaveOffset: 0.01,   // extremely close to shore
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
  uDist: { value: opt.distanceTexture },
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
  uShoreWaveOffset: { value: opt.shoreWaveOffset },
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
    uniform sampler2D uDist; // R: signed distance (land+, water-)
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
    uniform float uShoreWaveOffset;

    // Cheap trigonometric noise in [0,1]
    float trigNoise(vec2 p){
      return 0.5 + 0.25*(sin(p.x)+sin(p.y)) + 0.25*sin(p.x+p.y);
    }

    vec2 worldToAxial(vec2 xz){ float q = xz.x / uHexW; float r = xz.y / uHexH - q * 0.5; return vec2(q,r); }

    void main(){
      vec2 xz = vWorldPos.xz;
      vec3 V = normalize(-vViewPos);

      // Two scrolling normal fields using cheap noise
      float s = 0.06; // scale
      float t1 = uTime * uFlowSpeed1;
      float t2 = uTime * uFlowSpeed2;
      vec2 n1uv = xz * s + uFlowDir1 * t1 * 8.0;
      vec2 n2uv = xz * (s * 1.6) + uFlowDir2 * t2 * 8.0;
      float n1 = trigNoise(n1uv);
      float n2 = trigNoise(n2uv);
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

      // Grid sampling (distance/coverage/seabed) computed once
      float inside = 1.0;
      float dist = 1.0;
      float cov = 1.0;
      float yScale = 0.0;
      if(uGridN > 0.5){
        vec2 qr = worldToAxial(xz);
        float iq = (qr.x - uGridQ0) + uGridOffset;
        float ir = (qr.y - uGridR0) + uGridOffset;
        inside = step(-0.5, iq) * step(-0.5, ir) * step(iq, uGridN-0.5) * step(ir, uGridN-0.5);
        float u = clamp((iq+0.5)/uGridN, 0.0, 1.0);
        float v = clamp((ir+0.5)/uGridN, 0.0, 1.0);
        vec2 uv = vec2(u,v);
        dist = texture2D(uDist, uv).r;
        cov = texture2D(uCoverage, uv).r * inside;
        yScale = texture2D(uSeabed, uv).r;
      }

      // Signed distance into water side
      float d = -dist;

      // Animated wave bands along the shore (subtle, fades after a few bands)
      float hexMin = min(uHexW, uHexH);
      float spacing = uShoreWaveSpacing * hexMin;
      float offset = 0.01 * hexMin;
      float bandD = max(0.0, d - offset);
      float invSpacing = 1.0 / max(1e-4, spacing);
      float bandNorm = bandD * invSpacing;
      float phase = fract((xz.x + xz.y) * 0.37); // pseudo-random phase per location
      float pos = bandNorm + uTime * uShoreWaveSpeed + phase;
      float stripe = 0.5 + 0.5 * sin(6.2831853 * pos);
      float widthFac = 1.0 + (1.0 - smoothstep(0.0, 3.0, bandNorm));
      float bands = smoothstep(1.0 - clamp(uShoreWaveWidth * widthFac, 0.0, 1.0), 1.0, stripe);
      float nearFade = 1.0 - smoothstep(0.0, 3.0, bandNorm);
      float isActive = step(offset, d);
      float insideWater = step(1e-4, d);
      float waveIntensity = clamp(bands * nearFade * insideWater * isActive, 0.0, 1.0);
      float covSoft = smoothstep(0.25, 0.75, cov);
      float waveMask = smoothstep(0.8, 1.0, waveIntensity) * nearFade * covSoft;
      waveMask *= step(1e-4, uShoreWaveStrength);
      vec3 col = mix(baseCol, uFoamCol, waveMask);
      col += spec * (1.0 - waveMask);

      // Depth-based transparency using seabed height field
      float seabedY = yScale * uHexMaxYScaled;
      float depth = max(0.0, uSeaLevelY - seabedY);
      float aDepth = mix(uNearAlpha, uFarAlpha, smoothstep(0.0, max(1e-4, uDepthMax), depth));
      float alpha = clamp(aDepth * uOpacity, 0.0, 1.0);
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
