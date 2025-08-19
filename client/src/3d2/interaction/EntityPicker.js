import * as THREE from 'three';

// EntityPicker: manages pointer raycasting, hover and selection for a scene's entity group.
export class EntityPicker {
  constructor({ camera, dom, getObjects, container } = {}) {
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
    if (!this.dom || !this.camera) return;
    const rect = this.dom.getBoundingClientRect();
    this.pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const objs = this.getObjects() || [];
    const intersects = this.raycaster.intersectObjects(objs, false);
    if (intersects.length) {
      const hit = intersects[0].object;
      if (this._hovered !== hit) {
        if (this._hovered) {
          try {
            this._hovered.material && (this._hovered.material.emissive && this._hovered.material.emissive.setHex(0x000000));
          } catch (e) { /* ignore */ }
          this._hovered.scale && this._hovered.scale.set(1,1,1);
        }
        this._hovered = hit;
        try { if (this._hovered.material && this._hovered.material.emissive) this._hovered.material.emissive.setHex(0x222222); } catch (e) { /* ignore */ }
        this._hovered.scale && this._hovered.scale.set(1.2,1.2,1.2);
      }
    } else {
      if (this._hovered) {
        try { if (this._hovered.material && this._hovered.material.emissive) this._hovered.material.emissive.setHex(0x000000); } catch (e) { /* ignore */ }
        this._hovered.scale && this._hovered.scale.set(1,1,1);
        this._hovered = null;
      }
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
      const hit = intersects[0].object;
      if (this._selectedMesh && this._selectedMesh !== hit) {
        try { if (this._selectedMesh.material && this._selectedMesh.material.emissive) this._selectedMesh.material.emissive.setHex(0x000000); } catch (e) { /* ignore */ }
        this._selectedMesh.scale && this._selectedMesh.scale.set(1,1,1);
      }
      this._selected = hit.userData ? hit.userData.entity : null;
      this._selectedMesh = hit;
      try { if (hit.material && hit.material.emissive) hit.material.emissive.setHex(0x444400); } catch (e) { /* ignore */ }
      hit.scale && hit.scale.set(1.4,1.4,1.4);

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
