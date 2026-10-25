import React, { useState, useMemo } from 'react';
import { 
  CheckCircle, 
  Circle, 
  Clock, 
  MapPin, 
  Calendar as CalendarIcon, 
  Users, 
  Plus, 
  Copy, 
  Check, 
  Share2, 
  MessageSquare, 
  X,
  Phone,
  Mail,
  User,
  FileSpreadsheet,
  ChevronRight,
  TrendingUp,
  ArrowRight,
  Repeat
} from 'lucide-react';
import { Task, Cleaner } from '../types';
import { BeeLogo } from './BeeLogo';
import { 
  formatDateLong, 
  formatDate,
  formatTime12h, 
  getOffsetDate,
  getWeekStart,
  getWeekLabel,
  generateScheduleDispatchText,
  generateWeeklyDispatchText,
  generateSingleTaskDispatchText,
  formatFrequency,
  isRecurringFrequency
} from '../utils/formatters';

interface DashboardViewProps {
  tasks: Task[];
  cleaners: Cleaner[];
  onToggleComplete: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onAddNewTask: (defaultDate?: string) => void;
  onOpenImportExport: () => void;
  onNavigateToTab: (tab: string) => void;
}

interface DispatchModalState {
  isOpen: boolean;
  title: string;
  subtitle: string;
  defaultText: string;
  weekTasks: Task[];
  isWeekly: boolean;
  weekLabel?: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  tasks,
  cleaners,
  onToggleComplete,
  onEditTask,
  onAddNewTask,
  onOpenImportExport,
  onNavigateToTab,
}) => {
  const todayStr = getOffsetDate(0);

  // Today's jobs sorted by start time
  const todayJobs = useMemo(() => {
    return tasks
      .filter((t) => t.date === todayStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [tasks, todayStr]);

  const todayCompletedCount = todayJobs.filter((t) => t.completed).length;
  const todayTotalHours = todayJobs.reduce((acc, t) => acc + t.fixHour, 0);

  // Compute Weekly Schedules (Monday to Sunday)
  const currentWeekMonday = useMemo(() => getWeekStart(new Date()), []);
  const nextWeekMonday = useMemo(() => {
    const d = new Date(currentWeekMonday);
    d.setDate(d.getDate() + 7);
    return d;
  }, [currentWeekMonday]);

  // Helper to get array of YYYY-MM-DD for a Monday-to-Sunday week
  const getWeekDates = (mondayDate: Date): string[] => {
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const dt = new Date(mondayDate);
      dt.setDate(dt.getDate() + i);
      dates.push(dt.toISOString().split('T')[0]);
    }
    return dates;
  };

  const week1Dates = useMemo(() => getWeekDates(currentWeekMonday), [currentWeekMonday]);
  const week2Dates = useMemo(() => getWeekDates(nextWeekMonday), [nextWeekMonday]);

  const week1Label = useMemo(() => getWeekLabel(currentWeekMonday), [currentWeekMonday]);
  const week2Label = useMemo(() => getWeekLabel(nextWeekMonday), [nextWeekMonday]);

  // Tasks for Week 1 (Current Week: Mon-Sun)
  const week1Tasks = useMemo(() => {
    return tasks
      .filter((t) => week1Dates.includes(t.date))
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  }, [tasks, week1Dates]);

  // Tasks for Week 2 (Next Week: Mon-Sun)
  const week2Tasks = useMemo(() => {
    return tasks
      .filter((t) => week2Dates.includes(t.date))
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  }, [tasks, week2Dates]);

  // Copy feedback toast state
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Dispatch Modal state
  const [dispatchModal, setDispatchModal] = useState<DispatchModalState>({
    isOpen: false,
    title: '',
    subtitle: '',
    defaultText: '',
    weekTasks: [],
    isWeekly: false,
  });

  const [selectedCleanerForDispatch, setSelectedCleanerForDispatch] = useState<string>('all');
  const [customDispatchNotes, setCustomDispatchNotes] = useState<string>('');

  const getCleanerName = (id: string) => cleaners.find((c) => c.id === id)?.name || id;

  // Trigger copy to clipboard with toast
  const triggerCopy = async (text: string, label: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopyFeedback(`✓ ${label} copied to clipboard!`);
      setTimeout(() => setCopyFeedback(null), 3500);
    } catch (err) {
      console.error('Failed to copy', err);
      setCopyFeedback('Failed to copy. Please try again.');
      setTimeout(() => setCopyFeedback(null), 3500);
    }
  };

  // Quick 1-click copy for Today
  const handleQuickCopyToday = () => {
    const text = generateScheduleDispatchText(todayJobs, cleaners, todayStr);
    triggerCopy(text, "Today's Schedule");
  };

  // Quick 1-click copy for Week 1
  const handleQuickCopyWeek1 = () => {
    const text = generateWeeklyDispatchText(week1Tasks, cleaners, week1Label);
    triggerCopy(text, `Week 1 Schedule (${week1Label})`);
  };

  // Quick 1-click copy for Week 2
  const handleQuickCopyWeek2 = () => {
    const text = generateWeeklyDispatchText(week2Tasks, cleaners, week2Label);
    triggerCopy(text, `Week 2 Schedule (${week2Label})`);
  };

  // Copy individual task
  const handleCopySingleTask = (task: Task) => {
    const text = generateSingleTaskDispatchText(task, cleaners);
    triggerCopy(text, `Job ${task.jobType}`);
  };

  // Open modal for Today
  const openTodayDispatchModal = () => {
    const text = generateScheduleDispatchText(todayJobs, cleaners, todayStr);
    setSelectedCleanerForDispatch('all');
    setCustomDispatchNotes('');
    setDispatchModal({
      isOpen: true,
      title: "Send Today's Schedule to Cleaners",
      subtitle: `Daily Dispatch · ${formatDateLong(todayStr)}`,
      defaultText: text,
      weekTasks: todayJobs,
      isWeekly: false,
    });
  };

  // Open modal for a Week
  const openWeeklyDispatchModal = (weekLabel: string, weekTasksList: Task[], weekNum: number) => {
    const text = generateWeeklyDispatchText(weekTasksList, cleaners, weekLabel);
    setSelectedCleanerForDispatch('all');
    setCustomDispatchNotes('');
    setDispatchModal({
      isOpen: true,
      title: `Send Week ${weekNum} Advance Schedule`,
      subtitle: `Monday to Sunday Roster · ${weekLabel}`,
      defaultText: text,
      weekTasks: weekTasksList,
      isWeekly: true,
      weekLabel,
    });
  };

  // Compute text inside modal based on selected cleaner
  const modalPreviewText = useMemo(() => {
    if (!dispatchModal.isOpen) return '';
    let base = '';
    if (dispatchModal.isWeekly && dispatchModal.weekLabel) {
      base = generateWeeklyDispatchText(
        dispatchModal.weekTasks,
        cleaners,
        dispatchModal.weekLabel,
        selectedCleanerForDispatch === 'all' ? undefined : selectedCleanerForDispatch
      );
    } else {
      base = generateScheduleDispatchText(
        dispatchModal.weekTasks,
        cleaners,
        todayStr,
        selectedCleanerForDispatch === 'all' ? undefined : selectedCleanerForDispatch
      );
    }

    if (!customDispatchNotes.trim()) return base;
    return `${base}\n\n📌 Note from Dispatch: ${customDispatchNotes.trim()}`;
  }, [dispatchModal, cleaners, todayStr, selectedCleanerForDispatch, customDispatchNotes]);

  // Helper renderer for a single job row displaying requested fields:
  // 1. Time, Job Type & Duration
  // 2. Client Name & Contact
  // 3. Service Address & Notes
  // 4. Assigned Cleaners
  const renderJobRow = (task: Task, index: number, showDateBadge?: boolean) => {
    const assignedCleaners = task.assignedCleanerIds.map(getCleanerName);

    return (
      <div
        key={task.id}
        className={`p-4 md:px-5 md:py-3.5 transition-colors ${
          task.completed
            ? 'bg-neutral-50/50 dark:bg-neutral-900/40 opacity-75'
            : 'hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40'
        }`}
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start md:items-center">
          
          {/* Status Checkbox & Sequence # */}
          <div className="md:col-span-1 flex items-center gap-2 md:justify-center">
            <span className="font-mono text-xs font-bold text-neutral-400 w-4">
              #{index + 1}
            </span>
            <button
              onClick={() => onToggleComplete(task.id)}
              className="focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-md"
              title={task.completed ? 'Mark as Pending' : 'Mark as Completed'}
            >
              {task.completed ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 fill-emerald-100 dark:fill-emerald-950/80" />
              ) : (
                <Circle className="w-5 h-5 text-neutral-400 hover:text-amber-500 transition-colors" />
              )}
            </button>
          </div>

          {/* 1. Time, Job Type, Time Duration */}
          <div className="md:col-span-3">
            {showDateBadge && (
              <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-0.5">
                {formatDate(task.date)}
              </span>
            )}
            <div className="text-sm font-bold text-neutral-900 dark:text-white truncate flex items-center gap-1.5">
              <span className="truncate">{task.jobType}</span>
              {isRecurringFrequency(task.frequency) && (
                <span
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 shrink-0"
                  title={`Recurring job (${formatFrequency(task.frequency)})`}
                >
                  <Repeat className="w-2.5 h-2.5" />
                  <span>{formatFrequency(task.frequency)}</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400 font-mono-numbers mt-0.5">
              <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="font-semibold text-neutral-900 dark:text-neutral-200">
                {formatTime12h(task.startTime)} – {formatTime12h(task.endTime)}
              </span>
              <span>·</span>
              <span className="font-bold text-neutral-700 dark:text-neutral-300">
                {task.fixHour}h
              </span>
            </div>
          </div>

          {/* 2. Client Name & Contact */}
          <div className="md:col-span-2 text-xs">
            <div className="flex items-center gap-1.5 text-neutral-900 dark:text-white font-semibold">
              <User className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="truncate">{task.clientName || 'Private Client'}</span>
            </div>
            {task.clientPhone ? (
              <a
                href={`tel:${task.clientPhone}`}
                className="flex items-center gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-400 hover:text-amber-600 dark:hover:text-amber-400 font-mono mt-0.5"
                title="Call client"
              >
                <Phone className="w-3 h-3 text-neutral-400 shrink-0" />
                <span className="truncate">{task.clientPhone}</span>
              </a>
            ) : null}
            {task.clientEmail ? (
              <a
                href={`mailto:${task.clientEmail}`}
                className="flex items-center gap-1.5 text-[11px] text-blue-600 dark:text-blue-400 hover:underline mt-0.5 truncate"
                title={`Email ${task.clientEmail}`}
              >
                <Mail className="w-3 h-3 text-neutral-400 shrink-0" />
                <span className="truncate">{task.clientEmail}</span>
              </a>
            ) : null}
            {!task.clientPhone && !task.clientEmail && (
              <div className="text-[10px] text-neutral-400 italic mt-0.5">
                No contact recorded
              </div>
            )}
          </div>

          {/* 3. Service Address & Notes */}
          <div className="md:col-span-3 text-xs">
            <div className="flex items-start gap-1.5 text-neutral-800 dark:text-neutral-200">
              <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
              <span className="font-medium truncate">{task.address}</span>
            </div>
            {task.remarks ? (
              <div className="mt-1 text-[11px] text-amber-900 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/40 px-2.5 py-1 rounded-md border border-amber-200/60 dark:border-amber-900/60 italic truncate">
                Notes: {task.remarks}
              </div>
            ) : (
              <div className="mt-0.5 text-[11px] text-neutral-400 italic">
                No special notes
              </div>
            )}
          </div>

          {/* 4. Assigned Cleaners */}
          <div className="md:col-span-2 text-xs">
            <div className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
              <Users className="w-3.5 h-3.5 text-[#FFB509] shrink-0" />
              <span className="font-semibold truncate">
                {assignedCleaners.length > 0 ? assignedCleaners.join(', ') : 'Unassigned'}
              </span>
            </div>
            <div className="text-[10px] text-neutral-400 mt-0.5">
              {assignedCleaners.length} {assignedCleaners.length === 1 ? 'Cleaner' : 'Cleaners'}
            </div>
          </div>

          {/* Actions: Copy Run button & Edit */}
          <div className="md:col-span-1 flex items-center justify-end gap-1.5 pt-2 md:pt-0 border-t md:border-t-0 border-neutral-100 dark:border-neutral-800">
            <button
              onClick={() => handleCopySingleTask(task)}
              title="Copy this job schedule for cleaner"
              className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-amber-50 hover:border-amber-400 text-neutral-600 dark:text-neutral-300 hover:text-amber-700 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onEditTask(task)}
              className="px-2 py-1 text-xs font-semibold rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200"
            >
              Edit
            </button>
          </div>

        </div>
      </div>
    );
  };

  // Helper to render a unified Weekly Card (Monday to Sunday)
  const renderWeeklyScheduleCard = (
    title: string,
    weekNum: number,
    weekLabel: string,
    weekTasksList: Task[],
    onCopyWeek: () => void,
    onOpenDispatch: () => void
  ) => {
    const totalWeekHours = weekTasksList.reduce((acc, t) => acc + t.fixHour, 0);
    const completedWeekCount = weekTasksList.filter((t) => t.completed).length;

    // Group tasks by date within the week
    const tasksGroupedByDate: { [date: string]: Task[] } = {};
    weekTasksList.forEach((t) => {
      if (!tasksGroupedByDate[t.date]) tasksGroupedByDate[t.date] = [];
      tasksGroupedByDate[t.date].push(t);
    });

    const datesInThisWeek = Object.keys(tasksGroupedByDate).sort();

    return (
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs">
        
        {/* Card Header (Same layout as Today's Cleaning Runs) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-neutral-900 text-white dark:bg-neutral-900/90 p-4 sm:p-5 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFB509] flex items-center justify-center text-neutral-950 font-black shadow-xs shrink-0">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {title}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/20 text-[#FFB509] font-mono font-bold">
                  {weekTasksList.length} {weekTasksList.length === 1 ? 'Job' : 'Jobs'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Monday to Sunday ({weekLabel}) · Total {totalWeekHours.toFixed(1)} hrs · {completedWeekCount}/{weekTasksList.length} done
              </p>
            </div>
          </div>

          {/* Action buttons: Copy Week Schedule & Dispatch Options */}
          <div className="flex items-center gap-2 flex-wrap">
            {weekTasksList.length > 0 && (
              <>
                <button
                  onClick={onCopyWeek}
                  title={`Copy advance schedule for ${weekLabel} to send to cleaners`}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-[#FFB509] hover:bg-[#EAA300] text-neutral-950 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Week Schedule</span>
                </button>

                <button
                  onClick={onOpenDispatch}
                  title="Filter by cleaner or send via WhatsApp / SMS"
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors focus:outline-none"
                >
                  <Share2 className="w-3.5 h-3.5 text-[#FFB509]" />
                  <span>Send to Cleaners</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content Table / Roster */}
        {weekTasksList.length === 0 ? (
          <div className="p-8 text-center bg-neutral-50/50 dark:bg-neutral-900/40">
            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              No cleaning runs scheduled for this week ({weekLabel})
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Add upcoming tasks to populate the advance cleaner roster.
            </p>
            <button
              onClick={() => onAddNewTask()}
              className="mt-3 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-[#FFB509] text-neutral-950"
            >
              + Schedule Run in this Week
            </button>
          </div>
        ) : (
          <div>
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-3 bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              <div className="col-span-1 text-center">Status</div>
              <div className="col-span-3">Time, Job & Duration</div>
              <div className="col-span-2">Client & Contact</div>
              <div className="col-span-3">Service Address & Notes</div>
              <div className="col-span-2">Assigned Cleaners</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            {/* List Grouped by Day (Monday to Sunday) */}
            <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {datesInThisWeek.map((dateStr) => {
                const dayRuns = tasksGroupedByDate[dateStr];
                const dateObj = new Date(dateStr + 'T00:00:00');
                const dayName = dateObj.toLocaleDateString('en-AU', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <div key={dateStr} className="bg-white dark:bg-neutral-900">
                    {/* Day Banner */}
                    <div className="px-5 py-2 bg-neutral-100/70 dark:bg-neutral-800/40 border-b border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-neutral-900 dark:text-white uppercase tracking-wider text-[11px]">
                          {dayName}
                        </span>
                        <span className="text-neutral-500 text-[11px]">
                          · {dayRuns.length} {dayRuns.length === 1 ? 'run' : 'runs'}
                        </span>
                      </div>
                      <button
                        onClick={() => onAddNewTask(dateStr)}
                        className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                      >
                        + Add job on this day
                      </button>
                    </div>

                    {/* Jobs on this date */}
                    <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {dayRuns.map((task, idx) => renderJobRow(task, idx, false))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Summary */}
            <div className="px-5 py-3 bg-neutral-50/70 dark:bg-neutral-800/40 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-neutral-600 dark:text-neutral-400">
                Click <strong>"Copy Week Schedule"</strong> to copy the entire week's schedule to send to your cleaners.
              </span>
              <button
                onClick={onCopyWeek}
                className="font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Full Week ({weekTasksList.length} Runs)</span>
              </button>
            </div>
          </div>
        )}

      </div>
    );
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            Daily Operations & Schedule
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Operational dashboard with today's cleaning runs and advance weekly schedules for cleaners.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onAddNewTask(todayStr)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-[#FFB509] hover:bg-[#EAA300] text-neutral-950 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FFB509]"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
          <button
            onClick={onOpenImportExport}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#FFB509]" />
            <span className="hidden sm:inline">Import/Export</span>
          </button>
        </div>
      </div>

      {/* Copy Toast Notification */}
      {copyFeedback && (
        <div className="p-3 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs flex items-center justify-between shadow-md transition-all animate-bounce">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-neutral-950 stroke-[3]" />
            <span>{copyFeedback} Ready to send or paste to cleaners!</span>
          </div>
          <button
            onClick={() => setCopyFeedback(null)}
            className="text-neutral-900 hover:text-black font-extrabold text-sm ml-4"
          >
            &times;
          </button>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Jobs */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            <span>Today's Jobs</span>
            <CalendarIcon className="w-4 h-4 text-[#FFB509]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-neutral-900 dark:text-white font-mono-numbers">
              {todayJobs.length}
            </span>
            <span className="text-xs text-neutral-500">
              ({todayCompletedCount} done)
            </span>
          </div>
          <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            Duration: <strong className="text-neutral-900 dark:text-white font-mono-numbers">{todayTotalHours.toFixed(1)} hrs</strong>
          </div>
        </div>

        {/* Week 1 Total Jobs */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            <span>This Week (Mon-Sun)</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-neutral-900 dark:text-white font-mono-numbers">
              {week1Tasks.length}
            </span>
            <span className="text-xs text-neutral-500">scheduled</span>
          </div>
          <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            {week1Label}
          </div>
        </div>

        {/* Week 2 Total Jobs */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            <span>Next Week (Mon-Sun)</span>
            <CalendarIcon className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-neutral-900 dark:text-white font-mono-numbers">
              {week2Tasks.length}
            </span>
            <span className="text-xs text-neutral-500">advance</span>
          </div>
          <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            {week2Label}
          </div>
        </div>

        {/* Active Cleaners */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            <span>Active Cleaners</span>
            <Users className="w-4 h-4 text-[#FFB509]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-neutral-900 dark:text-white font-mono-numbers">
              {cleaners.filter((c) => c.status === 'active').length}
            </span>
            <span className="text-xs text-neutral-500">on roster</span>
          </div>
          <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            <button
              onClick={() => onNavigateToTab('cleaners')}
              className="text-amber-600 dark:text-amber-400 hover:underline font-semibold"
            >
              View Roster &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: TODAY'S CLEANING RUNS (ONLY: TIME, JOB TYPE, TIME DURATION, ADDRESS, NOTES, CLEANERS) */}
      <section className="space-y-4">
        
        {/* Unified Container Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-neutral-900 text-white dark:bg-neutral-900/90 p-4 sm:p-5 rounded-2xl border border-neutral-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFB509] flex items-center justify-center shadow-xs shrink-0 p-1">
              <BeeLogo className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Today's Cleaning Runs
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/20 text-[#FFB509] font-mono font-bold">
                  {todayJobs.length} {todayJobs.length === 1 ? 'Job' : 'Jobs'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {formatDateLong(todayStr)} · Total {todayTotalHours.toFixed(1)} hrs duration · {todayCompletedCount}/{todayJobs.length} completed
              </p>
            </div>
          </div>

          {/* Action Buttons: 1-Click Copy Schedule & Dispatch Options */}
          <div className="flex items-center gap-2 flex-wrap">
            {todayJobs.length > 0 && (
              <>
                <button
                  onClick={handleQuickCopyToday}
                  title="Copy formatted schedule to clipboard to send to cleaners"
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-[#FFB509] hover:bg-[#EAA300] text-neutral-950 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Schedule</span>
                </button>

                <button
                  onClick={openTodayDispatchModal}
                  title="Filter by cleaner or send via WhatsApp / SMS"
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors focus:outline-none"
                >
                  <Share2 className="w-3.5 h-3.5 text-[#FFB509]" />
                  <span>Send to Cleaners</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Unified Cleaning Runs List */}
        {todayJobs.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900/40">
            <CalendarIcon className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              No cleaning jobs scheduled for today
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Schedule a job for today or review the upcoming weekly advance schedules below.
            </p>
            <button
              onClick={() => onAddNewTask(todayStr)}
              className="mt-4 px-4 py-2 text-xs font-bold rounded-xl bg-[#FFB509] hover:bg-[#EAA300] text-neutral-950 transition-colors shadow-sm"
            >
              + Schedule Job for Today
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs">
            
            {/* Table Header: Only Time & Job Type, Time Duration, Client & Contact, Address & Notes, Assigned Cleaners */}
            <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-3 bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              <div className="col-span-1 text-center">Status</div>
              <div className="col-span-3">Time, Job & Duration</div>
              <div className="col-span-2">Client & Contact</div>
              <div className="col-span-3">Service Address & Notes</div>
              <div className="col-span-2">Assigned Cleaners</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            {/* Rows showing ONLY the requested fields */}
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {todayJobs.map((task, idx) => renderJobRow(task, idx, false))}
            </div>

            {/* Bottom Actions Bar */}
            <div className="px-5 py-3 bg-neutral-50/70 dark:bg-neutral-800/40 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-neutral-600 dark:text-neutral-400">
                Click <strong>"Copy Schedule"</strong> to quickly paste into SMS or WhatsApp, or use the copy icon on any job row.
              </span>
              <button
                onClick={handleQuickCopyToday}
                className="font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Today's Full Schedule ({todayJobs.length} Runs)</span>
              </button>
            </div>

          </div>
        )}
      </section>

      {/* SECTION 2: NEXT TWO WEEKS SCHEDULE — PER WEEK (MON TO SUN) IN ONE CARD */}
      <section className="space-y-6 pt-4 border-t border-neutral-200 dark:border-neutral-800">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
            Next Two Weeks Advance Schedule (Monday to Sunday)
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Grouped per week (Monday to Sunday) in unified rosters to easily copy and dispatch advance schedules to cleaners.
          </p>
        </div>

        {/* WEEK 1 CARD: MONDAY TO SUNDAY */}
        {renderWeeklyScheduleCard(
          "Week 1 Schedule (Current Week)",
          1,
          week1Label,
          week1Tasks,
          handleQuickCopyWeek1,
          () => openWeeklyDispatchModal(week1Label, week1Tasks, 1)
        )}

        {/* WEEK 2 CARD: MONDAY TO SUNDAY */}
        {renderWeeklyScheduleCard(
          "Week 2 Advance Schedule (Next Week)",
          2,
          week2Label,
          week2Tasks,
          handleQuickCopyWeek2,
          () => openWeeklyDispatchModal(week2Label, week2Tasks, 2)
        )}
      </section>

      {/* DISPATCH / SEND TO CLEANERS MODAL */}
      {dispatchModal.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-xl w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden space-y-4">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-800/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#FFB509] flex items-center justify-center text-neutral-950 font-bold">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                    {dispatchModal.title}
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {dispatchModal.subtitle}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setDispatchModal({ ...dispatchModal, isOpen: false })}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Controls */}
            <div className="px-6 space-y-4">
              
              {/* Recipient Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Select Recipient (All Cleaners or Individual Cleaner):
                </label>
                <select
                  value={selectedCleanerForDispatch}
                  onChange={(e) => setSelectedCleanerForDispatch(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFB509] text-neutral-900 dark:text-white"
                >
                  <option value="all">All Cleaners (Full Team Roster)</option>
                  {cleaners.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Extra Dispatch Note */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Additional Note / Special Instructions (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Please bring extra mop heads and confirm arrival 15 mins before."
                  value={customDispatchNotes}
                  onChange={(e) => setCustomDispatchNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFB509] text-neutral-900 dark:text-white"
                />
              </div>

              {/* Text Preview Box */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Message Preview to Send:
                </label>
                <div className="relative">
                  <textarea
                    readOnly
                    rows={8}
                    value={modalPreviewText}
                    className="w-full p-3 font-mono text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-neutral-200 select-all focus:outline-none"
                  />
                </div>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {/* WhatsApp Link */}
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(modalPreviewText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>

                {/* SMS Link */}
                <a
                  href={`sms:?body=${encodeURIComponent(modalPreviewText)}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white dark:bg-neutral-700 dark:hover:bg-neutral-600 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>SMS</span>
                </a>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDispatchModal({ ...dispatchModal, isOpen: false })}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    triggerCopy(modalPreviewText, 'Schedule');
                    setDispatchModal({ ...dispatchModal, isOpen: false });
                  }}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-xl bg-[#FFB509] hover:bg-[#EAA300] text-neutral-950 transition-colors shadow-sm"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Schedule to Clipboard</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
