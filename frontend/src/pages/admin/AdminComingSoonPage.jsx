import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Construction, ArrowLeft, LayoutDashboard, Users, Database } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';

export default function AdminComingSoonPage() {
  const location = useLocation();

  // Map path to friendly module title
  const titleMap = {
    '/admin/companies': { name: 'Companies & Verification', module: 'Module 5 (Week 1)' },
    '/admin/jobs': { name: 'Job Postings & Roles', module: 'Module 7 (Week 2)' },
    '/admin/subscriptions': { name: 'Subscriptions & Plans', module: 'Module 12 (Week 3)' },
    '/admin/payments': { name: 'Payments & Invoices', module: 'Module 13 (Week 4)' },
    '/admin/reports': { name: 'Reports & Content Moderation', module: 'Module 11 (Week 3)' },
    '/admin/analytics': { name: 'Platform Analytics', module: 'Module 15 (Week 4)' },
    '/admin/audit-log': { name: 'Global Audit Logs', module: 'Module 14 (Week 4)' },
    '/admin/notifications': { name: 'System Notifications', module: 'Module 10 (Week 3)' },
    '/admin/settings': { name: 'Platform Settings', module: 'Module 16 (Week 4)' },
    '/admin/help': { name: 'Help Center & Documentation', module: 'Platform Guide' },
  };

  const current = titleMap[location.pathname] || {
    name: 'Module Under Construction',
    module: 'Upcoming Release',
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#0058be] flex items-center justify-center mx-auto shadow-sm">
          <Construction className="w-8 h-8" />
        </div>

        <div>
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider">
            {current.module}
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-[#191c1e] mt-3">{current.name}</h1>
          <p className="text-sm text-[#717680] max-w-md mx-auto mt-2">
            This module is part of the ERMS implementation roadmap. You can continue managing Users, Master Data,
            and viewing Dashboard KPIs today.
          </p>
        </div>

        <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/admin/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0058be] hover:bg-[#0047a0] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Go to Dashboard</span>
          </Link>

          <Link
            to="/admin/users"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-[#e5e8ec] hover:bg-[#f4f6f8] text-[#191c1e] text-xs font-semibold rounded-lg shadow-2xs transition-colors"
          >
            <Users className="w-4 h-4 text-[#0058be]" />
            <span>User Management</span>
          </Link>

          <Link
            to="/admin/master-data"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-[#e5e8ec] hover:bg-[#f4f6f8] text-[#191c1e] text-xs font-semibold rounded-lg shadow-2xs transition-colors"
          >
            <Database className="w-4 h-4 text-[#0058be]" />
            <span>Master Data</span>
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}

