import {
  mdiAbacus, mdiEarth, mdiHammer, mdiHeadQuestion, mdiHorse, mdiHorseVariantFast, mdiWizardHat
} from '@mdi/js';

export default [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/hidden/Login'),
    meta: {
      overlay: false,
      combat_lock: false,
    },
  },
  {
    path: '/builder',
    name: 'Builder',
    component: () => import('@/views/primary/Builder'),
    meta: {
      overlay: false,
      combat_lock: false,
    },
  },
  {
    path: '/',
    name: 'DnDaemios',
    component: () => import('@/views/primary/Main'),
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
    component: () => import('@/views/primary/DungeonMaster'),
    meta: {
      render: true,
      icon: mdiWizardHat,
      overlay: true,
      combat_lock: false,
    },
  },
  {
    path: '/worldmap',
    name: 'World Map',
    component: () => import('@/views/primary/WorldMap'),
    meta: {
      overlay: false,
      combat_lock: false,
    },
  },
  {
    path: '/characters',
    name: 'Characters',
    component: () => import('@/views/hidden/Characters'),
    meta: {
      render: false,
      overlay: false,
    },
  },
  {
    path: '*',
    name: 'Page Not Found',
    component: () => import('@/views/hidden/NotFound'),
    meta: {
      requiresAuth: false,
      permission: null,
      overlay: true,
    },
  },
];
