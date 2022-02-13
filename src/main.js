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
import App from './App.vue';

import router from '@/router';
import store from '@/store';
import vuetify from '@/vuetify';

// The setup call will assign things to the session such as organization
// info and permission information. Once the data is retrieved on setup
// then the application will mount
new Vue({
  router,
  store,
  vuetify,
  render: (h) => h(App),
}).$mount('#app');

Vue.mixin({
  methods: {
    globalHelper() {
      // eslint-disable-next-line no-alert
      alert('Hello world');
    },

    /**
     * Takes data from a bonus and returns it properly formatted
     * to be user-readable
     *
     * @param value
     * @param name
     * @param operation
     * @returns {
     *   {
     *     classes: {"color-positive": boolean, "color-negative": boolean},
     *     name,
     *     combined: string,
     *     value: string
     *   }
     * }
     */
    formatBonus(value, name, operation = 'additive') {
      let prefix = '';
      let suffix = '';
      let prettyValue = 0;

      switch (operation) {
        case 'multiplicative':
          prefix = (value - 1 >= 0) ? ' +' : ' ';
          suffix = '%';
          prettyValue = (100 * (value - 1)).toFixed(0);
          break;

        case 'additive':
          prefix = (value - 1 >= 0) ? ' +' : ' ';
          prettyValue = value;
          break;

        default:
          break;
      }

      return {
        name,
        value: prefix + prettyValue + suffix,
        combined: name + prefix + prettyValue + suffix,
        classes: {
          'color-positive': (value - 1 >= 0),
          'color-negative': (value - 1 < 0),
        },
      };
    },

    /**
     * Converts an array of any number of array or
     * objects containing bonuses to a single array
     *
     * @param elements
     */
    combineBonuses(elements) {
      const array = [];

      elements.forEach((element) => {
        if (typeof element === 'object') {
          array.push(Object.values(element));
        } else {
          array.push(element);
        }
      });

      return array;
    },

    /**
     * Canonical ability power calculation client-side
     *
     * @param characterPowers
     * @param abilityPowers
     */
    // eslint-disable-next-line no-unused-vars
    calcPower(characterPowers, abilityPowers, points) {
      // Starting point for power calc
      let calcPower = 1;

      const powers = this.combineBonuses([
        characterPowers,
        abilityPowers,
      ]);

      const multiplicatives = powers.filter((bonus) => bonus.operation === 'multiplicative');

      const additives = powers.filter((bonus) => bonus.operation === 'additive');

      multiplicatives.forEach((bonus) => {
        calcPower *= bonus.value;
      });

      additives.forEach((bonus) => {
        calcPower += bonus.value;
      });

      return calcPower;
    },

    /**
     * Canonical ability cost calculation client-side
     *
     * @param powerPoints
     * @param costPoints
     * @param cooldownPoints
     * @returns {number|number}
     */
    calcCost(powerPoints, costPoints, cooldownPoints) {
      const minimum = 2;
      const raw = 3 + powerPoints + cooldownPoints - Math.floor(costPoints * 1.5);
      return raw >= minimum ? raw : minimum;
    },

    /**
     * Canonical ability cooldown calculation client-side
     *
     * @param powerPoints
     * @param costPoints
     * @param cooldownPoints
     * @returns {number|number}
     */
    calcCooldown(powerPoints, costPoints, cooldownPoints) {
      const max = Math.max(powerPoints, costPoints);
      return cooldownPoints - max >= 0 ? 0 : max - cooldownPoints;
    },
  },
});
