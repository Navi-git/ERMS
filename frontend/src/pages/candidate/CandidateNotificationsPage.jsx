import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import CandidateLayout from '../../layouts/CandidateLayout';
import { notificationApi } from '../../api/notificationApi';
import { useNotifications } from '../../context/NotificationContext';
import { useToast } from '../../context/ToastContext';
import {
  Bell,
  CheckCheck,
  Clock,
  Video,
  MessageSquare,
  FileText,
  Phone,
  Bookmark,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export default function CandidateNotificationsPage() {
  const navigate = useNavigate();
  const { unreadCount, markAsRead, markAllAsRead, subscribe } = useNotifications();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('all'); // all, unread, applications, messages, interviews
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Tab counts
  const [categoryCounts, setCategoryCounts] = useState({
    all: 0,
    unread: 0,
    applications: 0,
    messages: 0,
    interviews: 0,
  });

  const loadNotifications = useCallback(async (page = 1, tab = activeTab, isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const params = { page, page_size: 10 };
      if (tab === 'unread') {
        params.unread = true;
      } else if (tab !== 'all') {
        params.category = tab;
      }

      const response = await notificationApi.getNotifications(params);
      const data = response.data;
      setNotifications(data?.results || []);
      setTotalCount(data?.count || 0);
      setTotalPages(Math.ceil((data?.count || 0) / 10) || 1);
    } catch (err) {
      if (!isSilent) showToast('Failed to load notifications', 'error');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [activeTab, showToast]);

  useEffect(() => {
    loadNotifications(currentPage, activeTab, false);
  }, [loadNotifications, currentPage, activeTab]);

  // Real-time synchronization via WebSocket & page visibility
  useEffect(() => {
    const handleWsEvent = (payload) => {
      if (payload?.type === 'notification.alert' && payload?.data) {
        const newNotif = payload.data;
        setNotifications((prev) => {
          const exists = prev.some((n) => n.id === newNotif.id);
          if (exists) return prev;
          return [newNotif, ...prev];
        });
        setTotalCount((prev) => prev + 1);
      } else if (payload?.type === 'unread_count.update') {
        if (payload.notification_id) {
          setNotifications((prev) =>
            prev.map((n) => (n.id === payload.notification_id ? { ...n, is_read: true } : n))
          );
        } else if (payload.unread_count === 0) {
          setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        }
      } else if (payload?.type === 'notification.read' && payload?.id) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === payload.id ? { ...n, is_read: true } : n))
        );
      } else if (payload?.type === 'notification.read_all') {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      }
    };

    const unsubscribe = subscribe ? subscribe(handleWsEvent) : () => {};

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadNotifications(currentPage, activeTab, true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [subscribe, loadNotifications, currentPage, activeTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleItemClick = async (notif) => {
    if (!notif.is_read) {
      // Instantly remove unread dot indicator in local list
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      await markAsRead(notif.id);
    }
    if (notif.redirect_url) {
      navigate(notif.redirect_url);
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await markAllAsRead();
  };

  // Group notifications chronologically: Today, Yesterday, Earlier This Week
  const groupNotifications = (items) => {
    const today = [];
    const yesterday = [];
    const earlier = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;

    items.forEach((item) => {
      const itemTime = new Date(item.created_at).getTime();
      if (itemTime >= startOfToday) {
        today.push(item);
      } else if (itemTime >= startOfYesterday) {
        yesterday.push(item);
      } else {
        earlier.push(item);
      }
    });

    return [
      { title: 'TODAY', items: today },
      { title: 'YESTERDAY', items: yesterday },
      { title: 'EARLIER THIS WEEK', items: earlier },
    ].filter((group) => group.items.length > 0);
  };

  const getCardDesign = (notif) => {
    const type = notif.notification_type;
    switch (type) {
      case 'offer_sent':
        return {
          pill: 'Job Offer',
          pillBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: <Clock className="w-5 h-5 text-emerald-600" />,
          iconBg: 'bg-emerald-50 text-emerald-600',
          actionText: 'View Offer Details',
          secondaryBadge: 'Expires in 3 days',
        };
      case 'interview_scheduled':
      case 'interview_rescheduled':
        return {
          pill: 'Interview Alert',
          pillBg: 'bg-purple-50 text-purple-700 border-purple-200',
          icon: <Video className="w-5 h-5 text-purple-600" />,
          iconBg: 'bg-purple-50 text-purple-600',
          actionText: 'Open Interview Center',
        };
      case 'interview_reminder':
        return {
          pill: 'Interview Invitation',
          pillBg: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: <Phone className="w-5 h-5 text-blue-600" />,
          iconBg: 'bg-blue-50 text-blue-600',
          actionText: 'Confirm RSVP in Interview Center',
        };
      case 'message_received':
        return {
          pill: 'Message',
          pillBg: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: <MessageSquare className="w-5 h-5 text-blue-600" />,
          iconBg: 'bg-blue-50 text-blue-600',
          actionText: 'Reply in Messages',
        };
      case 'application_status_changed':
        return {
          pill: 'Application Update',
          pillBg: 'bg-purple-50 text-purple-700 border-purple-200',
          icon: <FileText className="w-5 h-5 text-purple-600" />,
          iconBg: 'bg-purple-50 text-purple-600',
          actionText: 'View Application Pipeline',
        };
      case 'application_received':
        return {
          pill: 'Application Received',
          pillBg: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: <CheckCircle2 className="w-5 h-5 text-slate-600" />,
          iconBg: 'bg-slate-100 text-slate-600',
          actionText: 'View Application',
        };
      default:
        return {
          pill: 'Notice',
          pillBg: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: <Sparkles className="w-5 h-5 text-amber-600" />,
          iconBg: 'bg-amber-50 text-amber-600',
          actionText: 'View Details',
        };
    }
  };

  const formatTimestamp = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffHours = Math.floor((now - date) / (1000 * 3600));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffHours < 48) {
      return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const grouped = groupNotifications(notifications);

  return (
    <CandidateLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span>Candidate Portal</span>
          <span>&gt;</span>
          <span className="text-slate-900 font-semibold">Notifications</span>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notifications</h1>
            {unreadCount > 0 && (
              <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200">
                {unreadCount} Unread
              </span>
            )}
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-blue-700 hover:text-blue-800 hover:bg-blue-50/70 border border-transparent rounded-lg transition-colors cursor-pointer"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all as read
            </button>
          )}
        </div>

        {/* Filter Tabs matching Figma Screen 1 */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'All' },
            { id: 'unread', label: 'Unread', count: unreadCount },
            { id: 'applications', label: 'Application Updates' },
            { id: 'messages', label: 'Messages' },
            { id: 'interviews', label: 'Interviews' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-4 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-2 shrink-0 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                      isActive ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Main Notifications Content */}
        {loading ? (
          <div className="py-24 text-center text-slate-400 text-sm">
            <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p>Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-24 text-center bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-base font-bold text-slate-900">You're all caught up!</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No {activeTab !== 'all' ? `${activeTab} ` : ''}notifications at this time. We will alert you whenever there are updates on your job applications, interviews, or messages.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map((group) => {
              const unreadInGroup = group.items.filter((i) => !i.is_read).length;
              return (
                <div key={group.title} className="space-y-3">
                  {/* Group Header */}
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                    <span>{group.title}</span>
                    <span className="font-normal normal-case text-slate-400 text-[11px]">
                      {unreadInGroup > 0 ? `${unreadInGroup} unread` : 'All read'}
                    </span>
                  </div>

                  {/* Group Items */}
                  <div className="space-y-3">
                    {group.items.map((notif) => {
                      const design = getCardDesign(notif);
                      return (
                        <div
                          key={notif.id}
                          onClick={() => handleItemClick(notif)}
                          className={`group p-5 rounded-2xl border transition-all duration-200 cursor-pointer relative bg-white ${
                            !notif.is_read
                              ? 'border-blue-200/80 shadow-sm ring-1 ring-blue-50 hover:border-blue-400'
                              : 'border-slate-200/80 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            {/* Unread blue dot */}
                            {!notif.is_read && (
                              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0 mt-2 ring-4 ring-blue-100" />
                            )}

                            {/* Icon Container */}
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${design.iconBg}`}
                            >
                              {design.icon}
                            </div>

                            {/* Main Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`px-2.5 py-0.5 text-[11px] font-bold rounded-md border ${design.pillBg}`}
                                  >
                                    {design.pill}
                                  </span>
                                  {notif.source_type && (
                                    <span className="text-xs font-semibold text-slate-700">
                                      {notif.source_type.replace('_', ' ').toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-slate-400">
                                  {formatTimestamp(notif.created_at)}
                                </span>
                              </div>

                              <h4
                                className={`text-sm ${
                                  !notif.is_read
                                    ? 'font-bold text-slate-900'
                                    : 'font-semibold text-slate-800'
                                }`}
                              >
                                {notif.title}
                              </h4>

                              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                {notif.message}
                              </p>

                              {/* Action Buttons row matching Figma */}
                              <div className="mt-3.5 flex flex-wrap items-center gap-3">
                                {notif.redirect_url && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleItemClick(notif);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50/80 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <span>{design.actionText}</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {design.secondaryBadge && (
                                  <span className="px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg">
                                    ⏳ {design.secondaryBadge}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-6">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                  currentPage === page
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </CandidateLayout>
  );
}
