import Vue from 'vue';
import Vuex from 'vuex';

import api from '@/store/modules/api';
import ability from "@/store/modules/ability";
import dialogs from '@/store/modules/dialogs';
import creature_data from '@/store/modules/creature_data';
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
    ability,
    dialogs,
    creature_data,
    user,
    world,
    arena,
    debug,
    audio,
    chat,
    socket,
  },
});
