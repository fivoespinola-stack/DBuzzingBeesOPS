import React, { useState } from 'react';
import { 
  X, 
  UserPlus, 
  ShieldCheck, 
  User, 
  Lock, 
  Mail, 
  Phone, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  Check, 
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';
import { StaffUser, StaffRole, UserSession } from '../types';
import { loadStaffUsers, saveStaffUsers } from '../services/storage';

interface StaffUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserSession | null;
  onUserListChange?: () => void;
}

export const StaffUsersModal: React.FC<StaffUsersModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserListChange,
}) => {
  const [users, setUsers] = useState<StaffUser[]>(() => loadStaffUsers());
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form states
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<StaffRole>('manager');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setUsername('');
    setName('');
    setPassword('');
    setRole('manager');
    setEmail('');
    setPhone('');
    setStatus('active');
    setShowPassword(false);
    setError(null);
    setEditingUserId(null);
    setShowAddForm(false);
  };

  const handleStartEdit = (user: StaffUser) => {
    setEditingUserId(user.id);
    setUsername(user.username);
    setName(user.name);
    setPassword(user.password || '');
    setRole(user.role);
    setEmail(user.email || '');
    setPhone(user.phone || '');
    setStatus(user.status);
    setError(null);
    setShowAddForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) {
      setError('Username is required.');
      return;
    }

    if (!name.trim()) {
      setError('Staff member full name is required.');
      return;
    }

    if (!password.trim()) {
      setError('Password is required.');
      return;
    }

    // Check duplicate username (unless editing self)
    const duplicate = users.find(
      (u) => u.username.toLowerCase() === cleanUsername && u.id !== editingUserId
    );
    if (duplicate) {
      setError(`Username "${cleanUsername}" is already taken by ${duplicate.name}. Please choose another.`);
      return;
    }

    let updatedUsers: StaffUser[];
    if (editingUserId) {
      updatedUsers = users.map((u) => {
        if (u.id === editingUserId) {
          return {
            ...u,
            username: cleanUsername,
            name: name.trim(),
            password: password.trim(),
            role,
            email: email.trim(),
            phone: phone.trim(),
            status,
          };
        }
        return u;
      });
      setSuccessMessage(`User "${name.trim()}" updated successfully.`);
    } else {
      const newUser: StaffUser = {
        id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        username: cleanUsername,
        name: name.trim(),
        password: password.trim(),
        role,
        email: email.trim(),
        phone: phone.trim(),
        status,
        createdAt: new Date().toISOString(),
      };
      updatedUsers = [...users, newUser];
      setSuccessMessage(`Staff user "${newUser.name}" added! They can now log in with username: ${newUser.username}`);
    }

    setUsers(updatedUsers);
    saveStaffUsers(updatedUsers);
    if (onUserListChange) onUserListChange();
    resetForm();

    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  const handleDeleteUser = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;

    // Safety checks
    if (target.username === 'admin') {
      alert('The primary system administrator account cannot be deleted.');
      return;
    }

    if (currentUser?.username === target.username) {
      alert('You cannot delete your own currently signed-in account.');
      return;
    }

    const remainingAdmins = users.filter((u) => u.role === 'admin' && u.id !== userId);
    if (target.role === 'admin' && remainingAdmins.length === 0) {
      alert('At least one administrator account must be retained in the system.');
      return;
    }

    if (confirm(`Are you sure you want to remove user "${target.name}" (@${target.username})?`)) {
      const updated = users.filter((u) => u.id !== userId);
      setUsers(updated);
      saveStaffUsers(updated);
      if (onUserListChange) onUserListChange();
      setSuccessMessage(`User "${target.name}" removed.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const getRoleBadge = (role: StaffRole) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'supervisor':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'staff':
      default:
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="bg-white dark:bg-neutral-900 rounded-2xl max-w-2xl w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden my-6 transition-colors"
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-modal-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FFB509] flex items-center justify-center text-neutral-950 font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 id="staff-modal-title" className="text-base font-bold text-neutral-900 dark:text-white">
                Staff & User Accounts
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Manage authorised logins and team access permissions
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Notifications */}
          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Add / Edit Form Card */}
          {showAddForm ? (
            <form onSubmit={handleSubmit} className="p-4 rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50/40 dark:bg-amber-950/20 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200 dark:border-amber-800/50">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4" />
                  <span>{editingUserId ? 'Edit Staff User Account' : 'Register New Staff User'}</span>
                </h3>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 underline"
                >
                  Cancel
                </button>
              </div>

              {error && (
                <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">
                    Username * (Login ID)
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. jessica.m"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                      className="w-full pl-9 pr-3 py-1.5 font-mono font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FFB509]"
                    />
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-0.5">Lowercase letters, numbers, and dots.</p>
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jessica Miller"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-1.5 font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FFB509]"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-9 py-1.5 font-mono rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FFB509]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">
                    System Role *
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as StaffRole)}
                    className="w-full px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FFB509]"
                  >
                    <option value="manager">Manager (Operations & Payroll)</option>
                    <option value="supervisor">Supervisor (Schedules & Timesheets)</option>
                    <option value="staff">Staff (Job & Calendar Viewer)</option>
                    <option value="admin">Administrator (Full Access)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      placeholder="e.g. jessica@dbuzzingbees.com.au"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FFB509]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      placeholder="e.g. 0412 345 678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FFB509]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-neutral-800 dark:text-neutral-200 select-none">
                  <input
                    type="checkbox"
                    checked={status === 'active'}
                    onChange={(e) => setStatus(e.target.checked ? 'active' : 'inactive')}
                    className="h-4 w-4 rounded border-neutral-300 text-[#FFB509] focus:ring-[#FFB509]"
                  />
                  <span>Active Account (Able to sign in)</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#FFB509] hover:bg-[#EAA300] text-neutral-950 transition-colors shadow-2xs"
                  >
                    {editingUserId ? 'Save Changes' : 'Create User'}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  {users.length} Registered Team Members
                </span>
                <p className="text-[11px] text-neutral-500">
                  Each user can sign in securely with their assigned username & password.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowAddForm(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-[#FFB509] hover:bg-[#EAA300] text-neutral-950 transition-colors shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Add Staff User</span>
              </button>
            </div>
          )}

          {/* Users List */}
          <div className="space-y-2.5">
            {users.map((u) => {
              const isCurrentSessionUser = currentUser?.username === u.username;

              return (
                <div
                  key={u.id}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                    isCurrentSessionUser
                      ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/80 shadow-2xs'
                      : 'bg-neutral-50/60 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-800'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center font-bold text-sm text-neutral-700 dark:text-neutral-200 shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-neutral-900 dark:text-white truncate">
                          {u.name}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getRoleBadge(u.role)}`}>
                          {u.role}
                        </span>
                        {isCurrentSessionUser && (
                          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950 px-1.5 py-0.2 rounded">
                            You
                          </span>
                        )}
                        {u.status === 'inactive' && (
                          <span className="text-[10px] font-semibold text-neutral-500 bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.2 rounded">
                            Disabled
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-neutral-500 mt-1 flex-wrap">
                        <span className="font-mono">
                          Username: <strong className="text-neutral-800 dark:text-neutral-200">{u.username}</strong>
                        </span>
                        {u.email && <span>{u.email}</span>}
                        {u.phone && <span>{u.phone}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => handleStartEdit(u)}
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 transition-colors"
                      title="Edit staff details"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {u.username !== 'admin' && (
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        title="Remove staff member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/30 flex items-center justify-between text-xs text-neutral-500">
          <span>Security: Inactive sessions timeout automatically after 30 minutes.</span>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="px-3.5 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
