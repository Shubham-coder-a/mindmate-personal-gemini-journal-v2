import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { NavigationTab } from '../types';
import {
  LayoutDashboard,
  BookOpen,
  Brain,
  MessageSquareHeart,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Feather
} from 'lucide-react';

interface HeaderProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  entryCount: number;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onTabChange, entryCount }) => {
  const { user, logout } = useAuth();

  const navItems: { tab: NavigationTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { tab: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { tab: 'journal', label: 'Journal', icon: BookOpen },
    { tab: 'reflect', label: 'Mood & Summary', icon: Brain },
    { tab: 'chat', label: 'Gemini Chat', icon: MessageSquareHeart },
  ];

  return (
    <header id="main-header" className="sticky top-0 z-40 bg-stone-50/90 backdrop-blur-md border-b border-stone-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & Brand */}
          <div 
            id="brand-logo-button"
            onClick={() => onTabChange('dashboard')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-sm shadow-emerald-700/20 group-hover:scale-105 transition-transform duration-200">
              <Feather className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-serif text-xl sm:text-2xl font-semibold text-stone-900 tracking-tight">
                  MindMate
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100/70 text-emerald-800 font-medium tracking-wide">
                  Gemini
                </span>
              </div>
              <p className="text-xs text-stone-500 hidden sm:block">Personal Journal & Mindful Reflection</p>
            </div>
          </div>

          {/* Desktop Navigation Tabs (Only accessible if authenticated) */}
          {user && (
            <nav id="desktop-nav" className="hidden md:flex items-center gap-1.5 bg-stone-200/60 p-1.5 rounded-2xl border border-stone-200">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.tab;
                return (
                  <button
                    key={item.tab}
                    id={`nav-tab-${item.tab}`}
                    onClick={() => onTabChange(item.tab)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
                      isActive
                        ? 'bg-white text-stone-900 shadow-xs shadow-stone-300'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-stone-500'}`} />
                    <span>{item.label}</span>
                    {item.tab === 'journal' && entryCount > 0 && (
                      <span className="text-xs px-1.5 py-0.2 rounded-full bg-stone-100 text-stone-600">
                        {entryCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          )}

          {/* User Account Controls */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2.5">
                {/* UID Isolation Badge */}
                <div
                  className="hidden lg:flex items-center gap-1.5 text-xs text-stone-600 bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200"
                  title={`Firebase Authenticated: ${user.email} (UID: ${user.uid})`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-mono text-[11px] truncate max-w-[130px]">
                    users/{user.uid.substring(0, 6)}...
                  </span>
                </div>

                {/* Profile Pill */}
                <div
                  className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-full bg-stone-100/90 border border-stone-200"
                  title={`Logged in as ${user.displayName || user.email}`}
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      referrerPolicy="no-referrer"
                      className="w-7 h-7 rounded-full object-cover ring-1 ring-stone-300"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-medium text-xs">
                      {user.displayName ? user.displayName.charAt(0).toUpperCase() : <UserIcon className="w-3.5 h-3.5" />}
                    </div>
                  )}
                  
                  <span className="text-xs font-medium text-stone-800 hidden sm:inline max-w-[130px] truncate">
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                  
                  <button
                    id="signout-button"
                    onClick={logout}
                    title="Sign Out of Firebase"
                    className="p-1.5 text-stone-500 hover:text-rose-600 hover:bg-stone-200/60 rounded-full transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-stone-500 bg-stone-100 px-3 py-1.5 rounded-full border border-stone-200">
                <ShieldCheck className="w-3.5 h-3.5 text-stone-400" />
                <span>Authentication Required</span>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Bar (Authenticated only) */}
        {user && (
          <div id="mobile-nav" className="flex md:hidden items-center justify-around py-2 border-t border-stone-200">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.tab;
              return (
                <button
                  key={item.tab}
                  id={`mobile-nav-tab-${item.tab}`}
                  onClick={() => onTabChange(item.tab)}
                  className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium cursor-pointer ${
                    isActive ? 'text-emerald-800' : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-700' : 'text-stone-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
};
