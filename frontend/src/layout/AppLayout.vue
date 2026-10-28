<script setup>
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import AppSidebar from './AppSidebar.vue';
import AppTopbar from './AppTopbar.vue';

const route = useRoute();
const sidebarOpen = ref(false);

const pageTitle = computed(() => route.meta.pageTitle || 'PosDashboard');
const pageSubtitle = computed(() => route.meta.pageSubtitle || '');
</script>

<template>
  <div class="pos-layout">
    <AppSidebar :class="{ open: sidebarOpen }" @navigate="sidebarOpen = false" />
    <div class="pos-main">
      <AppTopbar
        :title="pageTitle"
        :subtitle="pageSubtitle"
        @toggle-sidebar="sidebarOpen = !sidebarOpen"
      />
      <main class="pos-content">
        <router-view />
      </main>
    </div>
    <div
      v-if="sidebarOpen"
      class="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-lg-none"
      style="z-index: 1035"
      @click="sidebarOpen = false"
    />
  </div>
</template>
