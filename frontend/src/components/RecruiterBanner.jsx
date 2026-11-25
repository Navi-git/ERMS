import React from 'react';
import { Link } from 'react-router-dom';
import { Users, FileText, CheckCircle, BarChart2, Briefcase } from 'lucide-react';

export default function RecruiterBanner() {
  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-[#3143e8] to-[#1e2fb8] rounded-2xl p-8 sm:p-12 lg:p-16 text-white shadow-2xl relative overflow-hidden">
          
          {/* Subtle background glow */}
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
            
            {/* Left Content */}
            <div className="lg:col-span-5 space-y-6">
              <span className="inline-block text-xs font-bold tracking-widest text-blue-200 uppercase">
                ENTERPRISE HIRING
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Start posting <br className="hidden sm:inline" />
                jobs today
              </h2>
              <p className="text-blue-100 text-base sm:text-lg">
                Scale your technical and executive teams with verified candidates. Zero friction, instant pipeline.
              </p>
              
              <div className="pt-2">
                <Link
                  to="/register?role=recruiter"
                  className="inline-flex items-center justify-center bg-white text-[#1e2fb8] hover:bg-blue-50 font-bold text-sm sm:text-base px-8 py-3.5 rounded-[4px] shadow-lg transition-all hover:shadow-xl active:scale-[0.98]"
                >
                  Sign Up For Free
                </Link>
                <p className="text-xs text-blue-200 mt-2">
                  No credit card required • Start screening applicants today
                </p>
              </div>
            </div>

            {/* Right: Crisp Recruiter Dashboard Mockup */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-xl shadow-2xl border border-white/20 p-5 sm:p-6 text-[#191c1e] transform lg:rotate-1 hover:rotate-0 transition-transform duration-300">
                
                {/* Mockup App Bar */}
                <div className="flex items-center justify-between pb-4 border-b border-[#eceef0] mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-[#0058be] text-white flex items-center justify-center font-bold text-xs">
                      TB
                    </div>
                    <span className="text-xs font-semibold text-[#191c1e]">Good morning, Maria</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 text-[11px] font-semibold bg-[#d8e2ff] text-[#001a42] rounded-full">
                      Hiring Manager
                    </span>
                    <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden">
                      <img
                        src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=60&h=60&q=80"
                        alt="Maria avatar"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>

                {/* Metric Cards Row */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="bg-[#f7f9fb] p-3 rounded-lg border border-[#e0e3e5]">
                    <span className="text-[10px] text-[#76777d] block">Total Candidates</span>
                    <span className="text-xl font-bold text-[#191c1e]">21,457</span>
                  </div>
                  <div className="bg-[#f7f9fb] p-3 rounded-lg border border-[#e0e3e5]">
                    <span className="text-[10px] text-[#76777d] block">Applicants</span>
                    <span className="text-xl font-bold text-[#0058be]">15</span>
                  </div>
                  <div className="bg-[#f7f9fb] p-3 rounded-lg border border-[#e0e3e5]">
                    <span className="text-[10px] text-[#76777d] block">Shortlisted</span>
                    <span className="text-xl font-bold text-emerald-600">8</span>
                  </div>
                </div>

                {/* Applicants Pipeline Preview */}
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-[#76777d] uppercase tracking-wider mb-1">
                    Recent Applicants
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#f7f9fb] border border-[#eceef0] text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-[#0058be] font-bold flex items-center justify-center text-[10px]">
                        DL
                      </div>
                      <div>
                        <div className="font-semibold text-[#191c1e]">David Lee</div>
                        <div className="text-[10px] text-[#76777d]">Staff Cloud Architect</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-[#0058be]">
                      Interview
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#f7f9fb] border border-[#eceef0] text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[10px]">
                        AW
                      </div>
                      <div>
                        <div className="font-semibold text-[#191c1e]">Alice Wong</div>
                        <div className="text-[10px] text-[#76777d]">Senior Full Stack Developer</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                      Offer Extended
                    </span>
                  </div>
                </div>

              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
