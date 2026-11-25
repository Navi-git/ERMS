import React, { useState, useRef, useEffect } from 'react';
import {
  Paperclip,
  Smile,
  Send,
  Zap,
  Pin,
  CalendarCheck2,
  Flag,
  MoreVertical,
  CheckCheck,
  Check,
  FileText,
  Download,
  Trash2,
  Edit2,
  X,
  Lock,
  ArrowDown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function formatMessageTime(dateString) {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatDateDivider(dateString) {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return 'Today';
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

export default function ChatThread({
  conversation,
  messages = [],
  currentUserId,
  isRecruiter = false,
  loading = false,
  hasMore = false,
  onLoadOlder,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onSendTyping,
  onOpenReportModal,
  onOpenPreviewModal,
  onOpenTemplates,
  typingUsers = {},
}) {
  const navigate = useNavigate();
  const [inputText, setInputText] = useState('');
  const [stagedFiles, setStagedFiles] = useState([]);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [showOptionsId, setShowOptionsId] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const typingThrottleRef = useRef(null);

  // Auto scroll to bottom on new message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Handle typing event throttle
  const handleInputChange = (e) => {
    setInputText(e.target.value);

    if (!typingThrottleRef.current) {
      onSendTyping(true);
      typingThrottleRef.current = setTimeout(() => {
        typingThrottleRef.current = null;
      }, 2000);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text && stagedFiles.length === 0) return;

    try {
      await onSendMessage({
        content: text,
        files: stagedFiles,
      });
      setInputText('');
      setStagedFiles([]);
      onSendTyping(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch {
      // Handled by context
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setStagedFiles((prev) => [...prev, ...files]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeStagedFile = (idx) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleStartEdit = (msg) => {
    setEditingMessageId(msg.id);
    setEditContent(msg.content);
    setShowOptionsId(null);
  };

  const handleSaveEdit = async (msgId) => {
    if (!editContent.trim()) return;
    try {
      await onEditMessage(msgId, editContent.trim());
      setEditingMessageId(null);
      setEditContent('');
    } catch {
      // Handled by context
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#f7f9fb] p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white shadow-xs border border-[#e0e3e5] flex items-center justify-center text-[#0058be] mb-4">
          <Send className="w-8 h-8 rotate-12" />
        </div>
        <h3 className="text-lg font-bold text-[#191c1e] mb-1">Select a Conversation</h3>
        <p className="text-xs text-[#71787e] max-w-sm">
          Choose a conversation from the sidebar to review candidates, coordinate interviews, or reply to messages.
        </p>
      </div>
    );
  }

  const otherUser = conversation.other_participant;
  const appContext = conversation.application_context;
  const otherName = otherUser?.full_name || 'Participant';

  // Subtitle string matching designs
  const subtitle = isRecruiter
    ? `${appContext?.job_title || otherUser?.headline || 'APPLICANT'} • ${appContext?.application_status?.toUpperCase() || 'IN REVIEW'}`
    : `${otherUser?.headline || 'Recruiter'} • Online now`;

  // Typing state for other user
  const isOtherTyping = Object.values(typingUsers).some((u) => u?.isTyping);

  // Group messages by date
  let lastDateStr = null;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#fcfdfe] relative overflow-hidden">
      {/* 1. Chat Header */}
      <header className="h-16 px-6 border-b border-[#e0e3e5] bg-white flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            {otherUser?.profile_picture_url ? (
              <img
                src={otherUser.profile_picture_url}
                alt={otherName}
                className="w-10 h-10 rounded-full object-cover border border-[#e0e3e5]"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-linear-to-br from-[#0058be] to-[#004ca5] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                {otherName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base text-[#191c1e] truncate">{otherName}</h2>
              {appContext?.company_name && !isRecruiter && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#0058be]/10 text-[#0058be] uppercase tracking-wider">
                  {appContext.company_name}
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-[#0058be] uppercase tracking-wider truncate">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5 text-[#71787e]">
          {/* Recruiter schedule interview shortcut */}
          {isRecruiter && appContext?.application_id && (
            <button
              type="button"
              onClick={() =>
                navigate(
                  `/recruiter/interviews/schedule?applicationId=${appContext.application_id}`
                )
              }
              title="Schedule Interview"
              className="p-2 rounded-xl hover:bg-[#f2f4f6] hover:text-[#0058be] transition-colors"
            >
              <CalendarCheck2 className="w-4 h-4" />
            </button>
          )}

          {/* Report conversation */}
          <button
            type="button"
            onClick={() => onOpenReportModal(null)}
            title="Report this conversation"
            className="p-2 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <Flag className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-[#f8fafc]/50">
        {/* Load older messages button */}
        {hasMore && (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onLoadOlder}
              className="px-3 py-1 bg-white border border-[#e0e3e5] rounded-full text-xs font-semibold text-[#71787e] hover:text-[#191c1e] hover:shadow-xs transition-all flex items-center gap-1.5 mx-auto"
            >
              <ArrowDown className="w-3 h-3 rotate-180" /> Load older messages
            </button>
          </div>
        )}

        {messages.map((msg) => {
          const isMine = msg.sender?.id === currentUserId;
          const currentDateStr = formatDateDivider(msg.created_at);
          const showDateDivider = currentDateStr && currentDateStr !== lastDateStr;
          lastDateStr = currentDateStr;

          // Check if message is editable (within 15 minutes)
          const isEditable =
            isMine &&
            !msg.is_deleted &&
            msg.message_type !== 'system' &&
            (new Date() - new Date(msg.created_at)) / 1000 <= 900;

          // System message card
          if (msg.message_type === 'system') {
            return (
              <React.Fragment key={msg.id}>
                {showDateDivider && (
                  <div className="flex items-center justify-center my-4">
                    <span className="px-3 py-1 bg-[#f2f4f6] text-[#71787e] text-xs font-semibold rounded-full shadow-2xs">
                      {currentDateStr}
                    </span>
                  </div>
                )}
                <div className="flex justify-center my-2">
                  <div className="px-4 py-2 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-[#0058be] font-medium max-w-md text-center">
                    {msg.content}
                  </div>
                </div>
              </React.Fragment>
            );
          }

          return (
            <React.Fragment key={msg.id}>
              {showDateDivider && (
                <div className="flex items-center justify-center my-4">
                  <span className="px-3 py-1 bg-[#f2f4f6] text-[#71787e] text-xs font-semibold rounded-full shadow-2xs">
                    {currentDateStr}
                  </span>
                </div>
              )}

              <div
                className={`flex items-end gap-2 group ${
                  isMine ? 'justify-end' : 'justify-start'
                }`}
              >
                {/* Incoming avatar */}
                {!isMine && (
                  <div className="w-7 h-7 rounded-full bg-[#e0e3e5] text-[#191c1e] font-bold text-[10px] flex items-center justify-center shrink-0 mb-1">
                    {msg.sender?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}

                {/* Message Bubble + Options Container */}
                <div className="relative max-w-[75%] sm:max-w-[65%]">
                  {/* Options Menu Trigger on Hover */}
                  {!msg.is_deleted && (
                    <div
                      className={`absolute top-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity ${
                        isMine ? '-left-8' : '-right-8'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setShowOptionsId(showOptionsId === msg.id ? null : msg.id)
                        }
                        className="p-1 rounded-full bg-white shadow-xs border border-[#e0e3e5] text-[#71787e] hover:text-[#191c1e]"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {showOptionsId === msg.id && (
                        <div className="absolute top-6 right-0 w-32 bg-white rounded-xl shadow-lg border border-[#e0e3e5] py-1 z-30">
                          {isEditable && (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(msg)}
                              className="w-full px-3 py-1.5 text-xs text-left text-[#191c1e] hover:bg-[#f7f9fb] flex items-center gap-2"
                            >
                              <Edit2 className="w-3 h-3 text-[#71787e]" /> Edit
                            </button>
                          )}
                          {isMine && (
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteMessage(msg.id);
                                setShowOptionsId(null);
                              }}
                              className="w-full px-3 py-1.5 text-xs text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              onOpenReportModal(msg);
                              setShowOptionsId(null);
                            }}
                            className="w-full px-3 py-1.5 text-xs text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Flag className="w-3 h-3" /> Report
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Main Bubble */}
                  <div
                    className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      isMine
                        ? 'bg-[#191c1e] text-white rounded-br-xs shadow-xs'
                        : 'bg-white text-[#191c1e] rounded-bl-xs border border-[#e0e3e5]/70 shadow-2xs'
                    }`}
                  >
                    {/* Editing mode */}
                    {editingMessageId === msg.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full p-2 bg-white text-[#191c1e] rounded-lg border border-[#c1c7ce] text-xs focus:outline-none"
                          rows={2}
                        />
                        <div className="flex items-center justify-end gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => setEditingMessageId(null)}
                            className="text-[#a0a6ac] hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(msg.id)}
                            className="px-2.5 py-1 bg-[#0058be] text-white font-bold rounded-lg"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {msg.is_deleted ? (
                          <p className="italic opacity-60 text-xs">This message was deleted.</p>
                        ) : (
                          <>
                            {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}

                            {/* Render Attachments */}
                            {msg.attachments_data && msg.attachments_data.length > 0 && (
                              <div className="mt-2 space-y-1.5">
                                {msg.attachments_data.map((att, aIdx) => (
                                  <div
                                    key={aIdx}
                                    onClick={() => onOpenPreviewModal(att)}
                                    className={`p-2.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                                      isMine
                                        ? 'bg-white/10 hover:bg-white/20 border-white/15'
                                        : 'bg-[#f7f9fb] hover:bg-[#edf4ff] border-[#e0e3e5]'
                                    }`}
                                  >
                                    <div
                                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                        isMine
                                          ? 'bg-white/20 text-white'
                                          : 'bg-red-50 text-red-600'
                                      }`}
                                    >
                                      <FileText className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-bold text-xs truncate">
                                        {att.name || 'Attachment'}
                                      </p>
                                      <p className="text-[11px] opacity-70">
                                        {att.size
                                          ? `${(att.size / 1024 / 1024).toFixed(1)} MB • Document`
                                          : 'File'}
                                      </p>
                                    </div>
                                    <Download className="w-4 h-4 opacity-70 hover:opacity-100 shrink-0" />
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}

                    {/* Meta info: Time, Edited status, Read Checkmarks */}
                    <div
                      className={`flex items-center justify-end gap-1.5 mt-1 text-[10px] ${
                        isMine ? 'text-white/60' : 'text-[#71787e]'
                      }`}
                    >
                      {msg.is_edited && <span>(edited)</span>}
                      <span>{formatMessageTime(msg.created_at)}</span>
                      {isMine && !msg.is_deleted && (
                        <span>
                          {msg.is_read ? (
                            <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                          ) : (
                            <Check className="w-3.5 h-3.5 opacity-60" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {/* Typing indicator bubble */}
        {isOtherTyping && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#e0e3e5] text-[#191c1e] font-bold text-[10px] flex items-center justify-center shrink-0">
              {otherName.charAt(0).toUpperCase()}
            </div>
            <div className="px-4 py-2 bg-white rounded-2xl rounded-bl-xs border border-[#e0e3e5] flex items-center gap-1.5 shadow-2xs">
              <span className="w-1.5 h-1.5 bg-[#71787e] rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-[#71787e] rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-[#71787e] rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Input Bar */}
      <footer className="p-4 bg-white border-t border-[#e0e3e5] shrink-0">
        {/* Staged attachments chips */}
        {stagedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {stagedFiles.map((file, idx) => (
              <div
                key={idx}
                className="px-3 py-1 bg-[#f2f4f6] border border-[#e0e3e5] rounded-lg text-xs font-medium text-[#191c1e] flex items-center gap-2"
              >
                <FileText className="w-3.5 h-3.5 text-[#0058be]" />
                <span className="max-w-[150px] truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeStagedFile(idx)}
                  className="text-[#71787e] hover:text-red-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2.5">
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            className="hidden"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
          />

          {/* Action icon buttons */}
          <div className="flex items-center gap-1 text-[#71787e] pb-1.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach File (PDF, DOCX, Images)"
              className="p-2 rounded-xl hover:bg-[#f2f4f6] hover:text-[#0058be] transition-colors"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Quick response templates (Recruiter only) */}
            {isRecruiter && (
              <button
                type="button"
                onClick={onOpenTemplates}
                title="Quick Response Templates"
                className="p-2 rounded-xl hover:bg-amber-50 hover:text-amber-600 transition-colors"
              >
                <Zap className="w-5 h-5 fill-amber-500" />
              </button>
            )}
          </div>

          {/* Text Area */}
          <div className="flex-1 bg-[#f2f4f6] rounded-2xl p-2 border border-transparent focus-within:border-[#0058be] focus-within:bg-white transition-all">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={isRecruiter ? `Reply to ${otherName}...` : 'Type your message...'}
              className="w-full px-2 py-1 bg-transparent text-sm text-[#191c1e] placeholder:text-[#71787e] focus:outline-none resize-none max-h-32"
            />
          </div>

          {/* Send Button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!inputText.trim() && stagedFiles.length === 0}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-xs transition-all ${
              inputText.trim() || stagedFiles.length > 0
                ? 'bg-[#0058be] hover:bg-[#004ca5] text-white active:scale-95'
                : 'bg-[#e0e3e5] text-[#a0a6ac] cursor-not-allowed'
            }`}
          >
            <span>SEND</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bottom security caption */}
        <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-[#71787e]">
          <span className="flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-[#0058be]" /> End-to-end encrypted
          </span>
          <span className="hidden sm:inline">Press Enter to send, Shift+Enter for new line</span>
        </div>
      </footer>
    </div>
  );
}
