import React, { useState } from 'react';
import { X, Send, Users, ShieldAlert, Sparkles, Check } from 'lucide-react';
import { notificationApi } from '../../api/notificationApi';
import { useToast } from '../../context/ToastContext';

export default function CreateBroadcastModal({ isOpen, onClose, onBroadcastSent }) {
  const { showToast } = useToast();

  const [targetAudience, setTargetAudience] = useState({
    candidates: true,
    recruiters: false,
    general: false,
  });
  const [audienceSegment, setAudienceSegment] = useState('All Users');
  const [notificationType, setNotificationType] = useState('Platform Updates');
  const [messageTitle, setMessageTitle] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [inAppBanner, setInAppBanner] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAudienceToggle = (key) => {
    setTargetAudience((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSelectAll = () => {
    const allSelected = targetAudience.candidates && targetAudience.recruiters && targetAudience.general;
    setTargetAudience({
      candidates: !allSelected,
      recruiters: !allSelected,
      general: !allSelected,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!messageContent.trim()) {
      showToast('Please provide broadcast message content', 'error');
      return;
    }

    // Determine backend audience string: all, candidates, or recruiters
    let audienceStr = 'all';
    if (targetAudience.candidates && !targetAudience.recruiters && !targetAudience.general) {
      audienceStr = 'candidates';
    } else if (targetAudience.recruiters && !targetAudience.candidates && !targetAudience.general) {
      audienceStr = 'recruiters';
    }

    try {
      setSubmitting(true);
      await notificationApi.createAdminBroadcast({
        title: messageTitle.trim() || notificationType,
        message: messageContent.trim(),
        audience: audienceStr,
        notification_type: 'system',
      });

      showToast('Broadcast published successfully', 'success');
      onBroadcastSent?.();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to send broadcast', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Create New Broadcast</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Deliver immediate platform announcements across user portals.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          {/* Target Audience */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Target Audience
              </label>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Select All
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Candidates */}
              <div
                onClick={() => handleAudienceToggle('candidates')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  targetAudience.candidates
                    ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-500'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Candidates</span>
                  <input
                    type="checkbox"
                    checked={targetAudience.candidates}
                    onChange={() => {}}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  Job seekers and active applicants
                </p>
              </div>

              {/* Recruiters */}
              <div
                onClick={() => handleAudienceToggle('recruiters')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  targetAudience.recruiters
                    ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-500'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Recruiters</span>
                  <input
                    type="checkbox"
                    checked={targetAudience.recruiters}
                    onChange={() => {}}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  Hiring managers and company users
                </p>
              </div>

              {/* General */}
              <div
                onClick={() => handleAudienceToggle('general')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  targetAudience.general
                    ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-500'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">General</span>
                  <input
                    type="checkbox"
                    checked={targetAudience.general}
                    onChange={() => {}}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  All platform users and guests
                </p>
              </div>
            </div>
          </div>

          {/* Audience Segment */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Audience Segment
            </label>
            <select
              value={audienceSegment}
              onChange={(e) => setAudienceSegment(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500"
            >
              <option value="All Users">All Users</option>
              <option value="Active Users (30 Days)">Active in last 30 days</option>
              <option value="Verified Companies Only">Verified Companies Only</option>
            </select>
          </div>

          {/* Notification Type & Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Notification Type
              </label>
              <select
                value={notificationType}
                onChange={(e) => setNotificationType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500"
              >
                <option value="Platform Updates">Platform Updates</option>
                <option value="Maintenance Alert">Maintenance Alert</option>
                <option value="Security Advisory">Security Advisory</option>
                <option value="Important Notice">Important Notice</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Headline / Title
              </label>
              <input
                type="text"
                placeholder="e.g. Scheduled System Upgrade"
                value={messageTitle}
                onChange={(e) => setMessageTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
          </div>

          {/* Message Content */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Message Content
            </label>
            <textarea
              rows={4}
              placeholder="Enter the broadcast message details..."
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 leading-relaxed"
            />
          </div>

          {/* Delivery Method & Scheduling */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Delivery Method
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inAppBanner}
                  onChange={(e) => setInAppBanner(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-600">In-app Banner & Live Alert</span>
              </label>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Scheduling
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Send Now
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Broadcasting...' : 'Send Broadcast'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
