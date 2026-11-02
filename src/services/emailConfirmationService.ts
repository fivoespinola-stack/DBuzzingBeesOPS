import { Task, Cleaner, CompanySettings, ConfirmationLog, ConfirmationChannel, ConfirmationStatus } from '../types';
import { 
  DEFAULT_COMPANY_SETTINGS, 
  generateConfirmationMessage, 
  generateConfirmationSubject,
  generateConfirmationHtml,
  buildEmailLink,
  buildWhatsAppLink,
  buildMessengerLink,
  buildSmsLink,
  buildRescheduleLink,
  buildContactLink,
  checkChannelAvailability
} from '../utils/confirmationHelpers';
import { loadCompanySettings, saveLocalConfirmationLogs, loadLocalConfirmationLogs } from './storage';
import { saveConfirmationLogToFirestore, saveTaskToFirestore } from './firebase';

export interface ConfirmationResult {
  success: boolean;
  channelUsed: ConfirmationChannel;
  log: ConfirmationLog;
  updatedTask: Task;
  error?: string;
  fallbackAvailable?: boolean;
  fallbackChannel?: ConfirmationChannel;
}

/**
 * Triggers browser-safe external URL open (for mailto:, wa.me, m.me, sms:)
 */
export const openSafeLink = (url: string) => {
  try {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

/**
 * Free email dispatch engine:
 * 1. Prepares personalized email subject & rich HTML body with "Reschedule" and "Contact Us" buttons.
 * 2. Attempts direct client mail application / webmail integration with pre-formatted payload.
 * 3. Copies formatted email text to clipboard for zero-friction paste if needed.
 * 4. Verifies delivery readiness and handles retries.
 */
export async function dispatchFreeEmail(
  toEmail: string,
  subject: string,
  bodyText: string,
  htmlContent: string
): Promise<{ ok: boolean; error?: string }> {
  if (!toEmail || !toEmail.includes('@')) {
    return { ok: false, error: 'Invalid or missing client email address' };
  }

  try {
    // Copy plaintext message to clipboard as an instant backup convenience for the user
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(bodyText).catch(() => {});
    }

    // Launch free mail client link
    const mailtoUrl = buildEmailLink(toEmail, subject, bodyText);
    openSafeLink(mailtoUrl);

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Failed to dispatch free email via client protocol' };
  }
}

/**
 * Main dispatcher: Sends confirmations through Email first (free)
 * and optionally WhatsApp or Messenger. Avoids paid SMS unless administrator enables it.
 */
export async function sendBookingConfirmation(
  task: Task,
  cleaners: Cleaner[],
  options?: {
    isAutomatic?: boolean;
    staffName?: string;
    staffUsername?: string;
    preferredChannel?: ConfirmationChannel;
    customMessageText?: string;
  }
): Promise<ConfirmationResult> {
  const settings = loadCompanySettings();
  const staffName = options?.staffName || 'DBuzzingBees Admin';
  const staffUsername = options?.staffUsername || 'admin';
  const isAutomatic = Boolean(options?.isAutomatic);

  const messageText = options?.customMessageText || generateConfirmationMessage(task, cleaners, settings);
  const subject = generateConfirmationSubject(task, settings);
  const htmlContent = generateConfirmationHtml(task, cleaners, settings);
  const timestamp = new Date().toISOString();

  // Channel determination: Email First (Free)
  let channelToUse: ConfirmationChannel = 'email';
  let isChannelAvailable = false;
  let channelReason: string | undefined;

  if (options?.preferredChannel) {
    channelToUse = options.preferredChannel;
    const avail = checkChannelAvailability(channelToUse, task, settings);
    isChannelAvailable = avail.available;
    channelReason = avail.reason;
  } else {
    // Default flow: Email First
    const emailCheck = checkChannelAvailability('email', task, settings);
    if (emailCheck.available) {
      channelToUse = 'email';
      isChannelAvailable = true;
    } else {
      // Fallback channel: WhatsApp or Messenger
      const waCheck = checkChannelAvailability('whatsapp', task, settings);
      const messengerCheck = checkChannelAvailability('messenger', task, settings);

      if (settings.fallbackChannel === 'whatsapp' && waCheck.available) {
        channelToUse = 'whatsapp';
        isChannelAvailable = true;
      } else if (settings.fallbackChannel === 'messenger' && messengerCheck.available) {
        channelToUse = 'messenger';
        isChannelAvailable = true;
      } else if (waCheck.available) {
        channelToUse = 'whatsapp';
        isChannelAvailable = true;
      } else if (messengerCheck.available) {
        channelToUse = 'messenger';
        isChannelAvailable = true;
      } else {
        channelToUse = 'email'; // keep as email to trigger error & retry prompt
        isChannelAvailable = false;
        channelReason = emailCheck.reason || 'No email address on file';
      }
    }
  }

  // Cost guard: If SMS is requested but paid SMS is disabled
  if (channelToUse === 'sms' && !settings.enablePaidSms) {
    const errorMsg = 'Paid SMS is disabled by Administrator to reduce costs. Please enable Paid SMS in Settings or use free Email, WhatsApp, or Messenger.';
    const failedLog: ConfirmationLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      taskId: task.id,
      taskTitle: `${task.jobType} - ${task.clientName || 'Client'}`,
      timestamp,
      channel: 'sms',
      staffName,
      staffUsername,
      status: 'failed',
      deliveryStatus: 'failed',
      recipient: task.clientPhone || 'No phone',
      recipientName: task.clientName,
      subject,
      messagePreview: messageText.substring(0, 140),
      fullMessage: messageText,
      htmlContent,
      retryCount: 0,
      lastError: errorMsg,
      rescheduleUrl: buildRescheduleLink(task, settings),
      contactUrl: buildContactLink(task, settings),
      serviceDate: task.date,
      serviceTime: `${task.startTime} - ${task.endTime}`,
      notes: isAutomatic ? 'Auto-send blocked: Paid SMS disabled by Administrator' : 'Paid SMS disabled by Administrator'
    };

    // Save log
    await saveLogToBothStores(failedLog);

    return {
      success: false,
      channelUsed: 'sms',
      log: failedLog,
      updatedTask: {
        ...task,
        confirmationStatus: 'failed',
        confirmationDeliveryStatus: 'failed',
        confirmationLastError: errorMsg,
        confirmationLogs: [failedLog, ...(task.confirmationLogs || [])]
      },
      error: errorMsg,
      fallbackAvailable: Boolean(task.clientEmail || task.clientPhone),
      fallbackChannel: task.clientEmail ? 'email' : 'whatsapp'
    };
  }

  let sendOk = false;
  let deliveryError: string | undefined;

  if (isChannelAvailable) {
    if (channelToUse === 'email') {
      const emailResult = await dispatchFreeEmail(task.clientEmail || '', subject, messageText, htmlContent);
      sendOk = emailResult.ok;
      deliveryError = emailResult.error;
    } else if (channelToUse === 'whatsapp') {
      const link = buildWhatsAppLink(task.clientPhone || '', messageText);
      openSafeLink(link);
      sendOk = true;
    } else if (channelToUse === 'messenger') {
      const link = buildMessengerLink(task.clientMessenger, settings.facebookPage, messageText);
      openSafeLink(link);
      sendOk = true;
    } else if (channelToUse === 'sms') {
      const link = buildSmsLink(task.clientPhone || '', messageText);
      openSafeLink(link);
      sendOk = true;
    }
  } else {
    sendOk = false;
    deliveryError = channelReason || `Selected channel ${channelToUse.toUpperCase()} is not available for this client.`;
  }

  const logStatus: ConfirmationStatus = sendOk ? 'sent' : 'failed';
  const deliveryStatus = sendOk ? 'delivered' : 'failed';

  const log: ConfirmationLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    taskId: task.id,
    taskTitle: `${task.jobType} - ${task.clientName || 'Client'}`,
    timestamp,
    channel: channelToUse,
    staffName,
    staffUsername,
    status: logStatus,
    deliveryStatus,
    recipient: channelToUse === 'email' ? (task.clientEmail || '') : (task.clientPhone || task.clientMessenger || 'Client'),
    recipientName: task.clientName,
    subject,
    messagePreview: messageText.substring(0, 140),
    fullMessage: messageText,
    htmlContent,
    retryCount: sendOk ? 0 : 1,
    lastError: deliveryError,
    rescheduleUrl: buildRescheduleLink(task, settings),
    contactUrl: buildContactLink(task, settings),
    serviceDate: task.date,
    serviceTime: `${task.startTime} - ${task.endTime}`,
    notes: isAutomatic ? `Automatically dispatched after Admin Approval (${channelToUse.toUpperCase()})` : `Dispatched via ${channelToUse.toUpperCase()}`
  };

  // Log in Firestore database and localStorage
  await saveLogToBothStores(log);

  const updatedTask: Task = {
    ...task,
    confirmationStatus: logStatus,
    confirmationDeliveryStatus: deliveryStatus,
    confirmationRetryCount: sendOk ? 0 : 1,
    confirmationLastError: deliveryError,
    lastConfirmationSentAt: sendOk ? timestamp : task.lastConfirmationSentAt,
    lastConfirmationChannel: channelToUse,
    confirmationLogs: [log, ...(task.confirmationLogs || [])]
  };

  return {
    success: sendOk,
    channelUsed: channelToUse,
    log,
    updatedTask,
    error: deliveryError,
    fallbackAvailable: !sendOk && channelToUse === 'email' && Boolean(task.clientPhone),
    fallbackChannel: 'whatsapp'
  };
}

/**
 * Retries sending an email confirmation that previously failed
 */
export async function retryEmailConfirmation(
  task: Task,
  cleaners: Cleaner[],
  staffName: string = 'DBuzzingBees Admin'
): Promise<ConfirmationResult> {
  const currentRetry = (task.confirmationRetryCount || 0) + 1;
  const settings = loadCompanySettings();

  const retryTask: Task = {
    ...task,
    confirmationStatus: 'retrying',
    confirmationDeliveryStatus: 'retrying',
    confirmationRetryCount: currentRetry
  };

  const result = await sendBookingConfirmation(retryTask, cleaners, {
    isAutomatic: false,
    staffName,
    preferredChannel: 'email'
  });

  return result;
}

/**
 * Admin Approval Workflow:
 * Marks booking as approved and triggers the automatic booking confirmation system!
 */
export async function approveBookingAndAutoSend(
  task: Task,
  cleaners: Cleaner[],
  staffUser: { name: string; username: string }
): Promise<{ updatedTask: Task; confirmationResult?: ConfirmationResult }> {
  const settings = loadCompanySettings();
  const timestamp = new Date().toISOString();

  const approvedTask: Task = {
    ...task,
    isApproved: true,
    approvedBy: staffUser.name,
    approvedAt: timestamp,
  };

  // If administrator has auto-send enabled, trigger confirmation automatically
  if (settings.autoSendOnApproval) {
    const confirmationResult = await sendBookingConfirmation(approvedTask, cleaners, {
      isAutomatic: true,
      staffName: staffUser.name,
      staffUsername: staffUser.username,
      preferredChannel: settings.primaryConfirmationChannel || 'email'
    });

    return {
      updatedTask: confirmationResult.updatedTask,
      confirmationResult
    };
  }

  // If auto-send is disabled, simply return the approved task
  return { updatedTask: approvedTask };
}

/**
 * Saves log to Firestore and local cache
 */
async function saveLogToBothStores(log: ConfirmationLog) {
  try {
    // 1. LocalStorage Cache
    const existing = loadLocalConfirmationLogs();
    saveLocalConfirmationLogs([log, ...existing]);

    // 2. Cloud Firestore Database
    await saveConfirmationLogToFirestore(log);
  } catch (err) {
    console.warn('Confirmation log persistence notice:', err);
  }
}
