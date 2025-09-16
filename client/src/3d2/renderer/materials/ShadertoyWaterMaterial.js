import * as THREE from 'three';

// Shadertoy-inspired water material (third variant)
// This material adapts the supplied GLSL mainImage into a lightweight
// ShaderMaterial suitable for our WorldMap. It's intentionally simple and
// stylized; it uses the precomputed distance/coverage/seabed textures the
// other materials expect so it can be plugged into the existing pipeline.

export default function createShadertoyWaterMaterial(opts = {}) {
  const uniforms = {
    uTime: { value: 0.0 },
    iTime: { value: 0.0 }, // legacy alias
    uResolution: { value: new THREE.Vector3(1024, 1024, 1) },
    uDist: { value: opts.distanceTexture || null },
    uCoverage: { value: opts.coverageTexture || null },
    uSeabed: { value: opts.seabedTexture || null },
    uHexW: { value: opts.hexW || 1.0 },
    uHexH: { value: opts.hexH || 1.0 },
    uGridW: { value: opts.gridW || 1 },
    uGridH: { value: opts.gridH || 1 },
    uGridQMin: { value: opts.gridQMin || 0 },
    uGridRMin: { value: opts.gridRMin || 0 },
  };

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

  // Adapted fragment shader from the supplied shadertoy code. Simplified and
  // reworked to sample our precomputed textures and expose a pleasing color.
  const fragmentShader = `
    precision mediump float;
    varying vec2 vUv;
    varying vec3 vWorldPos;
    uniform float uTime;
    uniform float iTime;
    uniform vec3 uResolution;
    uniform sampler2D uDist;
    uniform sampler2D uCoverage;
    uniform sampler2D uSeabed;
    uniform float uHexW;
    uniform float uHexH;
    uniform float uGridW;
    uniform float uGridH;
    uniform float uGridQMin;
    uniform float uGridRMin;

    mat2 rotate2D(float r){ return mat2(cos(r), sin(r), -sin(r), cos(r)); }

    // Small helper to map world XZ into the precomputed grid UVs (same as other materials)
    vec2 worldToGridUV(vec2 xz){
      float q = xz.x / uHexW;
      float r = xz.y / uHexH - q * 0.5;
      float iq = (q - uGridQMin);
      float ir = (r - uGridRMin);
      float u = (iq + 0.5) / max(1.0, uGridW);
      float v = (ir + 0.5) / max(1.0, uGridH);
      return vec2(u, v);
    }

    float sampleDist(vec2 xz){
      vec2 uv = worldToGridUV(xz);
      if(uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return -100.0;
      return texture2D(uDist, uv).r;
    }

    void main(){
      // support either uniform name
      float t = (uTime > 0.0) ? uTime : iTime;
      vec2 fragCoord = gl_FragCoord.xy;
      vec2 uv = vUv;
      vec2 res = uResolution.xy;

      float o = 0.0;
      float g = 0.0;
      float e = 0.0;
      float f = 0.0;
      float s = 0.0;
      float k = 0.01;

      // derive a simple normalized coordinate in world units for large-scale coherence
      vec2 xz = vWorldPos.xz;

      // iterate a few times to generate layered bands - lighter than original for perf
      for(int i=0;i<40;i++){
        s = 2.0;
        g += min(f, max(0.03, e)) * 0.3;
        vec3 p = vec3((fragCoord.xy - res.xy / s) / res.y * g, g - s);
        p.yz *= rotate2D(-0.8);
        p.y *= 2.5;
        p.z += t * 1.3;
        e = p.y;
        f = p.y;
        for(; s < 10.0; ){
          s /= 0.66;
          p.xz *= rotate2D(s);
          e += abs(dot(sin(p * s) / s, p - p + 0.6));
          f += abs(dot(sin(p.xz * s * 0.33 + (t * 0.5)) / s, vec2(1.0)));
        }
        if(f > k * k) o += e * o * k; else o += -exp(-f * f) * o * k;
      }

      // Use the precomputed signed distance to create a shore fade
      float signedDist = sampleDist(xz);
      float shore = smoothstep(0.0, 0.5, -signedDist);

      // Color mapping - bluish water with teal accents
      vec3 col = vec3(0.33, 0.7, 0.85) * clamp(o * 0.02 + 0.08, 0.0, 1.0);
      col = mix(vec3(0.12,0.4,0.6), col, clamp(shore, 0.0, 1.0));

      float alpha = mix(0.85, 0.25, clamp(shore, 0.0, 1.0));
      gl_FragColor = vec4(col, alpha);
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
