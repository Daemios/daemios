import * as THREE from 'three';

// EntityPicker: manages pointer raycasting, hover and selection for a scene's entity group.
export class EntityPicker {
  constructor({ camera, dom, getObjects, container, hoverFrameSkip } = {}) {
    this.camera = camera || null;
    this.dom = dom || null;
    this.getObjects = typeof getObjects === 'function' ? getObjects : () => [];
    this.container = container || null; // optional DOM element to dispatch events on

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this._hovered = null;
    this._selected = null;
    this._selectedMesh = null;
    this._onSelect = null;

    this._boundPointerMove = null;
    this._boundPointerDown = null;
    this._attached = false;
  // throttle state for hover processing
  this._hoverScheduled = false;
  this._hoverRafId = null;
  // run hover processing only every N frames to reduce raycast frequency
  this._hoverFrameSkip = (typeof hoverFrameSkip === 'number' && hoverFrameSkip > 0) ? Math.max(1, Math.floor(hoverFrameSkip)) : 3;
  this._hoverFrameCounter = 0;
  }

  attach(dom) {
    // allow overriding dom at attach-time
    if (dom) this.dom = dom;
    if (!this.dom) return;
    if (this._attached) return;
    this._boundPointerMove = this._onPointerMove.bind(this);
    this._boundPointerDown = this._onPointerDown.bind(this);
  this.dom.addEventListener('pointermove', this._boundPointerMove);
    this.dom.addEventListener('pointerdown', this._boundPointerDown);
    this._attached = true;
  }

  detach() {
    try {
      if (this.dom && this._attached) {
        this.dom.removeEventListener('pointermove', this._boundPointerMove);
        this.dom.removeEventListener('pointerdown', this._boundPointerDown);
      }
    } catch (e) {
      // ignore
    }
  // cancel any pending hover rAF and reset counters
  try { if (this._hoverRafId) cancelAnimationFrame(this._hoverRafId); } catch (e) { /* ignore */ }
  this._hoverRafId = null;
  this._hoverScheduled = false;
  this._hoverFrameCounter = 0;
  this._attached = false;
    this._boundPointerMove = null;
    this._boundPointerDown = null;
  }

  setOnSelect(cb) {
    this._onSelect = typeof cb === 'function' ? cb : null;
  }

  getSelected() {
    return this._selected;
  }

  // internal helpers
  _onPointerMove(ev) {
    // Throttle hover raycasts to once per animation frame to avoid high CPU on rapid mouse move
    if (!this.dom || !this.camera) return;
    const rect = this.dom.getBoundingClientRect();
    this.pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    // schedule processing on next rAF if not already scheduled
    if (!this._hoverScheduled) {
      this._hoverScheduled = true;
      this._hoverRafId = requestAnimationFrame(() => {
      this._hoverScheduled = false;
        this._hoverRafId = null;
        this._processHover();
      });
    }
  }

  _processHover() {
    if (!this.dom || !this.camera) return;
    try {
      // Only process hover on every _hoverFrameSkip'th invocation to reduce work
      this._hoverFrameCounter = (this._hoverFrameCounter + 1);
      if ((this._hoverFrameCounter % this._hoverFrameSkip) !== 0) return;
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const objs = this.getObjects() || [];
      const intersects = objs && objs.length ? this.raycaster.intersectObjects(objs, false) : [];
      if (intersects.length) {
        const hit = intersects[0].object;
        if (this._hovered !== hit) {
          if (this._hovered) {
            try {
              if (!this._hovered.isInstancedMesh) {
                this._hovered.material && (this._hovered.material.emissive && this._hovered.material.emissive.setHex(0x000000));
              }
            } catch (e) { /* ignore */ }
            this._hovered.scale && !this._hovered.isInstancedMesh && this._hovered.scale.set(1,1,1);
          }
          this._hovered = hit;
          try { if (this._hovered.material && this._hovered.material.emissive && !this._hovered.isInstancedMesh) this._hovered.material.emissive.setHex(0x222222); } catch (e) { /* ignore */ }
          this._hovered.scale && !this._hovered.isInstancedMesh && this._hovered.scale.set(1.2,1.2,1.2);
        }
      } else {
        if (this._hovered) {
          try { if (this._hovered.material && this._hovered.material.emissive && !this._hovered.isInstancedMesh) this._hovered.material.emissive.setHex(0x000000); } catch (e) { /* ignore */ }
          this._hovered.scale && !this._hovered.isInstancedMesh && this._hovered.scale.set(1,1,1);
          this._hovered = null;
        }
      }
    } catch (e) {
      // don't let hover errors kill the app loop
      console.debug('EntityPicker: _processHover failed', e);
    }
  }

  _onPointerDown(ev) {
    if (!this.dom || !this.camera) return;
    const rect = this.dom.getBoundingClientRect();
    this.pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const objs = this.getObjects() || [];
    const intersects = this.raycaster.intersectObjects(objs, false);
    if (intersects.length) {
      const inter = intersects[0];
      const hit = inter.object;
      // clear previous selected mesh visual
      if (this._selectedMesh && this._selectedMesh !== hit) {
        try { if (this._selectedMesh.material && this._selectedMesh.material.emissive && !this._selectedMesh.isInstancedMesh) this._selectedMesh.material.emissive.setHex(0x000000); } catch (e) { /* ignore */ }
        this._selectedMesh.scale && !this._selectedMesh.isInstancedMesh && this._selectedMesh.scale.set(1,1,1);
      }

      // If the intersection contains an instanceId, surface instance-aware detail
      let selectedDetail = null;
      if (typeof inter.instanceId === 'number' && inter.instanceId >= 0) {
        // include the hit point so callers can map world position -> axial coords
        selectedDetail = { object: hit, instanceId: inter.instanceId, pos: inter.point };
      } else {
        // non-instanced mesh: prefer userData.entity shape for backward compatibility
        selectedDetail = hit.userData ? hit.userData.entity : null;
      }

  this._selected = selectedDetail;
  this._selectedMesh = hit;
  try { if (hit.material && hit.material.emissive && !hit.isInstancedMesh) hit.material.emissive.setHex(0x444400); } catch (e) { /* ignore */ }
  // scaling an instancedMesh won't target a single instance, so guard the call
  try { if (!hit.isInstancedMesh && hit.scale) hit.scale.set(1.4,1.4,1.4); } catch (e) { /* ignore */ }

      // dispatch DOM event on container for external listeners
      try {
        if (this.container && this.container.dispatchEvent) {
          const evt = new CustomEvent('worldmap:select', { detail: this._selected });
          this.container.dispatchEvent(evt);
        }
      } catch (e) { /* ignore */ }

      if (typeof this._onSelect === 'function') {
        try { this._onSelect(this._selected); } catch (e) { /* ignore callback errors */ }
      }
    }
  }
}

export default EntityPicker;
