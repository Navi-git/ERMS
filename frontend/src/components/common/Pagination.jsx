import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Reusable Pagination component
 *
 * @param {number} currentPage - Currently active page (1-based)
 * @param {number} totalPages - Total count of pages
 * @param {number} totalItems - Total count of records
 * @param {number} pageSize - Number of records displayed per page
 * @param {function} onPageChange - Callback when a new page is clicked: (page) => void
 * @param {string} itemName - Plural label for records (e.g., 'items', 'users', 'resumes')
 */
export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  itemName = 'items',
}) {
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers array with smart ellipsis
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        start = 2;
        end = 4;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
        end = totalPages - 1;
      }

      if (start > 2) {
        pages.push('...');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="p-4 border-t border-[#e5e8ec] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#717680] bg-[#fafbfc] rounded-b-xl">
      <div className="font-medium text-[#5f6368]">
        Showing <span className="font-semibold text-[#191c1e]">{startItem}</span> to{' '}
        <span className="font-semibold text-[#191c1e]">{endItem}</span> of{' '}
        <span className="font-semibold text-[#191c1e]">{totalItems}</span> {itemName}
      </div>

      <div className="flex items-center gap-1.5">
        {/* Previous Button */}
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="p-1.5 rounded-lg border border-[#e5e8ec] bg-white text-[#191c1e] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors cursor-pointer"
          aria-label="Previous Page"
          title="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Number Buttons */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="px-2 py-1 text-slate-400 select-none">
                  ...
                </span>
              );
            }

            const isActive = p === currentPage;
            return (
              <button
                key={`page-${p}`}
                type="button"
                onClick={() => onPageChange(p)}
                className={`min-w-8 h-8 px-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#0058be] text-white border-[#0058be] shadow-xs'
                    : 'bg-white text-[#191c1e] border-[#e5e8ec] hover:bg-slate-50'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="p-1.5 rounded-lg border border-[#e5e8ec] bg-white text-[#191c1e] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors cursor-pointer"
          aria-label="Next Page"
          title="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

