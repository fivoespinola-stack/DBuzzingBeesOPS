import { Task, Cleaner, CompanySettings, ConfirmationChannel, ConfirmationStatus } from '../types';
import { formatDateLong, formatTime12h } from './formatters';

export const DEFAULT_CONFIRMATION_TEMPLATE = `🐝 DBuzzingBees Cleaning Service Confirmation

Hi {{clientName}},

This is a friendly confirmation for your upcoming cleaning booking with DBuzzingBees:

📅 Date: {{date}}
⏰ Time: {{startTime}} – {{endTime}} (approx. {{duration}})
🧹 Service: {{serviceType}}
📍 Address: {{address}}
👥 Assigned Team: {{cleaners}}
📝 Special Notes / Add-ons: {{specialInstructions}}

👉 Please reply YES to confirm your booking, or message us here if you need to reschedule or have any special requests.

Warm regards,
{{businessName}}
📞 {{businessPhone}}`;

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  businessName: 'DBuzzingBees Cleaning Operations',
  contactPhone: '+61 400 123 456',
  contactEmail: 'hello@dbuzzingbees.com.au',
  facebookPage: 'dbuzzingbees',
  confirmationMessageTemplate: DEFAULT_CONFIRMATION_TEMPLATE,
};

/**
 * Auto-formats Australian mobile numbers to international standard (+61 4XX XXX XXX)
 * e.g. 0412 884 921 -> +61 412 884 921
 *      0412884921   -> +61 412 884 921
 *      412884921    -> +61 412 884 921
 * Also formats dynamically as the user types or on paste/blur.
 */
export const formatAustralianPhoneNumber = (raw: string): string => {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  // If user cleared the input down to just "+", "+6", "+61", or "+61 ", allow clearing
  if (trimmed === '+' || trimmed === '+6' || trimmed === '+61' || trimmed === '+61 ') {
    return '';
  }

  // Extract all digits
  let digits = raw.replace(/\D/g, '');
  if (!digits) return '';

  // If user only typed '6' or '61', and raw doesn't have more, clear
  if (digits === '6' || digits === '61') {
    return raw.startsWith('+') ? raw : '';
  }

  // If user entered numbers starting with 04...
  if (digits.startsWith('04')) {
    digits = '614' + digits.substring(2);
  } else if (digits.startsWith('4') && digits.length <= 9) {
    digits = '61' + digits;
  } else if (digits.startsWith('0') && digits.length >= 10 && !digits.startsWith('04')) {
    // Australian landlines (02, 03, 07, 08)
    digits = '61' + digits.substring(1);
  }

  // If it starts with 614 (Australian mobile):
  if (digits.startsWith('614')) {
    const mobileDigits = digits.substring(2); // starts with 4
    const p1 = mobileDigits.substring(0, 3); // 4XX
    const p2 = mobileDigits.substring(3, 6); // XXX
    const p3 = mobileDigits.substring(6, 9); // XXX
    const extra = mobileDigits.substring(9); // extra digits if any

    let res = '+61 ' + p1;
    if (p2) res += ' ' + p2;
    if (p3) res += ' ' + p3;
    if (extra) res += extra;
    return res;
  }

  // If it starts with 61 and another digit (e.g. landline 612, 613, etc.):
  if (digits.startsWith('61') && digits.length > 2) {
    const area = digits.substring(2, 3);
    const p1 = digits.substring(3, 7);
    const p2 = digits.substring(7, 11);
    const extra = digits.substring(11);
    let res = `+61 ${area}`;
    if (p1) res += ` ${p1}`;
    if (p2) res += ` ${p2}`;
    if (extra) res += extra;
    return res;
  }

  // If input started with '+' but is international:
  if (raw.startsWith('+')) {
    return raw;
  }

  // If 10 digits starting with 0 (standard national format):
  if (digits.length === 10 && digits.startsWith('0')) {
    return `+61 ${digits.substring(1, 4)} ${digits.substring(4, 7)} ${digits.substring(7)}`;
  }

  return raw;
};

/**
 * Normalizes phone numbers for WhatsApp wa.me links
 * Handles Australian mobile formatting (e.g. 0412 884 921 -> 61412884921)
 */
export const cleanPhoneNumberForWhatsApp = (rawPhone: string): string => {
  if (!rawPhone) return '';
  let digits = rawPhone.replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 10) {
    digits = '61' + digits.substring(1);
  } else if (digits.startsWith('4') && digits.length === 9) {
    digits = '61' + digits;
  }
  return digits;
};

/**
 * Normalizes phone numbers for SMS links
 */
export const cleanPhoneNumberForSms = (rawPhone: string): string => {
  if (!rawPhone) return '';
  return rawPhone.replace(/[\s()-]/g, '');
};

/**
 * Compiles a personalized confirmation message by substituting placeholders
 */
export const generateConfirmationMessage = (
  task: Task,
  cleaners: Cleaner[],
  companySettings?: CompanySettings,
  templateString?: string
): string => {
  const settings = companySettings || DEFAULT_COMPANY_SETTINGS;
  const template = templateString || settings.confirmationMessageTemplate || DEFAULT_CONFIRMATION_TEMPLATE;

  // Resolve assigned cleaners names
  const cleanerNames = (task.assignedCleanerIds || [])
    .map((id) => cleaners.find((c) => c.id === id)?.name || id)
    .filter(Boolean);
  const cleanersFormatted = cleanerNames.length > 0 ? cleanerNames.join(', ') : 'DBuzzingBees Professional Cleaning Specialist';

  // Format date and times
  const dateFormatted = task.date ? formatDateLong(task.date) : 'Upcoming Scheduled Date';
  const startTimeFormatted = task.startTime ? formatTime12h(task.startTime) : '09:00 AM';
  const endTimeFormatted = task.endTime ? formatTime12h(task.endTime) : '12:00 PM';
  const durationFormatted = task.fixHour ? `${task.fixHour} hr${task.fixHour > 1 ? 's' : ''}` : '3 hrs';
  
  const specialNotes = task.specialInstructions?.trim() || task.remarks?.trim() || 'Standard professional clean per service agreement.';

  return template
    .replace(/\{\{clientName\}\}/g, task.clientName?.trim() || 'Valued Client')
    .replace(/\{\{serviceType\}\}/g, task.jobType || 'Residential Cleaning')
    .replace(/\{\{date\}\}/g, dateFormatted)
    .replace(/\{\{startTime\}\}/g, startTimeFormatted)
    .replace(/\{\{endTime\}\}/g, endTimeFormatted)
    .replace(/\{\{duration\}\}/g, durationFormatted)
    .replace(/\{\{address\}\}/g, task.address || 'Address on file')
    .replace(/\{\{cleaners\}\}/g, cleanersFormatted)
    .replace(/\{\{specialInstructions\}\}/g, specialNotes)
    .replace(/\{\{businessName\}\}/g, settings.businessName)
    .replace(/\{\{businessPhone\}\}/g, settings.contactPhone);
};

/**
 * Generates WhatsApp wa.me direct link
 */
export const buildWhatsAppLink = (rawPhone: string, message: string): string => {
  const cleaned = cleanPhoneNumberForWhatsApp(rawPhone);
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
};

/**
 * Generates Messenger direct deep link (m.me)
 */
export const buildMessengerLink = (
  clientMessenger?: string,
  facebookPage?: string,
  message?: string
): string => {
  let target = clientMessenger?.trim() || facebookPage?.trim() || 'dbuzzingbees';
  // Strip any full URL prefix if entered by user
  target = target.replace(/^https?:\/\/(www\.)?(m\.me|facebook\.com)\//i, '').replace(/\/$/, '');
  
  if (message) {
    return `https://m.me/${encodeURIComponent(target)}?text=${encodeURIComponent(message)}`;
  }
  return `https://m.me/${encodeURIComponent(target)}`;
};

/**
 * Generates SMS deep link with body
 */
export const buildSmsLink = (rawPhone: string, message: string): string => {
  const cleaned = cleanPhoneNumberForSms(rawPhone);
  // Using both standard and iOS delimiter for maximum cross-device compatibility
  const encoded = encodeURIComponent(message);
  return `sms:${cleaned}?body=${encoded}`;
};

/**
 * Generates email mailto: link with prefilled subject and body
 */
export const buildEmailLink = (email: string, subject: string, message: string): string => {
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
};

/**
 * Evaluates whether a channel is available for a given task
 */
export const checkChannelAvailability = (
  channel: ConfirmationChannel,
  task: Task,
  companySettings?: CompanySettings
): { available: boolean; reason?: string; recipient: string } => {
  const phone = task.clientPhone?.trim();
  const messenger = task.clientMessenger?.trim();
  const email = task.clientEmail?.trim();
  const fbPage = companySettings?.facebookPage?.trim() || DEFAULT_COMPANY_SETTINGS.facebookPage;

  if (channel === 'whatsapp') {
    if (!phone) {
      return { available: false, reason: 'No client phone number saved', recipient: '' };
    }
    const clean = cleanPhoneNumberForWhatsApp(phone);
    if (clean.length < 8) {
      return { available: false, reason: 'Client phone number is too short or invalid', recipient: phone };
    }
    return { available: true, recipient: phone };
  }

  if (channel === 'sms') {
    if (!phone) {
      return { available: false, reason: 'No client mobile number saved', recipient: '' };
    }
    return { available: true, recipient: phone };
  }

  if (channel === 'messenger') {
    if (messenger) {
      return { available: true, recipient: messenger };
    }
    if (fbPage) {
      return { 
        available: true, 
        reason: 'Uses DBuzzingBee Facebook Page inbox', 
        recipient: `@${fbPage}` 
      };
    }
    return { available: false, reason: 'No Messenger username or company page configured', recipient: '' };
  }

  if (channel === 'email') {
    if (!email) {
      return { available: false, reason: 'No client email address saved', recipient: '' };
    }
    if (!email.includes('@')) {
      return { available: false, reason: 'Invalid email address', recipient: email };
    }
    return { available: true, recipient: email };
  }

  return { available: false, reason: 'Unknown channel', recipient: '' };
};

/**
 * Checks if staff role has permission to send client confirmations
 */
export const canSendConfirmation = (role?: string): boolean => {
  if (!role) return false;
  const normalized = role.toLowerCase();
  return normalized === 'admin' || normalized === 'manager' || normalized === 'supervisor';
};

/**
 * Returns human-readable label and styling info for confirmation statuses
 */
export const getConfirmationStatusMeta = (status?: ConfirmationStatus) => {
  switch (status) {
    case 'confirmed':
      return {
        label: 'Confirmed',
        bgClass: 'bg-emerald-50 dark:bg-emerald-950/60',
        textClass: 'text-emerald-700 dark:text-emerald-300',
        borderClass: 'border-emerald-200 dark:border-emerald-800',
        dotClass: 'bg-emerald-500',
      };
    case 'sent':
      return {
        label: 'Confirmation Sent',
        bgClass: 'bg-blue-50 dark:bg-blue-950/60',
        textClass: 'text-blue-700 dark:text-blue-300',
        borderClass: 'border-blue-200 dark:border-blue-800',
        dotClass: 'bg-blue-500',
      };
    case 'needs_reschedule':
      return {
        label: 'Needs Reschedule',
        bgClass: 'bg-rose-50 dark:bg-rose-950/60',
        textClass: 'text-rose-700 dark:text-rose-300',
        borderClass: 'border-rose-200 dark:border-rose-800',
        dotClass: 'bg-rose-500',
      };
    case 'not_sent':
    default:
      return {
        label: 'Not Sent',
        bgClass: 'bg-neutral-100 dark:bg-neutral-800',
        textClass: 'text-neutral-600 dark:text-neutral-400',
        borderClass: 'border-neutral-200 dark:border-neutral-700',
        dotClass: 'bg-neutral-400',
      };
  }
};
