import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, MoreHorizontal, CheckCircle2 } from 'lucide-react';
import heroOfficeImg from '../assets/hero_office_team.jpg';

export default function HeroSection() {
  return (
    <section className="relative pt-8 pb-16 md:pt-16 md:pb-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Headline & Calls to Action */}
          <div className="lg:col-span-7 flex flex-col items-start space-y-6">
            
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e6e8ea] border border-[#d8dadc] text-[11px] font-semibold tracking-wider text-[#45464d] uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0058be]" />
              NEXT-GEN RECRUITMENT
            </div>

            {/* Display Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-bold text-[#191c1e] tracking-tight leading-[1.12]">
              Connecting <br />
              <span className="relative inline-block text-[#0058be]">
                World-Class Talent
                {/* Subtle curved underline accent */}
                <svg
                  className="absolute -bottom-1 left-0 w-full h-3 text-[#0058be]/40"
                  viewBox="0 0 300 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M2.5 8.5C85 2 215 2 297.5 8.5"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>{' '}
              <br />
              with Industry Leaders
            </h1>

            {/* Body Description */}
            <p className="text-base sm:text-lg text-[#45464d] leading-relaxed max-w-xl">
              TalentBridge accelerates the hiring process through intelligent matching, transparent pipelines, and data-driven insights. Built for ambitious candidates and scaling enterprises.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/login?role=candidate"
                className="inline-flex items-center justify-center gap-2 bg-[#000000] text-white hover:bg-[#1e1e1e] px-6 py-3.5 rounded-[4px] text-sm font-semibold transition-all hover:shadow-md active:scale-[0.98]"
              >
                Candidate Sign In
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </Link>
              <Link
                to="/register?role=candidate"
                className="inline-flex items-center justify-center bg-white text-[#191c1e] border border-[#c6c6cd] hover:bg-[#eceef0] px-6 py-3.5 rounded-[4px] text-sm font-semibold transition-all hover:border-[#76777d] active:scale-[0.98]"
              >
                Candidate SignUp
              </Link>
            </div>

            {/* Social Proof */}
            <div className="flex items-center gap-3 pt-4">
              <div className="flex -space-x-2 overflow-hidden">
                <img
                  className="inline-block h-8 w-8 rounded-full ring-2 ring-[#f7f9fb] object-cover"
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&h=80&q=80"
                  alt="Candidate user"
                />
                <img
                  className="inline-block h-8 w-8 rounded-full ring-2 ring-[#f7f9fb] object-cover"
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&h=80&q=80"
                  alt="Candidate user"
                />
                <img
                  className="inline-block h-8 w-8 rounded-full ring-2 ring-[#f7f9fb] object-cover"
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&h=80&q=80"
                  alt="Candidate user"
                />
              </div>
              <p className="text-xs sm:text-sm text-[#45464d]">
                <strong className="text-[#191c1e] font-semibold">+10k</strong> Trusted by over 10,000 professionals worldwide.
              </p>
            </div>

          </div>

          {/* Right Column: Hero Visual with Layered Floating Cards */}
          <div className="lg:col-span-5 relative mt-6 lg:mt-0">
            
            {/* Background Image Container */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-[#d8dadc]/60 aspect-[4/3] sm:aspect-[16/11]">
              <img
                src={heroOfficeImg}
                alt="Modern collaborative enterprise team"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* Floating Card 1: Top Right "Candidate Matched" */}
            <div className="absolute -top-6 -right-2 sm:-right-6 bg-white/95 backdrop-blur-md border border-[#e0e3e5] rounded-xl p-4 shadow-[0_12px_24px_rgba(15,23,42,0.12)] w-64 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#2170e4]/10 text-[#0058be] flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-[#191c1e] truncate">
                    Candidate Matched
                  </h4>
                  <p className="text-[11px] text-[#76777d] truncate">
                    Senior Frontend Engineer
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between items-center text-[11px] mb-1">
                  <span className="text-[#76777d]">Skill Compatibility</span>
                  <span className="font-bold text-[#0058be]">85% Match</span>
                </div>
                <div className="w-full h-1.5 bg-[#eceef0] rounded-full overflow-hidden">
                  <div className="w-[85%] h-full bg-[#0058be] rounded-full" />
                </div>
              </div>
            </div>

            {/* Floating Card 2: Bottom Left "Active Pipeline" */}
            <div className="absolute -bottom-8 -left-2 sm:-left-6 bg-white/95 backdrop-blur-md border border-[#e0e3e5] rounded-xl p-4 shadow-[0_16px_32px_rgba(15,23,42,0.14)] w-60">
              <div className="flex items-center justify-between pb-2 border-b border-[#f2f4f6]">
                <span className="text-xs font-semibold text-[#191c1e]">Active Pipeline</span>
                <MoreHorizontal className="w-4 h-4 text-[#76777d]" />
              </div>
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#0058be]" />
                    <span className="text-[#45464d]">Interview Stage</span>
                  </div>
                  <span className="font-bold text-[#191c1e]">24</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#76777d]" />
                    <span className="text-[#45464d]">Offers Extended</span>
                  </div>
                  <span className="font-bold text-[#191c1e]">8</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
