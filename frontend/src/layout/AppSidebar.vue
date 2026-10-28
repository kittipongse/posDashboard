<script setup>
import { useRoute } from 'vue-router';
import AppLogo from '@/components/common/AppLogo.vue';
import { NAV_ITEMS } from '@/constants/nav';
import { useAuthStore } from '@/stores/auth.store';

defineEmits(['navigate']);

const route = useRoute();
const authStore = useAuthStore();

const isActive = (path) => route.path === path || route.path.startsWith(`${path}/`);
</script>

<template>
  <aside class="pos-sidebar">
    <div class="pos-sidebar-brand">
      <div class="mb-2">
        <AppLogo :size="44" />
      </div>
      <h1>PosDashboard</h1>
      <p class="mb-0">{{ authStore.displayName || 'ตัวแทนร้านค้า' }}</p>
    </div>
    <nav class="pos-sidebar-nav">
      <router-link
        v-for="item in NAV_ITEMS"
        :key="item.to"
        :to="item.to"
        class="pos-sidebar-link"
        :class="{ active: isActive(item.to) }"
        @click="$emit('navigate')"
      >
        <i :class="['bi', item.icon]"></i>
        <span>{{ item.label }}</span>
      </router-link>
    </nav>
    <div class="pos-sidebar-footer">PosDashboard · Vendor Portal</div>
  </aside>
</template>
