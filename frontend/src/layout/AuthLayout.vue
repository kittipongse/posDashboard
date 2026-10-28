<script setup>
import AppLogo from '@/components/common/AppLogo.vue';
</script>

<template>
  <div class="pos-auth-page">
    <section class="pos-auth-brand">
      <AppLogo :size="80" class="mb-3" />
      <h1 class="h3 mb-2">PosDashboard</h1>
      <p class="mb-0 fs-5">พอร์ทัลตัวแทนร้านค้า — ดูยอดขายสินค้าของคุณ</p>
    </section>
    <section class="pos-auth-form">
      <router-view />
    </section>
  </div>
</template>
