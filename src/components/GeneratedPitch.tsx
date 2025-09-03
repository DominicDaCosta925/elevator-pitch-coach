"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Copy, Clock, FileText, Sparkles, Loader2, Check, AlertCircle } from "lucide-react";


interface GeneratedPitchProps {
  pitch: string;
  targetSeconds: number;
  isGenerating?: boolean;
  isAdjusting?: boolean;
  onPractice?: () => void;
  onLengthChange?: (length: number) => void;
  currentLength?: number;
  onLengthUpdate?: (length: number) => void;
}

export default function GeneratedPitch({ 
  pitch, 
  targetSeconds,
  isGenerating = false,
  isAdjusting = false,
  onPractice,
  onLengthChange,
  currentLength,
  onLengthUpdate
}: GeneratedPitchProps) {
  const [isCopied, setIsCopied] = React.useState(false);
  
  const estimateReadingTime = (text: string) => {
    const wordsPerMinute = 150;
    const wordCount = text.trim().split(/\s+/).length;
    return Math.round((wordCount / wordsPerMinute) * 60);
  };

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).length;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(pitch);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = pitch;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy failed: ', fallbackErr);
      }
    }
  };

  if (isGenerating) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full p-12 border-2 border-dashed border-primary/20 rounded-3xl bg-primary/5"
      >
        <div className="text-center space-y-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
          >
            <Sparkles className="w-8 h-8 text-primary" />
          </motion.div>
          
          <div className="space-y-3">
            <h3 className="text-xl font-semibold">
              Crafting Your Perfect Pitch
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Analyzing your resume and generating a personalized {targetSeconds}-second elevator pitch...
            </p>
            
            <div className="flex items-center justify-center gap-2 text-sm text-primary">
              <motion.div
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="flex gap-1"
              >
                <div className="w-1 h-1 bg-primary rounded-full" />
                <div className="w-1 h-1 bg-primary rounded-full" />
                <div className="w-1 h-1 bg-primary rounded-full" />
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
    if (lengthDifference <= 5) return { status: "excellent", text: "Perfect length", color: "emerald" };
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
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-semibold">
              Your Generated Pitch
            </h3>
            <p className="text-sm text-muted-foreground">
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
              className="flex items-center gap-2 text-sm text-primary bg-primary/10 px-3 py-2 rounded-lg"
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
          relative p-8 bg-card border rounded-3xl shadow-sm
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
              className="absolute inset-0 bg-background/70 backdrop-blur-sm rounded-3xl flex items-center justify-center z-10"
            >
              <div className="text-center space-y-2">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                <p className="text-sm text-muted-foreground">Updating your pitch...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="prose prose-sm max-w-none">
          <p className="text-foreground leading-relaxed text-lg whitespace-pre-wrap">
            {pitch}
          </p>
        </div>
      </motion.div>



      {/* Stats and Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stats */}
        <div className="space-y-4">
          <h4 className="font-medium">Pitch Statistics</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-card border rounded-xl">
              <Clock className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
              <div className="text-lg font-semibold">~{actualSeconds}s</div>
              <div className="text-xs text-muted-foreground">Duration</div>
            </div>
            
            <div className="text-center p-3 bg-card border rounded-xl">
              <FileText className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
              <div className="text-lg font-semibold">{wordCount}</div>
              <div className="text-xs text-muted-foreground">Words</div>
            </div>
            
            <div className="text-center p-3 bg-card border rounded-xl">
              <div className={`w-5 h-5 mx-auto mb-1 flex items-center justify-center`}>
                {lengthStatus.status === "excellent" ? (
                  <Check className="w-5 h-5 text-emerald-600" />
                ) : lengthStatus.status === "good" ? (
                  <Check className="w-5 h-5 text-blue-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                )}
              </div>
              <div className={`text-sm font-medium ${
                lengthStatus.color === "emerald" ? "text-emerald-600 dark:text-emerald-400" :
                lengthStatus.color === "blue" ? "text-blue-600 dark:text-blue-400" :
                "text-amber-600 dark:text-amber-400"
              }`}>
                {lengthStatus.text}
              </div>
              <div className="text-xs text-muted-foreground">vs {targetSeconds}s target</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <h4 className="font-medium">Next Steps</h4>
          <div className="space-y-3">
            {onPractice && (
              <button
                onClick={onPractice}
                disabled={isAdjusting}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                <Mic className="w-5 h-5" />
                Practice This Pitch
              </button>
            )}
            
            <button
              onClick={copyToClipboard}
              disabled={isAdjusting}
              className={`w-full border px-4 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 ${
                isCopied 
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400' 
                  : 'border-border bg-card hover:bg-accent text-foreground'
              }`}
            >
              <motion.div
                animate={isCopied ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                {isCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </motion.div>
              {isCopied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
          </div>
          
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-primary mb-1">Pro Tip</p>
                <p className="text-xs text-primary/80">
                  Practice your pitch with the recorder below to get AI-powered feedback on your delivery, timing, and presentation style.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quality Indicators */}
      <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            lengthStatus.color === "emerald" ? "bg-emerald-500" :
            lengthStatus.color === "blue" ? "bg-blue-500" :
            "bg-amber-500"
          }`} />
          <span className="text-sm text-muted-foreground">
            {lengthStatus.text}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-sm text-muted-foreground">AI-Generated</span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-sm text-muted-foreground">Personalized</span>
        </div>
      </div>
    </motion.div>
  );
}