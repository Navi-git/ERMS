import React from 'react';
import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import CompanyMarquee from '../components/CompanyMarquee';
import FeaturesGrid from '../components/FeaturesGrid';
import RecruiterBanner from '../components/RecruiterBanner';
import TestimonialsSection from '../components/TestimonialsSection';
import FooterSection from '../components/FooterSection';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f7f9fb] flex flex-col justify-between selection:bg-[#0058be] selection:text-white">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <CompanyMarquee />
        <FeaturesGrid />
        <RecruiterBanner />
        <TestimonialsSection />
      </main>
      <FooterSection />
    </div>
  );
}
