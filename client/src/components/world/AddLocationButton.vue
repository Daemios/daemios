<template>
  <div>
    <button
      class="d-flex align-center justify-center px-2 py-1 rounded"
      style="background: rgba(255,255,255,0.12); color: #fff; border: 1px solid rgba(255,255,255,0.25); font-size: 12px; cursor: pointer;"
      @click="showModal = true"
    >
      Add Location
    </button>
    <teleport to="body">
      <div v-if="showModal" style="position: fixed; z-index: 9999; left: 0; top: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;">
        <div class="rounded-lg" style="background: rgba(30,30,40,0.92); color: #fff; min-width: 340px; max-width: 95vw; box-shadow: 0 8px 32px #000a; padding: 0; border: 1px solid rgba(255,255,255,0.18);">
          <div class="d-flex align-center justify-space-between px-4 pt-4 pb-2" style="border-bottom: 1px solid rgba(255,255,255,0.12);">
            <span class="text-h6">Add Location</span>
            <v-btn icon variant="text" @click="closeModal" size="small"><v-icon>mdi-close</v-icon></v-btn>
          </div>
          <div class="px-4 py-4">
            <v-form @submit.prevent="submit" class="d-flex flex-column gap-2">
              <v-text-field v-model="form.name" label="Name" dense outlined required hide-details />
              <v-textarea v-model="form.description" label="Description" dense outlined rows="2" hide-details />
              <v-select
                v-model="form.type"
                :items="typeOptions"
                item-title="text"
                item-value="value"
                label="Type"
                dense
                outlined
                required
                hide-details
              />
              <div class="d-flex gap-2">
                <v-text-field v-model.number="form.chunkX" label="Chunk X" type="number" dense outlined required hide-details class="flex-fill" />
                <v-text-field v-model.number="form.chunkY" label="Chunk Y" type="number" dense outlined required hide-details class="flex-fill" />
              </div>
              <div class="d-flex gap-2">
                <v-text-field v-model.number="form.hexQ" label="Hex Q" type="number" dense outlined required hide-details class="flex-fill" />
                <v-text-field v-model.number="form.hexR" label="Hex R" type="number" dense outlined required hide-details class="flex-fill" />
              </div>
              <v-checkbox v-model="form.visible" label="Visible" hide-details class="mt-1" />
              <div class="d-flex justify-end gap-2 mt-3">
                <v-btn variant="tonal" color="secondary" @click="closeModal">Cancel</v-btn>
                <v-btn color="primary" type="submit">Add Location</v-btn>
              </div>
            </v-form>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script>
import { useWorldStore } from '@/stores/worldStore';
export default {
  name: 'AddLocationButton',
  data() {
    return {
      showModal: false,
      form: {
        name: '',
        description: '',
        type: 'TOWN',
        chunkX: 0,
        chunkY: 0,
        hexQ: 0,
        hexR: 0,
        visible: true,
      },
      typeOptions: [
        { text: 'Town', value: 'TOWN' },
        { text: 'Dungeon', value: 'DUNGEON' },
        { text: 'Quest', value: 'QUEST' },
      ],
    };
  },
  methods: {
    closeModal() {
      this.showModal = false;
    },
    async submit() {
      try {
        const worldStore = useWorldStore();
        await worldStore.createLocation({ ...this.form });
        this.closeModal();
        this.form = {
          name: '',
          description: '',
          type: 'TOWN',
          chunkX: 0,
          chunkY: 0,
          hexQ: 0,
          hexR: 0,
          visible: true,
        };
      } catch (e) {
        alert('Failed to create location: ' + (e?.message || e));
      }
    },
  },
};
</script>
