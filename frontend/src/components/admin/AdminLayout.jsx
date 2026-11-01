import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
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
} from 'lucide-react';
import authApi from '../../api/authApi';
import { logout } from '../../store/slices/authSlice';

export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [searchQuery, setSearchQuery] = useState('');

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
    { name: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
    { name: 'Users', icon: Users, path: '/admin/users' },
    { name: 'Companies', icon: Building2, path: '/admin/companies' },
    { name: 'Jobs', icon: Briefcase, path: '/admin/jobs' },
    { name: 'Subscriptions', icon: CreditCard, path: '/admin/subscriptions' },
    { name: 'Payments', icon: Receipt, path: '/admin/payments' },
    { name: 'Reports & Moderation', icon: ShieldAlert, path: '/admin/reports' },
    { name: 'Analytics', icon: BarChart3, path: '/admin/analytics' },
    { name: 'Master Data', icon: Database, path: '/admin/master-data' },
    { name: 'Audit Log', icon: FileText, path: '/admin/audit-log' },
    { name: 'Notifications', icon: Bell, path: '/admin/notifications' },
    { name: 'Settings', icon: Settings, path: '/admin/settings' },
    { name: 'Help center', icon: HelpCircle, path: '/admin/help' },
  ];

  const getIsActive = (itemPath) => {
    if (itemPath === '/admin/dashboard') {
      return location.pathname === '/admin/dashboard';
    }
    return location.pathname.startsWith(itemPath);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex text-[#191c1e]">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-[#e5e8ec] flex flex-col shrink-0 justify-between sticky top-0 h-screen">
        <div>
          {/* Logo Branding */}
          <div className="h-16 flex items-center px-6 border-b border-[#f0f2f5]">
            <Link to="/admin/dashboard" className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-[#191c1e]">
                Talent<span className="text-[#0058be]">Bridge</span>
              </span>
            </Link>
          </div>

          {/* Nav Items */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = getIsActive(item.path);
              return (
                <button
                  key={item.name}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#0058be] text-white shadow-xs font-semibold'
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
        <header className="h-16 bg-white border-b border-[#e5e8ec] px-8 flex items-center justify-between sticky top-0 z-20">
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
                <div className="text-xs font-bold text-[#191c1e]">{user?.full_name || 'Admin Central'}</div>
                <div className="text-[10px] text-[#717680] font-medium uppercase tracking-wider">Super Admin</div>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#0058be] text-white flex items-center justify-center font-bold text-xs ring-2 ring-blue-100">
                {user?.profile_picture_url ? (
                  <img
                    src={user.profile_picture_url}
                    alt="Admin Avatar"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span>
                    {user?.full_name
                      ? user.full_name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)
                      : 'AC'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Child Pages Content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}

