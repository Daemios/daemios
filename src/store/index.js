import Vue from 'vue';
import Vuex from 'vuex';

import api from '@/store/modules/api';
import ability from "@/store/modules/ability";
import dialogs from '@/store/modules/dialogs';
import data from '@/store/modules/data';
import user from '@/store/modules/user';
import world from '@/store/modules/world';
import arena from '@/store/modules/arena';
import audio from '@/store/modules/audio';
import chat from '@/store/modules/chat';
import socket from '@/store/modules/socket';
import settings from '@/store/modules/settings';

Vue.use(Vuex);

const STORAGE_KEY = 'daemios.settings';

// Persist settings module to localStorage on each mutation to it
const settingsPersistence = (store) => {
  store.subscribe((mutation, state) => {
    if (!mutation || !mutation.type) return;
    if (!mutation.type.startsWith('settings/')) return;
    try {
      const payload = JSON.stringify(state.settings && state.settings.all ? state.settings.all : {});
      if (window && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, payload);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[store] Failed to persist settings:', e);
    }
  });
};

export default new Vuex.Store({
  state: {
    navigation: false,
  },
  plugins: [settingsPersistence],
  modules: {
    api,
    ability,
    dialogs,
    data,
    user,
    world,
    arena,
    audio,
    chat,
    socket,
    settings,
  },
});
