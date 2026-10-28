<script setup>
import { computed } from 'vue';
import logoUrl from '@/assets/logo.png';

const props = defineProps({
  size: { type: [Number, String], default: 40 },
  height: { type: [Number, String], default: null },
  alt: { type: String, default: 'PosDashboard' }
});

const logoHeight = computed(() => Number(props.height ?? props.size));
</script>

<template>
  <img :src="logoUrl" :alt="alt" class="app-logo" :style="{ height: `${logoHeight}px` }" />
</template>

<style scoped>
.app-logo {
  display: inline-block;
  width: auto;
  max-width: 100%;
  object-fit: contain;
}
</style>
