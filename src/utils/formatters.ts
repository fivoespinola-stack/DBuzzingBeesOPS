import { Task, RecurrenceType } from '../types';

// Currency and date formatting helpers

export const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
};

export const getOffsetDate = (daysOffset: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
};

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-');
    if (year && month && day) {
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
};

export const formatDateLong = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-');
    if (year && month && day) {
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
};

export const formatTime12h = (time24: string): string => {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return time24;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${mStr || '00'} ${ampm}`;
};

// Calculate end time given start time string (HH:mm) and duration in hours
export const calculateEndTime = (startTime: string, hours: number): string => {
  if (!startTime) return '12:00';
  const [hStr, mStr] = startTime.split(':');
  const totalMins = (parseInt(hStr, 10) || 0) * 60 + (parseInt(mStr, 10) || 0) + Math.round(hours * 60);
  const newH = Math.floor(totalMins / 60) % 24;
  const newM = totalMins % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
};

// Get the Monday (start) of the week for a given date
export const getWeekStart = (d: Date = new Date()): Date => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

// Format week label e.g., "Oct 19 - Oct 25, 2026"
export const getWeekLabel = (startDate: Date): string => {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);

  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
  const startDay = startDate.getDate();
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
  const endDay = endDate.getDate();
  const year = endDate.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} – ${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
};

// Generate clean, formatted schedule text for dispatching to cleaners via SMS/WhatsApp
// Contains ONLY: Client Name, Contact, Time, Job Type, Duration, Address, Notes, and Assigned Cleaners
export const generateScheduleDispatchText = (
  tasks: Array<any>,
  cleaners: Array<any>,
  dateStr: string,
  targetCleanerId?: string
): string => {
  const getCleanerName = (id: string) => cleaners.find((c) => c.id === id)?.name || id;

  const filteredTasks = targetCleanerId
    ? tasks.filter((t) => t.assignedCleanerIds.includes(targetCleanerId))
    : tasks;

  const targetCleaner = targetCleanerId ? cleaners.find((c) => c.id === targetCleanerId) : null;
  const dateFormatted = formatDateLong(dateStr);

  if (filteredTasks.length === 0) {
    return `Cleaning Schedule (${dateFormatted})\nNo cleaning jobs scheduled${targetCleaner ? ` for ${targetCleaner.name}` : ''}.`;
  }

  const sortedTasks = [...filteredTasks].sort((a, b) => a.startTime.localeCompare(b.startTime));

  let text = `Cleaning Schedule - ${dateFormatted}\n`;
  if (targetCleaner) {
    text += `Cleaner: ${targetCleaner.name}\n`;
  }
  text += `------------------------------------\n\n`;

  sortedTasks.forEach((task, index) => {
    const cleanerNames = task.assignedCleanerIds.map(getCleanerName).join(', ');
    const timeRange = `${formatTime12h(task.startTime)} - ${formatTime12h(task.endTime)}`;
    const contactInfo = [task.clientPhone, task.clientEmail].filter(Boolean).join(' | ') || 'N/A';
    
    text += `[${index + 1}] ${timeRange} (${task.fixHour} hrs)\n`;
    text += `Job: ${task.jobType}\n`;
    text += `Client: ${task.clientName || 'N/A'}\n`;
    text += `Contact: ${contactInfo}\n`;
    text += `Address: ${task.address}\n`;
    text += `Assigned Cleaners: ${cleanerNames || 'Unassigned'}\n`;
    if (task.remarks) {
      text += `Notes: ${task.remarks}\n`;
    }
    text += `\n`;
  });

  return text.trim();
};

export const generateSingleTaskDispatchText = (task: any, cleaners: Array<any>): string => {
  const getCleanerName = (id: string) => cleaners.find((c) => c.id === id)?.name || id;
  const cleanerNames = task.assignedCleanerIds.map(getCleanerName).join(', ');
  const timeRange = `${formatTime12h(task.startTime)} - ${formatTime12h(task.endTime)}`;
  const contactInfo = [task.clientPhone, task.clientEmail].filter(Boolean).join(' | ') || 'N/A';

  let text = `Job Schedule\n`;
  text += `Time: ${timeRange}\n`;
  text += `Duration: ${task.fixHour} hrs\n`;
  text += `Job Type: ${task.jobType}\n`;
  text += `Client: ${task.clientName || 'N/A'}\n`;
  text += `Contact: ${contactInfo}\n`;
  text += `Address: ${task.address}\n`;
  text += `Assigned Cleaners: ${cleanerNames || 'Unassigned'}\n`;
  if (task.remarks) {
    text += `Notes: ${task.remarks}\n`;
  }
  return text.trim();
};

// Generate formatted text for a full week's schedule (Monday to Sunday)
// Contains ONLY: Client Name, Contact, Time, Job Type, Duration, Address, Notes, and Assigned Cleaners
export const generateWeeklyDispatchText = (
  weekTasks: Array<any>,
  cleaners: Array<any>,
  weekLabel: string,
  targetCleanerId?: string
): string => {
  const getCleanerName = (id: string) => cleaners.find((c) => c.id === id)?.name || id;

  const filteredTasks = targetCleanerId
    ? weekTasks.filter((t) => t.assignedCleanerIds.includes(targetCleanerId))
    : weekTasks;

  const targetCleaner = targetCleanerId ? cleaners.find((c) => c.id === targetCleanerId) : null;

  if (filteredTasks.length === 0) {
    return `Weekly Schedule (${weekLabel})\nNo cleaning jobs scheduled${targetCleaner ? ` for ${targetCleaner.name}` : ''}.`;
  }

  const sortedTasks = [...filteredTasks].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  let text = `Weekly Cleaning Schedule (${weekLabel})\n`;
  if (targetCleaner) {
    text += `Cleaner: ${targetCleaner.name}\n`;
  }
  text += `------------------------------------\n`;

  let lastDate = '';
  sortedTasks.forEach((task) => {
    if (task.date !== lastDate) {
      lastDate = task.date;
      text += `\n${formatDateLong(task.date)}\n`;
    }
    const cleanerNames = task.assignedCleanerIds.map(getCleanerName).join(', ');
    const timeRange = `${formatTime12h(task.startTime)} - ${formatTime12h(task.endTime)}`;
    const contactInfo = [task.clientPhone, task.clientEmail].filter(Boolean).join(' | ') || 'N/A';
    
    text += `• Time: ${timeRange} (${task.fixHour} hrs)\n`;
    text += `  Job Type: ${task.jobType}\n`;
    text += `  Client: ${task.clientName || 'N/A'}\n`;
    text += `  Contact: ${contactInfo}\n`;
    text += `  Address: ${task.address}\n`;
    text += `  Assigned Cleaners: ${cleanerNames || 'Unassigned'}\n`;
    if (task.remarks) {
      text += `  Notes: ${task.remarks}\n`;
    }
    text += `\n`;
  });

  return text.trim();
};

export const formatFrequency = (freq: string): string => {
  switch (freq) {
    case 'one-off':
      return 'One-off';
    case 'twice-a-week':
      return 'Twice a Week';
    case 'weekly':
      return 'Weekly';
    case 'fortnightly':
      return 'Fortnightly';
    case 'every-3rd-week':
      return 'Every 3rd Week';
    case 'monthly':
      return 'Monthly';
    case 'end-of-month':
      return 'End of Month';
    case 'every-2-months':
      return 'Every 2 Months';
    case 'flexible':
      return 'Flexible';
    case 'others':
      return 'Others';
    default:
      return freq;
  }
};

/**
 * Calculates the next scheduled date (YYYY-MM-DD) based on recurrence setting.
 * Supports: 'daily' (+1 day), 'weekly' (+7 days), 'monthly' (+1 month with day-clamping).
 */
export const calculateNextScheduledDate = (
  dateStr: string,
  recurrence: RecurrenceType
): string => {
  if (!dateStr || recurrence === 'none') return dateStr;
  try {
    const [yStr, mStr, dStr] = dateStr.split('-');
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10) - 1;
    const day = parseInt(dStr, 10);
    // Use noon to avoid daylight saving boundary shifts
    const date = new Date(year, month, day, 12, 0, 0);

    if (recurrence === 'daily') {
      date.setDate(date.getDate() + 1);
    } else if (recurrence === 'weekly') {
      date.setDate(date.getDate() + 7);
    } else if (recurrence === 'monthly') {
      const targetMonth = date.getMonth() + 1;
      date.setMonth(targetMonth);
      // Handle day rollover (e.g. Jan 31 -> Mar 3 => clamp to Feb 28/29)
      if (date.getMonth() !== (targetMonth % 12)) {
        date.setDate(0);
      }
    }

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  } catch {
    return dateStr;
  }
};

/**
 * Generates the next scheduled instance of a completed recurring task.
 */
export const generateNextRecurringTask = (completedTask: Task): Task => {
  const recurrence = (completedTask.recurrence && completedTask.recurrence !== 'none')
    ? completedTask.recurrence
    : 'weekly';
  const nextDate = calculateNextScheduledDate(completedTask.date, recurrence);

  return {
    ...completedTask,
    id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    date: nextDate,
    completed: false,
    invoiceNumber: '', // Reset invoice number until client pays
    createdAt: new Date().toISOString(),
    isRecurring: true,
    recurrence,
    nextInstanceGenerated: false,
  };
};

export const formatRecurrenceLabel = (recurrence?: RecurrenceType): string => {
  switch (recurrence) {
    case 'daily':
      return 'Daily';
    case 'weekly':
      return 'Weekly';
    case 'monthly':
      return 'Monthly';
    case 'none':
    default:
      return 'None';
  }
};

/**
 * Checks if a frequency should be scheduled across the cleaning calendar for the next 6 months.
 * All frequencies EXCEPT 'one-off', 'flexible', and 'others' are recurring.
 */
export const isRecurringFrequency = (freq?: string): boolean => {
  if (!freq) return false;
  const f = freq.toLowerCase().trim();
  if (f === 'one-off' || f === 'flexible' || f === 'others' || f === 'other' || f === '') {
    return false;
  }
  return true;
};

/**
 * Returns all scheduled dates (YYYY-MM-DD) across the next 6 months for a given frequency.
 * Starts from startDateStr and steps through 6 calendar months (approx 183 days).
 */
export const getScheduledDatesForSixMonths = (
  startDateStr: string,
  frequency: string
): string[] => {
  if (!startDateStr || !isRecurringFrequency(frequency)) return [startDateStr];

  try {
    const [y, m, d] = startDateStr.split('-').map(Number);
    const start = new Date(y, m - 1, d, 12, 0, 0);
    const cutoff = new Date(y, m - 1, d, 12, 0, 0);
    cutoff.setMonth(cutoff.getMonth() + 6);

    const dates: string[] = [startDateStr];
    const toDateStr = (date: Date) => {
      const yr = date.getFullYear();
      const mo = String(date.getMonth() + 1).padStart(2, '0');
      const da = String(date.getDate()).padStart(2, '0');
      return `${yr}-${mo}-${da}`;
    };

    const norm = frequency.toLowerCase().trim();

    if (norm === 'twice-a-week') {
      let curr = new Date(start);
      let step = 0;
      while (true) {
        const days = step % 2 === 0 ? 3 : 4;
        curr = new Date(curr);
        curr.setDate(curr.getDate() + days);
        if (curr > cutoff) break;
        dates.push(toDateStr(curr));
        step++;
      }
    } else if (norm === 'weekly') {
      let curr = new Date(start);
      while (true) {
        curr = new Date(curr);
        curr.setDate(curr.getDate() + 7);
        if (curr > cutoff) break;
        dates.push(toDateStr(curr));
      }
    } else if (norm === 'fortnightly') {
      let curr = new Date(start);
      while (true) {
        curr = new Date(curr);
        curr.setDate(curr.getDate() + 14);
        if (curr > cutoff) break;
        dates.push(toDateStr(curr));
      }
    } else if (norm === 'every-3rd-week') {
      let curr = new Date(start);
      while (true) {
        curr = new Date(curr);
        curr.setDate(curr.getDate() + 21);
        if (curr > cutoff) break;
        dates.push(toDateStr(curr));
      }
    } else if (norm === 'monthly') {
      let monthStep = 1;
      while (monthStep <= 6) {
        const targetMonthIndex = (m - 1) + monthStep;
        const yr = y + Math.floor(targetMonthIndex / 12);
        const mo = targetMonthIndex % 12;
        const maxDays = new Date(yr, mo + 1, 0).getDate();
        const clampedDay = Math.min(d, maxDays);
        const curr = new Date(yr, mo, clampedDay, 12, 0, 0);
        if (curr > cutoff) break;
        dates.push(toDateStr(curr));
        monthStep++;
      }
    } else if (norm === 'end-of-month') {
      let monthStep = 1;
      while (monthStep <= 6) {
        const targetMonthIndex = (m - 1) + monthStep;
        const yr = y + Math.floor(targetMonthIndex / 12);
        const mo = targetMonthIndex % 12;
        const curr = new Date(yr, mo + 1, 0, 12, 0, 0);
        if (curr > cutoff) break;
        dates.push(toDateStr(curr));
        monthStep++;
      }
    } else if (norm === 'every-2-months') {
      let monthStep = 2;
      while (monthStep <= 6) {
        const targetMonthIndex = (m - 1) + monthStep;
        const yr = y + Math.floor(targetMonthIndex / 12);
        const mo = targetMonthIndex % 12;
        const maxDays = new Date(yr, mo + 1, 0).getDate();
        const clampedDay = Math.min(d, maxDays);
        const curr = new Date(yr, mo, clampedDay, 12, 0, 0);
        if (curr > cutoff) break;
        dates.push(toDateStr(curr));
        monthStep += 2;
      }
    }

    return dates;
  } catch {
    return [startDateStr];
  }
};

/**
 * Generates future scheduled instances for a recurring task across the next 6 months.
 * Skips the first date as that belongs to the primary/base task.
 */
export const generateSixMonthRecurringTasks = (baseTask: Task): Task[] => {
  if (!isRecurringFrequency(baseTask.frequency)) return [];
  const dates = getScheduledDatesForSixMonths(baseTask.date, baseTask.frequency);
  if (dates.length <= 1) return [];

  const seriesId = baseTask.seriesId || `series-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const futureDates = dates.slice(1);

  return futureDates.map((dateStr, index) => ({
    ...baseTask,
    id: `task-${Date.now()}-${index + 1}-${Math.random().toString(36).substring(2, 6)}`,
    date: dateStr,
    completed: false,
    invoiceNumber: '', // Unbilled for future scheduled instances
    createdAt: new Date().toISOString(),
    seriesId,
  }));
};



