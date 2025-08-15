<template>
  <v-layout
    justify-center
    align-center
    column
    class="login"
  >
    <!-- Register -->
    <v-layout
      v-if="showRegister"
      class="flex-grow-0 pane pa-4"
      column
      align-center
    >
      <v-form>
        <v-text-field
          v-model="form.new_email"
          label="Email"
          type="email"
          autocomplete="email"
        />
        <v-text-field
          v-model="form.new_password"
          label="Password"
          type="password"
          autocomplete="new-password"
        />
        <v-text-field
          v-model="form.confirm_password"
          label="Confirm Password"
          type="password"
          autocomplete="new-password"
        />
        <v-text-field
          v-model="form.displayName"
          label="Display Name"
        />
      </v-form>
      <v-row>
        <v-col>
          <v-btn
            text
            small
            @click="showRegister = false"
          >
            Cancel
          </v-btn>
        </v-col>
        <v-col>
          <v-btn
            color="primary"
            small
            @click="registerUser()"
          >
            Register
          </v-btn>
        </v-col>
      </v-row>
    </v-layout>

    <!-- Login -->
    <v-layout
      v-else
      column
      class="flex-grow-0"
      align-center
    >
      <v-img
        class="hover-animate"
        height="512"
        width="512"
        src="/img/branding/splash.png"
      />
      <div class="login-pane pane pa-4">
        <form>
          <v-text-field
            v-model="form.email"
            label="Email"
            type="email"
            autocomplete="username"
            @keydown.enter="login()"
          />
          <v-text-field
            v-model="form.password"
            label="Password"
            type="password"
            autocomplete="current-password"
            @keydown.enter="login()"
          />
        </form>
        <v-row>
          <v-col>
            <v-btn
              text
              small
              @click="showRegister = true"
            >
              Register
            </v-btn>
          </v-col>
          <v-col
            class="d-flex justify-end"
          >
            <v-btn
              color="primary"
              small
              @click="login()"
            >
              Login
            </v-btn>
          </v-col>
        </v-row>
      </div>
    </v-layout>

    <!-- Sound Control -->
    <div class="audio-pane pane d-flex justify-space-between px-1 mt-2">
      <v-icon
        class="mr-1"
        @click="toggleMute"
      >
        {{ mdiVolumeSource }}
      </v-icon>
      <v-text-field
        type="number"
        density="compact"
        hide-details
        style="max-width: 90px"
        :model-value="volume"
        min="0"
        max="100"
        step="1"
        @update:model-value="onVolumeChange"
      />
    </div>
  </v-layout>
</template>

<script setup>
import { reactive, ref, computed } from "vue";
import { mdiVolumeSource } from "@mdi/js";
import api from "@/utils/api";
import { useAudioStore } from "@/stores/audioStore";

const showRegister = ref(false);
const form = reactive({
  new_email: "",
  new_password: "",
  confirm_password: "",
  displayName: "",
  email: "",
  password: "",
});

const audioStore = useAudioStore();
const volume = computed(() => audioStore.volume);

function toggleMute() {
  audioStore.toggleMute();
}

function onVolumeChange(v) {
  const n = Math.max(0, Math.min(100, Number(v)));
  audioStore.volume = n;
}

function login() {
  api
    .post("open/login", {
      email: form.email,
      password: form.password,
    })
    .then((res) => {
      if (res.success) {
        document.location.href = "/characters";
      }
    })
    .catch((err) => {
      console.log(err);
    });
}

function registerUser() {
  api
    .post("open/register", {
      email: form.new_email,
      password: form.new_password,
      passwordConfirm: form.confirm_password,
      displayName: form.displayName,
    })
    .then((res) => {
      if (res.success) {
        showRegister.value = false;
        login();
      }
    })
    .catch((err) => {
      console.log(err);
    });
}
</script>

<style>
@keyframes zoomEffect {
  0%,
  100% {
  }
  50% {
  }
}
.header {
  z-index: 100;
  font-size: 10rem;
  text-shadow: -1px 0 black, 0 1px black, 1px 0 black, 0 -1px black;
  user-select: none;
}
.login {
  height: 100vh;
  overflow: hidden;
}
.pane {
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.5) !important;
}
.login-pane {
  width: 400px;
}
.audio-pane {
  width: 200px;
}
.hover-animate {
  animation: zoomEffect 5s ease-in-out infinite;
}
</style>
