import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Mail, Phone, X } from 'lucide-react';

export default function FooterSection() {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const [demoData, setDemoData] = useState({ name: '', email: '', company: '', teamSize: '10-50' });

  const handleDemoSubmit = (e) => {
    e.preventDefault();
    setDemoSubmitted(true);
    setTimeout(() => {
      setIsDemoModalOpen(false);
      setDemoSubmitted(false);
      setDemoData({ name: '', email: '', company: '', teamSize: '10-50' });
    }, 2200);
  };

  return (
    <>
      {/* Scalloped / Curved Dark Bottom Footer */}
      <footer className="relative bg-[#000000] text-white pt-20 pb-12 mt-12 rounded-t-[3rem] lg:rounded-t-[4.5rem] overflow-hidden">
        
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-32 bg-blue-600/15 blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-8">
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white max-w-2xl mx-auto leading-tight">
            Ready to build your best team?
          </h2>

          <p className="text-sm sm:text-base text-[#d8dadc] max-w-xl mx-auto leading-relaxed">
            Join thousands of companies and professionals already using TalentBridge to connect, interview, and hire with confidence.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              to="/register?role=recruiter"
              className="inline-flex items-center justify-center bg-[#0058be] hover:bg-[#004bb0] text-white font-semibold text-sm px-7 py-3.5 rounded-[4px] shadow-lg transition-all active:scale-[0.98]"
            >
              Sign Up For Free
            </Link>
            <button
              onClick={() => setIsDemoModalOpen(true)}
              className="inline-flex items-center justify-center bg-transparent hover:bg-white/10 text-white border border-[#45464d] font-semibold text-sm px-7 py-3.5 rounded-[4px] transition-all active:scale-[0.98]"
            >
              Request a Demo
            </button>
          </div>

          {/* Micro Guarantee Note */}
          <p className="text-[11px] font-semibold tracking-widest text-[#76777d] uppercase pt-2">
            NO CREDIT CARD REQUIRED &nbsp;•&nbsp; CANCEL ANYTIME
          </p>

          {/* Divider & Simple Footer Navigation */}
          <div className="pt-16 mt-8 border-t border-[#2d3133] flex flex-col sm:flex-row items-center justify-between text-xs text-[#76777d] gap-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white tracking-tight">TalentBridge</span>
              <span>© {new Date().getFullYear()} ERMS Inc. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="#privacy" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#terms" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#security" className="hover:text-white transition-colors">Security</a>
            </div>
          </div>

        </div>
      </footer>

      {/* Request a Demo Modal */}
      {isDemoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 text-[#191c1e] shadow-2xl relative border border-[#e0e3e5]">
            <button
              onClick={() => setIsDemoModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-[#76777d] hover:bg-[#eceef0] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {demoSubmitted ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#191c1e]">Demo Scheduled!</h3>
                <p className="text-sm text-[#45464d]">
                  Our enterprise recruitment specialist will reach out within 2 hours.
                </p>
              </div>
            ) : (
              <div>
                <h3 className="text-2xl font-bold text-[#191c1e] mb-1">Schedule a Demo</h3>
                <p className="text-xs text-[#45464d] mb-6">
                  See how TalentBridge accelerates high-velocity tech and corporate hiring.
                </p>

                <form onSubmit={handleDemoSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#191c1e] mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={demoData.name}
                      onChange={(e) => setDemoData({ ...demoData, name: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-[#c6c6cd] rounded-[4px] focus:outline-none focus:border-[#0058be]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#191c1e] mb-1">Work Email</label>
                    <input
                      type="email"
                      required
                      placeholder="jane@company.com"
                      value={demoData.email}
                      onChange={(e) => setDemoData({ ...demoData, email: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-[#c6c6cd] rounded-[4px] focus:outline-none focus:border-[#0058be]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#191c1e] mb-1">Company Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Acme Corp"
                      value={demoData.company}
                      onChange={(e) => setDemoData({ ...demoData, company: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-[#c6c6cd] rounded-[4px] focus:outline-none focus:border-[#0058be]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#191c1e] mb-1">Estimated Hiring Volume</label>
                    <select
                      value={demoData.teamSize}
                      onChange={(e) => setDemoData({ ...demoData, teamSize: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-[#c6c6cd] rounded-[4px] focus:outline-none focus:border-[#0058be]"
                    >
                      <option value="1-10">1 - 10 hires/year</option>
                      <option value="10-50">10 - 50 hires/year</option>
                      <option value="50+">50+ enterprise hires/year</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#0058be] hover:bg-[#004bb0] text-white font-semibold py-2.5 rounded-[4px] text-sm shadow transition-colors mt-2"
                  >
                    Confirm Demo Booking
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
