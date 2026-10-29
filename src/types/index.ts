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

export type ConfirmationStatus = 'not_sent' | 'sent' | 'confirmed' | 'needs_reschedule';

export type ConfirmationChannel = 'whatsapp' | 'messenger' | 'sms';

export interface ConfirmationLog {
  id: string;
  timestamp: string; // ISO string
  channel: ConfirmationChannel;
  staffName: string;
  staffUsername?: string;
  status: ConfirmationStatus;
  recipient: string; // phone number, messenger handle, etc.
  messagePreview?: string;
  notes?: string;
}

export interface Task {
  id: string;
  jobType: JobType | string;
  address: string;
  clientNumber?: string; // e.g. "BBA0098"
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  clientMessenger?: string; // e.g. "sarah.smith" or Facebook profile/page link
  clientPreferredChannel?: 'whatsapp' | 'messenger' | 'sms' | 'any';
  fixHour: number; // e.g. 3.5 hrs
  rate: number; // charge rate e.g. $45/hr or fixed $160
  payType: PayType; // Hourly or Fixed Price
  paymentTerm: PaymentTerm; // Cash or Invoice
  invoiceNumber: string; // e.g. "INV-2026-101"
  assignedCleanerIds: string[]; // cleaner IDs
  remarks: string;
  specialInstructions?: string; // Add-ons, key codes, pets, alarms, specific requests
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
  
  // Confirmation state
  confirmationStatus?: ConfirmationStatus;
  confirmationLogs?: ConfirmationLog[];
  lastConfirmationSentAt?: string;
  lastConfirmationChannel?: ConfirmationChannel;
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

export type StaffRole = 'admin' | 'manager' | 'supervisor' | 'staff';

export interface StaffUser {
  id: string;
  username: string;
  name: string;
  password?: string;
  role: StaffRole;
  email?: string;
  phone?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  lastLogin?: string;
}

export interface UserSession {
  username: string;
  name: string;
  role: StaffRole | string;
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

export interface ConfirmationTemplate {
  id: string;
  name: string;
  content: string;
  isDefault?: boolean;
}

export interface CompanySettings {
  businessName: string;
  contactPhone: string;
  contactEmail: string;
  facebookPage: string; // Facebook Page username or ID for m.me link
  confirmationMessageTemplate: string;
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
