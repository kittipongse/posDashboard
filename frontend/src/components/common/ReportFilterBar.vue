<script setup>
defineProps({
  dateFrom: { type: String, required: true },
  dateTo: { type: String, required: true },
  branchId: { type: [String, Number], default: '' },
  branches: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  showBranch: { type: Boolean, default: true }
});

const emit = defineEmits(['update:dateFrom', 'update:dateTo', 'update:branchId', 'search']);
</script>

<template>
  <div class="pos-filter-bar">
    <div class="row g-2 align-items-end">
      <div class="col-md-3">
        <label class="form-label small mb-1">จากวันที่</label>
        <input
          type="date"
          class="form-control form-control-sm"
          :value="dateFrom"
          @input="emit('update:dateFrom', $event.target.value)"
        />
      </div>
      <div class="col-md-3">
        <label class="form-label small mb-1">ถึงวันที่</label>
        <input
          type="date"
          class="form-control form-control-sm"
          :value="dateTo"
          @input="emit('update:dateTo', $event.target.value)"
        />
      </div>
      <div v-if="showBranch" class="col-md-3">
        <label class="form-label small mb-1">สาขา</label>
        <select
          class="form-select form-select-sm"
          :value="branchId"
          @change="emit('update:branchId', $event.target.value)"
        >
          <option value="">สาขาทั้งหมด</option>
          <option v-for="branch in branches" :key="branch.id" :value="branch.id">
            {{ branch.name }}
          </option>
        </select>
      </div>
      <div class="col-md-2">
        <button class="btn btn-primary btn-sm w-100" type="button" :disabled="loading" @click="emit('search')">
          <i class="bi bi-search me-1"></i>ค้นหา
        </button>
      </div>
    </div>
  </div>
</template>
