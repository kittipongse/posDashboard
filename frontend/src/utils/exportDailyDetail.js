import { formatBaht, formatQty } from '@/utils/format';
import { formatThaiDate, formatThaiDateTime } from '@/utils/date';

const safeFilePart = (value) =>
  String(value || '')
    .replace(/[^\w.-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'report';

export const buildDailyDetailFileName = ({ dateFrom, dateTo, vendorLabel }) => {
  const vendor = safeFilePart(vendorLabel || 'vendor');
  return `daily-detail_${vendor}_${dateFrom || ''}_${dateTo || ''}`;
};

/** Flat rows for Excel: one row per product line. */
export const flattenDailyDetailForExcel = (days = []) => {
  const rows = [];
  for (const day of days) {
    for (const bill of day.bills || []) {
      for (const item of bill.items || []) {
        rows.push({
          วันที่: formatThaiDate(day.date),
          เลขที่บิล: bill.receiptNo || '',
          สาขา: bill.branchName || '',
          รหัสสาขา: bill.branchCode || '',
          SKU: item.sku || '',
          สินค้า: item.name || '',
          จำนวน: Number(item.qty || 0),
          หน่วย: item.unit || '',
          ราคาต่อหน่วย: Number(item.unitPrice || 0),
          ยอดรวม: Number(item.lineTotal || 0)
        });
      }
    }
  }
  return rows;
};

export const exportDailyDetailExcel = async ({ days, totals, dateFrom, dateTo, vendorLabel }) => {
  const XLSX = await import('xlsx');
  const detailRows = flattenDailyDetailForExcel(days);
  const summaryRows = [
    { รายการ: 'ช่วงวันที่', ค่า: `${formatThaiDate(dateFrom)} - ${formatThaiDate(dateTo)}` },
    { รายการ: 'ร้านค้า', ค่า: vendorLabel || '' },
    { รายการ: 'จำนวนบิล', ค่า: totals?.bills || 0 },
    { รายการ: 'จำนวนชิ้น', ค่า: Number(totals?.qty || 0) },
    { รายการ: 'ยอดขายรวม', ค่า: Number(totals?.amount || 0) },
    { รายการ: 'พิมพ์เมื่อ', ค่า: formatThaiDateTime() }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(detailRows), 'รายละเอียด');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), 'สรุป');
  XLSX.writeFile(workbook, `${buildDailyDetailFileName({ dateFrom, dateTo, vendorLabel })}.xlsx`);
};

export const printDailyDetailPdf = async (element) => {
  if (!element) throw new Error('ไม่พบเนื้อหารายงาน');

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf')
  ]);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const usableWidth = pageWidth - margin * 2;
  const imgHeight = (canvas.height * usableWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = margin;

  pdf.addImage(imgData, 'PNG', margin, position, usableWidth, imgHeight);
  heightLeft -= pageHeight - margin * 2;

  while (heightLeft > 0) {
    position = margin - (imgHeight - heightLeft);
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', margin, position, usableWidth, imgHeight);
    heightLeft -= pageHeight - margin * 2;
  }

  return pdf;
};

export const downloadDailyDetailPdf = async ({ element, dateFrom, dateTo, vendorLabel }) => {
  const pdf = await printDailyDetailPdf(element);
  pdf.save(`${buildDailyDetailFileName({ dateFrom, dateTo, vendorLabel })}.pdf`);
};

export const formatBillTime = (value) => {
  if (!value) return '';
  return new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
};

export { formatBaht, formatQty, formatThaiDate, formatThaiDateTime };
