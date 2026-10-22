import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Edit3, 
  Trash2, 
  Phone, 
  Mail, 
  DollarSign, 
  Award, 
  CheckCircle, 
  X, 
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { Cleaner, Task } from '../types';
import { formatCurrency } from '../utils/formatters';

interface CleanerManagementViewProps {
  cleaners: Cleaner[];
  tasks: Task[];
  onSaveCleaner: (cleaner: Cleaner) => void;
  onDeleteCleaner: (cleanerId: string) => void;
  onEditTask: (task: Task) => void;
}

export const CleanerManagementView: React.FC<CleanerManagementViewProps> = ({
  cleaners,
  tasks,
  onSaveCleaner,
  onDeleteCleaner,
  onEditTask,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCleaner, setEditingCleaner] = useState<Cleaner | null>(null);
  const [cleanerToDelete, setCleanerToDelete] = useState<Cleaner | null>(null);
  const [selectedCleanerForJobs, setSelectedCleanerForJobs] = useState<Cleaner | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [hourlyRate, setHourlyRate] = useState<number>(28.0);
  const [specialTaskPayPerWeek, setSpecialTaskPayPerWeek] = useState<number>(0);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleOpenAdd = () => {
    setEditingCleaner(null);
    setName('');
    setPhone('');
    setEmail('');
    setHourlyRate(28.0);
    setSpecialTaskPayPerWeek(0);
    setStatus('active');
    setNotes('');
    setErrors({});
    setModalOpen(true);
  };

  const handleOpenEdit = (cleaner: Cleaner) => {
    setEditingCleaner(cleaner);
    setName(cleaner.name);
    setPhone(cleaner.phone || '');
    setEmail(cleaner.email || '');
    setHourlyRate(cleaner.hourlyRate || 28.0);
    setSpecialTaskPayPerWeek(cleaner.specialTaskPayPerWeek || 0);
    setStatus(cleaner.status || 'active');
    setNotes(cleaner.notes || '');
    setErrors({});
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Cleaner name is required.';
    if (hourlyRate <= 0) newErrors.hourlyRate = 'Hourly rate must be greater than 0.';
    if (specialTaskPayPerWeek < 0) newErrors.specialTaskPay = 'Special task pay cannot be negative.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const savedCleaner: Cleaner = {
      id: editingCleaner ? editingCleaner.id : `cleaner-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      hourlyRate,
      specialTaskPayPerWeek,
      status,
      notes: notes.trim(),
    };

    onSaveCleaner(savedCleaner);
    setModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            Cleaner Roster & Wage Rates
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Manage cleaning team members, base hourly pay rates, and special weekly task bonuses.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[#FFB509] hover:bg-[#EAA300] text-neutral-950 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FFB509]"
        >
          <Plus className="w-4 h-4" />
          <span>Add Cleaner</span>
        </button>
      </div>

      {/* Cleaners Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {cleaners.map((cleaner) => {
          const cleanerTasks = tasks.filter((t) => t.assignedCleanerIds.includes(cleaner.id));
          const completedTasks = cleanerTasks.filter((t) => t.completed);
          const totalHours = cleanerTasks.reduce((sum, t) => sum + t.fixHour, 0);

          return (
            <div
              key={cleaner.id}
              className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-amber-400 dark:hover:border-amber-500 transition-colors"
            >
              <div>
                {/* Header: Name + Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold flex items-center justify-center text-sm">
                      {cleaner.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                        {cleaner.name}
                      </h2>
                      <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
                        {cleaner.status === 'active' ? 'Active Cleaner' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(cleaner)}
                      className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      title="Edit Cleaner"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setCleanerToDelete(cleaner)}
                      className="p-1.5 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      title="Delete Cleaner"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Contact info */}
                <div className="mt-4 space-y-1 text-xs text-neutral-600 dark:text-neutral-300">
                  {cleaner.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span>{cleaner.phone}</span>
                    </div>
                  )}
                  {cleaner.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span className="truncate">{cleaner.email}</span>
                    </div>
                  )}
                </div>

                {/* Rates Row */}
                <div className="mt-4 p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-100 dark:border-neutral-800 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                      Hourly Rate
                    </span>
                    <span className="text-sm font-extrabold text-neutral-900 dark:text-white font-mono-numbers">
                      {formatCurrency(cleaner.hourlyRate)}
                      <span className="text-[11px] font-normal text-neutral-500">/hr</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                      Special Task / Wk
                    </span>
                    <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400 font-mono-numbers">
                      {formatCurrency(cleaner.specialTaskPayPerWeek)}
                      <span className="text-[11px] font-normal text-neutral-500">/wk</span>
                    </span>
                  </div>
                </div>

                {/* Notes */}
                {cleaner.notes && (
                  <p className="mt-3 text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-2 italic">
                    "{cleaner.notes}"
                  </p>
                )}
              </div>

              {/* Bottom Task count and View Jobs trigger */}
              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                <span className="text-neutral-500 dark:text-neutral-400 font-mono-numbers">
                  <strong>{cleanerTasks.length}</strong> jobs ({completedTasks.length} completed)
                </span>
                <button
                  onClick={() => setSelectedCleanerForJobs(cleaner)}
                  className="font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                >
                  <span>View Jobs</span>
                  <span>&rarr;</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Cleaner Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-800/50">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                {editingCleaner ? 'Edit Cleaner Details' : 'Add New Cleaner'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya Lin"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFB509] text-neutral-900 dark:text-white"
                />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFB509] text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="cleaner@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFB509] text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-200 dark:border-neutral-800">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">
                    Hourly Wage ($/hr) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    required
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 text-sm bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFB509] text-neutral-900 dark:text-white font-mono"
                  />
                  {errors.hourlyRate && <p className="mt-1 text-xs text-red-500">{errors.hourlyRate}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">
                    Special Task Pay/Wk ($)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={specialTaskPayPerWeek}
                    onChange={(e) => setSpecialTaskPayPerWeek(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 text-sm bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFB509] text-neutral-900 dark:text-white font-mono"
                  />
                  {errors.specialTaskPay && <p className="mt-1 text-xs text-red-500">{errors.specialTaskPay}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFB509] text-neutral-900 dark:text-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">
                  Specialties / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Lead cleaner, handles bond cleans & pressure washing."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFB509] text-neutral-900 dark:text-white"
                />
              </div>

              <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[#FFB509] hover:bg-[#EAA300] text-neutral-950 transition-colors shadow-sm"
                >
                  {editingCleaner ? 'Save Changes' : 'Add Cleaner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {cleanerToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-sm w-full p-6 border border-neutral-200 dark:border-neutral-800 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/60 flex items-center justify-center text-red-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">Delete Cleaner?</h3>
                <p className="text-xs text-neutral-500">Remove cleaner from active database.</p>
              </div>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Are you sure you want to remove <strong className="text-neutral-900 dark:text-white">{cleanerToDelete.name}</strong>? Their historical tasks will remain intact.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setCleanerToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteCleaner(cleanerToDelete.id);
                  setCleanerToDelete(null);
                }}
                className="px-4 py-1.5 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cleaner's Assigned Jobs Drawer */}
      {selectedCleanerForJobs && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-2xl w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-800/50">
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                  Jobs Assigned to {selectedCleanerForJobs.name}
                </h2>
                <p className="text-xs text-neutral-500">
                  Rate: ${selectedCleanerForJobs.hourlyRate.toFixed(2)}/hr · Special Task: ${selectedCleanerForJobs.specialTaskPayPerWeek.toFixed(2)}/wk
                </p>
              </div>
              <button
                onClick={() => setSelectedCleanerForJobs(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
              {tasks.filter((t) => t.assignedCleanerIds.includes(selectedCleanerForJobs.id)).length === 0 ? (
                <p className="text-sm text-neutral-500 text-center py-6">
                  No jobs assigned to this cleaner yet.
                </p>
              ) : (
                tasks
                  .filter((t) => t.assignedCleanerIds.includes(selectedCleanerForJobs.id))
                  .map((task) => (
                    <div
                      key={task.id}
                      className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-neutral-900 dark:text-white">
                            {task.jobType}
                          </span>
                          <span className="text-xs text-neutral-400">·</span>
                          <span className="text-xs font-mono text-neutral-500">
                            {task.date} ({task.fixHour} hrs)
                          </span>
                        </div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                          {task.address}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            task.completed
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          {task.completed ? 'Completed' : 'Pending'}
                        </span>
                        <button
                          onClick={() => {
                            onEditTask(task);
                            setSelectedCleanerForJobs(null);
                          }}
                          className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>

            <div className="px-6 py-3 border-t border-neutral-200 dark:border-neutral-800 flex justify-end">
              <button
                onClick={() => setSelectedCleanerForJobs(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-950"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
