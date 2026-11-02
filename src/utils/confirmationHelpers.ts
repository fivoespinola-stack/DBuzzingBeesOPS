import { Task, Cleaner, CompanySettings, ConfirmationChannel, ConfirmationStatus } from '../types';
import { formatDateLong, formatTime12h, formatDate } from './formatters';

export const DEFAULT_CONFIRMATION_SUBJECT = 'Cleaning Service Booking Confirmed';

export const DEFAULT_CONFIRMATION_TEMPLATE = `Hello [Client Name],

Thank you for booking with DBuzzingBees.

Your cleaning service has been confirmed.

Service Date: [Date]
Service Time: [Time]
Cleaner: [Cleaner Name]
Address: [Service Address]

If you need to reschedule or have any questions, please contact us.

Thank you for choosing DBuzzingBees.

Best regards,
DBuzzingBees Team`;

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  businessName: 'DBuzzingBees',
  contactPhone: '+61 400 123 456',
  contactEmail: 'hello@dbuzzingbees.com.au',
  facebookPage: 'dbuzzingbees',
  confirmationSubjectTemplate: DEFAULT_CONFIRMATION_SUBJECT,
  confirmationMessageTemplate: DEFAULT_CONFIRMATION_TEMPLATE,
  enablePaidSms: false, // Default false: Avoid paid SMS unless the administrator enables it
  autoSendOnApproval: false, // Default false: Do not auto-send on approval; confirmations sent via 1-Click Send
  primaryConfirmationChannel: 'email', // Email first (free)
  fallbackChannel: 'whatsapp', // Then optionally WhatsApp or Messenger
  maxEmailRetries: 3, // Retry sending if email fails
  reschedulePageUrl: '',
};

/**
 * Auto-formats Australian mobile numbers to international standard (+61 4XX XXX XXX)
 * e.g. 0412 884 921 -> +61 412 884 921
 */
export const formatAustralianPhoneNumber = (raw: string): string => {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  if (trimmed === '+' || trimmed === '+6' || trimmed === '+61' || trimmed === '+61 ') {
    return '';
  }

  let digits = raw.replace(/\D/g, '');
  if (!digits) return '';

  if (digits === '6' || digits === '61') {
    return raw.startsWith('+') ? raw : '';
  }

  if (digits.startsWith('04')) {
    digits = '614' + digits.substring(2);
  } else if (digits.startsWith('4') && digits.length <= 9) {
    digits = '61' + digits;
  } else if (digits.startsWith('0') && digits.length >= 10 && !digits.startsWith('04')) {
    digits = '61' + digits.substring(1);
  }

  if (digits.startsWith('614')) {
    const mobileDigits = digits.substring(2);
    const p1 = mobileDigits.substring(0, 3);
    const p2 = mobileDigits.substring(3, 6);
    const p3 = mobileDigits.substring(6, 9);
    const extra = mobileDigits.substring(9);

    let res = '+61 ' + p1;
    if (p2) res += ' ' + p2;
    if (p3) res += ' ' + p3;
    if (extra) res += extra;
    return res;
  }

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

  if (raw.startsWith('+')) {
    return raw;
  }

  if (digits.length === 10 && digits.startsWith('0')) {
    return `+61 ${digits.substring(1, 4)} ${digits.substring(4, 7)} ${digits.substring(7)}`;
  }

  return raw;
};

/**
 * Normalizes phone numbers for WhatsApp wa.me links
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
 * Builds direct reschedule link (prefilled email or WhatsApp)
 */
export const buildRescheduleLink = (
  task: Task,
  companySettings?: CompanySettings
): string => {
  const settings = companySettings || DEFAULT_COMPANY_SETTINGS;
  if (settings.reschedulePageUrl && settings.reschedulePageUrl.trim()) {
    const baseUrl = settings.reschedulePageUrl.trim();
    const joiner = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${joiner}bookingId=${encodeURIComponent(task.id)}&client=${encodeURIComponent(task.clientName || '')}`;
  }

  const subject = `Reschedule Request: Booking for ${task.clientName || 'Client'} on ${task.date ? formatDate(task.date) : 'Upcoming Date'}`;
  const body = `Hello DBuzzingBees Team,\n\nI would like to request a reschedule for my cleaning booking:\nBooking ID: ${task.id}\nCurrent Date: ${task.date || 'N/A'}\nAddress: ${task.address}\n\nMy preferred new date/time:\n\nThank you,\n${task.clientName || 'Client'}`;
  
  return `mailto:${encodeURIComponent(settings.contactEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

/**
 * Builds direct Contact Us link
 */
export const buildContactLink = (
  task?: Task,
  companySettings?: CompanySettings
): string => {
  const settings = companySettings || DEFAULT_COMPANY_SETTINGS;
  if (settings.contactPhone) {
    return `tel:${cleanPhoneNumberForSms(settings.contactPhone)}`;
  }
  return `mailto:${encodeURIComponent(settings.contactEmail)}?subject=Inquiry%20regarding%20cleaning%20service`;
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
  const timeFormatted = `${startTimeFormatted} - ${endTimeFormatted}`;
  const durationFormatted = task.fixHour ? `${task.fixHour} hr${task.fixHour > 1 ? 's' : ''}` : '3 hrs';
  const specialNotes = task.specialInstructions?.trim() || task.remarks?.trim() || 'Standard professional clean per service agreement.';

  return template
    // Bracket placeholders
    .replace(/\[Client Name\]/g, task.clientName?.trim() || 'Valued Client')
    .replace(/\[Date\]/g, dateFormatted)
    .replace(/\[Time\]/g, timeFormatted)
    .replace(/\[Cleaner Name\]/g, cleanersFormatted)
    .replace(/\[Service Address\]/g, task.address || 'Address on file')
    // Mustache placeholders
    .replace(/\{\{clientName\}\}/g, task.clientName?.trim() || 'Valued Client')
    .replace(/\{\{serviceType\}\}/g, task.jobType || 'Residential Cleaning')
    .replace(/\{\{date\}\}/g, dateFormatted)
    .replace(/\{\{startTime\}\}/g, startTimeFormatted)
    .replace(/\{\{endTime\}\}/g, endTimeFormatted)
    .replace(/\{\{time\}\}/g, timeFormatted)
    .replace(/\{\{duration\}\}/g, durationFormatted)
    .replace(/\{\{address\}\}/g, task.address || 'Address on file')
    .replace(/\{\{cleaners\}\}/g, cleanersFormatted)
    .replace(/\{\{specialInstructions\}\}/g, specialNotes)
    .replace(/\{\{businessName\}\}/g, settings.businessName)
    .replace(/\{\{businessPhone\}\}/g, settings.contactPhone);
};

/**
 * Generates Subject Line for the Booking Confirmation Email
 */
export const generateConfirmationSubject = (
  task: Task,
  companySettings?: CompanySettings
): string => {
  const settings = companySettings || DEFAULT_COMPANY_SETTINGS;
  const base = settings.confirmationSubjectTemplate || DEFAULT_CONFIRMATION_SUBJECT;
  return base;
};

/**
 * Generates Rich HTML Email with "Reschedule" and "Contact Us" buttons
 */
export const generateConfirmationHtml = (
  task: Task,
  cleaners: Cleaner[],
  companySettings?: CompanySettings
): string => {
  const settings = companySettings || DEFAULT_COMPANY_SETTINGS;
  const cleanerNames = (task.assignedCleanerIds || [])
    .map((id) => cleaners.find((c) => c.id === id)?.name || id)
    .filter(Boolean);
  const cleanersFormatted = cleanerNames.length > 0 ? cleanerNames.join(', ') : 'DBuzzingBees Professional Cleaning Specialist';
  const dateFormatted = task.date ? formatDateLong(task.date) : 'Upcoming Scheduled Date';
  const startTimeFormatted = task.startTime ? formatTime12h(task.startTime) : '09:00 AM';
  const endTimeFormatted = task.endTime ? formatTime12h(task.endTime) : '12:00 PM';
  const clientName = task.clientName?.trim() || 'Valued Client';
  const address = task.address || 'Address on file';
  const rescheduleUrl = buildRescheduleLink(task, settings);
  const contactUrl = buildContactLink(task, settings);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cleaning Service Booking Confirmed</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f7f8; margin: 0; padding: 24px; color: #1f2937; line-height: 1.5; }
    .email-container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: #FFB509; padding: 28px 24px; text-align: center; }
    .logo-badge { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; background: #18181b; border-radius: 12px; margin-bottom: 8px; }
    .brand-title { margin: 0; font-size: 24px; font-weight: 800; color: #18181b; letter-spacing: -0.5px; }
    .content { padding: 32px 28px; }
    .greeting { font-size: 18px; font-weight: 600; color: #111827; margin-top: 0; margin-bottom: 16px; }
    .summary-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 24px 0; }
    .summary-row { display: flex; margin-bottom: 10px; font-size: 14px; }
    .summary-row:last-child { margin-bottom: 0; }
    .summary-label { width: 120px; font-weight: 600; color: #4b5563; }
    .summary-value { font-weight: 500; color: #111827; flex: 1; }
    .btn-container { margin: 28px 0; display: flex; gap: 12px; flex-wrap: wrap; }
    .btn-reschedule { display: inline-block; padding: 12px 22px; background-color: #ffffff; color: #1f2937; border: 2px solid #d1d5db; border-radius: 10px; font-weight: 600; font-size: 14px; text-decoration: none; text-align: center; }
    .btn-reschedule:hover { background-color: #f3f4f6; }
    .btn-contact { display: inline-block; padding: 12px 22px; background-color: #18181b; color: #ffffff; border-radius: 10px; font-weight: 600; font-size: 14px; text-decoration: none; text-align: center; }
    .btn-contact:hover { background-color: #27272a; }
    .footer { padding: 20px 28px; background: #fafafa; border-top: 1px solid #f3f4f6; font-size: 12px; color: #6b7280; text-align: center; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="logo-badge">
        <span style="font-size: 22px;">🐝</span>
      </div>
      <h1 class="brand-title">DBuzzingBees</h1>
      <p style="margin: 4px 0 0; font-size: 13px; color: #3f3f46; font-weight: 600;">Booking Confirmation</p>
    </div>

    <div class="content">
      <p class="greeting">Hello ${clientName},</p>
      
      <p style="margin: 0 0 12px; font-size: 15px; color: #374151;">
        Thank you for booking with DBuzzingBees.
      </p>
      
      <p style="margin: 0 0 16px; font-size: 15px; color: #10b981; font-weight: 600;">
        ✔ Your cleaning service has been confirmed.
      </p>

      <div class="summary-card">
        <div class="summary-row">
          <span class="summary-label">Service Date:</span>
          <span class="summary-value">${dateFormatted}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Service Time:</span>
          <span class="summary-value">${startTimeFormatted} – ${endTimeFormatted}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Cleaner:</span>
          <span class="summary-value">${cleanersFormatted}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Address:</span>
          <span class="summary-value">${address}</span>
        </div>
        ${task.jobType ? `
        <div class="summary-row">
          <span class="summary-label">Service Type:</span>
          <span class="summary-value">${task.jobType}</span>
        </div>` : ''}
      </div>

      <p style="margin: 16px 0; font-size: 14px; color: #4b5563;">
        If you need to reschedule or have any questions, please contact us.
      </p>

      <div class="btn-container">
        <a href="${rescheduleUrl}" class="btn-reschedule">📅 Reschedule</a>
        <a href="${contactUrl}" class="btn-contact">📞 Contact Us</a>
      </div>

      <p style="margin: 20px 0 0; font-size: 14px; color: #374151;">
        Thank you for choosing DBuzzingBees.
      </p>

      <p style="margin: 16px 0 0; font-size: 14px; color: #111827; font-weight: 600;">
        Best regards,<br>
        <span style="color: #d97706;">DBuzzingBees Team</span>
      </p>
    </div>

    <div class="footer">
      <p style="margin: 0 0 4px;">DBuzzingBees Professional Cleaning Operations</p>
      <p style="margin: 0;">Phone: ${settings.contactPhone} &bull; Email: ${settings.contactEmail}</p>
    </div>
  </div>
</body>
</html>`;
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
 * Evaluates whether a channel is available for a given task,
 * enforcing administrator cost protection (SMS disabled by default).
 */
export const checkChannelAvailability = (
  channel: ConfirmationChannel,
  task: Task,
  companySettings?: CompanySettings
): { available: boolean; reason?: string; recipient: string; isPaid?: boolean } => {
  const settings = companySettings || DEFAULT_COMPANY_SETTINGS;
  const phone = task.clientPhone?.trim();
  const messenger = task.clientMessenger?.trim();
  const email = task.clientEmail?.trim();
  const fbPage = settings.facebookPage?.trim() || DEFAULT_COMPANY_SETTINGS.facebookPage;

  if (channel === 'email') {
    if (!email) {
      return { available: false, reason: 'No client email address saved', recipient: '' };
    }
    if (!email.includes('@')) {
      return { available: false, reason: 'Invalid email address', recipient: email };
    }
    return { available: true, recipient: email, isPaid: false };
  }

  if (channel === 'whatsapp') {
    if (!phone) {
      return { available: false, reason: 'No client phone number saved', recipient: '' };
    }
    const clean = cleanPhoneNumberForWhatsApp(phone);
    if (clean.length < 8) {
      return { available: false, reason: 'Client phone number is too short or invalid for WhatsApp', recipient: phone };
    }
    return { available: true, recipient: phone, isPaid: false };
  }

  if (channel === 'messenger') {
    if (messenger) {
      return { available: true, recipient: messenger, isPaid: false };
    }
    if (fbPage) {
      return { 
        available: true, 
        reason: 'Uses DBuzzingBees Facebook Page inbox', 
        recipient: `@${fbPage}`,
        isPaid: false
      };
    }
    return { available: false, reason: 'No Messenger username or company Facebook page configured', recipient: '' };
  }

  if (channel === 'sms') {
    // SMS COST CONTROL REQUIREMENT: Avoid paid SMS unless the administrator enables it
    if (!settings.enablePaidSms) {
      return { 
        available: false, 
        reason: 'Paid SMS is disabled by Administrator to reduce costs. Enable in Settings if required.', 
        recipient: phone || '',
        isPaid: true
      };
    }
    if (!phone) {
      return { available: false, reason: 'No client mobile number saved', recipient: '', isPaid: true };
    }
    return { available: true, recipient: phone, isPaid: true };
  }

  return { available: false, reason: 'Unknown channel', recipient: '' };
};

/**
 * Checks if staff role has permission to approve bookings or send client confirmations
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
    case 'retrying':
      return {
        label: 'Retrying Email...',
        bgClass: 'bg-amber-50 dark:bg-amber-950/60',
        textClass: 'text-amber-700 dark:text-amber-300',
        borderClass: 'border-amber-200 dark:border-amber-800',
        dotClass: 'bg-amber-500',
      };
    case 'failed':
      return {
        label: 'Email Failed (Retry)',
        bgClass: 'bg-rose-50 dark:bg-rose-950/60',
        textClass: 'text-rose-700 dark:text-rose-300',
        borderClass: 'border-rose-200 dark:border-rose-800',
        dotClass: 'bg-rose-500',
      };
    case 'needs_reschedule':
      return {
        label: 'Needs Reschedule',
        bgClass: 'bg-purple-50 dark:bg-purple-950/60',
        textClass: 'text-purple-700 dark:text-purple-300',
        borderClass: 'border-purple-200 dark:border-purple-800',
        dotClass: 'bg-purple-500',
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
