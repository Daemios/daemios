import Vue from 'vue';
import Vuex from 'vuex';

import api from '@/store/modules/api';
import dialogs from '@/store/modules/dialogs';
import player from '@/store/modules/player';
import arena from '@/store/modules/arena';
import debug from '@/store/modules/debug';
import audio from '@/store/modules/audio';
import chat from '@/store/modules/chat';
import socket from '@/store/modules/socket';

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    navigation: false,
  },
  modules: {
    api,
    dialogs,
    player,
    arena,
    debug,
    audio,
    chat,
    socket,
  },
});
