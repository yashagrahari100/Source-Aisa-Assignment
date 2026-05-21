'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plane, Calendar, LayoutDashboard, User, Menu, X, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/useUserStore';

export default function NavigationBar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { user, clearSession } = useUserStore();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      clearSession();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const navItems = [
    { name: 'Flights', href: '/', icon: Plane },
    { name: 'My Bookings', href: '/bookings', icon: Calendar },
    { name: 'Admin Portal', href: '/admin', icon: LayoutDashboard },
  ];

  return (
    <nav className="sticky top-0 z-40 w-full glass-panel border-b border-white/5 transition-all duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)] group-hover:scale-105 group-hover:border-blue-500/40 transition-all duration-300">
                <Plane className="h-5 w-5 rotate-45 transform group-hover:rotate-[90deg] transition-all duration-500" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white group-hover:text-blue-400 transition-colors duration-300">
                Aero<span className="text-blue-500">Flight</span>
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="flex items-center gap-6">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                      isActive
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                        : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Profile Section */}
          <div className="hidden md:block">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 font-medium max-w-[150px] truncate bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                  {user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-red-500/10 bg-red-500/5 hover:bg-red-500/15 hover:border-red-500/20 text-xs font-semibold text-red-400 hover:text-red-300 transition-all duration-300 active:scale-[0.98]"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <Link href="/login" className="flex items-center gap-2.5 px-4 py-2 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 text-sm font-medium text-gray-300 hover:text-white transition-all duration-300">
                <User className="h-4 w-4 text-blue-400" />
                <span>Login</span>
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center rounded-xl p-2.5 text-gray-400 hover:bg-white/5 hover:text-white focus:outline-none transition-all duration-200"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden animate-in slide-in-from-top duration-300">
          <div className="space-y-1.5 px-4 pb-6 pt-3 border-t border-white/5 bg-[#0B0F19]/95 backdrop-blur-xl">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
            <div className="pt-4 border-t border-white/5">
              {user ? (
                <div className="space-y-3">
                  <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-sm text-gray-300 truncate">
                    Logged in as: <span className="font-semibold text-white">{user.email}</span>
                  </div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsOpen(false);
                    }}
                    className="flex w-full items-center justify-center gap-2.5 px-4 py-3 rounded-xl border border-red-500/10 bg-red-500/5 hover:bg-red-500/15 text-base font-semibold text-red-400 transition-all duration-200"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <Link href="/login" onClick={() => setIsOpen(false)} className="flex w-full items-center justify-center gap-2.5 px-4 py-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-base font-medium text-gray-300 hover:text-white transition-all duration-200">
                  <User className="h-5 w-5 text-blue-400" />
                  <span>Login</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
