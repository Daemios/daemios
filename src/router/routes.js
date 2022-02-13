import { mdiAbacus, mdiEarth } from '@mdi/js';

export default [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/primary/Login'),
  },
  {
    path: '/world',
    alias: '/',
    name: 'World',
    component: () => import('@/views/primary/World'),
    meta: {
      render: true,
      icon: mdiEarth,
    },
  },
  {
    path: '/cores',
    name: 'Cores',
    component: () => import('@/views/primary/Cores'),
    meta: {
      render: true,
      icon: mdiAbacus,
    },
  },
  {
    path: '/cores/edit/*',
    name: 'Edit Core',
    component: () => import('@/views/primary/EditCore'),
    meta: {
      render: false,
    },
  },
  {
    path: '/crafting',
    name: 'Crafting',
    component: () => import('@/views/primary/Crafting'),
    meta: {
      render: true,
      icon: mdiAbacus,
    },
  },
  {
    path: '*',
    name: 'Page Not Found',
    component: () => import('@/views/hidden/NotFound'),
    meta: {
      requiresAuth: false,
      permission: null,
    },
  },
];
