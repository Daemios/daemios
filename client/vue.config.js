process.env.VUE_APP_VERSION = require('./package.json').version;

module.exports = {
  productionSourceMap: false,
  devServer: {
    host: process.env.VUE_APP_DEV_HOST || 'localhost',
  },
  transpileDependencies: [
    'vuetify',
  ],
  configureWebpack: {
    resolve: {
      alias: {
        'vue$': '@vue/compat',
      },
    },
  },
};
