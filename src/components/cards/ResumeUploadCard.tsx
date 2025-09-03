"use client";

import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, File, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface ResumeUploadCardProps {
  onFileSelect: (file: File) => void;
  selectedFile?: File | null;
  isProcessing?: boolean;
}

export function ResumeUploadCard({ onFileSelect, selectedFile, isProcessing = false }: ResumeUploadCardProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const validFile = files.find(file => 
      file.type === 'application/pdf' ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.type === 'text/plain' ||
      file.name.endsWith('.pdf') ||
      file.name.endsWith('.docx') ||
      file.name.endsWith('.txt')
    );

    if (validFile && validFile.size <= 10 * 1024 * 1024) {
      onFileSelect(validFile);
    }
  }, [onFileSelect]);

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
    if (file && file.size <= 10 * 1024 * 1024) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const clearFile = useCallback(() => {
    onFileSelect(null as any);
  }, [onFileSelect]);

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.pdf')) return <FileText className="w-5 h-5 text-primary" />;
    if (fileName.endsWith('.docx')) return <File className="w-5 h-5 text-blue-600" />;
    return <File className="w-5 h-5 text-muted-foreground" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Upload Resume</CardTitle>
          <CardDescription>
            Upload your resume to generate a personalized elevator pitch
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedFile ? (
        <div className="border border-primary/20 rounded-lg p-4 bg-primary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getFileIcon(selectedFile.name)}
              <div>
                <p className="font-medium text-card-foreground text-sm truncate max-w-48">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(0)} KB
                </p>
              </div>
            </div>
            {!isProcessing && (
              <button
                onClick={clearFile}
                className="p-1.5 hover:bg-secondary rounded-md transition-colors outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <motion.div
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
            ${isDragOver 
              ? 'border-primary bg-primary/5 scale-[1.02]' 
              : 'border-border hover:border-primary/50 hover:bg-secondary'
            }
            ${isProcessing ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.2 }}
        >
          <input
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isProcessing}
          />
          
          <motion.div
            animate={isDragOver ? { scale: 1.1 } : { scale: 1 }}
            className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4"
          >
            <Upload className={`w-6 h-6 ${isDragOver ? 'text-primary' : 'text-primary/70'}`} />
          </motion.div>
          
          <h3 className="font-medium text-card-foreground mb-2">
            Drop your resume here
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            or{" "}
            <span className="text-primary font-medium">click to browse files</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Supports PDF, DOCX, TXT (max 10MB)
          </p>
        </motion.div>
      )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
