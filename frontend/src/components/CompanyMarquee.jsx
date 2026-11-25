import React from 'react';

const companies = [
  {
    name: 'vodafone',
    label: 'vodafone',
    svg: (
      <svg className="h-6 w-auto fill-current" viewBox="0 0 120 30">
        <circle cx="15" cy="15" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
        <path d="M12 9 C15 9, 21 14, 18 20 C15 25, 8 20, 12 15" fill="currentColor" />
        <text x="32" y="21" fontFamily="sans-serif" fontSize="18" fontWeight="bold" fill="currentColor">vodafone</text>
      </svg>
    ),
  },
  {
    name: 'intel',
    label: 'intel.',
    svg: (
      <svg className="h-7 w-auto fill-current" viewBox="0 0 90 30">
        <text x="5" y="22" fontFamily="Inter, sans-serif" fontSize="24" fontWeight="700" letterSpacing="-1px" fill="currentColor">intel.</text>
      </svg>
    ),
  },
  {
    name: 'tesla',
    label: 'TESLA',
    svg: (
      <svg className="h-5 w-auto fill-current" viewBox="0 0 110 24">
        <text x="5" y="19" fontFamily="Inter, sans-serif" fontSize="18" fontWeight="800" letterSpacing="6px" fill="currentColor">TESLA</text>
      </svg>
    ),
  },
  {
    name: 'amd',
    label: 'AMD',
    svg: (
      <svg className="h-6 w-auto fill-current" viewBox="0 0 80 26">
        <text x="2" y="21" fontFamily="Inter, sans-serif" fontSize="22" fontWeight="900" letterSpacing="1px" fill="currentColor">AMD</text>
        <path d="M60 5 L75 5 L75 20 L68 20 L68 12 L60 12 Z" fill="currentColor" />
      </svg>
    ),
  },
  {
    name: 'talkit',
    label: 'Talkit',
    svg: (
      <svg className="h-7 w-auto fill-current" viewBox="0 0 95 30">
        <text x="5" y="22" fontFamily="Inter, sans-serif" fontSize="22" fontWeight="700" fill="currentColor">Talkit</text>
        <circle cx="85" cy="18" r="4" fill="#0058be" />
      </svg>
    ),
  },
  {
    name: 'google',
    label: 'Google',
    svg: (
      <svg className="h-6 w-auto fill-current" viewBox="0 0 90 28">
        <text x="2" y="21" fontFamily="Inter, sans-serif" fontSize="21" fontWeight="600" fill="currentColor">Google</text>
      </svg>
    ),
  },
  {
    name: 'spotify',
    label: 'Spotify',
    svg: (
      <svg className="h-6 w-auto fill-current" viewBox="0 0 95 28">
        <text x="2" y="21" fontFamily="Inter, sans-serif" fontSize="21" fontWeight="700" fill="currentColor">Spotify</text>
      </svg>
    ),
  },
  {
    name: 'microsoft',
    label: 'Microsoft',
    svg: (
      <svg className="h-6 w-auto fill-current" viewBox="0 0 110 28">
        <g transform="translate(2, 6)">
          <rect x="0" y="0" width="7" height="7" fill="currentColor" />
          <rect x="8" y="0" width="7" height="7" fill="currentColor" />
          <rect x="0" y="8" width="7" height="7" fill="currentColor" />
          <rect x="8" y="8" width="7" height="7" fill="currentColor" />
        </g>
        <text x="22" y="20" fontFamily="Inter, sans-serif" fontSize="18" fontWeight="600" fill="currentColor">Microsoft</text>
      </svg>
    ),
  },
];

export default function CompanyMarquee() {
  return (
    <section className="py-12 bg-transparent overflow-hidden select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <p className="text-xs font-semibold tracking-wider text-[#76777d] uppercase text-center sm:text-left">
          Companies we helped grow
        </p>
      </div>

      {/* Marquee Track with infinite continuous scroll */}
      <div className="relative w-full overflow-hidden mask-fade">
        {/* Soft edge gradients for smooth blending */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#f7f9fb] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#f7f9fb] to-transparent z-10 pointer-events-none" />

        <div className="animate-marquee flex items-center gap-14 sm:gap-20 text-[#76777d]/80 hover:text-[#45464d] transition-colors py-2">
          {/* First set of companies */}
          {companies.map((company, index) => (
            <div
              key={`comp-1-${index}`}
              className="flex items-center opacity-70 hover:opacity-100 transition-opacity duration-200 cursor-pointer"
            >
              {company.svg}
            </div>
          ))}

          {/* Duplicate set for endless smooth looping */}
          {companies.map((company, index) => (
            <div
              key={`comp-2-${index}`}
              className="flex items-center opacity-70 hover:opacity-100 transition-opacity duration-200 cursor-pointer"
            >
              {company.svg}
            </div>
          ))}

          {/* Triplicate set to ensure seamless width on ultra-wide screens */}
          {companies.map((company, index) => (
            <div
              key={`comp-3-${index}`}
              className="flex items-center opacity-70 hover:opacity-100 transition-opacity duration-200 cursor-pointer"
            >
              {company.svg}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
