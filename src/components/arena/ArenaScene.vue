<template>
  <div ref="container" class="w-100 h-100 position-relative" />
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import * as THREE from 'three';
import { useArenaStore } from '@/stores/arenaStore';

const container = ref(null);
const store = useArenaStore();

let renderer; let scene; let camera; let raycaster; let mouse;
let terrainMesh; const cellSize = 1;
let terrainWidth = 0; let terrainHeight = 0;
const overlayGroup = new THREE.Group();
const overlayMeshes = {};
const entityGroup = new THREE.Group();
const entityMeshes = new Map();

function terrainColor(cell) {
  if (!cell.terrain.passable) return new THREE.Color('#333333');
  const moisture = cell.terrain.moisture ?? 0;
  const flora = cell.terrain.flora ?? 0;
  const base = new THREE.Color().setHSL(0.33, Math.min(1, flora), 0.25 + flora * 0.2);
  const wet = new THREE.Color().setHSL(0.55, 0.6, 0.4);
  base.lerp(wet, moisture * 0.5);
  return base;
}

function buildTerrain() {
  if (!store.terrain) return;
  if (terrainMesh) {
    scene.remove(terrainMesh);
    terrainMesh.geometry.dispose();
    terrainMesh.material.dispose();
    terrainMesh = null;
  }
  terrainWidth = store.terrain.length;
  terrainHeight = store.terrain[0].length;
  const geom = new THREE.PlaneGeometry(cellSize, cellSize);
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true });
  const count = terrainWidth * terrainHeight;
  terrainMesh = new THREE.InstancedMesh(geom, mat, count);
  terrainMesh.userData.cells = [];
  let i = 0;
  for (let x = 0; x < terrainWidth; x += 1) {
    for (let y = 0; y < terrainHeight; y += 1) {
      const cell = store.terrain[x][y];
      const matrix = new THREE.Matrix4().makeTranslation(x + 0.5, -(y + 0.5), 0);
      terrainMesh.setMatrixAt(i, matrix);
      terrainMesh.setColorAt(i, terrainColor(cell));
      terrainMesh.userData.cells[i] = { x, y };
      i += 1;
    }
  }
  terrainMesh.instanceMatrix.needsUpdate = true;
  terrainMesh.instanceColor.needsUpdate = true;
  scene.add(terrainMesh);
  camera.left = 0;
  camera.right = terrainWidth;
  camera.top = 0;
  camera.bottom = -terrainHeight;
  camera.updateProjectionMatrix();
}

function updateTerrainColors() {
  if (!terrainMesh) return;
  let i = 0;
  for (let x = 0; x < terrainWidth; x += 1) {
    for (let y = 0; y < terrainHeight; y += 1) {
      terrainMesh.setColorAt(i, terrainColor(store.terrain[x][y]));
      i += 1;
    }
  }
  terrainMesh.instanceColor.needsUpdate = true;
}

const overlayColors = {
  validDestination: new THREE.Color('#52bd22'),
  confirmedPath: new THREE.Color('#6464ff'),
  targeting: new THREE.Color('#ff4500'),
  hover: new THREE.Color('#ffffff'),
};

function rebuildOverlays() {
  Object.values(overlayMeshes).forEach((mesh) => {
    overlayGroup.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  });
  Object.keys(overlayMeshes).forEach((k) => delete overlayMeshes[k]);

  Object.keys(overlayColors).forEach((overlay) => {
    const coords = store.overlayRegistry[overlay];
    if (!coords || coords.length === 0) return;
    const geom = new THREE.PlaneGeometry(cellSize, cellSize);
    const mat = new THREE.MeshBasicMaterial({
      color: overlayColors[overlay],
      transparent: true,
      opacity: overlay === 'hover' ? 0.2 : 0.5,
    });
    const mesh = new THREE.InstancedMesh(geom, mat, coords.length);
    let idx = 0;
    coords.forEach(({ x, y }) => {
      const mtx = new THREE.Matrix4().makeTranslation(x + 0.5, -(y + 0.5), 0.01);
      mesh.setMatrixAt(idx, mtx);
      idx += 1;
    });
    mesh.instanceMatrix.needsUpdate = true;
    overlayGroup.add(mesh);
    overlayMeshes[overlay] = mesh;
  });
}

const factionColors = {
  enemy: 0xff0000,
  ally: 0x00ff00,
  player: 0xffff00,
  neutral: 0x888888,
};

function syncEntities() {
  const used = new Set();
  if (store.entities) {
    for (let x = 0; x < store.entities.length; x += 1) {
      const column = store.entities[x];
      if (!column) continue;
      for (const y in column) {
        const entity = column[y];
        if (!entity) continue;
        let mesh = entityMeshes.get(entity);
        const target = new THREE.Vector3(Number(x) + 0.5, -Number(y) - 0.5, 0.5);
        if (!mesh) {
          const geom = new THREE.CylinderGeometry(0.4, 0.4, 0.6, 12);
          const mat = new THREE.MeshBasicMaterial({ color: factionColors[entity.faction] || factionColors.neutral });
          mesh = new THREE.Mesh(geom, mat);
          mesh.position.copy(target);
          mesh.userData.target = target.clone();
          entityGroup.add(mesh);
          entityMeshes.set(entity, mesh);
        } else {
          mesh.userData.target = target.clone();
          mesh.material.color.setHex(factionColors[entity.faction] || factionColors.neutral);
        }
        mesh.scale.set(entity.hover ? 1.2 : 1, entity.hover ? 1.2 : 1, entity.hover ? 1.2 : 1);
        if (entity.active && !mesh.userData.arrow) {
          const arrowGeo = new THREE.ConeGeometry(0.2, 0.4, 8);
          const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
          const arrow = new THREE.Mesh(arrowGeo, arrowMat);
          arrow.position.set(0, 0, 0.5);
          mesh.add(arrow);
          mesh.userData.arrow = arrow;
        } else if (!entity.active && mesh.userData.arrow) {
          mesh.remove(mesh.userData.arrow);
          mesh.userData.arrow.geometry.dispose();
          mesh.userData.arrow.material.dispose();
          mesh.userData.arrow = null;
        }
        used.add(entity);
      }
    }
  }
  for (const [entity, mesh] of entityMeshes.entries()) {
    if (!used.has(entity)) {
      entityGroup.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
      if (mesh.userData.arrow) {
        mesh.remove(mesh.userData.arrow);
        mesh.userData.arrow.geometry.dispose();
        mesh.userData.arrow.material.dispose();
      }
      entityMeshes.delete(entity);
    }
  }
}

function checkDistance(fromX, fromY, toX, toY) {
  const distX = Math.abs(fromX - toX);
  const distY = Math.abs(fromY - toY);
  return distX + distY;
}

function pathToCell(toX, toY) {
  if (store.moving) return;
  store.clearOverlay('validDestination');
  store.clearPlannedPath();
  const entity = store.entities?.[store.activeRegister.x]?.[store.activeRegister.y];
  if (!entity) return;
  const path = [];
  if (entity.mp.current >= checkDistance(toX, toY, store.activeRegister.x, store.activeRegister.y)) {
    for (let x = Math.min(store.activeRegister.x, toX); x <= Math.max(store.activeRegister.x, toX); x += 1) {
      store.setOverlay({ x, y: store.activeRegister.y, overlay: 'validDestination', boolean: true });
      path.push({ x, y: store.activeRegister.y });
    }
    for (let y = Math.min(store.activeRegister.y, toY); y <= Math.max(store.activeRegister.y, toY); y += 1) {
      store.setOverlay({ x: toX, y, overlay: 'validDestination', boolean: true });
      path.push({ x: toX, y });
    }
  }
  store.setPlannedPath(path);
}

function highlightShape(centerX, centerY, radius, overlay = 'targeting', shape = 'diamond') {
  store.clearOverlay(overlay);
  const x = Number(centerX); const y = Number(centerY);
  if (shape === 'diamond') {
    for (let i = 0; i < terrainWidth; i += 1) {
      for (let j = 0; j < terrainHeight; j += 1) {
        const distX = Math.abs(x - i);
        const distY = Math.abs(y - j);
        if (distX + distY <= radius) {
          store.setOverlay({ x: i, y: j, overlay, boolean: true });
        }
      }
    }
  } else if (shape === 'square') {
    for (let i = x - radius; i <= x + radius; i += 1) {
      for (let j = y - radius; j <= y + radius; j += 1) {
        if (i >= 0 && j >= 0 && i < terrainWidth && j < terrainHeight) {
          store.setOverlay({ x: i, y: j, overlay, boolean: true });
        }
      }
    }
  } else if (shape === 'cross') {
    for (let i = 0; i < terrainWidth; i += 1) store.setOverlay({ x: i, y, overlay, boolean: true });
    for (let j = 0; j < terrainHeight; j += 1) store.setOverlay({ x, y: j, overlay, boolean: true });
  }
}

function cellMouseOver(x, y) {
  store.clearOverlay('hover');
  store.setOverlay({ x, y, overlay: 'hover', boolean: true });
  if (store.shapeOnMouse.show) {
    highlightShape(x, y, store.shapeOnMouse.radius, 'targeting', store.shapeOnMouse.shape);
  } else {
    store.clearOverlay('targeting');
  }
  if (store.playerActive) {
    pathToCell(x, y);
  }
  rebuildOverlays();
}

function handlePointerMove(event) {
  if (!terrainMesh) return;
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersect = raycaster.intersectObject(terrainMesh)[0];
  if (intersect) {
    const cell = terrainMesh.userData.cells[intersect.instanceId];
    cellMouseOver(cell.x, cell.y);
  } else {
    store.clearOverlay('hover');
    store.clearOverlay('validDestination');
    store.clearOverlay('targeting');
    rebuildOverlays();
  }
}

function handleClick() {
  store.movement();
}

function animate() {
  requestAnimationFrame(animate);
  entityMeshes.forEach((mesh) => {
    if (mesh.userData.target) mesh.position.lerp(mesh.userData.target, 0.2);
  });
  renderer.render(scene, camera);
}

onMounted(() => {
  scene = new THREE.Scene();
  scene.add(overlayGroup);
  scene.add(entityGroup);
  camera = new THREE.OrthographicCamera(0, 10, 0, -10, 0.1, 1000);
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.value.clientWidth, container.value.clientHeight);
  container.value.appendChild(renderer.domElement);
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  buildTerrain();
  rebuildOverlays();
  syncEntities();
  renderer.domElement.addEventListener('mousemove', handlePointerMove);
  renderer.domElement.addEventListener('click', handleClick);
  animate();
});

onBeforeUnmount(() => {
  renderer.domElement.removeEventListener('mousemove', handlePointerMove);
  renderer.domElement.removeEventListener('click', handleClick);
  renderer.dispose();
});

watch(() => store.terrain, () => { buildTerrain(); updateTerrainColors(); rebuildOverlays(); }, { deep: true });
watch(() => store.overlayRegistry, () => { rebuildOverlays(); }, { deep: true });
watch(() => store.entities, () => { syncEntities(); }, { deep: true });
watch(() => store.activeRegister, () => { syncEntities(); }, { deep: true });
</script>
