<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();
</script>

<template>
  <div class="d-flex align-items-center justify-content-center min-vh-100 bg-light">
    <div class="text-center p-4">
      <h1 class="display-4 text-primary">404</h1>
      <p class="text-muted mb-4">ไม่พบหน้าที่ต้องการ</p>
      <button class="btn btn-primary" type="button" @click="router.push('/dashboard')">
        กลับแดชบอร์ด
      </button>
    </div>
  </div>
</template>
