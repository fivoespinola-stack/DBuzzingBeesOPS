import * as XLSX from 'xlsx';
import { Task, Cleaner, ImportPreviewRow, CleanerPaySummary, Frequency, PaymentTerm } from '../types';

// Helper to format Excel serial date or string date
export const normalizeExcelDate = (val: any): string => {
  if (!val) return new Date().toISOString().split('T')[0];

  // If it's an Excel numeric date
  if (typeof val === 'number') {
    const dateObj = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toISOString().split('T')[0];
    }
  }

  // If string
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Try parsing common formats like DD/MM/YYYY or MM/DD/YYYY
  const parts = str.split(/[\/\-\.]/);
  if (parts.length === 3) {
    // If year is 4 digits
    if (parts[2].length === 4) {
      // Assume YYYY-MM-DD
      const y = parts[2];
      const m = parts[1].padStart(2, '0');
      const d = parts[0].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    if (parts[0].length === 4) {
      const y = parts[0];
      const m = parts[1].padStart(2, '0');
      const d = parts[2].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
};

// Normalize Excel time
export const normalizeExcelTime = (val: any, fallback: string): string => {
  if (!val) return fallback;

  if (typeof val === 'number') {
    // Excel fraction of a day: 0.5 = 12:00
    const totalMinutes = Math.round(val * 24 * 60);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const mins = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  const str = String(val).trim();
  if (/^\d{1,2}:\d{2}$/.test(str)) {
    const [h, m] = str.split(':');
    return `${h.padStart(2, '0')}:${m}`;
  }

  return fallback;
};

// Generate and trigger download of an XLSX workbook
const triggerDownloadWorkbook = (workbook: XLSX.WorkBook, fileName: string) => {
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Download a formatted template for tasks
export const downloadTasksTemplate = () => {
  const sampleRows = [
    {
      'Job Type': 'Residential Deep Clean',
      'Address': '124 Maple Street, Apt 3',
      'Client Name': 'Jessica Taylor',
      'Client Phone': '+1 (555) 345-6789',
      'Client Email': 'jessica.t@example.com',
      'Date': '2026-10-25',
      'Start Time': '09:00',
      'End Time': '12:30',
      'Fix Hours': 3.5,
      'Rate': 65.0,
      'Pay Type': 'Hourly Rate',
      'Payment Term': 'Invoice',
      'Invoice Number': 'INV-2026-201',
      'Frequency': 'fortnightly',
      'Assigned Cleaners': 'Maya Lin, Chloe Davies',
      'Remarks': 'Key under flowerpot. Please vacuum under sofa.',
      'Completed': 'No',
    },
    {
      'Job Type': 'Commercial Office',
      'Address': '900 Harbor Blvd, Suite 200',
      'Client Name': 'Zenith Media Inc',
      'Client Phone': '+1 (555) 789-0123',
      'Client Email': 'office@zenithmedia.com',
      'Date': '2026-10-26',
      'Start Time': '18:00',
      'End Time': '21:00',
      'Fix Hours': 3.0,
      'Rate': 240.0,
      'Pay Type': 'Fixed Price',
      'Payment Term': 'Cash',
      'Invoice Number': '',
      'Frequency': 'weekly',
      'Assigned Cleaners': 'Marcus Sterling',
      'Remarks': 'After hours security code #7712. Empty all bins.',
      'Completed': 'No',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleRows);
  // Auto-column widths
  ws['!cols'] = [
    { wch: 22 }, // Job Type
    { wch: 28 }, // Address
    { wch: 18 }, // Client Name
    { wch: 18 }, // Client Phone
    { wch: 24 }, // Client Email
    { wch: 12 }, // Date
    { wch: 10 }, // Start Time
    { wch: 10 }, // End Time
    { wch: 10 }, // Fix Hours
    { wch: 10 }, // Rate
    { wch: 14 }, // Pay Type
    { wch: 14 }, // Payment Term
    { wch: 16 }, // Invoice Number
    { wch: 14 }, // Frequency
    { wch: 24 }, // Assigned Cleaners
    { wch: 35 }, // Remarks
    { wch: 10 }, // Completed
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Tasks Template');
  triggerDownloadWorkbook(wb, 'DBuzzingBees_Tasks_Template.xlsx');
};

// Export all data to Excel
export const exportAllDataToExcel = (tasks: Task[], cleaners: Cleaner[], paySummaries?: CleanerPaySummary[]) => {
  const wb = XLSX.utils.book_new();

  // 1. Tasks Sheet
  const tasksData = tasks.map(t => {
    const cleanerNames = t.assignedCleanerIds
      .map(id => cleaners.find(c => c.id === id)?.name || id)
      .join(', ');

    return {
      'Task ID': t.id,
      'Job Type': t.jobType,
      'Address': t.address,
      'Client': t.clientName || 'N/A',
      'Phone': t.clientPhone || 'N/A',
      'Client Email': t.clientEmail || 'N/A',
      'Date': t.date,
      'Start Time': t.startTime,
      'End Time': t.endTime,
      'Fix Hours': t.fixHour,
      'Rate ($)': t.rate,
      'Pay Type': t.payType === 'Fixed Price' ? 'Fixed Price' : 'Hourly Rate',
      'Payment Term': t.paymentTerm || 'Cash',
      'Invoice #': t.invoiceNumber,
      'Frequency': t.frequency,
      'Assigned Cleaners': cleanerNames,
      'Remarks': t.remarks,
      'Status': t.completed ? 'Completed' : 'Pending',
    };
  });
  const wsTasks = XLSX.utils.json_to_sheet(tasksData);
  XLSX.utils.book_append_sheet(wb, wsTasks, 'Tasks & Schedule');

  // 2. Cleaners Sheet
  const cleanersData = cleaners.map(c => ({
    'Cleaner ID': c.id,
    'Name': c.name,
    'Phone': c.phone,
    'Email': c.email,
    'Hourly Rate ($/hr)': c.hourlyRate,
    'Weekly Special Task Pay ($)': c.specialTaskPayPerWeek,
    'Status': c.status,
    'Notes': c.notes || '',
  }));
  const wsCleaners = XLSX.utils.json_to_sheet(cleanersData);
  XLSX.utils.book_append_sheet(wb, wsCleaners, 'Cleaners Directory');

  // 3. Pay Summary Sheet (if provided)
  if (paySummaries && paySummaries.length > 0) {
    const payData = paySummaries.map(p => ({
      'Cleaner': p.cleanerName,
      'Hourly Rate ($)': p.hourlyRate,
      'Completed Hours': p.completedHours,
      'Regular Hourly Pay ($)': p.regularPay,
      'Special Task Pay ($)': p.specialTaskPay,
      'Total Cleaner Payout ($)': p.totalPay,
      'Total Client Invoiced ($)': p.totalInvoiced,
      'Gross Profit Margin ($)': p.margin,
      'Total Assigned Tasks': p.taskCount,
    }));
    const wsPay = XLSX.utils.json_to_sheet(payData);
    XLSX.utils.book_append_sheet(wb, wsPay, 'Weekly Pay Summary');
  }

  const timestamp = new Date().toISOString().split('T')[0];
  triggerDownloadWorkbook(wb, `DBuzzingBees_Export_${timestamp}.xlsx`);
};

// Export comprehensive financial summary for any period (Weekly, Monthly, Multi-Month, or Full Year)
export const exportFinancialPeriodExcel = (
  summaries: CleanerPaySummary[],
  periodLabel: string,
  periodType: string,
  monthlyBreakdown?: Array<{
    monthLabel: string;
    taskCount: number;
    hoursWorked: number;
    totalInvoiced: number;
    cleanerWages: number;
    totalPay: number;
    margin: number;
    marginPercent: number;
  }>,
  allPeriodTasks?: Task[]
) => {
  const wb = XLSX.utils.book_new();

  const totalPayout = summaries.reduce((sum, s) => sum + s.totalPay, 0);
  const totalInvoiced = summaries.reduce((sum, s) => sum + s.totalInvoiced, 0);
  const totalMargin = totalInvoiced - totalPayout;
  const totalHours = summaries.reduce((sum, s) => sum + s.completedHours, 0);
  const totalTasks = summaries.reduce((sum, s) => sum + s.taskCount, 0);
  const marginPercent = totalInvoiced > 0 ? (totalMargin / totalInvoiced) * 100 : 0;

  // 1. Executive Summary Sheet
  const summarySheetData = [
    { 'Financial Metric': 'Report Title', 'Value': `DBuzzingBees Financial Statement` },
    { 'Financial Metric': 'Report Period Type', 'Value': periodType },
    { 'Financial Metric': 'Period Range', 'Value': periodLabel },
    { 'Financial Metric': 'Total Invoiced to Clients', 'Value': `$${totalInvoiced.toFixed(2)}` },
    { 'Financial Metric': 'Total Cleaner Payout (Wages + Allowances)', 'Value': `$${totalPayout.toFixed(2)}` },
    { 'Financial Metric': 'Gross Business Margin', 'Value': `$${totalMargin.toFixed(2)}` },
    { 'Financial Metric': 'Profit Margin %', 'Value': `${marginPercent.toFixed(1)}%` },
    { 'Financial Metric': 'Total Completed Hours', 'Value': `${totalHours.toFixed(1)} hrs` },
    { 'Financial Metric': 'Total Cleans Recorded', 'Value': totalTasks },
    { 'Financial Metric': 'Active Cleaners in Period', 'Value': summaries.filter(s => s.taskCount > 0).length },
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summarySheetData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Financial Overview');

  // 2. Cleaners Payroll Breakdown Sheet
  const cleanersData = summaries.map((s) => ({
    'Cleaner Name': s.cleanerName,
    'Base Hourly Rate ($)': `$${s.hourlyRate.toFixed(2)}`,
    'Completed Hours': s.completedHours,
    'Scheduled Hours': s.scheduledHours,
    'Hourly Wages ($)': `$${s.regularPay.toFixed(2)}`,
    'Special Task Allowance ($)': `$${s.specialTaskPay.toFixed(2)}`,
    'Total Net Pay ($)': `$${s.totalPay.toFixed(2)}`,
    'Client Invoiced ($)': `$${s.totalInvoiced.toFixed(2)}`,
    'Gross Margin ($)': `$${s.margin.toFixed(2)}`,
    'Margin %': `${s.totalInvoiced > 0 ? ((s.margin / s.totalInvoiced) * 100).toFixed(1) : '0.0'}%`,
    'Assigned Jobs Count': s.taskCount,
  }));
  const wsCleaners = XLSX.utils.json_to_sheet(cleanersData);
  XLSX.utils.book_append_sheet(wb, wsCleaners, 'Cleaners Breakdown');

  // 3. Monthly Breakdown Sheet (if present)
  if (monthlyBreakdown && monthlyBreakdown.length > 0) {
    const monthlyData = monthlyBreakdown.map((m) => ({
      'Month': m.monthLabel,
      'Jobs Completed': m.taskCount,
      'Hours Worked': m.hoursWorked,
      'Client Invoiced ($)': `$${m.totalInvoiced.toFixed(2)}`,
      'Cleaner Wages ($)': `$${m.cleanerWages.toFixed(2)}`,
      'Total Cleaner Payout ($)': `$${m.totalPay.toFixed(2)}`,
      'Gross Margin ($)': `$${m.margin.toFixed(2)}`,
      'Margin %': `${m.marginPercent.toFixed(1)}%`,
    }));
    const wsMonthly = XLSX.utils.json_to_sheet(monthlyData);
    XLSX.utils.book_append_sheet(wb, wsMonthly, 'Monthly Performance');
  }

  // 4. Tasks Detail Sheet (if present)
  if (allPeriodTasks && allPeriodTasks.length > 0) {
    const tasksData = allPeriodTasks.map((t) => ({
      'Date': t.date,
      'Client Name': t.clientName || 'N/A',
      'Client Number': t.clientNumber || '',
      'Job Type': t.jobType,
      'Address': t.address,
      'Hours': t.fixHour,
      'Rate': t.rate,
      'Pay Type': t.payType,
      'Payment Term': t.paymentTerm,
      'Invoice #': t.invoiceNumber,
      'Invoiced Total ($)': t.payType === 'Fixed Price' ? t.rate : t.rate * t.fixHour,
      'Cleaners Count': t.assignedCleanerIds.length,
      'Completed': t.completed ? 'Yes' : 'No',
    }));
    const wsTasks = XLSX.utils.json_to_sheet(tasksData);
    XLSX.utils.book_append_sheet(wb, wsTasks, 'All Jobs Detail');
  }

  const cleanLabel = periodLabel.replace(/[^\w-]/g, '_').substring(0, 30);
  triggerDownloadWorkbook(wb, `DBuzzingBees_Financial_${periodType}_${cleanLabel}.xlsx`);
};

// Export individual pay summary
export const exportWeeklyPaySlipExcel = (paySummary: CleanerPaySummary, weekLabel: string) => {
  const wb = XLSX.utils.book_new();

  // Overview row
  const overview = [
    {
      'Metric': 'Cleaner Name',
      'Value': paySummary.cleanerName,
    },
    {
      'Metric': 'Pay Period',
      'Value': weekLabel,
    },
    {
      'Metric': 'Base Hourly Rate',
      'Value': `$${paySummary.hourlyRate.toFixed(2)} / hr`,
    },
    {
      'Metric': 'Total Hours Worked',
      'Value': `${paySummary.completedHours.toFixed(1)} hrs`,
    },
    {
      'Metric': 'Hourly Pay Total',
      'Value': `$${paySummary.regularPay.toFixed(2)}`,
    },
    {
      'Metric': 'Special Task Weekly Allowance',
      'Value': `$${paySummary.specialTaskPay.toFixed(2)}`,
    },
    {
      'Metric': 'NET PAYOUT TO CLEANER',
      'Value': `$${paySummary.totalPay.toFixed(2)}`,
    },
    {
      'Metric': 'Total Invoiced to Clients',
      'Value': `$${paySummary.totalInvoiced.toFixed(2)}`,
    },
    {
      'Metric': 'Business Gross Margin',
      'Value': `$${paySummary.margin.toFixed(2)}`,
    },
  ];

  const wsOverview = XLSX.utils.json_to_sheet(overview);
  XLSX.utils.book_append_sheet(wb, wsOverview, 'Pay Summary');

  // Tasks breakdown
  const tasksBreakdown = paySummary.tasks.map(t => ({
    'Date': t.date,
    'Client Name': t.clientName || 'N/A',
    'Invoice #': t.invoiceNumber,
    'Hours': t.fixHour,
    'Cleaners on Job': t.assignedCleanerIds.length,
    'Pay Share ($)': ((t.fixHour * paySummary.hourlyRate) / (t.assignedCleanerIds.length || 1)).toFixed(2),
    'Status': t.completed ? 'Completed' : 'Pending',
  }));

  const wsTasks = XLSX.utils.json_to_sheet(tasksBreakdown);
  XLSX.utils.book_append_sheet(wb, wsTasks, 'Jobs Breakdown');

  const safeName = paySummary.cleanerName.replace(/\s+/g, '_');
  triggerDownloadWorkbook(wb, `PaySlip_${safeName}_${weekLabel.replace(/\s+/g, '_')}.xlsx`);
};

// Parse uploaded Excel file and generate interactive preview
export const parseTasksFromExcel = async (
  file: File,
  knownCleaners: Cleaner[]
): Promise<ImportPreviewRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: 'array' });
        
        // Pick first sheet
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) {
          throw new Error('No sheets found in the uploaded file');
        }

        const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        
        if (rawRows.length === 0) {
          throw new Error('The uploaded spreadsheet contains no data rows.');
        }

        const previewRows: ImportPreviewRow[] = rawRows.map((row, idx) => {
          const errors: string[] = [];
          
          // Field resolution with lenient header matching
          const getField = (keys: string[]): any => {
            for (const k of keys) {
              const matchedKey = Object.keys(row).find(
                rk => rk.toLowerCase().replace(/[^a-z0-9]/g, '') === k.toLowerCase().replace(/[^a-z0-9]/g, '')
              );
              if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== '') {
                return row[matchedKey];
              }
            }
            return '';
          };

          const jobType = String(getField(['Job Type', 'JobType', 'Type']) || 'Residential Standard').trim();
          const address = String(getField(['Address', 'Location', 'Site Address'])).trim();
          if (!address) {
            errors.push('Address is required');
          }

          const rawDate = getField(['Date', 'Job Date', 'Scheduled Date']);
          const date = normalizeExcelDate(rawDate);

          const startTime = normalizeExcelTime(getField(['Start Time', 'Start', 'Time In']), '09:00');
          const endTime = normalizeExcelTime(getField(['End Time', 'End', 'Time Out']), '12:00');

          const rawHours = parseFloat(getField(['Fix Hours', 'Fix Hour', 'Hours', 'Duration']));
          const fixHour = isNaN(rawHours) || rawHours <= 0 ? 3.0 : rawHours;

          const rawRate = parseFloat(getField(['Rate', 'Price', 'Charge Rate', 'Amount']));
          const rate = isNaN(rawRate) || rawRate < 0 ? 55.0 : rawRate;

          // Pay Type (Hourly or Fixed Price)
          const rawPayType = String(getField(['Pay Type', 'PayType', 'Billing Type'])).toLowerCase();
          let payType: string = 'Hourly';
          if (rawPayType.includes('fixed') || rawPayType.includes('flat')) {
            payType = 'Fixed Price';
          } else if (rawPayType.includes('hour')) {
            payType = 'Hourly';
          } else if (rate > 150) {
            payType = 'Fixed Price';
          }

          // Payment Term (Cash or Invoice)
          const rawTerm = String(getField(['Payment Term', 'PaymentTerm', 'Payment Method', 'Term', 'Terms'])).toLowerCase();
          let paymentTerm: PaymentTerm = 'Cash';
          if (rawTerm.includes('invoice') || rawTerm.includes('bill') || rawPayType.includes('invoice')) {
            paymentTerm = 'Invoice';
          } else if (rawTerm.includes('cash') || rawPayType.includes('cash')) {
            paymentTerm = 'Cash';
          }

          const invNumber = String(
            getField(['Invoice Number', 'Invoice', 'Inv#', 'Invoice#']) || ''
          ).trim();

          // If invoice number is present, payment term defaults to Invoice if not set
          if (invNumber && !rawTerm) {
            paymentTerm = 'Invoice';
          }

          const clientName = String(getField(['Client Name', 'Client', 'Customer', 'Customer Name'])).trim();
          const clientPhone = String(getField(['Client Phone', 'Phone', 'Contact Number', 'Mobile'])).trim();
          const clientEmail = String(getField(['Client Email', 'Email', 'Client Mail', 'Email Address'])).trim();

          const rawFreq = String(getField(['Frequency', 'Schedule', 'Repeat'])).toLowerCase();
          let frequency: Frequency = 'one-off';
          if (rawFreq.includes('twice')) frequency = 'twice-a-week';
          else if (rawFreq.includes('3rd') || rawFreq.includes('third')) frequency = 'every-3rd-week';
          else if (rawFreq.includes('fort') || rawFreq.includes('bi-week') || rawFreq.includes('biweek')) frequency = 'fortnightly';
          else if (rawFreq.includes('2 month') || rawFreq.includes('two month') || rawFreq.includes('bimonth')) frequency = 'every-2-months';
          else if (rawFreq.includes('end') && rawFreq.includes('month')) frequency = 'end-of-month';
          else if (rawFreq.includes('month')) frequency = 'monthly';
          else if (rawFreq.includes('week')) frequency = 'weekly';
          else if (rawFreq.includes('flex')) frequency = 'flexible';
          else if (rawFreq.includes('other')) frequency = 'others';

          // Resolve cleaners
          const rawCleanersStr = String(getField(['Assigned Cleaners', 'Cleaners', 'Staff', 'Assigned'])).trim();
          let assignedCleanerNames: string[] = [];
          if (rawCleanersStr) {
            assignedCleanerNames = rawCleanersStr.split(/[,;\/]+/).map(s => s.trim()).filter(Boolean);
          }

          const remarks = String(getField(['Remarks', 'Notes', 'Special Instructions'])).trim();

          return {
            rowNumber: idx + 2, // 1-based, row 1 is header
            jobType,
            address,
            clientName,
            clientPhone,
            clientEmail,
            date,
            startTime,
            endTime,
            fixHour,
            rate,
            payType,
            paymentTerm,
            invoiceNumber: invNumber,
            frequency,
            assignedCleaners: assignedCleanerNames,
            remarks,
            isValid: errors.length === 0,
            errors,
          };
        });

        resolve(previewRows);
      } catch (err: any) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

// Convert confirmed preview rows into real Task objects
export const commitPreviewRowsToTasks = (
  rows: ImportPreviewRow[],
  existingCleaners: Cleaner[]
): { newTasks: Task[]; updatedCleaners: Cleaner[] } => {
  const currentCleaners = [...existingCleaners];

  const newTasks: Task[] = rows
    .filter(r => r.isValid)
    .map((r, i) => {
      // Find or create cleaners if unknown
      const assignedIds: string[] = [];

      for (const cName of r.assignedCleaners) {
        let match = currentCleaners.find(c => c.name.toLowerCase() === cName.toLowerCase());
        if (!match) {
          // Auto-create new cleaner
          match = {
            id: `cleaner-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: cName,
            phone: '+1 (555) 000-0000',
            email: `${cName.toLowerCase().replace(/\s+/g, '.')}@dbuzzingbees.com`,
            hourlyRate: 28.0,
            specialTaskPayPerWeek: 0,
            status: 'active',
            notes: 'Imported via Excel',
          };
          currentCleaners.push(match);
        }
        assignedIds.push(match.id);
      }

      return {
        id: `task-imp-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        jobType: r.jobType,
        address: r.address,
        clientName: r.clientName || '',
        clientPhone: r.clientPhone || '',
        clientEmail: r.clientEmail || '',
        fixHour: r.fixHour,
        rate: r.rate,
        payType: r.payType,
        paymentTerm: r.paymentTerm || 'Cash',
        invoiceNumber: r.invoiceNumber,
        assignedCleanerIds: assignedIds,
        remarks: r.remarks,
        date: r.date,
        startTime: r.startTime,
        endTime: r.endTime,
        frequency: r.frequency,
        completed: false,
        createdAt: new Date().toISOString(),
      };
    });

  return { newTasks, updatedCleaners: currentCleaners };
};

// JSON Export and Import
export const exportBackupJSON = (tasks: Task[], cleaners: Cleaner[]) => {
  const backup = {
    version: '1.0',
    app: 'DBuzzingBees',
    exportedAt: new Date().toISOString(),
    cleaners,
    tasks,
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `DBuzzingBees_Backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
