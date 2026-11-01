import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Building2,
  Briefcase,
  CheckSquare,
  Calendar,
  Award,
  Monitor,
  Eye,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  UserCheck,
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import adminApi from '../../api/adminApi';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // Fetch live stats from backend
    const fetchStats = async () => {
      try {
        const response = await adminApi.getStats();
        setStats(response.data);
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      }
    };
    fetchStats();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* 11 KPI Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* TOTAL USERS */}
          <div className="bg-white p-5 rounded-xl border border-[#e5e8ec] shadow-2xs">
            <div className="flex items-center justify-between text-[#717680] mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase">TOTAL USERS</span>
              <Users className="w-4 h-4 text-[#0058be]" />
            </div>
            <p className="text-2xl font-bold text-[#191c1e]">
              {stats ? stats.total_users.toLocaleString() : '145.2K'}
            </p>
            <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+12.4% vs last month</span>
            </div>
          </div>

          {/* ACTIVE CANDIDATES */}
          <div className="bg-white p-5 rounded-xl border border-[#e5e8ec] shadow-2xs">
            <div className="flex items-center justify-between text-[#717680] mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase">ACTIVE CANDIDATES</span>
              <UserCheck className="w-4 h-4 text-[#0058be]" />
            </div>
            <p className="text-2xl font-bold text-[#191c1e]">
              {stats ? stats.active_candidates.toLocaleString() : '98.4K'}
            </p>
            <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+8.2% vs last month</span>
            </div>
          </div>

          {/* ACTIVE RECRUITERS */}
          <div className="bg-white p-5 rounded-xl border border-[#e5e8ec] shadow-2xs">
            <div className="flex items-center justify-between text-[#717680] mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase">ACTIVE RECRUITERS</span>
              <Users className="w-4 h-4 text-[#0058be]" />
            </div>
            <p className="text-2xl font-bold text-[#191c1e]">
              {stats ? stats.active_recruiters.toLocaleString() : '12.1K'}
            </p>
            <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+5.1% vs last month</span>
            </div>
          </div>

          {/* REGISTERED COMPANIES */}
          <div className="bg-white p-5 rounded-xl border border-[#e5e8ec] shadow-2xs">
            <div className="flex items-center justify-between text-[#717680] mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase">REGISTERED COMPANIES</span>
              <Building2 className="w-4 h-4 text-[#0058be]" />
            </div>
            <p className="text-2xl font-bold text-[#191c1e]">
              {stats ? stats.registered_companies.toLocaleString() : '8,421'}
            </p>
            <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+4.7% vs last month</span>
            </div>
          </div>

          {/* PENDING VERIFICATIONS */}
          <div className="bg-white p-5 rounded-xl border border-[#e5e8ec] shadow-2xs">
            <div className="flex items-center justify-between text-[#717680] mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase">PENDING VERIFICATIONS</span>
              <CheckSquare className="w-4 h-4 text-[#0058be]" />
            </div>
            <p className="text-2xl font-bold text-[#191c1e]">
              {stats ? stats.pending_verifications.toLocaleString() : '42'}
            </p>
            <div className="flex items-center gap-1 text-xs text-rose-600 font-medium mt-1">
              <span>+12 needs review</span>
            </div>
          </div>

          {/* ACTIVE JOBS */}
          <div className="bg-white p-5 rounded-xl border border-[#e5e8ec] shadow-2xs">
            <div className="flex items-center justify-between text-[#717680] mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase">ACTIVE JOBS</span>
              <Briefcase className="w-4 h-4 text-[#0058be]" />
            </div>
            <p className="text-2xl font-bold text-[#191c1e]">32,105</p>
            <div className="flex items-center gap-1 text-xs text-rose-600 font-medium mt-1">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>-1.2% vs last month</span>
            </div>
          </div>

          {/* TOTAL APPLICATIONS */}
          <div className="bg-white p-5 rounded-xl border border-[#e5e8ec] shadow-2xs">
            <div className="flex items-center justify-between text-[#717680] mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase">TOTAL APPLICATIONS</span>
              <Award className="w-4 h-4 text-[#0058be]" />
            </div>
            <p className="text-2xl font-bold text-[#191c1e]">1.2M</p>
            <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+15.3% vs last month</span>
            </div>
          </div>

          {/* INTERVIEWS SCHEDULED */}
          <div className="bg-white p-5 rounded-xl border border-[#e5e8ec] shadow-2xs">
            <div className="flex items-center justify-between text-[#717680] mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase">INTERVIEWS SCHEDULED</span>
              <Calendar className="w-4 h-4 text-[#0058be]" />
            </div>
            <p className="text-2xl font-bold text-[#191c1e]">4,502</p>
            <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+9.4% vs last month</span>
            </div>
          </div>

          {/* HIRED CANDIDATES */}
          <div className="bg-white p-5 rounded-xl border border-[#e5e8ec] shadow-2xs">
            <div className="flex items-center justify-between text-[#717680] mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase">HIRED CANDIDATES</span>
              <Award className="w-4 h-4 text-[#0058be]" />
            </div>
            <p className="text-2xl font-bold text-[#191c1e]">14,200</p>
            <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+18.5% YTD</span>
            </div>
          </div>

          {/* ACTIVE SUBSCRIPTIONS */}
          <div className="bg-white p-5 rounded-xl border border-[#e5e8ec] shadow-2xs">
            <div className="flex items-center justify-between text-[#717680] mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase">ACTIVE SUBSCRIPTIONS</span>
              <Monitor className="w-4 h-4 text-[#0058be]" />
            </div>
            <p className="text-2xl font-bold text-[#191c1e]">5,200</p>
            <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+4.2% vs last month</span>
            </div>
          </div>

          {/* PLATFORM MRR */}
          <div className="bg-white p-5 rounded-xl border border-[#e5e8ec] shadow-2xs">
            <div className="flex items-center justify-between text-[#717680] mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase">PLATFORM MRR</span>
              <Eye className="w-4 h-4 text-[#0058be]" />
            </div>
            <p className="text-2xl font-bold text-[#191c1e]">$2.4M</p>
            <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+8.1% vs last month</span>
            </div>
          </div>
        </div>

        {/* 3 Activity Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Recent Registrations */}
          <div className="bg-white p-6 rounded-xl border border-[#e5e8ec] shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-[#191c1e]">Recent Registrations</h3>
              <button
                onClick={() => navigate('/admin/users')}
                className="text-xs font-semibold text-[#0058be] hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>
            <div className="space-y-4">
              {[
                { initials: 'JD', name: 'Jane Doe', role: 'Candidate • Software Engineer', time: '2m ago' },
                { icon: Building2, name: 'Acme Corp', role: 'Company • Tech Industry', time: '15m ago' },
                { initials: 'MS', name: 'Mike Smith', role: 'Recruiter • Independent', time: '1h ago' },
                { icon: Building2, name: 'Global Dynamics', role: 'Company • Enterprise', time: '3h ago' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    {item.initials ? (
                      <div className="w-8 h-8 rounded-full bg-[#d8e2ff] text-[#0058be] font-bold flex items-center justify-center text-xs">
                        {item.initials}
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-[#f2f4f7] text-[#717680] flex items-center justify-center">
                        <item.icon className="w-4 h-4" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-[#191c1e]">{item.name}</p>
                      <p className="text-[11px] text-[#717680]">{item.role}</p>
                    </div>
                  </div>
                  <span className="text-[11px] text-[#8a8d94]">{item.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Recent Job Postings */}
          <div className="bg-white p-6 rounded-xl border border-[#e5e8ec] shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-[#191c1e]">Recent Job Postings</h3>
              <button className="text-xs font-semibold text-[#0058be] hover:underline cursor-pointer">
                View All
              </button>
            </div>
            <div className="space-y-4">
              {[
                { title: 'Senior Product Designer', company: 'Acme Corp • Remote', time: '10m ago' },
                { title: 'Backend Developer (Node.js)', company: 'TechNova • New York, NY', time: '45m ago' },
                { title: 'Marketing Manager', company: 'Global Dynamics • London, UK', time: '2h ago' },
                { title: 'Customer Success Lead', company: 'Startup Inc • Remote', time: '5h ago' },
              ].map((job, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#f2f4f7] text-[#717680] flex items-center justify-center">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#191c1e]">{job.title}</p>
                      <p className="text-[11px] text-[#717680]">{job.company}</p>
                    </div>
                  </div>
                  <span className="text-[11px] text-[#8a8d94]">{job.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: Pending Actions */}
          <div className="bg-white p-6 rounded-xl border border-[#e5e8ec] shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-[#191c1e]">Pending Actions</h3>
              <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                3 Attention
              </span>
            </div>
            <div className="space-y-4">
              {[
                {
                  icon: CheckSquare,
                  color: 'text-amber-600 bg-amber-50',
                  title: 'Company Verification',
                  desc: 'TechNova Corp • Enterprise Plan',
                },
                {
                  icon: AlertCircle,
                  color: 'text-rose-600 bg-rose-50',
                  title: 'Flagged Job Posting',
                  desc: 'Reported for TOS violation • 12 flags',
                },
                {
                  icon: Users,
                  color: 'text-[#0058be] bg-blue-50',
                  title: 'Admin Role Request',
                  desc: 'Sarah Jenkins • Support Dept',
                },
              ].map((action, idx) => (
                <div key={idx} className="flex items-center gap-3 text-xs">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${action.color}`}>
                    <action.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#191c1e]">{action.title}</p>
                    <p className="text-[11px] text-[#717680]">{action.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
