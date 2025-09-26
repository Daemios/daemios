export function mapItemForClient(it: any) {
  if (!it) return null;
  const img = it.image || it.img || '/img/debug/placeholder.png';
  return { ...it, img, label: it.label || it.name || (it.displayName || null) };
}

export function makePocketsPlaceholder(pockets: any) {
  return { id: null, label: 'Pockets', img: null, isContainer: true, containerId: pockets.id, capacity: pockets.capacity || 0 };
}
