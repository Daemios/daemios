export { mapItemForClient } from '../common/presentation';

export function makePocketsPlaceholder(pockets: any) {
  return { id: null, label: 'Pockets', img: null, isContainer: true, containerId: pockets.id, capacity: pockets.capacity || 0 };
}
