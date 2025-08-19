// Thin wrapper to create OrbitControls in a safe, dynamic way.
// Returns a Promise resolving to controls (or a safe stub) and accepts
// options and callbacks: onChange, onStart, onEnd.

export async function createOrbitControls(camera, dom, opts = {}) {
  try {
    const mod = await import('three/examples/jsm/controls/OrbitControls.js');
    const OrbitControls = mod.OrbitControls || mod.default || mod;
    const controls = new OrbitControls(camera, dom);

    // apply common options
    if (typeof opts.enableDamping !== 'undefined') controls.enableDamping = !!opts.enableDamping;
    if (typeof opts.dampingFactor !== 'undefined') controls.dampingFactor = opts.dampingFactor;
    if (typeof opts.screenSpacePanning !== 'undefined') controls.screenSpacePanning = !!opts.screenSpacePanning;
    if (typeof opts.minDistance === 'number') controls.minDistance = opts.minDistance;
    if (typeof opts.maxDistance === 'number') controls.maxDistance = opts.maxDistance;

    // wire callbacks
    if (typeof opts.onChange === 'function') controls.addEventListener('change', opts.onChange);
    if (typeof opts.onStart === 'function') controls.addEventListener('start', opts.onStart);
    if (typeof opts.onEnd === 'function') controls.addEventListener('end', opts.onEnd);

    // helper to clean up
    controls.disposeSafe = function () {
      try {
        if (typeof opts.onChange === 'function') controls.removeEventListener('change', opts.onChange);
        if (typeof opts.onStart === 'function') controls.removeEventListener('start', opts.onStart);
        if (typeof opts.onEnd === 'function') controls.removeEventListener('end', opts.onEnd);
      } catch (e) {}
      try { controls.dispose && controls.dispose(); } catch (e) {}
    };

    return controls;
  } catch (e) {
    // Fallback stub so callers can safely call methods without checking for null.
    const stub = {
      enableDamping: false,
      dampingFactor: 0,
      screenSpacePanning: false,
      minDistance: 0,
      maxDistance: Infinity,
      update() {},
      dispose() {},
      addEventListener() {},
      removeEventListener() {},
      disposeSafe() {},
      target: { set() {}, x: 0, y: 0, z: 0 },
    };
    return stub;
  }
}

export default { createOrbitControls };
