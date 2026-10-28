<script setup>
import { computed, onMounted, ref } from 'vue';
import VueApexCharts from 'vue3-apexcharts';
import { getDailyReport, getSummaryReport } from '@/api/report.api';
import ReportFilterBar from '@/components/common/ReportFilterBar.vue';
import { showError } from '@/composables/useSweetAlert';
import { useReportFilters } from '@/composables/useReportFilters';
import { useAuthStore } from '@/stores/auth.store';
import { formatThaiDate, formatThaiDateTime } from '@/utils/date';
import { formatBaht, formatQty } from '@/utils/format';

const authStore = useAuthStore();
const { dateFrom, dateTo, branchId, branches, syncBranches, toParams } = useReportFilters(6);

const loading = ref(false);
const totals = ref({ bills: 0, qty: 0, amount: 0 });
const daily = ref([]);

const chartOptions = computed(() => ({
  chart: { toolbar: { show: false }, fontFamily: 'Sarabun, sans-serif' },
  stroke: { curve: 'smooth', width: 3 },
  colors: ['#1677ff'],
  xaxis: {
    categories: [...daily.value].reverse().map((row) => formatThaiDate(row.date))
  },
  dataLabels: { enabled: false },
  yaxis: {
    labels: { formatter: (value) => formatBaht(value) }
  }
}));

const chartSeries = computed(() => [
  { name: 'ยอดขาย', data: [...daily.value].reverse().map((row) => row.amount) }
]);

const load = async () => {
  loading.value = true;
  try {
    const params = toParams();
    const [summaryRes, dailyRes] = await Promise.all([
      getSummaryReport(params),
      getDailyReport(params)
    ]);
    totals.value = summaryRes.data.data?.totals || totals.value;
    daily.value = dailyRes.data.data?.items || [];
    syncBranches(summaryRes.data.data?.branches || dailyRes.data.data?.branches || []);
  } catch (error) {
    showError('โหลดไม่สำเร็จ', error.response?.data?.message);
  } finally {
    loading.value = false;
  }
};

onMounted(load);
</script>

<template>
  <div>
    <div class="row g-3 mb-3">
      <div class="col-md-4">
        <div class="pos-card p-3 h-100">
          <small class="text-muted">ร้านค้า</small>
          <div class="fs-5 fw-semibold">{{ authStore.displayName || '-' }}</div>
          <small class="text-muted">
            {{ authStore.vendorLabel || authStore.user?.username }}
          </small>
        </div>
      </div>
      <div class="col-md-4">
        <div class="pos-card p-3 h-100">
          <small class="text-muted">ช่วงวันที่</small>
          <div class="fs-5 fw-semibold">
            {{ formatThaiDate(dateFrom) }} – {{ formatThaiDate(dateTo) }}
          </div>
          <small class="text-muted">Asia/Bangkok</small>
        </div>
      </div>
      <div class="col-md-4">
        <div class="pos-card p-3 h-100">
          <small class="text-muted">อัปเดตล่าสุด</small>
          <div class="fs-5 fw-semibold">{{ formatThaiDateTime() }}</div>
          <small class="text-muted">บิลสถานะชำระแล้วเท่านั้น</small>
        </div>
      </div>
    </div>

    <div class="pos-card mb-3">
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
    </div>

    <div class="pos-card p-3">
      <h3 class="h5 mb-3">แนวโน้มยอดขายรายวัน</h3>
      <div v-if="loading" class="text-muted">กำลังโหลด...</div>
      <VueApexCharts v-else type="line" height="280" :options="chartOptions" :series="chartSeries" />
      <p class="small text-muted mb-0 mt-2">แสดงเฉพาะสินค้าที่ผูกกับร้านค้าของคุณ</p>
    </div>
  </div>
</template>
