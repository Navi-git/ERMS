import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRight, ArrowLeft } from 'lucide-react';

export default function AppliedSuccessModal({ isOpen, onClose, job, application }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const jobTitle = job?.job_title || 'Position';
  const companyName = job?.company?.name || 'Company';

  const handleViewStatus = () => {
    onClose();
    if (application?.id) {
      navigate(`/candidate/applications/${application.id}`);
    } else {
      navigate('/candidate/applications');
    }
  };

  const handleReturnDashboard = () => {
    onClose();
    navigate('/dashboard');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[#e0e3e5] relative text-center">
        {/* Success Icon */}
        <div className="w-16 h-16 rounded-full bg-[#0058be] text-white flex items-center justify-center mx-auto mb-5 shadow-sm">
          <Check className="w-8 h-8 stroke-[3]" />
        </div>

        {/* Title */}
        <h3 className="text-2xl font-black text-[#191c1e] tracking-tight mb-2">
          Application Submitted Successfully!
        </h3>

        {/* Description */}
        <p className="text-sm text-[#41474d] leading-relaxed mb-6">
          Your application for <span className="font-bold text-[#191c1e]">{jobTitle}</span> at{' '}
          <span className="font-bold text-[#191c1e]">{companyName}</span> has been received. Our team will review your profile and get back to you soon.
        </p>

        {/* Next Steps Box (Figma Page 3) */}
        <div className="bg-[#f7f9fb] border border-[#e0e3e5] rounded-2xl p-4 text-left mb-6 space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#71787e] block">
            Next Steps
          </span>
          <div className="space-y-2 text-xs text-[#41474d]">
            <div className="flex items-start gap-2.5">
              <span className="font-bold text-[#0058be]">1</span>
              <span>Recruiter reviews your resume and portfolio.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="font-bold text-[#0058be]">2</span>
              <span>You'll receive an email notification if shortlisted.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="font-bold text-[#0058be]">3</span>
              <span>Track your status anytime in <span className="font-semibold text-[#191c1e]">My Applications</span>.</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleViewStatus}
            className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-[#0058be] hover:bg-[#004ca5] shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>View Application Status</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleReturnDashboard}
            className="w-full py-3 px-4 rounded-xl font-semibold text-xs text-[#41474d] hover:bg-[#f1f4f6] hover:text-[#191c1e] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return To Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
}

