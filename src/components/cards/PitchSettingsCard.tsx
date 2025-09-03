"use client";

import React from "react";
import { motion } from "framer-motion";

interface PitchSettingsCardProps {
  selectedDuration: 30 | 60 | 90;
  onDurationChange: (duration: 30 | 60 | 90) => void;
  selectedDepth: "brief" | "deep";
  onDepthChange: (depth: "brief" | "deep") => void;
  targetRole: string;
  onTargetRoleChange: (role: string) => void;
  onGeneratePitch: () => void;
  isGenerating?: boolean;
  hasResumeFile?: boolean;
}

export function PitchSettingsCard({
  selectedDuration,
  onDurationChange,
  selectedDepth,
  onDepthChange,
  targetRole,
  onTargetRoleChange,
  onGeneratePitch,
  isGenerating = false,
  hasResumeFile = false,
}: PitchSettingsCardProps) {
  const durations = [
    { value: 30 as const, label: "Quick", sublabel: "30s" },
    { value: 60 as const, label: "Balanced", sublabel: "60s" },
    { value: 90 as const, label: "Thorough", sublabel: "90s" },
  ];

  const depths = [
    { value: "brief" as const, label: "Brief" },
    { value: "deep" as const, label: "Deep" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut", delay: 0.1 }}
      className="bg-card text-card-foreground border border-border rounded-2xl p-6"
    >
      <div className="mb-6">
        <h2 className="text-xl font-heading font-semibold h-heading text-card-foreground mb-2">
          Pitch Settings
        </h2>
        <p className="text-sm text-muted-foreground">
          Customize your elevator pitch preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Target Role Input */}
        <div>
          <label htmlFor="target-role" className="block text-sm font-medium text-card-foreground mb-2">
            Target Role (Optional)
          </label>
          <input
            id="target-role"
            type="text"
            value={targetRole}
            onChange={(e) => onTargetRoleChange(e.target.value)}
            placeholder="e.g., Product Manager, Software Engineer"
            className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors"
          />
        </div>

        {/* Duration Pills */}
        <div>
          <label className="block text-sm font-medium text-card-foreground mb-3">
            Pitch Length
          </label>
          <div className="flex gap-2">
            {durations.map((duration) => (
              <button
                key={duration.value}
                onClick={() => onDurationChange(duration.value)}
                className={`
                  flex-1 px-4 py-3 rounded-lg border transition-all duration-200 text-center outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background
                  ${selectedDuration === duration.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border bg-transparent text-foreground hover:bg-secondary'
                  }
                `}
              >
                <div className="font-medium text-sm">{duration.label}</div>
                <div className="text-xs opacity-75">{duration.sublabel}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Depth Toggle */}
        <div>
          <label className="block text-sm font-medium text-card-foreground mb-3">
            Coaching Depth
          </label>
          <div className="flex bg-muted rounded-lg p-1">
            {depths.map((depth) => (
              <button
                key={depth.value}
                onClick={() => onDepthChange(depth.value)}
                className={`
                  flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background
                  ${selectedDepth === depth.value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                  }
                `}
              >
                {depth.label}
              </button>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <motion.button
          onClick={onGeneratePitch}
          disabled={!hasResumeFile || isGenerating}
          className={`
            w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background
            ${!hasResumeFile || isGenerating
              ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
              : 'bg-primary text-primary-foreground hover:scale-105 active:scale-[0.98]'
            }
          `}
          whileHover={hasResumeFile && !isGenerating ? { scale: 1.02 } : {}}
          whileTap={hasResumeFile && !isGenerating ? { scale: 0.98 } : {}}
        >
          {isGenerating ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
              Generating...
            </div>
          ) : (
            "Generate Pitch"
          )}
        </motion.button>

        {!hasResumeFile && (
          <p className="text-xs text-muted-foreground text-center">
            Upload a resume to enable pitch generation
          </p>
        )}
      </div>
    </motion.div>
  );
}
