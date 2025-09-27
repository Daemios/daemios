<template>
  <div
    :class="[
      'equipment-slot',
      {
        'doll-left': left,
        'doll-right': right,
        'drag-glow': isDragHighlighted,
      },
    ]"
    style="position: relative"
    @dragover.prevent
    @drop="onDrop"
    @click="onClick"
  >
    <template v-if="item">
      <DraggableItem
        :item="safeItem"
        :label="displayLabel"
        :source="{ equip: true, slot: slotId, equippedItemId: safeItem.id }"
        :width="'100%'"
        :height="'100%'"
      />
    </template>
    <template v-else>
      <div class="empty-slot d-flex align-center justify-center" role="button">
        <v-icon class="empty-icon">
          {{ mdiClose }}
        </v-icon>
      </div>
    </template>

    <!-- slot name chips intentionally removed to keep paper-doll slots visually minimal -->
    <!-- highlight overlay — placed above contents so glow is visible even when occupied -->
    <div v-if="isDragHighlighted" class="drag-highlight" aria-hidden="true" />
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from "vue";
import DraggableItem from "@/components/inventory/DraggableItem.vue";
import { mdiClose } from "@mdi/js";
import { useUserStore } from "@/stores/userStore";
import api from "@/utils/api.js";
import dragEventBus from "@/lib/dragEventBus";

const props = defineProps({
  item: { type: Object, default: null },
  label: { type: String, default: null },
  slotName: { type: String, default: null },
  left: { type: Boolean, default: false },
  right: { type: Boolean, default: false },
});

const emit = defineEmits(["click", "equip-success", "invalid-drop"]);

const userStore = useUserStore();

const safeItem = computed(() => props.item || {});

const slotId = computed(() => {
  const candidate =
    props.slotName || (props.item && props.item.slot) || props.label || "";
  return String(candidate || "").toLowerCase();
});

const isDragHighlighted = ref(false);

function onGlobalDragStart(payload) {
  try {
    if (!payload || !payload.item) return;
    const item = payload.item;
    // Prefer explicit equipmentSlot match when available
    if (item.equipmentSlot) {
      const norm = (s) =>
        String(s || "")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");
      const es = norm(item.equipmentSlot);
      const s = norm(slotId.value);
      if (es && s && (es === s || es.includes(s) || s.includes(es))) {
        isDragHighlighted.value = true;
        return;
      }
      // if equipmentSlot is present but doesn't match, do not highlight
      return;
    }
    // fallback: if no explicit equipmentSlot provided on item, use heuristic
    if (allowedForSlot(item, slotId.value)) {
      isDragHighlighted.value = true;
    }
  } catch (err) {
    // ignore
  }
}

function onGlobalDragEnd() {
  isDragHighlighted.value = false;
}

onMounted(() => {
  dragEventBus.on("drag-start", onGlobalDragStart);
  dragEventBus.on("drag-end", onGlobalDragEnd);
});

onBeforeUnmount(() => {
  dragEventBus.off("drag-start", onGlobalDragStart);
  dragEventBus.off("drag-end", onGlobalDragEnd);
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
    // Prefer explicit equipmentSlot set on items; fall back to itemType or isContainer
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
    // fallback to old itemType heuristics if equipmentSlot not present
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
    // If equipmentSlot declares MAINHAND/OFFHAND, respect it. Otherwise fall back to itemType heuristics.
    if (item.equipmentSlot) {
      const es = String(item.equipmentSlot || "").toLowerCase();
      if (es === "mainhand" || es === "offhand") return true;
      return false;
    }
    // fallback: if no equipmentSlot present, use itemType heuristics to decide
    if (item.itemType) {
      return /weapon|sword|axe|mace|dagger|bow|spear|staff/i.test(
        String(item.itemType)
      );
    }
    return true;
  }
  return true;
}

async function onDrop(e) {
  try {
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;
    const payload = JSON.parse(raw);
    if (!payload || payload.type !== "item") return;
    // Guard: if the dropped item is the same as the currently equipped item in this slot, ignore
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
        // nothing to do — user dropped the same equipped item back onto its slot
        emit("invalid-drop", {
          reason: "Item already equipped in this slot",
          slot: slotId.value,
          item: payload.item,
        });
        return;
      }
    } catch (inner) {
      // ignore guard failures and continue with normal flow
    }
    // Quick client-side heuristic validation
    if (!allowedForSlot(payload.item, slotId.value)) {
      emit("invalid-drop", {
        reason: "Item not valid for slot",
        slot: slotId.value,
        item: payload.item,
      });
      return;
    }

    // Always ask server to equip the item into this slot. Server will handle
    // moving between containers/equipment and return canonical data.
    const body = {
      itemId: payload.item && payload.item.id,
      slot: String(slotId.value).toUpperCase(),
    };
    try {
      const res = await api.post("/character/equip", body);
      if (res && res.character) {
        userStore.setCharacter(res.character);
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
        } else {
          userStore.setCharacter(newChar);
        }
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
    console.warn("equipment slot drop failed", err);
  }
}

function onClick() {
  emit("click", safeItem.value);
}
</script>

<style scoped>
.equipment-slot .empty-slot {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}
.equipment-slot .empty-slot .v-icon__svg {
  width: 60% !important;
  height: 60% !important;
  opacity: 0.12;
}
.equipment-slot .empty-icon {
  width: 60%;
  height: 60%;
}

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
