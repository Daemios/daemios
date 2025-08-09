<template>
  <div ref="container" class="w-100 h-100 position-relative" />
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import * as THREE from 'three';
import { useArenaStore } from '@/stores/arenaStore';
import cellColors from '@/mixins/cell_colors';

const container = ref(null);
const store = useArenaStore();
let renderer; let scene; let camera; let raycaster; let mouse;
let terrainMesh; const cellSize = 1;
let terrainWidth = 0; let terrainHeight = 0;
let entityGroup;

function getCellColor(cell) {
  if (!cell.terrain.passable) return '#444444';
  let hue; let sat; let light;
  if (cell.terrain.moisture > 0.7) {
    hue = 205; sat = 100; light = 40;
  } else {
    hue = 95; sat = 100 * cell.terrain.flora; light = 30;
  }
  return cellColors.hslToHex(hue, sat, light);
}

function buildTerrain() {
  if (!store.terrain) return;
  if (terrainMesh) { scene.remove(terrainMesh); terrainMesh.geometry.dispose(); terrainMesh.material.dispose(); }
  terrainWidth = store.terrain.length;
  terrainHeight = store.terrain[0].length;
  const geometry = new THREE.PlaneGeometry(cellSize, cellSize);
  const material = new THREE.MeshBasicMaterial({ vertexColors: true });
  const count = terrainWidth * terrainHeight;
  terrainMesh = new THREE.InstancedMesh(geometry, material, count);
  terrainMesh.userData.cells = [];
  let i = 0;
  for (let x = 0; x < terrainWidth; x += 1) {
    for (let y = 0; y < terrainHeight; y += 1) {
      const cell = store.terrain[x][y];
      const matrix = new THREE.Matrix4().makeTranslation(x + 0.5, -(y + 0.5), 0);
      terrainMesh.setMatrixAt(i, matrix);
      terrainMesh.setColorAt(i, new THREE.Color(getCellColor(cell)));
      terrainMesh.userData.cells[i] = { x, y };
      i += 1;
    }
  }
  terrainMesh.instanceMatrix.needsUpdate = true;
  terrainMesh.instanceColor.needsUpdate = true;
  scene.add(terrainMesh);
  camera.left = 0; camera.right = terrainWidth; camera.top = 0; camera.bottom = -terrainHeight; camera.updateProjectionMatrix();
}

function updateCellColors() {
  if (!terrainMesh) return;
  let i = 0;
  for (let x = 0; x < terrainWidth; x += 1) {
    for (let y = 0; y < terrainHeight; y += 1) {
      let color = getCellColor(store.terrain[x][y]);
      const overlays = store.overlays?.[x]?.[y];
      if (overlays?.confirmedPath) color = '#6464ff';
      else if (overlays?.validDestination) color = '#52bd22';
      else if (overlays?.targeting) color = '#ff4500';
      terrainMesh.setColorAt(i, new THREE.Color(color));
      i += 1;
    }
  }
  terrainMesh.instanceColor.needsUpdate = true;
}

function buildEntities() {
  if (!entityGroup) return;
  while (entityGroup.children.length) {
    const c = entityGroup.children.pop();
    c.geometry?.dispose?.();
    c.material?.dispose?.();
  }
  if (!store.entities) return;
  for (let x = 0; x < store.entities.length; x += 1) {
    const column = store.entities[x];
    if (!column) continue;
    for (const y in column) {
      const entity = column[y];
      if (!entity) continue;
      const geom = new THREE.SphereGeometry(0.3, 16, 16);
      let col = 0x0000ff;
      if (entity.faction === 'enemy') col = 0xff0000;
      else if (entity.faction === 'ally') col = 0x00ff00;
      else if (entity.faction === 'player') col = 0xffff00;
      const mat = new THREE.MeshBasicMaterial({ color: col });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(Number(x) + 0.5, -Number(y) - 0.5, 0.5);
      if (entity.active) {
        const aGeo = new THREE.ConeGeometry(0.2, 0.5, 8);
        const aMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const arrow = new THREE.Mesh(aGeo, aMat);
        arrow.position.set(0, 0, 0.6);
        mesh.add(arrow);
      }
      entityGroup.add(mesh);
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
  const entity = store.entities?.[store.activeRegister.x]?.[store.activeRegister.y];
  if (!entity) return;
  if (entity.mp.current >= checkDistance(toX, toY, store.activeRegister.x, store.activeRegister.y)) {
    for (let x = Math.min(store.activeRegister.x, toX); x <= Math.max(store.activeRegister.x, toX); x += 1) {
      store.setOverlay({ x, y: store.activeRegister.y, overlay: 'validDestination', boolean: true });
    }
    for (let y = Math.min(store.activeRegister.y, toY); y <= Math.max(store.activeRegister.y, toY); y += 1) {
      store.setOverlay({ x: toX, y, overlay: 'validDestination', boolean: true });
    }
  }
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
  if (store.shapeOnMouse.show) {
    highlightShape(x, y, store.shapeOnMouse.radius, 'targeting', store.shapeOnMouse.shape);
  }
  if (store.playerActive) {
    pathToCell(x, y);
  }
  updateCellColors();
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
  }
}

function handleClick(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersect = raycaster.intersectObject(terrainMesh)[0];
  if (intersect) {
    store.movement();
  }
}

onMounted(() => {
  scene = new THREE.Scene();
  entityGroup = new THREE.Group();
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
  buildEntities();
  renderer.domElement.addEventListener('mousemove', handlePointerMove);
  renderer.domElement.addEventListener('click', handleClick);
  const animate = () => { requestAnimationFrame(animate); renderer.render(scene, camera); };
  animate();
});

onBeforeUnmount(() => {
  renderer.domElement.removeEventListener('mousemove', handlePointerMove);
  renderer.domElement.removeEventListener('click', handleClick);
  renderer.dispose();
});

watch(() => store.terrain, () => { buildTerrain(); updateCellColors(); }, { deep: true });
watch(() => store.overlays, () => { updateCellColors(); }, { deep: true });
watch(() => store.entities, () => { buildEntities(); }, { deep: true });
watch(() => store.activeRegister, () => { buildEntities(); }, { deep: true });
</script>
