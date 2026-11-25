import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useChat } from '../../context/ChatContext';
import { chatApi } from '../../api/chatApi';
import ConversationList from './ConversationList';
import ChatThread from './ChatThread';
import ReportChatModal from './ReportChatModal';
import AttachmentPreviewModal from './AttachmentPreviewModal';
import CannedResponsesDrawer from './CannedResponsesDrawer';

export default function ChatContainer({ isRecruiter = false }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useSelector((state) => state.auth);

  const {
    conversations,
    activeConversation,
    messages,
    loadingConversations,
    loadingMessages,
    typingMap,
    hasMoreMessages,
    selectConversation,
    loadOlderMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    sendTyping,
    reportChat,
    fetchConversations,
  } = useChat();

  const [searchQuery, setSearchQuery] = useState('');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportedMessage, setReportedMessage] = useState(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [activeAttachment, setActiveAttachment] = useState(null);
  const [templatesDrawerOpen, setTemplatesDrawerOpen] = useState(false);
  const initiatedAppRef = useRef(null);

  // Check URL query parameters for auto-selection or initiation
  const conversationIdParam = searchParams.get('conversationId');
  const applicationIdParam = searchParams.get('applicationId');

  useEffect(() => {
    if (conversationIdParam) {
      selectConversation(Number(conversationIdParam));
    } else if (applicationIdParam) {
      if (initiatedAppRef.current === applicationIdParam) return;
      initiatedAppRef.current = applicationIdParam;

      // Check if conversation for this application already exists in list
      const existing = conversations.find(
        (c) => c.application_context?.application_id === Number(applicationIdParam)
      );
      if (existing) {
        setSearchParams({ conversationId: existing.id }, { replace: true });
        selectConversation(existing.id);
        return;
      }

      // Recruiter or candidate arriving from an application
      chatApi
        .createConversation({ application_id: Number(applicationIdParam) })
        .then((res) => {
          if (res.data?.id) {
            setSearchParams({ conversationId: res.data.id }, { replace: true });
            selectConversation(res.data.id);
            fetchConversations();
          }
        })
        .catch((err) => {
          console.error('Failed to initiate conversation from application:', err);
        });
    } else if (conversations.length > 0 && !activeConversation) {
      // Auto select first conversation by default if none selected
      selectConversation(conversations[0].id);
    }
  }, [conversationIdParam, applicationIdParam, conversations]);

  const handleSelectConv = (id) => {
    setSearchParams({ conversationId: id });
    selectConversation(id);
  };

  const handleOpenReportModal = (msg = null) => {
    setReportedMessage(msg);
    setReportModalOpen(true);
  };

  const handleOpenPreviewModal = (attachment) => {
    setActiveAttachment(attachment);
    setPreviewModalOpen(true);
  };

  const handleApplyTemplate = (templateText) => {
    sendMessage({ content: templateText });
  };

  return (
    <div className="flex-1 flex flex-row h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] overflow-hidden bg-white border border-[#e0e3e5] rounded-2xl shadow-sm relative m-4 md:m-6">
      {/* 1. Left Conversation List */}
      <ConversationList
        conversations={conversations}
        activeConversationId={activeConversation?.id}
        onSelectConversation={handleSelectConv}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        loading={loadingConversations}
        isRecruiter={isRecruiter}
      />

      {/* 2. Right Chat Thread */}
      <ChatThread
        conversation={activeConversation}
        messages={messages}
        currentUserId={user?.id}
        isRecruiter={isRecruiter}
        loading={loadingMessages}
        hasMore={hasMoreMessages}
        onLoadOlder={loadOlderMessages}
        onSendMessage={sendMessage}
        onEditMessage={editMessage}
        onDeleteMessage={deleteMessage}
        onSendTyping={sendTyping}
        onOpenReportModal={handleOpenReportModal}
        onOpenPreviewModal={handleOpenPreviewModal}
        onOpenTemplates={() => setTemplatesDrawerOpen(true)}
        typingUsers={typingMap[activeConversation?.id] || {}}
      />

      {/* 3. Canned Responses Drawer (Recruiter only) */}
      {isRecruiter && (
        <CannedResponsesDrawer
          isOpen={templatesDrawerOpen}
          onClose={() => setTemplatesDrawerOpen(false)}
          onSelect={handleApplyTemplate}
        />
      )}

      {/* 4. Report Modal */}
      <ReportChatModal
        isOpen={reportModalOpen}
        onClose={() => {
          setReportModalOpen(false);
          setReportedMessage(null);
        }}
        onSubmit={reportChat}
        targetUser={activeConversation?.other_participant}
        targetMessage={reportedMessage}
      />

      {/* 5. Attachment Preview Modal */}
      <AttachmentPreviewModal
        isOpen={previewModalOpen}
        onClose={() => {
          setPreviewModalOpen(false);
          setActiveAttachment(null);
        }}
        attachment={activeAttachment}
      />
    </div>
  );
}
