import * as THREE from 'three';

// Stylized open-sea waves: moving chevron crests drawn as thin, hand-drawn-like lines
// Designed for a single large plane (world-space XZ). No dependencies on hex tiling.
//
// Visual goals:
// - Deep base color with subtle two-tone banding
// - Repeating V/chevron-shaped crests that drift across the surface
// - Slight irregularity (noise jitter + width variation near the apex) so it feels drawn
// - Two layered directions for richer motion
//
// Usage:
//   const mat = createSeaWavesMaterial();
//   const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h, 1, 1), mat);
//   mesh.rotation.x = -Math.PI/2; // make it horizontal if needed
//   // In your render loop:
//   mat.uniforms.uTime.value = clock.getElapsedTime();
export default function createSeaWavesMaterial(options = {}) {
  const uniforms = {
    uTime: { value: 0 },
    // Colors
    uPrimary: { value: new THREE.Color(options.primary ?? 0x0d1560) }, // deep navy
    uSecondary: { value: new THREE.Color(options.secondary ?? 0x17318f) }, // lift
    uFoam: { value: new THREE.Color(options.foam ?? 0xffffff) },
    uOpacity: { value: options.opacity ?? 1.0 },

  // Layer 1 params
  uDir1: { value: new THREE.Vector2(Math.cos(options.dir1Angle ?? (15 * Math.PI / 180)), Math.sin(options.dir1Angle ?? (15 * Math.PI / 180))) },
    uScale1: { value: options.scale1 ?? 0.22 },   // world -> pattern density
    uSpeed1: { value: options.speed1 ?? 0.12 },
    uAmp1: { value: options.amp1 ?? 0.35 },       // chevron vertical amplitude
    uWidth1: { value: options.width1 ?? 0.045 },  // base stroke width
    uEdge1: { value: options.edge1 ?? 0.02 },     // soft edge thickness
    uStrength1: { value: options.strength1 ?? 0.7 },

  // Layer 2 params (larger scale, different heading)
  uDir2: { value: new THREE.Vector2(Math.cos(options.dir2Angle ?? (-30 * Math.PI / 180)), Math.sin(options.dir2Angle ?? (-30 * Math.PI / 180))) },
    uScale2: { value: options.scale2 ?? 0.28 },
    uSpeed2: { value: options.speed2 ?? 0.08 },
    uAmp2: { value: options.amp2 ?? 0.42 },
    uWidth2: { value: options.width2 ?? 0.05 },
    uEdge2: { value: options.edge2 ?? 0.022 },
    uStrength2: { value: options.strength2 ?? 0.55 },

    // Subtle large-scale banding for color variation
    uBandScale: { value: options.bandScale ?? 0.06 },
    uBandStrength: { value: options.bandStrength ?? 0.18 },
  };

  const vertexShader = /* glsl */`
    varying vec2 vWorldXZ;
    void main() {
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorldXZ = wp.xz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `;

  const fragmentShader = /* glsl */`
    precision highp float;
    varying vec2 vWorldXZ;
    uniform float uTime;
    uniform vec3 uPrimary, uSecondary, uFoam;
    uniform float uOpacity;

    uniform vec2 uDir1, uDir2;
    uniform float uScale1, uSpeed1, uAmp1, uWidth1, uEdge1, uStrength1;
    uniform float uScale2, uSpeed2, uAmp2, uWidth2, uEdge2, uStrength2;
    uniform float uBandScale, uBandStrength;

    // Fast hash-based noise for tiny jitter
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    // Triangle/profile helpers
    float tri01(float x) { return abs(fract(x) - 0.5) * 2.0; } // 0..1

    // One chevron layer: returns intensity 0..1 for crest lines
    float chevronLayer(vec2 p, vec2 dir, float scale, float amp, float width, float edge, float speed, out vec2 debugST) {
      // Axis aligned to dir
      vec2 n = normalize(vec2(-dir.y, dir.x));
      float s = dot(p, dir) * scale + uTime * speed; // along direction, animated
      float t = dot(p, n) * scale;                    // across direction

      // Chevron centerline y0(t) as triangular wave of s
      float tri = tri01(s);          // 0..1, apex at 0 or 1
      float v = (tri - 0.5) * 2.0;   // -1..1
      float y0 = amp * v;            // centerline path

      // Width modulation: wider near the apex (v ~ 0)
      float widen = mix(0.55, 1.0, 1.0 - abs(v));
      float w = width * widen;
      float d = abs(t - y0);

      // Soft line with slight jitter to break perfection
      float j = (noise(vec2(s * 2.1, t * 2.1)) - 0.5) * 0.6 * width; // tiny shake
      d = max(0.0, d - j);

      float line = 1.0 - smoothstep(w, w + edge, d);
      debugST = vec2(s, t);
      return line;
    }

    // Screen-space dither pattern to convert alpha into a stipple mask.
    float dither(vec2 fragCoord){
      vec3 magic = vec3(0.06711056, 0.00583715, 52.9829189);
      return fract(magic.z * fract(dot(fragCoord, magic.xy)));
    }

    void main() {
      vec2 p = vWorldXZ;

      // Subtle deep-water banding
      float band = sin(p.x * uBandScale + uTime * 0.3) * 0.5 + 0.5;
      vec3 base = mix(uPrimary, uSecondary, band * uBandStrength + 0.25);

      // Layers
      vec2 st1, st2;
      float L1 = chevronLayer(p, normalize(uDir1), uScale1, uAmp1, uWidth1, uEdge1, uSpeed1, st1);
      float L2 = chevronLayer(p, normalize(uDir2), uScale2, uAmp2, uWidth2, uEdge2, uSpeed2, st2);

      // Combine
      float crests = clamp(L1 * uStrength1 + L2 * uStrength2, 0.0, 1.0);
      vec3 color = mix(base, uFoam, crests);
      float alpha = clamp(uOpacity, 0.0, 1.0);
      if(alpha < dither(gl_FragCoord.xy)) discard;
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: false,
    depthWrite: true,
    depthTest: true,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  return mat;
}
