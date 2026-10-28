<script setup>
import { computed, onMounted, ref } from 'vue';
import VueApexCharts from 'vue3-apexcharts';
import { getDailyReport } from '@/api/report.api';
import PageShell from '@/components/common/PageShell.vue';
import ReportFilterBar from '@/components/common/ReportFilterBar.vue';
import { showError } from '@/composables/useSweetAlert';
import { useReportFilters } from '@/composables/useReportFilters';
import { formatThaiDate } from '@/utils/date';
import { formatBaht, formatQty } from '@/utils/format';

const { dateFrom, dateTo, branchId, branches, syncBranches, toParams } = useReportFilters(6);
const items = ref([]);
const totals = ref({ bills: 0, qty: 0, amount: 0 });
const loading = ref(false);

const lineOptions = computed(() => ({
  chart: { toolbar: { show: false }, fontFamily: 'Sarabun, sans-serif' },
  xaxis: {
    categories: [...items.value].reverse().map((row) => formatThaiDate(row.date))
  },
  colors: ['#1677ff'],
  dataLabels: { enabled: false }
}));

const lineSeries = computed(() => [
  { name: 'ยอดขาย', data: [...items.value].reverse().map((row) => row.amount) }
]);

const load = async () => {
  loading.value = true;
  try {
    const response = await getDailyReport(toParams());
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
    icon="bi-bar-chart-line"
    title="รายงานยอดขายรายวัน"
    subtitle="สรุปจากบิลที่ชำระแล้ว — เฉพาะสินค้าของร้านคุณ"
    @refresh="load"
  >
    <ReportFilterBar
      v-model:date-from="dateFrom"
      v-model:date-to="dateTo"
      v-model:branch-id="branchId"
      :branches="branches"
      :loading="loading"
      @search="load"
    />

    <div class="row g-3 p-3">
      <div class="col-md-4">
        <div class="pos-summary-card blue">
          <small>จำนวนบิล</small>
          <strong>{{ totals.bills || 0 }}</strong>
        </div>
      </div>
      <div class="col-md-4">
        <div class="pos-summary-card cyan">
          <small>จำนวนชิ้น</small>
          <strong>{{ formatQty(totals.qty || 0) }}</strong>
        </div>
      </div>
      <div class="col-md-4">
        <div class="pos-summary-card green">
          <small>ยอดขาย</small>
          <strong>{{ formatBaht(totals.amount || 0) }}</strong>
        </div>
      </div>
    </div>

    <div class="px-3 pb-3">
      <VueApexCharts v-if="!loading" type="line" height="240" :options="lineOptions" :series="lineSeries" />
    </div>

    <div v-if="loading" class="p-4 text-center text-muted">กำลังโหลด...</div>
    <div v-else class="pos-table-wrap table-responsive">
      <table class="table table-hover pos-table">
        <thead>
          <tr>
            <th>วันที่</th>
            <th class="text-end">บิล</th>
            <th class="text-end">ชิ้น</th>
            <th class="text-end">ยอดขาย</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!items.length">
            <td colspan="4" class="text-center text-muted py-4">ไม่มีข้อมูลในช่วงที่เลือก</td>
          </tr>
          <tr v-for="row in items" :key="row.date">
            <td>{{ formatThaiDate(row.date) }}</td>
            <td class="text-end">{{ row.bills }}</td>
            <td class="text-end">{{ formatQty(row.qty) }}</td>
            <td class="text-end">{{ formatBaht(row.amount) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </PageShell>
</template>
