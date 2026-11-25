import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Cpu, BarChart3, CheckCircle, Sparkles } from 'lucide-react';
import automatedWorkflowsImg from '../assets/automated_workflows.jpg';

export default function FeaturesGrid() {
  return (
    <section className="py-20 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#191c1e] tracking-tight">
            Engineered for Clarity
          </h2>
          <p className="text-base text-[#45464d] leading-relaxed">
            We strip away the noise. Experience a recruitment platform designed around precise data, intuitive workflows, and seamless communication.
          </p>
        </div>

        {/* 4-Card Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          
          {/* Card 1: Precision and Data */}
          <div className="bg-white rounded-xl border border-[#e0e3e5] p-6 lg:p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div>
              <p className="text-xs font-semibold tracking-wider text-[#76777d] uppercase mb-1">
                Analytics Engine
              </p>
              <h3 className="text-xl font-bold text-[#191c1e] mb-2">
                Precision and Data
              </h3>
              <p className="text-sm text-[#45464d]">
                Granular candidate metrics, pipeline throughput, and time-to-hire analytics at your fingertips.
              </p>
            </div>

            {/* Stylized Bar Chart Mockup */}
            <div className="mt-8 pt-6 border-t border-[#f2f4f6]">
              <div className="h-32 flex items-end justify-between gap-3 px-4 py-2 bg-[#f7f9fb] rounded-lg border border-[#eceef0]">
                <div className="w-full flex flex-col items-center gap-2">
                  <div className="w-full bg-[#d8e2ff] rounded-t-sm h-12 transition-all hover:opacity-80" />
                  <span className="text-[10px] text-[#76777d]">Q1</span>
                </div>
                <div className="w-full flex flex-col items-center gap-2">
                  <div className="w-full bg-[#0058be] rounded-t-sm h-24 transition-all hover:opacity-80 shadow-sm" />
                  <span className="text-[10px] font-semibold text-[#0058be]">Q2</span>
                </div>
                <div className="w-full flex flex-col items-center gap-2">
                  <div className="w-full bg-[#dae2fd] rounded-t-sm h-16 transition-all hover:opacity-80" />
                  <span className="text-[10px] text-[#76777d]">Q3</span>
                </div>
                <div className="w-full flex flex-col items-center gap-2">
                  <div className="w-full bg-[#bec6e0] rounded-t-sm h-10 transition-all hover:opacity-80" />
                  <span className="text-[10px] text-[#76777d]">Q4</span>
                </div>
                <div className="w-full flex flex-col items-center gap-2">
                  <div className="w-full bg-[#131b2e] rounded-t-sm h-28 transition-all hover:opacity-80" />
                  <span className="text-[10px] font-semibold text-[#191c1e]">Now</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Matched Incoming & Skills Matrix */}
          <div className="bg-white rounded-xl border border-[#e0e3e5] p-6 lg:p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div>
              <p className="text-xs font-semibold tracking-wider text-[#76777d] uppercase mb-1">
                Candidate Fit
              </p>
              <h3 className="text-xl font-bold text-[#191c1e] mb-2">
                Matched Incoming
              </h3>
              <p className="text-sm text-[#45464d]">
                Smart semantic parsing aligns candidate proficiency directly with role technical specifications.
              </p>
            </div>

            {/* Visual Skill Badges */}
            <div className="mt-8 pt-6 border-t border-[#f2f4f6]">
              <div className="p-4 bg-[#f7f9fb] rounded-lg border border-[#eceef0] flex flex-wrap gap-2.5 items-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#d8e2ff] text-[#001a42]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0058be]" />
                  React
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#d8e2ff] text-[#001a42]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0058be]" />
                  System Design
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#d8e2ff] text-[#001a42]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0058be]" />
                  Leadership
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#f2f4f6] text-[#45464d] border border-[#e0e3e5]">
                  Python
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#f2f4f6] text-[#45464d] border border-[#e0e3e5]">
                  PostgreSQL
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: For Candidates (Vibrant Blue Card) */}
          <div className="bg-[#0058be] text-white rounded-xl p-8 lg:p-10 flex flex-col justify-between shadow-lg relative overflow-hidden group">
            {/* Background geometric accents */}
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="relative z-10 space-y-4">
              <span className="inline-block text-xs font-bold tracking-widest text-blue-200 uppercase">
                FOR CANDIDATES
              </span>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-snug">
                Your Career, Amplified.
              </h3>
              <p className="text-blue-100 text-sm sm:text-base leading-relaxed max-w-md">
                Create a rich profile once. Let top tier companies apply to you. Maintain complete privacy until you decide to connect.
              </p>
            </div>

            <div className="relative z-10 pt-8">
              <Link
                to="/register?role=candidate"
                className="inline-flex items-center gap-2 bg-white text-[#0058be] hover:bg-blue-50 font-semibold text-sm px-5 py-3 rounded-[4px] shadow transition-all active:scale-[0.98]"
              >
                Create Profile
                <ArrowUpRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </div>

          {/* Card 4: Automated Workflows with Precision Gear Image */}
          <div className="bg-white rounded-xl border border-[#e0e3e5] p-6 lg:p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
              <div className="sm:col-span-7 space-y-3">
                <div className="w-8 h-8 rounded-lg bg-[#f2f4f6] text-[#0058be] flex items-center justify-center">
                  <Cpu className="w-4 h-4" />
                </div>
                <h3 className="text-xl font-bold text-[#191c1e]">
                  Automated Workflows
                </h3>
                <p className="text-sm text-[#45464d] leading-relaxed">
                  Schedule interviews, send assessments, and collect feedback without leaving the platform.
                </p>
              </div>

              <div className="sm:col-span-5">
                <div className="relative rounded-lg overflow-hidden border border-[#e0e3e5] aspect-square shadow-inner">
                  <img
                    src={automatedWorkflowsImg}
                    alt="Precision automated engine"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-blue-900/10 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
