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
  coverageTexture: null, // DataTexture: R channel 1=rendered hex area, 0=outside
  hexW: 1.0, hexH: 1.0, gridN: 1, gridOffset: 0,
  // Scene depth texture
  depthTexture: null,
  cameraNear: 0.1,
  cameraFar: 1000.0,
  resolution: new THREE.Vector2(1, 1),
  attenuation: 2.0,
    // shoreline band params (world-space, relative to hex scale)
    shoreMaxDist: 0.9,        // in units of min(hexW,hexH)
    shoreStripeSpacing: 0.35, // in units of min(hexW,hexH)
    shoreStripeWidth: 0.28,   // 0..1 threshold for sin stripe width
    shoreAnimSpeed: 0.12,     // world units/sec (relative to min hex dim)
    gradEpsScale: 0.12,       // derivative epsilon as fraction of min hex dim
    // shoreline breakup controls
    shoreNoiseScale: 0.35,       // relative to min hex dim (bigger = larger blotches)
    shoreNoiseStrength: 1.0,    // 0..1 how strongly noise fades bands
    shoreNoiseThresholdLow: 0.35,// lower edge for fade-in
    shoreNoiseThresholdHigh: 0.75,// upper edge for fade-in
    shorePhaseJitter: 0.30,      // offsets band phase locally (-0.5..0.5 scaled)
    shoreNoiseSpeed: 0.03,
    shoreTailCut: 0.15,         // fraction of range to fade to zero at the outer edge
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
  uCoverage: { value: opt.coverageTexture },
    uHexW: { value: opt.hexW }, uHexH: { value: opt.hexH }, uGridN: { value: opt.gridN }, uGridOffset: { value: opt.gridOffset },
    uGridQ0: { value: options.gridQ0 || 0 }, uGridR0: { value: options.gridR0 || 0 },
    uDepthTex: { value: opt.depthTexture },
    uInvResolution: { value: new THREE.Vector2(1 / opt.resolution.x, 1 / opt.resolution.y) },
    uCameraNear: { value: opt.cameraNear },
    uCameraFar: { value: opt.cameraFar },
    uAttenK: { value: opt.attenuation },
    uLightDir: { value: new THREE.Vector3(0.4, 1.0, 0.35).normalize() },
    // shoreline bands
    uShoreMaxDist: { value: opt.shoreMaxDist },
    uShoreStripeSpacing: { value: opt.shoreStripeSpacing },
    uShoreStripeWidth: { value: opt.shoreStripeWidth },
    uShoreAnimSpeed: { value: opt.shoreAnimSpeed },
    uGradEpsScale: { value: opt.gradEpsScale },
    // breakup
    uShoreNoiseScale: { value: opt.shoreNoiseScale },
    uShoreNoiseStrength: { value: opt.shoreNoiseStrength },
    uShoreNoiseThresholdLow: { value: opt.shoreNoiseThresholdLow },
    uShoreNoiseThresholdHigh: { value: opt.shoreNoiseThresholdHigh },
    uShorePhaseJitter: { value: opt.shorePhaseJitter },
    uShoreNoiseSpeed: { value: opt.shoreNoiseSpeed },
    uShoreTailCut: { value: opt.shoreTailCut },
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
    precision mediump float;
    precision mediump int;
    precision mediump sampler2D;
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
  uniform sampler2D uCoverage; // R: 1 inside rendered hex area, 0 outside
  uniform sampler2D uDepthTex;
  uniform vec2 uInvResolution;
  uniform float uCameraNear, uCameraFar, uAttenK;
  uniform float uHexW, uHexH; uniform float uGridN, uGridOffset; uniform float uGridQ0, uGridR0;
    uniform vec3 uLightDir;
    uniform float uShoreMaxDist, uShoreStripeSpacing, uShoreStripeWidth, uShoreAnimSpeed, uGradEpsScale, uShoreTailCut;
    uniform float uShoreNoiseScale, uShoreNoiseStrength, uShoreNoiseThresholdLow, uShoreNoiseThresholdHigh, uShorePhaseJitter, uShoreNoiseSpeed;

    // Helpers
    float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    float sampleCoverageXZ(vec2 xz){
      float N = uGridN; float S = uGridOffset; if(N<=0.5) return 1.0; // treat outside window as covered (far ocean)
      vec2 qr = vec2(xz.x / uHexW, xz.y / uHexH - (xz.x / uHexW) * 0.5);
  float iq = (qr.x - uGridQ0) + S; float ir = (qr.y - uGridR0) + S;
      float u = clamp((iq + 0.5) / N, 0.0, 1.0);
      float v = clamp((ir + 0.5) / N, 0.0, 1.0);
      return texture2D(uCoverage, vec2(u,v)).r;
    }

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
  float N = uGridN; float S = uGridOffset; if(N<=0.5) return 0.0;
      vec2 qr = worldToAxial(xz);
  float iq = (qr.x - uGridQ0) + S; float ir = (qr.y - uGridR0) + S;
  float u = clamp((iq + 0.5) / N, 0.0, 1.0);
  float v = clamp((ir + 0.5) / N, 0.0, 1.0);
      return texture2D(uMask, vec2(u,v)).r;
    }

    // Value noise + fbm using hash12
    float valueNoise(vec2 p){
      vec2 i = floor(p); vec2 f = fract(p);
      float a = hash12(i);
      float b = hash12(i + vec2(1.0, 0.0));
      float c = hash12(i + vec2(0.0, 1.0));
      float d = hash12(i + vec2(1.0, 1.0));
      vec2 u = f*f*(3.0-2.0*f);
      return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
    }
    float fbm(vec2 p){
      float v = 0.0; float amp = 0.6; float freq = 1.0;
      for(int k=0;k<3;k++){
        v += amp * valueNoise(p * freq);
        freq *= 2.0; amp *= 0.5;
      }
      return v;
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

      // Compute local edge presence; if none, suppress shoreline bands (fix outer edges)
      float s = min(uHexW, uHexH) * uGradEpsScale;
      vec2 ex = vec2(s, 0.0), ey = vec2(0.0, s);
      float m0 = sampleMaskXZ(xz);
      float m1 = sampleMaskXZ(xz + ex);
      float m2 = sampleMaskXZ(xz - ex);
      float m3 = sampleMaskXZ(xz + ey);
      float m4 = sampleMaskXZ(xz - ey);
      float localMax = max(m0, max(m1, max(m2, max(m3, m4))));
      float localMin = min(m0, min(m1, min(m2, min(m3, m4))));
      float hasEdge = step(0.02, localMax - localMin);

      float shoreWhite = 0.0;
      if(hasEdge > 0.5){
        // Signed-distance into water side
        float gx = (m1 - m2) / (2.0 * s);
        float gy = (m3 - m4) / (2.0 * s);
        float gmag = max(1e-3, length(vec2(gx, gy)));
        float signedDist = (m0 - 0.5) / gmag;
        float maxR = uShoreMaxDist * min(uHexW, uHexH);
        float d = clamp(-signedDist, 0.0, maxR);

        // Breakup noise
        float invMin = 1.0 / max(1e-4, min(uHexW, uHexH));
        vec2 nuv = xz * (uShoreNoiseScale * invMin) + uTime * uShoreNoiseSpeed * vec2(0.13, -0.11);
        float n = fbm(nuv);
        float breakup = smoothstep(uShoreNoiseThresholdLow, uShoreNoiseThresholdHigh, n);
        float phaseJitter = (n - 0.5) * uShorePhaseJitter;

        float spacing = uShoreStripeSpacing * min(uHexW, uHexH);
        float pos = (d + (uShoreAnimSpeed * min(uHexW, uHexH)) * uTime) / max(0.001, spacing);
        pos += phaseJitter;
        float stripe = 0.5 + 0.5 * sin(6.2831853 * pos);
        float bands = smoothstep(1.0 - uShoreStripeWidth, 1.0, stripe);

        // Range falloff with tail cut to avoid flashes near the end
  float nd = d / max(1e-4, maxR);
  float falloff = 1.0 - clamp(nd, 0.0, 1.0);
        float tailGate = 1.0 - smoothstep(max(0.0, 1.0 - uShoreTailCut), 1.0, nd);

        // Apply breakup and ensure contribution only on water side (m0 ~ 0)
        float fade = mix(1.0, breakup, clamp(uShoreNoiseStrength, 0.0, 1.0));
        float waterOnly = 1.0 - smoothstep(0.5, 0.55, m0); // quickly drops on land
        shoreWhite = bands * falloff * tailGate * fade * waterOnly * uFoamShoreStrength;
      }

      // Interior crest foam (default 0)
      float slopeFoam = smoothstep(0.65, 0.95, 1.0 - N.y) * uFoamCrestStrength;
      float heightFoam = smoothstep(0.15, 0.45, h);
      float crestFoam = clamp(slopeFoam * heightFoam, 0.0, 1.0);

  float foam = clamp((shoreWhite + crestFoam) * uFoamIntensity, 0.0, 1.0);
  // Make near-shore region solid white in all directions for now (ignore stripe directionality)
  float nearFade = 1.0 - smoothstep(0.0, 1.0, (/*d into water*/ max(0.0, 0.0)));
  // We need d and maxR in this scope; recompute a conservative fallback using local gradient
  // Use m0 and a small epsilon to approximate distance: treat within ~maxR as near
  nearFade = 1.0; // fallback to always consider vicinity; will be clamped by mask sampling below
  float bandsSolid = 0.0;
  {
    // Recompute gradient briefly
    float s2 = min(uHexW, uHexH) * uGradEpsScale;
    vec2 ex2 = vec2(s2, 0.0), ey2 = vec2(0.0, s2);
    float m0b = sampleMaskXZ(xz);
    float m1b = sampleMaskXZ(xz + ex2);
    float m2b = sampleMaskXZ(xz - ex2);
    float m3b = sampleMaskXZ(xz + ey2);
    float m4b = sampleMaskXZ(xz - ey2);
    float localEdge = step(0.02, (max(m0b, max(m1b, max(m2b, max(m3b, m4b)))) - min(m0b, min(m1b, min(m2b, min(m3b, m4b))))));
    // Solid if we are on water side near any edge
    float waterOnly2 = 1.0 - smoothstep(0.5, 0.55, m0b);
    bandsSolid = localEdge * waterOnly2;
  }
  float cov = sampleCoverageXZ(xz);
  float covSoft = smoothstep(0.25, 0.75, cov);
  vec3 col = mix(diffuse, uFoamCol, max(foam, bandsSolid));
      col += spec;
  vec2 suv = gl_FragCoord.xy * uInvResolution;
  float sceneDepth = texture2D(uDepthTex, suv).r;
  float waterDepth = gl_FragCoord.z;
  float nd = sceneDepth * 2.0 - 1.0;
  float sceneLin = (2.0 * uCameraNear * uCameraFar) / (uCameraFar + uCameraNear - nd * (uCameraFar - uCameraNear));
  float ndw = waterDepth * 2.0 - 1.0;
  float waterLin = (2.0 * uCameraNear * uCameraFar) / (uCameraFar + uCameraNear - ndw * (uCameraFar - uCameraNear));
  float thickness = max(0.0, sceneLin - waterLin);
  float alpha = clamp((1.0 - exp(-uAttenK * thickness)) * uOpacity, 0.0, 1.0);
  alpha = max(alpha, bandsSolid);
  alpha *= covSoft;
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
