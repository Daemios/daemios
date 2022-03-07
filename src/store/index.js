import Vue from 'vue';
import Vuex from 'vuex';
import dialogs from '@/store/modules/dialogs';
import player from '@/store/modules/player';
import arena from '@/store/modules/arena';
import debug from '@/store/modules/debug';

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    navigation: false,
  },
  mutations: {},
  actions: {},
  modules: {
    dialogs,
    player,
    arena,
    debug,
  },
});
