import { Task, Cleaner, UserSession } from '../types';

const TASKS_STORAGE_KEY = 'dbuzzingbees_tasks_v1';
const CLEANERS_STORAGE_KEY = 'dbuzzingbees_cleaners_v1';
const SESSION_STORAGE_KEY = 'dbuzzingbees_session_v1';
const THEME_STORAGE_KEY = 'dbuzzingbees_theme_v1';

// Default session timeout: 30 minutes in milliseconds
export const DEFAULT_SESSION_DURATION_MS = 30 * 60 * 1000;

// Format helper: returns YYYY-MM-DD offset from today
export const getOffsetDate = (daysOffset: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
};

export const INITIAL_CLEANERS: Cleaner[] = [
  {
    id: 'cleaner-1',
    name: 'Maya Lin',
    phone: '0412 234 890',
    email: 'maya.lin@dbuzzingbees.com.au',
    hourlyRate: 32.00,
    specialTaskPayPerWeek: 60.00, // Lead cleaner / equipment upkeep allowance
    status: 'active',
    notes: 'Specialist in deep bond cleans and high-end residential.',
  },
  {
    id: 'cleaner-2',
    name: 'Marcus Sterling',
    phone: '0423 472 198',
    email: 'marcus.s@dbuzzingbees.com.au',
    hourlyRate: 30.00,
    specialTaskPayPerWeek: 40.00,
    status: 'active',
    notes: 'Handles window treatments, steam extraction, and commercial sites.',
  },
  {
    id: 'cleaner-3',
    name: 'Chloe Davies',
    phone: '0434 819 334',
    email: 'chloe.d@dbuzzingbees.com.au',
    hourlyRate: 28.50,
    specialTaskPayPerWeek: 35.00,
    status: 'active',
    notes: 'Fast turnaround specialist for Airbnb properties.',
  },
  {
    id: 'cleaner-4',
    name: 'Samira Khan',
    phone: '0455 623 771',
    email: 'samira.k@dbuzzingbees.com.au',
    hourlyRate: 31.00,
    specialTaskPayPerWeek: 50.00,
    status: 'active',
    notes: 'Expert in eco-friendly detailing and post-construction sanitization.',
  },
];

export const getInitialTasks = (): Task[] => [
  // Today's jobs
  {
    id: 'task-101',
    jobType: 'Residential Deep Clean',
    address: '742 George Street, Haymarket NSW 2000',
    clientName: 'The Henderson Family',
    clientPhone: '0412 734 110',
    fixHour: 4.0,
    rate: 65.00, // $65/hr charged to client
    payType: 'Hourly',
    invoiceNumber: 'INV-2026-101',
    assignedCleanerIds: ['cleaner-1', 'cleaner-3'],
    remarks: 'Side entrance buzzer #9812. Client requested citrus scrub for kitchen tiles. Friendly labradoodle inside.',
    date: getOffsetDate(0),
    startTime: '08:30',
    endTime: '12:30',
    frequency: 'fortnightly',
    completed: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-102',
    jobType: 'Commercial Office',
    address: '100 Innovation Parkway, Level 3, North Sydney NSW 2060',
    clientName: 'Apex Creative Studio',
    clientPhone: '0421 902 340',
    fixHour: 3.5,
    rate: 240.00, // Fixed price for office
    payType: 'Fixed Price',
    invoiceNumber: 'INV-2026-102',
    assignedCleanerIds: ['cleaner-2'],
    remarks: 'Empty all recycling bins, restock washroom supplies, sanitize glass boardroom. Keycard in lockbox.',
    date: getOffsetDate(0),
    startTime: '13:30',
    endTime: '17:00',
    frequency: 'weekly',
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-103',
    jobType: 'Airbnb Turnaround',
    address: '42 Manly Beach Promenade, Unit 12, Manly NSW 2095',
    clientName: 'Harbor Coastal Stays',
    clientPhone: '0433 612 882',
    fixHour: 2.5,
    rate: 60.00,
    payType: 'Hourly',
    invoiceNumber: 'INV-2026-103',
    assignedCleanerIds: ['cleaner-3'],
    remarks: 'Guests check in at 3 PM sharp. Fresh linen set in hallway cupboard, start wash cycle first.',
    date: getOffsetDate(0),
    startTime: '10:00',
    endTime: '12:30',
    frequency: 'one-off',
    completed: false,
    createdAt: new Date().toISOString(),
  },

  // Tomorrow & Next few days (Next two weeks schedule)
  {
    id: 'task-104',
    jobType: 'End of Lease / Bond',
    address: '88 Kensington Gardens Blvd, Kensington NSW 2033',
    clientName: 'Oliver Vance',
    clientPhone: '0445 431 992',
    fixHour: 6.0,
    rate: 420.00,
    payType: 'Fixed Price',
    invoiceNumber: 'INV-2026-104',
    assignedCleanerIds: ['cleaner-1', 'cleaner-4'],
    remarks: 'Full tenancy bond clean: oven, rangehood, window tracks, venetian blinds, and balcony wash.',
    date: getOffsetDate(1),
    startTime: '08:00',
    endTime: '14:00',
    frequency: 'one-off',
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-105',
    jobType: 'Residential Standard',
    address: '15 Maple Ridge Drive',
    clientName: 'Elena Rostova',
    clientPhone: '+1 (555) 789-2233',
    fixHour: 3.0,
    rate: 50.00,
    payType: 'Hourly',
    invoiceNumber: 'INV-2026-105',
    assignedCleanerIds: ['cleaner-2'],
    remarks: 'Vacuum hardwood floors with soft bristle attachment. Master bathroom needs lime descaling.',
    date: getOffsetDate(2),
    startTime: '09:00',
    endTime: '12:00',
    frequency: 'weekly',
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-106',
    jobType: 'Window Cleaning',
    address: '320 Pacific View Terrace',
    clientName: 'Dr. Gregory House',
    clientPhone: '+1 (555) 303-9111',
    fixHour: 2.0,
    rate: 60.00,
    payType: 'Hourly',
    invoiceNumber: 'INV-2026-106',
    assignedCleanerIds: ['cleaner-2'],
    remarks: 'Interior & exterior double hung windows. Ladder extension required for rear patio.',
    date: getOffsetDate(3),
    startTime: '10:00',
    endTime: '12:00',
    frequency: 'monthly',
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-107',
    jobType: 'Carpet & Upholstery Steam',
    address: '55 Starlight Crescent',
    clientName: 'Melinda Gates',
    clientPhone: '+1 (555) 543-8899',
    fixHour: 3.5,
    rate: 260.00,
    payType: 'Fixed Price',
    invoiceNumber: 'INV-2026-107',
    assignedCleanerIds: ['cleaner-4'],
    remarks: 'Steam extraction for 3 upstairs bedrooms and large wool rug in formal dining.',
    date: getOffsetDate(4),
    startTime: '13:00',
    endTime: '16:30',
    frequency: 'one-off',
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-108',
    jobType: 'Residential Standard',
    address: '14 Elm Creek Way',
    clientName: 'David & Sarah Chen',
    clientPhone: '+1 (555) 211-6677',
    fixHour: 2.5,
    rate: 52.00,
    payType: 'Hourly',
    invoiceNumber: 'INV-2026-108',
    assignedCleanerIds: ['cleaner-3'],
    remarks: 'Dust shutters, mop bamboo flooring, change guest room sheets.',
    date: getOffsetDate(5),
    startTime: '08:30',
    endTime: '11:00',
    frequency: 'weekly',
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-109',
    jobType: 'Commercial Office',
    address: '450 Technology Parkway, Bldg B',
    clientName: 'Vector Logistics',
    clientPhone: '+1 (555) 880-9900',
    fixHour: 4.0,
    rate: 280.00,
    payType: 'Fixed Price',
    invoiceNumber: 'INV-2026-109',
    assignedCleanerIds: ['cleaner-1', 'cleaner-2'],
    remarks: 'Weekend deep sanitation of cafeteria, dispatch terminals, and executive restrooms.',
    date: getOffsetDate(7),
    startTime: '09:00',
    endTime: '13:00',
    frequency: 'weekly',
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-110',
    jobType: 'Post-Construction',
    address: '12 Birchwood Heights (New Build)',
    clientName: 'Summit Custom Homes',
    clientPhone: '+1 (555) 678-0012',
    fixHour: 5.0,
    rate: 350.00,
    payType: 'Fixed Price',
    invoiceNumber: 'INV-2026-110',
    assignedCleanerIds: ['cleaner-1', 'cleaner-4'],
    remarks: 'Drywall dust removal from light fixtures, window tracks, paint speck scraping on mirrors.',
    date: getOffsetDate(9),
    startTime: '08:00',
    endTime: '13:00',
    frequency: 'one-off',
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-111',
    jobType: 'Airbnb Turnaround',
    address: '42 Marina Boardwalk, Unit 12',
    clientName: 'Harbor Vacations LLC',
    clientPhone: '+1 (555) 612-8821',
    fixHour: 2.5,
    rate: 55.00,
    payType: 'Hourly',
    invoiceNumber: 'INV-2026-111',
    assignedCleanerIds: ['cleaner-3'],
    remarks: 'Weekly scheduled turnaround. Stock coffee capsules & organic soaps.',
    date: getOffsetDate(10),
    startTime: '10:30',
    endTime: '13:00',
    frequency: 'weekly',
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-112',
    jobType: 'Residential Deep Clean',
    address: '204 Whispering Pines Court',
    clientName: 'Patricia Morales',
    clientPhone: '+1 (555) 322-7744',
    fixHour: 4.5,
    rate: 60.00,
    payType: 'Hourly',
    invoiceNumber: 'INV-2026-112',
    assignedCleanerIds: ['cleaner-4'],
    remarks: 'Spring scrub down, behind refrigerator, laundry room lint removal.',
    date: getOffsetDate(12),
    startTime: '08:30',
    endTime: '13:00',
    frequency: 'monthly',
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-113',
    jobType: 'Residential Standard',
    address: '742 Evergreen Terrace, Suite 4B',
    clientName: 'The Simpsons Family',
    clientPhone: '+1 (555) 734-1100',
    fixHour: 3.5,
    rate: 55.00,
    payType: 'Hourly',
    invoiceNumber: 'INV-2026-113',
    assignedCleanerIds: ['cleaner-1'],
    remarks: 'Fortnightly routine maintenance clean. Restock kitchen cloth towels.',
    date: getOffsetDate(14),
    startTime: '09:00',
    endTime: '12:30',
    frequency: 'fortnightly',
    completed: false,
    createdAt: new Date().toISOString(),
  },

  // Past completed jobs (for historical weekly pay calculations & reports)
  {
    id: 'task-098',
    jobType: 'Residential Standard',
    address: '15 Maple Ridge Drive',
    clientName: 'Elena Rostova',
    clientPhone: '+1 (555) 789-2233',
    fixHour: 3.0,
    rate: 50.00,
    payType: 'Hourly',
    invoiceNumber: 'INV-2026-098',
    assignedCleanerIds: ['cleaner-2'],
    remarks: 'Routine standard maintenance. Completed promptly.',
    date: getOffsetDate(-4),
    startTime: '09:00',
    endTime: '12:00',
    frequency: 'weekly',
    completed: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-099',
    jobType: 'Commercial Office',
    address: '100 Innovation Way, Floor 3',
    clientName: 'Apex Design Studio',
    clientPhone: '+1 (555) 902-3400',
    fixHour: 3.5,
    rate: 220.00,
    payType: 'Fixed Price',
    invoiceNumber: 'INV-2026-099',
    assignedCleanerIds: ['cleaner-2', 'cleaner-3'],
    remarks: 'Weekly mid-week office wipe-down and vacuum.',
    date: getOffsetDate(-3),
    startTime: '14:00',
    endTime: '17:30',
    frequency: 'weekly',
    completed: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-100',
    jobType: 'Residential Deep Clean',
    address: '610 Blossom Valley Lane',
    clientName: 'Arthur Dent',
    clientPhone: '+1 (555) 420-1979',
    fixHour: 5.0,
    rate: 65.00,
    payType: 'Hourly',
    invoiceNumber: 'INV-2026-100',
    assignedCleanerIds: ['cleaner-1', 'cleaner-4'],
    remarks: 'Deep bathroom grout restoration and kitchen degreasing.',
    date: getOffsetDate(-1),
    startTime: '08:30',
    endTime: '13:30',
    frequency: 'one-off',
    completed: true,
    createdAt: new Date().toISOString(),
  },
];

// Tasks Storage Operations
export const loadTasks = (): Task[] => {
  try {
    const raw = localStorage.getItem(TASKS_STORAGE_KEY);
    if (!raw) {
      const initial = getInitialTasks();
      saveTasks(initial);
      return initial;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load tasks from localStorage', err);
    return getInitialTasks();
  }
};

export const saveTasks = (tasks: Task[]): void => {
  try {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  } catch (err) {
    console.error('Failed to save tasks to localStorage', err);
  }
};

// Cleaners Storage Operations
export const loadCleaners = (): Cleaner[] => {
  try {
    const raw = localStorage.getItem(CLEANERS_STORAGE_KEY);
    if (!raw) {
      saveCleaners(INITIAL_CLEANERS);
      return INITIAL_CLEANERS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load cleaners from localStorage', err);
    return INITIAL_CLEANERS;
  }
};

export const saveCleaners = (cleaners: Cleaner[]): void => {
  try {
    localStorage.setItem(CLEANERS_STORAGE_KEY, JSON.stringify(cleaners));
  } catch (err) {
    console.error('Failed to save cleaners to localStorage', err);
  }
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
    
    // Check expiration timestamp
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
  const session: UserSession = {
    username,
    name: username === 'admin' ? 'Sarah Jenkins (Ops Manager)' : username,
    role: 'admin',
    loginTime: Date.now(),
    expiresAt: Date.now() + durationMs,
    rememberMe,
  };

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
    // Default to light or check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
};

export const saveTheme = (theme: 'light' | 'dark'): void => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (err) {
    console.error('Failed to save theme', err);
  }
};
