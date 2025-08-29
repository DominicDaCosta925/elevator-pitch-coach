"use client";

import React, { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, File, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResumeUploaderProps {
  onFileUploaded: (file: File) => void;
  isProcessing?: boolean;
}

export default function ResumeUploader({ onFileUploaded, isProcessing = false }: ResumeUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    setUploadError(null);
    
    const files = Array.from(e.dataTransfer.files);
    const validFile = files.find(file => 
      file.type === 'application/pdf' ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.type === 'text/plain' ||
      file.name.endsWith('.pdf') ||
      file.name.endsWith('.docx') ||
      file.name.endsWith('.txt')
    );

    if (validFile) {
      if (validFile.size > 10 * 1024 * 1024) { // 10MB limit
        setUploadError('File too large. Please upload a file smaller than 10MB.');
        return;
      }
      setSelectedFile(validFile);
      onFileUploaded(validFile);
    } else {
      setUploadError('Please upload a PDF, DOCX, or TXT file.');
    }
  }, [onFileUploaded]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError(null);
    
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setUploadError('File too large. Please upload a file smaller than 10MB.');
        return;
      }
      setSelectedFile(file);
      onFileUploaded(file);
    }
  }, [onFileUploaded]);

  const removeFile = useCallback(() => {
    setSelectedFile(null);
    setUploadError(null);
  }, []);

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.pdf')) return <FileText className="w-6 h-6 text-red-500" />;
    if (fileName.endsWith('.docx')) return <File className="w-6 h-6 text-blue-500" />;
    if (fileName.endsWith('.txt')) return <File className="w-6 h-6 text-gray-500" />;
    return <File className="w-6 h-6 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`
          relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 cursor-pointer
          ${isDragOver 
            ? 'border-blue-400 bg-blue-50 scale-[1.02]' 
            : selectedFile 
            ? 'border-green-300 bg-green-50' 
            : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100'
          }
          ${isProcessing ? 'pointer-events-none opacity-60' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isProcessing}
        />
        
        <AnimatePresence mode="wait">
          {selectedFile ? (
            <motion.div
              key="selected"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                {getFileIcon(selectedFile.name)}
                <div>
                  <p className="font-medium text-slate-800 truncate max-w-xs">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                ) : (
                  <>
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile();
                      }}
                      className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center hover:bg-red-200 transition-colors"
                    >
                      <X className="w-4 h-4 text-red-600" />
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center space-y-4"
            >
              <motion.div
                animate={isDragOver ? { scale: 1.1 } : { scale: 1 }}
                className={`
                  mx-auto w-16 h-16 rounded-2xl flex items-center justify-center transition-colors
                  ${isDragOver ? 'bg-blue-100' : 'bg-slate-100'}
                `}
              >
                <Upload className={`w-8 h-8 ${isDragOver ? 'text-blue-600' : 'text-slate-600'}`} />
              </motion.div>
              
              <div>
                <p className="text-lg font-medium text-slate-800 mb-2">
                  Upload Your Resume
                </p>
                <p className="text-slate-600 mb-2">
                  Drag and drop your resume here, or click to browse
                </p>
                <p className="text-sm text-slate-500">
                  Supports PDF, DOCX, and TXT files (max 10MB)
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Error Display */}
      <AnimatePresence>
        {uploadError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 border border-red-200 rounded-xl p-4"
          >
            <div className="flex items-center gap-2">
              <X className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-red-700 text-sm">{uploadError}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Processing Indicator */}
      <AnimatePresence>
        {isProcessing && selectedFile && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-blue-50 border border-blue-200 rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
              <div>
                <p className="text-blue-800 font-medium">Processing your resume...</p>
                <p className="text-blue-600 text-sm">This may take a few moments</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File Type Info */}
      <div className="text-center">
        <p className="text-xs text-slate-500">
          Supported formats: PDF for formatted documents, DOCX for Word documents, TXT for plain text
        </p>
      </div>
    </div>
  );
}