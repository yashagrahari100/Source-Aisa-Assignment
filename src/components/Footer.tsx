import { Plane, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full border-t border-white/5 bg-[#070A13] text-gray-400 py-12 transition-all duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Logo & Slogan */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/10 border border-blue-500/20 text-blue-400">
                <Plane className="h-4 w-4 rotate-45" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">
                Aero<span className="text-blue-500">Flight</span>
              </span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              Experience production-grade flight management, high-performance offline flight scheduling, and seat reservation in one modern, reactive application.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Bookings</h3>
            <ul className="space-y-2.5 text-sm">
              <li><a href="/" className="hover:text-blue-400 transition-colors">Search Flights</a></li>
              <li><a href="/bookings" className="hover:text-blue-400 transition-colors">My Reservations</a></li>
              <li><a href="/offline" className="hover:text-blue-400 transition-colors">Offline Offline Hub</a></li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Portals</h3>
            <ul className="space-y-2.5 text-sm">
              <li><a href="/admin" className="hover:text-blue-400 transition-colors">Admin Dashboard</a></li>
              <li><a href="/admin/schedules" className="hover:text-blue-400 transition-colors">Manage Schedules</a></li>
              <li><a href="/admin/analytics" className="hover:text-blue-400 transition-colors">Flight Analytics</a></li>
            </ul>
          </div>

          {/* Developer / Credits */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">PWA Specifications</h3>
            <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-xs space-y-2 text-gray-500">
              <div className="flex justify-between">
                <span>Display Mode:</span>
                <span className="text-gray-300 font-medium">Standalone</span>
              </div>
              <div className="flex justify-between">
                <span>Offline Engine:</span>
                <span className="text-gray-300 font-medium">next-pwa</span>
              </div>
              <div className="flex justify-between">
                <span>Database Sync:</span>
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  Supabase Realtime
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Banner */}
        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-600">
          <p>© {new Date().getFullYear()} AeroFlight PWA. All rights reserved by Yash Agrahari.</p>
          <div className="flex items-center gap-1.5">
            <span>Crafted with</span>
            <Heart size={12} className="text-red-500 fill-red-500 animate-pulse" />
            <span>for Frontend Internship Assignment Made By Yash Agrahari</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
