const ICON_MAP = {
  LIQUID: "water",
  CONSUMABLES: "food-apple",
  PACK: "backpack",
  BACKPACK: "backpack",
  POCKETS: "hand",
};

export function iconForContainerType(type) {
  const key = String(type || "BASIC").toUpperCase();
  return Object.prototype.hasOwnProperty.call(ICON_MAP, key)
    ? ICON_MAP[key]
    : null;
}

export function mapContainersForClient(containers, mapItemForClient) {
  if (!Array.isArray(containers)) return [];
  return containers.map((container) =>
    mapContainerForClient(container, mapItemForClient)
  );
}

export function mapContainerForClient(container, mapItemForClient) {
  if (!container) return null;
  const items = Array.isArray(container.items)
    ? container.items.map((it) =>
        typeof mapItemForClient === "function"
          ? mapItemForClient(it)
          : it
      )
    : [];
  items.sort((a, b) => {
    const ai = Number.isInteger(a && a.containerIndex) ? a.containerIndex : 0;
    const bi = Number.isInteger(b && b.containerIndex) ? b.containerIndex : 0;
    return ai - bi;
  });
  return {
    ...container,
    containerType: container.containerType || "BASIC",
    icon: iconForContainerType(container.containerType),
    items,
  };
}
