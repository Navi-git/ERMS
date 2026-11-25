import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { X, Download, FileText, Loader2 } from 'lucide-react';
import { resolveMediaUrl } from '../../utils/imageUrl';

export default function AttachmentPreviewModal({ isOpen, onClose, attachment }) {
  const { accessToken } = useSelector((state) => state.auth);
  const [downloading, setDownloading] = useState(false);

  if (!isOpen || !attachment) return null;

  const token = accessToken || localStorage.getItem('erms_access_token');
  const baseResolvedUrl = resolveMediaUrl(attachment.url, token);
  const downloadUrl = resolveMediaUrl(
    attachment.url.includes('?') ? `${attachment.url}&download=1` : `${attachment.url}?download=1`,
    token
  );

  const isImage =
    attachment.mime_type?.startsWith('image/') ||
    /\.(png|jpe?g|gif|webp|svg)$/i.test(attachment.name || attachment.url);
  const isPdf =
    attachment.mime_type === 'application/pdf' ||
    /\.pdf$/i.test(attachment.name || attachment.url);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = attachment.name || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download error, falling back to window.open:', err);
      window.open(downloadUrl, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#e0e3e5] w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#e0e3e5] flex items-center justify-between bg-[#fbfcfd]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#0058be] flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h3 className="font-bold text-sm text-[#191c1e] truncate">
                {attachment.name || 'Attachment'}
              </h3>
              <p className="text-xs text-[#71787e]">
                {attachment.size ? `${(attachment.size / 1024 / 1024).toFixed(2)} MB` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="px-4 py-2 text-xs font-bold text-white bg-[#0058be] hover:bg-[#004ca5] active:scale-95 rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60"
            >
              {downloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{downloading ? 'Downloading...' : 'Download'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#71787e] hover:text-[#191c1e] hover:bg-[#f2f4f6] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-auto p-4 bg-[#f2f4f6] flex items-center justify-center min-h-[400px]">
          {isImage ? (
            <img
              src={baseResolvedUrl}
              alt={attachment.name || 'Preview'}
              className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-sm"
            />
          ) : isPdf ? (
            <div className="w-full h-[70vh] flex flex-col bg-white rounded-xl overflow-hidden border border-[#e0e3e5] shadow-xs">
              <iframe
                src={`${baseResolvedUrl}#toolbar=0`}
                title={attachment.name || 'PDF Preview'}
                className="w-full flex-1 border-0"
              />
            </div>
          ) : (
            <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-[#e0e3e5] max-w-sm">
              <FileText className="w-12 h-12 text-[#71787e] mx-auto mb-3" />
              <h4 className="font-bold text-base text-[#191c1e] mb-1">
                {attachment.name}
              </h4>
              <p className="text-xs text-[#71787e] mb-4">
                This file format cannot be previewed in-browser. Click download to view.
              </p>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0058be] text-white font-bold text-xs rounded-xl hover:bg-[#004ca5] transition-colors"
              >
                <Download className="w-4 h-4" /> Download File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
