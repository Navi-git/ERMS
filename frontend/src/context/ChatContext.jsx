import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { chatApi } from '../api/chatApi';
import { useToast } from './ToastContext';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { isAuthenticated, accessToken, user } = useSelector((state) => state.auth);
  const { showToast } = useToast();

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [typingMap, setTypingMap] = useState({}); // { [convId]: { [userId]: { fullName, isTyping } } }
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [isWsConnected, setIsWsConnected] = useState(false);

  const socketRef = useRef(null);
  const activeConvRef = useRef(activeConversation);
  activeConvRef.current = activeConversation;

  const typingTimeoutRef = useRef({});

  // 1. Fetch conversations list
  const fetchConversations = useCallback(async (search = '') => {
    if (!isAuthenticated) return;
    try {
      setLoadingConversations(true);
      const res = await chatApi.getConversations({ search });
      setConversations(res.data?.conversations || []);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  }, [isAuthenticated]);

  // 2. Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await chatApi.getUnreadCount();
      setUnreadTotal(res.data?.unread_count ?? 0);
    } catch (err) {
      // Silent fail
    }
  }, [isAuthenticated]);

  // 3. Mark active conversation as read
  const markAsRead = useCallback(async (conversationId) => {
    if (!conversationId) return;
    try {
      // Optimistic update
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c))
      );
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            action: 'read',
            conversation_id: conversationId,
          })
        );
      }
      const res = await chatApi.markAsRead(conversationId);
      if (res.data?.unread_count !== undefined) {
        setUnreadTotal(res.data.unread_count);
      }
    } catch (err) {
      // Silent fail
    }
  }, []);

  // 4. Select a conversation
  const selectConversation = useCallback(
    async (convOrId) => {
      let convId = typeof convOrOrId === 'object' && convOrId !== null ? convOrId.id : convOrId;
      if (!convId) return;

      try {
        setLoadingMessages(true);
        // Find existing or fetch detail
        let targetConv = conversations.find((c) => c.id === convId);
        if (!targetConv) {
          const detailRes = await chatApi.getConversationDetail(convId);
          targetConv = detailRes.data;
        }
        setActiveConversation(targetConv);

        // Fetch messages with mark_read=true
        const res = await chatApi.getMessages(convId, { limit: 50, mark_read: true });
        setMessages(res.data?.messages || []);
        setHasMoreMessages(res.data?.has_more || false);
        setNextCursor(res.data?.next_cursor || null);

        // Join room in WS if connected
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(
            JSON.stringify({
              action: 'join_conversation',
              conversation_id: convId,
            })
          );
        }

        markAsRead(convId);
      } catch (err) {
        console.error('Failed to load conversation messages:', err);
        showToast('Unable to load chat messages.', 'error');
      } finally {
        setLoadingMessages(false);
      }
    },
    [conversations, markAsRead, showToast]
  );

  // 5. Load older messages (pagination cursor)
  const loadOlderMessages = useCallback(async () => {
    if (!activeConversation?.id || !nextCursor || loadingMessages) return;
    try {
      const res = await chatApi.getMessages(activeConversation.id, {
        before: nextCursor,
        limit: 30,
      });
      const older = res.data?.messages || [];
      setMessages((prev) => [...older, ...prev]);
      setHasMoreMessages(res.data?.has_more || false);
      setNextCursor(res.data?.next_cursor || null);
    } catch (err) {
      console.error('Failed to load older messages:', err);
    }
  }, [activeConversation, nextCursor, loadingMessages]);

  // 6. Send message
  const sendMessage = useCallback(
    async ({ content, files = [] }) => {
      if (!activeConversation?.id) return;
      const convId = activeConversation.id;

      try {
        let payload;
        if (files && files.length > 0) {
          const formData = new FormData();
          formData.append('content', content || '');
          formData.append('message_type', 'attachment');
          files.forEach((file) => formData.append('files', file));
          payload = formData;
        } else {
          payload = { content, message_type: 'text' };
        }

        const res = await chatApi.sendMessage(convId, payload);
        const newMsg = res.data;

        // Optimistically add to state if not already received via WS
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        // Update last message in conversations list
        setConversations((prev) => {
          const updated = prev.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  last_message_at: newMsg.created_at,
                  last_message: {
                    id: newMsg.id,
                    content: newMsg.content,
                    message_type: newMsg.message_type,
                    created_at: newMsg.created_at,
                    sender_id: user?.id,
                    is_read: true,
                  },
                }
              : c
          );
          // Sort most recent first
          return updated.sort(
            (a, b) => new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0)
          );
        });

        return newMsg;
      } catch (err) {
        console.error('Failed to send message:', err);
        showToast(err.response?.data?.detail || 'Failed to send message.', 'error');
        throw err;
      }
    },
    [activeConversation, user, showToast]
  );

  // 7. Edit message
  const editMessage = useCallback(
    async (messageId, newContent) => {
      if (!activeConversation?.id) return;
      try {
        const res = await chatApi.editMessage(activeConversation.id, messageId, {
          content: newContent,
        });
        const updated = res.data;

        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, ...updated } : m))
        );
        return updated;
      } catch (err) {
        showToast(err.response?.data?.detail || 'Failed to edit message.', 'error');
        throw err;
      }
    },
    [activeConversation, showToast]
  );

  // 8. Delete message
  const deleteMessage = useCallback(
    async (messageId) => {
      if (!activeConversation?.id) return;
      try {
        await chatApi.deleteMessage(activeConversation.id, messageId);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, is_deleted: true, content: 'This message was deleted.', attachments_data: [] }
              : m
          )
        );
      } catch (err) {
        showToast(err.response?.data?.detail || 'Failed to delete message.', 'error');
        throw err;
      }
    },
    [activeConversation, showToast]
  );

  // 9. Send typing indicator
  const sendTyping = useCallback(
    (isTyping = true) => {
      if (!activeConversation?.id || !socketRef.current) return;
      if (socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            action: 'typing',
            conversation_id: activeConversation.id,
            is_typing: isTyping,
          })
        );
      }
    },
    [activeConversation]
  );

  // 10. Report chat
  const reportChat = useCallback(
    async ({ reason, description, messageId = null }) => {
      if (!activeConversation?.id) return;
      try {
        const res = await chatApi.reportChat(activeConversation.id, {
          reason,
          description,
          message_id: messageId,
        });
        showToast('Report submitted successfully to administrators.', 'success');
        return res.data;
      } catch (err) {
        showToast(err.response?.data?.detail || 'Failed to submit report.', 'error');
        throw err;
      }
    },
    [activeConversation, showToast]
  );

  // WebSocket Connection Lifecycle
  useEffect(() => {
    let reconnectTimer = null;

    if (!isAuthenticated || !accessToken) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      setIsWsConnected(false);
      return;
    }

    fetchConversations();
    fetchUnreadCount();

    const connectSocket = () => {
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
        const wsUrl = `${wsBase}/ws/chat/?token=${accessToken}`;
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          setIsWsConnected(true);
          // If we had an active conversation, re-join its room
          if (activeConvRef.current?.id) {
            ws.send(
              JSON.stringify({
                action: 'join_conversation',
                conversation_id: activeConvRef.current.id,
              })
            );
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const activeId = activeConvRef.current?.id;

            switch (data.type) {
              case 'chat.message': {
                const incomingMsg = data.message;
                if (!incomingMsg) break;

                // If message belongs to active thread, append
                if (activeId && incomingMsg.conversation_id === activeId) {
                  setMessages((prev) => {
                    if (prev.some((m) => m.id === incomingMsg.id)) return prev;
                    return [...prev, incomingMsg];
                  });
                  // Automatically mark as read if it's from another person
                  if (incomingMsg.sender?.id !== user?.id) {
                    markAsRead(activeId);
                  }
                }

                // Update conversations list summary
                setConversations((prev) => {
                  let found = false;
                  const updated = prev.map((c) => {
                    if (c.id === incomingMsg.conversation_id) {
                      found = true;
                      const isCurrent = activeId === incomingMsg.conversation_id;
                      return {
                        ...c,
                        last_message_at: incomingMsg.created_at,
                        last_message: {
                          id: incomingMsg.id,
                          content: incomingMsg.content,
                          message_type: incomingMsg.message_type,
                          created_at: incomingMsg.created_at,
                          sender_id: incomingMsg.sender?.id,
                          is_read: isCurrent,
                        },
                        unread_count: isCurrent
                          ? 0
                          : (c.unread_count || 0) + (incomingMsg.sender?.id !== user?.id ? 1 : 0),
                      };
                    }
                    return c;
                  });

                  if (!found) {
                    // Refetch conversations list so new incoming conversation appears
                    fetchConversations();
                  }

                  return updated.sort(
                    (a, b) => new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0)
                  );
                });
                break;
              }

              case 'chat.typing': {
                const { conversation_id, user_id, full_name, is_typing } = data;
                setTypingMap((prev) => ({
                  ...prev,
                  [conversation_id]: {
                    ...(prev[conversation_id] || {}),
                    [user_id]: { fullName: full_name, isTyping: is_typing },
                  },
                }));

                // Auto reset typing status after 4 seconds
                if (is_typing) {
                  clearTimeout(typingTimeoutRef.current[`${conversation_id}_${user_id}`]);
                  typingTimeoutRef.current[`${conversation_id}_${user_id}`] = setTimeout(() => {
                    setTypingMap((prev) => ({
                      ...prev,
                      [conversation_id]: {
                        ...(prev[conversation_id] || {}),
                        [user_id]: { fullName: full_name, isTyping: false },
                      },
                    }));
                  }, 4000);
                }
                break;
              }

              case 'chat.read_receipt': {
                const { conversation_id, last_read_at, user_id: readerId } = data;
                if (activeId === conversation_id) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.sender?.id === user?.id && new Date(m.created_at) <= new Date(last_read_at)
                        ? { ...m, is_read: true }
                        : m
                    )
                  );
                }
                break;
              }

              case 'chat.message_updated': {
                const { message_id, content, is_edited, edited_at, conversation_id } = data;
                if (activeId === conversation_id) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === message_id ? { ...m, content, is_edited, edited_at } : m
                    )
                  );
                }
                break;
              }

              case 'chat.message_deleted': {
                const { message_id, conversation_id } = data;
                if (activeId === conversation_id) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === message_id
                        ? { ...m, is_deleted: true, content: 'This message was deleted.', attachments_data: [] }
                        : m
                    )
                  );
                }
                break;
              }

              case 'chat.unread_update': {
                if (data.unread_count !== undefined) {
                  setUnreadTotal(data.unread_count);
                }
                break;
              }

              default:
                break;
            }
          } catch (e) {
            console.error('Error handling WebSocket chat message:', e);
          }
        };

        ws.onclose = () => {
          setIsWsConnected(false);
          // Auto-reconnect after 3 seconds
          reconnectTimer = setTimeout(connectSocket, 3000);
        };

        ws.onerror = () => {
          setIsWsConnected(false);
        };
      } catch (err) {
        setIsWsConnected(false);
      }
    };

    connectSocket();

    return () => {
      clearTimeout(reconnectTimer);
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, accessToken, user?.id, fetchConversations, fetchUnreadCount, markAsRead]);

  const value = {
    conversations,
    activeConversation,
    messages,
    loadingConversations,
    loadingMessages,
    unreadTotal,
    typingMap,
    hasMoreMessages,
    isWsConnected,
    fetchConversations,
    selectConversation,
    loadOlderMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    sendTyping,
    markAsRead,
    reportChat,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export default ChatContext;
