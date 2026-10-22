import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  CheckSquare, 
  LayoutDashboard, 
  Users, 
  DollarSign, 
  FileSpreadsheet, 
  Sun, 
  Moon, 
  LogOut, 
  Clock, 
  Menu, 
  X,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { UserSession } from '../types';
import { BeeLogo } from './BeeLogo';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  session: UserSession | null;
  onSignOut: () => void;
  onExtendSession: () => void;
  onSimulateExpire: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenImportExport: () => void;
  pendingTasksCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  session,
  onSignOut,
  onExtendSession,
  onSimulateExpire,
  theme,
  onToggleTheme,
  onOpenImportExport,
  pendingTasksCount,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(0);

  // Update session countdown timer every second
  useEffect(() => {
    if (!session?.expiresAt) return;

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000));
      setTimeLeftSeconds(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [session?.expiresAt]);

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'Task List', icon: CheckSquare, badge: pendingTasksCount },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'cleaners', label: 'Cleaners', icon: Users },
    { id: 'pay', label: 'Pay & Invoicing', icon: DollarSign },
  ];

  const isLowTime = timeLeftSeconds > 0 && timeLeftSeconds <= 300; // <= 5 mins

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-neutral-900/95 backdrop-blur border-b border-neutral-200 dark:border-neutral-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Brand Wordmark (Zone 1) */}
          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={() => setCurrentTab('dashboard')}
              className="flex items-center gap-2.5 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-lg p-1"
            >
              <div className="w-10 h-10 rounded-xl bg-[#FFB509] flex items-center justify-center shadow-xs text-neutral-950 font-bold group-hover:scale-105 transition-transform p-1">
                <BeeLogo className="w-7 h-7" />
              </div>
              <div>
                <span className="text-lg font-extrabold tracking-tight text-neutral-900 dark:text-white">
                  DBuzzing<span className="text-[#FFB509]">Bees</span>
                </span>
                <span className="hidden sm:inline-block text-[11px] text-neutral-500 dark:text-neutral-400 ml-2 font-medium">
                  Cleaning Ops
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Navigation Links (Zone 2) */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`relative flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                    isActive
                      ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#FFB509]' : 'text-neutral-500 dark:text-neutral-400'}`} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-1 text-[11px] font-bold font-mono px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Actions & Session Control (Zone 3) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Import / Export Trigger */}
            <button
              onClick={onOpenImportExport}
              title="Import or Export Tasks via Excel (.xlsx)"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#FFB509]" />
              <span>Excel Import/Export</span>
            </button>

            {/* Session Expiry Countdown Indicator */}
            {session && (
              <div 
                className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-lg border transition-colors ${
                  isLowTime 
                    ? 'border-red-300 bg-red-50 text-red-700 dark:bg-red-950/50 dark:border-red-800 dark:text-red-300' 
                    : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-300'
                }`}
                title="Active login session remaining time"
              >
                {isLowTime ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-neutral-400" />
                )}
                <span className="font-semibold">{formatCountdown(timeLeftSeconds)}</span>
                
                {/* Refresh session button */}
                <button
                  onClick={onExtendSession}
                  title="Extend session by 30 minutes"
                  className="p-1 hover:text-amber-600 dark:hover:text-amber-400 rounded transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>

                {/* Simulate expire button for user evaluation */}
                <button
                  onClick={onSimulateExpire}
                  title="Test Session Expiration (Forces timeout to verify redirect to sign-in)"
                  className="text-[10px] uppercase font-bold tracking-wider px-1 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/60 transition-colors"
                >
                  Test Expire
                </button>
              </div>
            )}

            {/* Theme Toggle Button */}
            <button
              onClick={onToggleTheme}
              aria-label="Toggle theme"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="p-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-neutral-600" />
              )}
            </button>

            {/* Sign Out Button */}
            {session && (
              <button
                onClick={onSignOut}
                title="Sign out of DBuzzingBees"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}

            {/* Mobile menu hamburger toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#FFB509]' : 'text-neutral-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex flex-col gap-2">
            <button
              onClick={() => {
                onOpenImportExport();
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#FFB509]" />
              <span>Import & Export Excel (.xlsx)</span>
            </button>

            {session && (
              <div className="flex items-center justify-between px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800/60 rounded-lg">
                <span className="text-neutral-500 dark:text-neutral-400">Session expires in:</span>
                <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                  {formatCountdown(timeLeftSeconds)}
                </span>
                <button
                  onClick={onSimulateExpire}
                  className="px-2 py-1 text-[11px] rounded bg-neutral-200 dark:bg-neutral-700 font-semibold text-red-600 dark:text-red-400"
                >
                  Test Timeout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
