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
  Save,
  Send,
  Eye,
} from 'lucide-react';
import RecruiterLayout from '../../layouts/RecruiterLayout';
import interviewApi from '../../api/interviewApi';
import { useToast } from '../../context/ToastContext';

export default function RecruiterScorecardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useSelector((state) => state.auth);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [interview, setInterview] = useState(null);

  // Proxy Mode State
  const [isProxyMode, setIsProxyMode] = useState(false);
  const [selectedPanelistId, setSelectedPanelistId] = useState('');

  // Criteria State
  const [recommendation, setRecommendation] = useState('yes');
  const [competencies, setCompetencies] = useState([
    {
      criterion_key: 'system_design',
      criterion_label: 'Technical System Design & Architecture',
      criterion_description: 'Ability to design distributed design systems, token architecture, and governance.',
      score: 5,
      benchmark_level: 'Exceeds Expectations',
    },
    {
      criterion_key: 'product_sense',
      criterion_label: 'Product Sense & UX Architecture',
      criterion_description: 'Balancing enterprise workflow constraints with candidate empathy and clear information hierarchy.',
      score: 4,
      benchmark_level: 'Meets Expectations',
    },
    {
      criterion_key: 'communication',
      criterion_label: 'Cross-functional Communication',
      criterion_description: 'Articulating technical tradeoffs concisely to engineering leads, product directors, and clients.',
      score: 5,
      benchmark_level: 'Exceeds Expectations',
    },
    {
      criterion_key: 'problem_solving',
      criterion_label: 'Problem Solving & Live Critique',
      criterion_description: 'Handling curveball design scenarios and defending principled trade-offs under scrutiny.',
      score: 4,
      benchmark_level: 'Meets Expectations',
    },
  ]);

  // Qualitative Assessment
  const [strengthsComments, setStrengthsComments] = useState(
    'Demonstrated exceptional intuition regarding multi-tenant design tokens and runtime theme injection. Walked through the migration plan with clear risk mitigation milestones and high empathy for developer friction.'
  );
  const [growthAreas, setGrowthAreas] = useState(
    'Would benefit from deeper hands-on exposure to edge CDN caching for iconography pipelines, though she acknowledged this and explained how she collaborates with SRE partners.'
  );
  const [internalNotes, setInternalNotes] = useState(
    'Communicated via phone debrief that candidate is in top 5% of external design architects evaluated this year. Ready for Executive Offer Review pending final budget alignment.'
  );

  useEffect(() => {
    fetchInterviewDetail();
  }, [id]);

  const fetchInterviewDetail = async () => {
    try {
      setLoading(true);
      const res = await interviewApi.getRecruiterInterviewDetail(id);
      const data = res.data?.interview || res.data;
      setInterview(data);

      // Check if there are external panelists
      const ext = data?.participants?.find((p) => p.external_email || p.user_id !== user?.id);
      if (ext) {
        setSelectedPanelistId(ext.id);
      }
    } catch (err) {
      showToast('Failed to load interview for evaluation.', 'error');
      navigate('/recruiter/interviews');
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (index, newScore) => {
    const updated = [...competencies];
    updated[index].score = newScore;
    setCompetencies(updated);
  };

  const calculateOverallScore = () => {
    const scores = competencies.map((c) => c.score);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return Math.round(avg * 10) / 10;
  };

  const handleSubmitScorecard = async () => {
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

      await interviewApi.submitScorecard(id, payload);
      showToast('Scorecard submitted and candidate evaluation recorded!', 'success');
      navigate(`/recruiter/interviews`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit scorecard.';
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
  const overallAvg = calculateOverallScore();
  const selectedPanelist = interview?.participants?.find((p) => p.id === Number(selectedPanelistId));

  const recOptions = [
    { key: 'strong_no', label: 'Strong No', sub: 'Major blockers', icon: ThumbsDown, color: 'hover:border-rose-300 active:bg-rose-50' },
    { key: 'no', label: 'No', sub: 'Does not meet bar', icon: ThumbsDown, color: 'hover:border-rose-200' },
    { key: 'neutral', label: 'Neutral', sub: 'Borderline case', icon: Minus, color: 'hover:border-amber-200' },
    { key: 'yes', label: 'Yes', sub: 'Meets expectations', icon: ThumbsUp, color: 'hover:border-emerald-200' },
    { key: 'strong_yes', label: 'Strong Yes', sub: 'Exceeds standard', icon: Award, color: 'hover:border-blue-300 active:bg-blue-50' },
  ];

  return (
    <RecruiterLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-20">
        {/* Breadcrumb & Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-500 font-semibold">
            <Link to="/recruiter/interviews" className="hover:text-gray-900 transition-colors">
              Interviews
            </Link>
            <span>/</span>
            <span className="text-gray-700">{candidate?.full_name || 'Candidate'}</span>
            <span>/</span>
            <span className="text-[#0058be] font-bold">Evaluation Scorecard</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Interview Evaluation & Scorecard</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Record comprehensive feedback, rubric competencies, and hiring recommendation.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                Scorecard Draft #SC-{interview?.id}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-[#0058be] border border-blue-100 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Host: {user?.full_name || 'Sarah Jenkins'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Candidate Banner Card */}
        <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-black text-lg shadow-sm">
              {candidate?.full_name?.charAt(0) || 'C'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">{candidate?.full_name}</h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-blue-50 text-[#0058be]">
                  Active Candidate
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                Role Applied: <span className="font-semibold text-gray-900">{job?.title}</span> • {job?.department || 'Engineering'}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {interview?.interview_type_display} • {interview?.duration_minutes} mins (Completed)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-gray-400">Rubric Rating</span>
              <div className="flex items-center gap-1 text-sm font-black text-gray-900">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>{overallAvg} / 5.0</span>
              </div>
            </div>
            <Link
              to={`/recruiter/applications/${interview?.application_id}`}
              className="px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
            >
              <span>View Profile</span>
              <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
            </Link>
          </div>
        </div>

        {/* External Interviewer Attribution (Proxy Mode) Card */}
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

          {/* Conditional Proxy Mode Body */}
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
                    <span className="font-semibold">{user?.full_name || 'Sarah Jenkins'}</span> and tagged across streams as:{' '}
                    <span className="font-bold">
                      "Feedback from {user?.full_name || 'Sarah Jenkins'}, on behalf of{' '}
                      {selectedPanelist?.display_name || 'External Panelist'}"
                    </span>
                  </p>
                </div>
              </div>

              {/* Timeline Display Preview */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/70 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-gray-500 font-semibold">
                  <span className="uppercase tracking-wider flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> Timeline Display Preview
                  </span>
                  <span className="text-emerald-600 font-bold">Live Render</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900">
                      Feedback from {user?.full_name} on behalf of: {selectedPanelist?.display_name || 'Mark Chen (External)'}
                    </span>
                    <span className="text-xs font-bold text-[#0058be] capitalize">{recommendation.replace('_', ' ')}</span>
                  </div>
                  <p className="text-[11px] text-gray-600 italic">"{strengthsComments.slice(0, 110)}..."</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Criteria 01: Overall Hiring Recommendation */}
        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">EVALUATION CRITERIA 01</span>
            <h3 className="text-base font-bold text-gray-900 mt-0.5">Overall Hiring Recommendation</h3>
          </div>

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
                  <span
                    className={`text-[10px] font-medium ${
                      isSelected ? 'text-white/80' : 'text-gray-400'
                    }`}
                  >
                    {opt.sub}
                  </span>
                </button>
              );
            })}
          </div>
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
                  <h4 className="text-xs font-bold text-gray-900">{comp.criterion_label}</h4>
                  <p className="text-[11px] text-gray-500 leading-relaxed">{comp.criterion_description}</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
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

          <div className="space-y-4">
            {/* Strengths */}
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Strengths & Key Technical Highlights (Markdown Supported)
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
        </div>

        {/* Sticky Action Footer */}
        <div className="sticky bottom-4 z-20 p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-gray-200 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Evaluation draft ready for review</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/recruiter/interviews')}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Cancel / Exit
            </button>
            <button
              type="button"
              onClick={handleSubmitScorecard}
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-[#0058be] hover:bg-[#004ca5] text-white font-bold text-xs transition-colors shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <span>Submitting Scorecard...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Scorecard</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </RecruiterLayout>
  );
}
