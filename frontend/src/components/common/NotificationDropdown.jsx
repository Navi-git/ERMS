import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Bell,
  CheckCheck,
  Clock,
  Video,
  MessageSquare,
  FileText,
  AlertTriangle,
  Briefcase,
  CreditCard,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

export default function NotificationDropdown() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const {
    unreadCount,
    recentNotifications,
    loading,
    isConnected,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread'
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Determine full notifications page URL based on user role
  const getFullHubUrl = () => {
    if (user?.role === 'recruiter') return '/recruiter/notifications';
    if (user?.role === 'super_admin') return '/admin/notifications';
    return '/candidate/notifications';
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      await markAsRead(notif.id);
    }
    setIsOpen(false);
    if (notif.redirect_url) {
      navigate(notif.redirect_url);
    }
  };

  const filteredNotifications = recentNotifications.filter((n) => {
    if (activeTab === 'unread') return !n.is_read;
    return true;
  });

  // Helper for notification type icons & badge styles
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'offer_sent':
      case 'offer_accepted':
      case 'offer_declined':
      case 'offer_withdrawn':
        return {
          icon: <Clock className="w-4 h-4 text-emerald-600" />,
          bg: 'bg-emerald-50 border-emerald-200',
        };
      case 'interview_scheduled':
      case 'interview_rescheduled':
      case 'interview_cancelled':
      case 'interview_reminder':
        return {
          icon: <Video className="w-4 h-4 text-purple-600" />,
          bg: 'bg-purple-50 border-purple-200',
        };
      case 'message_received':
        return {
          icon: <MessageSquare className="w-4 h-4 text-blue-600" />,
          bg: 'bg-blue-50 border-blue-200',
        };
      case 'application_received':
      case 'application_status_changed':
        return {
          icon: <FileText className="w-4 h-4 text-indigo-600" />,
          bg: 'bg-indigo-50 border-indigo-200',
        };
      case 'subscription_expiring':
      case 'payment_failed':
      case 'invoice_generated':
        return {
          icon: <CreditCard className="w-4 h-4 text-rose-600" />,
          bg: 'bg-rose-50 border-rose-200',
        };
      default:
        return {
          icon: <Sparkles className="w-4 h-4 text-amber-600" />,
          bg: 'bg-amber-50 border-amber-200',
        };
    }
  };

  const formatRelativeTime = (isoString) => {
    if (!isoString) return 'Just now';
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 172800) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
        className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors relative focus:outline-none"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="min-w-4 h-4 px-1 bg-blue-600 text-white text-[10px] font-bold rounded-full absolute top-1 right-1 flex items-center justify-center ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Flyout */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-w-[92vw] bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 font-semibold text-xs rounded-full border border-blue-200/60">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Live Sync Active status */}
              <div
                className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium"
                title={isConnected ? 'Live WebSocket Sync Active' : 'Connecting WebSocket...'}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-emerald-500 animate-ping' : 'bg-slate-300'
                  }`}
                />
                <span className="hidden sm:inline">Live Sync</span>
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="px-4 pt-2.5 pb-2 flex gap-2 border-b border-slate-100 bg-white">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'unread'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Unread
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 bg-blue-500 text-white text-[10px] rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {loading && recentNotifications.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Loading notifications...
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                  <Bell className="w-5 h-5 text-slate-300" />
                </div>
                <p className="text-xs font-medium text-slate-700">You're all caught up!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  No {activeTab === 'unread' ? 'unread ' : ''}notifications at the moment.
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const { icon, bg } = getNotificationIcon(notif.notification_type);
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`px-4 py-3 flex items-start gap-3 hover:bg-slate-50/80 cursor-pointer transition-colors relative ${
                      !notif.is_read ? 'bg-blue-50/25' : ''
                    }`}
                  >
                    {/* Unread indicator dot */}
                    {!notif.is_read && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 absolute left-2 top-4.5" />
                    )}

                    {/* Type Icon */}
                    <div
                      className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${bg}`}
                    >
                      {icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-xs truncate ${
                            !notif.is_read
                              ? 'font-bold text-slate-900'
                              : 'font-medium text-slate-700'
                          }`}
                        >
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatRelativeTime(notif.created_at)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate(getFullHubUrl());
              }}
              className="w-full py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              View all notifications
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
