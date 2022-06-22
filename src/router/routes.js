import {
  mdiAbacus, mdiEarth, mdiHammer, mdiHeadQuestion, mdiHorse, mdiWizardHat
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
    component: () => import('@/views/hidden/Builder'),
    meta: {
      overlay: false,
      combat_lock: false,
    },
  },
  {
    path: '/world',
    alias: '/',
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
    path: '/admin',
    name: 'Admin',
    component: () => import('@/views/primary/Admin'),
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
    path: '/alpha-test',
    name: 'Alpha Test',
    component: () => import('@/views/primary/AlphaTest'),
    meta: {
      render: true,
      icon: mdiAbacus,
      overlay: true,
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
