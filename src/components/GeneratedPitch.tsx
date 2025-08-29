"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Copy, Clock, FileText, Sparkles, Loader2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GeneratedPitchProps {
  pitch: string;
  targetSeconds: number;
  isGenerating?: boolean;
  isAdjusting?: boolean;
  onPractice?: () => void;
}

export default function GeneratedPitch({ 
  pitch, 
  targetSeconds,
  isGenerating = false,
  isAdjusting = false,
  onPractice 
}: GeneratedPitchProps) {
  
  const estimateReadingTime = (text: string) => {
    const wordsPerMinute = 150; // Average speaking pace
    const wordCount = text.trim().split(/\s+/).length;
    return Math.round((wordCount / wordsPerMinute) * 60);
  };

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).length;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(pitch);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  if (isGenerating) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full p-12 border-2 border-dashed border-blue-200 rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50"
      >
        <div className="text-center space-y-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="mx-auto w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center"
          >
            <Sparkles className="w-8 h-8 text-blue-600" />
          </motion.div>
          
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-blue-900">
              Crafting Your Perfect Pitch
            </h3>
            <p className="text-blue-700 max-w-md mx-auto">
              Analyzing your resume and generating a personalized {targetSeconds}-second elevator pitch...
            </p>
            
            <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
              <motion.div
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="flex gap-1"
              >
                <div className="w-1 h-1 bg-blue-400 rounded-full" />
                <div className="w-1 h-1 bg-blue-400 rounded-full" />
                <div className="w-1 h-1 bg-blue-400 rounded-full" />
              </motion.div>
              Processing your experience
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  const actualSeconds = estimateReadingTime(pitch);
  const wordCount = getWordCount(pitch);
  const lengthDifference = Math.abs(actualSeconds - targetSeconds);
  
  const getLengthStatus = () => {
    if (lengthDifference <= 5) return { status: "excellent", text: "Perfect length", color: "green" };
    if (lengthDifference <= 10) return { status: "good", text: "Good length", color: "blue" };
    return { status: "adjust", text: "Consider adjusting", color: "amber" };
  };

  const lengthStatus = getLengthStatus();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-800">
              Your Generated Pitch
            </h3>
            <p className="text-sm text-slate-600">
              Tailored to your experience and optimized for impact
            </p>
          </div>
        </div>
        
        <AnimatePresence>
          {isAdjusting && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Adjusting length...</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pitch Content */}
      <motion.div
        layout
        className={`
          relative p-8 bg-gradient-to-br from-slate-50 to-blue-50 rounded-3xl border border-slate-200 shadow-sm
          transition-opacity duration-300
          ${isAdjusting ? 'opacity-60' : 'opacity-100'}
        `}
      >
        <AnimatePresence>
          {isAdjusting && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/70 backdrop-blur-sm rounded-3xl flex items-center justify-center z-10"
            >
              <div className="text-center space-y-2">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                <p className="text-sm text-slate-600">Updating your pitch...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="prose prose-slate max-w-none">
          <p className="text-slate-800 leading-relaxed text-lg whitespace-pre-wrap">
            {pitch}
          </p>
        </div>
      </motion.div>

      {/* Stats and Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stats */}
        <div className="space-y-4">
          <h4 className="font-medium text-slate-800">Pitch Statistics</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-white rounded-xl border border-slate-200">
              <Clock className="w-5 h-5 text-slate-600 mx-auto mb-1" />
              <div className="text-lg font-semibold text-slate-800">~{actualSeconds}s</div>
              <div className="text-xs text-slate-600">Duration</div>
            </div>
            
            <div className="text-center p-3 bg-white rounded-xl border border-slate-200">
              <FileText className="w-5 h-5 text-slate-600 mx-auto mb-1" />
              <div className="text-lg font-semibold text-slate-800">{wordCount}</div>
              <div className="text-xs text-slate-600">Words</div>
            </div>
            
            <div className="text-center p-3 bg-white rounded-xl border border-slate-200">
              <div className={`w-5 h-5 mx-auto mb-1 flex items-center justify-center`}>
                {lengthStatus.status === "excellent" ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : lengthStatus.status === "good" ? (
                  <Check className="w-5 h-5 text-blue-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                )}
              </div>
              <div className={`text-sm font-medium ${
                lengthStatus.color === "green" ? "text-green-700" :
                lengthStatus.color === "blue" ? "text-blue-700" :
                "text-amber-700"
              }`}>
                {lengthStatus.text}
              </div>
              <div className="text-xs text-slate-600">vs {targetSeconds}s target</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <h4 className="font-medium text-slate-800">Next Steps</h4>
          <div className="space-y-3">
            {onPractice && (
              <Button
                onClick={onPractice}
                disabled={isAdjusting}
                className="w-full justify-start"
                size="lg"
              >
                <Mic className="w-5 h-5 mr-3" />
                Practice This Pitch
              </Button>
            )}
            
            <Button
              onClick={copyToClipboard}
              disabled={isAdjusting}
              variant="outline"
              className="w-full justify-start"
              size="lg"
            >
              <Copy className="w-5 h-5 mr-3" />
              Copy to Clipboard
            </Button>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800 mb-1">Pro Tip</p>
                <p className="text-xs text-blue-700">
                  Practice your pitch with the recorder below to get AI-powered feedback on your delivery, timing, and presentation style.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quality Indicators */}
      <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-200">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            lengthStatus.color === "green" ? "bg-green-500" :
            lengthStatus.color === "blue" ? "bg-blue-500" :
            "bg-amber-500"
          }`} />
          <span className="text-sm text-slate-600">
            {lengthStatus.text}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-sm text-slate-600">AI-Generated</span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
          <span className="text-sm text-slate-600">Personalized</span>
        </div>
      </div>
    </motion.div>
  );
}