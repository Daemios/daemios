<template>
  <v-container>
    <v-row dense>
      <v-col>
        <v-row dense>
          <v-col
            v-for="(core, idx) in coresArr"
            :key="core.id || idx"
            cols="3"
            class="d-flex flex-column align-center"
          >
            <v-btn
              class="ability-item ma-1"
              dense
            >
              <div
                class="ability-item-inner d-flex align-center justify-center"
                style="position: relative"
              >
                <AbilityMockup
                  :height="5"
                  :width="5"
                  :block-size="6"
                  :pattern="core.pattern || null"
                  :key_prefix="core.id || idx"
                />
                <div style="position: absolute; right: -6px; bottom: -6px">
                  <VesselMini :color="elementColor(core)" />
                </div>
              </div>
            </v-btn>
            <div class="text-caption mt-2">
              {{ core.label || core.prefix || "Core " + core.id }}
            </div>
          </v-col>
        </v-row>
      </v-col>
    </v-row>
    <v-row class="mt-4">
      <v-col>
        <AbilitiesSlots
          :slots="abilitySlots"
          @ability-drop="onAbilityDrop"
          @ability-click="onAbilityClick"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useAbilityStore } from "@/stores/abilityStore";
import { useUserStore } from "@/stores/userStore";
import VesselMini from "@/components/ability/VesselMini.vue";
import AbilityMockup from "@/components/ability/AbilityMockup.vue";
import AbilitiesSlots from "@/components/abilities/AbilitiesSlots.vue";
import api from "@/utils/api.js";
const emit = defineEmits(["ability-drop", "ability-click"]);

const abilityStore = useAbilityStore();
const userStore = useUserStore();
const { character } = storeToRefs(userStore);

const coresArr = computed(() => {
  const cores = userStore.character && userStore.character.cores;
  if (!cores) return [];
  if (Array.isArray(cores)) return cores;
  return Object.values(cores);
});

const abilityItem = computed(() => {
  const equipped = (character.value && character.value.equipped) || {};
  return equipped.ability || null;
});

const abilitySlots = computed(() => {
  const item = abilityItem.value || null;
  return [
    {
      id: "ability",
      label:
        item && (item.label || item.name) ? item.label || item.name : "Ability",
      item,
      source:
        item && item.id != null
          ? { equip: true, slot: "ability", equippedItemId: item.id }
          : null,
    },
  ];
});

function elementColor(core) {
  if (!abilityStore.elements) return "#888";
  const el = abilityStore.elements.find(
    (e) => e.element_id === core.element || e.id === core.element
  );
  return el ? el.color : "#888";
}

function mapItemForEquip(item) {
  if (!item) return null;
  if (typeof userStore.mapItemForClient === "function") {
    return userStore.mapItemForClient(item);
  }
  return {
    ...item,
    img: item.image || item.img || "/img/debug/placeholder.png",
    label: item.label || item.name || item.displayName || null,
  };
}

function applyEquipmentResponse(res, fallbackItem) {
  const current = userStore.character || {};
  const updated = {
    ...current,
    equipped: {
      ...(current.equipped || {}),
    },
  };
  if (!updated.equipped) updated.equipped = {};

  if (res && Array.isArray(res.equipment)) {
    res.equipment.forEach((eq) => {
      const key = String(eq.slot || "").toLowerCase();
      if (!key) return;
      if (eq.Item) {
        updated.equipped[key] = mapItemForEquip(eq.Item);
      } else if (eq.itemId != null) {
        updated.equipped[key] = { id: eq.itemId };
      } else {
        updated.equipped[key] = null;
      }
    });
  } else if (fallbackItem) {
    updated.equipped.ability = fallbackItem;
  }

  if (res && Array.isArray(res.containers)) {
    userStore.setCharacterAndInventory(updated, res.containers, {
      capacityUpdated: res.capacityUpdated,
      updatedContainerIds: res.updatedContainerIds,
    });
    if (Array.isArray(res.nestableContainers))
      userStore.setNestableInventory(res.nestableContainers);
  } else {
    userStore.setCharacter(updated);
  }
}

async function onAbilityDrop(evt) {
  try {
    if (!evt || !evt.payload || !evt.payload.item) return;
    const rawItem = evt.payload.item;
    const itemId = rawItem.id || rawItem.itemId;
    if (itemId == null) return;
    const fallback = mapItemForEquip(rawItem);
    const res = await api.post("/character/equip", {
      itemId,
      slot: "ABILITY",
    });
    applyEquipmentResponse(res, fallback);
    emit("ability-drop", evt);
  } catch (err) {
    console.warn("Failed to equip ability", err);
  }
}

function onAbilityClick(item) {
  emit("ability-click", item);
}

onMounted(() => {
  abilityStore.loadAll().catch((e) => console.error(e));
});
</script>

<style scoped></style>
