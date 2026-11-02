import React from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  FileText,
  BarChart2,
  Award,
} from 'lucide-react';

export default function ATSAnalysisModal({ resume, onClose }) {
  const analysis = resume?.analysis;
  const score = analysis?.ats_score ?? resume?.ats_score ?? 0;

  const getScoreColor = (val) => {
    if (val >= 75) return { bg: 'bg-emerald-500', text: 'text-emerald-700', lightBg: 'bg-emerald-50', border: 'border-emerald-200' };
    if (val >= 50) return { bg: 'bg-amber-500', text: 'text-amber-700', lightBg: 'bg-amber-50', border: 'border-amber-200' };
    return { bg: 'bg-rose-500', text: 'text-rose-700', lightBg: 'bg-rose-50', border: 'border-rose-200' };
  };

  const getScoreLabel = (val) => {
    if (val >= 85) return 'Excellent ATS Optimization';
    if (val >= 70) return 'Strong Resume - High Match Rate';
    if (val >= 50) return 'Moderate - Recommended Improvements';
    return 'Needs Optimization for ATS';
  };

  const scoreTheme = getScoreColor(score);
  const resultData = analysis?.analysis_result || {};
  const sectionScores = resultData?.section_scores || {};
  const strengths = analysis?.strengths || [];
  const weaknesses = analysis?.weaknesses || [];
  const matchedKeywords = analysis?.matched_keywords || [];
  const missingKeywords = analysis?.missing_keywords || [];
  const recommendations = resultData?.recommendations || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#e0e3e5] flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0058be]/10 text-[#0058be] flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#191c1e]">ATS Resume Analysis Report</h3>
              <p className="text-xs text-[#71787e]">
                Analyzed file: <span className="font-medium text-[#191c1e]">{resume?.file_name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#71787e] hover:text-[#191c1e] hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-[#191c1e]">
          {/* Top Score Banner */}
          <div className={`p-5 rounded-xl border ${scoreTheme.border} ${scoreTheme.lightBg} flex flex-col sm:flex-row items-center justify-between gap-4`}>
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-full bg-white shadow-xs border border-slate-100 flex items-center justify-center">
                <span className={`text-2xl font-black ${scoreTheme.text}`}>{score}</span>
              </div>
              <div>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white ${scoreTheme.text} shadow-2xs`}>
                  Score: {score} / 100
                </span>
                <h4 className="text-sm font-bold text-[#191c1e] mt-1">{getScoreLabel(score)}</h4>
                <p className="text-slate-600 text-[11px]">
                  Evaluated across section formatting, keyword density, and actionable impact.
                </p>
              </div>
            </div>
          </div>

          {/* Category Scores Breakdown */}
          <div>
            <h4 className="font-bold text-sm text-[#191c1e] mb-3 flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4 text-[#0058be]" />
              Evaluation Breakdown
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <p className="text-[11px] text-slate-500 font-medium">Structure</p>
                <p className="text-base font-bold text-[#191c1e] mt-0.5">
                  {sectionScores.structure ?? 20} <span className="text-[10px] text-slate-400">/ 30</span>
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <p className="text-[11px] text-slate-500 font-medium">Keywords</p>
                <p className="text-base font-bold text-[#191c1e] mt-0.5">
                  {sectionScores.skills ?? 20} <span className="text-[10px] text-slate-400">/ 35</span>
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <p className="text-[11px] text-slate-500 font-medium">Action & Impact</p>
                <p className="text-base font-bold text-[#191c1e] mt-0.5">
                  {sectionScores.impact ?? 10} <span className="text-[10px] text-slate-400">/ 20</span>
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <p className="text-[11px] text-slate-500 font-medium">Readability</p>
                <p className="text-base font-bold text-[#191c1e] mt-0.5">
                  {sectionScores.readability ?? 10} <span className="text-[10px] text-slate-400">/ 15</span>
                </p>
              </div>
            </div>
          </div>

          {/* Strengths */}
          {strengths.length > 0 && (
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-800 mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Key ATS Strengths
              </h4>
              <ul className="space-y-1.5">
                {strengths.map((str, idx) => (
                  <li key={idx} className="flex items-start gap-2 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
                    <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                    <span className="text-emerald-900 leading-relaxed">{str}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Weaknesses / Areas for Improvement */}
          {weaknesses.length > 0 && (
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-amber-800 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Opportunities for Improvement
              </h4>
              <ul className="space-y-1.5">
                {weaknesses.map((weak, idx) => (
                  <li key={idx} className="flex items-start gap-2 bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                    <span className="text-amber-600 font-bold mt-0.5">!</span>
                    <span className="text-amber-900 leading-relaxed">{weak}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Matched Keywords */}
          {matchedKeywords.length > 0 && (
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-[#0058be]" />
                Detected Technical Keywords ({matchedKeywords.length})
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {matchedKeywords.map((kw, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 bg-blue-50 text-[#0058be] border border-blue-200 rounded-md font-medium text-[11px]"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Missing Keywords suggestions */}
          {missingKeywords.length > 0 && (
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                Consider Adding These Relevant Keywords
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {missingKeywords.map((kw, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-md font-medium text-[11px]"
                  >
                    + {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <h5 className="font-bold text-xs text-[#191c1e]">Actionable Recommendations</h5>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                {recommendations.map((rec, idx) => (
                  <li key={idx} className="leading-relaxed">{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#e0e3e5] bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-[#0058be] hover:bg-[#004ca5] text-white font-medium shadow-sm transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
