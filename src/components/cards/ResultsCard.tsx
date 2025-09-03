"use client";

import React from "react";
import { motion } from "framer-motion";
import { Copy, Check } from "lucide-react";
import type { CoachingResponse } from "@/lib/types";

interface ResultsCardProps {
  coaching?: CoachingResponse;
  polishedScript?: string;
  onCopy?: () => void;
  isCopied?: boolean;
}

export function ResultsCard({ coaching, polishedScript, onCopy, isCopied }: ResultsCardProps) {
  // Extract CTA from polished script for highlighting
  const extractCTA = (script: string) => {
    const sentences = script.split(/[.!?]+/).filter(s => s.trim());
    const lastSentence = sentences[sentences.length - 1]?.trim();
    if (lastSentence && (
      lastSentence.includes('?') || 
      lastSentence.toLowerCase().includes('connect') || 
      lastSentence.toLowerCase().includes('discuss') ||
      lastSentence.toLowerCase().includes('chat') ||
      lastSentence.toLowerCase().includes('talk') ||
      lastSentence.toLowerCase().includes('reach out') ||
      lastSentence.toLowerCase().includes('contact')
    )) {
      return lastSentence;
    }
    return null;
  };

  const renderPolishedScript = (script: string) => {
    const cta = extractCTA(script);
    if (!cta) return script;
    
    const scriptWithoutCTA = script.replace(cta, '').trim().replace(/[.!?]*$/, '');
    
    return (
      <div className="select-text">
        {scriptWithoutCTA}.{' '}
        <span className="cta-highlight">
          {cta}
        </span>
      </div>
    );
  };

  if (!coaching && !polishedScript) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: "easeOut", delay: 0.3 }}
        className="bg-card border border-border rounded-2xl p-6"
      >
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Copy className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-heading font-semibold h-heading text-card-foreground mb-2">
            No Results Yet
          </h3>
          <p className="text-sm text-muted-foreground">
            Practice your pitch to see AI coaching feedback and improvements
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut", delay: 0.3 }}
      className="bg-card border border-border rounded-2xl p-6"
    >
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-heading font-semibold h-heading text-card-foreground">
            AI Coaching Results
          </h2>
          {(coaching?.polishedScript || polishedScript) && onCopy && (
            <button
              onClick={onCopy}
              className="flex items-center gap-2 px-3 py-1.5 text-sm border border-border bg-transparent text-foreground hover:bg-secondary rounded-lg transition-colors outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            >
              {isCopied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {isCopied ? "Copied!" : "Copy"}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Overall Score */}
        {coaching?.overallScore && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-3">
              <span className="text-2xl font-bold text-primary">
                {coaching.overallScore.toFixed(1)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Overall Score</p>
          </div>
        )}

        {/* Polished Script */}
        {(coaching?.polishedScript || polishedScript) && (
          <div>
            <h3 className="text-lg font-heading font-semibold h-heading text-card-foreground mb-3">
              Polished Script
            </h3>
            <div className="p-4 bg-muted rounded-lg text-base leading-relaxed">
              {renderPolishedScript(coaching?.polishedScript || polishedScript || '')}
            </div>
          </div>
        )}

        {/* Quick Feedback */}
        {coaching && (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
                Strengths
              </h4>
              <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                {coaching.strengths?.slice(0, 2).map((strength, i) => (
                  <li key={i}>• {strength}</li>
                )) || []}
              </ul>
            </div>
            
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <h4 className="font-medium text-orange-800 dark:text-orange-200 mb-2">
                Improvements
              </h4>
              <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                {coaching.priorityImprovements?.slice(0, 2).map((improvement, i) => (
                  <li key={i}>• {improvement}</li>
                )) || []}
              </ul>
            </div>
          </div>
        )}

        {/* Mirror Back */}
        {coaching?.mirrorBack && (
          <div className="p-4 bg-primary/5 rounded-lg border-l-4 border-primary">
            <h4 className="font-medium text-primary mb-2">
              What I Heard
            </h4>
            <p className="text-sm text-muted-foreground italic">
              "{coaching.mirrorBack}"
            </p>
          </div>
        )}

        {/* Coaching Tips */}
        {coaching?.coachingTips && coaching.coachingTips.length > 0 && (
          <div>
            <h4 className="font-medium text-card-foreground mb-3">Quick Tips</h4>
            <ul className="space-y-2">
              {coaching.coachingTips.slice(0, 3).map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-accent font-bold">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </motion.div>
  );
}
