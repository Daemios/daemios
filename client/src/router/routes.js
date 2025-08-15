import {
  mdiAbacus, mdiEarth, mdiHammer, mdiHeadQuestion, mdiHorse, mdiHorseVariantFast, mdiWizardHat
} from '@mdi/js';

export default [
  {
    path: '/login',
    name: 'Login',
  component: () => import('@/views/hidden/Login.vue'),
    meta: {
      overlay: false,
      combat_lock: false,
    },
  },
  {
    path: '/builder',
    name: 'Builder',
  component: () => import('@/views/primary/Builder.vue'),
    meta: {
      overlay: false,
      combat_lock: false,
    },
  },
  {
    path: '/',
    name: 'DnDaemios',
  component: () => import('@/views/primary/Main.vue'),
    meta: {
      render: true,
      icon: mdiEarth,
      overlay: true,
      combat_lock: false,
    },
  },
  {
    path: '/dungeon-master',
    name: 'Dungeon Master',
  component: () => import('@/views/primary/DungeonMaster.vue'),
    meta: {
      render: true,
      icon: mdiWizardHat,
      overlay: true,
      combat_lock: false,
    },
  },
  {
    meta: {
      overlay: false,
      combat_lock: false,
    },
  },
  {
    path: '/worldmap',
    name: 'World Map',
  component: () => import('@/views/primary/WorldMap.vue'),
    meta: {
      requiresAuth: false,
      overlay: false,
      combat_lock: false,
    },
  },
  {
    path: '/characters',
    name: 'Characters',
  component: () => import('@/views/hidden/Characters.vue'),
    meta: {
      render: false,
      overlay: false,
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'Page Not Found',
  component: () => import('@/views/hidden/NotFound.vue'),
    meta: {
      requiresAuth: false,
      permission: null,
      overlay: true,
    },
  },
];
