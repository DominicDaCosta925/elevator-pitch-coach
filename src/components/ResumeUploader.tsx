"use client";
import React, { useCallback, useState } from "react";

interface ResumeUploaderProps {
  onFileUploaded: (file: File) => void;
  isProcessing?: boolean;
}

export default function ResumeUploader({ onFileUploaded, isProcessing = false }: ResumeUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const validFile = files.find(file => 
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.type === 'text/plain' ||
      file.name.endsWith('.docx') ||
      file.name.endsWith('.txt')
    );

    if (validFile) {
      setSelectedFile(validFile);
      onFileUploaded(validFile);
    } else {
      alert('Please upload a DOCX or TXT file. PDF support is temporarily disabled.');
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
    if (file) {
      setSelectedFile(file);
      onFileUploaded(file);
    }
  }, [onFileUploaded]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full">
      <div
        className={`
          relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200
          ${isDragOver 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          accept=".docx,.txt"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isProcessing}
        />
        
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          
          {selectedFile ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900">
                📄 {selectedFile.name}
              </p>
              <p className="text-xs text-gray-500">
                {formatFileSize(selectedFile.size)}
              </p>
              {!isProcessing && (
                <p className="text-xs text-green-600">
                  ✓ Ready to generate pitch
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-lg font-semibold text-gray-800">
                Upload Your Resume
              </p>
              <p className="text-gray-700">
                Drag and drop your resume here, or click to browse
              </p>
              <p className="text-sm text-gray-600">
                Supports DOCX and TXT files
              </p>
              <p className="text-xs text-orange-600 font-medium">
                📋 PDF support temporarily disabled
              </p>
            </div>
          )}
        </div>
      </div>
      
      {selectedFile && !isProcessing && (
        <button
          onClick={() => {
            setSelectedFile(null);
            // Reset file input
            const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
          }}
          className="mt-2 text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Choose different file
        </button>
      )}
    </div>
  );
}
