process.env.VUE_APP_VERSION = require('./package.json').version;

module.exports = {
  productionSourceMap: false,
  devServer: {
    disableHostCheck: true,
    host: process.env.VUE_APP_DEV_HOST || 'localhost',
  },
  transpileDependencies: [
    'vuetify',
  ],
};
