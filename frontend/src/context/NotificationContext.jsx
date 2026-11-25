import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { notificationApi } from '../api/notificationApi';
import { useToast } from './ToastContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, accessToken, user } = useSelector((state) => state.auth);
  const { showToast } = useToast();

  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const listenersRef = useRef(new Set());
  const userRef = useRef(user);
  userRef.current = user;

  // Subscription mechanism for individual pages/components
  const subscribe = useCallback((listener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  // Fetch initial unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await notificationApi.getUnreadCount();
      setUnreadCount(response.data?.unread_count ?? 0);
    } catch (err) {
      // Silent fail on background fetch
    }
  }, [isAuthenticated]);

  // Fetch recent notifications for flyout
  const fetchRecentNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const response = await notificationApi.getNotifications({ page_size: 8 });
      setRecentNotifications(response.data?.results || []);
    } catch (err) {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Mark single notification as read with instant optimistic update
  const markAsRead = useCallback(async (id) => {
    if (!id) return;

    // 1. Instant optimistic update so unread indicator dot disappears immediately
    setRecentNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_read: true } : item))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    // Notify registered component listeners
    listenersRef.current.forEach((fn) => {
      try {
        fn({ type: 'notification.read', id });
      } catch (e) {
        console.error(e);
      }
    });
    window.dispatchEvent(new CustomEvent('erms:notification.read', { detail: { id } }));

    // 2. Persist to backend
    try {
      const response = await notificationApi.markAsRead(id);
      if (response.data?.unread_count !== undefined) {
        setUnreadCount(response.data.unread_count);
      }
    } catch (err) {
      console.error('Failed to mark notification as read on backend:', err);
    }
  }, []);

  // Mark all notifications as read with instant optimistic update
  const markAllAsRead = useCallback(async () => {
    setUnreadCount(0);
    setRecentNotifications((prev) =>
      prev.map((item) => ({ ...item, is_read: true }))
    );

    listenersRef.current.forEach((fn) => {
      try {
        fn({ type: 'notification.read_all' });
      } catch (e) {
        console.error(e);
      }
    });
    window.dispatchEvent(new CustomEvent('erms:notification.read_all'));

    try {
      await notificationApi.markAllAsRead();
      showToast('All notifications marked as read', 'success');
    } catch (err) {
      showToast('Failed to mark all as read', 'error');
    }
  }, [showToast]);

  // Connect WebSocket when authenticated & maintain real-time sync
  useEffect(() => {
    const token = accessToken || localStorage.getItem('erms_access_token');
    
    const closeSocket = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.onopen = null;
        socketRef.current.onclose = null;
        socketRef.current.onerror = null;
        socketRef.current.onmessage = null;
        try {
          socketRef.current.close(1000, 'Cleaning up connection');
        } catch (e) {
          // Ignore close errors
        }
        socketRef.current = null;
      }
    };

    if (!isAuthenticated || !token) {
      closeSocket();
      setIsConnected(false);
      setUnreadCount(0);
      setRecentNotifications([]);
      return;
    }

    // Initial HTTP fetch
    fetchUnreadCount();
    fetchRecentNotifications();

    const connectWebSocket = () => {
      // Guard: do not open a new connection if already open or connecting
      if (
        socketRef.current &&
        (socketRef.current.readyState === WebSocket.OPEN ||
         socketRef.current.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }

      try {
        let wsBase = import.meta.env.VITE_WS_URL;
        if (!wsBase) {
          if (import.meta.env.VITE_API_URL) {
            wsBase = import.meta.env.VITE_API_URL.replace(/^http/, 'ws').replace(/\/api\/v1\/?$/, '');
          } else {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.hostname || 'localhost';
            wsBase = `${protocol}//${host}:8000`;
          }
        }
        const wsUrl = `${wsBase}/ws/notifications/?token=${token}`;

        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);

            // Notify all subscribers
            listenersRef.current.forEach((fn) => {
              try {
                fn(payload);
              } catch (e) {
                console.error('Error in notification listener:', e);
              }
            });

            // Dispatch global event for cross-component reactive updates
            window.dispatchEvent(new CustomEvent('erms:websocket', { detail: payload }));

            if (payload.type === 'notification.alert') {
              const newNotif = payload.data;
              if (payload.unread_count !== undefined) {
                setUnreadCount(payload.unread_count);
              } else {
                setUnreadCount((prev) => prev + 1);
              }

              if (newNotif) {
                setRecentNotifications((prev) => {
                  const filtered = prev.filter((item) => String(item.id) !== String(newNotif.id));
                  return [newNotif, ...filtered.slice(0, 7)];
                });

                // Do not show broadcast toast to super admins (they already get success toast on publish)
                const currentUser = userRef.current;
                const isSuperAdmin = currentUser?.role === 'super_admin';
                const isBroadcast = newNotif.source_type === 'broadcast';

                if (!isSuperAdmin || !isBroadcast) {
                  showToast(newNotif.message, 'info', newNotif.title || 'New Notification');
                }

                // If notification relates to an application, dispatch application update
                if (newNotif.source_type === 'application') {
                  const appData = {
                    application_id: newNotif.source_id,
                    ...(newNotif.extra || {}),
                  };
                  window.dispatchEvent(
                    new CustomEvent('erms:application.update', { detail: appData })
                  );
                }
              }
            } else if (payload.type === 'unread_count.update') {
              setUnreadCount(payload.unread_count ?? 0);
              if (payload.notification_id) {
                setRecentNotifications((prev) =>
                  prev.map((item) =>
                    String(item.id) === String(payload.notification_id) ? { ...item, is_read: true } : item
                  )
                );
              } else if (payload.unread_count === 0) {
                setRecentNotifications((prev) =>
                  prev.map((item) => ({ ...item, is_read: true }))
                );
              }
            } else if (payload.type === 'application.update') {
              window.dispatchEvent(
                new CustomEvent('erms:application.update', { detail: payload.data })
              );
            } else if (payload.type === 'broadcast.alert') {
              window.dispatchEvent(
                new CustomEvent('erms:broadcast.alert', { detail: payload.data })
              );
            }
          } catch (e) {
            console.error('Error handling WebSocket notification payload:', e);
          }
        };

        ws.onclose = (event) => {
          setIsConnected(false);
          socketRef.current = null;
          // Auto reconnect after 3 seconds unless normal closure
          if (event.code !== 1000 && event.code !== 4401) {
            reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
          }
        };

        ws.onerror = () => {
          try {
            ws.close();
          } catch (e) {}
        };
      } catch (err) {
        console.error('Failed to initialize notification WebSocket:', err);
      }
    };

    connectWebSocket();

    // Re-verify freshness on tab/window visibility switch
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated) {
        fetchUnreadCount();
        fetchRecentNotifications();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      closeSocket();
    };
  }, [isAuthenticated, accessToken, fetchUnreadCount, fetchRecentNotifications, showToast]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        recentNotifications,
        loading,
        isConnected,
        fetchUnreadCount,
        fetchRecentNotifications,
        markAsRead,
        markAllAsRead,
        subscribe,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;
