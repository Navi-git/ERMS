import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ArrowLeft,
  Star,
  ThumbsDown,
  Minus,
  ThumbsUp,
  Award,
  ShieldCheck,
  CheckCircle2,
  Lock,
  UserCheck,
  Sparkles,
  ExternalLink,
  Send,
  Eye,
  Edit3,
  Calendar,
  Clock,
  RotateCcw,
} from 'lucide-react';
import RecruiterLayout from '../../layouts/RecruiterLayout';
import interviewApi from '../../api/interviewApi';
import { useToast } from '../../context/ToastContext';

const DEFAULT_COMPETENCIES = [
  {
    criterion_key: 'system_design',
    criterion_label: 'Technical System Design & Architecture',
    criterion_description: 'Ability to design distributed systems, core architectural patterns, and scalability.',
    score: 4,
    benchmark_level: 'Meets Expectations',
  },
  {
    criterion_key: 'product_sense',
    criterion_label: 'Product Sense & Workflow Architecture',
    criterion_description: 'Balancing enterprise constraints with user empathy and clear information hierarchy.',
    score: 4,
    benchmark_level: 'Meets Expectations',
  },
  {
    criterion_key: 'communication',
    criterion_label: 'Cross-functional Communication',
    criterion_description: 'Articulating technical tradeoffs concisely to engineering leads, stakeholders, and clients.',
    score: 4,
    benchmark_level: 'Meets Expectations',
  },
  {
    criterion_key: 'problem_solving',
    criterion_label: 'Problem Solving & Live Critique',
    criterion_description: 'Handling curveball design scenarios and defending principled trade-offs under scrutiny.',
    score: 4,
    benchmark_level: 'Meets Expectations',
  },
];

export default function RecruiterScorecardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useSelector((state) => state.auth);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [interview, setInterview] = useState(null);

  // Scorecard Mode States
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [existingFeedback, setExistingFeedback] = useState(null);

  // Proxy Mode State
  const [isProxyMode, setIsProxyMode] = useState(false);
  const [selectedPanelistId, setSelectedPanelistId] = useState('');

  // Criteria State
  const [recommendation, setRecommendation] = useState('yes');
  const [competencies, setCompetencies] = useState(DEFAULT_COMPETENCIES);

  // Qualitative Assessment
  const [strengthsComments, setStrengthsComments] = useState('');
  const [growthAreas, setGrowthAreas] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  const populateFeedbackData = (fb) => {
    setExistingFeedback(fb);
    setIsSubmitted(true);
    setIsEditMode(false);
    setRecommendation(fb.recommendation || 'yes');
    setStrengthsComments(fb.comments || '');
    setGrowthAreas(fb.growth_areas || '');
    setInternalNotes(fb.internal_notes || '');

    if (fb.on_behalf_of_participant) {
      setIsProxyMode(true);
      setSelectedPanelistId(String(fb.on_behalf_of_participant));
    } else {
      setIsProxyMode(false);
    }

    if (fb.criteria_ratings && fb.criteria_ratings.length > 0) {
      setCompetencies(
        fb.criteria_ratings.map((c) => ({
          criterion_key: c.criterion_key,
          criterion_label: c.criterion_label,
          criterion_description: c.criterion_description || '',
          benchmark_level: c.benchmark_level || '',
          score: c.score,
          max_score: c.max_score || 5,
        }))
      );
    }
  };

  const fetchInterviewDetail = async () => {
    try {
      setLoading(true);
      const res = await interviewApi.getRecruiterInterviewDetail(id);
      const data = res.data?.interview || res.data;
      setInterview(data);

      const fb = data?.feedbacks && data.feedbacks.length > 0 ? data.feedbacks[0] : null;
      if (fb) {
        populateFeedbackData(fb);
      } else {
        setIsSubmitted(false);
        setIsEditMode(true);
        setExistingFeedback(null);
        setRecommendation('yes');
        setStrengthsComments('');
        setGrowthAreas('');
        setInternalNotes('');
        setCompetencies(DEFAULT_COMPETENCIES);

        const ext = data?.participants?.find((p) => p.external_email || p.user_id !== user?.id);
        if (ext) {
          setSelectedPanelistId(String(ext.id));
        }
      }
    } catch {
      showToast('Failed to load interview for evaluation.', 'error');
      navigate('/recruiter/interviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviewDetail();
  }, [id]);

  const handleScoreChange = (index, newScore) => {
    const updated = [...competencies];
    updated[index].score = newScore;
    setCompetencies(updated);
  };

  const calculateOverallScore = () => {
    const scores = competencies.map((c) => c.score);
    if (!scores.length) return 4.0;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return Math.round(avg * 10) / 10;
  };

  const handleSubmitOrUpdateScorecard = async () => {
    if (!recommendation) {
      showToast('Please select an overall hiring recommendation.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        recommendation,
        overall_score: calculateOverallScore(),
        rating: Math.round(calculateOverallScore()),
        comments: strengthsComments.trim(),
        growth_areas: growthAreas.trim(),
        internal_notes: internalNotes.trim(),
        on_behalf_of_participant_id: isProxyMode && selectedPanelistId ? Number(selectedPanelistId) : null,
        criteria_ratings: competencies.map((c) => ({
          criterion_key: c.criterion_key,
          criterion_label: c.criterion_label,
          criterion_description: c.criterion_description,
          benchmark_level: c.benchmark_level,
          score: c.score,
          max_score: 5,
        })),
      };

      if (isSubmitted) {
        const res = await interviewApi.updateScorecard(id, payload);
        const updated = res.data?.feedback;
        if (updated) {
          populateFeedbackData(updated, interview);
        } else {
          setIsEditMode(false);
          await fetchInterviewDetail();
        }
        showToast('Scorecard updated successfully!', 'success');
      } else {
        const res = await interviewApi.submitScorecard(id, payload);
        const created = res.data?.feedback;
        if (created) {
          populateFeedbackData(created, interview);
        } else {
          setIsSubmitted(true);
          setIsEditMode(false);
          await fetchInterviewDetail();
        }
        showToast('Scorecard submitted and recorded successfully!', 'success');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save scorecard.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <RecruiterLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-[#0058be] border-t-transparent rounded-full animate-spin" />
        </div>
      </RecruiterLayout>
    );
  }

  const candidate = interview?.candidate;
  const job = interview?.job;
  const overallAvg = isSubmitted && existingFeedback?.overall_score ? existingFeedback.overall_score : calculateOverallScore();
  const selectedPanelist = interview?.participants?.find((p) => p.id === Number(selectedPanelistId));

  const recOptions = [
    { key: 'strong_no', label: 'Strong No', sub: 'Major blockers', icon: ThumbsDown, color: 'hover:border-rose-300 active:bg-rose-50', bgSelected: 'bg-rose-600 text-white border-rose-600' },
    { key: 'no', label: 'No', sub: 'Does not meet bar', icon: ThumbsDown, color: 'hover:border-rose-200', bgSelected: 'bg-rose-500 text-white border-rose-500' },
    { key: 'neutral', label: 'Neutral', sub: 'Borderline case', icon: Minus, color: 'hover:border-amber-200', bgSelected: 'bg-amber-600 text-white border-amber-600' },
    { key: 'yes', label: 'Yes', sub: 'Meets expectations', icon: ThumbsUp, color: 'hover:border-emerald-200', bgSelected: 'bg-emerald-600 text-white border-emerald-600' },
    { key: 'strong_yes', label: 'Strong Yes', sub: 'Exceeds standard', icon: Award, color: 'hover:border-blue-300 active:bg-blue-50', bgSelected: 'bg-[#0058be] text-white border-[#0058be]' },
  ];

  const currentRecObj = recOptions.find((r) => r.key === (isSubmitted && !isEditMode ? existingFeedback?.recommendation || recommendation : recommendation)) || recOptions[3];

  return (
    <RecruiterLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-24">
        {/* Breadcrumb & Navigation */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-500 font-semibold">
            <Link to="/recruiter/interviews" className="hover:text-gray-900 transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Interviews Dashboard</span>
            </Link>
            <span>/</span>
            <span className="text-gray-700">{candidate?.full_name || 'Candidate'}</span>
            <span>/</span>
            <span className="text-[#0058be] font-bold">
              {isSubmitted ? 'Saved Scorecard' : 'Evaluation Scorecard'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                  {isSubmitted && !isEditMode
                    ? 'Candidate Evaluation Scorecard'
                    : isSubmitted && isEditMode
                    ? 'Edit Scorecard Evaluation'
                    : 'Interview Evaluation & Scorecard'}
                </h1>
                {isSubmitted && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified & Saved
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {isSubmitted && !isEditMode
                  ? 'Official evaluation results recorded for this interview round. Visible to hiring committee.'
                  : 'Record comprehensive feedback, rubric competencies, and hiring recommendation.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isSubmitted && !isEditMode ? (
                <button
                  type="button"
                  onClick={() => setIsEditMode(true)}
                  className="px-4 py-2 rounded-xl bg-[#0058be] hover:bg-[#004ca5] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Scorecard</span>
                </button>
              ) : isSubmitted && isEditMode ? (
                <button
                  type="button"
                  onClick={() => {
                    if (existingFeedback) populateFeedbackData(existingFeedback, interview);
                    setIsEditMode(false);
                  }}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Cancel Editing</span>
                </button>
              ) : null}

              <Link
                to={`/recruiter/applications/${interview?.application_id}`}
                className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <span>Application Dossier</span>
                <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
              </Link>
            </div>
          </div>
        </div>

        {/* Edit Mode Alert Banner */}
        {isSubmitted && isEditMode && (
          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-[#0058be]" />
              <span>
                <strong>Editing Mode:</strong> You are modifying an already submitted evaluation. Click <strong>"Save Changes"</strong> below when finished to update the record.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (existingFeedback) populateFeedbackData(existingFeedback, interview);
                setIsEditMode(false);
              }}
              className="text-[#0058be] font-bold hover:underline cursor-pointer"
            >
              Discard changes
            </button>
          </div>
        )}

        {/* Candidate & Interview Overview Card */}
        <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-black text-lg shadow-sm">
              {candidate?.full_name?.charAt(0) || 'C'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">{candidate?.full_name}</h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-blue-50 text-[#0058be]">
                  Candidate Profile
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                Role Applied: <span className="font-semibold text-gray-900">{job?.title}</span> • {job?.department || 'Engineering'}
              </p>
              <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-gray-400" />
                  {interview?.scheduled_at ? new Date(interview.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Scheduled'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-gray-400" />
                  {interview?.interview_type_display} ({interview?.duration_minutes}m)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-gray-400">Scorecard Rubric Score</span>
              <div className="flex items-center justify-end gap-1 text-base font-black text-gray-900">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>{overallAvg} / 5.0</span>
              </div>
            </div>

            <div className="text-right border-l border-gray-200 pl-4">
              <span className="text-[10px] uppercase font-bold text-gray-400">Recommendation</span>
              <div>
                <span
                  className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                    currentRecObj.key.includes('yes')
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : currentRecObj.key.includes('no')
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {currentRecObj.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Attribution Card */}
        {isSubmitted && !isEditMode ? (
          <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0058be] flex items-center justify-center font-bold">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-gray-900">
                  Author: {existingFeedback?.submitted_by_name || user?.full_name}
                  {existingFeedback?.on_behalf_of_name && (
                    <span className="ml-2 font-normal text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      (Proxy Mode: on behalf of {existingFeedback.on_behalf_of_name})
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-gray-500">
                  Recorded on {existingFeedback?.submitted_at ? new Date(existingFeedback.submitted_at).toLocaleString() : 'N/A'} • Authenticated Evaluator
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-gray-100 text-gray-600">
                Official Roster Record
              </span>
            </div>
          </div>
        ) : (
          /* External Interviewer Attribution (Proxy Mode) Card during Edit/Create */
          <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0058be] flex items-center justify-center font-bold">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">External Interviewer Attribution</h3>
                  <p className="text-xs text-gray-500">
                    Record evaluation notes provided by an external panelist or partner without a TalentBridge account.
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-600">
                  {isProxyMode ? 'Proxy Mode Active' : 'Proxy Mode Off'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsProxyMode(!isProxyMode)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                    isProxyMode ? 'bg-[#0058be]' : 'bg-gray-200'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      isProxyMode ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {isProxyMode && (
              <div className="space-y-4 pt-2 animate-in fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Select External Panelist / Author
                    </label>
                    <select
                      value={selectedPanelistId}
                      onChange={(e) => setSelectedPanelistId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be] bg-white cursor-pointer"
                    >
                      {interview?.participants
                        ?.filter((p) => p.participant_type === 'interviewer')
                        ?.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.display_name} ({p.external_email || p.email || 'Panelist'})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100 flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-[#0058be] shrink-0 mt-0.5" />
                    <p className="text-[11px] text-blue-900 leading-relaxed">
                      <span className="font-bold">Audit Attribution Notice:</span> This scorecard will be authored by{' '}
                      <span className="font-semibold">{user?.full_name || 'Recruiter'}</span> and attributed on behalf of{' '}
                      <span className="font-bold">{selectedPanelist?.display_name || 'External Panelist'}</span>.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Criteria 01: Overall Hiring Recommendation */}
        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">EVALUATION CRITERIA 01</span>
              <h3 className="text-base font-bold text-gray-900 mt-0.5">Overall Hiring Recommendation</h3>
            </div>
            {isSubmitted && !isEditMode && (
              <span className="text-xs font-bold text-gray-500">Submitted Recommendation</span>
            )}
          </div>

          {isSubmitted && !isEditMode ? (
            /* Read-only recommendation display */
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {recOptions.map((opt) => {
                const isChosen = recommendation === opt.key;
                const IconComp = opt.icon;
                return (
                  <div
                    key={opt.key}
                    className={`p-4 rounded-2xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all ${
                      isChosen
                        ? `${opt.bgSelected} shadow-md ring-2 ring-offset-2 ring-blue-500`
                        : 'bg-gray-50/60 text-gray-400 border-gray-200 opacity-60'
                    }`}
                  >
                    <IconComp className="w-5 h-5 mb-0.5" />
                    <span className="text-xs font-bold">{opt.label}</span>
                    <span className={`text-[10px] ${isChosen ? 'text-white/90' : 'text-gray-400'}`}>
                      {opt.sub}
                    </span>
                    {isChosen && (
                      <span className="mt-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/20 text-white">
                        Selected
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Interactive recommendation selector */
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {recOptions.map((opt) => {
                const isSelected = recommendation === opt.key;
                const IconComp = opt.icon;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setRecommendation(opt.key)}
                    className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                      isSelected
                        ? opt.key.includes('yes')
                          ? 'bg-[#0058be] text-white border-[#0058be] shadow-md ring-2 ring-[#0058be]/20'
                          : opt.key.includes('no')
                          ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-600/20'
                          : 'bg-amber-600 text-white border-amber-600 shadow-md'
                        : `bg-white text-gray-700 border-gray-200 ${opt.color}`
                    }`}
                  >
                    <IconComp className="w-5 h-5 mb-0.5" />
                    <span className="text-xs font-bold">{opt.label}</span>
                    <span className={`text-[10px] font-medium ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                      {opt.sub}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Criteria 02: Technical & Behavioral Competencies */}
        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">EVALUATION CRITERIA 02</span>
              <h3 className="text-base font-bold text-gray-900 mt-0.5">Technical & Behavioral Competencies</h3>
            </div>
            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              Benchmark Level: Senior / Lead (L5-L6)
            </span>
          </div>

          <div className="divide-y divide-gray-100 space-y-4">
            {competencies.map((comp, idx) => (
              <div key={comp.criterion_key} className="pt-4 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5 max-w-xl">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-gray-900">{comp.criterion_label}</h4>
                    {comp.benchmark_level && (
                      <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {comp.benchmark_level}
                      </span>
                    )}
                  </div>
                  {comp.criterion_description && (
                    <p className="text-[11px] text-gray-500 leading-relaxed">{comp.criterion_description}</p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isSubmitted && !isEditMode ? (
                    /* Read only stars */
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((starVal) => (
                        <Star
                          key={starVal}
                          className={`w-4 h-4 ${
                            starVal <= comp.score ? 'text-amber-400 fill-amber-400' : 'text-gray-200'
                          }`}
                        />
                      ))}
                      <span className="text-xs font-black text-gray-900 ml-2 w-8 text-right">
                        {comp.score} / 5
                      </span>
                    </div>
                  ) : (
                    /* Interactive stars */
                    <>
                      {[1, 2, 3, 4, 5].map((starVal) => (
                        <button
                          key={starVal}
                          type="button"
                          onClick={() => handleScoreChange(idx, starVal)}
                          className="p-1 rounded-md hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Star
                            className={`w-5 h-5 ${
                              starVal <= comp.score
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-gray-200 hover:text-amber-300'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="text-xs font-black text-gray-900 ml-2 w-6 text-right">
                        {comp.score}/5
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Criteria 03: Detailed Qualitative Assessment */}
        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-5">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">EVALUATION CRITERIA 03</span>
            <h3 className="text-base font-bold text-gray-900 mt-0.5">Detailed Qualitative Assessment</h3>
          </div>

          {isSubmitted && !isEditMode ? (
            /* Read-only qualitative view */
            <div className="space-y-4">
              {/* Strengths */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Strengths & Key Technical Highlights
                </span>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/80 text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {strengthsComments || 'No specific strengths recorded.'}
                </div>
              </div>

              {/* Growth Areas */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <Minus className="w-3.5 h-3.5 text-amber-500" />
                  Areas for Growth / Specific Watchouts
                </span>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/80 text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {growthAreas || 'No specific growth areas recorded.'}
                </div>
              </div>

              {/* Internal Notes */}
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Internal Hiring Team Notes (Recruiter Eyes Only - Confidential)</span>
                </div>
                <p className="text-xs text-amber-900 leading-relaxed whitespace-pre-wrap">
                  {internalNotes || 'No internal team notes recorded.'}
                </p>
              </div>
            </div>
          ) : (
            /* Interactive textareas */
            <div className="space-y-4">
              {/* Strengths */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Strengths & Key Technical Highlights
                </label>
                <textarea
                  rows={3}
                  value={strengthsComments}
                  onChange={(e) => setStrengthsComments(e.target.value)}
                  placeholder="Highlight specific technical strengths, architectural depth, communication clarity..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be] leading-relaxed resize-none"
                />
              </div>

              {/* Growth Areas */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1.5 flex items-center gap-1.5">
                  <Minus className="w-3.5 h-3.5 text-amber-500" />
                  Areas for Growth / Specific Watchouts
                </label>
                <textarea
                  rows={2}
                  value={growthAreas}
                  onChange={(e) => setGrowthAreas(e.target.value)}
                  placeholder="Where does the candidate need onboarding ramp-up or further technical depth?"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be] leading-relaxed resize-none"
                />
              </div>

              {/* Internal Notes */}
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/30 space-y-1.5">
                <label className="block text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  Internal Hiring Team Notes (Recruiter Eyes Only - Hidden from Candidate)
                </label>
                <textarea
                  rows={2}
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Notes for debrief committee, compensation calibration, or executive offer review..."
                  className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-white text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none leading-relaxed"
                />
              </div>
            </div>
          )}
        </div>

        {/* Sticky Action Footer */}
        <div className="sticky bottom-4 z-20 p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-gray-200 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {isSubmitted && !isEditMode ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-gray-700">Official evaluation filed</span>
              </>
            ) : isSubmitted && isEditMode ? (
              <>
                <Edit3 className="w-4 h-4 text-[#0058be]" />
                <span className="font-semibold text-gray-700">Modifying saved scorecard</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Evaluation draft ready for submission</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {isSubmitted && !isEditMode ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/recruiter/interviews')}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Back to Interviews
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditMode(true)}
                  className="px-6 py-2.5 rounded-xl bg-[#0058be] hover:bg-[#004ca5] text-white font-bold text-xs transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Scorecard</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (isSubmitted) {
                      if (existingFeedback) populateFeedbackData(existingFeedback, interview);
                      setIsEditMode(false);
                    } else {
                      navigate('/recruiter/interviews');
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  {isSubmitted ? 'Cancel' : 'Cancel / Exit'}
                </button>
                <button
                  type="button"
                  onClick={handleSubmitOrUpdateScorecard}
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-[#0058be] hover:bg-[#004ca5] text-white font-bold text-xs transition-colors shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <span>Saving Scorecard...</span>
                  ) : isSubmitted ? (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Scorecard</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </RecruiterLayout>
  );
}
