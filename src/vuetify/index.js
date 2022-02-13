/**
 * This file is part of Special Order Manager.
 *
 * NOTICE: All information contained herein is, and remains the property of
 * Walnut Creek Hardware Inc and its suppliers, if any. The intellectual and
 * technical concepts contained herein are proprietary to Walnut Creek Hardware
 * Inc and its suppliers and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material is
 * strictly forbidden unless prior written permission is obtained.
 *
 * @author Grant Martin <commgdog@gmail.com>
 * @copyright 2021 Walnut Creek Hardware Inc.
 */

import Vue from 'vue';
import Vuetify from 'vuetify/lib/framework';
import themes from './themes';

Vue.use(Vuetify);

const vuetify = new Vuetify({
  theme: themes,
  icons: {
    iconfont: 'mdiSvg',
  },
});

export default vuetify;
