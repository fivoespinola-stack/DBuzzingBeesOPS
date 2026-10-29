import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Printer, 
  FileText, 
  TrendingUp, 
  Users, 
  Clock, 
  CheckCircle, 
  Calendar,
  CalendarDays,
  CalendarRange,
  BarChart3,
  X,
  CreditCard,
  RotateCcw,
  Sparkles,
  Filter,
  Layers
} from 'lucide-react';
import { Task, Cleaner, CleanerPaySummary, CleanerWeeklyPaymentRecord } from '../types';
import { formatCurrency, getWeekStart, getWeekLabel, formatDate } from '../utils/formatters';
import { exportWeeklyPaySlipExcel, exportFinancialPeriodExcel } from '../services/excelService';
import { loadCleanerWeeklyPayments, saveCleanerWeeklyPayments } from '../services/storage';
import { BeeLogo } from './BeeLogo';

export type PeriodMode = 'weekly' | 'monthly' | 'yearly';
export type MonthSelectionType = 'single' | 'multiple';

interface PayAndInvoiceViewProps {
  tasks: Task[];
  cleaners: Cleaner[];
  onExportAllPay: (summaries: CleanerPaySummary[], weekLabel: string) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const PayAndInvoiceView: React.FC<PayAndInvoiceViewProps> = ({
  tasks,
  cleaners,
  onExportAllPay,
}) => {
  // Period Mode: Weekly, Monthly, or Whole Year
  const [periodMode, setPeriodMode] = useState<PeriodMode>('weekly');

  // Weekly Mode State
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(getWeekStart(new Date()));

  // Monthly & Yearly Mode State
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    // Detect year with most tasks or current year
    const taskYears = tasks.map((t) => parseInt(t.date?.split('-')[0], 10)).filter((y) => !isNaN(y));
    return taskYears.length > 0 ? taskYears[0] : new Date().getFullYear();
  });

  // Selected Months (0-indexed: 0 = Jan, 11 = Dec)
  const [selectedMonths, setSelectedMonths] = useState<number[]>([new Date().getMonth()]);
  const [monthSelectionType, setMonthSelectionType] = useState<MonthSelectionType>('single');

  // Modals
  const [selectedSummaryForModal, setSelectedSummaryForModal] = useState<CleanerPaySummary | null>(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);

  // Persistent cleaner wage paid tracking (keyed by cleanerId_weekStartDate)
  const [paidRecords, setPaidRecords] = useState<Record<string, CleanerWeeklyPaymentRecord>>(() => 
    loadCleanerWeeklyPayments()
  );

  // Available Years in Tasks
  const availableYears = useMemo(() => {
    const years = new Set<number>([new Date().getFullYear(), 2026]);
    tasks.forEach((t) => {
      if (t.date) {
        const y = parseInt(t.date.split('-')[0], 10);
        if (!isNaN(y)) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [tasks]);

  // Which months have tasks recorded for the selected year?
  const monthsWithTasks = useMemo(() => {
    const set = new Set<number>();
    tasks.forEach((t) => {
      if (t.date) {
        const [yStr, mStr] = t.date.split('-');
        if (parseInt(yStr, 10) === selectedYear) {
          const m = parseInt(mStr, 10) - 1;
          if (m >= 0 && m < 12) set.add(m);
        }
      }
    });
    return set;
  }, [tasks, selectedYear]);

  // Weekly navigation
  const handlePrevWeek = () => {
    const prev = new Date(selectedWeekStart);
    prev.setDate(prev.getDate() - 7);
    setSelectedWeekStart(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(selectedWeekStart);
    next.setDate(next.getDate() + 7);
    setSelectedWeekStart(next);
  };

  const handleThisWeek = () => {
    setSelectedWeekStart(getWeekStart(new Date()));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) return;
    const [y, m, d] = val.split('-').map(Number);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      const picked = new Date(y, m - 1, d);
      setSelectedWeekStart(getWeekStart(picked));
    }
  };

  // Formatted date string for date picker input (Monday of selected week)
  const selectedWeekDateStr = useMemo(() => {
    const y = selectedWeekStart.getFullYear();
    const m = String(selectedWeekStart.getMonth() + 1).padStart(2, '0');
    const d = String(selectedWeekStart.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [selectedWeekStart]);

  const weekLabel = getWeekLabel(selectedWeekStart);

  // Dates in this week (Monday through Sunday)
  const weekDates = useMemo(() => {
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(selectedWeekStart);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }, [selectedWeekStart]);

  // Human-friendly Period Label
  const periodLabel = useMemo(() => {
    if (periodMode === 'weekly') {
      return weekLabel;
    }
    if (periodMode === 'yearly') {
      return `Full Year ${selectedYear}`;
    }
    // Monthly
    if (selectedMonths.length === 0) {
      return `No month selected (${selectedYear})`;
    }
    if (selectedMonths.length === 1) {
      return `${MONTH_NAMES[selectedMonths[0]]} ${selectedYear}`;
    }
    const sorted = [...selectedMonths].sort((a, b) => a - b);
    const isConsecutive = sorted.every((m, idx) => idx === 0 || m === sorted[idx - 1] + 1);
    if (isConsecutive && sorted.length > 1) {
      return `${SHORT_MONTH_NAMES[sorted[0]]} – ${SHORT_MONTH_NAMES[sorted[sorted.length - 1]]} ${selectedYear} (${sorted.length} months)`;
    }
    return `${sorted.map((m) => SHORT_MONTH_NAMES[m]).join(', ')} ${selectedYear} (${sorted.length} months)`;
  }, [periodMode, weekLabel, selectedYear, selectedMonths]);

  const periodTypeLabel = useMemo(() => {
    if (periodMode === 'weekly') return 'Weekly';
    if (periodMode === 'yearly') return 'Annual';
    return selectedMonths.length > 1 ? 'Multi-Month' : 'Monthly';
  }, [periodMode, selectedMonths.length]);

  // Number of equivalent weeks in period (for cleaner weekly special allowance calculation)
  const weeksCountInPeriod = useMemo(() => {
    if (periodMode === 'weekly') return 1;
    if (periodMode === 'yearly') return 52;
    // Approximately 4.33 weeks per month
    return Math.max(1, Math.round(selectedMonths.length * 4.33));
  }, [periodMode, selectedMonths.length]);

  // Filter tasks that fall within the active period
  const periodTasks = useMemo(() => {
    if (periodMode === 'weekly') {
      return tasks.filter((t) => weekDates.includes(t.date));
    }
    if (periodMode === 'yearly') {
      return tasks.filter((t) => t.date && t.date.startsWith(`${selectedYear}-`));
    }
    // Monthly: match selected months in selected year
    const monthKeyPrefixes = new Set(
      selectedMonths.map((m) => `${selectedYear}-${String(m + 1).padStart(2, '0')}`)
    );
    return tasks.filter((t) => {
      if (!t.date) return false;
      const prefix = t.date.substring(0, 7);
      return monthKeyPrefixes.has(prefix);
    });
  }, [periodMode, tasks, weekDates, selectedYear, selectedMonths]);

  // Month-by-month financial summary (for multi-month or full year review)
  const monthlyBreakdown = useMemo(() => {
    if (periodMode === 'weekly') return [];

    const monthsToEvaluate = periodMode === 'yearly'
      ? Array.from({ length: 12 }, (_, i) => i)
      : [...selectedMonths].sort((a, b) => a - b);

    return monthsToEvaluate.map((mIdx) => {
      const monthKey = `${selectedYear}-${String(mIdx + 1).padStart(2, '0')}`;
      const mTasks = tasks.filter((t) => t.date && t.date.startsWith(monthKey));
      const completed = mTasks.filter((t) => t.completed);
      const hoursWorked = completed.reduce((sum, t) => sum + t.fixHour, 0);

      const totalInvoiced = mTasks.reduce((sum, t) => {
        const rev = t.payType === 'Fixed Price' ? t.rate : t.rate * t.fixHour;
        return sum + rev;
      }, 0);

      // Wages: sum of hours * cleaner rate for completed tasks
      let cleanerWages = 0;
      completed.forEach((t) => {
        t.assignedCleanerIds.forEach((cId) => {
          const c = cleaners.find((cl) => cl.id === cId);
          const rate = c?.hourlyRate || 28;
          cleanerWages += (t.fixHour * rate) / (t.assignedCleanerIds.length || 1);
        });
      });

      // Special task allowance for active cleaners for this month (~4.33 weeks)
      const specialTaskPay = cleaners
        .filter((c) => c.status === 'active')
        .reduce((sum, c) => sum + Math.round(c.specialTaskPayPerWeek * 4.33), 0);

      const totalPay = cleanerWages + specialTaskPay;
      const margin = totalInvoiced - totalPay;
      const marginPercent = totalInvoiced > 0 ? (margin / totalInvoiced) * 100 : 0;

      return {
        monthKey,
        monthLabel: `${MONTH_NAMES[mIdx]} ${selectedYear}`,
        shortLabel: SHORT_MONTH_NAMES[mIdx],
        taskCount: mTasks.length,
        completedTaskCount: completed.length,
        hoursWorked,
        totalInvoiced,
        cleanerWages,
        specialTaskPay,
        totalPay,
        margin,
        marginPercent,
      };
    });
  }, [periodMode, selectedYear, selectedMonths, tasks, cleaners]);

  // Compute Pay and Invoice Summary per Cleaner for the selected period
  const cleanerPaySummaries: CleanerPaySummary[] = useMemo(() => {
    return cleaners.map((cleaner) => {
      const cleanerPeriodTasks = periodTasks.filter((t) =>
        t.assignedCleanerIds.includes(cleaner.id)
      );

      const completedTasks = cleanerPeriodTasks.filter((t) => t.completed);

      const completedHours = completedTasks.reduce((sum, t) => sum + t.fixHour, 0);
      const scheduledHours = cleanerPeriodTasks.reduce((sum, t) => sum + t.fixHour, 0);

      const regularPay = cleaner.hourlyRate * completedHours;

      // Special task pay for active cleaner across the period
      const specialTaskPay = cleaner.status === 'active'
        ? Math.round(cleaner.specialTaskPayPerWeek * weeksCountInPeriod)
        : 0;

      const totalPay = regularPay + specialTaskPay;

      // Client invoice revenue generated by this cleaner's jobs
      const totalInvoiced = cleanerPeriodTasks.reduce((sum, t) => {
        const jobRevenue = t.payType === 'Fixed Price' ? t.rate : t.rate * t.fixHour;
        const cleanerShare = jobRevenue / (t.assignedCleanerIds.length || 1);
        return sum + cleanerShare;
      }, 0);

      const margin = totalInvoiced - totalPay;

      return {
        cleanerId: cleaner.id,
        cleanerName: cleaner.name,
        hourlyRate: cleaner.hourlyRate,
        completedHours,
        scheduledHours,
        regularPay,
        specialTaskPay,
        totalPay,
        totalInvoiced,
        margin,
        taskCount: cleanerPeriodTasks.length,
        tasks: cleanerPeriodTasks,
      };
    });
  }, [cleaners, periodTasks, weeksCountInPeriod]);

  // Active week key for persistent paid tracking in weekly mode
  const weekKey = weekDates[0] || 'week-current';

  // Mark cleaner wage as paid with timestamp (weekly mode)
  const handleMarkAsPaid = (cleanerId: string) => {
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timeFormatted = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    const paidAt = `${dateFormatted} at ${timeFormatted}`;

    const key = `${cleanerId}_${weekKey}`;
    const updated = {
      ...paidRecords,
      [key]: {
        isPaid: true,
        paidAt,
      },
    };
    setPaidRecords(updated);
    saveCleanerWeeklyPayments(updated);
  };

  // Undo paid status
  const handleUndoPaid = (cleanerId: string) => {
    const key = `${cleanerId}_${weekKey}`;
    const updated = { ...paidRecords };
    delete updated[key];
    setPaidRecords(updated);
    saveCleanerWeeklyPayments(updated);
  };

  // Aggregate stats across all cleaners for the selected period
  const totalPayout = cleanerPaySummaries.reduce((sum, s) => sum + s.totalPay, 0);
  const totalInvoicedAll = cleanerPaySummaries.reduce((sum, s) => sum + s.totalInvoiced, 0);
  const totalMarginAll = totalInvoicedAll - totalPayout;
  const totalHoursWorked = cleanerPaySummaries.reduce((sum, s) => sum + s.completedHours, 0);
  const marginPercent = totalInvoicedAll > 0 ? (totalMarginAll / totalInvoicedAll) * 100 : 0;
  const paidCleanersCount = cleanerPaySummaries.filter(
    (c) => paidRecords[`${c.cleanerId}_${weekKey}`]?.isPaid
  ).length;

  // Month Selection Helpers
  const toggleMonth = (mIdx: number) => {
    if (monthSelectionType === 'single') {
      setSelectedMonths([mIdx]);
    } else {
      if (selectedMonths.includes(mIdx)) {
        if (selectedMonths.length > 1) {
          setSelectedMonths(selectedMonths.filter((m) => m !== mIdx));
        }
      } else {
        setSelectedMonths([...selectedMonths, mIdx]);
      }
    }
  };

  const selectQuarter = (q: 1 | 2 | 3 | 4) => {
    const qMonths: Record<number, number[]> = {
      1: [0, 1, 2],
      2: [3, 4, 5],
      3: [6, 7, 8],
      4: [9, 10, 11],
    };
    setSelectedMonths(qMonths[q]);
    setMonthSelectionType('multiple');
  };

  const selectCurrentMonth = () => {
    setSelectedMonths([new Date().getMonth()]);
    setMonthSelectionType('single');
  };

  const selectPreviousMonth = () => {
    const prev = (new Date().getMonth() + 11) % 12;
    setSelectedMonths([prev]);
    setMonthSelectionType('single');
  };

  const selectLast3Months = () => {
    const cur = new Date().getMonth();
    const months = [(cur + 10) % 12, (cur + 11) % 12, cur];
    setSelectedMonths(months);
    setMonthSelectionType('multiple');
  };

  const selectLast6Months = () => {
    const cur = new Date().getMonth();
    const months: number[] = [];
    for (let i = 5; i >= 0; i--) {
      months.push((cur + 12 - i) % 12);
    }
    setSelectedMonths(months);
    setMonthSelectionType('multiple');
  };

  const selectAllMonths = () => {
    setSelectedMonths(Array.from({ length: 12 }, (_, i) => i));
    setMonthSelectionType('multiple');
  };

  const handlePrintSlip = (summary: CleanerPaySummary) => {
    setSelectedSummaryForModal(summary);
    setPrintModalOpen(true);
  };

  const handleExportSlip = (summary: CleanerPaySummary) => {
    exportWeeklyPaySlipExcel(summary, periodLabel);
  };

  const handleExportComprehensiveReport = () => {
    exportFinancialPeriodExcel(
      cleanerPaySummaries,
      periodLabel,
      periodTypeLabel,
      monthlyBreakdown,
      periodTasks
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Period Mode Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              {periodMode === 'weekly' && 'Weekly Pay & Invoice Summary'}
              {periodMode === 'monthly' && 'Monthly Pay & Invoice Summary'}
              {periodMode === 'yearly' && 'Annual Pay & Invoice Summary'}
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#FFB509] text-neutral-950">
              {periodTypeLabel}
            </span>
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Cleaner payroll calculations, client invoice revenue, and business profit margins across periods.
          </p>
        </div>

        {/* Mode Toggle Pills (Weekly / Monthly / Whole Year) */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-2xs">
            <button
              onClick={() => setPeriodMode('weekly')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                periodMode === 'weekly'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Weekly</span>
            </button>
            <button
              onClick={() => {
                setPeriodMode('monthly');
                if (selectedMonths.length === 0) setSelectedMonths([new Date().getMonth()]);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                periodMode === 'monthly'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Monthly</span>
            </button>
            <button
              onClick={() => {
                setPeriodMode('yearly');
                setSelectedMonths(Array.from({ length: 12 }, (_, i) => i));
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                periodMode === 'yearly'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Whole Year</span>
            </button>
          </div>

          {/* Export Period Excel Button */}
          <button
            onClick={handleExportComprehensiveReport}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-[#FFB509] hover:bg-[#EAA300] text-neutral-950 transition-colors shadow-xs cursor-pointer"
            title={`Export ${periodLabel} summary to Excel`}
          >
            <Download className="w-4 h-4" />
            <span>Export {periodTypeLabel} (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Period Navigation & Selection Toolbar */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-xs space-y-3">
        {/* Weekly View Controls */}
        {periodMode === 'weekly' && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Go to Date Manual Picker */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-300 dark:border-neutral-700 shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <label htmlFor="manual-week-picker" className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                  Go to Date:
                </label>
                <input
                  id="manual-week-picker"
                  type="date"
                  value={selectedWeekDateStr}
                  onChange={handleDateChange}
                  className="bg-transparent border-none text-xs font-mono font-bold text-neutral-900 dark:text-white focus:outline-none cursor-pointer"
                  title="Manually choose any date to view that specific week"
                />
              </div>

              {/* Prev / Next Week Switcher */}
              <div className="flex items-center gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
                <button
                  onClick={handlePrevWeek}
                  aria-label="Previous week"
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold px-2 text-neutral-900 dark:text-white font-mono">
                  {weekLabel}
                </span>
                <button
                  onClick={handleNextWeek}
                  aria-label="Next week"
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handleThisWeek}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
              >
                Current Week
              </button>
            </div>

            <span className="text-xs text-neutral-500 font-mono-numbers">
              {periodTasks.length} cleaning {periodTasks.length === 1 ? 'job' : 'jobs'} this week
            </span>
          </div>
        )}

        {/* Monthly View Controls (Single month or multi-month selection) */}
        {periodMode === 'monthly' && (
          <div className="space-y-3.5">
            {/* Top row: Year switcher + Selection mode + Quick presets */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Year Switcher */}
                <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <button
                    onClick={() => setSelectedYear((y) => y - 1)}
                    className="p-1 hover:bg-white dark:hover:bg-neutral-700 rounded-lg text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
                    title="Previous year"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono font-bold text-xs px-2 text-neutral-900 dark:text-white">
                    {selectedYear}
                  </span>
                  <button
                    onClick={() => setSelectedYear((y) => y + 1)}
                    className="p-1 hover:bg-white dark:hover:bg-neutral-700 rounded-lg text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
                    title="Next year"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Single vs Multi-Month Mode Toggle */}
                <div className="flex items-center p-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                  <button
                    onClick={() => {
                      setMonthSelectionType('single');
                      if (selectedMonths.length > 1) setSelectedMonths([selectedMonths[0]]);
                    }}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      monthSelectionType === 'single'
                        ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs font-bold'
                        : 'hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    Single Month
                  </button>
                  <button
                    onClick={() => setMonthSelectionType('multiple')}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      monthSelectionType === 'multiple'
                        ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs font-bold'
                        : 'hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    Multi-Month
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    onClick={selectCurrentMonth}
                    className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                  >
                    This Month
                  </button>
                  <button
                    onClick={selectPreviousMonth}
                    className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                  >
                    Last Month
                  </button>
                  <button
                    onClick={selectLast3Months}
                    className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                  >
                    Last 3 Mos
                  </button>
                  <button
                    onClick={selectLast6Months}
                    className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                  >
                    Last 6 Mos
                  </button>
                  <button
                    onClick={selectAllMonths}
                    className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 hover:bg-amber-200 transition-colors cursor-pointer font-bold"
                  >
                    All 12 Months
                  </button>
                </div>
              </div>

              <div className="text-xs text-neutral-500 font-mono-numbers">
                <span className="font-bold text-neutral-900 dark:text-white">{periodLabel}</span>
                <span className="ml-1 text-neutral-400">({periodTasks.length} jobs)</span>
              </div>
            </div>

            {/* 12-Month Pills Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5">
              {MONTH_NAMES.map((name, idx) => {
                const isSelected = selectedMonths.includes(idx);
                const hasTasks = monthsWithTasks.has(idx);

                return (
                  <button
                    key={name}
                    onClick={() => toggleMonth(idx)}
                    className={`px-2 py-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-neutral-900 text-white dark:bg-[#FFB509] dark:text-neutral-950 border-neutral-900 dark:border-[#FFB509] shadow-xs'
                        : hasTasks
                        ? 'bg-amber-50/70 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200 border-amber-200 dark:border-amber-800/80 hover:bg-amber-100'
                        : 'bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700/60 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <span className="font-bold">{SHORT_MONTH_NAMES[idx]}</span>
                    <span className="text-[10px] opacity-75 font-mono">
                      {hasTasks ? '●' : '—'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quarters Quick Bar */}
            <div className="flex items-center justify-between text-xs pt-1 flex-wrap gap-2 text-neutral-500">
              <span className="text-[11px]">
                {monthSelectionType === 'multiple' 
                  ? 'Multi-month active: Click months above to add/remove from summary' 
                  : 'Click any month above or switch to Multi-Month to combine multiple months'}
              </span>
              <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                <span className="text-neutral-400">Quarters:</span>
                <button onClick={() => selectQuarter(1)} className="hover:underline text-amber-600 dark:text-amber-400 cursor-pointer">Q1 (Jan–Mar)</button>
                <span>·</span>
                <button onClick={() => selectQuarter(2)} className="hover:underline text-amber-600 dark:text-amber-400 cursor-pointer">Q2 (Apr–Jun)</button>
                <span>·</span>
                <button onClick={() => selectQuarter(3)} className="hover:underline text-amber-600 dark:text-amber-400 cursor-pointer">Q3 (Jul–Sep)</button>
                <span>·</span>
                <button onClick={() => selectQuarter(4)} className="hover:underline text-amber-600 dark:text-amber-400 cursor-pointer">Q4 (Oct–Dec)</button>
              </div>
            </div>
          </div>
        )}

        {/* Whole Year View Controls */}
        {periodMode === 'yearly' && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                <button
                  onClick={() => setSelectedYear((y) => y - 1)}
                  className="p-1.5 hover:bg-white dark:hover:bg-neutral-700 rounded-lg text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
                  title="Previous year"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-mono font-extrabold text-sm px-3 text-neutral-900 dark:text-white">
                  Full Year {selectedYear}
                </span>
                <button
                  onClick={() => setSelectedYear((y) => y + 1)}
                  className="p-1.5 hover:bg-white dark:hover:bg-neutral-700 rounded-lg text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
                  title="Next year"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {availableYears.length > 1 && (
                <div className="flex items-center gap-1">
                  {availableYears.map((yr) => (
                    <button
                      key={yr}
                      onClick={() => setSelectedYear(yr)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                        selectedYear === yr
                          ? 'bg-[#FFB509] text-neutral-950 shadow-2xs'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                      }`}
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono-numbers">
              <span>Includes all 12 calendar months</span>
              <span>·</span>
              <span className="font-bold text-neutral-900 dark:text-white">{periodTasks.length} total cleans recorded</span>
            </div>
          </div>
        )}
      </div>

      {/* Top Financial Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invoiced */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Total Client Invoiced
            </span>
            <DollarSign className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-neutral-900 dark:text-white font-mono-numbers">
            {formatCurrency(totalInvoicedAll)}
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            {periodMode === 'weekly' && 'Weekly revenue from jobs'}
            {periodMode === 'monthly' && `${selectedMonths.length} month(s) total revenue`}
            {periodMode === 'yearly' && `Full Year ${selectedYear} revenue`}
          </p>
        </div>

        {/* Total Cleaner Payout */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Total Cleaner Wages
            </span>
            <Users className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono-numbers">
            {formatCurrency(totalPayout)}
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            Hourly wages + special allowances ({weeksCountInPeriod} wks)
          </p>
        </div>

        {/* Gross Business Margin */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Gross Profit Margin
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono-numbers">
            {formatCurrency(totalMarginAll)}
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            {marginPercent.toFixed(1)}% profit margin
          </p>
        </div>

        {/* Hours Worked */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Total Hours Worked
            </span>
            <Clock className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-neutral-900 dark:text-white font-mono-numbers">
            {totalHoursWorked.toFixed(1)} hrs
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            {cleanerPaySummaries.reduce((sum, s) => sum + s.taskCount, 0)} completed jobs
          </p>
        </div>
      </div>

      {/* Month-by-Month Financial Trend Table (Visible in Whole Year Mode or Multi-Month Mode) */}
      {(periodMode === 'yearly' || (periodMode === 'monthly' && selectedMonths.length > 1)) && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-800/40">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                Monthly Performance Breakdown ({monthlyBreakdown.length} Months)
              </h2>
            </div>
            <span className="text-xs text-neutral-500 font-mono">
              {periodLabel}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50/50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                <tr>
                  <th className="py-2.5 px-4">Month</th>
                  <th className="py-2.5 px-4 text-right">Jobs (Done/Total)</th>
                  <th className="py-2.5 px-4 text-right">Hours</th>
                  <th className="py-2.5 px-4 text-right">Client Invoiced</th>
                  <th className="py-2.5 px-4 text-right">Cleaner Wages</th>
                  <th className="py-2.5 px-4 text-right">Special Allowances</th>
                  <th className="py-2.5 px-4 text-right">Total Payout</th>
                  <th className="py-2.5 px-4 text-right">Gross Margin</th>
                  <th className="py-2.5 px-4 text-right">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {monthlyBreakdown.map((m) => (
                  <tr key={m.monthKey} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                      <span>{m.monthLabel}</span>
                      {m.taskCount === 0 && (
                        <span className="text-[10px] text-neutral-400 font-normal">(No cleans)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-numbers">
                      {m.completedTaskCount} / {m.taskCount}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-numbers">
                      {m.hoursWorked.toFixed(1)} h
                    </td>
                    <td className="py-3 px-4 text-right font-mono-numbers font-bold text-neutral-900 dark:text-white">
                      {formatCurrency(m.totalInvoiced)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-numbers text-neutral-700 dark:text-neutral-300">
                      {formatCurrency(m.cleanerWages)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-numbers text-amber-600 dark:text-amber-400">
                      {formatCurrency(m.specialTaskPay)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-numbers font-bold text-neutral-900 dark:text-white">
                      {formatCurrency(m.totalPay)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-numbers font-bold">
                      <span className={m.margin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}>
                        {formatCurrency(m.margin)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono-numbers font-semibold">
                      <span className={m.marginPercent >= 20 ? 'text-emerald-600 dark:text-emerald-400' : m.marginPercent >= 0 ? 'text-amber-600' : 'text-red-600'}>
                        {m.totalInvoiced > 0 ? `${m.marginPercent.toFixed(1)}%` : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-neutral-100/70 dark:bg-neutral-800/80 border-t-2 border-neutral-300 dark:border-neutral-700 font-bold text-xs">
                <tr>
                  <td className="py-3 px-4 text-neutral-900 dark:text-white">Total Period Combined</td>
                  <td className="py-3 px-4 text-right font-mono-numbers">
                    {monthlyBreakdown.reduce((sum, m) => sum + m.completedTaskCount, 0)} / {monthlyBreakdown.reduce((sum, m) => sum + m.taskCount, 0)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-numbers">
                    {monthlyBreakdown.reduce((sum, m) => sum + m.hoursWorked, 0).toFixed(1)} h
                  </td>
                  <td className="py-3 px-4 text-right font-mono-numbers font-black text-neutral-950 dark:text-white">
                    {formatCurrency(monthlyBreakdown.reduce((sum, m) => sum + m.totalInvoiced, 0))}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-numbers">
                    {formatCurrency(monthlyBreakdown.reduce((sum, m) => sum + m.cleanerWages, 0))}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-numbers text-amber-600 dark:text-amber-400">
                    {formatCurrency(monthlyBreakdown.reduce((sum, m) => sum + m.specialTaskPay, 0))}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-numbers font-black text-neutral-950 dark:text-white">
                    {formatCurrency(monthlyBreakdown.reduce((sum, m) => sum + m.totalPay, 0))}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-numbers font-black text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(monthlyBreakdown.reduce((sum, m) => sum + m.margin, 0))}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-numbers font-black text-emerald-600 dark:text-emerald-400">
                    {marginPercent.toFixed(1)}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Cleaner Wage & Invoice Breakdown Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-neutral-50 dark:bg-neutral-800/40">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">
              Cleaner Wage & Invoice Breakdown
            </h2>
            <p className="text-xs text-neutral-500">
              Period: {periodLabel}
              {periodMode === 'weekly' && (
                <> · <span className="font-semibold text-emerald-600 dark:text-emerald-400">{paidCleanersCount} of {cleanerPaySummaries.length} Cleaners Paid</span></>
              )}
            </p>
          </div>
          <span className="text-xs text-neutral-500 font-mono-numbers">
            {cleanerPaySummaries.length} Cleaners
          </span>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
              <tr>
                <th className="py-3 px-4">Cleaner Name</th>
                <th className="py-3 px-4 text-right">Hourly Rate</th>
                <th className="py-3 px-4 text-right">Hours (Done/Sched)</th>
                <th className="py-3 px-4 text-right">Hourly Wages</th>
                <th className="py-3 px-4 text-right">
                  {periodMode === 'weekly' ? 'Special Task/Wk' : 'Special Allowance'}
                </th>
                <th className="py-3 px-4 text-right min-w-[210px]">
                  {periodMode === 'weekly' ? 'Weekly Payout & Paid Status' : 'Total Net Payout'}
                </th>
                <th className="py-3 px-4 text-right">Client Invoiced</th>
                <th className="py-3 px-4 text-right">Business Margin</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {cleanerPaySummaries.map((summary) => {
                const paymentKey = `${summary.cleanerId}_${weekKey}`;
                const paymentRecord = paidRecords[paymentKey];
                const isPaid = !!paymentRecord?.isPaid;

                return (
                  <tr
                    key={summary.cleanerId}
                    className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors"
                  >
                    {/* Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-neutral-900 dark:text-white">
                        {summary.cleanerName}
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        {summary.taskCount} {summary.taskCount === 1 ? 'task' : 'tasks'} assigned
                      </div>
                    </td>

                    {/* Hourly Rate */}
                    <td className="py-3.5 px-4 text-right font-mono-numbers font-medium text-neutral-700 dark:text-neutral-300">
                      {formatCurrency(summary.hourlyRate)}/hr
                    </td>

                    {/* Hours */}
                    <td className="py-3.5 px-4 text-right font-mono-numbers whitespace-nowrap">
                      <span className="font-bold text-neutral-900 dark:text-white">
                        {summary.completedHours.toFixed(1)} h
                      </span>
                      <span className="text-[11px] text-neutral-400 ml-1">
                        / {summary.scheduledHours.toFixed(1)} h
                      </span>
                    </td>

                    {/* Hourly Pay */}
                    <td className="py-3.5 px-4 text-right font-mono-numbers font-medium text-neutral-900 dark:text-white">
                      {formatCurrency(summary.regularPay)}
                    </td>

                    {/* Special Task Pay */}
                    <td className="py-3.5 px-4 text-right font-mono-numbers text-amber-600 dark:text-amber-400 font-semibold whitespace-nowrap">
                      <div>{formatCurrency(summary.specialTaskPay)}</div>
                      {summary.specialTaskPay > 0 && periodMode !== 'weekly' && (
                        <div className="text-[10px] text-neutral-400 font-normal font-sans">
                          ${(cleaners.find(c => c.id === summary.cleanerId)?.specialTaskPayPerWeek || 0)}/wk × {weeksCountInPeriod} wks
                        </div>
                      )}
                    </td>

                    {/* Total Payout & Paid Tracking Status */}
                    <td className="py-3.5 px-4 text-right font-mono-numbers whitespace-nowrap">
                      <div className="font-extrabold text-neutral-950 dark:text-white text-sm">
                        {formatCurrency(summary.totalPay)}
                      </div>
                      {periodMode === 'weekly' ? (
                        <div className="mt-1 flex items-center justify-end gap-1.5 font-sans">
                          {isPaid ? (
                            <div className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-md text-[11px] font-semibold">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span>Paid</span>
                              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono font-normal">
                                ({paymentRecord?.paidAt})
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUndoPaid(summary.cleanerId)}
                                className="ml-1 text-[10px] text-neutral-400 hover:text-red-600 hover:underline cursor-pointer font-normal"
                                title="Undo payment status if clicked by mistake"
                              >
                                Undo
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5">
                              <span className="text-[10px] font-medium text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                                Unpaid
                              </span>
                              <button
                                type="button"
                                onClick={() => handleMarkAsPaid(summary.cleanerId)}
                                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                                title="Mark cleaner wage as paid for this week"
                              >
                                <CheckCircle className="w-3 h-3" />
                                <span>Mark as paid</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-[10px] text-neutral-400 font-sans mt-0.5">
                          Weekly payments aggregated
                        </div>
                      )}
                    </td>

                    {/* Client Invoiced */}
                    <td className="py-3.5 px-4 text-right font-mono-numbers font-bold text-neutral-900 dark:text-white">
                      {formatCurrency(summary.totalInvoiced)}
                    </td>

                    {/* Margin */}
                    <td className="py-3.5 px-4 text-right font-mono-numbers font-bold whitespace-nowrap">
                      <span className={summary.margin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}>
                        {formatCurrency(summary.margin)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedSummaryForModal(summary)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
                          title="View job breakdown"
                        >
                          Breakdown
                        </button>
                        <button
                          onClick={() => handleExportSlip(summary)}
                          className="p-1 text-neutral-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-md cursor-pointer"
                          title={`Export Excel Pay Slip for ${periodLabel}`}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handlePrintSlip(summary)}
                          className="p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-md cursor-pointer"
                          title="Print Pay Slip"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Table Totals Row */}
            <tfoot className="bg-neutral-100/70 dark:bg-neutral-800/80 border-t-2 border-neutral-300 dark:border-neutral-700 font-bold text-xs">
              <tr>
                <td className="py-3.5 px-4 text-neutral-900 dark:text-white">
                  Total Aggregate
                </td>
                <td className="py-3.5 px-4 text-right text-neutral-500">—</td>
                <td className="py-3.5 px-4 text-right font-mono-numbers">
                  {totalHoursWorked.toFixed(1)} h
                </td>
                <td className="py-3.5 px-4 text-right font-mono-numbers">
                  {formatCurrency(cleanerPaySummaries.reduce((s, c) => s + c.regularPay, 0))}
                </td>
                <td className="py-3.5 px-4 text-right font-mono-numbers text-amber-600 dark:text-amber-400">
                  {formatCurrency(cleanerPaySummaries.reduce((s, c) => s + c.specialTaskPay, 0))}
                </td>
                <td className="py-3.5 px-4 text-right font-mono-numbers font-black text-neutral-950 dark:text-white">
                  <div>{formatCurrency(totalPayout)}</div>
                  {periodMode === 'weekly' && (
                    <div className="text-[10px] font-sans font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
                      {paidCleanersCount} of {cleanerPaySummaries.length} Cleaners Paid
                    </div>
                  )}
                </td>
                <td className="py-3.5 px-4 text-right font-mono-numbers font-black text-neutral-950 dark:text-white">
                  {formatCurrency(totalInvoicedAll)}
                </td>
                <td className="py-3.5 px-4 text-right font-mono-numbers font-black text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totalMarginAll)}
                </td>
                <td className="py-3.5 px-4"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Mobile View */}
        <div className="lg:hidden divide-y divide-neutral-200 dark:divide-neutral-800">
          {cleanerPaySummaries.map((summary) => {
            const paymentKey = `${summary.cleanerId}_${weekKey}`;
            const paymentRecord = paidRecords[paymentKey];
            const isPaid = !!paymentRecord?.isPaid;

            return (
              <div key={summary.cleanerId} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                      {summary.cleanerName}
                    </h3>
                    <div className="text-xs text-neutral-500 font-mono-numbers">
                      Rate: {formatCurrency(summary.hourlyRate)}/hr · {summary.completedHours.toFixed(1)} hrs completed
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-neutral-400 uppercase font-bold block">Payout</span>
                    <span className="text-base font-extrabold text-neutral-900 dark:text-white font-mono-numbers">
                      {formatCurrency(summary.totalPay)}
                    </span>
                    {periodMode === 'weekly' && (
                      <div className="mt-1">
                        {isPaid ? (
                          <div className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span className="font-bold">Paid</span>
                            <span className="text-[10px] text-neutral-500 font-mono">
                              ({paymentRecord?.paidAt})
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUndoPaid(summary.cleanerId)}
                              className="text-[10px] text-neutral-400 hover:text-red-600 ml-1 underline cursor-pointer"
                            >
                              Undo
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleMarkAsPaid(summary.cleanerId)}
                            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-2xs cursor-pointer"
                          >
                            <CheckCircle className="w-3 h-3" />
                            <span>Mark as paid</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 text-xs font-mono-numbers">
                  <div>
                    <span className="text-[10px] text-neutral-400 block">Wages</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">{formatCurrency(summary.regularPay)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 block">Special Allow</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">{formatCurrency(summary.specialTaskPay)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 block">Invoiced</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">{formatCurrency(summary.totalInvoiced)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => setSelectedSummaryForModal(summary)}
                    className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    View {summary.taskCount} Assigned Jobs &rarr;
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExportSlip(summary)}
                      className="px-2.5 py-1 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 cursor-pointer"
                    >
                      Export
                    </button>
                    <button
                      onClick={() => handlePrintSlip(summary)}
                      className="px-2.5 py-1 text-xs rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-semibold cursor-pointer"
                    >
                      Pay Slip
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cleaner Jobs Breakdown Modal */}
      {selectedSummaryForModal && !printModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-2xl w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-800/50">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Job Breakdown: {selectedSummaryForModal.cleanerName}
                </h3>
                <p className="text-xs text-neutral-500">
                  Period: {periodLabel} · Base Wage: ${selectedSummaryForModal.hourlyRate.toFixed(2)}/hr
                </p>
              </div>
              <button
                onClick={() => setSelectedSummaryForModal(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
              {selectedSummaryForModal.tasks.length === 0 ? (
                <p className="text-sm text-neutral-500 text-center py-6">
                  No tasks assigned to this cleaner in this period ({periodLabel}).
                </p>
              ) : (
                selectedSummaryForModal.tasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-neutral-900 dark:text-white text-sm">
                          {t.clientName || 'Client Unspecified'}
                        </span>
                        <span className="font-mono text-[11px] text-neutral-500">
                          {formatDate(t.date)} ({t.fixHour}h)
                        </span>
                        {t.invoiceNumber && (
                          <span className="font-mono text-[10px] bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded font-semibold text-neutral-700 dark:text-neutral-300">
                            {t.invoiceNumber}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono-numbers font-bold text-neutral-900 dark:text-white">
                        {formatCurrency(t.fixHour * selectedSummaryForModal.hourlyRate)}
                      </div>
                      <span className={`text-[10px] font-semibold ${t.completed ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {t.completed ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                  </div>
                ))
              )}

              {/* Special task allowance line */}
              <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-amber-900 dark:text-amber-200">
                    Special Task Allowance
                  </span>
                  <p className="text-neutral-500 text-[11px]">
                    Lead responsibilities, specialized cleans, equipment upkeep ({weeksCountInPeriod} wks)
                  </p>
                </div>
                <span className="font-mono-numbers font-bold text-amber-800 dark:text-amber-300">
                  {formatCurrency(selectedSummaryForModal.specialTaskPay)}
                </span>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/30 flex items-center justify-between">
              <div>
                <span className="text-xs text-neutral-500 block">Total Net Wage</span>
                <span className="text-lg font-extrabold text-neutral-900 dark:text-white font-mono-numbers">
                  {formatCurrency(selectedSummaryForModal.totalPay)}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExportSlip(selectedSummaryForModal)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700 cursor-pointer"
                >
                  Export .xlsx
                </button>
                <button
                  onClick={() => setPrintModalOpen(true)}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[#FFB509] text-neutral-950 cursor-pointer"
                >
                  Print Slip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Pay Slip Modal */}
      {printModalOpen && selectedSummaryForModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-neutral-950 rounded-2xl max-w-lg w-full p-8 shadow-2xl space-y-6 border border-neutral-200">
            {/* Header */}
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-[#FFB509] flex items-center justify-center p-1 shadow-xs">
                    <BeeLogo className="w-7 h-7" />
                  </div>
                  <span className="text-lg font-extrabold tracking-tight">
                    DBuzzingBees
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  Cleaning Services &times; Timesheet Wage Slip
                </p>
              </div>
              <div className="text-right text-xs">
                <span className="font-bold uppercase tracking-wider text-neutral-400 block">Period</span>
                <span className="font-mono font-semibold">{periodLabel}</span>
              </div>
            </div>

            {/* Cleaner Info */}
            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-neutral-500 block">Cleaner:</span>
                <strong className="text-sm">{selectedSummaryForModal.cleanerName}</strong>
              </div>
              <div>
                <span className="text-neutral-500 block">Base Pay Rate:</span>
                <strong className="text-sm font-mono">${selectedSummaryForModal.hourlyRate.toFixed(2)} / hr</strong>
              </div>
              <div>
                <span className="text-neutral-500 block">Status:</span>
                {periodMode === 'weekly' ? (
                  paidRecords[`${selectedSummaryForModal.cleanerId}_${weekKey}`]?.isPaid ? (
                    <span className="font-bold text-emerald-600 flex items-center gap-1 text-[11px] mt-0.5">
                      <CheckCircle className="w-3 h-3" /> PAID
                    </span>
                  ) : (
                    <span className="font-bold text-amber-600 text-[11px] mt-0.5 block">
                      UNPAID
                    </span>
                  )
                ) : (
                  <span className="font-bold text-neutral-700 text-[11px] mt-0.5 block">
                    {periodTypeLabel}
                  </span>
                )}
              </div>
            </div>

            {/* Tasks Summary */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-neutral-700 uppercase tracking-wider text-[10px]">
                Work Completed ({selectedSummaryForModal.tasks.length} jobs)
              </span>
              <table className="w-full text-left">
                <thead className="border-b text-neutral-500 text-[10px] uppercase">
                  <tr>
                    <th className="py-1">Date</th>
                    <th className="py-1">Client Name</th>
                    <th className="py-1 text-right">Hours</th>
                    <th className="py-1 text-right">Pay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-mono">
                  {selectedSummaryForModal.tasks.map((t) => (
                    <tr key={t.id}>
                      <td className="py-1.5 text-neutral-600">{t.date}</td>
                      <td className="py-1.5 text-neutral-900 truncate max-w-[200px] font-sans font-medium">
                        {t.clientName || 'Client Unspecified'}
                      </td>
                      <td className="py-1.5 text-right">{t.fixHour}h</td>
                      <td className="py-1.5 text-right">
                        ${(t.fixHour * selectedSummaryForModal.hourlyRate).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {selectedSummaryForModal.tasks.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-2 text-center text-neutral-400 font-sans">
                        No jobs in this period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Wage Calculation Summary */}
            <div className="border-t pt-4 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-neutral-600">
                <span>Total Work Hours ({selectedSummaryForModal.completedHours} hrs):</span>
                <span>${selectedSummaryForModal.regularPay.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Special Task Allowance ({weeksCountInPeriod} wks):</span>
                <span>${selectedSummaryForModal.specialTaskPay.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t pt-2 text-neutral-950">
                <span>TOTAL PAYOUT:</span>
                <span>${selectedSummaryForModal.totalPay.toFixed(2)}</span>
              </div>
            </div>

            {/* Print & Close Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 no-print">
              <button
                onClick={() => setPrintModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-neutral-300 text-neutral-700 cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-neutral-900 text-white flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
