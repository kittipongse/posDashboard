<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppLogo from '@/components/common/AppLogo.vue';
import { useAuthStore } from '@/stores/auth.store';

defineProps({
  title: { type: String, default: 'PosDashboard' },
  subtitle: { type: String, default: '' }
});

defineEmits(['toggle-sidebar']);

const router = useRouter();
const authStore = useAuthStore();
const loggingOut = ref(false);

const displayName = computed(() => authStore.displayName || 'ผู้ใช้งาน');
const roleLabel = computed(() => {
  const ref = authStore.vendorLabel;
  return ref ? `Vendor · ${ref}` : 'Vendor';
});

const logout = async () => {
  if (loggingOut.value) return;
  loggingOut.value = true;
  try {
    await authStore.logout();
    router.push({ name: 'login' });
  } finally {
    loggingOut.value = false;
  }
};
</script>

<template>
  <header class="pos-topbar">
    <div class="d-flex align-items-center gap-3">
      <button class="btn btn-light btn-sm d-lg-none" type="button" @click="$emit('toggle-sidebar')">
        <i class="bi bi-list fs-5"></i>
      </button>
      <div class="pos-topbar-title">
        <h2>{{ title }}</h2>
        <p v-if="subtitle">{{ subtitle }}</p>
      </div>
    </div>
    <div class="dropdown">
      <button
        class="btn btn-light btn-sm dropdown-toggle d-flex align-items-center gap-2"
        type="button"
        data-bs-toggle="dropdown"
      >
        <AppLogo :size="24" />
        <span class="text-start d-none d-md-block">
          <strong class="d-block lh-1">{{ displayName }}</strong>
          <small class="text-muted">{{ roleLabel }}</small>
        </span>
      </button>
      <ul class="dropdown-menu dropdown-menu-end">
        <li>
          <span class="dropdown-item-text small text-muted">{{ authStore.user?.username }}</span>
        </li>
        <li><hr class="dropdown-divider" /></li>
        <li>
          <button class="dropdown-item" type="button" :disabled="loggingOut" @click="logout">
            <i class="bi bi-box-arrow-right me-2"></i>
            {{ loggingOut ? 'กำลังออก...' : 'ออกจากระบบ' }}
          </button>
        </li>
      </ul>
    </div>
  </header>
</template>
