import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  MessageSquare, 
  Phone, 
  CheckCircle2, 
  Clock, 
  User, 
  MapPin, 
  Calendar, 
  AlertCircle, 
  Copy, 
  Check, 
  ExternalLink, 
  Sparkles, 
  Settings, 
  History, 
  ShieldCheck, 
  Layers, 
  RefreshCw,
  Edit3,
  Mail,
  Lock,
  Unlock,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { 
  Task, 
  Cleaner, 
  UserSession, 
  ConfirmationChannel, 
  ConfirmationStatus, 
  ConfirmationLog, 
  CompanySettings 
} from '../types';
import { 
  generateConfirmationMessage, 
  generateConfirmationSubject,
  generateConfirmationHtml,
  buildWhatsAppLink, 
  buildMessengerLink, 
  buildSmsLink, 
  buildEmailLink,
  buildRescheduleLink,
  buildContactLink,
  checkChannelAvailability,
  canSendConfirmation,
  getConfirmationStatusMeta,
  DEFAULT_CONFIRMATION_TEMPLATE,
  DEFAULT_CONFIRMATION_SUBJECT,
  formatAustralianPhoneNumber
} from '../utils/confirmationHelpers';
import { loadCompanySettings, saveCompanySettings } from '../services/storage';
import { saveTaskToFirestore } from '../services/firebase';
import { formatDate, formatTime12h, formatDateLong } from '../utils/formatters';
import { 
  sendBookingConfirmation, 
  retryEmailConfirmation
} from '../services/emailConfirmationService';

interface SendConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: Task | null;
  tasks?: Task[];
  cleaners: Cleaner[];
  currentUser: UserSession | null;
  onUpdateTask: (updatedTask: Task) => void;
  onBulkUpdateTasks?: (updatedTasks: Task[]) => void;
}

export const SendConfirmationModal: React.FC<SendConfirmationModalProps> = ({
  isOpen,
  onClose,
  task,
  tasks: bulkTasks = [],
  cleaners,
  currentUser,
  onUpdateTask,
  onBulkUpdateTasks,
}) => {
  const isBulk = Boolean(bulkTasks && bulkTasks.length > 0 && !task);
  const activeTaskList = isBulk ? bulkTasks : (task ? [task] : []);
  const activeTask = activeTaskList[0] || null;

  const [companySettings, setCompanySettings] = useState<CompanySettings>(() => loadCompanySettings());
  
  // Selected channel (Email first by default!)
  const [selectedChannel, setSelectedChannel] = useState<ConfirmationChannel>('email');

  // Preview mode: 'html' (interactive email with buttons) or 'text'
  const [previewMode, setPreviewMode] = useState<'html' | 'text'>('html');

  // Active view tab: 'composer' | 'history' | 'admin_settings'
  const [activeTab, setActiveTab] = useState<'composer' | 'history' | 'admin_settings'>('composer');

  // Message & Subject state
  const [subjectText, setSubjectText] = useState(DEFAULT_CONFIRMATION_SUBJECT);
  const [messageText, setMessageText] = useState('');
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quick edit client contact
  const [tempPhone, setTempPhone] = useState('');
  const [tempMessenger, setTempMessenger] = useState('');
  const [tempEmail, setTempEmail] = useState('');
  const [isEditingContact, setIsEditingContact] = useState(false);

  // Bulk selection checkboxes
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  // Permissions check
  const isAuthorized = canSendConfirmation(currentUser?.role);

  // Initialize modal state on open or task change
  useEffect(() => {
    if (!isOpen) return;

    const currentSettings = loadCompanySettings();
    setCompanySettings(currentSettings);
    setSendSuccessMessage(null);
    setErrorMessage(null);
    setActiveTab('composer');

    if (isBulk) {
      setSelectedTaskIds(bulkTasks.map((t) => t.id));
      if (bulkTasks[0]) {
        const generatedSubj = generateConfirmationSubject(bulkTasks[0], currentSettings);
        const generated = generateConfirmationMessage(bulkTasks[0], cleaners, currentSettings);
        setSubjectText(generatedSubj);
        setMessageText(generated);
      }
      setSelectedChannel('email');
    } else if (activeTask) {
      setTempPhone(activeTask.clientPhone || '');
      setTempMessenger(activeTask.clientMessenger || '');
      setTempEmail(activeTask.clientEmail || '');
      
      const generatedSubj = generateConfirmationSubject(activeTask, currentSettings);
      const generated = generateConfirmationMessage(activeTask, cleaners, currentSettings);
      setSubjectText(generatedSubj);
      setMessageText(generated);

      // Prioritize Email first (free) if client has email, else fallback to WhatsApp or Messenger
      const hasEmail = Boolean(activeTask.clientEmail?.trim() && activeTask.clientEmail.includes('@'));
      const hasPhone = Boolean(activeTask.clientPhone?.trim());
      const hasMessenger = Boolean(activeTask.clientMessenger?.trim());

      if (hasEmail) {
        setSelectedChannel('email');
      } else if (hasPhone) {
        setSelectedChannel('whatsapp');
      } else if (hasMessenger) {
        setSelectedChannel('messenger');
      } else {
        setSelectedChannel('email');
      }
    }
  }, [isOpen, task, bulkTasks, isBulk]);

  if (!isOpen || activeTaskList.length === 0) return null;

  // Channel availabilities
  const emailAvail = activeTask ? checkChannelAvailability('email', activeTask, companySettings) : { available: false, recipient: '' };
  const waAvail = activeTask ? checkChannelAvailability('whatsapp', activeTask, companySettings) : { available: false, recipient: '' };
  const messengerAvail = activeTask ? checkChannelAvailability('messenger', activeTask, companySettings) : { available: false, recipient: '' };
  const smsAvail = activeTask ? checkChannelAvailability('sms', activeTask, companySettings) : { available: false, recipient: '' };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(messageText);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2500);
  };

  const handleResetTemplate = () => {
    if (activeTask) {
      const regeneratedSubj = DEFAULT_CONFIRMATION_SUBJECT;
      const regenerated = generateConfirmationMessage(activeTask, cleaners, companySettings, DEFAULT_CONFIRMATION_TEMPLATE);
      setSubjectText(regeneratedSubj);
      setMessageText(regenerated);
    }
  };

  const handleSaveCompanySettings = (newSettings: CompanySettings) => {
    setCompanySettings(newSettings);
    saveCompanySettings(newSettings);
    setSendSuccessMessage('Settings updated: Cost controls and confirmation rules saved.');
    setTimeout(() => setSendSuccessMessage(null), 3500);
  };

  const handleSaveQuickContact = () => {
    if (!activeTask) return;
    const formattedPhone = formatAustralianPhoneNumber(tempPhone) || tempPhone.trim();
    const cleanEmail = tempEmail.trim();
    const cleanMessenger = tempMessenger.trim();

    const updated: Task = {
      ...activeTask,
      clientPhone: formattedPhone,
      clientMessenger: cleanMessenger,
      clientEmail: cleanEmail,
    };

    onUpdateTask(updated);

    // Save directly to Firestore as well
    saveTaskToFirestore(updated).catch((err) => {
      console.warn('Firestore contact update notice:', err);
    });

    // If an email address is provided and valid, auto-select email
    if (cleanEmail && cleanEmail.includes('@')) {
      setSelectedChannel('email');
    } else if (formattedPhone && !cleanEmail) {
      setSelectedChannel('whatsapp');
    }

    setSendSuccessMessage(
      `Contact details saved for ${activeTask.clientName || 'Client'}! ${cleanEmail ? `Email: ${cleanEmail}` : ''} ${formattedPhone ? `· Phone: ${formattedPhone}` : ''}`
    );
    setIsEditingContact(false);
  };

  // Dispatch Confirmation for Single Task
  const handleSendSingle = async () => {
    if (!isAuthorized || !activeTask) return;
    setIsSending(true);
    setErrorMessage(null);

    try {
      const result = await sendBookingConfirmation(activeTask, cleaners, {
        isAutomatic: false,
        staffName: currentUser?.name || 'Staff User',
        staffUsername: currentUser?.username,
        preferredChannel: selectedChannel,
        customMessageText: messageText
      });

      onUpdateTask(result.updatedTask);

      if (result.success) {
        setSendSuccessMessage(
          `Confirmation successfully dispatched via ${result.channelUsed.toUpperCase()}! Logged in database.`
        );
      } else {
        setErrorMessage(
          result.error || `Failed to dispatch via ${selectedChannel.toUpperCase()}. Please check details and try retry option.`
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred during dispatch.');
    } finally {
      setIsSending(false);
    }
  };

  // Retry failed email confirmation
  const handleRetryEmail = async () => {
    if (!isAuthorized || !activeTask) return;
    setIsSending(true);
    setErrorMessage(null);

    try {
      const result = await retryEmailConfirmation(activeTask, cleaners, currentUser?.name || 'Admin');
      onUpdateTask(result.updatedTask);

      if (result.success) {
        setSendSuccessMessage('Retry successful! Booking confirmation email sent and logged.');
      } else {
        setErrorMessage(result.error || 'Retry attempt failed. Consider using free WhatsApp or Messenger.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Retry failed.');
    } finally {
      setIsSending(false);
    }
  };

  // Admin Approval (WITHOUT auto-send)
  const handleSimpleApprove = () => {
    if (!isAuthorized || !activeTask) return;
    const updated: Task = {
      ...activeTask,
      isApproved: true,
      approvedBy: currentUser?.name || 'Admin',
      approvedAt: new Date().toISOString(),
    };
    onUpdateTask(updated);
    saveTaskToFirestore(updated).catch((err) => {
      console.warn('Firestore task approval sync notice:', err);
    });
    setSendSuccessMessage(`Booking marked as approved by ${currentUser?.name || 'Admin'}. (No confirmation was auto-sent)`);
  };

  // Bulk Dispatch
  const handleSendBulk = async () => {
    if (!isAuthorized || selectedTaskIds.length === 0) return;
    setIsSending(true);
    setErrorMessage(null);

    const targets = bulkTasks.filter((t) => selectedTaskIds.includes(t.id));
    const updatedBatch: Task[] = [];
    let sentCount = 0;
    let failCount = 0;

    for (const targetTask of targets) {
      try {
        const result = await sendBookingConfirmation(targetTask, cleaners, {
          isAutomatic: false,
          staffName: currentUser?.name || 'Staff User',
          staffUsername: currentUser?.username,
          preferredChannel: selectedChannel,
          customMessageText: generateConfirmationMessage(targetTask, cleaners, companySettings, messageText)
        });
        updatedBatch.push(result.updatedTask);
        if (result.success) sentCount++;
        else failCount++;
      } catch {
        failCount++;
        updatedBatch.push(targetTask);
      }
    }

    if (onBulkUpdateTasks) {
      onBulkUpdateTasks(updatedBatch);
    } else {
      updatedBatch.forEach(onUpdateTask);
    }

    setIsSending(false);
    setSendSuccessMessage(`Processed ${targets.length} jobs: ${sentCount} confirmations dispatched, ${failCount} failed/pending. All attempts logged.`);
    setTimeout(() => {
      onClose();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        className="bg-white dark:bg-neutral-900 rounded-2xl max-w-4xl w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-modal-title"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFB509] flex items-center justify-center text-neutral-950 font-bold shadow-xs">
              <Mail className="w-5 h-5 text-neutral-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="confirmation-modal-title" className="text-base font-extrabold text-neutral-900 dark:text-white">
                  {isBulk 
                    ? `Bulk Booking Confirmation (${selectedTaskIds.length} Jobs)` 
                    : `Booking Confirmation · ${activeTask?.clientName || 'Client'}`}
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                  Email First (Free)
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Automatic dispatch on admin approval · Free delivery · SMS cost protection
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Nav Tabs */}
            <div className="hidden sm:flex bg-neutral-200/70 dark:bg-neutral-700/60 p-0.5 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setActiveTab('composer')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeTab === 'composer'
                    ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-2xs'
                    : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900'
                }`}
              >
                Dispatch Composer
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1 ${
                  activeTab === 'history'
                    ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-2xs'
                    : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Logs ({activeTask?.confirmationLogs?.length || 0})</span>
              </button>
              <button
                onClick={() => setActiveTab('admin_settings')}
                className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1 ${
                  activeTab === 'admin_settings'
                    ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-2xs'
                    : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Admin Controls</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View-Only Warning for Non-Admin/Non-Supervisor */}
        {!isAuthorized && (
          <div className="bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-900/60 px-5 py-2.5 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Staff preview mode:</strong> Your role ({currentUser?.role || 'staff'}) can review templates. Approval & dispatching requires Administrator or Supervisor role.
            </span>
          </div>
        )}

        {/* Success Banner */}
        {sendSuccessMessage && (
          <div className="bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-800 px-5 py-3 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{sendSuccessMessage}</span>
            </div>
            <button onClick={() => setSendSuccessMessage(null)} className="font-semibold underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Error / Failure Banner with Instant Retry Option */}
        {errorMessage && (
          <div className="bg-rose-50 dark:bg-rose-950/60 border-b border-rose-200 dark:border-rose-800 px-5 py-3 flex items-center justify-between text-xs text-rose-800 dark:text-rose-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <div className="flex items-center gap-2">
              {activeTask?.clientEmail && (
                <button
                  onClick={handleRetryEmail}
                  disabled={isSending}
                  className="px-2.5 py-1 text-xs font-bold rounded bg-rose-600 text-white hover:bg-rose-700 flex items-center gap-1 shadow-2xs"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Retry Email</span>
                </button>
              )}
              <button onClick={() => setErrorMessage(null)} className="underline text-xs">
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1 text-sm text-neutral-800 dark:text-neutral-200">
          
          {/* TAB 1: COMPOSER & DISPATCH */}
          {activeTab === 'composer' && (
            <>
              {/* Active Job Card Summary */}
              {!isBulk && activeTask && (
                <div className="bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-700/60">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base text-neutral-900 dark:text-white">
                          {activeTask.clientName || 'Client Name Missing'}
                        </span>
                        {activeTask.clientNumber && (
                          <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200">
                            {activeTask.clientNumber}
                          </span>
                        )}
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                          {activeTask.jobType}
                        </span>

                        {/* Admin Approval Status Pill */}
                        {activeTask.isApproved ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>Approved by {activeTask.approvedBy || 'Admin'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Pending Admin Approval</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-[#FFB509] shrink-0" />
                        <span>{activeTask.address}</span>
                      </div>

                      {/* Current Saved Client Contacts Badge Row */}
                      <div className="flex flex-wrap items-center gap-3 text-xs mt-2 pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          {activeTask.clientEmail ? (
                            <span className="text-neutral-900 dark:text-white font-mono font-medium">{activeTask.clientEmail}</span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 font-semibold italic text-[11px]">No email saved</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          {activeTask.clientPhone ? (
                            <span className="text-neutral-900 dark:text-white font-mono font-medium">{activeTask.clientPhone}</span>
                          ) : (
                            <span className="text-neutral-400 italic text-[11px]">No phone saved</span>
                          )}
                        </div>
                        {activeTask.clientMessenger && (
                          <div className="flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                            <span className="text-neutral-900 dark:text-white font-mono font-medium">{activeTask.clientMessenger}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <div>
                        <div className="font-bold text-neutral-900 dark:text-white">
                          {formatDate(activeTask.date)}
                        </div>
                        <div className="text-neutral-500 font-mono-numbers">
                          {formatTime12h(activeTask.startTime)} – {formatTime12h(activeTask.endTime)} ({activeTask.fixHour}h)
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTempEmail(activeTask.clientEmail || '');
                          setTempPhone(activeTask.clientPhone || '');
                          setTempMessenger(activeTask.clientMessenger || '');
                          setIsEditingContact(!isEditingContact);
                        }}
                        className={`p-1.5 text-xs rounded-lg border transition-colors flex items-center gap-1 ${
                          isEditingContact
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-400'
                            : 'border-neutral-200 dark:border-neutral-700 hover:bg-white dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                        }`}
                        title="Edit contact email, phone or messenger"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Edit Contact</span>
                      </button>
                    </div>
                  </div>

                  {/* Quick Contact Editor Row (as in image) */}
                  {isEditingContact && (
                    <div className="mt-3 p-3.5 bg-white dark:bg-neutral-900 rounded-lg border border-amber-500/80 dark:border-amber-500/80 space-y-3 animate-in fade-in duration-150 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                          Update Client Communication Contacts
                        </span>
                        <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                          Saves to client profile & schedules
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide">
                            CLIENT EMAIL (FREE PRIMARY CHANNEL)
                          </label>
                          <input
                            type="email"
                            value={tempEmail}
                            onChange={(e) => setTempEmail(e.target.value)}
                            placeholder="e.g. client@example.com"
                            className="w-full mt-1 px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-1 focus:ring-amber-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide">
                            MOBILE (WHATSAPP & SMS)
                          </label>
                          <input
                            type="text"
                            value={tempPhone}
                            onChange={(e) => setTempPhone(e.target.value)}
                            placeholder="e.g. 0412 884 921"
                            className="w-full mt-1 px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-1 focus:ring-amber-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide">
                            MESSENGER HANDLE / PAGE
                          </label>
                          <input
                            type="text"
                            value={tempMessenger}
                            onChange={(e) => setTempMessenger(e.target.value)}
                            placeholder="e.g. sarah.smith"
                            className="w-full mt-1 px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-1 focus:ring-amber-500 font-mono"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsEditingContact(false)}
                          className="px-3 py-1 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveQuickContact}
                          className="px-4 py-1 text-xs font-bold rounded-lg bg-[#FFB509] text-neutral-950 hover:bg-[#EAA300] transition-colors shadow-xs"
                        >
                          Save Contacts
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Failure & Retry Alert if last delivery failed */}
                  {activeTask.confirmationDeliveryStatus === 'failed' && (
                    <div className="mt-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-rose-900 dark:text-rose-200">
                            Email Confirmation Delivery Failed (Attempt {activeTask.confirmationRetryCount || 1})
                          </div>
                          <div className="text-[11px] text-rose-700 dark:text-rose-300">
                            {activeTask.confirmationLastError || 'Could not dispatch to client email. Please retry or fallback to WhatsApp.'}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={handleRetryEmail}
                        disabled={isSending}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700 flex items-center gap-1.5 shadow-xs"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Retry Email Now</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Bulk Table (if Bulk Mode) */}
              {isBulk && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                      Select Bookings to Confirm ({selectedTaskIds.length} of {bulkTasks.length} selected)
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedTaskIds(bulkTasks.map((t) => t.id))}
                        className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-semibold"
                      >
                        Select All
                      </button>
                      <span>·</span>
                      <button
                        onClick={() => setSelectedTaskIds([])}
                        className="text-xs text-neutral-500 hover:underline font-semibold"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold sticky top-0">
                        <tr>
                          <th className="py-2 px-3 w-8"></th>
                          <th className="py-2 px-3">Client</th>
                          <th className="py-2 px-3">Email (Free)</th>
                          <th className="py-2 px-3">Phone</th>
                          <th className="py-2 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {bulkTasks.map((t) => {
                          const isSel = selectedTaskIds.includes(t.id);
                          const taskMeta = getConfirmationStatusMeta(t.confirmationStatus);
                          return (
                            <tr key={t.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                              <td className="py-2 px-3">
                                <input
                                  type="checkbox"
                                  checked={isSel}
                                  onChange={(e) => {
                                    if (e.target.checked) setSelectedTaskIds([...selectedTaskIds, t.id]);
                                    else setSelectedTaskIds(selectedTaskIds.filter((id) => id !== t.id));
                                  }}
                                  className="rounded text-amber-500"
                                />
                              </td>
                              <td className="py-2 px-3 font-semibold text-neutral-900 dark:text-white">
                                {t.clientName || 'Client'}
                              </td>
                              <td className="py-2 px-3 text-neutral-600 dark:text-neutral-300">
                                {t.clientEmail || <span className="text-amber-500 italic">No email</span>}
                              </td>
                              <td className="py-2 px-3 text-neutral-600 dark:text-neutral-300 font-mono">
                                {t.clientPhone || <span className="text-neutral-400 italic">No phone</span>}
                              </td>
                              <td className="py-2 px-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${taskMeta.bgClass} ${taskMeta.textClass}`}>
                                  {taskMeta.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Channel Selector: Email First (Free), WhatsApp, Messenger, SMS (Cost protected) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    1. Select Delivery Channel (Email First · Free)
                  </span>
                  <span className="text-xs text-neutral-500">
                    Avoids paid SMS carrier charges
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  
                  {/* CHANNEL 1: EMAIL (FREE FIRST CHOICE) */}
                  <div
                    onClick={() => (!isBulk && !emailAvail.available ? null : setSelectedChannel('email'))}
                    className={`relative p-3.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                      selectedChannel === 'email'
                        ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 ring-2 ring-amber-500 shadow-xs'
                        : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/40 hover:border-neutral-300'
                    } ${!isBulk && !emailAvail.available ? 'opacity-60 cursor-not-allowed bg-neutral-100 dark:bg-neutral-800/20' : ''}`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-500 text-neutral-950 flex items-center justify-center font-bold shadow-2xs">
                          <Mail className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          100% Free
                        </span>
                      </div>
                      <div className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-1.5">
                        <span>Email (Primary)</span>
                      </div>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Direct delivery with HTML cards & action buttons
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-700/60 text-xs">
                      {!isBulk ? (
                        emailAvail.available ? (
                          <span className="text-amber-700 dark:text-amber-400 font-mono text-[11px] flex items-center gap-1 truncate" title={emailAvail.recipient}>
                            <Check className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{emailAvail.recipient}</span>
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 text-[11px] flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 flex-shrink-0" />
                            <span>No email saved</span>
                          </span>
                        )
                      ) : (
                        <span className="text-neutral-500 text-[11px]">Free client email dispatch</span>
                      )}
                    </div>
                  </div>

                  {/* CHANNEL 2: WHATSAPP (FREE OPTION) */}
                  <div
                    onClick={() => (!isBulk && !waAvail.available ? null : setSelectedChannel('whatsapp'))}
                    className={`relative p-3.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                      selectedChannel === 'whatsapp'
                        ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 ring-2 ring-emerald-500 shadow-xs'
                        : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/40 hover:border-neutral-300'
                    } ${!isBulk && !waAvail.available ? 'opacity-60 cursor-not-allowed bg-neutral-100 dark:bg-neutral-800/20' : ''}`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                          Option 2
                        </span>
                      </div>
                      <div className="font-bold text-sm text-neutral-900 dark:text-white">
                        WhatsApp
                      </div>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Direct wa.me message with action links
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-700/60 text-xs">
                      {!isBulk ? (
                        waAvail.available ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-mono text-[11px] flex items-center gap-1 truncate">
                            <Check className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{waAvail.recipient}</span>
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 text-[11px] flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 flex-shrink-0" />
                            <span>No mobile number</span>
                          </span>
                        )
                      ) : (
                        <span className="text-neutral-500 text-[11px]">Formatted mobile link</span>
                      )}
                    </div>
                  </div>

                  {/* CHANNEL 3: MESSENGER (FREE OPTION) */}
                  <div
                    onClick={() => (!isBulk && !messengerAvail.available ? null : setSelectedChannel('messenger'))}
                    className={`relative p-3.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                      selectedChannel === 'messenger'
                        ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-blue-500 shadow-xs'
                        : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/40 hover:border-neutral-300'
                    } ${!isBulk && !messengerAvail.available ? 'opacity-60 cursor-not-allowed bg-neutral-100 dark:bg-neutral-800/20' : ''}`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                          <Send className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                          Option 3
                        </span>
                      </div>
                      <div className="font-bold text-sm text-neutral-900 dark:text-white">
                        Messenger
                      </div>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Facebook Page or m.me chat
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-700/60 text-xs">
                      {!isBulk ? (
                        messengerAvail.available ? (
                          <span className="text-blue-700 dark:text-blue-400 font-mono text-[11px] flex items-center gap-1 truncate">
                            <Check className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{messengerAvail.recipient}</span>
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 text-[11px] flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 flex-shrink-0" />
                            <span>No handle / page</span>
                          </span>
                        )
                      ) : (
                        <span className="text-neutral-500 text-[11px]">Direct Page inbox</span>
                      )}
                    </div>
                  </div>

                  {/* CHANNEL 4: SMS (PAID GATEWAY - STRICTLY DISABLED UNLESS ADMIN ENABLES) */}
                  <div
                    onClick={() => {
                      if (!companySettings.enablePaidSms) {
                        setErrorMessage('Paid SMS is disabled by the Administrator to reduce operating costs. Go to Admin Controls tab to enable.');
                        return;
                      }
                      if (!isBulk && !smsAvail.available) return;
                      setSelectedChannel('sms');
                    }}
                    className={`relative p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                      companySettings.enablePaidSms
                        ? selectedChannel === 'sms'
                          ? 'border-purple-500 bg-purple-50/60 dark:bg-purple-950/40 ring-2 ring-purple-500 shadow-xs cursor-pointer'
                          : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/40 hover:border-neutral-300 cursor-pointer'
                        : 'border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-100/70 dark:bg-neutral-800/40 cursor-not-allowed opacity-75'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                          companySettings.enablePaidSms ? 'bg-purple-600 text-white' : 'bg-neutral-300 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                        }`}>
                          <Phone className="w-4 h-4" />
                        </div>
                        {companySettings.enablePaidSms ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                            Carrier Fee
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" />
                            Disabled
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-1">
                        <span>Paid SMS</span>
                      </div>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                        {companySettings.enablePaidSms 
                          ? 'Paid carrier gateway enabled' 
                          : 'Disabled to reduce costs (Avoid paid SMS)'}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-700/60 text-xs">
                      {companySettings.enablePaidSms ? (
                        smsAvail.available ? (
                          <span className="text-purple-700 dark:text-purple-400 font-mono text-[11px] flex items-center gap-1 truncate">
                            <Check className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{smsAvail.recipient}</span>
                          </span>
                        ) : (
                          <span className="text-amber-600 text-[11px]">No phone number</span>
                        )
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400 text-[10px] font-medium flex items-center gap-1">
                          <Lock className="w-3 h-3 shrink-0" />
                          <span>Admin disabled (zero cost)</span>
                        </span>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {/* Message Subject Line & Preview Mode Tabs */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    2. Confirmation Template & Interactive Buttons
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg text-xs">
                      <button
                        onClick={() => setPreviewMode('html')}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                          previewMode === 'html'
                            ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs'
                            : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                        }`}
                      >
                        Email Card & Buttons Preview
                      </button>
                      <button
                        onClick={() => setPreviewMode('text')}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                          previewMode === 'text'
                            ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs'
                            : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                        }`}
                      >
                        Plain Text Message
                      </button>
                    </div>

                    <button
                      onClick={handleCopyMessage}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-1 text-neutral-700 dark:text-neutral-300"
                    >
                      {copiedMessage ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedMessage ? 'Copied' : 'Copy Text'}</span>
                    </button>

                    <button
                      onClick={handleResetTemplate}
                      title="Reset to default booking confirmation template"
                      className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Email Subject Line Field */}
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                      Email Subject:
                    </span>
                    <input
                      type="text"
                      value={subjectText}
                      onChange={(e) => setSubjectText(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs font-semibold rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Interactive HTML Card Preview with Reschedule & Contact Us Buttons */}
                {previewMode === 'html' && activeTask ? (
                  <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-100 dark:bg-neutral-950 p-4 sm:p-6 overflow-hidden">
                    <div className="max-w-md mx-auto bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-md overflow-hidden">
                      {/* Email Card Header */}
                      <div className="bg-[#FFB509] px-6 py-5 text-center text-neutral-950">
                        <div className="w-10 h-10 rounded-xl bg-neutral-950 text-[#FFB509] flex items-center justify-center font-black mx-auto mb-2 text-lg shadow-xs">
                          🐝
                        </div>
                        <h3 className="font-extrabold text-lg tracking-tight">DBuzzingBees</h3>
                        <p className="text-xs font-semibold text-neutral-800">Cleaning Service Booking Confirmed</p>
                      </div>

                      {/* Email Card Content */}
                      <div className="p-5 sm:p-6 space-y-4 text-xs text-neutral-800 dark:text-neutral-200">
                        <p className="font-bold text-sm text-neutral-900 dark:text-white">
                          Hello {activeTask.clientName || 'Valued Client'},
                        </p>
                        <p className="text-neutral-600 dark:text-neutral-400">
                          Thank you for booking with DBuzzingBees.
                        </p>
                        <p className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>Your cleaning service has been confirmed.</span>
                        </p>

                        {/* Details Table */}
                        <div className="bg-neutral-50 dark:bg-neutral-800/60 rounded-xl p-3.5 space-y-2 border border-neutral-200 dark:border-neutral-700/60">
                          <div className="flex">
                            <span className="w-28 font-bold text-neutral-500 dark:text-neutral-400">Service Date:</span>
                            <span className="font-bold text-neutral-900 dark:text-white">{formatDateLong(activeTask.date)}</span>
                          </div>
                          <div className="flex">
                            <span className="w-28 font-bold text-neutral-500 dark:text-neutral-400">Service Time:</span>
                            <span className="font-medium text-neutral-900 dark:text-white">
                              {formatTime12h(activeTask.startTime)} – {formatTime12h(activeTask.endTime)}
                            </span>
                          </div>
                          <div className="flex">
                            <span className="w-28 font-bold text-neutral-500 dark:text-neutral-400">Cleaner:</span>
                            <span className="font-medium text-neutral-900 dark:text-white">
                              {activeTask.assignedCleanerIds.map((id) => cleaners.find((c) => c.id === id)?.name || id).join(', ') || 'DBuzzingBees Cleaning Specialist'}
                            </span>
                          </div>
                          <div className="flex">
                            <span className="w-28 font-bold text-neutral-500 dark:text-neutral-400">Address:</span>
                            <span className="font-medium text-neutral-900 dark:text-white">{activeTask.address}</span>
                          </div>
                        </div>

                        <p className="text-neutral-500 dark:text-neutral-400">
                          If you need to reschedule or have any questions, please contact us.
                        </p>

                        {/* Interactive Buttons (Required by brief) */}
                        <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                          <a
                            href={buildRescheduleLink(activeTask, companySettings)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2.5 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white font-bold text-center flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                          >
                            <Calendar className="w-3.5 h-3.5 text-amber-500" />
                            <span>Reschedule</span>
                          </a>
                          <a
                            href={buildContactLink(activeTask, companySettings)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-950 font-bold text-center flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                          >
                            <Phone className="w-3.5 h-3.5 text-amber-400 dark:text-neutral-950" />
                            <span>Contact Us</span>
                          </a>
                        </div>

                        <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 text-neutral-500">
                          <p>Thank you for choosing DBuzzingBees.</p>
                          <p className="mt-1 font-bold text-neutral-900 dark:text-white">
                            Best regards,<br />
                            <span className="text-amber-600 dark:text-amber-400">DBuzzingBees Team</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Plain text editor */
                  <textarea
                    rows={10}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="w-full px-3.5 py-3 text-xs font-mono rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                )}
              </div>
            </>
          )}

          {/* TAB 2: AUDIT LOGS & RETRY HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
                <div>
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                    Confirmation Dispatch Log Database
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Logged in Cloud Firestore · Full audit trail of attempts and status
                  </p>
                </div>
                {activeTask?.confirmationDeliveryStatus === 'failed' && (
                  <button
                    onClick={handleRetryEmail}
                    disabled={isSending}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700 flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retry Email Now</span>
                  </button>
                )}
              </div>

              {(!activeTask?.confirmationLogs || activeTask.confirmationLogs.length === 0) ? (
                <div className="text-center py-12 text-neutral-400 text-xs">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>No confirmation attempts logged yet for this booking.</p>
                  <p className="mt-1">Confirmations sent manually or upon admin approval will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeTask.confirmationLogs.map((log) => {
                    const isFail = log.status === 'failed' || log.deliveryStatus === 'failed';
                    return (
                      <div
                        key={log.id}
                        className={`p-3.5 rounded-xl border ${
                          isFail
                            ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20'
                            : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              isFail
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            }`}>
                              {log.channel.toUpperCase()} &bull; {log.status.toUpperCase()}
                            </span>
                            <span className="text-xs font-mono text-neutral-500">
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                          </div>

                          <span className="text-xs text-neutral-600 dark:text-neutral-400">
                            By: <strong>{log.staffName}</strong>
                          </span>
                        </div>

                        <div className="mt-2 text-xs text-neutral-800 dark:text-neutral-200">
                          <div><strong>Recipient:</strong> {log.recipient}</div>
                          {log.subject && <div><strong>Subject:</strong> {log.subject}</div>}
                          {log.lastError && (
                            <div className="text-rose-600 dark:text-rose-400 mt-1">
                              <strong>Error:</strong> {log.lastError}
                            </div>
                          )}
                          {log.notes && (
                            <div className="text-neutral-500 italic mt-1">{log.notes}</div>
                          )}
                        </div>

                        {isFail && (
                          <div className="mt-3 pt-2 border-t border-rose-200 dark:border-rose-900/60 flex justify-end">
                            <button
                              onClick={handleRetryEmail}
                              disabled={isSending}
                              className="px-2.5 py-1 text-xs font-bold rounded bg-rose-600 text-white hover:bg-rose-700 flex items-center gap-1 shadow-2xs"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Retry Sending</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ADMINISTRATOR COST & DELIVERY CONTROLS */}
          {activeTab === 'admin_settings' && (
            <div className="space-y-5">
              <div>
                <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                  Administrator Automation & Cost Controls
                </h3>
                <p className="text-xs text-neutral-500">
                  Configure free email delivery rules, auto-approval dispatch, and carrier SMS cost protection.
                </p>
              </div>

              <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-4">
                
                {/* Setting 1: Auto-Send on Admin Approval */}
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-700">
                  <div>
                    <div className="font-bold text-xs text-neutral-900 dark:text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Automatically Send After Admin Approval</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      When an administrator approves a booking, automatically trigger the confirmation through Email first (free).
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={companySettings.autoSendOnApproval}
                    onChange={(e) => handleSaveCompanySettings({
                      ...companySettings,
                      autoSendOnApproval: e.target.checked
                    })}
                    className="h-4 w-4 rounded text-amber-500 focus:ring-amber-500 mt-1 cursor-pointer"
                  />
                </div>

                {/* Setting 2: Avoid Paid SMS unless enabled */}
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-700">
                  <div>
                    <div className="font-bold text-xs text-neutral-900 dark:text-white flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-purple-600" />
                      <span>Allow Paid SMS Dispatch (Carrier Charges Apply)</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Keep disabled to eliminate SMS carrier fees. When disabled, the system enforces free Email, WhatsApp, or Messenger.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={companySettings.enablePaidSms}
                    onChange={(e) => handleSaveCompanySettings({
                      ...companySettings,
                      enablePaidSms: e.target.checked
                    })}
                    className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500 mt-1 cursor-pointer"
                  />
                </div>

                {/* Setting 3: Fallback Channel */}
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-700">
                  <div>
                    <div className="font-bold text-xs text-neutral-900 dark:text-white">
                      Fallback Channel (If Email Fails or Client Has No Email)
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Select free secondary messaging service if email cannot be delivered.
                    </p>
                  </div>
                  <select
                    value={companySettings.fallbackChannel}
                    onChange={(e) => handleSaveCompanySettings({
                      ...companySettings,
                      fallbackChannel: e.target.value as any
                    })}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-medium"
                  >
                    <option value="whatsapp">WhatsApp (Recommended free)</option>
                    <option value="messenger">Facebook Messenger</option>
                    <option value="none">None (Email Only)</option>
                  </select>
                </div>

                {/* Setting 4: Business Contact Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] font-bold text-neutral-500 uppercase">
                      Contact Phone (for Contact Us button)
                    </label>
                    <input
                      type="text"
                      value={companySettings.contactPhone}
                      onChange={(e) => setCompanySettings({ ...companySettings, contactPhone: e.target.value })}
                      onBlur={() => handleSaveCompanySettings(companySettings)}
                      className="w-full mt-1 px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-neutral-500 uppercase">
                      Contact Email (for Reschedule requests)
                    </label>
                    <input
                      type="email"
                      value={companySettings.contactEmail}
                      onChange={(e) => setCompanySettings({ ...companySettings, contactEmail: e.target.value })}
                      onBlur={() => handleSaveCompanySettings(companySettings)}
                      className="w-full mt-1 px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                    />
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 py-3.5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-neutral-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Channel: <strong>{selectedChannel.toUpperCase()}</strong> (Free & Logged)</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 transition-colors"
            >
              Close
            </button>

            {/* Admin Quick Approval (WITHOUT auto-send) */}
            {!isBulk && activeTask && !activeTask.isApproved && isAuthorized && (
              <button
                onClick={handleSimpleApprove}
                disabled={isSending}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 flex items-center gap-1.5 transition-all shadow-2xs"
                title="Mark booking as verified by admin. No confirmation is auto-sent."
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Approve Booking</span>
              </button>
            )}

            {/* Main Dispatch Button */}
            <button
              onClick={isBulk ? handleSendBulk : handleSendSingle}
              disabled={isSending || !isAuthorized || (isBulk && selectedTaskIds.length === 0)}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-[#FFB509] hover:bg-[#EAA300] text-neutral-950 flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {isBulk 
                      ? `Send to Selected (${selectedTaskIds.length})` 
                      : `Send ${selectedChannel.toUpperCase()} Confirmation`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
