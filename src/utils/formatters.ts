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

export const formatYMD = (year: number, monthIndex: number, day: number): string => {
  const m = String(monthIndex + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
};

export const toLocalDateString = (d: Date = new Date()): string => {
  return formatYMD(d.getFullYear(), d.getMonth(), d.getDate());
};

export const getOffsetDate = (daysOffset: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return toLocalDateString(d);
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

/**
 * Calculates the actual duration in hours based on the difference between start time and end time.
 * If start time and end time are missing or invalid, falls back to the provided fallbackHours.
 */
export const getTaskDurationHours = (
  startTime?: string,
  endTime?: string,
  fallbackHours?: number
): number => {
  if (!startTime || !endTime) {
    return Math.max(0, fallbackHours || 0);
  }
  const [startH, startM] = startTime.split(':').map((v) => parseInt(v, 10));
  const [endH, endM] = endTime.split(':').map((v) => parseInt(v, 10));

  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) {
    return Math.max(0, fallbackHours || 0);
  }

  const startTotalMinutes = startH * 60 + startM;
  let endTotalMinutes = endH * 60 + endM;

  // Handle shifts crossing midnight (e.g. 23:00 to 01:00)
  if (endTotalMinutes < startTotalMinutes) {
    endTotalMinutes += 24 * 60;
  }

  const diffMinutes = endTotalMinutes - startTotalMinutes;
  if (diffMinutes <= 0) {
    return Math.max(0, fallbackHours || 0);
  }

  // Round to 2 decimal places (e.g. 1.5, 2.25)
  return Math.round((diffMinutes / 60) * 100) / 100;
};

/**
 * Calculates estimated completion time when multiple cleaners work together.
 * Fixed hours represent single-cleaner time; when 2+ cleaners are assigned,
 * the completion duration is reduced accordingly (e.g., 4 hrs with 2 cleaners = 2 hrs).
 */
export const getEstimatedCompletionHours = (fixHour: number, cleanerCount: number): number => {
  const count = Math.max(1, cleanerCount || 1);
  const reduced = fixHour / count;
  return Math.max(0.25, Math.round(reduced * 100) / 100);
};

/**
 * Returns the billable working hours for a cleaner on a specific task.
 * Computed strictly from the difference between the actual start time and end time.
 */
export const getCleanerTaskHours = (task: {
  startTime?: string;
  endTime?: string;
  fixHour?: number;
  assignedCleanerIds?: string[];
}): number => {
  const cleanerCount = task.assignedCleanerIds?.length || 1;
  const fallback = cleanerCount > 1 ? (task.fixHour || 0) / cleanerCount : (task.fixHour || 0);
  return getTaskDurationHours(task.startTime, task.endTime, fallback);
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
 * Checks if a given date string (YYYY-MM-DD) falls on a weekend (Saturday or Sunday).
 */
export const isWeekend = (dateStr: string): boolean => {
  if (!dateStr) return false;
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d, 12, 0, 0);
    const day = date.getDay();
    return day === 0 || day === 6; // 0 = Sun, 6 = Sat
  } catch {
    return false;
  }
};

/**
 * Adjusts a Date object to ensure it falls strictly on a weekday (Monday to Friday).
 * Used because recurring client tasks cannot fall on Saturday or Sunday (weekends are reserved for special tasks).
 * - Saturday (6) -> Friday (-1 day)
 * - Sunday (0) -> if preferFriday (e.g. end-of-month), Friday (-2 days); otherwise Monday (+1 day)
 */
export const ensureWeekdayDate = (d: Date, preferFridayForSunday: boolean = false): Date => {
  const adjusted = new Date(d);
  const day = adjusted.getDay();
  if (day === 6) {
    // Saturday -> Friday
    adjusted.setDate(adjusted.getDate() - 1);
  } else if (day === 0) {
    // Sunday -> Friday or Monday
    if (preferFridayForSunday) {
      adjusted.setDate(adjusted.getDate() - 2);
    } else {
      adjusted.setDate(adjusted.getDate() + 1);
    }
  }
  return adjusted;
};

/**
 * Adjusts a YYYY-MM-DD date string to the nearest weekday if it falls on a weekend.
 */
export const adjustDateStringToWeekday = (dateStr: string, preferFriday: boolean = false): string => {
  if (!dateStr || !isWeekend(dateStr)) return dateStr;
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d, 12, 0, 0);
    const adjusted = ensureWeekdayDate(date, preferFriday);
    const yr = adjusted.getFullYear();
    const mo = String(adjusted.getMonth() + 1).padStart(2, '0');
    const da = String(adjusted.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${da}`;
  } catch {
    return dateStr;
  }
};

/**
 * Calculates the next scheduled date (YYYY-MM-DD) based on recurrence setting.
 * Supports: 'daily' (+1 day), 'weekly' (+7 days), 'monthly' (+1 month with day-clamping).
 * Strictly guarantees that recurring client tasks skip weekends (Saturday and Sunday).
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

    // Strict rule: Recurring client tasks must NEVER fall on Saturday or Sunday
    // If next date falls on Saturday, advance to Monday (+2 days)
    // If next date falls on Sunday, advance to Monday (+1 day)
    if (date.getDay() === 6) {
      date.setDate(date.getDate() + 2);
    } else if (date.getDay() === 0) {
      date.setDate(date.getDate() + 1);
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
/**
 * Standard weekday pairs for twice-a-week frequency.
 * Days: 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday.
 * Preserves the chosen scheduled day every single week!
 */
export const getTwiceAWeekDayPair = (dayOfWeek: number): [number, number] => {
  switch (dayOfWeek) {
    case 1: // Monday -> Monday & Thursday
      return [1, 4];
    case 2: // Tuesday -> Tuesday & Friday
      return [2, 5];
    case 3: // Wednesday -> Wednesday & Friday (always falls on Wednesday every week!)
      return [3, 5];
    case 4: // Thursday -> Monday & Thursday (always falls on Thursday every week!)
      return [1, 4];
    case 5: // Friday -> Tuesday & Friday (always falls on Friday every week!)
      return [2, 5];
    default:
      return [1, 4];
  }
};

export const getDayOfWeekName = (dayNum: number): string => {
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return names[dayNum % 7] || '';
};

/**
 * Returns a human-friendly cadence description mentioning the exact fixed weekdays.
 */
export const getRecurrenceCadenceSummary = (dateStr: string, frequency: string): string => {
  if (!dateStr || !isRecurringFrequency(frequency)) return '';
  const sanitized = adjustDateStringToWeekday(dateStr, false);
  const [y, m, d] = sanitized.split('-').map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });

  const norm = frequency.toLowerCase().trim();
  if (norm === 'weekly') {
    return `Every ${dayName} for the next 3 months`;
  }
  if (norm === 'twice-a-week') {
    const [dayA, dayB] = getTwiceAWeekDayPair(date.getDay());
    const nameA = getDayOfWeekName(dayA);
    const nameB = getDayOfWeekName(dayB);
    return `Every ${nameA} & ${nameB} for the next 3 months`;
  }
  if (norm === 'fortnightly') {
    return `Every 2 weeks on ${dayName} for the next 3 months`;
  }
  if (norm === 'every-3rd-week') {
    return `Every 3 weeks on ${dayName} for the next 3 months`;
  }
  if (norm === 'monthly') {
    return `Monthly around day ${d} (weekdays only) for the next 3 months`;
  }
  if (norm === 'end-of-month') {
    return `End of each month (last weekday) for the next 3 months`;
  }
  if (norm === 'every-2-months') {
    return `Every 2 months around day ${d} for the next 3 months`;
  }
  return `Recurring schedule for the next 3 months (strictly weekdays only)`;
};

/**
 * Returns all scheduled dates (YYYY-MM-DD) across the next 3 months for a given frequency.
 * Starts from startDateStr and steps through 3 calendar months (approx 92 days).
 * 
 * Rules:
 * 1. Weekly: task scheduled on Monday falls on Monday next week, Monday after, etc.
 * 2. Twice a week: task scheduled on Wednesday falls on Wednesday too in every subsequent week, paired with Friday.
 * 3. Weekends: No recurring task EVER falls on Saturday or Sunday (reserved strictly for special tasks / client requests).
 */
export const getScheduledDatesForThreeMonths = (
  startDateStr: string,
  frequency: string
): string[] => {
  if (!startDateStr || !isRecurringFrequency(frequency)) return [startDateStr];

  try {
    // If the base startDateStr is on a weekend, adjust it to a weekday first
    const sanitizedStartStr = adjustDateStringToWeekday(startDateStr, false);
    const [y, m, d] = sanitizedStartStr.split('-').map(Number);
    const start = new Date(y, m - 1, d, 12, 0, 0);
    const cutoff = new Date(y, m - 1, d, 12, 0, 0);
    cutoff.setMonth(cutoff.getMonth() + 3);

    const dates: string[] = [sanitizedStartStr];
    const toDateStr = (date: Date) => {
      const yr = date.getFullYear();
      const mo = String(date.getMonth() + 1).padStart(2, '0');
      const da = String(date.getDate()).padStart(2, '0');
      return `${yr}-${mo}-${da}`;
    };

    const norm = frequency.toLowerCase().trim();

    if (norm === 'twice-a-week') {
      const startDay = start.getDay(); // 1 to 5 (weekday)
      const [dayA, dayB] = getTwiceAWeekDayPair(startDay);

      // Find Monday of the week of start date (12:00 noon)
      const mondayOffset = startDay - 1;
      const weekMonday = new Date(start);
      weekMonday.setDate(weekMonday.getDate() - mondayOffset);

      let currentMonday = new Date(weekMonday);

      while (true) {
        // Date for dayA (e.g. Wednesday)
        const dateA = new Date(currentMonday);
        dateA.setDate(dateA.getDate() + (dayA - 1));

        // Date for dayB (e.g. Friday)
        const dateB = new Date(currentMonday);
        dateB.setDate(dateB.getDate() + (dayB - 1));

        if (dateA > cutoff && dateB > cutoff) {
          break;
        }

        // Add dateA if it's on or after start date and within cutoff
        if (dateA >= start && dateA <= cutoff) {
          const strA = toDateStr(dateA);
          if (!dates.includes(strA) && !isWeekend(strA)) {
            dates.push(strA);
          }
        }

        // Add dateB if it's on or after start date and within cutoff
        if (dateB >= start && dateB <= cutoff) {
          const strB = toDateStr(dateB);
          if (!dates.includes(strB) && !isWeekend(strB)) {
            dates.push(strB);
          }
        }

        // Advance to next week's Monday (+7 days)
        currentMonday.setDate(currentMonday.getDate() + 7);
        if (currentMonday > cutoff) break;
      }
    } else if (norm === 'weekly') {
      let curr = new Date(start);
      while (true) {
        curr = new Date(curr);
        curr.setDate(curr.getDate() + 7);
        if (curr > cutoff) break;
        const dStr = toDateStr(curr);
        // Guaranteed same day of the week; verify weekday safety
        if (!isWeekend(dStr)) {
          dates.push(dStr);
        }
      }
    } else if (norm === 'fortnightly') {
      let curr = new Date(start);
      while (true) {
        curr = new Date(curr);
        curr.setDate(curr.getDate() + 14);
        if (curr > cutoff) break;
        const dStr = toDateStr(curr);
        if (!isWeekend(dStr)) {
          dates.push(dStr);
        }
      }
    } else if (norm === 'every-3rd-week') {
      let curr = new Date(start);
      while (true) {
        curr = new Date(curr);
        curr.setDate(curr.getDate() + 21);
        if (curr > cutoff) break;
        const dStr = toDateStr(curr);
        if (!isWeekend(dStr)) {
          dates.push(dStr);
        }
      }
    } else if (norm === 'monthly') {
      let monthStep = 1;
      while (monthStep <= 3) {
        const targetMonthIndex = (m - 1) + monthStep;
        const yr = y + Math.floor(targetMonthIndex / 12);
        const mo = targetMonthIndex % 12;
        const maxDays = new Date(yr, mo + 1, 0).getDate();
        const clampedDay = Math.min(d, maxDays);
        const curr = new Date(yr, mo, clampedDay, 12, 0, 0);
        if (curr > cutoff) break;
        // Strictly ensure weekday: Saturday -> Friday (-1 day); Sunday -> Monday (+1 day)
        const adjusted = ensureWeekdayDate(curr);
        const dStr = toDateStr(adjusted);
        if (!dates.includes(dStr) && !isWeekend(dStr)) {
          dates.push(dStr);
        }
        monthStep++;
      }
    } else if (norm === 'end-of-month') {
      let monthStep = 1;
      while (monthStep <= 3) {
        const targetMonthIndex = (m - 1) + monthStep;
        const yr = y + Math.floor(targetMonthIndex / 12);
        const mo = targetMonthIndex % 12;
        const lastDay = new Date(yr, mo + 1, 0, 12, 0, 0);
        if (lastDay > cutoff) break;
        // Shift Saturday or Sunday to Friday so it remains in that month on a business day
        const adjusted = ensureWeekdayDate(lastDay, true);
        const dStr = toDateStr(adjusted);
        if (!dates.includes(dStr) && !isWeekend(dStr)) {
          dates.push(dStr);
        }
        monthStep++;
      }
    } else if (norm === 'every-2-months') {
      let monthStep = 2;
      while (monthStep <= 3) {
        const targetMonthIndex = (m - 1) + monthStep;
        const yr = y + Math.floor(targetMonthIndex / 12);
        const mo = targetMonthIndex % 12;
        const maxDays = new Date(yr, mo + 1, 0).getDate();
        const clampedDay = Math.min(d, maxDays);
        const curr = new Date(yr, mo, clampedDay, 12, 0, 0);
        if (curr > cutoff) break;
        const adjusted = ensureWeekdayDate(curr);
        const dStr = toDateStr(adjusted);
        if (!dates.includes(dStr) && !isWeekend(dStr)) {
          dates.push(dStr);
        }
        monthStep += 2;
      }
    }

    // Final safety filter: strictly ensure NO weekend date is ever returned, sorted chronologically
    return Array.from(new Set(dates))
      .filter((ds) => !isWeekend(ds))
      .sort();
  } catch {
    return [startDateStr].filter((ds) => !isWeekend(ds));
  }
};

// Alias for backwards compatibility
export const getScheduledDatesForSixMonths = getScheduledDatesForThreeMonths;

/**
 * Generates future scheduled instances for a recurring task across the next 3 months.
 * Skips the first date as that belongs to the primary/base task.
 */
export const generateThreeMonthRecurringTasks = (baseTask: Task): Task[] => {
  if (!isRecurringFrequency(baseTask.frequency)) return [];
  const dates = getScheduledDatesForThreeMonths(baseTask.date, baseTask.frequency);
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

// Alias for backwards compatibility
export const generateSixMonthRecurringTasks = generateThreeMonthRecurringTasks;

/**
 * Automatically calculates the next sequential client number (e.g. BBA0115).
 * Inspects all existing tasks for client numbers of pattern BBAXXXX.
 */
export const getNextClientNumber = (tasks: Task[] = []): string => {
  let maxNum = 0;
  tasks.forEach((t) => {
    if (t.clientNumber) {
      const match = t.clientNumber.trim().match(/^BBA(\d+)$/i);
      if (match) {
        const val = parseInt(match[1], 10);
        if (!isNaN(val) && val > maxNum) {
          maxNum = val;
        }
      }
    }
  });
  const nextNum = maxNum > 0 ? maxNum + 1 : 1;
  return `BBA${String(nextNum).padStart(4, '0')}`;
};

/**
 * Checks if a client name already exists in tasks and returns their client number.
 */
export const findExistingClientNumber = (tasks: Task[] = [], clientName: string): string | null => {
  if (!clientName || !clientName.trim()) return null;
  const target = clientName.trim().toLowerCase();
  const found = tasks.find(
    (t) => t.clientName && t.clientName.trim().toLowerCase() === target && t.clientNumber
  );
  return found?.clientNumber || null;
};

export { formatAustralianPhoneNumber } from './confirmationHelpers';
