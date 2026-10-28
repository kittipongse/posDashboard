<script setup>
import { onMounted, ref } from 'vue';
import { getByBranchReport } from '@/api/report.api';
import PageShell from '@/components/common/PageShell.vue';
import { showError } from '@/composables/useSweetAlert';
import { useReportFilters } from '@/composables/useReportFilters';
import { formatThaiDate } from '@/utils/date';
import { formatBaht, formatQty } from '@/utils/format';

const { dateFrom, dateTo, branchId, branches, syncBranches, toParams } = useReportFilters(6);
const items = ref([]);
const totals = ref({ bills: 0, qty: 0, amount: 0 });
const loading = ref(false);

const load = async () => {
  loading.value = true;
  try {
    const response = await getByBranchReport(toParams());
    items.value = response.data.data?.items || [];
    totals.value = response.data.data?.totals || totals.value;
    syncBranches(response.data.data?.branches || []);
  } catch (error) {
    showError('โหลดไม่สำเร็จ', error.response?.data?.message);
  } finally {
    loading.value = false;
  }
};

onMounted(load);
</script>

<template>
  <PageShell
    icon="bi-shop-window"
    title="ยอดขายสาขาแยกตามวัน"
    subtitle="สรุปยอดขายแต่ละสาขาเป็นรายวัน (บิลที่ชำระแล้ว) — เฉพาะสินค้าของร้านคุณ"
    @refresh="load"
  >
    <div class="pos-filter-bar">
      <div class="row g-2 align-items-end">
        <div class="col-md-2">
          <label class="form-label small mb-1">จากวันที่</label>
          <input v-model="dateFrom" type="date" class="form-control form-control-sm" />
        </div>
        <div class="col-md-2">
          <label class="form-label small mb-1">ถึงวันที่</label>
          <input v-model="dateTo" type="date" class="form-control form-control-sm" />
        </div>
        <div class="col-md-3">
          <label class="form-label small mb-1">สาขา</label>
          <select v-model="branchId" class="form-select form-select-sm">
            <option value="">ทุกสาขา</option>
            <option v-for="branch in branches" :key="branch.id" :value="branch.id">
              {{ branch.name }}
            </option>
          </select>
        </div>
        <div class="col-md-2">
          <button class="btn btn-primary btn-sm w-100" type="button" :disabled="loading" @click="load">
            <i class="bi bi-search me-1"></i>ค้นหา
          </button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="p-4 text-center text-muted">กำลังโหลด...</div>
    <div v-else class="pos-table-wrap table-responsive">
      <table class="table table-hover pos-table">
        <thead>
          <tr>
            <th>ลำดับ</th>
            <th>วันที่</th>
            <th>สาขา</th>
            <th>รหัส</th>
            <th>จำนวนบิล</th>
            <th>จำนวนชิ้น</th>
            <th>ยอดขาย</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in items" :key="`${row.date}-${row.branchId}`">
            <td>{{ index + 1 }}</td>
            <td>{{ formatThaiDate(row.date) }}</td>
            <td class="fw-semibold">{{ row.branchName }}</td>
            <td>{{ row.branchCode || '-' }}</td>
            <td>{{ row.bills }}</td>
            <td>{{ formatQty(row.qty) }}</td>
            <td>{{ formatBaht(row.amount) }}</td>
          </tr>
          <tr v-if="!items.length">
            <td colspan="7" class="text-center text-muted py-4">ยังไม่มียอดขายในช่วงนี้</td>
          </tr>
          <tr v-else class="table-primary fw-semibold">
            <td colspan="4">รวม</td>
            <td>{{ totals.bills }}</td>
            <td>{{ formatQty(totals.qty) }}</td>
            <td>{{ formatBaht(totals.amount) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </PageShell>
</template>
