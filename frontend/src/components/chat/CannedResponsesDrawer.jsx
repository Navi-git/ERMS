import React from 'react';
import { Zap, X, ArrowRight } from 'lucide-react';

const CANNED_TEMPLATES = [
  {
    title: 'Invite to Interview',
    text: "Hi! Thanks for applying. Your background caught our eye, and we'd love to schedule a 30-minute introductory call to discuss the role in more detail.",
  },
  {
    title: 'Request Updated Portfolio / Code',
    text: "Hi! Thanks for your response. Could you please share a link to your updated portfolio or GitHub repository showcasing your recent relevant projects?",
  },
  {
    title: 'Technical Assessment Follow-up',
    text: "Hi! We have reviewed your assessment submission. The engineering team was very impressed with your solution, and we'd like to invite you to the technical interview round.",
  },
  {
    title: 'Confirm Availability',
    text: "Hi! Could you please let us know your availability (dates and time windows in EST/IST) for a video interview later this week?",
  },
  {
    title: 'Offer Overview Notice',
    text: "Great news! We are preparing your formal job offer letter. In the meantime, please review the attached benefits summary and reach out with any preliminary questions.",
  },
];

export default function CannedResponsesDrawer({ isOpen, onClose, onSelect }) {
  if (!isOpen) return null;

  return (
    <div className="absolute bottom-20 left-6 right-6 z-40 bg-white rounded-2xl shadow-xl border border-[#e0e3e5] p-4 animate-in slide-in-from-bottom-3 duration-200">
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#e0e3e5]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Zap className="w-4 h-4 fill-amber-500" />
          </div>
          <span className="font-bold text-sm text-[#191c1e]">
            Quick Response Templates
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-[#71787e] hover:text-[#191c1e] hover:bg-[#f2f4f6]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
        {CANNED_TEMPLATES.map((tmpl, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              onSelect(tmpl.text);
              onClose();
            }}
            className="text-left p-2.5 rounded-xl border border-[#e0e3e5] hover:border-[#0058be] hover:bg-blue-50/50 transition-all group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="font-bold text-xs text-[#191c1e] group-hover:text-[#0058be]">
                {tmpl.title}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-[#a0a6ac] group-hover:text-[#0058be] group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-[11px] text-[#71787e] line-clamp-2 leading-relaxed">
              {tmpl.text}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
