import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  BarChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { 
  CheckCircle2, 
  DollarSign, 
  Calendar, 
  BarChart3, 
  Repeat, 
  Layers, 
  ChevronDown, 
  ChevronUp,
  Sparkles
} from 'lucide-react';
import { Task } from '../types';
import { formatCurrency, isRecurringFrequency } from '../utils/formatters';

interface PerformanceDashboardProps {
  tasks: Task[];
  onNavigateToTab?: (tab: string) => void;
}

interface MonthlyMetric {
  monthKey: string; // YYYY-MM
  label: string;    // "Nov 2026"
  shortLabel: string; // "Nov"
  recurringRevenue: number;
  oneOffRevenue: number;
  totalRevenue: number;
  completedRevenue: number;
  totalJobs: number;
  completedJobs: number;
  pendingJobs: number;
  completionRate: number; // percentage 0 - 100
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ tasks }) => {
  const [activeTab, setActiveTab] = useState<'combined' | 'revenue' | 'volume'>('combined');
  const [timeRange, setTimeRange] = useState<'all' | '6months' | 'year'>('6months');
  const [showTable, setShowTable] = useState(false);

  // Helper to compute revenue of a single task
  const getTaskRevenue = (task: Task): number => {
    if (task.payType === 'Fixed Price') {
      return task.rate || 0;
    }
    return (task.rate || 0) * (task.fixHour || 1);
  };

  // Group and calculate metrics by month
  const monthlyData: MonthlyMetric[] = useMemo(() => {
    if (!tasks || tasks.length === 0) {
      // If no tasks, generate default 6-month empty window based on current date
      const result: MonthlyMetric[] = [];
      const now = new Date();
      for (let i = -3; i <= 2; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const monthKey = `${y}-${m}`;
        const shortLabel = d.toLocaleString('en-US', { month: 'short' });
        const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        result.push({
          monthKey,
          label,
          shortLabel,
          recurringRevenue: 0,
          oneOffRevenue: 0,
          totalRevenue: 0,
          completedRevenue: 0,
          totalJobs: 0,
          completedJobs: 0,
          pendingJobs: 0,
          completionRate: 0,
        });
      }
      return result;
    }

    // Collect all unique months from tasks + current month
    const monthMap = new Map<string, Task[]>();
    
    // Ensure current month is always present
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthMap.set(currentMonthKey, []);

    tasks.forEach((t) => {
      if (!t.date) return;
      const key = t.date.substring(0, 7); // "YYYY-MM"
      if (!monthMap.has(key)) {
        monthMap.set(key, []);
      }
      monthMap.get(key)!.push(t);
    });

    const sortedKeys = Array.from(monthMap.keys()).sort();

    const metrics: MonthlyMetric[] = sortedKeys.map((key) => {
      const [yearStr, monthStr] = key.split('-');
      const y = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10);
      const d = new Date(y, m - 1, 1);
      const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      const shortLabel = d.toLocaleString('en-US', { month: 'short' });

      const monthTasks = monthMap.get(key) || [];
      let recurringRevenue = 0;
      let oneOffRevenue = 0;
      let completedRevenue = 0;
      let completedJobs = 0;

      monthTasks.forEach((t) => {
        const rev = getTaskRevenue(t);
        if (isRecurringFrequency(t.frequency)) {
          recurringRevenue += rev;
        } else {
          oneOffRevenue += rev;
        }

        if (t.completed) {
          completedJobs += 1;
          completedRevenue += rev;
        }
      });

      const totalRevenue = recurringRevenue + oneOffRevenue;
      const totalJobs = monthTasks.length;
      const pendingJobs = totalJobs - completedJobs;
      const completionRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

      return {
        monthKey: key,
        label,
        shortLabel,
        recurringRevenue,
        oneOffRevenue,
        totalRevenue,
        completedRevenue,
        totalJobs,
        completedJobs,
        pendingJobs,
        completionRate,
      };
    });

    // Filter according to time range if needed
    if (timeRange === '6months' && metrics.length > 6) {
      return metrics.slice(-6);
    }
    if (timeRange === 'year' && metrics.length > 12) {
      return metrics.slice(-12);
    }
    return metrics;
  }, [tasks, timeRange]);

  // Executive summary aggregations
  const summary = useMemo(() => {
    const totalJobsAllTime = tasks.length;
    const completedJobsAllTime = tasks.filter((t) => t.completed).length;
    const totalRevenueAllTime = tasks.reduce((sum, t) => sum + getTaskRevenue(t), 0);
    const completedRevenueAllTime = tasks
      .filter((t) => t.completed)
      .reduce((sum, t) => sum + getTaskRevenue(t), 0);

    // Current month MRR
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthMetric = monthlyData.find((m) => m.monthKey === currentMonthKey) || monthlyData[monthlyData.length - 1];

    const currentMRR = currentMonthMetric ? currentMonthMetric.recurringRevenue : 0;
    const currentTotalRevenue = currentMonthMetric ? currentMonthMetric.totalRevenue : 0;

    // Previous month comparison
    const currentIndex = monthlyData.findIndex((m) => m.monthKey === (currentMonthMetric?.monthKey || ''));
    const prevMonthMetric = currentIndex > 0 ? monthlyData[currentIndex - 1] : null;
    const prevMRR = prevMonthMetric ? prevMonthMetric.recurringRevenue : 0;
    const mrrGrowth = prevMRR > 0 ? ((currentMRR - prevMRR) / prevMRR) * 100 : 0;

    // Active recurring clients count
    const recurringClients = new Set<string>();
    tasks.filter((t) => isRecurringFrequency(t.frequency) && t.clientName).forEach((t) => recurringClients.add(t.clientName!));

    const overallCompletionRate = totalJobsAllTime > 0 ? Math.round((completedJobsAllTime / totalJobsAllTime) * 100) : 0;
    const avgJobValue = totalJobsAllTime > 0 ? totalRevenueAllTime / totalJobsAllTime : 0;

    return {
      currentMRR,
      mrrGrowth,
      currentTotalRevenue,
      totalJobsAllTime,
      completedJobsAllTime,
      totalRevenueAllTime,
      completedRevenueAllTime,
      recurringClientsCount: recurringClients.size,
      overallCompletionRate,
      avgJobValue,
    };
  }, [tasks, monthlyData]);

  // Custom Dark/Light Tooltip for Recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: MonthlyMetric = payload[0].payload;
      return (
        <div className="bg-neutral-900/95 dark:bg-neutral-900/95 backdrop-blur-md border border-neutral-700 p-3.5 rounded-xl shadow-2xl text-xs text-white max-w-xs animate-in fade-in duration-150">
          <div className="font-extrabold text-sm border-b border-neutral-700/80 pb-1.5 mb-2 flex items-center justify-between">
            <span className="text-white">{data.label}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-[#FFB509] font-bold">
              {data.completionRate}% Done
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FFB509]" />
                Recurring MRR:
              </span>
              <strong className="font-mono text-[#FFB509]">{formatCurrency(data.recurringRevenue)}</strong>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                One-Off Revenue:
              </span>
              <span className="font-mono text-neutral-200">{formatCurrency(data.oneOffRevenue)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 pt-1 border-t border-neutral-800">
              <span className="text-neutral-300 font-semibold">Total Revenue:</span>
              <strong className="font-mono text-white">{formatCurrency(data.totalRevenue)}</strong>
            </div>
            <div className="flex items-center justify-between gap-4 pt-1 border-t border-neutral-800">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Completed Jobs:
              </span>
              <strong className="font-mono text-emerald-400">
                {data.completedJobs} / {data.totalJobs} jobs
              </strong>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-6 transition-all">
      
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FFB509] to-amber-600 flex items-center justify-center text-neutral-950 font-bold shadow-xs">
              <BarChart3 className="w-4 h-4 text-neutral-950 stroke-[2.5]" />
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-neutral-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>Performance Dashboard</span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                Live Revenue & Volume
              </span>
            </h2>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Visualizing Monthly Recurring Revenue (MRR), total completed cleaning jobs, and operational velocity.
          </p>
        </div>

        {/* Action Controls & View Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('combined')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'combined'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs font-bold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-amber-500" />
              <span>Combined</span>
            </button>
            <button
              onClick={() => setActiveTab('revenue')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'revenue'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs font-bold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
              <span>MRR & Revenue</span>
            </button>
            <button
              onClick={() => setActiveTab('volume')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'volume'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs font-bold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
              <span>Completed Jobs</span>
            </button>
          </div>

          {/* Time Range Filter */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="text-xs px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#FFB509]"
          >
            <option value="6months">Last 6 Months</option>
            <option value="year">Full Year (12 Mo)</option>
            <option value="all">All Recorded Months</option>
          </select>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* KPI 1: Monthly Recurring Revenue (MRR) */}
        <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/30 dark:border-amber-500/20 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <Repeat className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Current MRR</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
              Recurring
            </span>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white font-mono-numbers">
            {formatCurrency(summary.currentMRR)}
          </div>
          <div className="mt-1.5 flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
            <span>{summary.recurringClientsCount} Active Recurring Clients</span>
            {summary.mrrGrowth !== 0 && (
              <span className={`font-semibold font-mono text-[11px] ${summary.mrrGrowth >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                {summary.mrrGrowth >= 0 ? `+${summary.mrrGrowth.toFixed(1)}%` : `${summary.mrrGrowth.toFixed(1)}%`}
              </span>
            )}
          </div>
        </div>

        {/* KPI 2: Total Completed Jobs */}
        <div className="p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/10 border border-emerald-500/30 dark:border-emerald-500/20 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Completed Jobs</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200">
              {summary.overallCompletionRate}% Rate
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white font-mono-numbers">
              {summary.completedJobsAllTime}
            </span>
            <span className="text-xs text-neutral-500 font-mono">
              / {summary.totalJobsAllTime} scheduled
            </span>
          </div>
          <div className="mt-1.5 text-xs text-neutral-600 dark:text-neutral-400">
            Earned: <strong className="text-emerald-700 dark:text-emerald-400 font-mono-numbers">{formatCurrency(summary.completedRevenueAllTime)}</strong>
          </div>
        </div>

        {/* KPI 3: Total Scheduled Revenue */}
        <div className="p-4 rounded-2xl bg-blue-500/10 dark:bg-blue-500/10 border border-blue-500/30 dark:border-blue-500/20 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Total Pipeline</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-200/60 dark:bg-blue-900/60 text-blue-900 dark:text-blue-200">
              All Jobs
            </span>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white font-mono-numbers">
            {formatCurrency(summary.totalRevenueAllTime)}
          </div>
          <div className="mt-1.5 text-xs text-neutral-600 dark:text-neutral-400">
            Avg Job: <strong className="text-neutral-900 dark:text-white font-mono-numbers">{formatCurrency(summary.avgJobValue)}</strong>
          </div>
        </div>

        {/* KPI 4: Monthly Operational Run */}
        <div className="p-4 rounded-2xl bg-purple-500/10 dark:bg-purple-500/10 border border-purple-500/30 dark:border-purple-500/20 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>This Month Total</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-200/60 dark:bg-purple-900/60 text-purple-900 dark:text-purple-200">
              Revenue
            </span>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white font-mono-numbers">
            {formatCurrency(summary.currentTotalRevenue)}
          </div>
          <div className="mt-1.5 text-xs text-neutral-600 dark:text-neutral-400 flex items-center justify-between">
            <span>Includes recurring + one-offs</span>
            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
          </div>
        </div>

      </div>

      {/* Main Interactive Chart Section */}
      <div className="p-4 sm:p-5 rounded-2xl bg-neutral-50/70 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800">
        
        {/* Chart Header & Legend explanation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-extrabold text-sm text-neutral-900 dark:text-white">
              {activeTab === 'combined' && 'Monthly Recurring Revenue (MRR) vs Completed Jobs'}
              {activeTab === 'revenue' && 'Monthly Recurring Revenue (MRR) Breakdown'}
              {activeTab === 'volume' && 'Monthly Completed Jobs Volume & Target'}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {activeTab === 'combined' && 'Comparing monthly recurring revenue with completed job throughput.'}
              {activeTab === 'revenue' && 'Recurring subscription cleans vs ad-hoc / one-off cleans.'}
              {activeTab === 'volume' && 'Tracking completed cleans vs total scheduled cleaning bookings.'}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            {(activeTab === 'combined' || activeTab === 'revenue') && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#FFB509]" />
                <span className="text-neutral-700 dark:text-neutral-300">MRR ($)</span>
              </div>
            )}
            {activeTab === 'revenue' && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-blue-500" />
                <span className="text-neutral-700 dark:text-neutral-300">One-off ($)</span>
              </div>
            )}
            {(activeTab === 'combined' || activeTab === 'volume') && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-emerald-500" />
                <span className="text-neutral-700 dark:text-neutral-300">Completed Jobs</span>
              </div>
            )}
            {activeTab === 'volume' && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-neutral-400" />
                <span className="text-neutral-700 dark:text-neutral-300">Pending Jobs</span>
              </div>
            )}
          </div>
        </div>

        {/* Visual Chart Rendering */}
        <div className="w-full h-72 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            {activeTab === 'combined' ? (
              <ComposedChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFB509" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#FFB509" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#88888820" vertical={false} />
                <XAxis 
                  dataKey="shortLabel" 
                  stroke="#888888" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={{ stroke: '#88888830' }}
                />
                {/* Left Axis: Revenue */}
                <YAxis 
                  yAxisId="left" 
                  stroke="#888888" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                {/* Right Axis: Job Counts */}
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  stroke="#10B981" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="recurringRevenue" 
                  name="Monthly Recurring Revenue"
                  stroke="#FFB509" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#mrrGradient)" 
                />
                <Bar 
                  yAxisId="right" 
                  dataKey="completedJobs" 
                  name="Completed Jobs" 
                  fill="#10B981" 
                  radius={[6, 6, 0, 0]} 
                  barSize={24}
                />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="totalRevenue" 
                  name="Total Revenue" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#3B82F6' }}
                  strokeDasharray="4 4"
                />
              </ComposedChart>
            ) : activeTab === 'revenue' ? (
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="mrrOnlyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFB509" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#FFB509" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="oneOffGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#88888820" vertical={false} />
                <XAxis 
                  dataKey="shortLabel" 
                  stroke="#888888" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={{ stroke: '#88888830' }}
                />
                <YAxis 
                  stroke="#888888" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="recurringRevenue" 
                  name="Recurring MRR" 
                  stroke="#FFB509" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#mrrOnlyGradient)" 
                  stackId="rev"
                />
                <Area 
                  type="monotone" 
                  dataKey="oneOffRevenue" 
                  name="One-Off Revenue" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#oneOffGradient)" 
                  stackId="rev"
                />
              </AreaChart>
            ) : (
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#88888820" vertical={false} />
                <XAxis 
                  dataKey="shortLabel" 
                  stroke="#888888" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={{ stroke: '#88888830' }}
                />
                <YAxis 
                  stroke="#888888" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="completedJobs" 
                  name="Completed Jobs" 
                  fill="#10B981" 
                  radius={[0, 0, 0, 0]} 
                  stackId="jobs"
                  barSize={28}
                />
                <Bar 
                  dataKey="pendingJobs" 
                  name="Pending Jobs" 
                  fill="#9CA3AF" 
                  radius={[6, 6, 0, 0]} 
                  stackId="jobs"
                  barSize={28}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

      </div>

      {/* Collapsible Monthly Performance Breakdown Table */}
      <div className="pt-2">
        <button
          onClick={() => setShowTable(!showTable)}
          className="flex items-center gap-1.5 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
        >
          {showTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          <span>{showTable ? 'Hide Monthly Breakdown Table' : 'Show Detailed Monthly Breakdown Table'}</span>
        </button>

        {showTable && (
          <div className="mt-3 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-xs animate-in fade-in duration-200">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-neutral-100 dark:bg-neutral-800 text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                  <tr>
                    <th className="py-3 px-4">Month</th>
                    <th className="py-3 px-4 text-right">Recurring MRR</th>
                    <th className="py-3 px-4 text-right">One-Off Rev</th>
                    <th className="py-3 px-4 text-right">Total Revenue</th>
                    <th className="py-3 px-4 text-center">Completed</th>
                    <th className="py-3 px-4 text-center">Total Jobs</th>
                    <th className="py-3 px-4 text-right">Completion %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-mono-numbers">
                  {monthlyData.map((row) => (
                    <tr key={row.monthKey} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/50 transition-colors">
                      <td className="py-2.5 px-4 font-sans font-bold text-neutral-900 dark:text-white">
                        {row.label}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-[#FFB509]">
                        {formatCurrency(row.recurringRevenue)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-neutral-600 dark:text-neutral-400">
                        {formatCurrency(row.oneOffRevenue)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-extrabold text-neutral-900 dark:text-white">
                        {formatCurrency(row.totalRevenue)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {row.completedJobs}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center text-neutral-600 dark:text-neutral-400">
                        {row.totalJobs}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <span className={`font-bold ${row.completionRate >= 80 ? 'text-emerald-600' : 'text-neutral-700 dark:text-neutral-300'}`}>
                          {row.completionRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

    </section>
  );
};
