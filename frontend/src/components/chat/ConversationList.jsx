import React from 'react';
import { Search, Filter, MessageSquare, CheckCheck, Check } from 'lucide-react';

function formatChatTime(dateString) {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export default function ConversationList({
  conversations = [],
  activeConversationId,
  onSelectConversation,
  searchQuery,
  onSearchChange,
  loading = false,
  isRecruiter = false,
}) {
  return (
    <aside className="w-80 sm:w-96 border-r border-[#e0e3e5] bg-white flex flex-col h-full shrink-0 select-none">
      {/* List Header */}
      <div className="p-4 border-b border-[#e0e3e5] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#191c1e] tracking-tight">Messages</h2>
            {conversations.length > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#f2f4f6] text-[#71787e]">
                {conversations.length}
              </span>
            )}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#71787e] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-9 pr-4 py-2 bg-[#f2f4f6] hover:bg-[#ebedef] focus:bg-white text-xs text-[#191c1e] rounded-xl border border-transparent focus:border-[#0058be] focus:outline-none transition-all placeholder:text-[#71787e]"
          />
        </div>
      </div>

      {/* Conversation Items List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#f2f4f6]">
        {loading && conversations.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#71787e]">Loading conversations...</div>
        ) : conversations.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-[#0058be] flex items-center justify-center mx-auto">
              <MessageSquare className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-[#191c1e]">No messages yet</p>
            <p className="text-xs text-[#71787e]">
              {isRecruiter
                ? 'Initiate conversations from applicant profiles.'
                : 'Recruiters reviewing your applications will reach out here.'}
            </p>
          </div>
        ) : (
          conversations.map((conv) => {
            const isSelected = conv.id === activeConversationId;
            const otherUser = conv.other_participant;
            const appContext = conv.application_context;
            const lastMsg = conv.last_message;
            const unread = conv.unread_count || 0;

            const name = otherUser?.full_name || 'Participant';
            const headline =
              appContext?.job_title ||
              otherUser?.headline ||
              (isRecruiter ? 'Applicant' : 'Recruiter');
            const timeStr = formatChatTime(conv.last_message_at || conv.updated_at);

            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full p-3.5 flex items-start gap-3 text-left transition-colors relative ${
                  isSelected
                    ? 'bg-[#edf4ff]'
                    : unread > 0
                    ? 'bg-blue-50/20 hover:bg-[#f7f9fb]'
                    : 'hover:bg-[#f7f9fb]'
                }`}
              >
                {/* Avatar with status indicator */}
                <div className="relative shrink-0">
                  {otherUser?.profile_picture_url ? (
                    <img
                      src={otherUser.profile_picture_url}
                      alt={name}
                      className="w-11 h-11 rounded-full object-cover border border-[#e0e3e5]"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-linear-to-br from-[#0058be] to-[#004ca5] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                      {name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {/* Active indicator dot */}
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                </div>

                {/* Content snippet */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      className={`text-sm font-bold truncate ${
                        unread > 0 ? 'text-[#191c1e]' : 'text-[#2b3034]'
                      }`}
                    >
                      {name}
                    </span>
                    <span className="text-[11px] text-[#71787e] shrink-0 ml-2">{timeStr}</span>
                  </div>

                  {/* Headline context */}
                  <p className="text-[11px] font-medium text-[#0058be] truncate mb-0.5 uppercase tracking-wide">
                    {headline}
                  </p>

                  {/* Last message preview */}
                  <div className="flex items-center justify-between">
                    <p
                      className={`text-xs truncate ${
                        unread > 0 ? 'font-semibold text-[#191c1e]' : 'text-[#71787e]'
                      }`}
                    >
                      {lastMsg ? (
                        lastMsg.is_deleted ? (
                          <span className="italic text-[#a0a6ac]">Message deleted</span>
                        ) : (
                          lastMsg.content || 'Attachment'
                        )
                      ) : (
                        <span className="italic text-[#a0a6ac]">Started conversation</span>
                      )}
                    </p>

                    {/* Unread badge / dot */}
                    {unread > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 min-w-5 text-[10px] font-bold text-center text-white bg-[#0058be] rounded-full shrink-0">
                        {unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
