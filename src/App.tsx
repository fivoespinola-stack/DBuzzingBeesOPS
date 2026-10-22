import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { LoginPage } from './components/LoginPage';
import { DashboardView } from './components/DashboardView';
import { TaskListView } from './components/TaskListView';
import { CalendarView } from './components/CalendarView';
import { CleanerManagementView } from './components/CleanerManagementView';
import { PayAndInvoiceView } from './components/PayAndInvoiceView';
import { TaskModal } from './components/TaskModal';
import { ImportExportModal } from './components/ImportExportModal';

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
  getInitialTasks
} from './services/storage';
import { exportAllDataToExcel } from './services/excelService';

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(loadTheme());

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

  // Initialize theme on mount
  useEffect(() => {
    saveTheme(theme);
  }, [theme]);

  // Reference for session to allow interval without re-subscribing on every state tick
  const sessionRef = React.useRef<UserSession | null>(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Check session on mount and listen to periodic expiration checks
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
        // Session expired!
        setSession(null);
        setTasks([]);
        setCleaners([]);
        setSessionExpiredMessage('Your session timed out due to security inactivity. Please sign in again.');
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

  const handleSimulateExpire = () => {
    clearSession();
    setSession(null);
    setTasks([]);
    setCleaners([]);
    setSessionExpiredMessage('Security check: Simulated session timeout triggered. Redirected back to sign-in page.');
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

  const handleSaveTask = (savedTask: Task) => {
    setTasks((prev) => {
      const exists = prev.some((t) => t.id === savedTask.id);
      const updated = exists
        ? prev.map((t) => (t.id === savedTask.id ? savedTask : t))
        : [savedTask, ...prev];
      saveTasks(updated);
      return updated;
    });
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => {
      const updated = prev.filter((t) => t.id !== taskId);
      saveTasks(updated);
      return updated;
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

  const handleResetData = () => {
    const initialTasks = getInitialTasks();
    setTasks(initialTasks);
    saveTasks(initialTasks);
    setCleaners(INITIAL_CLEANERS);
    saveCleaners(INITIAL_CLEANERS);
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
        onSimulateExpire={handleSimulateExpire}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenImportExport={() => setImportExportModalOpen(true)}
        pendingTasksCount={pendingTasksCount}
      />

      {/* Main Content Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16">
        
        {currentTab === 'dashboard' && (
          <DashboardView
            tasks={tasks}
            cleaners={cleaners}
            onToggleComplete={handleToggleComplete}
            onEditTask={handleOpenEditTask}
            onAddNewTask={handleOpenAddNewTask}
            onOpenImportExport={() => setImportExportModalOpen(true)}
            onNavigateToTab={(tab) => setCurrentTab(tab)}
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
          />
        )}

        {currentTab === 'calendar' && (
          <CalendarView
            tasks={tasks}
            cleaners={cleaners}
            onToggleComplete={handleToggleComplete}
            onEditTask={handleOpenEditTask}
            onAddNewTask={handleOpenAddNewTask}
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-neutral-900 dark:text-white">DBuzzingBees</span>
            <span>·</span>
            <span>Cleaning Task & Scheduling Manager</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Signed in as <strong className="text-neutral-800 dark:text-neutral-200">{session.name}</strong></span>
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

    </div>
  );
}
