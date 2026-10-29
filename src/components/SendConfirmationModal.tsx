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
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Task, Cleaner, UserSession, ConfirmationChannel, ConfirmationStatus, ConfirmationLog, CompanySettings } from '../types';
import { 
  generateConfirmationMessage, 
  buildWhatsAppLink, 
  buildMessengerLink, 
  buildSmsLink, 
  checkChannelAvailability,
  canSendConfirmation,
  getConfirmationStatusMeta,
  DEFAULT_CONFIRMATION_TEMPLATE,
  cleanPhoneNumberForWhatsApp
} from '../utils/confirmationHelpers';
import { loadCompanySettings, saveCompanySettings } from '../services/storage';
import { formatDate, formatTime12h } from '../utils/formatters';

interface SendConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Either a single task or multiple tasks for bulk dispatch
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
  
  // Selected channels to send through
  const [selectedChannels, setSelectedChannels] = useState<{ [K in ConfirmationChannel]: boolean }>({
    whatsapp: true,
    messenger: false,
    sms: false,
  });

  // Message body state (customizable live before sending)
  const [messageText, setMessageText] = useState('');
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [showTemplateSettings, setShowTemplateSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null);

  // Manual status update state
  const [manualStatus, setManualStatus] = useState<ConfirmationStatus>('not_sent');
  const [statusNotes, setStatusNotes] = useState('');
  const [statusUpdateSuccess, setStatusUpdateSuccess] = useState(false);

  // Quick edit for missing phone/messenger on active task
  const [tempPhone, setTempPhone] = useState('');
  const [tempMessenger, setTempMessenger] = useState('');
  const [isEditingContact, setIsEditingContact] = useState(false);

  // Bulk selection checkboxes (ids of tasks to confirm)
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  // Permissions check
  const isAuthorized = canSendConfirmation(currentUser?.role);

  // Initialize modal state on open or task change
  useEffect(() => {
    if (!isOpen) return;

    const currentSettings = loadCompanySettings();
    setCompanySettings(currentSettings);
    setSendSuccessMessage(null);
    setStatusUpdateSuccess(false);

    if (isBulk) {
      setSelectedTaskIds(bulkTasks.map((t) => t.id));
      if (bulkTasks[0]) {
        const generated = generateConfirmationMessage(bulkTasks[0], cleaners, currentSettings);
        setMessageText(generated);
      }
    } else if (activeTask) {
      setManualStatus(activeTask.confirmationStatus || 'not_sent');
      setTempPhone(activeTask.clientPhone || '');
      setTempMessenger(activeTask.clientMessenger || '');
      
      const generated = generateConfirmationMessage(activeTask, cleaners, currentSettings);
      setMessageText(generated);

      // Default channel preselection based on client preferredChannel or available contacts
      const hasPhone = Boolean(activeTask.clientPhone?.trim());
      const hasMessenger = Boolean(activeTask.clientMessenger?.trim());

      if (activeTask.clientPreferredChannel === 'whatsapp') {
        setSelectedChannels({ whatsapp: hasPhone, messenger: false, sms: false });
      } else if (activeTask.clientPreferredChannel === 'sms') {
        setSelectedChannels({ whatsapp: false, messenger: false, sms: hasPhone });
      } else if (activeTask.clientPreferredChannel === 'messenger') {
        setSelectedChannels({ whatsapp: false, messenger: true, sms: false });
      } else {
        setSelectedChannels({
          whatsapp: hasPhone,
          messenger: hasMessenger,
          sms: !hasPhone ? false : false,
        });
      }
    }
  }, [isOpen, task, bulkTasks, isBulk]);

  if (!isOpen || activeTaskList.length === 0) return null;

  // Channel availability for active single task
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
      const regenerated = generateConfirmationMessage(activeTask, cleaners, companySettings, DEFAULT_CONFIRMATION_TEMPLATE);
      setMessageText(regenerated);
    }
  };

  const handleSaveAsDefaultTemplate = () => {
    const updated = {
      ...companySettings,
      confirmationMessageTemplate: messageText,
    };
    setCompanySettings(updated);
    saveCompanySettings(updated);
    setShowTemplateSettings(false);
    setSendSuccessMessage('Template saved as default for future booking confirmations!');
    setTimeout(() => setSendSuccessMessage(null), 4000);
  };

  const handleSaveQuickContact = () => {
    if (!activeTask) return;
    const updated: Task = {
      ...activeTask,
      clientPhone: tempPhone.trim(),
      clientMessenger: tempMessenger.trim(),
    };
    onUpdateTask(updated);
    setIsEditingContact(false);
  };

  // Perform single send
  const handleSendSingle = (targetTask: Task) => {
    if (!isAuthorized) return;

    const channelsToSend: ConfirmationChannel[] = [];
    if (selectedChannels.whatsapp && checkChannelAvailability('whatsapp', targetTask, companySettings).available) {
      channelsToSend.push('whatsapp');
    }
    if (selectedChannels.messenger && checkChannelAvailability('messenger', targetTask, companySettings).available) {
      channelsToSend.push('messenger');
    }
    if (selectedChannels.sms && checkChannelAvailability('sms', targetTask, companySettings).available) {
      channelsToSend.push('sms');
    }

    if (channelsToSend.length === 0) {
      alert('Please select at least one available channel to send.');
      return;
    }

    const timestamp = new Date().toISOString();
    const newLogs: ConfirmationLog[] = [...(targetTask.confirmationLogs || [])];

    // Trigger dispatches
    channelsToSend.forEach((ch) => {
      let url = '';
      let recipient = '';

      if (ch === 'whatsapp') {
        recipient = targetTask.clientPhone || '';
        url = buildWhatsAppLink(recipient, messageText);
        window.open(url, '_blank', 'noopener,noreferrer');
      } else if (ch === 'messenger') {
        recipient = targetTask.clientMessenger || companySettings.facebookPage;
        url = buildMessengerLink(targetTask.clientMessenger, companySettings.facebookPage, messageText);
        window.open(url, '_blank', 'noopener,noreferrer');
      } else if (ch === 'sms') {
        recipient = targetTask.clientPhone || '';
        url = buildSmsLink(recipient, messageText);
        // Fallback for SMS: copy to clipboard and open SMS URI
        navigator.clipboard.writeText(messageText);
        window.location.href = url;
      }

      newLogs.unshift({
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp,
        channel: ch,
        staffName: currentUser?.name || 'Staff User',
        staffUsername: currentUser?.username,
        status: 'sent',
        recipient,
        messagePreview: messageText.substring(0, 120) + (messageText.length > 120 ? '...' : ''),
        notes: `Dispatched via ${ch.toUpperCase()} by ${currentUser?.name || 'Staff'}`
      });
    });

    const updatedTask: Task = {
      ...targetTask,
      confirmationStatus: 'sent',
      lastConfirmationSentAt: timestamp,
      lastConfirmationChannel: channelsToSend[0],
      confirmationLogs: newLogs,
    };

    onUpdateTask(updatedTask);
    setManualStatus('sent');
    setSendSuccessMessage(`Confirmation sent via ${channelsToSend.map(c => c.toUpperCase()).join(' & ')}! Status set to "Confirmation Sent".`);
  };

  // Perform bulk send
  const handleSendBulk = () => {
    if (!isAuthorized || selectedTaskIds.length === 0) return;

    const targets = bulkTasks.filter((t) => selectedTaskIds.includes(t.id));
    const timestamp = new Date().toISOString();
    const updatedBatch: Task[] = [];
    let openedTabs = 0;

    targets.forEach((targetTask) => {
      const taskMessage = generateConfirmationMessage(targetTask, cleaners, companySettings, messageText);
      const newLogs: ConfirmationLog[] = [...(targetTask.confirmationLogs || [])];
      let primaryChannel: ConfirmationChannel = 'whatsapp';

      if (selectedChannels.whatsapp && targetTask.clientPhone) {
        primaryChannel = 'whatsapp';
        const url = buildWhatsAppLink(targetTask.clientPhone, taskMessage);
        if (openedTabs < 3) {
          window.open(url, '_blank', 'noopener,noreferrer');
          openedTabs++;
        }
        newLogs.unshift({
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp,
          channel: 'whatsapp',
          staffName: currentUser?.name || 'Staff User',
          status: 'sent',
          recipient: targetTask.clientPhone,
          messagePreview: taskMessage.substring(0, 120),
          notes: 'Dispatched via Bulk WhatsApp'
        });
      } else if (selectedChannels.sms && targetTask.clientPhone) {
        primaryChannel = 'sms';
        newLogs.unshift({
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp,
          channel: 'sms',
          staffName: currentUser?.name || 'Staff User',
          status: 'sent',
          recipient: targetTask.clientPhone,
          messagePreview: taskMessage.substring(0, 120),
          notes: 'Dispatched via Bulk SMS'
        });
      }

      updatedBatch.push({
        ...targetTask,
        confirmationStatus: 'sent',
        lastConfirmationSentAt: timestamp,
        lastConfirmationChannel: primaryChannel,
        confirmationLogs: newLogs,
      });
    });

    if (onBulkUpdateTasks) {
      onBulkUpdateTasks(updatedBatch);
    } else {
      updatedBatch.forEach(onUpdateTask);
    }

    setSendSuccessMessage(`Successfully processed confirmations for ${updatedBatch.length} jobs! Status updated to "Confirmation Sent".`);
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  // Manual status update
  const handleUpdateManualStatus = () => {
    if (!activeTask) return;

    const timestamp = new Date().toISOString();
    const newLogs: ConfirmationLog[] = [...(activeTask.confirmationLogs || [])];

    if (manualStatus !== activeTask.confirmationStatus) {
      newLogs.unshift({
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp,
        channel: activeTask.lastConfirmationChannel || 'whatsapp',
        staffName: currentUser?.name || 'Staff User',
        staffUsername: currentUser?.username,
        status: manualStatus,
        recipient: activeTask.clientPhone || activeTask.clientName || 'Client',
        notes: statusNotes.trim() ? statusNotes.trim() : `Manual status change to ${manualStatus.toUpperCase()} by ${currentUser?.name || 'Staff'}`
      });
    }

    const updated: Task = {
      ...activeTask,
      confirmationStatus: manualStatus,
      confirmationLogs: newLogs,
    };

    onUpdateTask(updated);
    setStatusNotes('');
    setStatusUpdateSuccess(true);
    setTimeout(() => setStatusUpdateSuccess(false), 3000);
  };

  const statusMeta = getConfirmationStatusMeta(activeTask?.confirmationStatus);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col my-6 max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFB509] flex items-center justify-center shadow-xs text-neutral-950 font-bold shrink-0">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold tracking-tight text-neutral-900 dark:text-white">
                  {isBulk ? 'Send Booking Confirmations (Bulk)' : 'Send Client Booking Confirmation'}
                </h2>
                {!isBulk && activeTask && (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusMeta.bgClass} ${statusMeta.textClass} ${statusMeta.borderClass}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotClass}`} />
                    {statusMeta.label}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {isBulk 
                  ? `Dispatch formatted booking confirmations to ${selectedTaskIds.length} scheduled clients.`
                  : `Send details directly to ${activeTask?.clientName || 'the client'} via WhatsApp, Messenger, or SMS.`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close confirmation modal"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Permission Banner if not authorized */}
        {!isAuthorized && (
          <div className="bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-800 px-5 py-2.5 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <strong>View-only mode:</strong> Your current role (<strong>{currentUser?.role || 'staff'}</strong>) has permission to preview messages and update status, but sending dispatches requires Administrator, Manager, or Supervisor access.
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
            <button
              onClick={() => setSendSuccessMessage(null)}
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1 text-sm text-neutral-800 dark:text-neutral-200">
          
          {/* Active Job Card Summary (Single Task) */}
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
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-[#FFB509] shrink-0" />
                    <span>{activeTask.address}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-right sm:text-right">
                  <div>
                    <div className="font-bold text-neutral-900 dark:text-white">
                      {formatDate(activeTask.date)}
                    </div>
                    <div className="text-neutral-500 font-mono-numbers">
                      {formatTime12h(activeTask.startTime)} – {formatTime12h(activeTask.endTime)} ({activeTask.fixHour}h)
                    </div>
                  </div>
                  <button
                    onClick={() => setIsEditingContact(!isEditingContact)}
                    className="p-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-white dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center gap-1"
                    title="Edit contact phone or messenger"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Edit Contact</span>
                  </button>
                </div>
              </div>

              {/* Quick Contact Editor Row (if opened) */}
              {isEditingContact && (
                <div className="mt-3 p-3 bg-white dark:bg-neutral-900 rounded-lg border border-amber-200 dark:border-amber-800/80 space-y-2">
                  <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                    Update Client Communication Contacts
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-neutral-500 uppercase">Mobile / Phone (WhatsApp & SMS)</label>
                      <input
                        type="text"
                        value={tempPhone}
                        onChange={(e) => setTempPhone(e.target.value)}
                        placeholder="e.g. 0412 884 921"
                        className="w-full mt-1 px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-neutral-500 uppercase">Messenger Username / Profile</label>
                      <input
                        type="text"
                        value={tempMessenger}
                        onChange={(e) => setTempMessenger(e.target.value)}
                        placeholder="e.g. sarah.smith or m.me/..."
                        className="w-full mt-1 px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => setIsEditingContact(false)}
                      className="px-2.5 py-1 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveQuickContact}
                      className="px-3 py-1 text-xs font-bold rounded-lg bg-[#FFB509] text-neutral-950 hover:bg-[#EAA300]"
                    >
                      Save Contacts
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bulk Jobs Table Selector (Bulk Mode) */}
          {isBulk && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Select Jobs to Include ({selectedTaskIds.length} of {bulkTasks.length} selected)
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

              <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 dark:text-neutral-400 font-bold border-b border-neutral-200 dark:border-neutral-800 sticky top-0">
                    <tr>
                      <th className="py-2 px-3 w-8">
                        <input
                          type="checkbox"
                          checked={selectedTaskIds.length === bulkTasks.length && bulkTasks.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedTaskIds(bulkTasks.map((t) => t.id));
                            else setSelectedTaskIds([]);
                          }}
                          className="rounded text-[#FFB509] focus:ring-[#FFB509]"
                        />
                      </th>
                      <th className="py-2 px-3">Client</th>
                      <th className="py-2 px-3">Service & Date</th>
                      <th className="py-2 px-3">Contact</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {bulkTasks.map((t) => {
                      const isChecked = selectedTaskIds.includes(t.id);
                      const hasPhone = Boolean(t.clientPhone?.trim());
                      const taskMeta = getConfirmationStatusMeta(t.confirmationStatus);
                      return (
                        <tr key={t.id} className={isChecked ? 'bg-amber-50/20 dark:bg-amber-950/20' : 'opacity-60'}>
                          <td className="py-2 px-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTaskIds([...selectedTaskIds, t.id]);
                                } else {
                                  setSelectedTaskIds(selectedTaskIds.filter((id) => id !== t.id));
                                }
                              }}
                              className="rounded text-[#FFB509] focus:ring-[#FFB509]"
                            />
                          </td>
                          <td className="py-2 px-3 font-semibold text-neutral-900 dark:text-white">
                            {t.clientName || 'Client'}
                          </td>
                          <td className="py-2 px-3 text-neutral-600 dark:text-neutral-300">
                            {t.jobType} · {formatDate(t.date)} ({formatTime12h(t.startTime)})
                          </td>
                          <td className="py-2 px-3">
                            {hasPhone ? (
                              <span className="font-mono text-neutral-700 dark:text-neutral-300">{t.clientPhone}</span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400 font-medium">Missing Phone</span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${taskMeta.bgClass} ${taskMeta.textClass}`}>
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

          {/* Channel Selection Matrix */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                1. Select Communication Channels
              </span>
              <span className="text-xs text-neutral-500">
                You can select multiple channels in one action
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* WhatsApp Card */}
              <label 
                className={`relative p-3.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                  selectedChannels.whatsapp
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-1 ring-emerald-500'
                    : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/40 hover:border-neutral-300'
                } ${!isBulk && !waAvail.available ? 'opacity-60 cursor-not-allowed bg-neutral-100 dark:bg-neutral-800/20' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                        <span>WhatsApp</span>
                        {activeTask?.clientPreferredChannel === 'whatsapp' && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 px-1.5 py-0.2 rounded font-bold">
                            Preferred
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        wa.me Direct Link
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedChannels.whatsapp}
                    disabled={!isBulk && !waAvail.available}
                    onChange={(e) => setSelectedChannels({ ...selectedChannels, whatsapp: e.target.checked })}
                    className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                </div>

                <div className="mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-700/60 text-xs">
                  {!isBulk ? (
                    waAvail.available ? (
                      <span className="text-emerald-700 dark:text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        {waAvail.recipient}
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 text-[11px] flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {waAvail.reason || 'No phone number'}
                      </span>
                    )
                  ) : (
                    <span className="text-neutral-500 text-[11px]">Formatted for client mobiles</span>
                  )}
                </div>
              </label>

              {/* Facebook Messenger Card */}
              <label 
                className={`relative p-3.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                  selectedChannels.messenger
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-1 ring-blue-500'
                    : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/40 hover:border-neutral-300'
                } ${!isBulk && !messengerAvail.available ? 'opacity-60 cursor-not-allowed bg-neutral-100 dark:bg-neutral-800/20' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                      <Send className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                        <span>Messenger</span>
                        {activeTask?.clientPreferredChannel === 'messenger' && (
                          <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-1.5 py-0.2 rounded font-bold">
                            Preferred
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        m.me / Page Chat
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedChannels.messenger}
                    disabled={!isBulk && !messengerAvail.available}
                    onChange={(e) => setSelectedChannels({ ...selectedChannels, messenger: e.target.checked })}
                    className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                </div>

                <div className="mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-700/60 text-xs">
                  {!isBulk ? (
                    messengerAvail.available ? (
                      <span className="text-blue-700 dark:text-blue-400 font-mono text-[11px] flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        {messengerAvail.recipient}
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 text-[11px] flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {messengerAvail.reason || 'Missing handle'}
                      </span>
                    )
                  ) : (
                    <span className="text-neutral-500 text-[11px]">Dispatches to Facebook Page</span>
                  )}
                </div>
              </label>

              {/* SMS Card */}
              <label 
                className={`relative p-3.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                  selectedChannels.sms
                    ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/30 ring-1 ring-purple-500'
                    : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/40 hover:border-neutral-300'
                } ${!isBulk && !smsAvail.available ? 'opacity-60 cursor-not-allowed bg-neutral-100 dark:bg-neutral-800/20' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                        <span>SMS Text</span>
                        {activeTask?.clientPreferredChannel === 'sms' && (
                          <span className="text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 px-1.5 py-0.2 rounded font-bold">
                            Preferred
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        Direct SMS / Gateway
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedChannels.sms}
                    disabled={!isBulk && !smsAvail.available}
                    onChange={(e) => setSelectedChannels({ ...selectedChannels, sms: e.target.checked })}
                    className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500"
                  />
                </div>

                <div className="mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-700/60 text-xs">
                  {!isBulk ? (
                    smsAvail.available ? (
                      <span className="text-purple-700 dark:text-purple-400 font-mono text-[11px] flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        {smsAvail.recipient}
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 text-[11px] flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {smsAvail.reason || 'No mobile number'}
                      </span>
                    )
                  ) : (
                    <span className="text-neutral-500 text-[11px]">Direct mobile SMS link</span>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Message Preview & Live Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  2. Review & Edit Branded Message
                </span>
                <span className="text-xs text-neutral-400">
                  ({messageText.length} characters)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyMessage}
                  className="px-2.5 py-1 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center gap-1 font-semibold transition-colors"
                >
                  {copiedMessage ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedMessage ? 'Copied' : 'Copy Text'}</span>
                </button>
                <button
                  onClick={handleResetTemplate}
                  title="Reset to default format"
                  className="px-2.5 py-1 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center gap-1 font-semibold transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
                <button
                  onClick={() => setShowTemplateSettings(!showTemplateSettings)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center gap-1 font-semibold transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-[#FFB509]" />
                  <span>Template Options</span>
                </button>
              </div>
            </div>

            {/* Template Save Options Drawer */}
            {showTemplateSettings && (
              <div className="p-3.5 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-900 dark:text-white">
                    Save as Company Default Template
                  </span>
                  <button
                    onClick={handleSaveAsDefaultTemplate}
                    className="px-3 py-1 text-xs font-bold rounded-lg bg-[#FFB509] text-neutral-950 hover:bg-[#EAA300]"
                  >
                    Save Current Text as Default
                  </button>
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  You can use dynamic placeholders: <code className="bg-white dark:bg-neutral-900 px-1 py-0.5 rounded font-mono">{"{{clientName}}"}</code>, <code className="bg-white dark:bg-neutral-900 px-1 py-0.5 rounded font-mono">{"{{serviceType}}"}</code>, <code className="bg-white dark:bg-neutral-900 px-1 py-0.5 rounded font-mono">{"{{date}}"}</code>, <code className="bg-white dark:bg-neutral-900 px-1 py-0.5 rounded font-mono">{"{{startTime}}"}</code>, <code className="bg-white dark:bg-neutral-900 px-1 py-0.5 rounded font-mono">{"{{endTime}}"}</code>, <code className="bg-white dark:bg-neutral-900 px-1 py-0.5 rounded font-mono">{"{{address}}"}</code>, <code className="bg-white dark:bg-neutral-900 px-1 py-0.5 rounded font-mono">{"{{cleaners}}"}</code>, <code className="bg-white dark:bg-neutral-900 px-1 py-0.5 rounded font-mono">{"{{specialInstructions}}"}</code>.
                </p>
              </div>
            )}

            {/* Editable Textarea */}
            <div className="relative">
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={9}
                className="w-full p-3.5 text-xs font-sans rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-[#FFB509] focus:outline-none leading-relaxed transition-all resize-y"
                placeholder="Confirmation message text..."
              />
            </div>
          </div>

          {/* Status Tracker & Manual Changer (Single Task Mode) */}
          {!isBulk && activeTask && (
            <div className="bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  3. Client Response & Confirmation Status
                </span>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>{showHistory ? 'Hide History' : `Dispatch History (${activeTask.confirmationLogs?.length || 0})`}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-4">
                  <label className="text-[11px] font-bold text-neutral-500 uppercase block mb-1">
                    Current Status
                  </label>
                  <select
                    value={manualStatus}
                    onChange={(e) => setManualStatus(e.target.value as ConfirmationStatus)}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="not_sent">Not Sent</option>
                    <option value="sent">Confirmation Sent</option>
                    <option value="confirmed">Confirmed (Client Replied YES)</option>
                    <option value="needs_reschedule">Needs Reschedule (Client requested change)</option>
                  </select>
                </div>

                <div className="sm:col-span-5">
                  <label className="text-[11px] font-bold text-neutral-500 uppercase block mb-1">
                    Staff Notes / Client Reply
                  </label>
                  <input
                    type="text"
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    placeholder="e.g. Client confirmed via SMS for 9:00am"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-3">
                  <button
                    onClick={handleUpdateManualStatus}
                    className="w-full py-2 px-3 text-xs font-bold rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors"
                  >
                    {statusUpdateSuccess ? 'Saved ✓' : 'Update Status'}
                  </button>
                </div>
              </div>

              {/* History Drawer */}
              {showHistory && (
                <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700 space-y-2 animate-in fade-in">
                  <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                    Confirmation Activity Log
                  </span>
                  {activeTask.confirmationLogs && activeTask.confirmationLogs.length > 0 ? (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {activeTask.confirmationLogs.map((log) => (
                        <div key={log.id} className="p-2 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold uppercase text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-mono">
                              {log.channel}
                            </span>
                            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                              {log.staffName}
                            </span>
                            <span className="text-neutral-500 text-[11px]">
                              {log.notes || `Dispatched to ${log.recipient}`}
                            </span>
                          </div>
                          <span className="text-neutral-400 text-[10px] font-mono">
                            {new Date(log.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-400 italic">No confirmation messages have been dispatched yet for this booking.</p>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Action Footer */}
        <div className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Client communication data is stored locally and securely.</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 transition-colors"
            >
              Cancel
            </button>

            {isBulk ? (
              <button
                onClick={handleSendBulk}
                disabled={!isAuthorized || selectedTaskIds.length === 0}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-[#FFB509] hover:bg-[#EAA300] text-neutral-950 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Layers className="w-4 h-4" />
                <span>Dispatch {selectedTaskIds.length} Confirmations</span>
              </button>
            ) : (
              <button
                onClick={() => activeTask && handleSendSingle(activeTask)}
                disabled={!isAuthorized || (!selectedChannels.whatsapp && !selectedChannels.messenger && !selectedChannels.sms)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-[#FFB509] hover:bg-[#EAA300] text-neutral-950 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                <span>Send Booking Confirmation</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
