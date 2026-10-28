import { createRouter, createWebHistory } from 'vue-router';
import AppLayout from '@/layout/AppLayout.vue';
import AuthLayout from '@/layout/AuthLayout.vue';
import { useAuthStore } from '@/stores/auth.store';

const authRoute = (route) => ({
  ...route,
  meta: { requiresAuth: true, ...(route.meta || {}) }
});

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      component: AuthLayout,
      meta: { public: true },
      children: [
        {
          path: '',
          name: 'login',
          component: () => import('@/views/auth/LoginView.vue'),
          meta: { public: true }
        }
      ]
    },
    {
      path: '/',
      component: AppLayout,
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: '/dashboard' },
        authRoute({
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/dashboard/DashboardView.vue'),
          meta: {
            pageTitle: 'แดชบอร์ด',
            pageSubtitle: 'สรุปยอดขายสินค้าของคุณ'
          }
        }),
        authRoute({
          path: 'reports/daily',
          name: 'reports-daily',
          component: () => import('@/views/reports/DailyReportView.vue'),
          meta: {
            pageTitle: 'รายงานรายวัน',
            pageSubtitle: 'ยอดขายสินค้าของคุณแยกตามวัน'
          }
        }),
        authRoute({
          path: 'reports/monthly',
          name: 'reports-monthly',
          component: () => import('@/views/reports/MonthlyReportView.vue'),
          meta: {
            pageTitle: 'รายงานรายเดือน',
            pageSubtitle: 'ยอดขายสินค้าของคุณแยกตามเดือน'
          }
        }),
        authRoute({
          path: 'reports/by-branch',
          name: 'reports-by-branch',
          component: () => import('@/views/reports/ByBranchReportView.vue'),
          meta: {
            pageTitle: 'ยอดขายสาขาแยกตามวัน',
            pageSubtitle: 'สรุปยอดขายแต่ละสาขาเป็นรายวัน — สินค้าของร้านคุณ'
          }
        }),
        { path: 'reports/by-product', redirect: '/reports/daily' }
      ]
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/pages/NotFound.vue'),
      meta: { public: true }
    }
  ]
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();
  const ok = await authStore.restoreSession();

  if (to.meta.public) {
    if (to.name === 'login' && ok) {
      return { name: 'dashboard' };
    }
    return true;
  }

  if (!ok) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  return true;
});

export default router;
