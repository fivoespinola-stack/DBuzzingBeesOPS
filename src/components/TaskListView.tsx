import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  CheckCircle, 
  Circle, 
  Edit3, 
  Trash2, 
  Copy, 
  Filter, 
  MapPin, 
  Clock, 
  Calendar, 
  Download,
  AlertTriangle,
  X
} from 'lucide-react';
import { Task, Cleaner } from '../types';
import { formatCurrency, formatDate, formatTime12h, formatFrequency } from '../utils/formatters';

interface TaskListViewProps {
  tasks: Task[];
  cleaners: Cleaner[];
  onToggleComplete: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onDuplicateTask: (task: Task) => void;
  onAddNewTask: () => void;
  onExportTasks: (tasksToExport: Task[]) => void;
}

export const TaskListView: React.FC<TaskListViewProps> = ({
  tasks,
  cleaners,
  onToggleComplete,
  onEditTask,
  onDeleteTask,
  onDuplicateTask,
  onAddNewTask,
  onExportTasks,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [cleanerFilter, setCleanerFilter] = useState<string>('all');
  const [frequencyFilter, setFrequencyFilter] = useState<string>('all');
  const [jobTypeFilter, setJobTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'upcoming' | 'past'>('all');

  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const getCleanerName = (id: string) => cleaners.find((c) => c.id === id)?.name || id;

  const todayStr = new Date().toISOString().split('T')[0];

  // Distinct Job Types present in tasks
  const distinctJobTypes = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => set.add(t.jobType));
    return Array.from(set).sort();
  }, [tasks]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Search text filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchAddress = t.address?.toLowerCase().includes(q);
        const matchInvoice = t.invoiceNumber?.toLowerCase().includes(q);
        const matchJobType = t.jobType?.toLowerCase().includes(q);
        const matchRemarks = t.remarks?.toLowerCase().includes(q);
        const matchClient = t.clientName?.toLowerCase().includes(q);
        if (!matchAddress && !matchInvoice && !matchJobType && !matchRemarks && !matchClient) {
          return false;
        }
      }

      // Status
      if (statusFilter === 'pending' && t.completed) return false;
      if (statusFilter === 'completed' && !t.completed) return false;

      // Cleaner
      if (cleanerFilter !== 'all') {
        if (!t.assignedCleanerIds.includes(cleanerFilter)) return false;
      }

      // Frequency
      if (frequencyFilter !== 'all' && t.frequency !== frequencyFilter) {
        return false;
      }

      // Job Type
      if (jobTypeFilter !== 'all' && t.jobType !== jobTypeFilter) {
        return false;
      }

      // Date
      if (dateFilter === 'today' && t.date !== todayStr) return false;
      if (dateFilter === 'upcoming' && t.date < todayStr) return false;
      if (dateFilter === 'past' && t.date >= todayStr) return false;

      return true;
    }).sort((a, b) => b.date.localeCompare(a.date) || a.startTime.localeCompare(b.startTime));
  }, [tasks, searchQuery, statusFilter, cleanerFilter, frequencyFilter, jobTypeFilter, dateFilter, todayStr]);

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCleanerFilter('all');
    setFrequencyFilter('all');
    setJobTypeFilter('all');
    setDateFilter('all');
  };

  const hasActiveFilters =
    searchQuery ||
    statusFilter !== 'all' ||
    cleanerFilter !== 'all' ||
    frequencyFilter !== 'all' ||
    jobTypeFilter !== 'all' ||
    dateFilter !== 'all';

  return (
    <div className="space-y-6 pb-12">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            Cleaning Task Registry
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Manage all residential, commercial, and bond cleaning jobs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onExportTasks(filteredTasks)}
            title="Export currently filtered tasks to Excel (.xlsx)"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 transition-colors"
          >
            <Download className="w-4 h-4 text-neutral-500" />
            <span>Export ({filteredTasks.length})</span>
          </button>

          <button
            onClick={onAddNewTask}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[#FFB509] hover:bg-[#EAA300] text-neutral-950 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FFB509]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-3">
        {/* Top search & status tabs */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Search by address, invoice #, client, job type, remarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFB509] text-neutral-900 dark:text-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Segmented Buttons */}
          <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl shrink-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              All ({tasks.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                statusFilter === 'pending'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              Pending ({tasks.filter((t) => !t.completed).length})
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                statusFilter === 'completed'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              Completed ({tasks.filter((t) => t.completed).length})
            </button>
          </div>
        </div>

        {/* Secondary Filters Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
          {/* Cleaner Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Cleaner</label>
            <select
              value={cleanerFilter}
              onChange={(e) => setCleanerFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#FFB509]"
            >
              <option value="all">All Cleaners</option>
              {cleaners.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Job Type Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Job Type</label>
            <select
              value={jobTypeFilter}
              onChange={(e) => setJobTypeFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#FFB509]"
            >
              <option value="all">All Job Types</option>
              {distinctJobTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Frequency Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Frequency</label>
            <select
              value={frequencyFilter}
              onChange={(e) => setFrequencyFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#FFB509]"
            >
              <option value="all">All Frequencies</option>
              <option value="one-off">One-off</option>
              <option value="twice-a-week">Twice a week</option>
              <option value="weekly">Weekly</option>
              <option value="fortnightly">Fortnightly</option>
              <option value="every-3rd-week">Every 3rd week</option>
              <option value="monthly">Monthly</option>
              <option value="end-of-month">End of month</option>
              <option value="every-2-months">Every 2 months</option>
              <option value="flexible">Flexible</option>
              <option value="others">Others</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Date Window</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#FFB509]"
            >
              <option value="all">All Dates</option>
              <option value="today">Today Only</option>
              <option value="upcoming">Upcoming (Today & Future)</option>
              <option value="past">Past Jobs</option>
            </select>
          </div>
        </div>

        {/* Clear Filters Indicator */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between text-xs pt-1 border-t border-neutral-100 dark:border-neutral-800">
            <span className="text-neutral-500">
              Showing {filteredTasks.length} of {tasks.length} tasks
            </span>
            <button
              onClick={resetFilters}
              className="text-amber-600 dark:text-amber-400 font-semibold hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Tasks Table / Cards */}
      {filteredTasks.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <Filter className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
            No cleaning tasks matched your filters
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Try resetting your search query or schedule a new task.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200"
              >
                Reset Filters
              </button>
            )}
            <button
              onClick={onAddNewTask}
              className="px-4 py-1.5 text-xs font-bold rounded-xl bg-[#FFB509] text-neutral-950"
            >
              Create New Task
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                <tr>
                  <th className="py-3 px-4 w-10">Done</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Job Type & Address</th>
                  <th className="py-3 px-4 text-right">Fix Hrs</th>
                  <th className="py-3 px-4 text-right">Client Rate</th>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Cleaners</th>
                  <th className="py-3 px-4">Freq</th>
                  <th className="py-3 px-4 text-right w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filteredTasks.map((task) => {
                  const cleanerNames = task.assignedCleanerIds.map(getCleanerName).join(', ');
                  return (
                    <tr
                      key={task.id}
                      className={`hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors ${
                        task.completed ? 'opacity-70 bg-neutral-50/40 dark:bg-neutral-900/40' : ''
                      }`}
                    >
                      {/* Mark Complete Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => onToggleComplete(task.id)}
                          className="focus:outline-none"
                          title={task.completed ? 'Mark as Pending' : 'Mark as Completed'}
                        >
                          {task.completed ? (
                            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Circle className="w-4 h-4 text-neutral-400 hover:text-amber-500" />
                          )}
                        </button>
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-neutral-900 dark:text-white">
                          {formatDate(task.date)}
                        </div>
                        <div className="font-mono-numbers text-[11px] text-neutral-500 dark:text-neutral-400">
                          {formatTime12h(task.startTime)} – {formatTime12h(task.endTime)}
                        </div>
                      </td>

                      {/* Job Type & Address */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                          <span>{task.jobType}</span>
                        </div>
                        <div className="text-neutral-600 dark:text-neutral-300 truncate" title={task.address}>
                          {task.address}
                        </div>
                        {task.remarks && (
                          <div className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate" title={task.remarks}>
                            {task.remarks}
                          </div>
                        )}
                      </td>

                      {/* Fix Hours */}
                      <td className="py-3.5 px-4 text-right font-mono-numbers font-semibold text-neutral-900 dark:text-white whitespace-nowrap">
                        {task.fixHour.toFixed(1)} h
                      </td>

                      {/* Client Rate */}
                      <td className="py-3.5 px-4 text-right font-mono-numbers whitespace-nowrap">
                        <div className="font-bold text-neutral-900 dark:text-white">
                          {task.payType === 'Fixed Price'
                            ? formatCurrency(task.rate)
                            : formatCurrency(task.rate * task.fixHour)}
                        </div>
                        <div className="text-[10px] text-neutral-400">
                          {task.payType === 'Fixed Price' ? 'Flat' : `$${task.rate}/h`}
                        </div>
                      </td>

                      {/* Invoice # */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                        {task.invoiceNumber ? (
                          <span>{task.invoiceNumber}</span>
                        ) : (
                          <span className="text-[11px] font-sans font-normal text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-200/60 dark:border-amber-900/50">
                            Awaiting Pay
                          </span>
                        )}
                      </td>

                      {/* Cleaners */}
                      <td className="py-3.5 px-4 max-w-[160px] truncate text-neutral-700 dark:text-neutral-300">
                        {cleanerNames || <span className="text-neutral-400 italic">None</span>}
                      </td>

                      {/* Frequency */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-neutral-600 dark:text-neutral-400">
                        {formatFrequency(task.frequency)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onDuplicateTask(task)}
                            title="Duplicate task"
                            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onEditTask(task)}
                            title="Edit task"
                            className="p-1.5 text-neutral-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setTaskToDelete(task)}
                            title="Delete task"
                            className="p-1.5 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden divide-y divide-neutral-200 dark:divide-neutral-800">
            {filteredTasks.map((task) => {
              const cleanerNames = task.assignedCleanerIds.map(getCleanerName).join(', ');
              return (
                <div key={task.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <button
                        onClick={() => onToggleComplete(task.id)}
                        className="mt-0.5 focus:outline-none"
                      >
                        {task.completed ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Circle className="w-4 h-4 text-neutral-400" />
                        )}
                      </button>
                      <div>
                        <span className="text-sm font-bold text-neutral-900 dark:text-white">
                          {task.jobType}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-0.5">
                          <span>{formatDate(task.date)}</span>
                          <span>·</span>
                          <span className="font-mono-numbers">
                            {formatTime12h(task.startTime)} - {formatTime12h(task.endTime)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                      {task.invoiceNumber || 'Awaiting Pay'}
                    </span>
                  </div>

                  <div className="text-xs text-neutral-700 dark:text-neutral-300 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                    <span>{task.address}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 text-neutral-600 dark:text-neutral-400">
                    <div>Cleaners: {cleanerNames || 'None'}</div>
                    <div className="font-mono-numbers font-bold text-neutral-900 dark:text-white">
                      {task.payType === 'Fixed Price'
                        ? formatCurrency(task.rate)
                        : formatCurrency(task.rate * task.fixHour)}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                    <button
                      onClick={() => onDuplicateTask(task)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-neutral-200 dark:border-neutral-700"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={() => onEditTask(task)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-neutral-100 dark:bg-neutral-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setTaskToDelete(task)}
                      className="px-2 py-1 text-xs font-semibold rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {taskToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-sm w-full p-6 border border-neutral-200 dark:border-neutral-800 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/60 flex items-center justify-center text-red-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">Delete Task?</h3>
                <p className="text-xs text-neutral-500">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Are you sure you want to delete <strong className="text-neutral-900 dark:text-white">{taskToDelete.jobType}</strong> at {taskToDelete.address} ({taskToDelete.invoiceNumber})?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setTaskToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteTask(taskToDelete.id);
                  setTaskToDelete(null);
                }}
                className="px-4 py-1.5 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
