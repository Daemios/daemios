// inventoryDiff.js
// Utility to apply normalized inventory/equipment diffs received from the server
// onto a client-side store. Designed to be defensive and to interoperate with
// existing store APIs used across the project (setInventory, setCharacter,
// setNestableInventory, mapItemForClient).

function clone(v) {
  try {
    return JSON.parse(JSON.stringify(v));
  } catch (e) {
    return v;
  }
}

function normalizeItemForClient(it, mapItemForClient) {
  if (!it) return null;
  if (typeof mapItemForClient === "function") return mapItemForClient(it);
  // best-effort mapping used by InventoryPanel and other UI components
  return {
    id: it.id ?? it.itemId ?? null,
    label: it.label ?? it.name ?? null,
    img: it.img ?? it.image ?? "/img/debug/placeholder.png",
    containerIndex: it.containerIndex ?? it.index ?? null,
    // keep original payload for any other fields UI may need
    __raw: it,
  };
}

/**
 * Apply a server-sent inventory diff to the provided store-like object.
 *
 * Contract (assumptions):
 * - diff is an object shaped like the example in the issue. It may contain:
 *   - containers: either an Array (authoritative full containers list) OR
 *     an object mapping container identifiers to partial updates.
 *     Partial container update may be either a full container object, or
 *     a { slots: { index: item|null, ... }, capacity_updated: bool } shape.
 *   - equipment: Array of equipment slot updates (slot name + Item or itemId)
 *   - capacity_updated: boolean (global indicator)
 *
 * - stores: an object containing the minimal store API used by the function:
 *   { inventory, character, setInventory, setCharacter, setNestableInventory, mapItemForClient }
 *
 * Returns: { inventory, character, applied } where applied contains metadata
 * about what changed (containerIds, equipmentSlots) which can be used by the UI
 * to select animations or notifications.
 */
export async function applyInventoryDiff(diff, stores = {}) {
  if (!diff || typeof diff !== "object") return { applied: {} };

  const {
    inventory: currentInventory = [],
    character: currentCharacter = {},
    setInventory,
    setCharacter,
    setNestableInventory,
    mapItemForClient,
  } = stores;

  const applied = { containerIds: new Set(), equipmentSlots: new Set() };

  // If server returned full containers array, prefer authoritative replace
  if (Array.isArray(diff.containers)) {
    const mapped = (diff.containers || []).map((c) => {
      if (!c) return c;
      const items = Array.isArray(c.items)
        ? c.items.map((it) => normalizeItemForClient(it, mapItemForClient))
        : [];
      return { ...c, items };
    });
    if (typeof setInventory === "function") setInventory(mapped);
    applied.containerIds = new Set((mapped || []).map((c) => c && c.id));
  } else if (diff.containers && typeof diff.containers === "object") {
    // Partial container updates
    const inv = clone(Array.isArray(currentInventory) ? currentInventory : []);
    const mappingKeys = Object.keys(diff.containers || {});

    for (const key of mappingKeys) {
      const rawUpdate = diff.containers[key];
      // attempt to determine container id from the update or key
      const containerId =
        rawUpdate && rawUpdate.id != null ? String(rawUpdate.id) : String(key);

      // find existing container by id
      let target = inv.find((c) => String(c && c.id) === containerId);

      // if the update is a full container object, replace/merge it
      if (rawUpdate && rawUpdate.items && Array.isArray(rawUpdate.items)) {
        const mappedItems = rawUpdate.items.map((it) =>
          normalizeItemForClient(it, mapItemForClient)
        );
        if (target) {
          // shallow merge while preserving other container attrs
          Object.assign(target, { ...rawUpdate, items: mappedItems });
        } else {
          inv.push({ ...rawUpdate, items: mappedItems });
        }
        applied.containerIds.add(containerId);
        continue;
      }

      // support slot-level diffs: { slots: { '0': null, '1': {...} }, capacity_updated: true }
      if (rawUpdate && rawUpdate.slots && typeof rawUpdate.slots === "object") {
        if (!target) {
          // try to create a minimal container entry so we can apply slots to it
          target = {
            id: isNaN(Number(containerId)) ? containerId : Number(containerId),
            items: [],
          };
          inv.push(target);
        }

        // ensure items array exists
        if (!Array.isArray(target.items)) target.items = [];

        for (const slotKey of Object.keys(rawUpdate.slots)) {
          const slotIndex = Number(slotKey);
          const slotVal = rawUpdate.slots[slotKey];

          if (slotVal === null) {
            // remove any item occupying this slot
            target.items = (target.items || []).filter(
              (it) => it.containerIndex !== slotIndex
            );
            applied.containerIds.add(containerId);
            continue;
          }

          // slotVal is an item representation; upsert into target.items
          const normalized = normalizeItemForClient(slotVal, mapItemForClient);
          normalized.containerIndex = slotIndex;

          // remove any duplicate occupying the same slot
          target.items = (target.items || []).filter(
            (it) =>
              it.containerIndex !== slotIndex &&
              String(it && it.id) !== String(normalized.id)
          );
          target.items.push(normalized);
          applied.containerIds.add(containerId);
        }

        // update capacity if provided
        if (rawUpdate.capacity_updated && rawUpdate.capacity != null) {
          target.capacity = rawUpdate.capacity;
          applied.containerIds.add(containerId);
        }
        continue;
      }

      // fallback: if update looks like a single item object, try to upsert into found container
      if (rawUpdate && (rawUpdate.id || rawUpdate.itemId)) {
        const normalized = normalizeItemForClient(rawUpdate, mapItemForClient);
        if (!target) {
          target = { id: containerId, items: [normalized] };
          inv.push(target);
        } else {
          // replace item with same id or append
          target.items = (target.items || []).filter(
            (it) => String(it.id) !== String(normalized.id)
          );
          target.items.push(normalized);
        }
        applied.containerIds.add(containerId);
        continue;
      }
    }

    if (typeof setInventory === "function") setInventory(inv);
  }

  // equipment (paper-doll) updates
  if (Array.isArray(diff.equipment) && typeof setCharacter === "function") {
    const newChar = clone(currentCharacter || {});
    if (!newChar.equipped) newChar.equipped = {};
    for (const eq of diff.equipment) {
      const slotKey = String((eq && eq.slot) || "").toLowerCase();
      if (!slotKey) continue;
      if (eq.Item) {
        const mapped = normalizeItemForClient(eq.Item, mapItemForClient);
        newChar.equipped[slotKey] = mapped;
        applied.equipmentSlots.add(slotKey);
      } else if (eq.itemId != null) {
        newChar.equipped[slotKey] = { id: eq.itemId };
        applied.equipmentSlots.add(slotKey);
      } else {
        newChar.equipped[slotKey] = null;
        applied.equipmentSlots.add(slotKey);
      }
    }
    setCharacter(newChar);
  }

  // nestable containers authoritative replacement
  if (
    Array.isArray(diff.nestableContainers) &&
    typeof setNestableInventory === "function"
  ) {
    const mapped = diff.nestableContainers.map((c) => ({ ...c }));
    setNestableInventory(mapped);
  }

  // finalize applied metadata into arrays for convenience
  return {
    inventory: typeof setInventory === "function" ? undefined : undefined,
    character: typeof setCharacter === "function" ? undefined : undefined,
    applied: {
      containerIds: Array.from(applied.containerIds),
      equipmentSlots: Array.from(applied.equipmentSlots),
    },
  };
}

export default {
  applyInventoryDiff,
};
