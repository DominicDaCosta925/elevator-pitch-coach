import React from "react";
import { motion } from "framer-motion";
import { Clock, Zap, AlertCircle, BookOpen, TrendingUp, TrendingDown, CheckCircle } from "lucide-react";
import type { Metrics } from "@/lib/types";

interface MetricCardProps {
  label: string;
  value: string;
  description: string;
  status: "excellent" | "good" | "needs-improvement";
  icon: React.ReactNode;
  recommendation?: string;
}

function MetricCard({ label, value, description, status, icon, recommendation }: MetricCardProps) {
  const statusConfig = {
    excellent: {
      bg: "bg-gradient-to-br from-green-50 to-emerald-50",
      border: "border-green-200",
      text: "text-green-800",
      valueText: "text-green-900",
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      indicator: <CheckCircle className="w-4 h-4 text-green-500" />,
    },
    good: {
      bg: "bg-gradient-to-br from-blue-50 to-indigo-50",
      border: "border-blue-200",
      text: "text-blue-800",
      valueText: "text-blue-900",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      indicator: <TrendingUp className="w-4 h-4 text-blue-500" />,
    },
    "needs-improvement": {
      bg: "bg-gradient-to-br from-amber-50 to-orange-50",
      border: "border-amber-200",
      text: "text-amber-800",
      valueText: "text-amber-900",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      indicator: <AlertCircle className="w-4 h-4 text-amber-500" />,
    },
  };

  const config = statusConfig[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`
        ${config.bg} ${config.border} 
        border rounded-2xl p-6 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]
      `}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`${config.iconBg} p-2 rounded-xl`}>
          <div className={config.iconColor}>
            {icon}
          </div>
        </div>
        {config.indicator}
      </div>
      
      <div className="space-y-2">
        <div className={`text-3xl font-bold ${config.valueText}`}>
          {value}
        </div>
        <div className={`text-sm font-medium ${config.text}`}>
          {label}
        </div>
        <div className={`text-xs ${config.text} opacity-80`}>
          {description}
        </div>
        {recommendation && (
          <div className={`text-xs ${config.text} mt-3 p-2 bg-white/50 rounded-lg`}>
            <strong>Tip:</strong> {recommendation}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function ScoreCard({ m }: { m: Metrics }) {
  // Define optimal ranges and scoring logic
  const getTimeStatus = (duration: number) => {
    if (duration >= 25 && duration <= 35) return "excellent";
    if (duration >= 20 && duration <= 45) return "good";
    return "needs-improvement";
  };

  const getWPMStatus = (wpm: number) => {
    if (wpm >= 140 && wpm <= 160) return "excellent";
    if (wpm >= 125 && wpm <= 175) return "good";
    return "needs-improvement";
  };

  const getFillerStatus = (count: number) => {
    if (count <= 1) return "excellent";
    if (count <= 3) return "good";
    return "needs-improvement";
  };

  const getReadabilityStatus = (grade: number) => {
    if (grade <= 8) return "excellent";
    if (grade <= 12) return "good";
    return "needs-improvement";
  };

  const timeStatus = getTimeStatus(m.durationSec);
  const wpmStatus = getWPMStatus(m.wordsPerMinute);
  const fillerStatus = getFillerStatus(m.fillerCount);
  const readabilityStatus = getReadabilityStatus(m.readability);

  const getRecommendation = (metric: string, status: string) => {
    const recommendations = {
      time: {
        "needs-improvement": m.durationSec < 25 
          ? "Try to expand your pitch with more details about your experience"
          : "Practice condensing your message to the most impactful points",
        good: "You're close to the sweet spot! Fine-tune your timing with practice",
        excellent: "Perfect timing! This length keeps listeners engaged",
      },
      wpm: {
        "needs-improvement": m.wordsPerMinute < 125
          ? "Speak a bit faster to sound more confident and energetic"
          : "Slow down slightly to ensure clarity and comprehension",
        good: "Good pace! Small adjustments will make it even better",
        excellent: "Ideal speaking pace for maximum clarity and engagement",
      },
      filler: {
        "needs-improvement": "Practice pausing instead of using filler words like 'um', 'uh', 'like'",
        good: "Good control! Continue being mindful of filler words",
        excellent: "Excellent fluency! Your speech sounds polished and professional",
      },
      readability: {
        "needs-improvement": "Use simpler words and shorter sentences for better clarity",
        good: "Good complexity level, minor simplifications could help",
        excellent: "Perfect complexity! Easy to understand yet professional",
      },
    };
    return recommendations[metric as keyof typeof recommendations]?.[status as keyof typeof recommendations.time] || "";
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-slate-800 mb-2">Performance Metrics</h3>
        <p className="text-slate-600">
          Here's how your pitch performed across key dimensions
        </p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <MetricCard
          label="Duration"
          value={`${Math.round(m.durationSec)}s`}
          description="Ideal: 25-35 seconds"
          status={timeStatus}
          icon={<Clock className="w-5 h-5" />}
          recommendation={getRecommendation("time", timeStatus)}
        />

        <MetricCard
          label="Speaking Pace"
          value={`${m.wordsPerMinute} WPM`}
          description="Ideal: 140-160 words/min"
          status={wpmStatus}
          icon={<Zap className="w-5 h-5" />}
          recommendation={getRecommendation("wpm", wpmStatus)}
        />

        <MetricCard
          label="Filler Words"
          value={`${m.fillerCount}`}
          description="Fewer is better"
          status={fillerStatus}
          icon={<AlertCircle className="w-5 h-5" />}
          recommendation={getRecommendation("filler", fillerStatus)}
        />

        <MetricCard
          label="Readability"
          value={`Grade ${m.readability}`}
          description="Ideal: Grade 8 or below"
          status={readabilityStatus}
          icon={<BookOpen className="w-5 h-5" />}
          recommendation={getRecommendation("readability", readabilityStatus)}
        />
      </motion.div>

      {/* Overall Score Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl p-6 border border-slate-200"
      >
        <div className="text-center">
          <h4 className="text-lg font-semibold text-slate-800 mb-2">Overall Assessment</h4>
          <div className="flex justify-center gap-2 mb-3">
            {[timeStatus, wpmStatus, fillerStatus, readabilityStatus].map((status, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full ${
                  status === "excellent" 
                    ? "bg-green-500" 
                    : status === "good" 
                    ? "bg-blue-500" 
                    : "bg-amber-500"
                }`}
              />
            ))}
          </div>
          <p className="text-slate-600 text-sm">
            {[timeStatus, wpmStatus, fillerStatus, readabilityStatus].filter(s => s === "excellent").length >= 3
              ? "Excellent pitch! You're hitting most of the key metrics."
              : [timeStatus, wpmStatus, fillerStatus, readabilityStatus].filter(s => s !== "needs-improvement").length >= 3
              ? "Good pitch! A few small improvements will make it even better."
              : "Good foundation! Focus on the areas marked for improvement."}
          </p>
        </div>
      </motion.div>
    </div>
  );
}