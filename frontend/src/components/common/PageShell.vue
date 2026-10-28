<script setup>
defineProps({
  icon: { type: String, default: 'bi-grid' },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  showRefresh: { type: Boolean, default: true },
  refreshLabel: { type: String, default: 'รีเฟรช' }
});

const emit = defineEmits(['refresh']);
</script>

<template>
  <div class="pos-card mb-3">
    <div class="pos-page-header">
      <div class="d-flex align-items-center gap-3">
        <span class="pos-page-header-icon"><i :class="['bi', icon]"></i></span>
        <div>
          <h3 class="h5 mb-0">{{ title }}</h3>
          <p v-if="subtitle" class="text-muted small mb-0">{{ subtitle }}</p>
        </div>
      </div>
      <div class="d-flex gap-2">
        <button
          v-if="showRefresh"
          class="btn btn-outline-secondary btn-sm"
          type="button"
          @click="emit('refresh')"
        >
          <i class="bi bi-arrow-clockwise me-1"></i>{{ refreshLabel }}
        </button>
        <slot name="actions" />
      </div>
    </div>
    <slot />
  </div>
</template>
