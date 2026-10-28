import { onMounted, ref } from 'vue';
import { addDaysIso, bangkokTodayIso } from '@/utils/date';

export const useReportFilters = (defaultDays = 6) => {
  const dateFrom = ref('');
  const dateTo = ref('');
  const branchId = ref('');
  const branches = ref([]);

  const applyDefaultRange = () => {
    const today = bangkokTodayIso();
    dateTo.value = today;
    dateFrom.value = addDaysIso(today, -defaultDays);
  };

  const syncBranches = (list = []) => {
    branches.value = list || [];
  };

  const toParams = () => ({
    dateFrom: dateFrom.value || undefined,
    dateTo: dateTo.value || undefined,
    branchId: branchId.value || undefined
  });

  onMounted(applyDefaultRange);

  return {
    dateFrom,
    dateTo,
    branchId,
    branches,
    syncBranches,
    toParams,
    applyDefaultRange
  };
};
