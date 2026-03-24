import { createRouter, createWebHistory } from 'vue-router';
import LandingPage from './pages/LandingPage.vue';
import AdminPage from './pages/AdminPage.vue';

const routes = [
  { path: '/', name: 'landing', component: LandingPage },
  { path: '/admin', name: 'admin', component: AdminPage },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  if (to.name === 'landing') {
    sessionStorage.removeItem('adminToken');
    localStorage.removeItem('adminToken');
  }
  next();
});
