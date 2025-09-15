import * as THREE from 'three';

// createGhibliWaterMaterial(options)
// options: {
//   preset: 'vivid'|'soft',
//   distanceTexture, coverageTexture, seabedTexture,
//   hexW, hexH, gridN, gridOffset, gridQ0, gridR0,
//   seaLevelY, hexMaxYScaled
// }
export default function createGhibliWaterMaterial(opts = {}) {
  const preset = (opts.preset || 'vivid').toLowerCase();

  const presets = {
    vivid: {
      uBaseColor: new THREE.Color(0x2aa6b8),
      uAccentColor: new THREE.Color(0xffd6a5),
      uRimColor: new THREE.Color(0xffffff),
      uNormalAmp: 0.45,
      uFlowSpeed: new THREE.Vector2(0.018, 0.01),
      uFoamStrength: 0.9,
      uShoreSoftness: 0.12,
      uBandContrast: 1.8,
      uSpecularPow: 24.0,
      uOpacity: 0.96,
    },
    soft: {
      uBaseColor: new THREE.Color(0x6fb6c6),
      uAccentColor: new THREE.Color(0xfff1d6),
      uRimColor: new THREE.Color(0xffffff),
      uNormalAmp: 0.28,
      uFlowSpeed: new THREE.Vector2(0.01, 0.006),
      uFoamStrength: 0.38,
      uShoreSoftness: 0.2,
      uBandContrast: 1.1,
      uSpecularPow: 32.0,
      uOpacity: 0.92,
    },
  };

  const p = presets[preset] || presets.vivid;

  const uniforms = {
    uTime: { value: 0.0 },
    uBaseColor: { value: p.uBaseColor.clone() },
    uAccentColor: { value: p.uAccentColor.clone() },
    uRimColor: { value: p.uRimColor.clone() },
    uNormalAmp: { value: p.uNormalAmp },
    uFlowSpeed: { value: p.uFlowSpeed.clone() },
    uFoamStrength: { value: p.uFoamStrength },
    uShoreSoftness: { value: p.uShoreSoftness },
    uBandContrast: { value: p.uBandContrast },
    uSpecularPow: { value: p.uSpecularPow },
    uOpacity: { value: p.uOpacity },
    uDist: { value: opts.distanceTexture || null },
    uCoverage: { value: opts.coverageTexture || null },
    uSeabed: { value: opts.seabedTexture || null },
    uHexW: { value: opts.hexW || 1.0 },
    uHexH: { value: opts.hexH || 1.0 },
    uSeaLevelY: { value: opts.seaLevelY || 0.0 },
    uHexMaxYScaled: { value: opts.hexMaxYScaled || 1.0 },
  uHasDist: { value: opts.distanceTexture ? 1.0 : 0.0 },
  uGridN: { value: opts.gridN || 1 },
  uGridOffset: { value: opts.gridOffset || 0 },
  uGridQ0: { value: opts.gridQ0 || 0 },
  uGridR0: { value: opts.gridR0 || 0 },
  uDebugShowDist: { value: opts.debugShowDist ? 1.0 : 0.0 },
  };

  // simple hash / noise helpers (classic 2D)
  const common = `
    // 2D hash
    float hash(vec2 p){ p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3))); return fract(sin(p.x+p.y)*43758.5453123); }
    float noise(vec2 p){
      vec2 i = floor(p);
      vec2 f = fract(p);
      // four corners
      float a = hash(i + vec2(0.0,0.0));
      float b = hash(i + vec2(1.0,0.0));
      float c = hash(i + vec2(0.0,1.0));
      float d = hash(i + vec2(1.0,1.0));
      vec2 u = f*f*(3.0-2.0*f);
      return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
    }
    float fbm(vec2 p){
      float v = 0.0;
      float a = 0.5;
      for(int i=0;i<3;i++){
        v += a * noise(p);
        p = p*2.12;
        a *= 0.5;
      }
      return v;
    }
  `;

  const vertexShader = `
    varying vec2 vUv;
    varying vec3 vWorldPos;
    void main(){
      vUv = uv;
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorldPos = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `;

  const fragmentShader = `
  precision highp float;
  varying vec2 vUv;
  varying vec3 vWorldPos;
  uniform float uTime;
  uniform float uHasDist;
  uniform float uGridN;
  uniform float uGridOffset;
  uniform float uGridQ0;
  uniform float uGridR0;
  uniform float uHexW;
  uniform float uHexH;
  uniform float uDebugShowDist;
    uniform vec3 uBaseColor;
    uniform vec3 uAccentColor;
    uniform vec3 uRimColor;
    uniform float uNormalAmp;
    uniform vec2 uFlowSpeed;
    uniform float uFoamStrength;
    uniform float uShoreSoftness;
    uniform float uBandContrast;
    uniform float uSpecularPow;
    uniform float uOpacity;
    uniform sampler2D uDist;
    uniform sampler2D uCoverage;
    uniform sampler2D uSeabed;
    ${common}

    // compute stylized height field
    float heightField(vec2 p){
      float n1 = fbm(p * 0.6 + uFlowSpeed * uTime * 0.3);
      float n2 = fbm(p * 1.6 - uFlowSpeed.yx * uTime * 0.6);
      return n1 * 0.6 + n2 * 0.35;
    }

    vec3 computeNormal(vec2 p){
      float e = 0.0008;
      float h = heightField(p);
      float hx = heightField(p + vec2(e,0.0));
      float hy = heightField(p + vec2(0.0,e));
      vec3 n = normalize(vec3((hx - h)/e, 1.0, (hy - h)/e));
      return n;
    }

    void main(){
  // world-space uv: use world position xz for large-scale coherence
  vec2 p = vWorldPos.xz * 0.02; // scale down for painterly ripples
      float h = heightField(p);
      vec3 n = computeNormal(p);
      // base color modulation by bands
  float shore = 0.0;
  float dist = 0.0;
      // sample signed-distance by mapping world XZ to the precomputed grid UV
      if (uHasDist > 0.5) {
        // convert world xz to axial coords similar to RealisticWaterMaterial
        float N = uGridN;
        float S = uGridOffset;
        vec2 qr;
        qr.x = vWorldPos.x / uHexW;
        qr.y = vWorldPos.z / uHexH - qr.x * 0.5;
        float iq = (qr.x - uGridQ0) + S;
        float ir = (qr.y - uGridR0) + S;
        vec2 uv = vec2((iq + 0.5) / N, (ir + 0.5) / N);
  dist = 0.0;
        if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0) dist = texture2D(uDist, uv).r;
        shore = smoothstep(uShoreSoftness, 0.0, dist);
        // debug: optionally output the raw distance as color
        if (uDebugShowDist > 0.5) {
          float dvis = clamp(dist / 10.0 + 0.5, 0.0, 1.0);
          gl_FragColor = vec4(vec3(dvis), 1.0);
          return;
        }
      }
      // stylized banding
      float band = smoothstep(0.05, 0.0, h * uBandContrast + shore * 0.6);
      band = smoothstep(0.0, 1.0, floor(band * 3.0 + 0.5) / 3.0 * 0.9 + band * 0.1);

      vec3 base = mix(uBaseColor, uAccentColor, band * 0.8 + h * 0.15);

  // specular sheen (painterly rim)
  // Use simple fresnel-like rim and a low-cost specular approximation
  float rim = pow(clamp(1.0 - dot(normalize(n), vec3(0.0,1.0,0.0)), 0.0, 1.0), 1.5);
  float spec = pow(max(dot(normalize(n), normalize(vec3(0.5,1.0,0.3))), 0.0), uSpecularPow) * 0.25;
  vec3 rimCol = uRimColor * (rim * 0.6 + spec * 0.9);

      // foam near shore (noise-modulated)
      float foam = 0.0;
      if (uHasDist > 0.5) {
        float near = smoothstep(uShoreSoftness * 1.5, 0.0, dist);
        foam = near * (0.5 + 0.5 * fbm(p * 3.0 + uTime * 0.2));
        foam *= uFoamStrength;
      }

      vec3 color = base + rimCol * 0.4 + vec3(foam);

      // final tone mapping & alpha
      float alpha = uOpacity;
      gl_FragColor = vec4(color, alpha);
    }
  `;

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
  });

  return mat;
}
