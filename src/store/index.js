import Vue from 'vue';
import Vuex from 'vuex';

import api from '@/store/modules/api';
import dialogs from '@/store/modules/dialogs';
import user from '@/store/modules/user';
import world from '@/store/modules/world';
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
    user,
    world,
    arena,
    debug,
    audio,
    chat,
    socket,
  },
});
