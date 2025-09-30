<template>
  <v-container
    class="fill-height pa-0 login"
    fluid
  >
    <v-row
      class="fill-height"
      align="center"
      justify="center"
    >
      <v-col
        cols="12"
        md="8"
        lg="6"
        class="d-flex justify-center"
      >
        <v-row
          class="ma-0"
          align="center"
          justify="space-between"
          style="width: 100%"
        >
          <!-- Left: Splash / branding -->
          <v-col
            cols="12"
            md="6"
            class="d-flex justify-center"
          >
            <v-img
              src="/img/branding/splash.png"
              class="splash-img"
              contain
            />
          </v-col>

          <!-- Right: Card with login/register -->
          <v-col
            cols="12"
            md="6"
            class="d-flex align-center"
          >
            <v-card
              class="pa-6 login-card"
              elevation="6"
            >
              <v-card-title class="justify-center">
                <span class="text-h5">Welcome to Daemios</span>
              </v-card-title>

              <v-card-text>
                <v-form>
                  <template v-if="!showRegister">
                    <v-text-field
                      v-model="form.email"
                      label="Email"
                      type="email"
                      autocomplete="username"
                      density="comfortable"
                      @keydown.enter="login()"
                    />
                    <v-text-field
                      v-model="form.password"
                      label="Password"
                      type="password"
                      autocomplete="current-password"
                      density="comfortable"
                      @keydown.enter="login()"
                    />
                  </template>

                  <template v-else>
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
                  </template>
                </v-form>
              </v-card-text>

              <v-card-actions class="justify-space-between">
                <v-btn
                  text
                  @click="showRegister = !showRegister"
                >
                  {{ showRegister ? "Back" : "Register" }}
                </v-btn>

                <v-spacer />

                <v-btn
                  color="primary"
                  @click="showRegister ? registerUser() : login()"
                >
                  {{ showRegister ? "Create Account" : "Login" }}
                </v-btn>
              </v-card-actions>

              <v-divider class="my-3" />

              <v-row
                align="center"
                justify="space-between"
                class="px-2"
              >
                <v-col
                  cols="6"
                  class="d-flex align-center"
                >
                  <v-icon
                    class="mr-2"
                    @click="toggleMute"
                  >
                    {{ mdiVolumeSource }}
                  </v-icon>
                  <span class="text-caption">Volume</span>
                </v-col>
                <v-col
                  cols="6"
                  class="d-flex justify-end"
                >
                  <v-text-field
                    type="number"
                    density="compact"
                    hide-details
                    style="max-width: 110px"
                    :model-value="volume"
                    min="0"
                    max="100"
                    step="1"
                    @update:model-value="onVolumeChange"
                  />
                </v-col>
              </v-row>
            </v-card>
          </v-col>
        </v-row>
      </v-col>
    </v-row>
  </v-container>
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
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: stretch;
}
.audio-pane {
  width: 200px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.hover-animate {
  animation: zoomEffect 5s ease-in-out infinite;
}
</style>
