import { Task, Cleaner, UserSession, CleanerWeeklyPaymentRecord, PaymentTerm, StaffUser, StaffRole, CompanySettings } from '../types';
import { isWeekend, adjustDateStringToWeekday, toLocalDateString } from '../utils/formatters';
import { DEFAULT_COMPANY_SETTINGS } from '../utils/confirmationHelpers';

import { 
  fetchTasksFromFirestore, 
  saveTaskToFirestore, 
  saveTasksBatchToFirestore, 
  deleteTaskFromFirestore, 
  clearAllTasksInFirestore, 
  fetchCleanersFromFirestore, 
  saveCleanerToFirestore, 
  deleteCleanerFromFirestore, 
  clearAllCleanersInFirestore, 
  saveSettingsToFirestore, 
  saveStaffUserToFirestore 
} from './firebase';

const TASKS_STORAGE_KEY = 'dbuzzingbees_tasks_prod_v1';
const CLEANERS_STORAGE_KEY = 'dbuzzingbees_cleaners_prod_v1';
const SESSION_STORAGE_KEY = 'dbuzzingbees_session_v1';
const THEME_STORAGE_KEY = 'dbuzzingbees_theme_v1';
const CLEANER_PAYMENTS_STORAGE_KEY = 'dbuzzingbees_cleaner_weekly_payments_v1';
const USERS_STORAGE_KEY = 'dbuzzingbees_staff_users_v1';
const COMPANY_SETTINGS_STORAGE_KEY = 'dbuzzingbees_company_settings_v1';

// Default session timeout: 30 minutes in milliseconds
export const DEFAULT_SESSION_DURATION_MS = 30 * 60 * 1000;

// Format helper: returns YYYY-MM-DD offset from today
export const getOffsetDate = (daysOffset: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return toLocalDateString(d);
};

// Clean slate: no demo / sample records by default
export const INITIAL_CLEANERS: Cleaner[] = [];

export const getInitialTasks = (): Task[] => [];

// Clear all client and cleaner records for fresh manual testing
export const clearAllProductionRecords = async (): Promise<void> => {
  localStorage.removeItem(TASKS_STORAGE_KEY);
  localStorage.removeItem(CLEANERS_STORAGE_KEY);
  localStorage.removeItem(CLEANER_PAYMENTS_STORAGE_KEY);
  try {
    await Promise.all([
      clearAllTasksInFirestore(),
      clearAllCleanersInFirestore()
    ]);
  } catch (err) {
    console.warn('Firestore clearing error:', err);
  }
};

// Tasks Storage Operations
export const loadTasks = (): Task[] => {
  try {
    const raw = localStorage.getItem(TASKS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: Task[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((t: any) => {
      // 1. Restore Pay Type: must be 'Hourly' or 'Fixed Price'
      let restoredPayType = t.payType;
      if (restoredPayType === 'Cash' || restoredPayType === 'Invoice' || restoredPayType === 'Others') {
        restoredPayType = (t.rate > 150 || t.jobType?.includes('Commercial') || t.jobType?.includes('Bond') || t.jobType?.includes('Carpet'))
          ? 'Fixed Price'
          : 'Hourly';
      } else if (restoredPayType !== 'Hourly' && restoredPayType !== 'Fixed Price') {
        restoredPayType = 'Hourly';
      }

      // 2. Separate Payment Term: strictly 'Cash' or 'Invoice'
      let paymentTerm: PaymentTerm = 'Cash';
      if (t.paymentTerm === 'Cash' || t.paymentTerm === 'Invoice') {
        paymentTerm = t.paymentTerm;
      } else if (t.payType === 'Cash') {
        paymentTerm = 'Cash';
      } else if (t.payType === 'Invoice') {
        paymentTerm = 'Invoice';
      } else if (t.invoiceNumber && t.invoiceNumber.trim()) {
        paymentTerm = 'Invoice';
      }

      // 3. Recurrence settings
      const isRecurring = Boolean(
        t.isRecurring || 
        (t.frequency && t.frequency !== 'one-off' && t.frequency !== 'flexible' && t.frequency !== 'others')
      );

      // 4. Weekend enforcement: Recurring client tasks must never fall on Saturday or Sunday
      let adjustedDate = t.date;
      if (isRecurring && isWeekend(adjustedDate)) {
        adjustedDate = adjustDateStringToWeekday(adjustedDate, false);
      }

      return {
        ...t,
        date: adjustedDate,
        clientPhone: t.clientPhone || '',
        payType: restoredPayType,
        paymentTerm,
        isRecurring,
        seriesId: t.seriesId,
        isApproved: Boolean(t.isApproved),
        approvedBy: t.approvedBy,
        approvedAt: t.approvedAt,
        confirmationStatus: t.confirmationStatus || 'not_sent',
        confirmationDeliveryStatus: t.confirmationDeliveryStatus || (t.confirmationStatus === 'sent' ? 'sent' : 'pending'),
        confirmationRetryCount: t.confirmationRetryCount || 0,
        confirmationLastError: t.confirmationLastError,
        confirmationLogs: t.confirmationLogs || [],
      };
    });
  } catch (err) {
    console.error('Failed to load tasks from storage', err);
    return [];
  }
};

export const saveTasks = (tasks: Task[]): void => {
  try {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
    saveTasksBatchToFirestore(tasks).catch((err) => {
      console.warn('Firestore tasks sync notice:', err);
    });
  } catch (err) {
    console.error('Failed to save tasks', err);
  }
};

// Cleaner Weekly Payments Storage Operations (Persistent paid status & timestamp tracking)
export const loadCleanerWeeklyPayments = (): Record<string, CleanerWeeklyPaymentRecord> => {
  try {
    const raw = localStorage.getItem(CLEANER_PAYMENTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error('Failed to load cleaner weekly payments from storage', err);
    return {};
  }
};

export const saveCleanerWeeklyPayments = (payments: Record<string, CleanerWeeklyPaymentRecord>): void => {
  try {
    localStorage.setItem(CLEANER_PAYMENTS_STORAGE_KEY, JSON.stringify(payments));
  } catch (err) {
    console.error('Failed to save cleaner weekly payments to storage', err);
  }
};

// Cleaners Storage Operations
export const loadCleaners = (): Cleaner[] => {
  try {
    const raw = localStorage.getItem(CLEANERS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((c: any) => ({
      ...c,
      phone: c.phone || '',
    }));
  } catch (err) {
    console.error('Failed to load cleaners from storage', err);
    return [];
  }
};

export const saveCleaners = (cleaners: Cleaner[]): void => {
  try {
    localStorage.setItem(CLEANERS_STORAGE_KEY, JSON.stringify(cleaners));
    Promise.all(cleaners.map((c) => saveCleanerToFirestore(c))).catch((err) => {
      console.warn('Firestore cleaner sync notice:', err);
    });
  } catch (err) {
    console.error('Failed to save cleaners', err);
  }
};

// Staff Users Management
export const INITIAL_STAFF_USERS: StaffUser[] = [
  {
    id: 'user-admin',
    username: 'admin',
    name: 'Sarah Jenkins (Ops Manager)',
    password: 'buzzbee123',
    role: 'admin',
    email: 'sarah.jenkins@dbuzzingbees.com.au',
    phone: '+61 412 884 921',
    status: 'active',
    createdAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'user-manager',
    username: 'manager',
    name: 'Alex Rivera (Supervisor)',
    password: 'buzzbee123',
    role: 'manager',
    email: 'alex.rivera@dbuzzingbees.com.au',
    phone: '+61 434 551 882',
    status: 'active',
    createdAt: '2026-03-15T09:00:00.000Z',
  },
];

export const loadStaffUsers = (): StaffUser[] => {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      saveStaffUsers(INITIAL_STAFF_USERS);
      return INITIAL_STAFF_USERS;
    }
    const parsed: StaffUser[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      saveStaffUsers(INITIAL_STAFF_USERS);
      return INITIAL_STAFF_USERS;
    }
    return parsed;
  } catch (err) {
    console.error('Failed to load staff users', err);
    return INITIAL_STAFF_USERS;
  }
};

export const saveStaffUsers = (users: StaffUser[]): void => {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Failed to save staff users', err);
  }
};

export const authenticateUser = (username: string, password: string): StaffUser | null => {
  const users = loadStaffUsers();
  const cleanUsername = username.trim().toLowerCase();
  const found = users.find(
    (u) => u.username.toLowerCase() === cleanUsername && u.status === 'active'
  );
  if (!found) return null;
  const expectedPassword = found.password || 'buzzbee123';
  if (password === expectedPassword) {
    return found;
  }
  return null;
};

// Session & Auth Management
export const getActiveSession = (): UserSession | null => {
  try {
    // Check localStorage (for rememberMe) or sessionStorage
    const localRaw = localStorage.getItem(SESSION_STORAGE_KEY);
    const sessionRaw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    const raw = localRaw || sessionRaw;
    
    if (!raw) return null;
    const session: UserSession = JSON.parse(raw);
    
    // Check expiration timestamp (30 minutes of inactivity)
    const now = Date.now();
    if (session.expiresAt && now > session.expiresAt) {
      // Session has expired!
      clearSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
};

export const createSession = (
  username: string,
  rememberMe: boolean,
  durationMs: number = DEFAULT_SESSION_DURATION_MS
): UserSession => {
  const users = loadStaffUsers();
  const user = users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());

  const session: UserSession = {
    username: user ? user.username : username,
    name: user ? user.name : (username === 'admin' ? 'Sarah Jenkins (Ops Manager)' : username),
    role: user ? user.role : 'admin',
    loginTime: Date.now(),
    expiresAt: Date.now() + durationMs,
    rememberMe,
  };

  // Record last login timestamp
  if (user) {
    user.lastLogin = new Date().toISOString();
    saveStaffUsers(users);
  }

  const str = JSON.stringify(session);
  if (rememberMe) {
    localStorage.setItem(SESSION_STORAGE_KEY, str);
  } else {
    sessionStorage.setItem(SESSION_STORAGE_KEY, str);
  }

  return session;
};

export const extendSession = (durationMs: number = DEFAULT_SESSION_DURATION_MS): UserSession | null => {
  const current = getActiveSession();
  if (!current) return null;
  
  current.expiresAt = Date.now() + durationMs;
  const str = JSON.stringify(current);
  if (current.rememberMe) {
    localStorage.setItem(SESSION_STORAGE_KEY, str);
  } else {
    sessionStorage.setItem(SESSION_STORAGE_KEY, str);
  }
  return current;
};

export const clearSession = (): void => {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
};

// Theme Management
export const loadTheme = (): 'light' | 'dark' => {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    // Default to light
    return 'light';
  } catch {
    return 'light';
  }
};

export const saveTheme = (theme: 'light' | 'dark'): void => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  } catch (err) {
    console.error('Failed to save theme', err);
  }
};

// Company Settings & Confirmation Template Management
export const loadCompanySettings = (): CompanySettings => {
  try {
    const raw = localStorage.getItem(COMPANY_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_COMPANY_SETTINGS;
    return { ...DEFAULT_COMPANY_SETTINGS, ...JSON.parse(raw) };
  } catch (err) {
    console.error('Failed to load company settings', err);
    return DEFAULT_COMPANY_SETTINGS;
  }
};

export const saveCompanySettings = (settings: CompanySettings): void => {
  try {
    localStorage.setItem(COMPANY_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    saveSettingsToFirestore(settings).catch((err) => {
      console.warn('Firestore settings sync notice:', err);
    });
  } catch (err) {
    console.error('Failed to save company settings', err);
  }
};

// Global Confirmation Logs Cache
const CONFIRMATION_LOGS_STORAGE_KEY = 'dbuzzingbees_confirmation_logs_v1';

export const loadLocalConfirmationLogs = (): any[] => {
  try {
    const raw = localStorage.getItem(CONFIRMATION_LOGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveLocalConfirmationLogs = (logs: any[]): void => {
  try {
    localStorage.setItem(CONFIRMATION_LOGS_STORAGE_KEY, JSON.stringify(logs));
  } catch (err) {
    console.error('Failed to save confirmation logs locally:', err);
  }
};


