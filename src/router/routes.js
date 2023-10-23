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
    name: 'World',
    component: () => import('@/views/primary/World'),
    meta: {
      render: true,
      icon: mdiEarth,
      overlay: true,
      combat_lock: false,
    },
  },
  {
    path: '/cores',
    name: 'Cores',
    component: () => import('@/views/primary/Vessels'),
    meta: {
      render: true,
      icon: mdiAbacus,
      overlay: true,
      combat_lock: true,
    },
  },
  {
    path: '/crafting',
    name: 'Crafting',
    component: () => import('@/views/primary/Crafting'),
    meta: {
      render: true,
      icon: mdiHammer,
      overlay: true,
      combat_lock: true,
    },
  },
  {
    path: '/mount',
    name: 'Mount',
    component: () => import('@/views/primary/Mount'),
    meta: {
      render: true,
      icon: mdiHorse,
      overlay: true,
      combat_lock: true,
    },
  },
  {
    path: '/travel',
    name: 'Travel',
    component: () => import('@/views/primary/Travel'),
    meta: {
      render: true,
      icon: mdiHorseVariantFast,
      overlay: true,
      combat_lock: true,
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
    path: '/test',
    name: 'Test',
    component: () => import('@/views/hidden/Test'),
    meta: {
      render: false,
      icon: mdiHeadQuestion,
      overlay: false,
      combat_lock: true,
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
