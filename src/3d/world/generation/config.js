// Runtime loader for world generation JSON configuration.
// The configuration describes macro geography, warp fields, plates and detail
// tuning as outlined in docs/world_generation_2.0.

export async function loadWorldGenConfig(url = '/worldgen-2.0.json') {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    // Swallow errors so callers can continue with defaults.
    return null;
  }
}

