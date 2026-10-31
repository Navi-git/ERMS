import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  CreditCard,
  Receipt,
  ShieldAlert,
  BarChart3,
  Database,
  FileText,
  Bell,
  Settings,
  HelpCircle,
  LogOut,
  Search,
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
import authApi from '../../api/authApi';
import { logout } from '../../store/slices/authSlice';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [activeNav, setActiveNav] = useState('Dashboard');
  const [stats, setStats] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Fetch live stats from backend
    const fetchStats = async () => {
      try {
        const response = await authApi.getAdminStats();
        setStats(response.data);
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      }
    };
    fetchStats();
  }, []);

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('erms_refresh_token');
      if (refreshToken) {
        await authApi.logout({ refresh: refreshToken });
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      dispatch(logout());
      navigate('/admin/login');
    }
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Users', icon: Users },
    { name: 'Companies', icon: Building2 },
    { name: 'Jobs', icon: Briefcase },
    { name: 'Subscriptions', icon: CreditCard },
    { name: 'Payments', icon: Receipt },
    { name: 'Reports & Moderation', icon: ShieldAlert },
    { name: 'Analytics', icon: BarChart3 },
    { name: 'Master Data', icon: Database },
    { name: 'Audit Log', icon: FileText },
    { name: 'Notifications', icon: Bell },
    { name: 'Settings', icon: Settings },
    { name: 'Help center', icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex text-[#191c1e]">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-[#e5e8ec] flex flex-col shrink-0 justify-between">
        <div>
          {/* Logo Branding */}
          <div className="h-16 flex items-center px-6 border-b border-[#f0f2f5]">
            <span className="font-extrabold text-xl tracking-tight text-[#191c1e]">
              Talent<span className="text-[#0058be]">Bridge</span>
            </span>
          </div>

          {/* Nav Items */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => setActiveNav(item.name)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[#0058be] text-white shadow-xs'
                      : 'text-[#45464d] hover:bg-[#f2f4f7] hover:text-[#191c1e]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#717680]'}`} />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Logout Button */}
        <div className="p-4 border-t border-[#f0f2f5]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-[#e5e8ec] px-8 flex items-center justify-between sticky top-0 z-10">
          {/* Global Search Bar */}
          <div className="w-96 relative">
            <Search className="w-4 h-4 text-[#8a8d94] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Global system search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-[#f4f6f8] border border-[#e5e8ec] rounded-lg focus:outline-none focus:border-[#0058be] focus:bg-white text-[#191c1e]"
            />
          </div>

          {/* Right Header Icons & Profile */}
          <div className="flex items-center gap-4">
            <button className="text-[#717680] hover:text-[#191c1e] p-1.5 rounded-lg hover:bg-[#f2f4f7]">
              <HelpCircle className="w-5 h-5" />
            </button>
            <button className="relative text-[#717680] hover:text-[#191c1e] p-1.5 rounded-lg hover:bg-[#f2f4f7]">
              <Bell className="w-5 h-5" />
              <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1.5 right-1.5 ring-2 ring-white" />
            </button>

            {/* Profile Pill */}
            <div className="flex items-center gap-3 pl-3 border-l border-[#e5e8ec]">
              <div className="text-right">
                <p className="text-xs font-bold text-[#191c1e] leading-tight">Admin Central</p>
                <p className="text-[11px] text-[#717680]">
                  {user?.full_name || 'Super User'}
                </p>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#0058be]/10 border border-[#0058be]/20 text-[#0058be] font-bold text-xs flex items-center justify-center">
                {user?.full_name ? user.full_name.slice(0, 2).toUpperCase() : 'SU'}
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Body Content */}
        <main className="p-8 space-y-8">
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
                {stats ? stats.pending_verifications : '42'}
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
              <div className="flex items-center gap-1 text-xs text-rose-500 font-medium mt-1">
                <TrendingDown className="w-3.5 h-3.5" />
                <span>-1.2% vs last month</span>
              </div>
            </div>

            {/* TOTAL APPLICATIONS */}
            <div className="bg-white p-5 rounded-xl border border-[#e5e8ec] shadow-2xs">
              <div className="flex items-center justify-between text-[#717680] mb-2">
                <span className="text-[11px] font-bold tracking-wider uppercase">TOTAL APPLICATIONS</span>
                <FileText className="w-4 h-4 text-[#0058be]" />
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
                <button className="text-xs font-semibold text-[#0058be] hover:underline">
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
                    <span className="text-[11px] text-[#9ca3af]">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: Recent Job Postings */}
            <div className="bg-white p-6 rounded-xl border border-[#e5e8ec] shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm text-[#191c1e]">Recent Job Postings</h3>
                <button className="text-xs font-semibold text-[#0058be] hover:underline">
                  View All
                </button>
              </div>
              <div className="space-y-4">
                {[
                  { title: 'Senior Product Designer', meta: 'Acme Corp • Remote', time: '10m ago' },
                  { title: 'Backend Developer (Node.js)', meta: 'TechNova • New York, NY', time: '45m ago' },
                  { title: 'Marketing Manager', meta: 'Global Dynamics • London, UK', time: '2h ago' },
                  { title: 'Customer Success Lead', meta: 'Startup Inc • Remote', time: '5h ago' },
                ].map((job, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#f2f4f7] text-[#717680] flex items-center justify-center">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#191c1e]">{job.title}</p>
                        <p className="text-[11px] text-[#717680]">{job.meta}</p>
                      </div>
                    </div>
                    <span className="text-[11px] text-[#9ca3af]">{job.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 3: Pending Actions */}
            <div className="bg-white p-6 rounded-xl border border-[#e5e8ec] shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm text-[#191c1e]">Pending Actions</h3>
                <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  3 Attention
                </span>
              </div>
              <div className="space-y-4">
                {[
                  {
                    icon: CheckSquare,
                    color: 'text-rose-600 bg-rose-50',
                    title: 'Company Verification',
                    desc: 'TechNova Corp • Enterprise Plan',
                  },
                  {
                    icon: AlertCircle,
                    color: 'text-amber-600 bg-amber-50',
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
                  <div key={idx} className="flex items-start gap-3 text-xs">
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
        </main>
      </div>
    </div>
  );
}

