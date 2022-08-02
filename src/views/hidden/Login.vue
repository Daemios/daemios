<template>
  <v-layout
    justify-center
    align-center
    column
    class="login"
  >

    <AnimatedBackground
      src="/video/forest.mp4"
      :zoom="zoom"
    />

    <!-- Register -->
    <v-layout
      v-if="!characters && showRegister"
      class="flex-grow-0 pane pa-4"
      column
      align-center
    >
      <v-form>
        <v-text-field
          v-model="form.email"
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
          v-model="form.display_name"
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
      v-else-if="characters === null && !showRegister"
      column
      class="flex-grow-0"
      align-center
    >
      <h1 class="header text-center colors-of-autumn">
        Dungeons and Daemios
      </h1>
      <div class="login-pane pane pa-4">
        <div>
          <v-text-field
            v-model="form.email"
            label="Email"
            type="email"
            @keydown.enter="authenticate()"
          />
          <v-text-field
            v-model="form.password"
            label="Password"
            type="password"
            @keydown.enter="authenticate()"
          />
        </div>
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
              @click="authenticate()"
            >
              Login
            </v-btn>
          </v-col>
        </v-row>
      </div>
    </v-layout>

    <!-- Character Select -->
    <v-layout
      v-else-if="characters !== null && !showRegister"
      column
      align-center
      justify-center
      class="flex-grow-0"
    >
      <v-btn
        v-for="(char, i) in characters"
        :key="i"
        class="pane flex-grow-0 pa-2 mb-2"
        width="400"
        height="80"
        @click="characterSelect(char)"
      >
        <v-layout class="justify-space-between">
          <div>
            <h2 class="text-h4">
              {{ char.name }}
            </h2>
            <div
              class="location d-flex align-center"
              :class="isDangerousText(char.location)"
            >
              <v-icon
                small
                class="mr-1"
              >
                {{ isDangerousIcon(char.location) }}
              </v-icon>
              {{ char.location.name }}
            </div>
          </div>
          <v-layout
            column
            justify-end
            class="flex-grow-0"
          >
            <v-layout justify-end>
              <span class="text-body mr-1">LV</span>
              <h3 class="text-h4 mt-n1">
                {{ char.level }}
              </h3>
            </v-layout>
            <v-row dense>
              <v-col
                v-for="(v, i) in char.vessels"
                :key="i"
              >
                <VesselMini
                  :color="v.color"
                />
              </v-col>
            </v-row>
          </v-layout>
        </v-layout>
      </v-btn>
      <v-btn
        class="pane flex-grow-0 pa-2 mb-2"
        width="400"
        height="40"
        @click="characterCreate"
      >
        <v-icon>{{ mdiPlus }}</v-icon>
        Create New Character
      </v-btn>
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
import { mdiPlus } from '@mdi/js';
import mixin_audio from '@/mixins/audio';
import mixin_locations from '@/mixins/locations';
import VesselMini from '@/components/ability/VesselMini';
import AnimatedBackground from '@/components/general/AnimatedBackground';
import api from "@/functions/api";
import {mapState} from "vuex";

export default {
  components: { VesselMini, AnimatedBackground },
  mixins: [mixin_audio, mixin_locations],
  data: () => ({
    mdiPlus,
    showRegister: false,
    characters_temp: [
      {
        name: 'Daemios',
        level: 5,
        location: {
          name: 'The Wilds',
          dangerous: true,
        },
        vessels: [
          { color: 'red' },
          { color: 'red' },
          { color: 'red' },
          { color: 'orange' },
        ],
      },
      {
        name: 'Asori',
        level: 3,
        location: {
          name: 'Gondor',
          dangerous: false,
        },
        vessels: [
          { color: 'teal' },
          { color: 'turquoise' },
          { color: 'green' },
        ],
      },
    ],
    zoom: false,
    form: {
      new_email: '',
      new_password: '',
      confirm_password: '',
      display_name: '',
      email: '',
      password: '',
    },
  }),
  computed: {
    ...mapState({
      characters: (state) => state.debug.db.characters,
    }),
  },
  methods: {
    authenticate() {
      api.post('user/authenticate', {
        email: this.form.email,
        password: this.form.password,
      })
        .then(res => {
          if (res.success) {
            this.$store.commit('player/setPlayerId', res.user_id);
            this.$store.dispatch('player/getCharacters');
          }
        })
        .catch(err => {
          console.log(err);
        });
    },
    registerUser() {
      api.post('user/register', {
        email: this.form.new_email,
        password: this.form.new_password,
        password_confirm: this.form.confirm_password,
        display_name: this.form.display_name,
      })
        .then(res => {
          if (res.success) {
            this.showRegister = false;
            this.authenticate();
          }
        })
        .catch(err => {
          console.log(err);
        });
    },
    characterSelect(char) {
      console.log(char);
      this.zoom = true;
      setTimeout(() => {
        window.location.href = '/world';
      }, 1500);
    },
    characterCreate() {
      this.zoom = true;
      setTimeout(() => {
        window.location.href = '/builder';
      }, 1500);
    },
  },
};
</script>

<style lang="sass">
@keyframes login-zoom
  0%
    margin: 0
    height: 100vh
    width: 100vw
    opacity: 1
  50%
    margin: -10%
    height: 120vh
    width: 120vw
    opacity: 1
  100%
    margin: -10%
    height: 120vh
    width: 120vw
    opacity: 0

.header
  z-index: 100
  font-size: 10rem
  text-shadow: -1px 0 black, 0 1px black, 1px 0 black, 0 -1px black
  user-select: none

.login
  height: 100vh
  overflow: hidden

.pane
  z-index: 100
  border-radius: 4px
  background: rgba(0,0,0,.5) !important

.login-pane
  width: 400px

.audio-pane
  width: 200px

</style>
