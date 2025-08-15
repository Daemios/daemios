import * as THREE from "three";

// Factory that manages pointer interactions for the world map.
// ctx: {
//   container: DOM element,
//   camera, renderer,
//   getPickMeshes: () => [mesh,...],
//   indexToQR: () => array or map,
//   topIM, hoverMesh, playerMarker, playerMarkerPos,
//   chunkForAxial(q,r) => {wx,wy},
//   setCurrentTile(q,r), apiPost, focusCameraOnQR, addLocationMarkerAtIndex, setCenterChunk,
//   computeTilePosScale, composeTileMatrix, hexMaxY, orbit, updateCameraFromOrbit, cameraTween
// }
export function createPointerControls(ctx) {
  const state = {
    rotating: false,
    dragStart: { x: 0, y: 0 },
    lastPointer: { x: null, y: null },
    mouse: new THREE.Vector2(),
    raycaster: new THREE.Raycaster(),
    raycastScheduled: false,
    hoverIdx: null,
  };

  // Avoid assigning to properties on the ctx parameter (ESLint no-param-reassign).
  const {
    renderer,
    camera,
    getPickMeshes,
    indexToQR,
    hoverMesh,
    playerMarker,
    playerMarkerPos,
    chunkForAxial,
    setCurrentTile,
    apiPost,
    focusCameraOnQR,
    addLocationMarkerAtIndex,
    setCenterChunk,
    computeTilePosScale,
    composeTileMatrix,
    hexMaxY,
    orbit,
    updateCameraFromOrbit,
    cameraTween,
  } = ctx;

  function onPointerDown(event) {
    if (event.button === 2) {
      state.rotating = true;
      state.dragStart.x = event.clientX;
      state.dragStart.y = event.clientY;
      return;
    }
    if (event.button !== 0) return;
  const rect = renderer.domElement.getBoundingClientRect();
  state.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  state.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  state.raycaster.setFromCamera(state.mouse, camera);
  const intersects = state.raycaster.intersectObjects(getPickMeshes(), true);
    if (intersects.length > 0) {
      const hit = intersects[0];
      const idx = hit.instanceId;
      if (idx != null && indexToQR()[idx]) {
        const { q, r } = indexToQR()[idx];
        setCurrentTile(q, r);
        apiPost("world/move", { q, r });
        focusCameraOnQR(q, r, { smooth: true, duration: 700 });
        addLocationMarkerAtIndex(idx);
        const { wx, wy } = chunkForAxial(q, r);
        if (wx !== ctx.centerChunk.x || wy !== ctx.centerChunk.y) {
          setCenterChunk(wx, wy);
        }
      }
    }
  }

  function onPointerMove(event) {
    if (state.rotating) {
      const dx = event.movementX || event.clientX - state.dragStart.x;
      const dy = event.movementY || event.clientY - state.dragStart.y;
  const baseSpeed = 0.0015;
  const adapt = Math.sqrt(orbit.radius) / Math.sqrt(30);
  const rotateSpeed = baseSpeed * adapt;
  orbit.theta -= dx * rotateSpeed;
  orbit.phi -= dy * rotateSpeed;
  orbit.phi = Math.min(orbit.maxPhi, Math.max(orbit.minPhi, orbit.phi));
  updateCameraFromOrbit();
      state.dragStart.x = event.clientX;
      state.dragStart.y = event.clientY;
      return;
    }
    if (cameraTween && cameraTween.active) {
      state.hoverIdx = null;
      if (hoverMesh) hoverMesh.visible = false;
      return;
    }
    const lp = state.lastPointer;
    if (lp.x !== null && lp.y !== null) {
      const dx = Math.abs(event.clientX - lp.x);
      const dy = Math.abs(event.clientY - lp.y);
      if (dx < 1 && dy < 1) return;
    }
    lp.x = event.clientX;
    lp.y = event.clientY;
  const rect = renderer.domElement.getBoundingClientRect();
  state.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  state.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    scheduleRaycast();
  }

  function scheduleRaycast() {
    if (state.raycastScheduled) return;
    state.raycastScheduled = true;
    requestAnimationFrame(() => {
      state.raycastScheduled = false;
      performRaycast();
    });
  }

  function performRaycast() {
    const targets = (getPickMeshes() || []).filter(Boolean);
    if (targets.length === 0) {
      state.hoverIdx = null;
      if (hoverMesh) hoverMesh.visible = false;
      return;
    }
    state.raycaster.setFromCamera(state.mouse, camera);
    const intersects = state.raycaster.intersectObjects(targets, true);
    if (intersects.length > 0) {
      const hit = intersects[0];
      const idx = hit.instanceId;
      if (idx != null && ctx.topIM) {
        if (hoverMesh) {
          const m = composeTileMatrix(idx, "top");
          hoverMesh.matrix.copy(m);
          hoverMesh.visible = true;
        }
        state.hoverIdx = idx;
        if (playerMarker) {
          const ps = computeTilePosScale(idx, "top");
          const pos = playerMarkerPos;
          pos.set(ps.x, hexMaxY * ps.scaleY + 0.01, ps.z);
          playerMarker.setWorldPosition(pos);
        }
      }
    } else {
      state.hoverIdx = null;
      if (hoverMesh) hoverMesh.visible = false;
    }
  }

  function onPointerUp() {
    state.rotating = false;
  }

  function onWheel(e) {
  e.preventDefault();
  const zoomFactor = 1 + (e.deltaY > 0 ? 0.12 : -0.12);
  orbit.radius *= zoomFactor;
  orbit.radius = Math.min(orbit.maxRadius, Math.max(orbit.minRadius, orbit.radius));
  updateCameraFromOrbit();
  }

  function blockContext(e) {
    e.preventDefault();
  }

  function attach() {
    const c = ctx.container;
    if (!c) return;
    c.addEventListener("pointerdown", onPointerDown);
    c.addEventListener("pointermove", onPointerMove);
    c.addEventListener("pointerup", onPointerUp);
    c.addEventListener("pointerleave", onPointerUp);
    c.addEventListener("contextmenu", blockContext);
    c.addEventListener("wheel", onWheel, { passive: false });
  }

  function detach() {
    const c = ctx.container;
    if (!c) return;
    c.removeEventListener("pointerdown", onPointerDown);
    c.removeEventListener("pointermove", onPointerMove);
    c.removeEventListener("pointerup", onPointerUp);
    c.removeEventListener("pointerleave", onPointerUp);
    c.removeEventListener("contextmenu", blockContext);
    c.removeEventListener("wheel", onWheel);
  }

  return {
  attach,
  detach,
  scheduleRaycast: scheduleRaycast,
  performRaycast: performRaycast,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onWheel,
  blockContext,
  };
}
