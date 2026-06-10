'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2, FileUp } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Dashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
        setStatus('idle');
        setMessage('');
      } else {
        setStatus('error');
        setMessage('Please upload a valid PDF file.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('idle');
      setMessage('');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setStatus('processing');
    setMessage('Parsing invoice data...');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setStatus('success');
        setMessage('Processing complete! Downloading your Tally Excel file...');
        setTimeout(() => {
          window.location.href = `/api/export/${data.documentId}`;
        }, 1000);
      } else {
        setStatus('error');
        setMessage('Upload failed: ' + data.error);
      }
    } catch (err) {
      setStatus('error');
      setMessage('A network error occurred while uploading.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-6 sm:p-12 font-sans overflow-hidden relative selection:bg-cyan-500/30">
      
      {/* Premium Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-3xl z-10 space-y-10"
      >
        <header className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center justify-center p-3 bg-cyan-500/10 rounded-2xl mb-4 border border-cyan-500/20"
          >
            <FileUp className="w-8 h-8 text-cyan-400" />
          </motion.div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400">
            GST to Tally Converter
          </h1>
          <p className="text-slate-400 text-lg sm:text-xl max-w-xl mx-auto font-light">
            Drop your PDF invoices here. Our deterministic engine maps your data straight to Tally Excel formats.
          </p>
        </header>

        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="bg-slate-900/40 backdrop-blur-2xl border border-white/5 rounded-3xl p-8 sm:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.4)] relative"
        >
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !file && fileInputRef.current?.click()}
            className={cn(
              "relative flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-12 transition-all duration-300 ease-in-out cursor-pointer overflow-hidden group",
              isDragActive ? "border-cyan-400 bg-cyan-950/20" : "border-slate-700/60 hover:border-cyan-500/50 hover:bg-slate-800/30",
              file && "cursor-default border-slate-700/60 hover:border-slate-700/60 hover:bg-transparent"
            )}
          >
            {/* Ambient hover glow */}
            {!file && (
              <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/0 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            )}

            <AnimatePresence mode="wait">
              {!file ? (
                <motion.div 
                  key="upload-prompt"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center text-center space-y-4 pointer-events-none"
                >
                  <div className={cn(
                    "p-4 rounded-full transition-colors duration-300",
                    isDragActive ? "bg-cyan-500/20 text-cyan-300" : "bg-slate-800 text-slate-400 group-hover:text-cyan-400"
                  )}>
                    <UploadCloud className="w-10 h-10" strokeWidth={1.5} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-medium text-slate-200">
                      {isDragActive ? "Drop PDF here" : "Click to browse or drag PDF"}
                    </p>
                    <p className="text-sm text-slate-500">
                      Supports multi-page invoices up to 500 pages
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="file-ready"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center w-full"
                >
                  <div className="flex items-center space-x-4 bg-slate-950/50 border border-slate-800 p-4 rounded-xl w-full max-w-md">
                    <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-lg">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-200 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    {status === 'idle' && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                        className="text-xs text-slate-400 hover:text-red-400 transition-colors p-2"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {/* Dynamic Action Area */}
                  <div className="mt-8 h-14 flex items-center justify-center w-full">
                    <AnimatePresence mode="wait">
                      {status === 'idle' && (
                        <motion.button
                          key="btn-upload"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                          className="px-8 py-3 w-full max-w-md bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl font-semibold shadow-lg shadow-cyan-500/25 transition-all active:scale-[0.98] flex items-center justify-center space-x-2"
                        >
                          <span>Convert to Tally Format</span>
                        </motion.button>
                      )}

                      {status === 'processing' && (
                        <motion.div
                          key="processing"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="flex flex-col items-center space-y-3"
                        >
                          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                          <p className="text-sm font-medium text-cyan-400 animate-pulse">
                            {message}
                          </p>
                        </motion.div>
                      )}

                      {status === 'success' && (
                        <motion.div
                          key="success"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex flex-col items-center space-y-2 text-emerald-400"
                        >
                          <CheckCircle2 className="w-10 h-10" />
                          <p className="text-sm font-semibold">{message}</p>
                        </motion.div>
                      )}

                      {status === 'error' && (
                        <motion.div
                          key="error"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex flex-col items-center space-y-2 text-red-400 text-center"
                        >
                          <AlertCircle className="w-8 h-8" />
                          <p className="text-sm font-semibold">{message}</p>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setStatus('idle'); }}
                            className="mt-2 text-xs underline text-red-300 hover:text-white"
                          >
                            Try Again
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                </motion.div>
              )}
            </AnimatePresence>

            <input 
              ref={fileInputRef}
              type="file" 
              className="hidden" 
              accept="application/pdf" 
              onChange={handleFileChange} 
            />
          </div>
        </motion.section>
        
        {/* Footer info for CAs */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-slate-500 text-sm flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-6"
        >
          <span className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-1 text-emerald-500/50" /> CA Ready</span>
          <span className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-1 text-emerald-500/50" /> Precise Mapping</span>
          <span className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-1 text-emerald-500/50" /> Secure Processing</span>
        </motion.div>

      </motion.div>
    </main>
  );
}
