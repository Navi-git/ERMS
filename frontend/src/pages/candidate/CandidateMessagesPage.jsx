import React from 'react';
import CandidateLayout from '../../layouts/CandidateLayout';
import ChatContainer from '../../components/chat/ChatContainer';

export default function CandidateMessagesPage() {
  return (
    <CandidateLayout>
      <div className="flex-1 flex flex-col h-[calc(100vh-4rem)]">
        <ChatContainer isRecruiter={false} />
      </div>
    </CandidateLayout>
  );
}
