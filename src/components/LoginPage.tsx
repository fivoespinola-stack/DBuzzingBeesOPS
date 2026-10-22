import React, { useState } from 'react';
import { Eye, EyeOff, Lock, User, ShieldCheck, Sun, Moon, AlertCircle } from 'lucide-react';
import { BeeLogo } from './BeeLogo';

interface LoginPageProps {
  onLogin: (username: string, rememberMe: boolean) => void;
  sessionExpiredMessage?: string | null;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLogin,
  sessionExpiredMessage,
  theme,
  onToggleTheme,
}) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('buzzbee123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError('Please enter your username.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    // Simulate authentication delay for smooth UX
    setTimeout(() => {
      onLogin(username.trim(), rememberMe);
      setIsSubmitting(false);
    }, 250);
  };

  const handleFillDemo = () => {
    setUsername('admin');
    setPassword('buzzbee123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      
      {/* Top right theme switcher */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <button
          onClick={onToggleTheme}
          aria-label="Toggle theme"
          className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-neutral-600" />}
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Cleaning Bee Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-[#FFB509] flex items-center justify-center shadow-md p-2">
            <BeeLogo className="w-12 h-12" />
          </div>
        </div>

        <h1 className="mt-4 text-center text-3xl font-extrabold tracking-tight text-neutral-950 dark:text-white">
          DBuzzing<span className="text-[#FFB509]">Bees</span>
        </h1>
        <p className="mt-1.5 text-center text-sm font-medium text-neutral-600 dark:text-neutral-400">
          Cleaning Business Tasks, Scheduling & Payroll
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-neutral-900 py-8 px-6 sm:px-10 shadow-sm border border-neutral-200 dark:border-neutral-800 rounded-2xl">
          
          {/* Session Expired Banner */}
          {sessionExpiredMessage && (
            <div className="mb-6 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 dark:text-amber-200">
                <p className="font-semibold">Session Expired</p>
                <p className="mt-0.5">{sessionExpiredMessage}</p>
              </div>
            </div>
          )}

          {/* Form Error */}
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username Input */}
            <div>
              <label 
                htmlFor="username-input" 
                className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5"
              >
                Username or Staff Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="username-input"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin or manager"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm bg-neutral-50 dark:bg-neutral-800/80 text-neutral-900 dark:text-white border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFB509] focus:border-[#FFB509] transition-all"
                />
              </div>
            </div>

            {/* Password Input with Show/Hide */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label 
                  htmlFor="password-input" 
                  className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300"
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password-input"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="block w-full pl-10 pr-11 py-2.5 text-sm bg-neutral-50 dark:bg-neutral-800/80 text-neutral-900 dark:text-white border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFB509] focus:border-[#FFB509] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label 
                htmlFor="remember-me" 
                className="flex items-center gap-2.5 cursor-pointer text-sm font-medium text-neutral-700 dark:text-neutral-300 select-none"
              >
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700 text-[#FFB509] focus:ring-[#FFB509] dark:bg-neutral-800"
                />
                <span>Remember me on this device</span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl text-sm font-bold text-neutral-950 bg-[#FFB509] hover:bg-[#EAA300] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FFB509] dark:focus:ring-offset-neutral-900 shadow-sm transition-all"
              >
                {isSubmitting ? 'Signing In...' : 'Sign In to Workspace'}
              </button>
            </div>
          </form>

          {/* Quick Demo Credentials Autofill */}
          <div className="mt-6 pt-5 border-t border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-500 dark:text-neutral-400">Default Demo Credentials:</span>
              <button
                type="button"
                onClick={handleFillDemo}
                className="font-bold text-amber-600 dark:text-amber-400 hover:underline focus:outline-none"
              >
                Auto-fill Demo
              </button>
            </div>
            <div className="mt-2 p-2.5 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl text-xs text-neutral-600 dark:text-neutral-400 flex items-center justify-between font-mono">
              <span>User: <strong className="text-neutral-900 dark:text-white">admin</strong></span>
              <span>Pass: <strong className="text-neutral-900 dark:text-white">buzzbee123</strong></span>
            </div>
          </div>

          {/* Security Notice */}
          <div className="mt-5 flex items-start gap-2.5 text-[11px] text-neutral-500 dark:text-neutral-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span>
              All client addresses, tasks, and cleaner wage rates are protected. Unattended sessions automatically expire after 30 minutes of inactivity.
            </span>
          </div>

        </div>
      </div>
    </div>
  );
};
