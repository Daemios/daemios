export default {
  namespaced: true,
  state: {
    connected: false,
    error: null,
    messages: [],
    limit: 50,
  },
  getters: {
    displayMessages: state => state.chatMessages
  },
  mutations: {
    ADD_MESSAGE(state, message) {
      while (state.chatMessages.length >= state.limit) {
        state.chatMessages.shift();
      }
      state.chatMessages.push(message);
    },
    DELETE_MESSAGE(state, message) {
      state.chatMessages = state.chatMessages.filter(m => m.id !== message.id);
    },
    SET_CONNECTION(state, message) {
      state.connected = message;
    },
    SET_ERROR(state, error) {
      state.error = error;
    }
  },
  actions: {
    addMessage({ commit }, message) {
      commit('ADD_MESSAGE', message);
    },
    deleteMessage({ commit }, message) {
      commit('DELETE_MESSAGE', message);
    },
    connectionOpened({ commit }) {
      commit('SET_CONNECTION', true);
    },
    connectionClosed({ commit }) {
      commit('SET_CONNECTION', false);
    },
    connectionError({ commit }, error) {
      commit('SET_ERROR', error);
    }
  },
}
