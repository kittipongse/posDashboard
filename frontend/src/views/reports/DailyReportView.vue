<script setup>
import { computed, nextTick, onMounted, ref } from 'vue';
import { getDailyDetailReport } from '@/api/report.api';
import PageShell from '@/components/common/PageShell.vue';
import { showError, showSuccess } from '@/composables/useSweetAlert';
import { useReportFilters } from '@/composables/useReportFilters';
import { useAuthStore } from '@/stores/auth.store';
import {
  downloadDailyDetailPdf,
  exportDailyDetailExcel,
  formatBillTime
} from '@/utils/exportDailyDetail';
import { formatThaiDate, formatThaiDateTime } from '@/utils/date';
import { formatBaht, formatQty } from '@/utils/format';

const authStore = useAuthStore();
const { dateFrom, dateTo, branchId, branches, syncBranches, toParams } = useReportFilters(0);

const days = ref([]);
const totals = ref({ bills: 0, qty: 0, amount: 0 });
const loading = ref(false);
const exporting = ref(false);
const reportRef = ref(null);

const vendorTitle = computed(
  () => `${authStore.displayName || 'ร้านค้า'}${authStore.vendorLabel ? ` (${authStore.vendorLabel})` : ''}`
);

const branchLabel = computed(() => {
  if (!branchId.value) return 'สาขาทั้งหมด';
  const found = branches.value.find((row) => String(row.id) === String(branchId.value));
  return found?.name || 'สาขาที่เลือก';
});

const load = async () => {
  loading.value = true;
  try {
    const response = await getDailyDetailReport(toParams());
    days.value = response.data.data?.days || [];
    totals.value = response.data.data?.totals || { bills: 0, qty: 0, amount: 0, cancelledBills: 0 };
    syncBranches(response.data.data?.branches || []);
  } catch (error) {
    showError('โหลดไม่สำเร็จ', error.response?.data?.message);
  } finally {
    loading.value = false;
  }
};

const exportExcel = async () => {
  if (!days.value.length) {
    showError('ไม่มีข้อมูล', 'ยังไม่มีรายงานสำหรับส่งออก');
    return;
  }
  exporting.value = true;
  try {
    await exportDailyDetailExcel({
      days: days.value,
      totals: totals.value,
      dateFrom: dateFrom.value,
      dateTo: dateTo.value,
      vendorLabel: authStore.vendorLabel || authStore.displayName
    });
    showSuccess('ส่งออก Excel สำเร็จ');
  } catch (error) {
    showError('ส่งออกไม่สำเร็จ', error.message || 'ลองใหม่อีกครั้ง');
  } finally {
    exporting.value = false;
  }
};

const printPdf = async () => {
  if (!days.value.length) {
    showError('ไม่มีข้อมูล', 'ยังไม่มีรายงานสำหรับพิมพ์');
    return;
  }
  exporting.value = true;
  try {
    await nextTick();
    await downloadDailyDetailPdf({
      element: reportRef.value,
      dateFrom: dateFrom.value,
      dateTo: dateTo.value,
      vendorLabel: authStore.vendorLabel || authStore.displayName
    });
    showSuccess('สร้าง PDF สำเร็จ');
  } catch (error) {
    showError('พิมพ์ไม่สำเร็จ', error.message || 'ลองใหม่อีกครั้ง');
  } finally {
    exporting.value = false;
  }
};

onMounted(load);
</script>

<template>
  <PageShell
    icon="bi-bar-chart-line"
    title="สรุปยอดขายรายวัน (Daily Sales)"
    subtitle="คำนวณจากบิลขายจริง สถานะชำระแล้ว — เฉพาะสินค้าของร้านคุณ (บิลยกเลิกแสดงด้านล่างแต่ละวัน)"
    @refresh="load"
  >
    <template #actions>
      <button
        class="btn btn-outline-success btn-sm"
        type="button"
        :disabled="loading || exporting || !days.length"
        @click="exportExcel"
      >
        <i class="bi bi-file-earmark-excel me-1"></i>Export Excel
      </button>
      <button
        class="btn btn-primary btn-sm"
        type="button"
        :disabled="loading || exporting || !days.length"
        @click="printPdf"
      >
        <span v-if="exporting" class="spinner-border spinner-border-sm me-1"></span>
        <i v-else class="bi bi-printer me-1"></i>
        พิมพ์รายงาน
      </button>
    </template>

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

    <div v-else ref="reportRef" class="daily-detail-report p-3">
      <div class="daily-detail-header mb-3">
        <h2 class="h5 mb-1">รายงานยอดขายรายวัน</h2>
        <div class="small text-muted">{{ vendorTitle }}</div>
        <div class="small text-muted">
          ช่วงวันที่ {{ formatThaiDate(dateFrom) }} – {{ formatThaiDate(dateTo) }} · {{ branchLabel }}
        </div>
        <div class="small text-muted">พิมพ์เมื่อ {{ formatThaiDateTime() }}</div>
        <div class="small text-muted">แสดงเฉพาะสินค้าของร้านคุณ (ไม่รวมสินค้าเจ้าอื่นในบิลเดียวกัน)</div>
      </div>

      <div v-if="!days.length" class="text-center text-muted py-5">ยังไม่มียอดขายในช่วงนี้</div>

      <div v-for="day in days" :key="day.date" class="daily-detail-day mb-4">
        <div class="daily-detail-day-title">
          วันที่ {{ formatThaiDate(day.date) }}
          <span class="text-muted fw-normal">
            · {{ day.billsCount }} บิล · {{ formatQty(day.qty) }} ชิ้น · ฿{{ formatBaht(day.amount) }}
            <template v-if="day.cancelledBillsCount">
              · ยกเลิก {{ day.cancelledBillsCount }} บิล
            </template>
          </span>
        </div>

        <div
          v-for="bill in (day.bills || []).filter((row) => row.items?.length)"
          :key="`paid-${bill.saleId}`"
          class="daily-detail-bill mb-3"
        >
          <div class="daily-detail-bill-title">
            บิล {{ bill.receiptNo || bill.saleId }}
            <span class="text-muted fw-normal">
              · {{ bill.branchName }}
              <template v-if="bill.branchCode">({{ bill.branchCode }})</template>
              · {{ formatBillTime(bill.paidAt) }}
            </span>
            <span v-if="bill.payments?.length" class="daily-bill-payments ms-1">
              <template v-for="(pay, payIndex) in bill.payments" :key="`${bill.saleId}-${pay.method}`">
                <span v-if="payIndex"> · </span>
                <span class="badge text-bg-light border">{{ pay.label }} ฿{{ formatBaht(pay.amount) }}</span>
              </template>
            </span>
          </div>
          <div class="table-responsive">
            <table class="table table-sm table-bordered pos-table daily-bill-table mb-1">
              <colgroup>
                <col class="col-no" />
                <col class="col-sku" />
                <col class="col-name" />
                <col class="col-qty" />
                <col class="col-price" />
                <col class="col-total" />
              </colgroup>
              <thead>
                <tr>
                  <th>#</th>
                  <th>SKU</th>
                  <th>สินค้า</th>
                  <th class="text-end">จำนวน</th>
                  <th class="text-end">ราคา/หน่วย</th>
                  <th class="text-end">รวม</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in bill.items" :key="item.saleItemId">
                  <td>{{ index + 1 }}</td>
                  <td class="col-sku-cell">{{ item.sku || '-' }}</td>
                  <td class="col-name-cell">{{ item.name }}</td>
                  <td class="text-end">{{ formatQty(item.qty) }} {{ item.unit }}</td>
                  <td class="text-end">{{ formatBaht(item.unitPrice) }}</td>
                  <td class="text-end">{{ formatBaht(item.lineTotal) }}</td>
                </tr>
                <tr class="table-light fw-semibold">
                  <td colspan="3" class="text-end">รวมบิลนี้</td>
                  <td class="text-end">{{ formatQty(bill.qty) }}</td>
                  <td></td>
                  <td class="text-end">{{ formatBaht(bill.amount) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="day.billsCount" class="daily-detail-day-total mb-3">
          <div class="small fw-semibold text-end">
            รวมวันที่ {{ formatThaiDate(day.date) }}: {{ day.billsCount }} บิล ·
            {{ formatQty(day.qty) }} ชิ้น · ฿{{ formatBaht(day.amount) }}
          </div>
          <div v-if="day.payments?.length" class="daily-detail-payments mt-2">
            <div class="daily-detail-payments-title">สรุปช่องทางชำระ</div>
            <div class="table-responsive">
              <table class="table table-sm table-bordered mb-0 daily-payment-table">
                <thead>
                  <tr>
                    <th v-for="pay in day.payments" :key="`h-${day.date}-${pay.method}`" class="text-center">
                      {{ pay.label }}
                    </th>
                    <th class="text-center">รวมชำระ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td
                      v-for="pay in day.payments"
                      :key="`a-${day.date}-${pay.method}`"
                      class="text-end"
                    >
                      ฿{{ formatBaht(pay.amount) }}
                    </td>
                    <td class="text-end fw-semibold">
                      ฿{{ formatBaht(day.payments.reduce((sum, pay) => sum + Number(pay.amount || 0), 0)) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div
          v-if="(day.cancelledBills || []).some((row) => row.items?.length)"
          class="daily-detail-cancelled"
        >
          <div class="daily-detail-cancelled-title">
            บิลที่ยกเลิก
            <span class="fw-normal">
              · {{ day.cancelledBillsCount }} บิล (ไม่นับรวมยอดขาย)
            </span>
          </div>

          <div
            v-for="bill in (day.cancelledBills || []).filter((row) => row.items?.length)"
            :key="`void-${bill.saleId}`"
            class="daily-detail-bill daily-detail-bill-cancelled mb-3"
          >
            <div class="daily-detail-bill-title">
              <span class="badge text-bg-danger me-1">ยกเลิก</span>
              บิล {{ bill.receiptNo || bill.saleId }}
              <span class="text-muted fw-normal">
                · {{ bill.branchName }}
                <template v-if="bill.branchCode">({{ bill.branchCode }})</template>
                · {{ formatBillTime(bill.paidAt) }}
                <template v-if="bill.voidedAt">
                  · ยกเลิก {{ formatBillTime(bill.voidedAt) }}
                </template>
                <template v-if="bill.voidReason"> · {{ bill.voidReason }}</template>
              </span>
              <span v-if="bill.payments?.length" class="daily-bill-payments ms-1">
                <template v-for="(pay, payIndex) in bill.payments" :key="`void-${bill.saleId}-${pay.method}`">
                  <span v-if="payIndex"> · </span>
                  <span class="badge text-bg-light border">{{ pay.label }} ฿{{ formatBaht(pay.amount) }}</span>
                </template>
              </span>
            </div>
            <div class="table-responsive">
              <table class="table table-sm table-bordered pos-table daily-bill-table daily-bill-table-cancelled mb-1">
                <colgroup>
                  <col class="col-no" />
                  <col class="col-sku" />
                  <col class="col-name" />
                  <col class="col-qty" />
                  <col class="col-price" />
                  <col class="col-total" />
                </colgroup>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>SKU</th>
                    <th>สินค้า</th>
                    <th class="text-end">จำนวน</th>
                    <th class="text-end">ราคา/หน่วย</th>
                    <th class="text-end">รวม</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, index) in bill.items" :key="item.saleItemId">
                    <td>{{ index + 1 }}</td>
                    <td class="col-sku-cell">{{ item.sku || '-' }}</td>
                    <td class="col-name-cell">{{ item.name }}</td>
                    <td class="text-end">{{ formatQty(item.qty) }} {{ item.unit }}</td>
                    <td class="text-end">{{ formatBaht(item.unitPrice) }}</td>
                    <td class="text-end">{{ formatBaht(item.lineTotal) }}</td>
                  </tr>
                  <tr class="table-light fw-semibold">
                    <td colspan="3" class="text-end">รวมบิลนี้ (ยกเลิก)</td>
                    <td class="text-end">{{ formatQty(bill.qty) }}</td>
                    <td></td>
                    <td class="text-end">{{ formatBaht(bill.amount) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div v-if="days.length" class="daily-detail-grand-total table-responsive">
        <table class="table table-bordered mb-0">
          <tbody>
            <tr class="table-primary fw-semibold">
              <td>ยอดขายสรุปรวม</td>
              <td class="text-end">{{ totals.bills }} บิล</td>
              <td class="text-end">{{ formatQty(totals.qty) }} ชิ้น</td>
              <td class="text-end">฿{{ formatBaht(totals.amount) }}</td>
            </tr>
            <tr
              v-for="pay in totals.payments || []"
              :key="`total-pay-${pay.method}`"
              class="table-light"
            >
              <td>ชำระผ่าน {{ pay.label }}</td>
              <td class="text-end" colspan="3">฿{{ formatBaht(pay.amount) }}</td>
            </tr>
            <tr v-if="totals.cancelledBills" class="table-secondary">
              <td>บิลที่ยกเลิก (ไม่นับรวมยอด)</td>
              <td class="text-end" colspan="3">{{ totals.cancelledBills }} บิล</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </PageShell>
</template>

<style scoped>
.daily-detail-header {
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 0.75rem;
}

.daily-detail-day-title {
  font-weight: 700;
  font-size: 1rem;
  margin-bottom: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: #f8fafc;
  border-left: 4px solid #1677ff;
}

.daily-detail-bill-title {
  font-weight: 600;
  margin-bottom: 0.35rem;
}

.daily-bill-payments .badge {
  font-weight: 500;
  color: #334155;
  font-size: 0.75rem;
}

.daily-detail-payments {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 0.35rem;
  padding: 0.5rem 0.65rem;
}

.daily-detail-payments-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: #334155;
  margin-bottom: 0.35rem;
}

.daily-payment-table {
  margin-bottom: 0;
  background: #fff;
}

.daily-payment-table th {
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  background: #eef2ff;
}

.daily-payment-table td {
  font-size: 0.85rem;
  white-space: nowrap;
}

.daily-detail-cancelled {
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px dashed #f1aeb5;
}

.daily-detail-cancelled-title {
  font-weight: 700;
  color: #b42318;
  margin-bottom: 0.75rem;
  padding: 0.4rem 0.75rem;
  background: #fef3f2;
  border-left: 4px solid #f04438;
}

.daily-detail-bill-cancelled .daily-detail-bill-title {
  color: #912018;
}

.daily-bill-table-cancelled {
  opacity: 0.92;
}

.daily-bill-table-cancelled thead th {
  background: #fef3f2;
}

.daily-detail-grand-total {
  margin-top: 1rem;
}

.daily-bill-table {
  table-layout: fixed;
  width: 100%;
}

.daily-bill-table .col-no {
  width: 6%;
}

.daily-bill-table .col-sku {
  width: 16%;
}

.daily-bill-table .col-name {
  width: 38%;
}

.daily-bill-table .col-qty {
  width: 12%;
}

.daily-bill-table .col-price {
  width: 14%;
}

.daily-bill-table .col-total {
  width: 14%;
}

.daily-bill-table th,
.daily-bill-table td {
  vertical-align: middle;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.daily-bill-table .col-name-cell {
  white-space: normal;
  word-break: break-word;
}

.daily-bill-table .col-sku-cell {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.85em;
}
</style>
