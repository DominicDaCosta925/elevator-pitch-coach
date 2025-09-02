"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  BarChart3, 
  Clock, 
  Zap, 
  Target, 
  Award, 
  Users, 
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Lightbulb,
  MessageSquare
} from "lucide-react";
import type { Metrics } from "@/lib/types";

interface CoachingResponse {
  overallScore: number;
  personalNote?: string;
  executivePresence: { 
    score: number; 
    feedback: string; 
    improvement: string; 
    encouragement?: string;
  };
  strategicPositioning: { 
    score: number; 
    feedback: string; 
    improvement: string; 
    marketInsight?: string;
  };
  credibilityBuilding: { 
    score: number; 
    feedback: string; 
    improvement: string; 
    strengthsToLeverage?: string;
  };
  audienceEngagement: { 
    score: number; 
    feedback: string; 
    improvement: string; 
    callToActionStrategy?: string;
  };
  strengths: string[];
  priorityImprovements: string[];
  polishedScript: string;
  aboutRewrite: string;
  coachingTips: string[];
  nextSteps: string[];
  personalizedInsights?: string[];
  confidenceBuilders?: string[];
  actionPlan?: {
    immediate: string[];
    shortTerm: string[];
    strategic: string[];
  };
  coachingNotes?: string;
}

interface EnhancedScoreCardProps {
  metrics: Metrics;
  coaching: CoachingResponse;
}

function ScoreCircle({ score, label, color = "primary" }: { score: number; label: string; color?: string }) {
  const percentage = (score / 10) * 100;
  const circumference = 2 * Math.PI * 40;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (score >= 8) return "text-emerald-500";
    if (score >= 6) return "text-blue-500";
    if (score >= 4) return "text-amber-500";
    return "text-red-500";
  };

  const getStrokeColor = () => {
    if (score >= 8) return "stroke-emerald-500";
    if (score >= 6) return "stroke-blue-500";
    if (score >= 4) return "stroke-amber-500";
    return "stroke-red-500";
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="hsl(var(--muted))"
            strokeWidth="8"
            fill="transparent"
          />
          <motion.circle
            cx="50"
            cy="50"
            r="40"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={getStrokeColor()}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xl font-bold ${getColor()}`}>
            {score.toFixed(1)}
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">{label}</p>
      </div>
    </div>
  );
}

function OverallScoreDisplay({ score }: { score: number }) {
  const getScoreColor = () => {
    if (score >= 8) return "from-emerald-500 to-emerald-600";
    if (score >= 6) return "from-blue-500 to-blue-600";
    if (score >= 4) return "from-amber-500 to-amber-600";
    return "from-red-500 to-red-600";
  };

  const getScoreLabel = () => {
    if (score >= 8.5) return "Executive Level";
    if (score >= 7) return "Senior Professional";
    if (score >= 5.5) return "Developing Professional";
    if (score >= 4) return "Early Career";
    return "Needs Development";
  };

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="bg-card border rounded-2xl p-8 text-center"
    >
      <div className="relative w-32 h-32 mx-auto mb-6">
        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="hsl(var(--muted))"
            strokeWidth="6"
            fill="transparent"
          />
          <motion.circle
            cx="50"
            cy="50"
            r="40"
            strokeWidth="6"
            fill="transparent"
            strokeDasharray={2 * Math.PI * 40}
            strokeDashoffset={2 * Math.PI * 40 * (1 - score / 10)}
            strokeLinecap="round"
            className={`bg-gradient-to-r ${getScoreColor()}`}
            style={{
              stroke: `url(#gradient-${score})`,
            }}
            initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - score / 10) }}
            transition={{ duration: 2, ease: "easeOut" }}
          />
          <defs>
            <linearGradient id={`gradient-${score}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={score >= 8 ? "#10b981" : score >= 6 ? "#3b82f6" : score >= 4 ? "#f59e0b" : "#ef4444"} />
              <stop offset="100%" stopColor={score >= 8 ? "#059669" : score >= 6 ? "#2563eb" : score >= 4 ? "#d97706" : "#dc2626"} />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground">{score.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">/ 10</div>
          </div>
        </div>
      </div>
      <h3 className="text-xl font-semibold mb-2">Overall Coaching Score</h3>
      <p className="text-primary font-medium">{getScoreLabel()}</p>
    </motion.div>
  );
}

export default function EnhancedScoreCard({ metrics, coaching }: EnhancedScoreCardProps) {
  return (
    <div className="space-y-8">
      {/* Personal Coaching Note */}
      {coaching.personalNote && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-6"
        >
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-primary mb-2">Personal Note from Your Coach</h3>
              <p className="text-foreground leading-relaxed">{coaching.personalNote}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Overall Score */}
      <OverallScoreDisplay score={coaching.overallScore} />

      {/* Coaching Dimensions */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="bg-card border rounded-2xl p-6"
      >
        <h3 className="text-lg font-semibold mb-6 flex items-center">
          <Target className="w-5 h-5 mr-2 text-primary" />
          Executive Coaching Assessment
        </h3>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <ScoreCircle 
            score={coaching.executivePresence.score} 
            label="Executive Presence" 
          />
          <ScoreCircle 
            score={coaching.strategicPositioning.score} 
            label="Strategic Positioning" 
          />
          <ScoreCircle 
            score={coaching.credibilityBuilding.score} 
            label="Credibility Building" 
          />
          <ScoreCircle 
            score={coaching.audienceEngagement.score} 
            label="Audience Engagement" 
          />
        </div>

        {/* Detailed Feedback */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
              <h4 className="font-medium text-emerald-600 dark:text-emerald-400 mb-2 flex items-center">
                <Award className="w-4 h-4 mr-2" />
                Executive Presence ({coaching.executivePresence.score}/10)
              </h4>
              <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-2">
                {coaching.executivePresence.feedback}
              </p>
              {coaching.executivePresence.encouragement && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-2 font-medium">
                  {coaching.executivePresence.encouragement}
                </p>
              )}
              <p className="text-xs text-emerald-600 dark:text-emerald-400 italic">
                <strong>Focus:</strong> {coaching.executivePresence.improvement}
              </p>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-2 flex items-center">
                <TrendingUp className="w-4 h-4 mr-2" />
                Strategic Positioning ({coaching.strategicPositioning.score}/10)
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                {coaching.strategicPositioning.feedback}
              </p>
              {coaching.strategicPositioning.marketInsight && (
                <p className="text-sm text-blue-600 dark:text-blue-400 mb-2 font-medium">
                  <strong>Market Insight:</strong> {coaching.strategicPositioning.marketInsight}
                </p>
              )}
              <p className="text-xs text-blue-600 dark:text-blue-400 italic">
                <strong>Focus:</strong> {coaching.strategicPositioning.improvement}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
              <h4 className="font-medium text-purple-600 dark:text-purple-400 mb-2 flex items-center">
                <CheckCircle className="w-4 h-4 mr-2" />
                Credibility Building ({coaching.credibilityBuilding.score}/10)
              </h4>
              <p className="text-sm text-purple-700 dark:text-purple-300 mb-2">
                {coaching.credibilityBuilding.feedback}
              </p>
              {coaching.credibilityBuilding.strengthsToLeverage && (
                <p className="text-sm text-purple-600 dark:text-purple-400 mb-2 font-medium">
                  <strong>Leverage:</strong> {coaching.credibilityBuilding.strengthsToLeverage}
                </p>
              )}
              <p className="text-xs text-purple-600 dark:text-purple-400 italic">
                <strong>Focus:</strong> {coaching.credibilityBuilding.improvement}
              </p>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
              <h4 className="font-medium text-amber-600 dark:text-amber-400 mb-2 flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Audience Engagement ({coaching.audienceEngagement.score}/10)
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
                {coaching.audienceEngagement.feedback}
              </p>
              {coaching.audienceEngagement.callToActionStrategy && (
                <p className="text-sm text-amber-600 dark:text-amber-400 mb-2 font-medium">
                  <strong>Strategy:</strong> {coaching.audienceEngagement.callToActionStrategy}
                </p>
              )}
              <p className="text-xs text-amber-600 dark:text-amber-400 italic">
                <strong>Focus:</strong> {coaching.audienceEngagement.improvement}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Technical Performance Metrics */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="bg-card border rounded-2xl p-6"
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-primary" />
          Technical Performance
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <Clock className="w-6 h-6 mx-auto mb-2 text-blue-500" />
            <div className="text-2xl font-bold text-foreground">{metrics.durationSec}s</div>
            <div className="text-sm text-muted-foreground">Duration</div>
          </div>
          
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <Zap className="w-6 h-6 mx-auto mb-2 text-green-500" />
            <div className="text-2xl font-bold text-foreground">{metrics.wordsPerMinute}</div>
            <div className="text-sm text-muted-foreground">Words/Min</div>
          </div>
          
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <Target className="w-6 h-6 mx-auto mb-2 text-amber-500" />
            <div className="text-2xl font-bold text-foreground">{metrics.fillerCount}</div>
            <div className="text-sm text-muted-foreground">Filler Words</div>
          </div>
          
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <BarChart3 className="w-6 h-6 mx-auto mb-2 text-purple-500" />
            <div className="text-2xl font-bold text-foreground">{metrics.readability}</div>
            <div className="text-sm text-muted-foreground">Readability</div>
          </div>
        </div>
      </motion.div>

      {/* Personalized Insights */}
      {coaching.personalizedInsights && coaching.personalizedInsights.length > 0 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="bg-card border rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Lightbulb className="w-5 h-5 mr-2 text-primary" />
            Personalized Strategic Insights
          </h3>
          
          <div className="space-y-4">
            {coaching.personalizedInsights.map((insight, index) => (
              <div key={index} className="flex items-start space-x-3 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Lightbulb className="w-4 h-4 text-primary" />
                </div>
                <p className="text-sm text-foreground leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Confidence Builders */}
      {coaching.confidenceBuilders && coaching.confidenceBuilders.length > 0 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="bg-card border rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Award className="w-5 h-5 mr-2 text-emerald-500" />
            Your Strengths & Confidence Builders
          </h3>
          
          <div className="space-y-3">
            {coaching.confidenceBuilders.map((builder, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-sm text-emerald-700 dark:text-emerald-300">{builder}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Action Plan */}
      {coaching.actionPlan && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="bg-card border rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold mb-6 flex items-center">
            <Target className="w-5 h-5 mr-2 text-primary" />
            Your Personalized Action Plan
          </h3>
          
          <div className="grid md:grid-cols-3 gap-6">
            {coaching.actionPlan.immediate && coaching.actionPlan.immediate.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-red-600 dark:text-red-400 flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  This Week
                </h4>
                {coaching.actionPlan.immediate.map((action, index) => (
                  <div key={index} className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-sm text-red-700 dark:text-red-300">{action}</p>
                  </div>
                ))}
              </div>
            )}

            {coaching.actionPlan.shortTerm && coaching.actionPlan.shortTerm.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-blue-600 dark:text-blue-400 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Next Month
                </h4>
                {coaching.actionPlan.shortTerm.map((action, index) => (
                  <div key={index} className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">{action}</p>
                  </div>
                ))}
              </div>
            )}

            {coaching.actionPlan.strategic && coaching.actionPlan.strategic.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-purple-600 dark:text-purple-400 flex items-center">
                  <Target className="w-4 h-4 mr-2" />
                  Next Quarter
                </h4>
                {coaching.actionPlan.strategic.map((action, index) => (
                  <div key={index} className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <p className="text-sm text-purple-700 dark:text-purple-300">{action}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Coaching Tips (Legacy) */}
      {coaching.coachingTips && coaching.coachingTips.length > 0 && !coaching.personalizedInsights && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="bg-card border rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Lightbulb className="w-5 h-5 mr-2 text-primary" />
            Executive Coaching Tips
          </h3>
          
          <div className="space-y-3">
            {coaching.coachingTips.map((tip, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-primary/5 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-primary">{index + 1}</span>
                </div>
                <p className="text-sm text-foreground">{tip}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Legacy Next Steps - only show if no action plan */}
      {coaching.nextSteps && coaching.nextSteps.length > 0 && !coaching.actionPlan && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="bg-card border rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <ArrowRight className="w-5 h-5 mr-2 text-primary" />
            Recommended Next Steps
          </h3>
          
          <div className="space-y-3">
            {coaching.nextSteps.map((step, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-secondary-foreground">{index + 1}</span>
                </div>
                <p className="text-sm text-foreground">{step}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Final Coaching Notes */}
      {coaching.coachingNotes && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-2xl p-6"
        >
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-emerald-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Award className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 mb-3">Final Thoughts from Your Coach</h3>
              <p className="text-foreground leading-relaxed">{coaching.coachingNotes}</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
