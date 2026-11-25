import React from 'react';
import RecruiterLayout from '../../layouts/RecruiterLayout';
import ChatContainer from '../../components/chat/ChatContainer';

export default function RecruiterMessagesPage() {
  return (
    <RecruiterLayout>
      <div className="flex-1 flex flex-col h-[calc(100vh-4rem)]">
        <ChatContainer isRecruiter={true} />
      </div>
    </RecruiterLayout>
  );
}
