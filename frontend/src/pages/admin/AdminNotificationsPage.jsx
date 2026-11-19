import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import CreateBroadcastModal from '../../components/admin/CreateBroadcastModal';
import { notificationApi } from '../../api/notificationApi';
import { useToast } from '../../context/ToastContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  Send,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldAlert,
  Server,
  Activity,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Inbox,
  Filter,
} from 'lucide-react';

export default function AdminNotificationsPage() {
  const { showToast } = useToast();
  const { subscribe } = useNotifications();

  const [broadcasts, setBroadcasts] = useState([]);
  const [metrics, setMetrics] = useState({
    total_sent_today: 0,
    pending_delivery: 0,
    critical_alerts: 0,
    delivery_success_rate: 99.8,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const loadBroadcastData = useCallback(async (page = 1, isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const response = await notificationApi.getAdminBroadcasts({ page, page_size: 10 });
      const data = response.data;
      const incoming = data?.results || [];
      const seen = new Set();
      const deduped = [];
      for (const item of incoming) {
        const key = String(item.id);
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(item);
        }
      }
      setBroadcasts(deduped);
      if (data?.metrics) {
        setMetrics(data.metrics);
      }
      setTotalCount(data?.count || 0);
      setTotalPages(Math.ceil((data?.count || 0) / 10) || 1);
    } catch (err) {
      if (!isSilent) showToast('Failed to load admin broadcasts', 'error');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadBroadcastData(currentPage, false);
  }, [loadBroadcastData, currentPage]);

  // Real-time synchronization for broadcasts & platform metrics
  useEffect(() => {
    const handleWsEvent = (payload) => {
      if (payload?.type === 'broadcast.alert') {
        loadBroadcastData(1, true);
      }
    };

    const unsubscribe = subscribe ? subscribe(handleWsEvent) : () => {};

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadBroadcastData(currentPage, true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [subscribe, loadBroadcastData, currentPage]);

  const filteredBroadcasts = React.useMemo(() => {
    const seen = new Set();
    return broadcasts.filter((item) => {
      const key = String(item.id);
      if (seen.has(key)) return false;
      seen.add(key);

      const matchesSearch =
        (item.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.message || '').toLowerCase().includes(searchQuery.toLowerCase());
      if (selectedCategory === 'All') return matchesSearch;
      return matchesSearch && item.notification_type?.toLowerCase() === selectedCategory.toLowerCase();
    });
  }, [broadcasts, searchQuery, selectedCategory]);

  const formatTimestamp = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header matching Figma Screen 3 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notifications Center</h1>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Manage system-wide broadcasts, monitor automated alerts, and review communication history across all platform instances.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer self-start sm:self-auto"
          >
            <Send className="w-4 h-4" />
            <span>New Broadcast</span>
          </button>
        </div>

        {/* Top Metric Cards matching Figma Screen 3 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* TOTAL SENT TODAY */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total Sent Today
              </span>
              <Inbox className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {metrics.total_sent_today.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold mt-2">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+12% vs yesterday</span>
            </div>
          </div>

          {/* PENDING DELIVERY */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Pending Delivery
              </span>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {metrics.pending_delivery.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-2">
              Normal queue levels
            </div>
          </div>

          {/* CRITICAL ALERTS */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-rose-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
                Critical Alerts
              </span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-extrabold text-rose-600 tracking-tight">
              {metrics.critical_alerts}
            </div>
            <div className="text-xs text-rose-600 font-semibold mt-2">
              {metrics.critical_alerts > 0 ? '! Requires attention' : 'All systems normal'}
            </div>
          </div>

          {/* DELIVERY SUCCESS */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-blue-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                Delivery Success
              </span>
              <CheckCircle2 className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {metrics.delivery_success_rate}%
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
              <div
                className="bg-blue-600 h-1.5 rounded-full"
                style={{ width: `${metrics.delivery_success_rate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search notifications, IDs, or recipients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 shadow-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {['All', 'System Health', 'Security', 'Billing'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Broadcasts & Alerts Table matching Figma Screen 3 */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-24 text-center text-slate-400 text-xs">
              Loading platform notifications...
            </div>
          ) : filteredBroadcasts.length === 0 ? (
            <div className="py-20 text-center">
              <Server className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-900">No broadcasts recorded</h4>
              <p className="text-xs text-slate-400 mt-1">
                Click "+ New Broadcast" above to dispatch announcements to candidates or recruiters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-5">TIMESTAMP / ID</th>
                    <th className="py-3.5 px-5">MESSAGE CONTENT</th>
                    <th className="py-3.5 px-5">CATEGORY</th>
                    <th className="py-3.5 px-5">AUDIENCE</th>
                    <th className="py-3.5 px-5">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredBroadcasts.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">
                          {formatTimestamp(b.created_at)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          #BC-{b.id.toString().padStart(4, '0')}
                        </div>
                      </td>

                      <td className="py-4 px-5 max-w-sm">
                        <div className="font-bold text-slate-900">{b.title}</div>
                        <div className="text-slate-500 line-clamp-1 mt-0.5 text-[11px]">
                          {b.message}
                        </div>
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap">
                        <span className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          {b.notification_type || 'System'}
                        </span>
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap">
                        <span className="capitalize font-semibold text-slate-700">
                          {b.audience === 'all' ? 'All Users' : b.audience}
                        </span>
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-blue-700 font-semibold">
                          <span className="w-2 h-2 rounded-full bg-blue-600" />
                          <span>
                            Delivered ({b.recipient_count}/{b.recipient_count})
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Footer */}
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {filteredBroadcasts.length} of {totalCount} records
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 font-semibold text-slate-700">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Create Broadcast Modal */}
        <CreateBroadcastModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onBroadcastSent={() => loadBroadcastData(1, true)}
        />
      </div>
    </AdminLayout>
  );
}
