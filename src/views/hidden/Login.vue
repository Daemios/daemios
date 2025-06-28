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
          <v-col class="d-flex justify-end">
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
      </v-img>
    </v-layout>

    <!-- Sound Control -->
    <div
      class="audio-pane pane d-flex justify-space-between px-1 mt-2"
    >
      <v-icon
        class="mr-1"
        @click="$store.commit('audio/toggleMute')"
      >
        {{ mdiVolumeSource }}
      </v-icon>
      <v-slider
        dense
        hide-details
        :value="volume"
      />
    </div>

  </v-layout>
</template>

<script>
import mixin_audio from '@/mixins/audio';
import api from "@/functions/api";

export default {
  mixins: [mixin_audio],
  data: () => ({
    showRegister: false,
    form: {
      new_email: '',
      new_password: '',
      confirm_password: '',
      displayName: '',
      email: '',
      password: '',
    },
  }),
  methods: {
    login() {
      api.post('open/login', {
        email: this.form.email,
        password: this.form.password,
      })
        .then(res => {
          if (res.success) {
            console.log(res)
            document.location.href = '/characters';
          }
        })
        .catch(err => {
          console.log(err);
        });
    },
    registerUser() {
      api.post('open/register', {
        email: this.form.new_email,
        password: this.form.new_password,
        passwordConfirm: this.form.confirm_password,
        displayName: this.form.displayName,
      })
        .then(res => {
          if (res.success) {
            this.showRegister = false;
            this.login();
          }
        })
        .catch(err => {
          console.log(err);
        });
    },
  },
};
</script>

<style lang="sass">
@keyframes zoomEffect
  0%, 100%
    //transform: scale(1)

  50%
    //transform: scale(1.05)



.header
  z-index: 100
  font-size: 10rem
  text-shadow: -1px 0 black, 0 1px black, 1px 0 black, 0 -1px black
  user-select: none

.login
  height: 100vh
  overflow: hidden

.pane
  border-radius: 4px
  background: rgba(0,0,0,.5) !important

.login-pane
  width: 400px

.audio-pane
  width: 200px

.hover-animate
  animation: zoomEffect 5s ease-in-out infinite





</style>
