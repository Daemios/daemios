const FALLBACK_IMAGE = '/img/debug/placeholder.png';

export function mapItemForClient(it: any) {
  if (!it) return null;
  const img = it.image || it.img || FALLBACK_IMAGE;
  const label = it.label || it.name || it.displayName || null;
  const itemType = it.itemType != null ? String(it.itemType) : null;
  return { ...it, img, label, itemType };
}
