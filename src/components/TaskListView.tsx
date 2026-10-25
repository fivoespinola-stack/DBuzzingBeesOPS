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
  User,
  Phone,
  Mail,
  FileText,
  Repeat,
  Check,
  X
} from 'lucide-react';
import { Task, Cleaner } from '../types';
import { DATA_CORRECTIONS_LOG } from '../data/spreadsheetData';
import { formatCurrency, formatDate, formatTime12h, formatFrequency, isRecurringFrequency } from '../utils/formatters';

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
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [paymentTermFilter, setPaymentTermFilter] = useState<'all' | 'Cash' | 'Invoice'>('all');
  const [frequencyFilter, setFrequencyFilter] = useState<string>('all');
  const [jobTypeFilter, setJobTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'upcoming' | 'past'>('all');

  const [copiedClientId, setCopiedClientId] = useState<string | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [showCorrectionsModal, setShowCorrectionsModal] = useState(false);

  const getCleanerName = (id: string) => cleaners.find((c) => c.id === id)?.name || id;

  const todayStr = new Date().toISOString().split('T')[0];

  // Distinct Job Types present in tasks
  const distinctJobTypes = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => set.add(t.jobType));
    return Array.from(set).sort();
  }, [tasks]);

  // Distinct Clients present in tasks with client numbers
  const distinctClients = useMemo(() => {
    const map = new Map<string, string | undefined>();
    tasks.forEach((t) => {
      if (t.clientName && t.clientName.trim()) {
        const name = t.clientName.trim();
        if (!map.has(name) || (!map.get(name) && t.clientNumber)) {
          map.set(name, t.clientNumber);
        }
      }
    });
    return Array.from(map.entries())
      .map(([name, number]) => ({ name, number }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks]);

  const handleCopyClient = (t: Task) => {
    const parts = [
      t.clientNumber ? `Client #: ${t.clientNumber}` : null,
      `Client: ${t.clientName || 'N/A'}`,
      t.clientPhone ? `Phone: ${t.clientPhone}` : null,
      t.clientEmail ? `Email: ${t.clientEmail}` : null,
      `Address: ${t.address}`,
    ].filter(Boolean);
    navigator.clipboard.writeText(parts.join('\n'));
    setCopiedClientId(t.id);
    setTimeout(() => setCopiedClientId(null), 2000);
  };

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
        const matchClientNo = t.clientNumber?.toLowerCase().includes(q);
        const matchClient = t.clientName?.toLowerCase().includes(q);
        const matchPhone = t.clientPhone?.toLowerCase().includes(q);
        const matchEmail = t.clientEmail?.toLowerCase().includes(q);
        if (!matchAddress && !matchInvoice && !matchJobType && !matchRemarks && !matchClient && !matchClientNo && !matchPhone && !matchEmail) {
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

      // Client Filter
      if (clientFilter !== 'all') {
        if ((t.clientName || '').trim().toLowerCase() !== clientFilter.toLowerCase()) return false;
      }

      // Payment Term Filter
      if (paymentTermFilter !== 'all') {
        const term = t.paymentTerm || (t.invoiceNumber ? 'Invoice' : 'Cash');
        if (term !== paymentTermFilter) return false;
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
  }, [tasks, searchQuery, statusFilter, cleanerFilter, clientFilter, paymentTermFilter, frequencyFilter, jobTypeFilter, dateFilter, todayStr]);

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCleanerFilter('all');
    setClientFilter('all');
    setPaymentTermFilter('all');
    setFrequencyFilter('all');
    setJobTypeFilter('all');
    setDateFilter('all');
  };

  const hasActiveFilters =
    searchQuery ||
    statusFilter !== 'all' ||
    cleanerFilter !== 'all' ||
    clientFilter !== 'all' ||
    paymentTermFilter !== 'all' ||
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

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowCorrectionsModal(true)}
            title="Review detected errors and fixes made to spreadsheet data"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-200 transition-colors"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Data Fixes ({DATA_CORRECTIONS_LOG.length})</span>
          </button>

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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1 text-xs">
          {/* Client Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Client</label>
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#FFB509]"
            >
              <option value="all">All Clients ({distinctClients.length})</option>
              {distinctClients.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.number ? `[${c.number}] ` : ''}{c.name}
                </option>
              ))}
            </select>
          </div>

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

          {/* Payment Term Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Payment Term</label>
            <select
              value={paymentTermFilter}
              onChange={(e) => setPaymentTermFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#FFB509]"
            >
              <option value="all">All Terms</option>
              <option value="Cash">Cash Only</option>
              <option value="Invoice">Invoice Only</option>
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
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-neutral-500">
                Showing {filteredTasks.length} of {tasks.length} tasks
              </span>
              {clientFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-[11px] font-semibold">
                  <User className="w-3 h-3 text-amber-600" />
                  Client: {clientFilter}
                  <button onClick={() => setClientFilter('all')} className="ml-1 hover:text-red-600" title="Clear client filter">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
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
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-neutral-50 dark:bg-neutral-800/70 border-b border-neutral-200 dark:border-neutral-800 text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                <tr>
                  <th className="py-3.5 px-3 xl:px-4 w-12 text-center">Done</th>
                  <th className="py-3.5 px-3 xl:px-4 whitespace-nowrap">Date & Time</th>
                  <th className="py-3.5 px-3 xl:px-4 min-w-[200px]">Client & Contact</th>
                  <th className="py-3.5 px-3 xl:px-4 min-w-[200px]">Job & Address</th>
                  <th className="py-3.5 px-3 xl:px-4 text-right whitespace-nowrap">Duration</th>
                  <th className="py-3.5 px-3 xl:px-4 text-right whitespace-nowrap">Rate & Total</th>
                  <th className="py-3.5 px-3 xl:px-4 whitespace-nowrap">Pay Type</th>
                  <th className="py-3.5 px-3 xl:px-4 whitespace-nowrap">Payment Term</th>
                  <th className="py-3.5 px-3 xl:px-4 whitespace-nowrap">Invoice #</th>
                  <th className="py-3.5 px-3 xl:px-4 min-w-[130px]">Cleaners</th>
                  <th className="py-3.5 px-3 xl:px-4 whitespace-nowrap">Freq</th>
                  <th className="py-3.5 px-3 xl:px-4 text-right w-24 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filteredTasks.map((task) => {
                  const cleanerNames = task.assignedCleanerIds.map(getCleanerName).join(', ');
                  return (
                    <tr
                      key={task.id}
                      className={`hover:bg-neutral-50/80 dark:hover:bg-neutral-800/50 transition-colors ${
                        task.completed ? 'opacity-70 bg-neutral-50/40 dark:bg-neutral-900/40' : ''
                      }`}
                    >
                      {/* Mark Complete Checkbox */}
                      <td className="py-3 px-3 xl:px-4 text-center">
                        <button
                          onClick={() => onToggleComplete(task.id)}
                          className="focus:outline-none p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
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
                      <td className="py-3 px-3 xl:px-4 whitespace-nowrap">
                        <div className="font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
                          <span>{formatDate(task.date)}</span>
                          {isRecurringFrequency(task.frequency) && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80"
                              title={`Recurring job (${formatFrequency(task.frequency)}) scheduled across the 6-month cleaning calendar`}
                            >
                              <Repeat className="w-2.5 h-2.5" />
                              <span>{formatFrequency(task.frequency)}</span>
                            </span>
                          )}
                        </div>
                        <div className="font-mono-numbers text-[11px] text-neutral-500 dark:text-neutral-400">
                          {formatTime12h(task.startTime)} – {formatTime12h(task.endTime)}
                        </div>
                      </td>

                      {/* Client & Contact */}
                      <td className="py-3 px-3 xl:px-4 min-w-[210px] max-w-[320px]">
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {task.clientNumber && (
                              <span className="shrink-0 px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800" title={`Client #: ${task.clientNumber}`}>
                                {task.clientNumber}
                              </span>
                            )}
                            <div className="font-bold text-neutral-900 dark:text-white flex items-center gap-1 truncate" title={task.clientName || 'Client Unspecified'}>
                              <User className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span className="truncate">{task.clientName || 'Client Unspecified'}</span>
                            </div>
                          </div>
                          {task.clientName && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => setClientFilter(clientFilter === task.clientName ? 'all' : task.clientName!)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-colors flex items-center gap-0.5 ${
                                  clientFilter === task.clientName
                                    ? 'bg-[#FFB509] text-neutral-950 border-[#EAA300] font-bold shadow-2xs'
                                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 hover:text-neutral-900 dark:hover:text-white'
                                }`}
                                title={clientFilter === task.clientName ? 'Clear client filter' : `Filter all tasks for ${task.clientName}`}
                              >
                                <Filter className="w-2.5 h-2.5" />
                                <span>Filter</span>
                              </button>
                              <button
                                onClick={() => handleCopyClient(task)}
                                className="p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 transition-colors"
                                title="Copy client info to clipboard"
                              >
                                {copiedClientId === task.id ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="space-y-0.5 mt-1 text-[11px]">
                          {task.clientPhone ? (
                            <a
                              href={`tel:${task.clientPhone.replace(/\s+/g, '')}`}
                              className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 hover:underline font-mono"
                              title={`Call ${task.clientPhone}`}
                            >
                              <Phone className="w-3 h-3 shrink-0 text-neutral-400" />
                              <span>{task.clientPhone}</span>
                            </a>
                          ) : (
                            <div className="text-[10px] text-neutral-400 italic">No phone</div>
                          )}
                          {task.clientEmail ? (
                            <a
                              href={`mailto:${task.clientEmail.trim()}`}
                              className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline break-all"
                              title={`Email ${task.clientEmail}`}
                            >
                              <Mail className="w-3 h-3 shrink-0 text-neutral-400" />
                              <span>{task.clientEmail}</span>
                            </a>
                          ) : (
                            <div className="text-[10px] text-neutral-400 italic">No email</div>
                          )}
                        </div>
                      </td>

                      {/* Job & Address */}
                      <td className="py-3 px-3 xl:px-4 min-w-[200px] max-w-sm">
                        <div className="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                          <span>{task.jobType}</span>
                        </div>
                        <div className="text-neutral-600 dark:text-neutral-300 flex items-start gap-1 mt-0.5 text-[11.5px] leading-snug" title={task.address}>
                          <MapPin className="w-3 h-3 text-neutral-400 shrink-0 mt-0.5" />
                          <span className="break-words">{task.address}</span>
                        </div>
                        {task.remarks && (
                          <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1 bg-neutral-100 dark:bg-neutral-800/80 px-2 py-0.5 rounded-md inline-block max-w-full" title={task.remarks}>
                            Note: {task.remarks}
                          </div>
                        )}
                      </td>

                      {/* Fix Hours */}
                      <td className="py-3 px-3 xl:px-4 text-right font-mono-numbers font-semibold text-neutral-900 dark:text-white whitespace-nowrap">
                        {task.fixHour.toFixed(1)} h
                      </td>

                      {/* Client Rate */}
                      <td className="py-3 px-3 xl:px-4 text-right font-mono-numbers whitespace-nowrap">
                        <div className="font-bold text-neutral-900 dark:text-white">
                          {task.payType === 'Fixed Price'
                            ? formatCurrency(task.rate)
                            : formatCurrency(task.rate * (task.fixHour || 1))}
                        </div>
                        <div className="text-[10px] text-neutral-400">
                          {task.payType === 'Fixed Price' ? 'Flat' : `$${task.rate}/h`}
                        </div>
                      </td>

                      {/* Pay Type (Hourly Rate vs Fixed Price) */}
                      <td className="py-3 px-3 xl:px-4 whitespace-nowrap">
                        <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-lg border ${
                          task.payType === 'Fixed Price'
                            ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
                            : 'bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700'
                        }`}>
                          {task.payType === 'Fixed Price' ? 'Fixed Price' : 'Hourly Rate'}
                        </span>
                      </td>

                      {/* Payment Term (Cash vs Invoice) */}
                      <td className="py-3 px-3 xl:px-4 whitespace-nowrap">
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${
                          (task.paymentTerm || 'Cash') === 'Cash'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                            : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                        }`}>
                          {task.paymentTerm || 'Cash'}
                        </span>
                      </td>

                      {/* Invoice # */}
                      <td className="py-3 px-3 xl:px-4 whitespace-nowrap font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                        {task.invoiceNumber ? (
                          <span>{task.invoiceNumber}</span>
                        ) : (
                          <span className="text-[11px] font-sans font-normal text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-200/60 dark:border-amber-900/50">
                            Awaiting Pay
                          </span>
                        )}
                      </td>

                      {/* Cleaners */}
                      <td className="py-3 px-3 xl:px-4 min-w-[130px] max-w-[220px] text-neutral-700 dark:text-neutral-300">
                        <span className="truncate block" title={cleanerNames || 'None'}>
                          {cleanerNames || <span className="text-neutral-400 italic">None</span>}
                        </span>
                      </td>

                      {/* Frequency */}
                      <td className="py-3 px-3 xl:px-4 whitespace-nowrap text-neutral-600 dark:text-neutral-400">
                        {formatFrequency(task.frequency)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 xl:px-4 text-right whitespace-nowrap">
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
                <div key={task.id} className="p-4 space-y-3">
                  {/* Status, Job, Time & Invoice */}
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
                        <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-0.5 flex-wrap">
                          <span>{formatDate(task.date)}</span>
                          {isRecurringFrequency(task.frequency) && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                              <Repeat className="w-2.5 h-2.5" />
                              <span>{formatFrequency(task.frequency)}</span>
                            </span>
                          )}
                          <span>·</span>
                          <span className="font-mono-numbers">
                            {formatTime12h(task.startTime)} - {formatTime12h(task.endTime)} ({task.fixHour}h)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                        {task.invoiceNumber || 'Awaiting Pay'}
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                          task.payType === 'Fixed Price'
                            ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300'
                            : 'bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300'
                        }`}>
                          {task.payType === 'Fixed Price' ? 'Fixed' : 'Hourly'}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${
                          (task.paymentTerm || 'Cash') === 'Cash'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
                        }`}>
                          {task.paymentTerm || 'Cash'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Client Information Card */}
                  <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-800 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {task.clientNumber && (
                          <span className="shrink-0 px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800" title={`Client #: ${task.clientNumber}`}>
                            {task.clientNumber}
                          </span>
                        )}
                        <div className="flex items-center gap-1.5 font-bold text-neutral-900 dark:text-white truncate">
                          <User className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="truncate">{task.clientName || 'Client Unspecified'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {task.clientName && (
                          <button
                            onClick={() => setClientFilter(clientFilter === task.clientName ? 'all' : task.clientName!)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border flex items-center gap-0.5 ${
                              clientFilter === task.clientName
                                ? 'bg-[#FFB509] text-neutral-950 border-[#EAA300] font-bold'
                                : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-600'
                            }`}
                            title={`Filter tasks for ${task.clientName}`}
                          >
                            <Filter className="w-2.5 h-2.5" />
                            <span>Filter</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleCopyClient(task)}
                          className="px-1.5 py-0.5 rounded text-[10px] border border-neutral-200 dark:border-neutral-600 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 flex items-center gap-0.5"
                          title="Copy client contact"
                        >
                          {copiedClientId === task.id ? (
                            <Check className="w-2.5 h-2.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-2.5 h-2.5" />
                          )}
                          <span>Copy</span>
                        </button>
                      </div>
                    </div>
                    {task.clientPhone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-neutral-400 shrink-0" />
                        <a
                          href={`tel:${task.clientPhone.replace(/\s+/g, '')}`}
                          className="font-mono text-amber-600 dark:text-amber-400 hover:underline text-[11px]"
                        >
                          {task.clientPhone}
                        </a>
                      </div>
                    )}
                    {task.clientEmail && (
                      <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
                        <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <a
                          href={`mailto:${task.clientEmail.trim()}`}
                          className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline truncate"
                        >
                          {task.clientEmail}
                        </a>
                      </div>
                    )}
                    <div className="text-neutral-700 dark:text-neutral-300 flex items-start gap-1.5 pt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                      <span>{task.address}</span>
                    </div>
                    {task.remarks && (
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 italic pt-0.5 border-t border-neutral-200/40 dark:border-neutral-700/40">
                        Notes: {task.remarks}
                      </div>
                    )}
                  </div>

                  {/* Cleaners, Frequency & Rates */}
                  <div className="flex items-center justify-between text-xs pt-1 text-neutral-600 dark:text-neutral-400">
                    <div className="space-y-0.5">
                      <div>Cleaners: <span className="text-neutral-900 dark:text-white font-medium">{cleanerNames || 'None'}</span></div>
                      <div className="text-[11px] text-neutral-500">Freq: {formatFrequency(task.frequency)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono-numbers font-bold text-neutral-900 dark:text-white">
                        {task.payType === 'Fixed Price'
                          ? formatCurrency(task.rate)
                          : formatCurrency(task.rate * (task.fixHour || 1))}
                      </div>
                      <div className="text-[10px] text-neutral-400 font-mono-numbers">
                        {task.payType === 'Fixed Price' ? 'Flat rate' : `$${task.rate}/h`}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                    <button
                      onClick={() => onDuplicateTask(task)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={() => onEditTask(task)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white"
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

      {/* Data Corrections Modal */}
      {showCorrectionsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-2xl w-full p-6 border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">Spreadsheet Data Corrections</h3>
                  <p className="text-xs text-neutral-500">Errors detected in the imported sheet and automatically repaired</p>
                </div>
              </div>
              <button
                onClick={() => setShowCorrectionsModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 pr-1 flex-1 text-xs">
              {DATA_CORRECTIONS_LOG.map((log, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-bold text-neutral-900 dark:text-white text-sm">
                      {log.client}
                    </span>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-semibold">
                      {log.field}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11.5px]">
                    <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300">
                      <span className="font-bold block text-[10px] uppercase text-red-500">Original in Sheet:</span>
                      <code>{log.original}</code>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                      <span className="font-bold block text-[10px] uppercase text-emerald-500">Corrected Value:</span>
                      <code>{log.corrected}</code>
                    </div>
                  </div>
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-400 italic">
                    Reason: {log.reason}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex justify-end shrink-0">
              <button
                onClick={() => setShowCorrectionsModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-[#FFB509] text-neutral-950 hover:bg-[#EAA300] transition-colors"
              >
                Close Corrections
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
