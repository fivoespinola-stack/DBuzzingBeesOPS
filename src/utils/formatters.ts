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
    
    text += `[${index + 1}] ${timeRange} (${task.fixHour} hrs)\n`;
    text += `Job: ${task.jobType}\n`;
    text += `Client: ${task.clientName || 'N/A'}\n`;
    text += `Contact: ${task.clientPhone || 'N/A'}\n`;
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

  let text = `Job Schedule\n`;
  text += `Time: ${timeRange}\n`;
  text += `Duration: ${task.fixHour} hrs\n`;
  text += `Job Type: ${task.jobType}\n`;
  text += `Client: ${task.clientName || 'N/A'}\n`;
  text += `Contact: ${task.clientPhone || 'N/A'}\n`;
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
    
    text += `• Time: ${timeRange} (${task.fixHour} hrs)\n`;
    text += `  Job Type: ${task.jobType}\n`;
    text += `  Client: ${task.clientName || 'N/A'}\n`;
    text += `  Contact: ${task.clientPhone || 'N/A'}\n`;
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


