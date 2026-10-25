export type JobType = 
  | 'Residential Standard'
  | 'Residential Deep Clean'
  | 'End of Lease / Bond'
  | 'Commercial Office'
  | 'Airbnb Turnaround'
  | 'Window Cleaning'
  | 'Carpet & Upholstery Steam'
  | 'Post-Construction';

export type PayType = 'Hourly' | 'Fixed Price' | string;

export type PaymentTerm = 'Cash' | 'Invoice';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';

export type Frequency = 
  | 'one-off' 
  | 'twice-a-week'
  | 'weekly' 
  | 'fortnightly' 
  | 'every-3rd-week'
  | 'monthly' 
  | 'end-of-month'
  | 'every-2-months'
  | 'flexible'
  | 'others'
  | string;

export interface Task {
  id: string;
  jobType: JobType | string;
  address: string;
  clientNumber?: string; // e.g. "BBA0098"
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  fixHour: number; // e.g. 3.5 hrs
  rate: number; // charge rate e.g. $45/hr or fixed $160
  payType: PayType; // Hourly or Fixed Price
  paymentTerm: PaymentTerm; // Cash or Invoice
  invoiceNumber: string; // e.g. "INV-2026-101"
  assignedCleanerIds: string[]; // cleaner IDs
  remarks: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  frequency: Frequency;
  completed: boolean;
  createdAt: string;
  isRecurring?: boolean;
  recurrence?: RecurrenceType;
  nextInstanceGenerated?: boolean;
  seriesId?: string;
}

export interface Cleaner {
  id: string;
  name: string;
  phone: string;
  email: string;
  hourlyRate: number; // pay rate to cleaner $/hr (e.g. 28)
  specialTaskPayPerWeek: number; // weekly extra stipend for special tasks/lead/hazmat (e.g. $50)
  status: 'active' | 'inactive';
  notes?: string;
}

export interface UserSession {
  username: string;
  name: string;
  role: 'admin' | 'manager';
  loginTime: number;
  expiresAt: number; // timestamp
  rememberMe: boolean;
}

export interface CleanerPaySummary {
  cleanerId: string;
  cleanerName: string;
  hourlyRate: number;
  completedHours: number;
  scheduledHours: number;
  regularPay: number;
  specialTaskPay: number;
  totalPay: number;
  totalInvoiced: number;
  margin: number;
  taskCount: number;
  tasks: Task[];
}

export interface CleanerWeeklyPaymentRecord {
  isPaid: boolean;
  paidAt?: string;
}

export interface ImportPreviewRow {
  rowNumber: number;
  jobType: string;
  address: string;
  clientNumber?: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  date: string;
  startTime: string;
  endTime: string;
  fixHour: number;
  rate: number;
  payType: PayType;
  paymentTerm: PaymentTerm;
  invoiceNumber: string;
  frequency: Frequency;
  assignedCleaners: string[];
  remarks: string;
  isValid: boolean;
  errors: string[];
}
