<script setup>
import { computed, onMounted, ref } from 'vue';
import VueApexCharts from 'vue3-apexcharts';
import { getByProductReport } from '@/api/report.api';
import PageShell from '@/components/common/PageShell.vue';
import ReportFilterBar from '@/components/common/ReportFilterBar.vue';
import { showError } from '@/composables/useSweetAlert';
import { useReportFilters } from '@/composables/useReportFilters';
import { formatBaht, formatQty } from '@/utils/format';

const { dateFrom, dateTo, branchId, branches, syncBranches, toParams } = useReportFilters(6);
const items = ref([]);
const totals = ref({ bills: 0, qty: 0, amount: 0 });
const loading = ref(false);

const topItems = computed(() => items.value.slice(0, 10));

const barOptions = computed(() => ({
  chart: { toolbar: { show: false }, fontFamily: 'Sarabun, sans-serif' },
  plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
  xaxis: {
    categories: topItems.value.map((row) => row.name),
    labels: { formatter: (value) => formatBaht(value) }
  },
  dataLabels: { enabled: false },
  colors: ['#1677ff']
}));

const barSeries = computed(() => [{ name: 'ยอดขาย', data: topItems.value.map((row) => row.amount) }]);

const load = async () => {
  loading.value = true;
  try {
    const response = await getByProductReport(toParams());
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
    icon="bi-box-seam"
    title="รายงานตามสินค้า"
    subtitle="แตกยอดขายตามสินค้าของร้านคุณ"
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
      <VueApexCharts
        v-if="!loading && topItems.length"
        type="bar"
        height="320"
        :options="barOptions"
        :series="barSeries"
      />
    </div>

    <div v-if="loading" class="p-4 text-center text-muted">กำลังโหลด...</div>
    <div v-else class="pos-table-wrap table-responsive">
      <table class="table table-hover pos-table">
        <thead>
          <tr>
            <th>ลำดับ</th>
            <th>SKU</th>
            <th>สินค้า</th>
            <th class="text-end">บิล</th>
            <th class="text-end">ชิ้น</th>
            <th class="text-end">ยอดขาย</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!items.length">
            <td colspan="6" class="text-center text-muted py-4">ไม่มีข้อมูลในช่วงที่เลือก</td>
          </tr>
          <tr v-for="(row, index) in items" :key="`${row.productId}-${row.sku}`">
            <td>{{ index + 1 }}</td>
            <td>{{ row.sku || '-' }}</td>
            <td>{{ row.name }}</td>
            <td class="text-end">{{ row.bills }}</td>
            <td class="text-end">{{ formatQty(row.qty) }}</td>
            <td class="text-end">{{ formatBaht(row.amount) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </PageShell>
</template>
