/* eslint-disable no-param-reassign */
// Utilities to attach and update radial fade shader logic to materials
// Keep these pure and side-effect minimal; caller holds onto returned uniforms refs
import * as THREE from 'three';

export function attachRadialFade(material, { bucketKey, layoutRadius, contactScale }) {
  const uniformsRef = {};
  /* eslint-disable no-param-reassign */
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFadeCenter = { value: new THREE.Vector2(0, 0) };
    shader.uniforms.uFadeRadius = { value: 0 };
    shader.uniforms.uFadeWidth = { value: 0 };
    shader.uniforms.uFadeEnabled = { value: 0 };
    shader.uniforms.uMinHeightScale = { value: 0.05 };
    shader.uniforms.uCullWholeHex = { value: 1 };
    shader.uniforms.uHexCornerRadius = { value: layoutRadius * contactScale };
    shader.uniforms.uXZScale = shader.uniforms.uXZScale || { value: 1.0 };
    if (material && material.userData && material.userData.uXZScale != null) {
      shader.uniforms.uXZScale.value = material.userData.uXZScale;
    }
    const vertDecl = '\n uniform vec2 uFadeCenter; uniform float uFadeRadius; uniform float uFadeWidth; uniform int uFadeEnabled; uniform float uMinHeightScale; uniform int uCullWholeHex; uniform float uHexCornerRadius; uniform float uXZScale;\n attribute vec2 iCenter; attribute float iScaleY;\n varying vec3 vWorldPos; varying vec3 vInstCenter;\n';
    shader.vertexShader = vertDecl + shader.vertexShader
    .replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_ATTR_TRANSFORM
          transformed.xz *= uXZScale;
          transformed.y *= iScaleY;
          vec3 instOffset = vec3(iCenter.x, 0.0, iCenter.y);
          vec4 wcenter = modelMatrix * vec4(instOffset, 1.0);
          vInstCenter = wcenter.xyz;
          vec4 wpos_pre = modelMatrix * vec4(transformed + instOffset, 1.0);
      transformed += instOffset;
        #else
          mat4 imat = mat4(1.0);
          #ifdef USE_INSTANCING
            imat = instanceMatrix;
          #endif
          vec4 wcenter = modelMatrix * imat * vec4(0.0, 0.0, 0.0, 1.0);
          vInstCenter = wcenter.xyz;
          vec4 wpos_pre = modelMatrix * imat * vec4(transformed, 1.0);
        #endif
        float distXZ_v = length(wpos_pre.xz - vec2(uFadeCenter.x, uFadeCenter.y));
        float inner_v = max(0.0, uFadeRadius - uFadeWidth);
        float f_v = float(uFadeEnabled) * smoothstep(inner_v, uFadeRadius, distXZ_v);
        #ifdef TOP_BUCKET
        // top stays uncompressed in Y
        #else
          transformed.y = mix(transformed.y, transformed.y * uMinHeightScale, f_v);
        #endif
      `)
      .replace('#include <beginnormal_vertex>', `vec3 objectNormal = vec3( normal );\n#ifdef USE_ATTR_TRANSFORM\n  objectNormal = normalize( objectNormal / vec3(uXZScale, iScaleY, uXZScale) );\n#endif`)
      // Use our own computed world position to avoid relying on worldPosition symbol presence
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n  vWorldPos = wpos_pre.xyz;');
    const fadeDecl = '\n uniform vec2 uFadeCenter; uniform float uFadeRadius; uniform float uFadeWidth; uniform int uFadeEnabled; uniform float uMinHeightScale; uniform int uCullWholeHex; uniform float uHexCornerRadius;\n varying vec3 vWorldPos; varying vec3 vInstCenter;\n';
    const injectFrag = `
        float distXZ = length(vWorldPos.xz - uFadeCenter);
        if (uFadeEnabled == 1) {
          if (uCullWholeHex == 1) {
            float cDist = length(vInstCenter.xz - uFadeCenter);
            if ((cDist + uHexCornerRadius) >= uFadeRadius) { discard; }
          } else {
            if (distXZ >= uFadeRadius) { discard; }
          }
        }
        #include <premultiplied_alpha_fragment>
    `;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>' + fadeDecl)
      .replace('#include <premultiplied_alpha_fragment>', injectFrag);
    uniformsRef[bucketKey] = shader.uniforms;
  };
  material.needsUpdate = true;
  /* eslint-enable no-param-reassign */
  return uniformsRef;
}

export function attachRadialFadeDepth(material, { bucketKey, layoutRadius, contactScale }) {
  const uniformsRef = {};
  /* eslint-disable no-param-reassign */
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFadeCenter = { value: new THREE.Vector2(0, 0) };
    shader.uniforms.uFadeRadius = { value: 0 };
    shader.uniforms.uFadeWidth = { value: 0 };
    shader.uniforms.uFadeEnabled = { value: 0 };
    shader.uniforms.uMinHeightScale = { value: 0.05 };
    shader.uniforms.uCullWholeHex = { value: 1 };
    shader.uniforms.uHexCornerRadius = { value: layoutRadius * contactScale };
    shader.uniforms.uXZScale = shader.uniforms.uXZScale || { value: 1.0 };
    if (material && material.userData && material.userData.uXZScale != null) {
      shader.uniforms.uXZScale.value = material.userData.uXZScale;
    }
    const vertDecl = '\n uniform vec2 uFadeCenter; uniform float uFadeRadius; uniform float uFadeWidth; uniform int uFadeEnabled; uniform float uMinHeightScale; uniform int uCullWholeHex; uniform float uHexCornerRadius; uniform float uXZScale;\n attribute vec2 iCenter; attribute float iScaleY;\n varying vec3 vWorldPos; varying vec3 vInstCenter;\n';
    shader.vertexShader = vertDecl + shader.vertexShader
    .replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_ATTR_TRANSFORM
          transformed.xz *= uXZScale;
          transformed.y *= iScaleY;
          vec3 instOffset = vec3(iCenter.x, 0.0, iCenter.y);
          vec4 wcenter = modelMatrix * vec4(instOffset, 1.0);
          vInstCenter = wcenter.xyz;
          vec4 wpos_pre = modelMatrix * vec4(transformed + instOffset, 1.0);
      transformed += instOffset;
        #else
          mat4 imat = mat4(1.0);
          #ifdef USE_INSTANCING
            imat = instanceMatrix;
          #endif
          vec4 wcenter = modelMatrix * imat * vec4(0.0, 0.0, 0.0, 1.0);
          vInstCenter = wcenter.xyz;
          vec4 wpos_pre = modelMatrix * imat * vec4(transformed, 1.0);
        #endif
        float distXZ_v = length(wpos_pre.xz - vec2(uFadeCenter.x, uFadeCenter.y));
        float inner_v = max(0.0, uFadeRadius - uFadeWidth);
        float f_v = float(uFadeEnabled) * smoothstep(inner_v, uFadeRadius, distXZ_v);
        transformed.y = mix(transformed.y, transformed.y * uMinHeightScale, f_v);
      `)
      .replace('#include <beginnormal_vertex>', `vec3 objectNormal = vec3( normal );\n#ifdef USE_ATTR_TRANSFORM\n  objectNormal = normalize( objectNormal / vec3(uXZScale, iScaleY, uXZScale) );\n#endif`)
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n  vWorldPos = wpos_pre.xyz;');
    const fadeDecl = '\n uniform vec2 uFadeCenter; uniform float uFadeRadius; uniform float uFadeWidth; uniform int uFadeEnabled; uniform float uMinHeightScale; uniform int uCullWholeHex; uniform float uHexCornerRadius;\n varying vec3 vWorldPos; varying vec3 vInstCenter;\n';
    const injectFrag = `
        float distXZ = length(vWorldPos.xz - uFadeCenter);
        if (uFadeEnabled == 1) {
          if (uCullWholeHex == 1) {
            float cDist = length(vInstCenter.xz - uFadeCenter);
            if ((cDist + uHexCornerRadius) >= uFadeRadius) { discard; }
          } else {
            if (distXZ >= uFadeRadius) { discard; }
          }
        }
    `;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>' + fadeDecl)
      .replace('#include <dithering_fragment>', `${injectFrag}\n#include <dithering_fragment>`);
    uniformsRef[bucketKey] = shader.uniforms;
  };
  material.needsUpdate = true;
  /* eslint-enable no-param-reassign */
  return uniformsRef;
}

export function updateRadialFadeUniforms(uniformsMap, { center, radius, width, enabled, minHeightScale, hexCornerRadius }) {
  if (!uniformsMap) return;
  /* eslint-disable no-param-reassign */
  const set = (u) => {
    if (!u) return;
    if (u.uFadeCenter && u.uFadeCenter.value) u.uFadeCenter.value.set(center.x, center.y);
    if (u.uFadeRadius) u.uFadeRadius.value = radius;
    if (u.uFadeWidth) u.uFadeWidth.value = width;
    if (u.uFadeEnabled) u.uFadeEnabled.value = enabled ? 1 : 0;
    if (u.uMinHeightScale) u.uMinHeightScale.value = minHeightScale != null ? minHeightScale : 0.05;
    if (u.uHexCornerRadius) u.uHexCornerRadius.value = hexCornerRadius;
    if (u.uCullWholeHex) u.uCullWholeHex.value = 1;
  };
  /* eslint-enable no-param-reassign */
  set(uniformsMap.top);
  set(uniformsMap.side);
}
