import React, { useState } from 'react';
import {
  X,
  Star,
  ShieldCheck,
  CheckCircle2,
  Lock,
  AlertCircle,
  EyeOff,
  Send,
  Sparkles,
} from 'lucide-react';

export default function WriteCompanyReviewModal({ isOpen, onClose, company, onSubmitSuccess }) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [statusAtReview, setStatusAtReview] = useState('OFFER_RECEIVED');
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const ratingDescriptions = {
    1: '1.0 - Poor Experience',
    2: '2.0 - Below Expectations',
    3: '3.0 - Average Experience',
    4: '4.0 - Good Experience',
    5: '5.0 - Excellent Experience',
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reviewTitle.trim()) {
      setError('Please provide a review title.');
      return;
    }
    if (reviewText.trim().length < 30) {
      setError('Review text must be at least 30 characters.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await onSubmitSuccess({
        rating,
        review_title: reviewTitle.trim(),
        review_text: reviewText.trim(),
        is_anonymous: isAnonymous,
        eligibility_reason: statusAtReview,
      });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-[#e0e3e5] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#e0e3e5] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#e8f0fe] text-[#0058be] flex items-center justify-center font-bold text-sm">
              <Star className="w-4 h-4 fill-[#0058be]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#191c1e]">Rate Your Experience</h2>
              <p className="text-xs text-[#71787e]">
                Share your experience with {company?.name} to help the community.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#71787e] hover:bg-[#f1f4f6] rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Eligible Reviewer Callout (Figma Page 3) */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-xs text-emerald-950">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-[11px] uppercase tracking-wider text-emerald-800">
                  Eligible Reviewer
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-white/70 px-1.5 py-0.5 rounded-md">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Verified Application Record</span>
                </span>
              </div>
              <p className="text-[11px] text-emerald-900 leading-relaxed">
                Candidate eligibility confirmed for <strong>{company?.name}</strong>. Your feedback provides
                authentic insights for future applicants.
              </p>
            </div>
          </div>

          {/* Interactive Star Rating */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#191c1e]">Overall Rating</label>
              <span className="text-xs font-semibold text-[#0058be]">
                {ratingDescriptions[hoverRating || rating]}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const filled = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="p-1 text-slate-300 hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        filled ? 'text-amber-400 fill-amber-400' : 'text-slate-300'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Employment Status at Time of Review */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#191c1e]">
              Employment Status at Time of Review <span className="text-red-500">*</span>
            </label>
            <select
              value={statusAtReview}
              onChange={(e) => setStatusAtReview(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-[#c3c7cb] rounded-xl text-xs text-[#191c1e] focus:outline-none focus:border-[#0058be]"
            >
              <option value="OFFER_RECEIVED">Received Official Offer (Application / Candidate)</option>
              <option value="HIRED">Hired / Current Employee</option>
              <option value="FORMER_EMPLOYEE">Former Employee</option>
              <option value="INTERVIEWED">Interviewed Candidate</option>
            </select>
          </div>

          {/* Review Title */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-[#191c1e]">
                Review Title <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-[#71787e]">{reviewTitle.length}/100</span>
            </div>
            <input
              type="text"
              value={reviewTitle}
              onChange={(e) => setReviewTitle(e.target.value)}
              placeholder="e.g. Transparent interview loop and respectful engineering team"
              maxLength={100}
              className="w-full px-3.5 py-2.5 bg-white border border-[#c3c7cb] rounded-xl text-xs text-[#191c1e] focus:outline-none focus:border-[#0058be]"
              required
            />
          </div>

          {/* Review Text */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-[#191c1e]">
                Review Text <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-[#71787e]">
                {reviewText.length}/2,000 (Min 30 chars)
              </span>
            </div>
            <textarea
              rows={4}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Describe the recruitment interview stages, timeline transparency, and communication quality..."
              maxLength={2000}
              className="w-full px-3.5 py-2.5 bg-white border border-[#c3c7cb] rounded-xl text-xs text-[#191c1e] focus:outline-none focus:border-[#0058be] leading-relaxed"
              required
            />
          </div>

          {/* Anonymous Toggle (Figma Page 3) */}
          <div className="p-3 bg-[#f7f9fb] border border-[#e0e3e5] rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-[#0058be]" />
              <div>
                <p className="text-xs font-bold text-[#191c1e]">Post Anonymously</p>
                <p className="text-[10px] text-[#71787e]">
                  Hides your personal name and avatar. Displays as &quot;Verified Candidate&quot;.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="w-4 h-4 rounded border-[#c3c7cb] text-[#0058be] focus:ring-[#0058be] cursor-pointer"
            />
          </div>

          {/* Moderation Notice */}
          <p className="text-[11px] text-[#71787e] bg-amber-50/60 p-2.5 rounded-lg border border-amber-200/60 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Moderation Notice: Reviews are moderated to ensure constructive and respectful feedback.</span>
          </p>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#e0e3e5] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-[#41474d] hover:bg-[#f1f4f6] rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || reviewText.trim().length < 30 || !reviewTitle.trim()}
              className="px-6 py-2 bg-[#0058be] hover:bg-[#004ca5] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Submitting...' : 'Submit Review'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

