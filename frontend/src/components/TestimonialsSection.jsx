import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import sarahAvatar from '../assets/avatar_sarah.jpg';

const testimonials = [
  {
    id: 1,
    quote:
      'As a candidate, the platform felt respectful of my time. I only received interview requests from companies that genuinely matched my skills and career goals. I found my dream role in two weeks.',
    author: 'Sarah Jenkins',
    role: 'Senior Product Designer',
    avatar: sarahAvatar,
  },
  {
    id: 2,
    quote:
      'The automated verification and screening streamlined our hiring cycle by 60%. TalentBridge delivered high-caliber candidates who hit the ground running on day one.',
    author: 'Marcus Vance',
    role: 'VP of Engineering at FinScale',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&h=120&q=80',
  },
  {
    id: 3,
    quote:
      'The pipeline transparency and direct candidate messaging saved us weeks of email ping-pong. An indispensable tool for hyper-growth teams.',
    author: 'Elena Rostova',
    role: 'Head of Talent Acquisition',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=120&h=120&q=80',
  },
];

export default function TestimonialsSection() {
  const [startIndex, setStartIndex] = useState(0);

  const handlePrev = () => {
    setStartIndex((prev) => (prev === 0 ? testimonials.length - 2 : prev - 1));
  };

  const handleNext = () => {
    setStartIndex((prev) => (prev >= testimonials.length - 2 ? 0 : prev + 1));
  };

  const visibleTestimonials = [
    testimonials[startIndex % testimonials.length],
    testimonials[(startIndex + 1) % testimonials.length],
  ];

  return (
    <section className="py-20 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header with Slider Controls */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#191c1e] tracking-tight">
              Proven Success
            </h2>
            <p className="text-sm sm:text-base text-[#45464d] mt-1">
              Hear from the teams building their future with TalentBridge.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrev}
              className="w-10 h-10 rounded-full border border-[#c6c6cd] bg-white flex items-center justify-center text-[#191c1e] hover:bg-[#eceef0] transition-colors active:scale-95 shadow-sm"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="w-10 h-10 rounded-full bg-[#000000] flex items-center justify-center text-white hover:bg-[#2d3133] transition-colors active:scale-95 shadow-sm"
              aria-label="Next testimonial"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Testimonial Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {visibleTestimonials.map((item, idx) => (
            <div
              key={item.id + '-' + idx}
              className="bg-white rounded-xl border border-[#e0e3e5] p-8 sm:p-10 flex flex-col justify-between shadow-sm transition-all duration-300 hover:shadow-md"
            >
              <div className="space-y-4">
                {/* Modern Blue Quote Icon */}
                <div className="text-[#0058be] font-serif text-4xl font-black leading-none select-none">
                  “
                </div>
                <p className="text-[#191c1e] text-base sm:text-lg leading-relaxed italic">
                  "{item.quote}"
                </p>
              </div>

              {/* Author Info */}
              <div className="flex items-center gap-4 mt-8 pt-6 border-t border-[#f2f4f6]">
                <img
                  src={item.avatar}
                  alt={item.author}
                  className="w-12 h-12 rounded-full object-cover border border-[#e0e3e5]"
                />
                <div>
                  <h4 className="font-bold text-sm text-[#191c1e]">
                    {item.author}
                  </h4>
                  <p className="text-xs text-[#76777d]">
                    {item.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
