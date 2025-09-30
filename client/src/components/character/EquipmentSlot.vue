<template>
  <Slot
    class="equipment-slot"
    :class="{ 'doll-left': left, 'doll-right': right }"
    :item="safeItem"
    :label="displayLabel"
    :slot-id="slotId"
    type="equipment"
    :width="width"
    :height="height"
    :source="
      safeItem
        ? { equip: true, slot: slotId, equippedItemId: safeItem.id }
        : null
    "
    @dropped="onSlotDropped"
    @click="onClick"
  />
</template>

<script setup>
import { computed } from "vue";
import Slot from "@/components/shared/Slot.vue";
import { useUserStore } from "@/stores/userStore";
import api from "@/utils/api.js";

const props = defineProps({
  item: { type: Object, default: null },
  label: { type: String, default: null },
  slotName: { type: String, default: null },
  left: { type: Boolean, default: false },
  right: { type: Boolean, default: false },
  // optional sizing forwarded to inner Slot
  width: { type: [Number, String], default: undefined },
  height: { type: [Number, String], default: undefined },
});

const emit = defineEmits(["click", "equip-success", "invalid-drop"]);

const userStore = useUserStore();

const safeItem = computed(() => props.item || null);

const slotId = computed(() => {
  const candidate =
    props.slotName || (props.item && props.item.slot) || props.label || "";
  return String(candidate || "").toLowerCase();
});

const displayLabel = computed(() => {
  if (props.label) return props.label;
  const s = slotId.value;
  if (!s) return null;
  const map = {
    bandolier: "Trinket",
    backpack: "Backpack",
    belt: "Belt",
    mainhand: "Main Hand",
    offhand: "Off Hand",
    head: "Head",
    shoulders: "Shoulders",
    back: "Back",
    chest: "Chest",
    hands: "Hands",
    waist: "Waist",
    legs: "Legs",
    feet: "Feet",
  };
  if (map[s]) return map[s];
  return s.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
});

function allowedForSlot(item, slotName) {
  if (!item) return false;
  const s = String(slotName || "").toLowerCase();
  if (s === "backpack" || s === "bandolier" || s === "belt") {
    if (item.equipmentSlot) {
      const es = String(item.equipmentSlot || "").toLowerCase();
      if (
        es.includes("pack") ||
        es.includes("back") ||
        es.includes("belt") ||
        es.includes("bandolier")
      )
        return true;
    }
    if (item.itemType) {
      const it = String(item.itemType || "").toLowerCase();
      if (
        it.includes("backpack") ||
        it.includes("pack") ||
        it.includes("belt") ||
        it.includes("bandolier") ||
        it.includes("pouch")
      )
        return true;
    }
    return !!item.isContainer;
  }
  if (s === "mainhand" || s === "offhand") {
    if (item.equipmentSlot) {
      const es = String(item.equipmentSlot || "").toLowerCase();
      if (es === "mainhand" || es === "offhand") return true;
      return false;
    }
    if (item.itemType) {
      return /weapon|sword|axe|mace|dagger|bow|spear|staff/i.test(
        String(item.itemType)
      );
    }
    return true;
  }
  return true;
}

async function onSlotDropped({ payload }) {
  try {
    if (!payload || payload.type !== "item") return;
    try {
      const droppedId =
        payload.item && (payload.item.id || payload.item.itemId);
      const currentEquippedId =
        props.item && (props.item.id || props.item.itemId);
      if (
        droppedId != null &&
        currentEquippedId != null &&
        String(droppedId) === String(currentEquippedId)
      ) {
        emit("invalid-drop", {
          reason: "Item already equipped in this slot",
          slot: slotId.value,
          item: payload.item,
        });
        return;
      }
    } catch (inner) {
      // ignore
    }

    if (!allowedForSlot(payload.item, slotId.value)) {
      emit("invalid-drop", {
        reason: "Item not valid for slot",
        slot: slotId.value,
        item: payload.item,
      });
      return;
    }

    const body = {
      itemId: payload.item && payload.item.id,
      slot: String(slotId.value).toUpperCase(),
    };
    try {
      const response = await api.post("/character/equip", body);
      const res = (response && response.data) || {};
      // Debug: log response to help diagnose capacity/container updates
      try {
        console.debug(
          "[EquipmentSlot] equip response",
          res && typeof res === "object" ? JSON.parse(JSON.stringify(res)) : res
        );
      } catch (e) {
        console.debug("[EquipmentSlot] equip response (raw)", res);
      }
      // If server returned both a character and canonical containers, use
      // setCharacterAndInventory so the store can apply selective container
      // replacement or capacity updates (capacityUpdated/updatedContainerIds).
      if (res && res.character && Array.isArray(res.containers)) {
        userStore.setCharacterAndInventory(res.character, res.containers, {
          capacityUpdated: res.capacityUpdated,
          updatedContainerIds: res.updatedContainerIds,
        });
        if (Array.isArray(res.nestableContainers))
          userStore.setNestableInventory(res.nestableContainers);
        try {
          console.debug(
            "[EquipmentSlot] post-setCharacterAndInventory inventory",
            JSON.parse(JSON.stringify(userStore.inventory || []))
          );
        } catch (e) {
          /* ignore */
        }
        try {
          const total = (userStore.inventory || []).reduce(
            (acc, c) => acc + (Number(c.capacity) || 0),
            0
          );
          console.debug(
            "[EquipmentSlot] totalInventoryCapacity after set",
            total
          );
        } catch (e) {
          /* ignore */
        }
        try {
          console.debug(
            "[EquipmentSlot] post-setCharacterAndInventory character",
            JSON.parse(JSON.stringify(userStore.character || {}))
          );
        } catch (e) {
          /* ignore */
        }
      } else if (res && res.character) {
        userStore.setCharacter(res.character);
        // If server indicates a capacity update but didn't return containers,
        // re-fetch canonical inventory so the UI reflects new capacities.
        if (res.capacityUpdated && userStore && userStore.ensureInventory) {
          try {
            await userStore.ensureInventory(true);
            try {
              console.debug(
                "[EquipmentSlot] post-ensureInventory inventory",
                JSON.parse(JSON.stringify(userStore.inventory || []))
              );
            } catch (e) {
              /* ignore */
            }
          } catch (e) {
            /* non-fatal: best-effort refresh */
          }
        }
      } else if (res && (res.containers || res.equipment)) {
        const newChar = {
          ...(userStore.character || {}),
          equipped: {
            ...(userStore.character && userStore.character.equipped),
          },
        };
        if (!newChar.equipped) newChar.equipped = {};
        if (res.equipment && Array.isArray(res.equipment)) {
          res.equipment.forEach((eq) => {
            const key = String(eq.slot || "").toLowerCase();
            if (eq.Item) {
              newChar.equipped[key] = {
                ...eq.Item,
                img:
                  eq.Item.image || eq.Item.img || "/img/debug/placeholder.png",
                label:
                  eq.Item.label || eq.Item.name || eq.Item.displayName || null,
              };
            } else if (eq.itemId) {
              newChar.equipped[key] = { id: eq.itemId };
            } else {
              newChar.equipped[key] = null;
            }
          });
        }
        if (res.containers) {
          userStore.setCharacterAndInventory(newChar, res.containers, {
            capacityUpdated: res.capacityUpdated,
            updatedContainerIds: res.updatedContainerIds,
          });
          if (Array.isArray(res.nestableContainers))
          userStore.setNestableInventory(res.nestableContainers);
          try {
            console.debug(
              "[EquipmentSlot] post-setCharacterAndInventory inventory",
              JSON.parse(JSON.stringify(userStore.inventory || []))
            );
          } catch (e) {
            /* ignore */
          }
          try {
            const total = (userStore.inventory || []).reduce(
              (acc, c) => acc + (Number(c.capacity) || 0),
              0
            );
            console.debug(
              "[EquipmentSlot] totalInventoryCapacity after set",
              total
            );
          } catch (e) {
            /* ignore */
          }
          try {
            console.debug(
              "[EquipmentSlot] post-setCharacterAndInventory character",
              JSON.parse(JSON.stringify(userStore.character || {}))
            );
          } catch (e) {
            /* ignore */
          }
        } else {
          // If no containers were returned but equipment array is missing, this may be an unequip that moved the item into an existing container.
          // Remove the slot locally if the server did not return an explicit equipment entry for it.
          if (!res.equipment) {
            try {
              const key = String(slotId.value || "").toLowerCase();
              const updated = {
                ...(userStore.character || {}),
                equipped: {
                  ...(userStore.character && userStore.character.equipped),
                },
              };
              if (
                updated.equipped &&
                Object.prototype.hasOwnProperty.call(updated.equipped, key)
              ) {
                updated.equipped[key] = null;
              }
              userStore.setCharacter(updated);
            } catch (e) {
              userStore.setCharacter(newChar);
            }
          } else {
            userStore.setCharacter(newChar);
          }
        }
      }
      try {
        // Log slot equipped id and total capacity to help debug unequip flows
        const equipKey = String(slotId.value || "").toLowerCase();
        const equippedObj =
          (userStore.character &&
            userStore.character.equipped &&
            userStore.character.equipped[equipKey]) ||
          null;
        const equippedId =
          equippedObj && (equippedObj.id || equippedObj.itemId)
            ? equippedObj.id || equippedObj.itemId
            : null;
        const totalCap = (userStore.inventory || []).reduce(
          (acc, c) => acc + (Number(c.capacity) || 0),
          0
        );
        try {
          console.debug("[EquipmentSlot] post-action slot state", {
            slot: equipKey,
            equippedId,
            totalInventoryCapacity: totalCap,
          });
        } catch (e) {
          /* ignore */
        }
      } catch (e) {
        /* ignore */
      }
      emit("equip-success", { slot: slotId.value });
    } catch (err) {
      console.warn("equip failed", err);
      emit("invalid-drop", {
        reason: "Server equip failed",
        slot: slotId.value,
        item: payload.item,
      });
    }
  } catch (err) {
    console.warn("equipment slot dropped handler failed", err);
  }
}

function onClick() {
  emit("click", safeItem.value);
}
</script>

<style scoped>
/* Blue inner glow when a draggable item is eligible for this slot */
.equipment-slot.drag-glow {
  /* Legacy highlight removed — visual handled by the .drag-highlight overlay */
  transition: box-shadow 150ms ease-in-out;
}

/* overlay that sits above slot contents to ensure glow is visible when slot is occupied */
.equipment-slot .drag-highlight {
  position: absolute;
  /* fill the slot so the glow sits on the edge, not padded inward */
  inset: 0;
  border-radius: 6px;
  pointer-events: none;
  box-shadow: inset 0 0 0 4px rgba(30, 144, 255, 0.18),
    inset 0 0 18px rgba(30, 144, 255, 0.35);
  transition: opacity 120ms ease-in-out;
}
</style>
