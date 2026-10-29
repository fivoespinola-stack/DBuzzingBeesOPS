import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Plus, 
  Clock, 
  MapPin, 
  Users, 
  CheckCircle, 
  Circle, 
  Clock4, 
  Repeat,
  Sparkles,
  Send
} from 'lucide-react';
import { Task, Cleaner } from '../types';
import { formatTime12h, formatCurrency, formatDateLong, formatFrequency, isRecurringFrequency, isWeekend } from '../utils/formatters';
import { getConfirmationStatusMeta } from '../utils/confirmationHelpers';

interface CalendarViewProps {
  tasks: Task[];
  cleaners: Cleaner[];
  onToggleComplete: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onAddNewTask: (defaultDate?: string) => void;
  onSendConfirmation: (task: Task) => void;
  onBulkSendConfirmation?: (tasks: Task[]) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  cleaners,
  onToggleComplete,
  onEditTask,
  onAddNewTask,
  onSendConfirmation,
  onBulkSendConfirmation,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  const getCleanerName = (id: string) => cleaners.find((c) => c.id === id)?.name || id;

  // Month navigation helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateStr(today.toISOString().split('T')[0]);
  };

  // Month Grid Calculation
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  
  // Starting day index (0 for Sunday, 1 for Monday...)
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sun

  // Days from previous month to fill the first row
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const prevMonthDays: { dayNum: number; dateStr: string; isCurrentMonth: boolean }[] = [];
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i;
    const prevDate = new Date(year, month - 1, d);
    prevMonthDays.push({
      dayNum: d,
      dateStr: prevDate.toISOString().split('T')[0],
      isCurrentMonth: false,
    });
  }

  // Days of current month
  const currentMonthDays: { dayNum: number; dateStr: string; isCurrentMonth: boolean }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month, d);
    currentMonthDays.push({
      dayNum: d,
      dateStr: dt.toISOString().split('T')[0],
      isCurrentMonth: true,
    });
  }

  // Days from next month to complete the 35 or 42 grid slots
  const totalDaysSoFar = prevMonthDays.length + currentMonthDays.length;
  const nextMonthDaysCount = totalDaysSoFar > 35 ? 42 - totalDaysSoFar : 35 - totalDaysSoFar;
  const nextMonthDays: { dayNum: number; dateStr: string; isCurrentMonth: boolean }[] = [];
  for (let d = 1; d <= nextMonthDaysCount; d++) {
    const dt = new Date(year, month + 1, d);
    nextMonthDays.push({
      dayNum: d,
      dateStr: dt.toISOString().split('T')[0],
      isCurrentMonth: false,
    });
  }

  const allCalendarDays = [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];

  // Group tasks by date
  const tasksByDate = React.useMemo(() => {
    const map: { [date: string]: Task[] } = {};
    tasks.forEach((t) => {
      if (!map[t.date]) map[t.date] = [];
      map[t.date].push(t);
    });
    return map;
  }, [tasks]);

  // Selected Day's tasks
  const selectedDayTasks = tasksByDate[selectedDateStr] || [];
  const todayStr = new Date().toISOString().split('T')[0];

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6 pb-12">
      
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            Cleaning Calendar
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Interactive schedule view for all upcoming and past cleans.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Month / Week Toggle */}
          <div className="flex items-center p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                viewMode === 'month'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                viewMode === 'week'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              Selected Day List
            </button>
          </div>

          <button
            onClick={() => onAddNewTask(selectedDateStr)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-[#FFB509] hover:bg-[#EAA300] text-neutral-950 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FFB509]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Job</span>
          </button>
        </div>
      </div>

      {/* Main Calendar Viewport Grid (Month Grid + Day Detail Drawer) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Month View (Left 7-8 columns on desktop) */}
        <div className="lg:col-span-7 xl:col-span-8 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-xs space-y-4">
          
          {/* Month Navigation Row */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">
              {monthName}
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleToday}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
              >
                Today
              </button>
              <button
                onClick={handlePrevMonth}
                aria-label="Previous month"
                className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMonth}
                aria-label="Next month"
                className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase tracking-wider py-1">
            <span className="text-amber-700 dark:text-amber-400 font-extrabold" title="Sunday: Special Tasks Only">
              Sun <span className="hidden sm:inline text-[9px] font-semibold text-amber-600/80">(Special)</span>
            </span>
            <span className="text-neutral-400 dark:text-neutral-500">Mon</span>
            <span className="text-neutral-400 dark:text-neutral-500">Tue</span>
            <span className="text-neutral-400 dark:text-neutral-500">Wed</span>
            <span className="text-neutral-400 dark:text-neutral-500">Thu</span>
            <span className="text-neutral-400 dark:text-neutral-500">Fri</span>
            <span className="text-amber-700 dark:text-amber-400 font-extrabold" title="Saturday: Special Tasks Only">
              Sat <span className="hidden sm:inline text-[9px] font-semibold text-amber-600/80">(Special)</span>
            </span>
          </div>

          {/* Month Day Cells */}
          <div className="grid grid-cols-7 gap-1.5">
            {allCalendarDays.map((cell, idx) => {
              const dayTasks = tasksByDate[cell.dateStr] || [];
              const isSelected = cell.dateStr === selectedDateStr;
              const isToday = cell.dateStr === todayStr;
              const hasTasks = dayTasks.length > 0;
              const allDone = hasTasks && dayTasks.every((t) => t.completed);
              const isCellWeekend = isWeekend(cell.dateStr);

              return (
                <button
                  key={`${cell.dateStr}-${idx}`}
                  onClick={() => setSelectedDateStr(cell.dateStr)}
                  className={`min-h-[72px] sm:min-h-[82px] p-1.5 rounded-xl border text-left flex flex-col justify-between transition-all focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    isSelected
                      ? 'border-[#FFB509] bg-amber-50/60 dark:bg-amber-950/40 ring-1 ring-[#FFB509]'
                      : cell.isCurrentMonth
                      ? isCellWeekend
                        ? 'border-neutral-200 dark:border-neutral-800 bg-amber-50/20 dark:bg-amber-950/15 hover:border-amber-300 dark:hover:border-amber-700'
                        : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 hover:border-neutral-300 dark:hover:border-neutral-700'
                      : 'border-transparent bg-neutral-50/50 dark:bg-neutral-900/20 text-neutral-400 dark:text-neutral-600'
                  }`}
                >
                  {/* Top row: day number + indicator */}
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-mono font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                        isToday
                          ? 'bg-[#FFB509] text-neutral-950 font-extrabold'
                          : cell.isCurrentMonth
                          ? isCellWeekend
                            ? 'text-amber-800 dark:text-amber-300 font-extrabold'
                            : 'text-neutral-800 dark:text-neutral-200'
                          : 'text-neutral-400 dark:text-neutral-600'
                      }`}
                    >
                      {cell.dayNum}
                    </span>

                    {hasTasks && (
                      <span
                        className={`text-[10px] font-mono font-bold px-1 rounded-sm ${
                          allDone
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                        }`}
                      >
                        {dayTasks.length}
                      </span>
                    )}
                  </div>

                  {/* Task pill preview inside cell */}
                  <div className="space-y-1 w-full mt-1 overflow-hidden">
                    {dayTasks.slice(0, 2).map((t) => (
                      <div
                        key={t.id}
                        title={t.clientName ? `${t.clientName} (${t.jobType})` : t.jobType}
                        className={`text-[10px] truncate px-1 py-0.5 rounded font-medium ${
                          t.completed
                            ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 line-through'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
                        }`}
                      >
                        {t.clientName || 'Client Unspecified'}
                      </div>
                    ))}
                    {dayTasks.length > 2 && (
                      <div className="text-[9px] font-semibold text-neutral-400 dark:text-neutral-500 px-1">
                        +{dayTasks.length - 2} more
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Day Roster (Right 5-4 columns on desktop) */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                  Selected Day Schedule
                </span>
                {isWeekend(selectedDateStr) && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                    Special Tasks Only
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                {formatDateLong(selectedDateStr)}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {selectedDayTasks.length > 0 && (
                <button
                  onClick={() => {
                    if (onBulkSendConfirmation) onBulkSendConfirmation(selectedDayTasks);
                    else onSendConfirmation(selectedDayTasks[0]);
                  }}
                  className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                  title="Send confirmations to all scheduled bookings on this day"
                >
                  <Send className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Confirm Day ({selectedDayTasks.length})</span>
                </button>
              )}
              <button
                onClick={() => onAddNewTask(selectedDateStr)}
                className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                {isWeekend(selectedDateStr) ? 'Schedule Special' : 'Schedule'}
              </button>
            </div>
          </div>

          {selectedDayTasks.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-dashed border-neutral-200 dark:border-neutral-700">
              <Clock4 className="w-6 h-6 text-neutral-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {isWeekend(selectedDateStr) ? 'No special jobs scheduled on this weekend' : 'No cleaning jobs on this day'}
              </p>
              {isWeekend(selectedDateStr) && (
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs mx-auto">
                  Saturdays & Sundays are reserved for special tasks only. Client recurring tasks are scheduled Monday to Friday.
                </p>
              )}
              <button
                onClick={() => onAddNewTask(selectedDateStr)}
                className="mt-3 px-3 py-1.5 text-xs font-bold rounded-lg bg-[#FFB509] text-neutral-950 hover:bg-[#EAA300] transition-colors"
              >
                {isWeekend(selectedDateStr) ? '+ Add Special Job for this Date' : '+ Add Job for this Date'}
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
              {selectedDayTasks.map((task) => {
                const assignedCleaners = task.assignedCleanerIds.map(getCleanerName);
                return (
                  <div
                    key={task.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      task.completed
                        ? 'bg-neutral-50 dark:bg-neutral-800/30 border-neutral-200 dark:border-neutral-800 opacity-80'
                        : 'bg-white dark:bg-neutral-800/80 border-neutral-200 dark:border-neutral-700 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <button
                          onClick={() => onToggleComplete(task.id)}
                          className="mt-0.5 focus:outline-none"
                        >
                          {task.completed ? (
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Circle className="w-4 h-4 text-neutral-400 hover:text-amber-500" />
                          )}
                        </button>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                              {task.clientName || 'Client Unspecified'}
                            </h4>
                            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                              · {task.jobType}
                            </span>
                            {isRecurringFrequency(task.frequency) && (
                              <span
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                title={`Recurring task (${formatFrequency(task.frequency)})`}
                              >
                                <Repeat className="w-2.5 h-2.5" />
                                <span>{formatFrequency(task.frequency)}</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 font-mono-numbers mt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>
                              {formatTime12h(task.startTime)} – {formatTime12h(task.endTime)} ({task.fixHour}h)
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                          {task.invoiceNumber}
                        </span>
                        {(() => {
                          const meta = getConfirmationStatusMeta(task.confirmationStatus);
                          return (
                            <button
                              onClick={() => onSendConfirmation(task)}
                              title="Click to Send Confirmation or update status"
                              className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold border transition-transform hover:scale-105 ${meta.bgClass} ${meta.textClass} ${meta.borderClass}`}
                            >
                              <span className={`w-1 h-1 rounded-full ${meta.dotClass}`} />
                              <span>{meta.label}</span>
                            </button>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-300 flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{task.address}</span>
                    </div>

                    <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-700 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400">
                        <Users className="w-3 h-3 text-[#FFB509]" />
                        <span className="truncate max-w-[140px]">
                          {assignedCleaners.length > 0 ? assignedCleaners.join(', ') : 'Unassigned'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onSendConfirmation(task)}
                          className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-md transition-colors"
                          title="Send Confirmation via WhatsApp, Messenger, SMS"
                        >
                          <Send className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Confirm</span>
                        </button>
                        <span className="font-mono-numbers font-bold text-neutral-900 dark:text-white">
                          {task.payType === 'Fixed Price'
                            ? formatCurrency(task.rate)
                            : formatCurrency(task.rate * task.fixHour)}
                        </span>
                        <button
                          onClick={() => onEditTask(task)}
                          className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
