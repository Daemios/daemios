<template>
  <div>
    <div class="mb-1 mt-1 text-body-1 font-weight-medium">
      Volume
    </div>
    <div class="d-flex align-center my-2">
      <v-slider
        v-model="masterVolume"
        min="0"
        max="1"
        step="0.01"
        label="Master"
        class="flex-grow-1"
        thumb-label
        color="primary"
        style="margin-left: 0; padding-left: 0"
        hide-details
        :messages="''"
      />
      <v-btn
        icon
        size="small"
        class="ml-2"
        :color="muteMaster ? 'red' : 'grey'"
        variant="text"
        @click="muteMaster = !muteMaster"
      >
        <v-icon size="small">
          {{
            muteMaster ? mdiVolumeOff : mdiVolumeHigh
          }}
        </v-icon>
      </v-btn>
    </div>
    <div
      class="d-flex align-baseline my-2 ml-0.5"
      style="min-height: 36px"
    >
      <span
        class="pl-6 py-0 text-body-2"
        style="
          width: 140px;
          min-width: 110px;
          max-width: 140px;
          display: inline-block;
        "
      >Tile Ambiance</span>
      <v-slider
        v-model="tileAmbianceVolume"
        min="0"
        max="1"
        step="0.01"
        density="compact"
        class="flex-grow-1 pl-4"
        thumb-label
        color="secondary"
        hide-details
      />
      <v-btn
        icon
        size="small"
        class="ml-2"
        :color="muteTileAmbiance ? 'red' : 'grey'"
        variant="text"
        @click="muteTileAmbiance = !muteTileAmbiance"
      >
        <v-icon size="small">
          {{
            muteTileAmbiance ? mdiVolumeOff : mdiVolumeHigh
          }}
        </v-icon>
      </v-btn>
    </div>
    <div
      class="d-flex align-baseline my-2 ml-0.5"
      style="min-height: 36px"
    >
      <span
        class="pl-6 py-0 text-body-2"
        style="
          width: 140px;
          min-width: 110px;
          max-width: 140px;
          display: inline-block;
        "
      >Music</span>
      <v-slider
        v-model="musicVolume"
        min="0"
        max="1"
        step="0.01"
        density="compact"
        class="flex-grow-1 pl-4"
        thumb-label
        color="secondary"
        hide-details
      />
      <v-btn
        icon
        size="small"
        class="ml-2"
        :color="muteMusic ? 'red' : 'grey'"
        variant="text"
        @click="muteMusic = !muteMusic"
      >
        <v-icon size="small">
          {{ muteMusic ? mdiVolumeOff : mdiVolumeHigh }}
        </v-icon>
      </v-btn>
    </div>
    <div
      class="d-flex align-baseline my-2 ml-0.5"
      style="min-height: 36px"
    >
      <span
        class="pl-6 py-0 text-body-2"
        style="
          width: 140px;
          min-width: 110px;
          max-width: 140px;
          display: inline-block;
        "
      >Combat</span>
      <v-slider
        v-model="combatVolume"
        min="0"
        max="1"
        step="0.01"
        density="compact"
        class="flex-grow-1 pl-4"
        thumb-label
        color="secondary"
        hide-details
      />
      <v-btn
        icon
        size="small"
        class="ml-2"
        :color="muteCombat ? 'red' : 'grey'"
        variant="text"
        @click="muteCombat = !muteCombat"
      >
        <v-icon size="small">
          {{
            muteCombat ? mdiVolumeOff : mdiVolumeHigh
          }}
        </v-icon>
      </v-btn>
    </div>
    <v-divider class="my-4" />
    <div class="mb-1 mt-1 text-body-1 font-weight-medium">
      Notifications
    </div>
    <v-switch
      v-model="turnAlert"
      label="Turn Alert"
      color="primary"
      class="mt-1"
    />
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAudioStore } from "@/stores/audioStore";
import { mdiVolumeHigh, mdiVolumeOff } from "@mdi/js";

const settingsStore = useSettingsStore();

const muteMaster = computed({
  get: () => settingsStore.get("audio.muteMaster", false),
  set: (v) => {
    settingsStore.setAtPath({ path: "audio.muteMaster", value: v });
    // also toggle audio store mute so playback mutes/unmutes immediately
    try {
      if (v) {
        // mute: if not already muted, toggle
        if (audioStore.volume !== 0 && typeof audioStore.toggleMute === "function") {
          audioStore.toggleMute();
        }
      } else {
        // unmute: if currently muted (volume===0) toggle to restore
        if (audioStore.volume === 0 && typeof audioStore.toggleMute === "function") {
          audioStore.toggleMute();
        }
        // ensure the store volume follows persisted master value
        audioStore.setVolume(Math.round((settingsStore.get("audio.master", 1) || 1) * 100));
      }
    } catch (e) {
      // ignore errors
    }
  },
});
const muteTileAmbiance = computed({
  get: () => settingsStore.get("audio.muteTileAmbiance", false),
  set: (v) =>
    settingsStore.setAtPath({ path: "audio.muteTileAmbiance", value: v }),
});
const muteCombat = computed({
  get: () => settingsStore.get("audio.muteCombat", false),
  set: (v) => settingsStore.setAtPath({ path: "audio.muteCombat", value: v }),
});
const turnAlert = computed({
  get: () => settingsStore.get("audio.turnAlert", true),
  set: (v) => settingsStore.setAtPath({ path: "audio.turnAlert", value: v }),
});
const masterVolume = computed({
  get: () => settingsStore.get("audio.master", 1),
  set: (v) => {
    settingsStore.setAtPath({ path: "audio.master", value: v });
    // sync immediately to audio store so active audio updates in real-time
    audioStore.setVolume(Math.round((Number(v) || 0) * 100));
  },
});
const tileAmbianceVolume = computed({
  get: () => settingsStore.get("audio.tileAmbiance", 1),
  set: (v) => settingsStore.setAtPath({ path: "audio.tileAmbiance", value: v }),
});
const audioStore = useAudioStore();

// Music volume exposed in settings (0..1) but stored in audioStore as 0..100
const musicVolume = computed({
  get: () => settingsStore.get("audio.music", 1),
  set: (v) => {
    settingsStore.setAtPath({ path: "audio.music", value: v });
    // sync to audioStore (0-100)
    audioStore.setMusic(Math.round((Number(v) || 0) * 100));
  },
});
const combatVolume = computed({
  get: () => settingsStore.get("audio.combat", 1),
  set: (v) => settingsStore.setAtPath({ path: "audio.combat", value: v }),
});

// Initialize audioStore music value from persisted settings on load
audioStore.setMusic(Math.round((settingsStore.get("audio.music", 1) || 1) * 100));

// Initialize audioStore master volume from persisted settings and honor mute flags
audioStore.setVolume(Math.round((settingsStore.get("audio.master", 1) || 1) * 100));
if (settingsStore.get("audio.muteMaster", false)) {
  try {
    if (audioStore.volume !== 0 && typeof audioStore.toggleMute === "function") audioStore.toggleMute();
  } catch (e) {
    // ignore errors while toggling mute during initialization
  }
}
if (settingsStore.get("audio.muteMusic", false)) {
  audioStore.setMusic(0);
}

const muteMusic = computed({
  get: () => settingsStore.get("audio.muteMusic", false),
  set: (v) => {
    settingsStore.setAtPath({ path: "audio.muteMusic", value: v });
    if (v) {
      audioStore.setMusic(0);
    } else {
      audioStore.setMusic(Math.round((settingsStore.get("audio.music", 1) || 1) * 100));
    }
  },
});
</script>
