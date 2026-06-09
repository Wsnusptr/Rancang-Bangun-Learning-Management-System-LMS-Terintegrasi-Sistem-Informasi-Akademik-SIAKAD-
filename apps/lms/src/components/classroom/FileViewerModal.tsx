import React, { useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';

interface FileViewerModalProps {
  url: string;
  name: string;
  type: string; // 'file', 'link', etc.
  onClose: () => void;
}

export default function FileViewerModal({ url, name, type, onClose }: FileViewerModalProps) {
  // Handle escape key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const isImage = name.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) != null;
  const isPdf = name.match(/\.(pdf)$/i) != null;
  const isDoc = name.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/i) != null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4 md:p-8" onClick={onClose}>
      <div 
        className="bg-[#121B2E] w-full max-w-6xl h-full max-h-[90vh] flex flex-col rounded-xl shadow-2xl border border-slate-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-3 min-w-0">
            <h3 className="text-white font-bold truncate text-sm">{name}</h3>
          </div>
          <div className="flex items-center gap-2">
            <a 
              href={url} 
              target="_blank" 
              rel="noreferrer"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Buka di tab baru"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-slate-950 flex items-center justify-center">
          {isImage ? (
            <div className="p-4 w-full h-full flex items-center justify-center">
              <img src={url} alt={name} className="max-w-full max-h-full object-contain rounded" />
            </div>
          ) : isPdf ? (
            <iframe src={`${url}#view=FitH`} className="w-full h-full rounded bg-white" title={name} />
          ) : isDoc ? (
            <iframe src={`https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`} className="w-full h-full rounded bg-white" title={name} />
          ) : type === 'link' ? (
             <div className="text-center p-8">
               <p className="text-slate-300 mb-4 text-sm">Tautan: {url}</p>
               <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
                 Buka Tautan <ExternalLink className="w-4 h-4" />
               </a>
             </div>
          ) : (
            <iframe src={url} className="w-full h-full rounded bg-white" title={name} />
          )}
        </div>
      </div>
    </div>
  );
}
