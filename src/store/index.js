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

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    navigation: false,
  },
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
  },
});
