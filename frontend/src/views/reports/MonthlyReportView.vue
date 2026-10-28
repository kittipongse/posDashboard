<script setup>
import { computed, onMounted, ref } from 'vue';
import VueApexCharts from 'vue3-apexcharts';
import { getMonthlyReport, getSummaryReport } from '@/api/report.api';
import PageShell from '@/components/common/PageShell.vue';
import { showError } from '@/composables/useSweetAlert';
import { formatBaht, formatQty, monthLabel } from '@/utils/format';

const monthLabels = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const currentYear = new Date().getFullYear();

const year = ref(currentYear);
const branchId = ref('');
const branches = ref([]);
const items = ref([]);
const chart = ref([]);
const totals = ref({ bills: 0, qty: 0, amount: 0 });
const loading = ref(false);

const years = computed(() => {
  const list = [];
  for (let y = currentYear; y >= currentYear - 5; y -= 1) list.push(y);
  return list;
});

const barOptions = computed(() => ({
  chart: { toolbar: { show: false }, fontFamily: 'Sarabun, sans-serif' },
  xaxis: { categories: monthLabels },
  colors: ['#1677ff'],
  dataLabels: { enabled: false }
}));

const barSeries = computed(() => [
  { name: 'ยอดขาย', data: chart.value.map((row) => row.amount) }
]);

const load = async () => {
  loading.value = true;
  try {
    const response = await getMonthlyReport({
      year: year.value,
      branchId: branchId.value || undefined
    });
    items.value = response.data.data?.items || [];
    chart.value = response.data.data?.chart || [];
    totals.value = response.data.data?.totals || totals.value;
    if (response.data.data?.branches) {
      branches.value = response.data.data.branches;
    }
  } catch (error) {
    showError('โหลดไม่สำเร็จ', error.response?.data?.message);
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  try {
    const response = await getSummaryReport({});
    branches.value = response.data.data?.branches || [];
  } catch {
    branches.value = [];
  }
  await load();
});
</script>

<template>
  <PageShell
    icon="bi-calendar3"
    title="สรุปยอดขายรายเดือน (Monthly Sales)"
    subtitle="คำนวณจากบิลขายจริง สถานะชำระแล้ว — เฉพาะสินค้าของร้านคุณ"
    @refresh="load"
  >
    <div class="pos-filter-bar">
      <div class="row g-2 align-items-end">
        <div class="col-md-3">
          <label class="form-label small mb-1">ปี</label>
          <select v-model.number="year" class="form-select form-select-sm">
            <option v-for="y in years" :key="y" :value="y">พ.ศ. {{ y + 543 }}</option>
          </select>
        </div>
        <div class="col-md-3">
          <label class="form-label small mb-1">สาขา</label>
          <select v-model="branchId" class="form-select form-select-sm">
            <option value="">สาขาทั้งหมด</option>
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
            <th>เดือน/ปี</th>
            <th>จำนวนบิล</th>
            <th>จำนวนชิ้น</th>
            <th>ยอดขาย</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in items" :key="`${row.year}-${row.month}`">
            <td>{{ index + 1 }}</td>
            <td>{{ monthLabel(row.year, row.month) }}</td>
            <td>{{ row.bills }}</td>
            <td>{{ formatQty(row.qty) }}</td>
            <td>{{ formatBaht(row.amount) }}</td>
          </tr>
          <tr v-if="!items.length">
            <td colspan="5" class="text-center text-muted py-4">ยังไม่มียอดขายในปีนี้</td>
          </tr>
          <tr v-else class="table-primary fw-semibold">
            <td colspan="2">รวมปี</td>
            <td>{{ totals.bills }}</td>
            <td>{{ formatQty(totals.qty) }}</td>
            <td>{{ formatBaht(totals.amount) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="p-3">
      <div class="pos-card p-3">
        <h4 class="h6 mb-3">แนวโน้มยอดขายรายเดือน</h4>
        <VueApexCharts type="bar" height="300" :options="barOptions" :series="barSeries" />
      </div>
    </div>
  </PageShell>
</template>
