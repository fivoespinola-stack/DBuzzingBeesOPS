import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, DollarSign, MapPin, FileText, UserCheck, CheckCircle2, Mail, CreditCard, CalendarDays, Check } from 'lucide-react';
import { Task, Cleaner, JobType, PayType, PaymentTerm, Frequency } from '../types';
import { 
  calculateEndTime, 
  formatDate, 
  formatFrequency, 
  isRecurringFrequency, 
  getScheduledDatesForSixMonths, 
  generateSixMonthRecurringTasks 
} from '../utils/formatters';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task, recurringInstances?: Task[]) => void;
  taskToEdit?: Task | null;
  cleaners: Cleaner[];
  defaultDate?: string;
}

const COMMON_JOB_TYPES: JobType[] = [
  'Residential Standard',
  'Residential Deep Clean',
  'End of Lease / Bond',
  'Commercial Office',
  'Airbnb Turnaround',
  'Window Cleaning',
  'Carpet & Upholstery Steam',
  'Post-Construction',
];

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  taskToEdit,
  cleaners,
  defaultDate,
}) => {
  const [jobType, setJobType] = useState<string>('Residential Standard');
  const [customJobType, setCustomJobType] = useState('');
  const [isCustomJob, setIsCustomJob] = useState(false);
  const [address, setAddress] = useState('');
  const [clientNumber, setClientNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('12:00');
  const [fixHour, setFixHour] = useState<number>(3.0);
  const [rate, setRate] = useState<number>(55.0);
  const [payType, setPayType] = useState<PayType>('Hourly');
  const [paymentTerm, setPaymentTerm] = useState<PaymentTerm>('Cash');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [assignedCleanerIds, setAssignedCleanerIds] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<Frequency>('one-off');
  const [customFrequency, setCustomFrequency] = useState('');
  const [isCustomFrequency, setIsCustomFrequency] = useState(false);
  const [applySixMonths, setApplySixMonths] = useState(true);
  const [remarks, setRemarks] = useState('');
  const [completed, setCompleted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const prevIsOpenRef = React.useRef(false);
  const prevTaskIdRef = React.useRef<string | null | undefined>(undefined);

  const STANDARD_FREQUENCIES = [
    'one-off',
    'twice-a-week',
    'weekly',
    'fortnightly',
    'every-3rd-week',
    'monthly',
    'end-of-month',
    'every-2-months',
    'flexible',
  ];

  useEffect(() => {
    // Only re-initialize form when modal opens or when editing a different task
    const isOpening = isOpen && !prevIsOpenRef.current;
    const isTaskChanged = isOpen && prevTaskIdRef.current !== (taskToEdit ? taskToEdit.id : null);

    if (isOpening || isTaskChanged) {
      if (taskToEdit) {
        if (COMMON_JOB_TYPES.includes(taskToEdit.jobType as JobType)) {
          setJobType(taskToEdit.jobType);
          setIsCustomJob(false);
        } else {
          setJobType('Other');
          setCustomJobType(taskToEdit.jobType);
          setIsCustomJob(true);
        }
        setAddress(taskToEdit.address || '');
        setClientNumber(taskToEdit.clientNumber || '');
        setClientName(taskToEdit.clientName || '');
        setClientPhone(taskToEdit.clientPhone || '');
        setClientEmail(taskToEdit.clientEmail || '');
        setDate(taskToEdit.date || '');
        setStartTime(taskToEdit.startTime || '09:00');
        setEndTime(taskToEdit.endTime || '12:00');
        setFixHour(taskToEdit.fixHour || 3.0);
        setRate(taskToEdit.rate || 55.0);

        // Pay Type initialization (Restored to original options: Hourly or Fixed Price)
        const currentPayType = taskToEdit.payType;
        if (currentPayType === 'Fixed Price') {
          setPayType('Fixed Price');
        } else {
          setPayType('Hourly');
        }

        // Payment Term initialization (Cash or Invoice)
        const currentPaymentTerm = taskToEdit.paymentTerm;
        if (currentPaymentTerm === 'Invoice' || currentPaymentTerm === 'Cash') {
          setPaymentTerm(currentPaymentTerm);
        } else if (taskToEdit.payType === 'Invoice' || taskToEdit.invoiceNumber) {
          setPaymentTerm('Invoice');
        } else {
          setPaymentTerm('Cash');
        }

        setInvoiceNumber(taskToEdit.invoiceNumber || '');
        setAssignedCleanerIds(taskToEdit.assignedCleanerIds || []);

        // Frequency initialization
        const currentFreq = taskToEdit.frequency || 'one-off';
        if (STANDARD_FREQUENCIES.includes(currentFreq)) {
          setFrequency(currentFreq);
          setIsCustomFrequency(false);
          setCustomFrequency('');
        } else {
          setFrequency('others');
          setIsCustomFrequency(true);
          setCustomFrequency(currentFreq === 'others' ? '' : currentFreq);
        }

        setApplySixMonths(false);
        setRemarks(taskToEdit.remarks || '');
        setCompleted(taskToEdit.completed || false);
      } else {
        // New task defaults
        setJobType('Residential Standard');
        setIsCustomJob(false);
        setCustomJobType('');
        setAddress('');
        setClientNumber('');
        setClientName('');
        setClientPhone('');
        setClientEmail('');
        const todayStr = defaultDate || new Date().toISOString().split('T')[0];
        setDate(todayStr);
        setStartTime('09:00');
        setFixHour(3.0);
        setEndTime(calculateEndTime('09:00', 3.0));
        setRate(55.0);
        setPayType('Hourly');
        setPaymentTerm('Cash');
        // Leave invoice number empty until client pays obligation
        setInvoiceNumber('');
        setAssignedCleanerIds(cleaners.length > 0 ? [cleaners[0].id] : []);
        setFrequency('one-off');
        setIsCustomFrequency(false);
        setCustomFrequency('');
        setApplySixMonths(true);
        setRemarks('');
        setCompleted(false);
      }
      setErrors({});
    }

    prevIsOpenRef.current = isOpen;
    prevTaskIdRef.current = taskToEdit ? taskToEdit.id : null;
  }, [isOpen, taskToEdit, defaultDate]);

  // When start time or fixHour changes, update end time
  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    setEndTime(calculateEndTime(newStart, fixHour));
  };

  const handleFixHourChange = (hours: number) => {
    const validHours = Math.max(0.25, hours);
    setFixHour(validHours);
    setEndTime(calculateEndTime(startTime, validHours));
  };

  const toggleCleanerAssignment = (id: string) => {
    setAssignedCleanerIds((prev) =>
      prev.includes(id) ? prev.filter((cId) => cId !== id) : [...prev, id]
    );
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!address.trim()) {
      newErrors.address = 'Service address is required.';
    }
    if (!date) {
      newErrors.date = 'Date is required.';
    }
    // Invoice number is deliberately optional: left empty until client pays obligation
    if (fixHour <= 0) {
      newErrors.fixHour = 'Estimated hours must be greater than 0.';
    }
    if (rate < 0) {
      newErrors.rate = 'Rate cannot be negative.';
    }
    if (isCustomJob && !customJobType.trim()) {
      newErrors.jobType = 'Please specify custom job type.';
    }
    if (isCustomFrequency && !customFrequency.trim()) {
      newErrors.frequency = 'Please specify custom frequency.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const finalJobType = isCustomJob ? customJobType.trim() : jobType;
    const finalFrequency = isCustomFrequency ? customFrequency.trim() : frequency;
    const isRecurring = isRecurringFrequency(finalFrequency);

    const savedTask: Task = {
      id: taskToEdit ? taskToEdit.id : `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      jobType: finalJobType,
      address: address.trim(),
      clientNumber: clientNumber.trim() || undefined,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      clientEmail: clientEmail.trim(),
      fixHour,
      rate,
      payType,
      paymentTerm,
      invoiceNumber: invoiceNumber.trim(),
      assignedCleanerIds,
      remarks: remarks.trim(),
      date,
      startTime,
      endTime,
      frequency: finalFrequency,
      completed,
      createdAt: taskToEdit ? taskToEdit.createdAt : new Date().toISOString(),
      isRecurring,
      seriesId: taskToEdit?.seriesId,
    };

    let futureRecurringInstances: Task[] = [];
    if (applySixMonths && isRecurring) {
      futureRecurringInstances = generateSixMonthRecurringTasks(savedTask);
    }

    onSave(savedTask, futureRecurringInstances);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="bg-white dark:bg-neutral-900 rounded-2xl max-w-2xl w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden my-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FFB509] flex items-center justify-center text-neutral-950 font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h2 id="task-modal-title" className="text-base font-bold text-neutral-900 dark:text-white">
                {taskToEdit ? 'Edit Cleaning Task' : 'Schedule New Cleaning Task'}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                DBuzzingBees Job & Timesheet Record
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 transition-colors focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Job Type & Frequency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="task-job-type" className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                Job Type *
              </label>
              <select
                id="task-job-type"
                value={isCustomJob ? 'Other' : jobType}
                onChange={(e) => {
                  if (e.target.value === 'Other') {
                    setIsCustomJob(true);
                  } else {
                    setIsCustomJob(false);
                    setJobType(e.target.value);
                  }
                }}
                className="w-full px-3.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFB509] focus:border-[#FFB509] text-neutral-900 dark:text-white"
              >
                {COMMON_JOB_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
                <option value="Other">Other / Custom Job...</option>
              </select>
              {isCustomJob && (
                <input
                  type="text"
                  placeholder="Enter custom job type..."
                  value={customJobType}
                  onChange={(e) => setCustomJobType(e.target.value)}
                  className="mt-2 w-full px-3 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFB509] text-neutral-900 dark:text-white"
                />
              )}
              {errors.jobType && <p className="mt-1 text-xs text-red-500">{errors.jobType}</p>}
            </div>

            <div>
              <label htmlFor="task-frequency" className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                Frequency
              </label>
              <select
                id="task-frequency"
                value={isCustomFrequency ? 'others' : frequency}
                onChange={(e) => {
                  if (e.target.value === 'others') {
                    setIsCustomFrequency(true);
                    setFrequency('others');
                  } else {
                    setIsCustomFrequency(false);
                    setFrequency(e.target.value as Frequency);
                  }
                }}
                className="w-full px-3.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFB509] focus:border-[#FFB509] text-neutral-900 dark:text-white"
              >
                <option value="one-off">One-off Job</option>
                <option value="twice-a-week">Twice a week</option>
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Fortnightly (Every 2 Weeks)</option>
                <option value="every-3rd-week">Every 3rd week</option>
                <option value="monthly">Monthly</option>
                <option value="end-of-month">End of the month</option>
                <option value="every-2-months">Every 2 months</option>
                <option value="flexible">Flexible</option>
                <option value="others">Others (Custom frequency)...</option>
              </select>
              {isCustomFrequency && (
                <input
                  type="text"
                  placeholder="Enter custom frequency (e.g. Every 10 days, Bi-monthly)..."
                  value={customFrequency}
                  onChange={(e) => setCustomFrequency(e.target.value)}
                  className="mt-2 w-full px-3 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFB509] text-neutral-900 dark:text-white"
                />
              )}
              {isRecurringFrequency(isCustomFrequency ? customFrequency : frequency) && (
                <div className="mt-2.5 p-3 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-xs text-amber-950 dark:text-amber-100 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-bold text-neutral-900 dark:text-white">
                      <CalendarDays className="w-4 h-4 text-amber-600" />
                      <span>Cleaning Calendar (Next 6 Months)</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full font-bold bg-[#FFB509] text-neutral-950 text-[10px]">
                      {getScheduledDatesForSixMonths(date || new Date().toISOString().split('T')[0], isCustomFrequency ? customFrequency : frequency).length} Visits
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-300">
                    Frequency <strong className="text-neutral-900 dark:text-white">{formatFrequency(isCustomFrequency ? customFrequency : frequency)}</strong> will automatically populate the cleaning calendar for the next 6 months.
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer font-semibold select-none pt-0.5 text-[11.5px] text-neutral-900 dark:text-white">
                    <input
                      type="checkbox"
                      checked={applySixMonths}
                      onChange={(e) => setApplySixMonths(e.target.checked)}
                      className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-600 text-[#FFB509] focus:ring-[#FFB509]"
                    />
                    <span>Schedule recurring visits in the cleaning calendar for the next 6 months</span>
                  </label>
                </div>
              )}
              {errors.frequency && <p className="mt-1 text-xs text-red-500">{errors.frequency}</p>}
            </div>
          </div>

          {/* Service Address */}
          <div>
            <label htmlFor="task-address" className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
              Service Address *
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
              <input
                id="task-address"
                type="text"
                required
                placeholder="e.g. 742 Evergreen Terrace, Suite 4B"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFB509] focus:border-[#FFB509] text-neutral-900 dark:text-white"
              />
            </div>
            {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address}</p>}
          </div>

          {/* Client Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div>
              <label htmlFor="task-client-number" className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                Client #
              </label>
              <input
                id="task-client-number"
                type="text"
                placeholder="e.g. BBA0098"
                value={clientNumber}
                onChange={(e) => setClientNumber(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2 text-sm font-mono bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFB509] focus:border-[#FFB509] text-neutral-900 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="task-client-name" className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                Client Name
              </label>
              <input
                id="task-client-name"
                type="text"
                placeholder="e.g. Elena Rostova"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFB509] focus:border-[#FFB509] text-neutral-900 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="task-client-phone" className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                Client Phone
              </label>
              <input
                id="task-client-phone"
                type="tel"
                placeholder="e.g. +1 (555) 019-2834"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFB509] focus:border-[#FFB509] text-neutral-900 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="task-client-email" className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                Client Email
              </label>
              <input
                id="task-client-email"
                type="email"
                placeholder="e.g. elena.rostova@example.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFB509] focus:border-[#FFB509] text-neutral-900 dark:text-white"
              />
            </div>
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="task-date" className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                Job Date *
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                <input
                  id="task-date"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFB509] focus:border-[#FFB509] text-neutral-900 dark:text-white font-mono"
                />
              </div>
              {errors.date && <p className="mt-1 text-xs text-red-500">{errors.date}</p>}
            </div>

            <div>
              <label htmlFor="task-start-time" className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                Start Time
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                <input
                  id="task-start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFB509] focus:border-[#FFB509] text-neutral-900 dark:text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label htmlFor="task-end-time" className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                End Time
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                <input
                  id="task-end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFB509] focus:border-[#FFB509] text-neutral-900 dark:text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Fix Hour, Rate, Pay Type, Payment Term */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800">
            <div>
              <label htmlFor="task-fix-hour" className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                Fix Hours (Duration) *
              </label>
              <input
                id="task-fix-hour"
                type="number"
                step="0.25"
                min="0.25"
                max="24"
                value={fixHour}
                onChange={(e) => handleFixHourChange(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2 text-sm bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFB509] text-neutral-900 dark:text-white font-mono"
              />
              {errors.fixHour && <p className="mt-1 text-xs text-red-500">{errors.fixHour}</p>}
            </div>

            <div>
              <label htmlFor="task-rate" className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                Client Rate ($) *
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  id="task-rate"
                  type="number"
                  step="0.5"
                  min="0"
                  value={rate}
                  onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-3.5 py-2 text-sm bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFB509] text-neutral-900 dark:text-white font-mono"
                />
              </div>
              {errors.rate && <p className="mt-1 text-xs text-red-500">{errors.rate}</p>}
            </div>

            <div>
              <label htmlFor="task-pay-type" className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                Pay Type
              </label>
              <select
                id="task-pay-type"
                value={payType}
                onChange={(e) => setPayType(e.target.value as PayType)}
                className="w-full px-3.5 py-2 text-sm bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFB509] text-neutral-900 dark:text-white"
              >
                <option value="Hourly">Hourly Rate</option>
                <option value="Fixed Price">Fixed Price</option>
              </select>
            </div>

            <div>
              <label htmlFor="task-payment-term" className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                Payment Term *
              </label>
              <select
                id="task-payment-term"
                value={paymentTerm}
                onChange={(e) => setPaymentTerm(e.target.value as PaymentTerm)}
                className="w-full px-3.5 py-2 text-sm bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFB509] text-neutral-900 dark:text-white font-semibold"
              >
                <option value="Cash">Cash</option>
                <option value="Invoice">Invoice</option>
              </select>
            </div>
          </div>

          {/* Invoice Number - Optional on creation, filled once client pays */}
          <div>
            <label htmlFor="task-invoice" className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
              Invoice Number <span className="text-neutral-400 font-normal lowercase">(leave empty until client pays obligation)</span>
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
              <input
                id="task-invoice"
                type="text"
                placeholder="e.g. INV-2026-105 (leave blank until client pays)"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFB509] text-neutral-900 dark:text-white font-mono uppercase"
              />
            </div>
            {errors.invoiceNumber && <p className="mt-1 text-xs text-red-500">{errors.invoiceNumber}</p>}
          </div>

          {/* Assigned Cleaners (One or more can be selected) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                Assigned Cleaners <span className="text-[#FFB509] font-bold">({assignedCleanerIds.length} selected)</span>
              </label>
              {cleaners.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setAssignedCleanerIds(cleaners.map((c) => c.id))}
                    className="text-amber-600 dark:text-amber-400 hover:underline font-semibold"
                  >
                    Select All
                  </button>
                  <span className="text-neutral-300 dark:text-neutral-700">|</span>
                  <button
                    type="button"
                    onClick={() => setAssignedCleanerIds([])}
                    className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:underline"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40">
              {cleaners.map((cleaner) => {
                const isChecked = assignedCleanerIds.includes(cleaner.id);
                return (
                  <label
                    key={cleaner.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all border text-xs select-none ${
                      isChecked
                        ? 'border-amber-400 bg-amber-50/90 dark:bg-amber-950/50 dark:border-amber-600 shadow-xs'
                        : 'border-neutral-200/60 dark:border-neutral-700/60 hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCleanerAssignment(cleaner.id)}
                        className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-600 text-[#FFB509] focus:ring-[#FFB509] cursor-pointer"
                      />
                      <div className="min-w-0">
                        <span className="font-bold text-neutral-900 dark:text-white block truncate">
                          {cleaner.name}
                        </span>
                        {cleaner.phone && (
                          <span className="text-[10px] text-neutral-500 block truncate">
                            {cleaner.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="font-mono text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 shrink-0 ml-2">
                      ${cleaner.hourlyRate.toFixed(2)}/h
                    </span>
                  </label>
                );
              })}
              {cleaners.length === 0 && (
                <p className="text-xs text-neutral-500 p-2 col-span-2">No cleaners registered yet.</p>
              )}
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label htmlFor="task-remarks" className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
              Remarks & Job Notes (Entry codes, pets, supplies)
            </label>
            <textarea
              id="task-remarks"
              rows={2}
              placeholder="e.g. Key in lockbox #4819. Dog in backyard. Use hardwood cleaner only."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFB509] text-neutral-900 dark:text-white"
            />
          </div>

          {/* Completion Status Checkbox */}
          <div className="p-3.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
            <label htmlFor="task-completed-status" className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                id="task-completed-status"
                type="checkbox"
                checked={completed}
                onChange={(e) => setCompleted(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-600 text-[#FFB509] focus:ring-[#FFB509]"
              />
              <div>
                <span className="text-sm font-bold text-neutral-900 dark:text-white block">
                  Mark Job as Completed
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  Completed jobs appear in weekly payroll and cleaner invoices
                </span>
              </div>
            </label>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold rounded-xl bg-[#FFB509] hover:bg-[#EAA300] text-neutral-950 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FFB509]"
            >
              {taskToEdit ? 'Save Changes' : 'Create Task'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
