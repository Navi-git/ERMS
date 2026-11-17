import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { notificationApi } from '../api/notificationApi';
import { useToast } from './ToastContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, accessToken } = useSelector((state) => state.auth);
  const { showToast } = useToast();

  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

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

  // Mark single notification as read
  const markAsRead = useCallback(async (id) => {
    try {
      const response = await notificationApi.markAsRead(id);
      if (response.data?.unread_count !== undefined) {
        setUnreadCount(response.data.unread_count);
      } else {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      setRecentNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_read: true } : item))
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationApi.markAllAsRead();
      setUnreadCount(0);
      setRecentNotifications((prev) =>
        prev.map((item) => ({ ...item, is_read: true }))
      );
      showToast('All notifications marked as read', 'success');
    } catch (err) {
      showToast('Failed to mark all as read', 'error');
    }
  }, [showToast]);

  // Connect WebSocket when authenticated
  useEffect(() => {
    const token = accessToken || localStorage.getItem('erms_access_token');
    if (!isAuthenticated || !token) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      setIsConnected(false);
      setUnreadCount(0);
      setRecentNotifications([]);
      return;
    }

    // Initial HTTP fetch
    fetchUnreadCount();
    fetchRecentNotifications();

    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Connect to port 8000 where Daphne / Django runs
        const host = window.location.hostname || 'localhost';
        const wsUrl = `${protocol}//${host}:8000/ws/notifications/?token=${token}`;

        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'notification.alert') {
              const newNotif = payload.data;
              if (payload.unread_count !== undefined) {
                setUnreadCount(payload.unread_count);
              } else {
                setUnreadCount((prev) => prev + 1);
              }

              // Prepend to recent notifications list
              if (newNotif) {
                setRecentNotifications((prev) => [newNotif, ...prev.slice(0, 7)]);
                // Display in-app toast notification
                showToast(newNotif.message, 'info', newNotif.title || 'New Notification');
              }
            } else if (payload.type === 'unread_count.update') {
              setUnreadCount(payload.unread_count ?? 0);
            }
          } catch (e) {
            console.error('Error handling WebSocket notification payload:', e);
          }
        };

        ws.onclose = (event) => {
          setIsConnected(false);
          // Auto reconnect after 3 seconds unless normal closure
          if (event.code !== 1000 && event.code !== 4401) {
            reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
          }
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (err) {
        console.error('Failed to initialize notification WebSocket:', err);
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close(1000, 'Component unmounted');
        socketRef.current = null;
      }
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
