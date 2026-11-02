import React, { useState, useEffect, useCallback } from 'react';
import { Repeat, CheckCircle2, X } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { LoginPage } from './components/LoginPage';
import { DashboardView } from './components/DashboardView';
import { TaskListView } from './components/TaskListView';
import { CalendarView } from './components/CalendarView';
import { CleanerManagementView } from './components/CleanerManagementView';
import { PayAndInvoiceView } from './components/PayAndInvoiceView';
import { TaskModal } from './components/TaskModal';
import { ImportExportModal } from './components/ImportExportModal';
import { StaffUsersModal } from './components/StaffUsersModal';
import { SendConfirmationModal } from './components/SendConfirmationModal';

import { Task, Cleaner, UserSession, CleanerPaySummary } from './types';
import { 
  loadTasks, 
  saveTasks, 
  loadCleaners, 
  saveCleaners, 
  getActiveSession, 
  createSession, 
  clearSession, 
  extendSession,
  loadTheme,
  saveTheme,
  INITIAL_CLEANERS,
  getInitialTasks,
  clearAllProductionRecords,
  loadCompanySettings
} from './services/storage';
import { 
  subscribeToTasks, 
  subscribeToCleaners, 
  saveTaskToFirestore,
  deleteTaskFromFirestore, 
  deleteCleanerFromFirestore,
  testFirestoreConnection
} from './services/firebase';
import { exportAllDataToExcel } from './services/excelService';
import { approveBookingAndAutoSend, retryEmailConfirmation, sendBookingConfirmation } from './services/emailConfirmationService';
import { formatDate } from './utils/formatters';

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(loadTheme());

  // Action feedback toast state
  const [actionToast, setActionToast] = useState<{
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!actionToast) return;
    const timer = setTimeout(() => setActionToast(null), 5000);
    return () => clearTimeout(timer);
  }, [actionToast]);

  // Auth Session state
  const [session, setSession] = useState<UserSession | null>(null);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null);

  // App Data state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);

  // Navigation tab: 'dashboard' | 'tasks' | 'calendar' | 'cleaners' | 'pay'
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Modals
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskModalDefaultDate, setTaskModalDefaultDate] = useState<string | undefined>(undefined);
  const [importExportModalOpen, setImportExportModalOpen] = useState(false);
  const [staffUsersModalOpen, setStaffUsersModalOpen] = useState(false);

  // Send Confirmation modal state (Single job or batch)
  const [confirmationTask, setConfirmationTask] = useState<Task | null>(null);
  const [confirmationBulkTasks, setConfirmationBulkTasks] = useState<Task[] | null>(null);
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);

  // Floating Toast notification for auto-scheduled recurring tasks
  const [recurringToast, setRecurringToast] = useState<{
    message: string;
    date: string;
    cadence: string;
    address: string;
  } | null>(null);

  useEffect(() => {
    if (!recurringToast) return;
    const timer = setTimeout(() => {
      setRecurringToast(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [recurringToast]);

  // Initialize theme on mount and when changed
  useEffect(() => {
    saveTheme(theme);
  }, [theme]);

  // Reference for session to allow interval without re-subscribing on every state tick
  const sessionRef = React.useRef<UserSession | null>(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Check session on mount and listen to periodic expiration checks (30-minute inactivity auto-logout)
  useEffect(() => {
    const active = getActiveSession();
    if (active) {
      setSession(active);
      setTasks(loadTasks());
      setCleaners(loadCleaners());
    } else {
      setSession(null);
    }

    // Interval to monitor session validity
    const checkInterval = setInterval(() => {
      const current = getActiveSession();
      if (!current && sessionRef.current) {
        // Session expired automatically after 30 minutes of inactivity
        setSession(null);
        setTasks([]);
        setCleaners([]);
        setSessionExpiredMessage('Your session timed out after 30 minutes of inactivity. Please sign in again.');
      }
    }, 2000);

    return () => clearInterval(checkInterval);
  }, []);

  // User activity tracker: resets expiration time on interaction (only if session exists)
  useEffect(() => {
    if (!session) return;

    let lastInteraction = Date.now();
    const handleActivity = () => {
      const now = Date.now();
      // Throttle activity updates to once every 60 seconds
      if (now - lastInteraction > 60000) {
        lastInteraction = now;
        const updated = extendSession();
        if (updated) {
          setSession({ ...updated });
        }
      }
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [session]);

  // Real-time Cloud Firestore Data Synchronization
  useEffect(() => {
    if (!session) return;

    // Verify connection to Cloud Firestore
    testFirestoreConnection().catch((err) => {
      console.warn('Firestore connection check notice:', err);
    });

    // Real-time synchronization for Tasks
    const unsubTasks = subscribeToTasks((remoteTasks) => {
      if (remoteTasks && remoteTasks.length > 0) {
        setTasks(remoteTasks);
        try {
          localStorage.setItem('dbuzzingbees_tasks_prod_v1', JSON.stringify(remoteTasks));
        } catch (_) {}
      }
    });

    // Real-time synchronization for Cleaners
    const unsubCleaners = subscribeToCleaners((remoteCleaners) => {
      if (remoteCleaners && remoteCleaners.length > 0) {
        setCleaners(remoteCleaners);
        try {
          localStorage.setItem('dbuzzingbees_cleaners_prod_v1', JSON.stringify(remoteCleaners));
        } catch (_) {}
      }
    });

    return () => {
      unsubTasks();
      unsubCleaners();
    };
  }, [session?.username]);

  const handleToggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    saveTheme(next);
  };

  const handleLogin = (username: string, rememberMe: boolean) => {
    const newSession = createSession(username, rememberMe);
    setSession(newSession);
    setSessionExpiredMessage(null);
    // Load data upon login
    setTasks(loadTasks());
    setCleaners(loadCleaners());
  };

  const handleSignOut = () => {
    clearSession();
    setSession(null);
    setSessionExpiredMessage(null);
    // Clear data from active memory for security
    setTasks([]);
    setCleaners([]);
  };

  const handleExtendSession = () => {
    const updated = extendSession();
    if (updated) {
      setSession({ ...updated });
    }
  };

  // Task Operations
  const handleToggleComplete = useCallback((taskId: string) => {
    setTasks((prev) => {
      const updated = prev.map((t) =>
        t.id === taskId ? { ...t, completed: !t.completed } : t
      );
      saveTasks(updated);
      return updated;
    });
  }, []);

  const handleSaveTask = (savedTask: Task, futureRecurringInstances?: Task[]) => {
    setTasks((prev) => {
      const exists = prev.some((t) => t.id === savedTask.id);
      let updated = exists
        ? prev.map((t) => (t.id === savedTask.id ? savedTask : t))
        : [savedTask, ...prev];

      if (futureRecurringInstances && futureRecurringInstances.length > 0) {
        updated = [...futureRecurringInstances, ...updated];
        setRecurringToast({
          message: `Scheduled ${1 + futureRecurringInstances.length} visits in Cleaning Calendar!`,
          date: futureRecurringInstances[futureRecurringInstances.length - 1].date,
          cadence: savedTask.frequency,
          address: `${savedTask.clientName ? savedTask.clientName + ' · ' : ''}${savedTask.address}`,
        });
      }

      saveTasks(updated);
      return updated;
    });
  };

  const handleApproveBooking = async (taskToApprove: Task) => {
    if (!session) return;
    try {
      const isCurrentlyApproved = Boolean(taskToApprove.isApproved);
      const updatedTask: Task = {
        ...taskToApprove,
        isApproved: !isCurrentlyApproved,
        approvedBy: !isCurrentlyApproved ? (session.name || session.username) : undefined,
        approvedAt: !isCurrentlyApproved ? new Date().toISOString() : undefined,
      };

      setTasks((prev) => {
        const updated = prev.map((t) => (t.id === updatedTask.id ? updatedTask : t));
        saveTasks(updated);
        return updated;
      });

      saveTaskToFirestore(updatedTask).catch((err) => {
        console.warn('Firestore task approval sync notice:', err);
      });

      setActionToast({
        type: 'success',
        title: !isCurrentlyApproved ? 'Booking Approved' : 'Approval Removed',
        message: !isCurrentlyApproved
          ? `Booking for ${taskToApprove.clientName || 'Client'} marked as approved. (No auto-send; use 1-Click Send when ready)`
          : `Booking for ${taskToApprove.clientName || 'Client'} set back to pending approval.`
      });
    } catch (err: any) {
      setActionToast({
        type: 'error',
        title: 'Approval Error',
        message: err?.message || 'Could not update booking approval.'
      });
    }
  };

  const handleRetryEmail = async (taskToRetry: Task) => {
    if (!session) return;
    try {
      const res = await retryEmailConfirmation(taskToRetry, cleaners, session.name);
      setTasks((prev) => {
        const updated = prev.map((t) => (t.id === res.updatedTask.id ? res.updatedTask : t));
        saveTasks(updated);
        return updated;
      });

      if (res.success) {
        setActionToast({
          type: 'success',
          title: 'Confirmation Email Dispatched!',
          message: `Successfully sent confirmation email to ${taskToRetry.clientEmail || 'Client'} and logged in database.`
        });
      } else {
        setActionToast({
          type: 'error',
          title: 'Email Retry Failed',
          message: res.error || 'Delivery failed. Try WhatsApp or Messenger.'
        });
      }
    } catch (err: any) {
      setActionToast({
        type: 'error',
        title: 'Retry Failed',
        message: err?.message || 'Failed to retry email.'
      });
    }
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => {
      const updated = prev.filter((t) => t.id !== taskId);
      saveTasks(updated);
      return updated;
    });
    deleteTaskFromFirestore(taskId).catch((err) => {
      console.warn('Firestore task deletion notice:', err);
    });
  };

  const handleDuplicateTask = (task: Task) => {
    const duplicated: Task = {
      ...task,
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    handleSaveTask(duplicated);
  };

  const handleOpenAddNewTask = (defaultDate?: string) => {
    setTaskToEdit(null);
    setTaskModalDefaultDate(defaultDate);
    setTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: Task) => {
    setTaskToEdit(task);
    setTaskModalDefaultDate(undefined);
    setTaskModalOpen(true);
  };

  // 1-Click Direct Confirmation Send (Zero Modal / Zero Popups)
  const handleDirectSendConfirmation = useCallback(async (targetTask: Task) => {
    if (!sessionRef.current) return;
    try {
      const res = await sendBookingConfirmation(targetTask, cleaners, {
        isAutomatic: false,
        staffName: sessionRef.current.name,
        staffUsername: sessionRef.current.username,
      });

      setTasks((prev) => {
        const updated = prev.map((t) => (t.id === res.updatedTask.id ? res.updatedTask : t));
        saveTasks(updated);
        return updated;
      });

      if (res.success) {
        setActionToast({
          type: 'success',
          title: 'Confirmation Sent (1-Click)!',
          message: `Dispatched confirmation to ${targetTask.clientName || 'Client'} via ${res.channelUsed.toUpperCase()} (Free) with no popups.`
        });
      } else {
        setActionToast({
          type: 'error',
          title: 'Confirmation Notice',
          message: res.error || 'Could not dispatch confirmation. Check client contact.'
        });
      }
    } catch (err: any) {
      setActionToast({
        type: 'error',
        title: 'Error Sending Confirmation',
        message: err?.message || 'Failed to dispatch confirmation.'
      });
    }
  }, [cleaners]);

  // 1-Click Direct Bulk Confirmation Send (Zero Modal / Zero Popups)
  const handleDirectBulkSendConfirmation = useCallback(async (selectedTasks: Task[]) => {
    if (!sessionRef.current || selectedTasks.length === 0) return;
    let sentCount = 0;
    let failCount = 0;
    const updatedList: Task[] = [];

    for (const t of selectedTasks) {
      try {
        const res = await sendBookingConfirmation(t, cleaners, {
          isAutomatic: false,
          staffName: sessionRef.current.name,
          staffUsername: sessionRef.current.username,
        });
        updatedList.push(res.updatedTask);
        if (res.success) sentCount++;
        else failCount++;
      } catch {
        failCount++;
        updatedList.push(t);
      }
    }

    setTasks((prev) => {
      const idMap = new Map(updatedList.map((item) => [item.id, item]));
      const updated = prev.map((item) => idMap.get(item.id) || item);
      saveTasks(updated);
      return updated;
    });

    setActionToast({
      type: sentCount > 0 ? 'success' : 'error',
      title: 'Bulk Confirmations Sent (1-Click)!',
      message: `Directly dispatched ${sentCount} booking confirmation(s) via Email (Free). Zero popups.`
    });
  }, [cleaners]);

  // Optional manual preview modal if explicitly requested
  const handleOpenCustomizeModal = useCallback((task: Task) => {
    setConfirmationTask(task);
    setConfirmationBulkTasks(null);
    setConfirmationModalOpen(true);
  }, []);

  const handleUpdateTaskFromConfirmation = (updatedTask: Task) => {
    setTasks((prev) => {
      const updated = prev.map((t) => {
        if (t.id === updatedTask.id) return updatedTask;
        // If client matches, sync updated contact details across all their tasks
        if (
          updatedTask.clientName &&
          t.clientName &&
          t.clientName.trim().toLowerCase() === updatedTask.clientName.trim().toLowerCase()
        ) {
          return {
            ...t,
            clientPhone: updatedTask.clientPhone,
            clientEmail: updatedTask.clientEmail,
            clientMessenger: updatedTask.clientMessenger,
          };
        }
        return t;
      });
      saveTasks(updated);
      return updated;
    });
    setConfirmationTask((prev) => (prev?.id === updatedTask.id ? updatedTask : prev));
    saveTaskToFirestore(updatedTask).catch((err) => {
      console.warn('Firestore single task sync notice:', err);
    });
  };

  const handleBulkUpdateTasksFromConfirmation = (updatedBatch: Task[]) => {
    setTasks((prev) => {
      const idMap = new Map(updatedBatch.map((t) => [t.id, t]));
      const updated = prev.map((t) => idMap.get(t.id) || t);
      saveTasks(updated);
      return updated;
    });
  };

  // Cleaner Operations
  const handleSaveCleaner = (cleaner: Cleaner) => {
    setCleaners((prev) => {
      const exists = prev.some((c) => c.id === cleaner.id);
      const updated = exists
        ? prev.map((c) => (c.id === cleaner.id ? cleaner : c))
        : [...prev, cleaner];
      saveCleaners(updated);
      return updated;
    });
  };

  const handleDeleteCleaner = (cleanerId: string) => {
    setCleaners((prev) => {
      const updated = prev.filter((c) => c.id !== cleanerId);
      saveCleaners(updated);
      return updated;
    });
    deleteCleanerFromFirestore(cleanerId).catch((err) => {
      console.warn('Firestore cleaner deletion notice:', err);
    });
  };

  // Import / Export Operations
  const handleImportComplete = (newTasks: Task[], updatedCleaners: Cleaner[]) => {
    setTasks((prev) => {
      const combined = [...newTasks, ...prev];
      saveTasks(combined);
      return combined;
    });
    setCleaners(updatedCleaners);
    saveCleaners(updatedCleaners);
  };

  const handleResetData = async () => {
    setTasks([]);
    setCleaners([]);
    await clearAllProductionRecords();
  };

  const handleExportFilteredTasks = (tasksToExport: Task[]) => {
    exportAllDataToExcel(tasksToExport, cleaners);
  };

  const handleExportAllPay = (summaries: CleanerPaySummary[], weekLabel: string) => {
    exportAllDataToExcel(tasks, cleaners, summaries);
  };

  // If user is not authenticated or session has expired, show Sign-in Page
  if (!session) {
    return (
      <LoginPage
        onLogin={handleLogin}
        sessionExpiredMessage={sessionExpiredMessage}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
    );
  }

  const pendingTasksCount = tasks.filter((t) => !t.completed).length;

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors flex flex-col font-sans">
      
      {/* Top Navigation Bar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        session={session}
        onSignOut={handleSignOut}
        onExtendSession={handleExtendSession}
        onOpenStaffUsers={() => setStaffUsersModalOpen(true)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenImportExport={() => setImportExportModalOpen(true)}
        pendingTasksCount={pendingTasksCount}
      />

      {/* Main Content Workspace Container - Expanded max-w on desktop to optimize table visibility */}
      <main className="flex-1 max-w-7xl xl:max-w-[1760px] 2xl:max-w-[1920px] w-full mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-6 pb-16 transition-all">
        
        {currentTab === 'dashboard' && (
          <DashboardView
            tasks={tasks}
            cleaners={cleaners}
            onToggleComplete={handleToggleComplete}
            onEditTask={handleOpenEditTask}
            onAddNewTask={handleOpenAddNewTask}
            onOpenImportExport={() => setImportExportModalOpen(true)}
            onNavigateToTab={(tab) => setCurrentTab(tab)}
            onSendConfirmation={handleDirectSendConfirmation}
            onBulkSendConfirmation={handleDirectBulkSendConfirmation}
          />
        )}

        {currentTab === 'tasks' && (
          <TaskListView
            tasks={tasks}
            cleaners={cleaners}
            onToggleComplete={handleToggleComplete}
            onEditTask={handleOpenEditTask}
            onDeleteTask={handleDeleteTask}
            onDuplicateTask={handleDuplicateTask}
            onAddNewTask={() => handleOpenAddNewTask()}
            onExportTasks={handleExportFilteredTasks}
            onSendConfirmation={handleDirectSendConfirmation}
            onBulkSendConfirmation={handleDirectBulkSendConfirmation}
            onApproveBooking={handleApproveBooking}
            onRetryEmail={handleRetryEmail}
            onOpenCustomizeConfirmation={handleOpenCustomizeModal}
          />
        )}

        {currentTab === 'calendar' && (
          <CalendarView
            tasks={tasks}
            cleaners={cleaners}
            onToggleComplete={handleToggleComplete}
            onEditTask={handleOpenEditTask}
            onAddNewTask={handleOpenAddNewTask}
            onSendConfirmation={handleDirectSendConfirmation}
            onBulkSendConfirmation={handleDirectBulkSendConfirmation}
          />
        )}

        {currentTab === 'cleaners' && (
          <CleanerManagementView
            cleaners={cleaners}
            tasks={tasks}
            onSaveCleaner={handleSaveCleaner}
            onDeleteCleaner={handleDeleteCleaner}
            onEditTask={handleOpenEditTask}
          />
        )}

        {currentTab === 'pay' && (
          <PayAndInvoiceView
            tasks={tasks}
            cleaners={cleaners}
            onExportAllPay={handleExportAllPay}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-4 no-print transition-colors">
        <div className="max-w-7xl xl:max-w-[1760px] 2xl:max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-neutral-900 dark:text-white">DBuzzingBees</span>
            <span>·</span>
            <span>Cleaning Task & Scheduling Manager</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Signed in as <strong className="text-neutral-800 dark:text-neutral-200">{session.name}</strong> ({session.role})</span>
            <span>·</span>
            <button
              onClick={() => setStaffUsersModalOpen(true)}
              className="hover:underline text-neutral-600 dark:text-neutral-300 flex items-center gap-1"
            >
              <span>Staff Users</span>
            </button>
            <span>·</span>
            <button
              onClick={() => setImportExportModalOpen(true)}
              className="hover:underline text-amber-600 dark:text-amber-400"
            >
              Excel Backup
            </button>
          </div>
        </div>
      </footer>

      {/* Task Add / Edit Modal */}
      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onSave={handleSaveTask}
        taskToEdit={taskToEdit}
        cleaners={cleaners}
        defaultDate={taskModalDefaultDate}
        tasks={tasks}
      />

      {/* Import & Export Modal */}
      <ImportExportModal
        isOpen={importExportModalOpen}
        onClose={() => setImportExportModalOpen(false)}
        tasks={tasks}
        cleaners={cleaners}
        onImportComplete={handleImportComplete}
        onResetData={handleResetData}
      />

      {/* Staff Users Management Modal */}
      <StaffUsersModal
        isOpen={staffUsersModalOpen}
        onClose={() => setStaffUsersModalOpen(false)}
        currentUser={session}
      />

      {/* Send Confirmation Modal (WhatsApp, Messenger, SMS, Email, Clipboard) */}
      {confirmationModalOpen && (
        <SendConfirmationModal
          isOpen={confirmationModalOpen}
          onClose={() => {
            setConfirmationModalOpen(false);
            setConfirmationTask(null);
            setConfirmationBulkTasks(null);
          }}
          task={confirmationTask}
          tasks={confirmationBulkTasks || undefined}
          cleaners={cleaners}
          currentUser={session}
          onUpdateTask={handleUpdateTaskFromConfirmation}
          onBulkUpdateTasks={handleBulkUpdateTasksFromConfirmation}
        />
      )}

      {/* Auto-Scheduled Recurring Task Toast */}
      {recurringToast && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 max-w-md w-full p-4 rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-2xl border border-neutral-700 dark:border-neutral-200 flex items-start justify-between gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#FFB509] flex items-center justify-center text-neutral-950 shrink-0 mt-0.5 font-bold shadow-xs">
              <Repeat className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-sm">
                <span>{recurringToast.message}</span>
              </div>
              <p className="text-xs text-neutral-300 dark:text-neutral-600 mt-0.5 line-clamp-1">
                {recurringToast.address}
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-800 dark:bg-neutral-100 text-[11px] font-semibold text-amber-400 dark:text-amber-700">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Repeats across 3 months through <strong>{formatDate(recurringToast.date)}</strong></span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setRecurringToast(null)}
            className="p-1 rounded-lg text-neutral-400 hover:text-white dark:hover:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </aside>
      )}

      {/* Confirmation & Approval Action Toast */}
      {actionToast && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-5 left-5 z-50 max-w-md w-full p-4 rounded-2xl bg-white dark:bg-neutral-900 shadow-2xl border border-neutral-200 dark:border-neutral-800 flex items-start justify-between gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300"
        >
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 font-bold shadow-xs ${
              actionToast.type === 'error'
                ? 'bg-rose-100 dark:bg-rose-950 text-rose-600'
                : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600'
            }`}>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm text-neutral-900 dark:text-white">
                {actionToast.title}
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-0.5">
                {actionToast.message}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActionToast(null)}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </aside>
      )}

    </div>
  );
}
