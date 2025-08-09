import { defineStore } from 'pinia';

export const useChatStore = defineStore('chat', {
  state: () => ({
    connected: false,
    error: null,
    chatMessages: [],
    limit: 50,
  }),
  getters: {
    displayMessages: (state) => state.chatMessages,
  },
  actions: {
    ADD_MESSAGE(message) {
      while (this.chatMessages.length >= this.limit) {
        this.chatMessages.shift();
      }
      this.chatMessages.push(message);
    },
    DELETE_MESSAGE(message) {
      this.chatMessages = this.chatMessages.filter((m) => m.id !== message.id);
    },
    SET_CONNECTION(val) { this.connected = val; },
    SET_ERROR(error) { this.error = error; },
    addMessage(message) { this.ADD_MESSAGE(message); },
    deleteMessage(message) { this.DELETE_MESSAGE(message); },
    connectionOpened() { this.SET_CONNECTION(true); },
    connectionClosed() { this.SET_CONNECTION(false); },
    connectionError(error) { this.SET_ERROR(error); },
  },
});
