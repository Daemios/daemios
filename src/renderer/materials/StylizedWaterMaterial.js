import * as THREE from 'three';

// Stylized water shader inspired by https://ameye.dev/notes/stylized-water-shader/
// Features:
// - 3 directional Gerstner waves for normals/displacement in fragment (screen-space plane)
// - Simple Fresnel term blending base/depth color and sky color
// - Phong-like specular with tunable shininess
// - Procedural foam on wave crests and shoreline foam via provided mask
// - Minimal uniforms for integration in WorldMap.vue

export default function createStylizedWaterMaterial(options = {}) {
  const opt = {
    baseColor: new THREE.Color(0x0c2a3e),    // deep water
    shallowColor: new THREE.Color(0x1a5b6b), // near surface/foam blend
    foamColor: new THREE.Color(0xffffff),
    skyColor: new THREE.Color(0x88aadd),
    opacity: 0.95,
    foamIntensity: 1.0,           // softer by default
    foamShoreStrength: 1.0,
    foamCrestStrength: 0.0,      // disable interior whitecaps by default
    fresnelStrength: 1.3,
    fresnelBias: 0.02,
    fresnelPower: 5.0,
    specularStrength: 0.2,
    shininess: 24.0,
    waveAmp: [0.12, 0.08, 0.05],
    waveLen: [7.0, 4.2, 2.4],
    waveSpeed: [0.55, 0.75, 1.0],
    waveDirDeg: [18, -45, 75],
    maskTexture: null,  // DataTexture: R channel 1=land, 0=water
    hexW: 1.0, hexH: 1.0, gridN: 1, gridOffset: 0,
    // shoreline band params (world-space, relative to hex scale)
    shoreMaxDist: 0.9,        // in units of min(hexW,hexH)
    shoreStripeSpacing: 0.35, // in units of min(hexW,hexH)
    shoreStripeWidth: 0.28,   // 0..1 threshold for sin stripe width
    shoreAnimSpeed: 0.12,     // world units/sec (relative to min hex dim)
    gradEpsScale: 0.12,       // derivative epsilon as fraction of min hex dim
    ...options,
  };

  const minDim = (a, b) => Math.min(a, b);

  const uniforms = {
    uTime: { value: 0 },
    uBase: { value: opt.baseColor },
    uShallow: { value: opt.shallowColor },
    uFoamCol: { value: opt.foamColor },
    uSky: { value: opt.skyColor },
    uOpacity: { value: opt.opacity },
    uFoamIntensity: { value: opt.foamIntensity },
    uFoamShoreStrength: { value: opt.foamShoreStrength },
    uFoamCrestStrength: { value: opt.foamCrestStrength },
    uFresnelStrength: { value: opt.fresnelStrength },
    uFresnelBias: { value: opt.fresnelBias },
    uFresnelPower: { value: opt.fresnelPower },
    uSpecularStrength: { value: opt.specularStrength },
    uShininess: { value: opt.shininess },
    uWaveAmp: { value: new THREE.Vector3(opt.waveAmp[0], opt.waveAmp[1], opt.waveAmp[2]) },
    uWaveLen: { value: new THREE.Vector3(opt.waveLen[0], opt.waveLen[1], opt.waveLen[2]) },
    uWaveSpeed: { value: new THREE.Vector3(opt.waveSpeed[0], opt.waveSpeed[1], opt.waveSpeed[2]) },
    uDir1: { value: new THREE.Vector2(Math.cos(opt.waveDirDeg[0]*Math.PI/180), Math.sin(opt.waveDirDeg[0]*Math.PI/180)) },
    uDir2: { value: new THREE.Vector2(Math.cos(opt.waveDirDeg[1]*Math.PI/180), Math.sin(opt.waveDirDeg[1]*Math.PI/180)) },
    uDir3: { value: new THREE.Vector2(Math.cos(opt.waveDirDeg[2]*Math.PI/180), Math.sin(opt.waveDirDeg[2]*Math.PI/180)) },
    uMask: { value: opt.maskTexture },
    uHexW: { value: opt.hexW }, uHexH: { value: opt.hexH }, uGridN: { value: opt.gridN }, uGridOffset: { value: opt.gridOffset },
    uLightDir: { value: new THREE.Vector3(0.4, 1.0, 0.35).normalize() },
    // shoreline bands
    uShoreMaxDist: { value: opt.shoreMaxDist },
    uShoreStripeSpacing: { value: opt.shoreStripeSpacing },
    uShoreStripeWidth: { value: opt.shoreStripeWidth },
    uShoreAnimSpeed: { value: opt.shoreAnimSpeed },
    uGradEpsScale: { value: opt.gradEpsScale },
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
    varying vec3 vWorldPos;
    varying vec3 vViewPos;
    uniform float uTime;
    uniform vec3 uBase, uShallow, uFoamCol, uSky;
    uniform float uOpacity;
    uniform float uFoamIntensity, uFoamShoreStrength, uFoamCrestStrength;
    uniform float uFresnelStrength, uFresnelBias, uFresnelPower;
    uniform float uSpecularStrength, uShininess;
    uniform vec3 uWaveAmp, uWaveLen, uWaveSpeed;
    uniform vec2 uDir1, uDir2, uDir3;
    uniform sampler2D uMask; // R:1 land, 0 water
    uniform float uHexW, uHexH; uniform int uGridN, uGridOffset;
    uniform vec3 uLightDir;
    uniform float uShoreMaxDist, uShoreStripeSpacing, uShoreStripeWidth, uShoreAnimSpeed, uGradEpsScale;

    // Helpers
    float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }

    void gerstner(vec2 dir, float amp, float len, float speed, in vec2 xz, float t, inout float h, inout vec3 N){
      float k = 6.2831853 / max(0.001, len);
      float c = sqrt(9.8 / max(0.001, k));
      float w = k * c;
      float phase = dot(dir, xz) * k + (w * speed * 0.15) * t;
      float s = sin(phase);
      float cph = cos(phase);
      h += amp * s;
      vec3 d = vec3(dir.x, 0.0, dir.y);
      N.x -= d.x * amp * cph;
      N.z -= d.z * amp * cph;
      N.y += amp * cph;
    }

    // Map world xz to axial and sample mask continuously (Linear-filtered texture)
    vec2 worldToAxial(vec2 xz){ float q = xz.x / uHexW; float r = xz.y / uHexH - q * 0.5; return vec2(q,r); }
    float sampleMaskXZ(vec2 xz){
      int N = uGridN; int S = uGridOffset; if(N<=0) return 0.0;
      vec2 qr = worldToAxial(xz);
      float iq = qr.x + float(S); float ir = qr.y + float(S);
      float u = (iq + 0.5) / float(N); float v = (ir + 0.5) / float(N);
      return texture2D(uMask, vec2(u,v)).r;
    }

    void main(){
      vec3 V = normalize(-vViewPos);
      vec2 xz = vWorldPos.xz;

      float h = 0.0; vec3 N = vec3(0.0,1.0,0.0);
      gerstner(uDir1, uWaveAmp.x, uWaveLen.x, uWaveSpeed.x, xz, uTime, h, N);
      gerstner(uDir2, uWaveAmp.y, uWaveLen.y, uWaveSpeed.y, xz, uTime, h, N);
      gerstner(uDir3, uWaveAmp.z, uWaveLen.z, uWaveSpeed.z, xz, uTime, h, N);
      N = normalize(N);

      float depthFac = clamp(0.5 + 0.7 * h, 0.0, 1.0);
      vec3 waterCol = mix(uBase, uShallow, depthFac);

      float fresnel = pow(clamp(1.0 - dot(N, V), 0.0, 1.0), uFresnelPower) * uFresnelStrength + uFresnelBias;
      vec3 env = uSky;
      vec3 baseCol = mix(waterCol, env, clamp(fresnel, 0.0, 1.0));

      float NdotL = max(0.0, dot(N, normalize(uLightDir)));
      vec3 diffuse = baseCol * (0.35 + 0.65 * NdotL);
      vec3 H = normalize(normalize(uLightDir) + V);
      float spec = pow(max(0.0, dot(N, H)), uShininess) * uSpecularStrength;

      // Signed-distance approximation from mask for shoreline bands
      float s = min(uHexW, uHexH) * uGradEpsScale;
      vec2 ex = vec2(s, 0.0), ey = vec2(0.0, s);
      float m = sampleMaskXZ(xz);
      float gx = (sampleMaskXZ(xz + ex) - sampleMaskXZ(xz - ex)) / (2.0 * s);
      float gy = (sampleMaskXZ(xz + ey) - sampleMaskXZ(xz - ey)) / (2.0 * s);
      float gmag = max(1e-4, length(vec2(gx, gy)));
      float signedDist = (m - 0.5) / gmag; // +land, -water (approx world units)
      float d = clamp(-signedDist, 0.0, uShoreMaxDist * min(uHexW, uHexH)); // distance into water side

      float spacing = uShoreStripeSpacing * min(uHexW, uHexH);
      float pos = (d - (uShoreAnimSpeed * min(uHexW, uHexH)) * uTime) / max(0.001, spacing);
      float stripe = 0.5 + 0.5 * sin(6.2831853 * pos);
      float bands = smoothstep(1.0 - uShoreStripeWidth, 1.0, stripe);
      float falloff = 1.0 - clamp(d / (uShoreMaxDist * min(uHexW, uHexH)), 0.0, 1.0);
      float shoreWhite = bands * falloff * uFoamShoreStrength;

      // Optionally add interior crest foam (default 0)
      float slopeFoam = smoothstep(0.65, 0.95, 1.0 - N.y) * uFoamCrestStrength;
      float heightFoam = smoothstep(0.15, 0.45, h);
      float crestFoam = clamp(slopeFoam * heightFoam, 0.0, 1.0);

      float foam = clamp((shoreWhite + crestFoam) * uFoamIntensity, 0.0, 1.0);

      vec3 col = mix(diffuse, uFoamCol, foam);
      col += spec;
      gl_FragColor = vec4(col, uOpacity);
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
