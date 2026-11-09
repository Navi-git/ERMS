import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Briefcase,
  DollarSign,
  AlertTriangle,
  Eye,
  Users,
  Calendar,
  Clock,
  ShieldCheck,
  Send,
  Loader2,
  CheckCircle2,
  FileText,
  PauseCircle,
  PlayCircle,
  XCircle,
  MoreVertical,
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import jobApi from '../../api/jobApi';
import { useToast } from '../../context/ToastContext';

export default function AdminJobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState(null);
  const [notes, setNotes] = useState([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  useEffect(() => {
    async function loadJobDetail() {
      setLoading(true);
      try {
        const res = await jobApi.getAdminJob(id);
        setJob(res.data);
        setNotes(res.data.internal_notes || []);
      } catch (err) {
        showToast('Job listing not found.', 'error');
        navigate('/admin/jobs');
      } finally {
        setLoading(false);
      }
    }
    loadJobDetail();
  }, [id, navigate, showToast]);

  const handleUpdateStatus = async (newStatus) => {
    const reason =
      newStatus === 'on_hold'
        ? window.prompt('Enter reason for placing on hold:', 'Administrative policy review')
        : '';
    try {
      const res = await jobApi.updateAdminJobStatus(id, { status: newStatus, reason });
      setJob((prev) => ({ ...prev, job_status: newStatus, on_hold_reason: reason }));
      showToast(`Job status changed to ${newStatus}.`, 'success');
    } catch (err) {
      showToast('Failed to update status.', 'error');
    } finally {
      setStatusMenuOpen(false);
    }
  };

  const handleFlagJob = async () => {
    const reason = window.prompt('Enter reason for administrative flag:', 'Suspicious terms');
    if (!reason) return;

    try {
      const res = await jobApi.flagAdminJob(id, { reason });
      setJob((prev) => ({
        ...prev,
        reports: [res.data, ...(prev.reports || [])],
      }));
      showToast('Flag recorded and added to reports.', 'success');
    } catch (err) {
      showToast('Failed to flag job.', 'error');
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    setAddingNote(true);
    try {
      const res = await jobApi.addAdminJobNote(id, { note_text: newNoteText.trim() });
      setNotes([res.data, ...notes]);
      setNewNoteText('');
      showToast('Internal note added.', 'success');
    } catch (err) {
      showToast('Failed to save note.', 'error');
    } finally {
      setAddingNote(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#717680]">
          <Loader2 className="w-8 h-8 animate-spin text-[#0058be]" />
          <span className="text-sm font-medium">Loading inspection details...</span>
        </div>
      </AdminLayout>
    );
  }

  if (!job) return null;

  const statusStyles = {
    published: 'bg-[#e6f4ea] text-[#137333]',
    draft: 'bg-[#fff8e1] text-[#b06000]',
    on_hold: 'bg-[#f1f4f6] text-[#717680]',
    closed: 'bg-[#fce8e6] text-[#c5221f]',
  }[job.job_status] || 'bg-[#f1f4f6] text-[#717680]';

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Back Link */}
        <Link
          to="/admin/jobs"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#717680] hover:text-[#0058be]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Job Board</span>
        </Link>

        {/* Header Hero Card (Figma Page 12) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e5e8ec] shadow-2xs">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusStyles}`}>
                  {job.job_status === 'published' ? 'Active' : job.job_status.replace('_', ' ')}
                </span>
                <span className="text-xs text-[#717680]">
                  Job ID: #{job.id} • Created {new Date(job.created_at).toLocaleDateString()}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#191c1e] tracking-tight">
                {job.job_title}
              </h1>

              <div className="flex items-center gap-2 text-xs text-[#535862] flex-wrap">
                <span className="font-bold text-[#191c1e]">{job.company_name}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#717680]" />
                  {job.location || 'Remote'}
                </span>
                <span>•</span>
                <span className="capitalize">{job.employment_type?.replace('_', ' ')}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 w-full md:w-auto shrink-0 relative">
              <button
                type="button"
                onClick={handleFlagJob}
                className="px-4 py-2.5 rounded-xl border border-[#d5d7da] bg-white font-semibold text-xs text-[#ba1a1a] hover:bg-[#ffdad6]/40 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Flag for Review</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusMenuOpen(!statusMenuOpen)}
                className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-[#0058be] hover:bg-[#004ca5] shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <span>Manage Status</span>
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {/* Status Dropdown */}
              {statusMenuOpen && (
                <div className="absolute right-0 top-12 z-30 w-44 bg-white border border-[#e5e8ec] rounded-2xl shadow-xl p-1.5 space-y-1 text-left">
                  {job.job_status !== 'on_hold' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus('on_hold')}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#b06000] hover:bg-[#fff8e1] flex items-center gap-2 cursor-pointer"
                    >
                      <PauseCircle className="w-3.5 h-3.5" />
                      <span>Place on Hold</span>
                    </button>
                  )}

                  {job.job_status !== 'published' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus('published')}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#137333] hover:bg-[#e6f4ea] flex items-center gap-2 cursor-pointer"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>Set as Active</span>
                    </button>
                  )}

                  {job.job_status !== 'closed' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus('closed')}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#c5221f] hover:bg-[#fce8e6] flex items-center gap-2 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Close Listing</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3 Top Metric Cards (Figma Page 12) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-[#e5e8ec] shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#717680]">Total Views</span>
            <div className="text-2xl font-black text-[#0058be] mt-1">
              {job.views_count || 1}
            </div>
            <div className="text-[11px] text-[#717680] mt-0.5">Recorded via view_events</div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#e5e8ec] shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#717870]">Applications</span>
            <div className="text-2xl font-black text-[#191c1e] mt-1">
              {job.applications_count || 0}
            </div>
            <div className="text-[11px] text-[#717870] mt-0.5">Total candidate submissions</div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#e5e8ec] shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#717870]">Reports Filed</span>
            <div className="text-2xl font-black text-[#ba1a1a] mt-1">
              {job.reports?.length || 0}
            </div>
            <div className="text-[11px] text-[#ba1a1a] font-medium mt-0.5">Community flags</div>
          </div>
        </div>

        {/* 2-Column Body */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column (Content & Flags: 2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overview */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#e5e8ec] space-y-4 shadow-2xs">
              <h3 className="font-bold text-base text-[#191c1e] border-b border-[#f0f2f5] pb-3">
                Job Overview & Description
              </h3>
              <div className="text-xs text-[#414651] leading-relaxed whitespace-pre-line">
                {job.job_description}
              </div>
            </div>

            {/* Requirements & Responsibilities */}
            {(job.requirements || job.responsibilities) && (
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#e5e8ec] space-y-4 shadow-2xs">
                {job.requirements && (
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-[#717680] mb-2">
                      Key Requirements
                    </h4>
                    <p className="text-xs text-[#414651] whitespace-pre-line">
                      {job.requirements}
                    </p>
                  </div>
                )}
                {job.responsibilities && (
                  <div className="pt-3 border-t border-[#f0f2f5]">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-[#717680] mb-2">
                      Responsibilities
                    </h4>
                    <p className="text-xs text-[#414651] whitespace-pre-line">
                      {job.responsibilities}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Reports & Flag History */}
            {job.reports?.length > 0 && (
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#e5e8ec] space-y-4 shadow-2xs">
                <div className="flex items-center gap-2 text-base font-bold text-[#ba1a1a] border-b border-[#f0f2f5] pb-3">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>Reported Violations ({job.reports.length})</span>
                </div>
                <div className="space-y-3">
                  {job.reports.map((r) => (
                    <div key={r.id} className="p-3.5 rounded-2xl bg-[#fffbfa] border border-[#fecdca] space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-[#b42318]">
                        <span>{r.reason}</span>
                        <span className="text-[10px] text-[#717680]">
                          {new Date(r.created_at).toLocaleString()}
                        </span>
                      </div>
                      {r.description && (
                        <p className="text-xs text-[#414651]">{r.description}</p>
                      )}
                      <div className="text-[10px] text-[#717680]">
                        Reported by: {r.reporter_email || 'Anonymous user'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column (Listing Details & Internal Admin Notes: 1 Col) */}
          <div className="space-y-6">
            {/* Listing Details Card (Figma Page 12) */}
            <div className="bg-white rounded-3xl p-6 border border-[#e5e8ec] space-y-4 shadow-2xs text-xs">
              <h3 className="font-bold uppercase tracking-wider text-[#717680]">
                Listing Details
              </h3>

              <div className="space-y-3.5">
                <div>
                  <span className="text-[#717680] block mb-0.5">Company Status</span>
                  <div className="flex items-center gap-1.5 font-bold text-[#191c1e]">
                    <ShieldCheck className="w-4 h-4 text-[#0058be]" />
                    <span>Verified ({job.company_verification_status})</span>
                  </div>
                </div>

                <div>
                  <span className="text-[#717680] block mb-0.5">Posted Date</span>
                  <div className="font-semibold text-[#191c1e]">
                    {job.published_at
                      ? new Date(job.published_at).toLocaleDateString()
                      : new Date(job.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div>
                  <span className="text-[#717680] block mb-0.5">Expiry Date</span>
                  <div className="font-semibold text-[#191c1e]">
                    {job.application_deadline
                      ? new Date(job.application_deadline).toLocaleDateString()
                      : 'No hard deadline'}
                  </div>
                </div>

                <div>
                  <span className="text-[#717680] block mb-0.5">Salary Offering</span>
                  <div className="font-bold text-[#137333]">
                    {job.salary_min && job.salary_max
                      ? `$${Number(job.salary_min).toLocaleString()} - $${Number(job.salary_max).toLocaleString()} ${job.salary_currency}`
                      : 'Not specified'}
                  </div>
                </div>
              </div>
            </div>

            {/* Internal Admin Notes Widget (Figma Page 12) */}
            <div className="bg-white rounded-3xl p-6 border border-[#e5e8ec] space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-[#f0f2f5] pb-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#717680]">
                  Internal Admin Notes
                </h3>
                <span className="text-[10px] text-[#717680]">Not visible to company</span>
              </div>

              {/* Add Note Form */}
              <form onSubmit={handleAddNote} className="space-y-2.5">
                <textarea
                  rows={2}
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Add moderation note or audit comment..."
                  className="w-full px-3 py-2 rounded-xl border border-[#d5d7da] bg-[#f8f9fa] text-xs text-[#191c1e] focus:outline-hidden focus:border-[#0058be] focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={addingNote || !newNoteText.trim()}
                  className="w-full py-2 rounded-xl text-xs font-bold text-white bg-[#0058be] hover:bg-[#004ca5] disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {addingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3 h-3" />}
                  <span>Save Internal Note</span>
                </button>
              </form>

              {/* Notes List */}
              <div className="space-y-2.5 pt-2 max-h-60 overflow-y-auto">
                {notes.length === 0 ? (
                  <p className="text-[11px] text-[#717680] italic text-center py-2">
                    No internal notes logged yet.
                  </p>
                ) : (
                  notes.map((n) => (
                    <div key={n.id} className="p-3 rounded-xl bg-[#f8f9fa] border border-[#e5e8ec] space-y-1">
                      <p className="text-xs text-[#191c1e]">{n.note_text}</p>
                      <div className="flex items-center justify-between text-[10px] text-[#717680]">
                        <span>{n.added_by_name || 'Admin'}</span>
                        <span>{new Date(n.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

