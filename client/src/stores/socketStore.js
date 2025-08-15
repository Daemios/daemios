import { defineStore } from "pinia";

export const useSocketStore = defineStore("socket", {
  state: () => ({
    connection: false,
  }),
  actions: {
    setConnection(status) {
      // eslint-disable-next-line no-console
      console.log("socket status: " + status);
      this.connection = status;
    },
  },
});
