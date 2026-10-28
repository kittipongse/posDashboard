<script setup>
import { computed } from 'vue';

const props = defineProps({
  status: { type: String, default: 'active' }
});

const config = computed(() => {
  const map = {
    active: { label: 'ใช้งาน', class: 'text-bg-success' },
    inactive: { label: 'ไม่ใช้งาน', class: 'text-bg-danger' }
  };
  return map[props.status] || { label: props.status, class: 'text-bg-secondary' };
});
</script>

<template>
  <span class="badge rounded-pill" :class="config.class">{{ config.label }}</span>
</template>
