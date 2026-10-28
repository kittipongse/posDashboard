<script setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { warmAuthApi } from '@/api/auth.api';
import AppLogo from '@/components/common/AppLogo.vue';
import { showSuccess } from '@/composables/useSweetAlert';
import { useAuthStore } from '@/stores/auth.store';
import { clearRememberedLogin, getRememberedLogin, saveRememberedLogin } from '@/utils/rememberLogin';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const username = ref('');
const password = ref('');
const rememberMe = ref(false);
const loading = ref(false);
const errorMessage = ref('');
const companyName = ref('PosDashboard');
const idleMessage = ref(
  route.query.reason === 'idle' ? 'หมดเวลาการใช้งาน กรุณาเข้าสู่ระบบใหม่' : ''
);

const safeRedirect = (value) => {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/login')) return null;
  return value;
};

const submit = async () => {
  errorMessage.value = '';
  idleMessage.value = '';
  if (!username.value.trim() || !password.value) {
    errorMessage.value = 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน';
    return;
  }

  loading.value = true;
  try {
    await authStore.login(username.value.trim(), password.value);
    if (rememberMe.value) saveRememberedLogin(username.value.trim(), password.value);
    else clearRememberedLogin();

    const target = safeRedirect(route.query.redirect) || '/dashboard';
    await router.replace(target);
    showSuccess('เข้าสู่ระบบสำเร็จ', `สวัสดี ${authStore.displayName}`);
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      errorMessage.value = 'เซิร์ฟเวอร์ตอบช้า กรุณาลองใหม่';
    } else if (!error.response) {
      errorMessage.value = 'เชื่อมต่อ API ไม่ได้ — ตรวจว่า backend เปิดอยู่';
    } else {
      errorMessage.value = error.response?.data?.message || 'ไม่สามารถเข้าสู่ระบบได้';
    }
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  const remembered = getRememberedLogin();
  if (remembered) {
    username.value = remembered.username;
    password.value = remembered.password;
    rememberMe.value = true;
  }

  try {
    const response = await warmAuthApi();
    companyName.value = response.data?.data?.companyName || companyName.value;
  } catch {
    // health optional on login screen
  }
});
</script>

<template>
  <form class="pos-auth-card" @submit.prevent="submit">
    <div class="text-center mb-3">
      <AppLogo :size="52" class="mb-2" />
      <div class="small text-muted">{{ companyName }}</div>
    </div>
    <h2 class="h4 mb-1 text-center">เข้าสู่ระบบร้านค้า</h2>
    <p class="text-muted small text-center mb-4">ใช้บัญชี PosDashboard ที่แอดมินออกให้</p>

    <div v-if="idleMessage" class="alert alert-warning py-2">{{ idleMessage }}</div>
    <div v-if="errorMessage" class="alert alert-danger py-2">{{ errorMessage }}</div>

    <div class="mb-3">
      <label class="form-label" for="username">ชื่อผู้ใช้</label>
      <input
        id="username"
        v-model="username"
        class="form-control"
        autocomplete="username"
        autofocus
        :disabled="loading"
      />
    </div>
    <div class="mb-3">
      <label class="form-label" for="password">รหัสผ่าน</label>
      <input
        id="password"
        v-model="password"
        type="password"
        class="form-control"
        autocomplete="current-password"
        :disabled="loading"
      />
    </div>
    <div class="form-check mb-3">
      <input id="rememberMe" v-model="rememberMe" class="form-check-input" type="checkbox" :disabled="loading" />
      <label class="form-check-label" for="rememberMe">จำชื่อผู้ใช้และรหัสผ่านบนเครื่องนี้</label>
    </div>
    <button class="btn btn-primary w-100" type="submit" :disabled="loading">
      <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
      <i v-else class="bi bi-box-arrow-in-right me-2"></i>เข้าสู่ระบบ
    </button>
  </form>
</template>
