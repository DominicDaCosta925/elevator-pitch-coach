"use client";

import React, { useMemo, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PitchLengthSliderProps {
  value: number; // seconds
  onChange: (seconds: number) => void;
  onChangeComplete?: (seconds: number) => void; // Called when user releases slider
  disabled?: boolean;
  isUpdating?: boolean;
}

export default function PitchLengthSlider({ 
  value, 
  onChange, 
  onChangeComplete,
  disabled = false,
  isUpdating = false 
}: PitchLengthSliderProps) {
  const MIN_SECONDS = 20;
  const MAX_SECONDS = 90;
  const STEP = 5;
  const [isDragging, setIsDragging] = useState(false);

  const pct = useMemo(() => {
    return ((value - MIN_SECONDS) / (MAX_SECONDS - MIN_SECONDS)) * 100;
  }, [value]);

  // Estimate speaking rate range (words/second)
  function estimateWordsRange(sec: number): { low: number; high: number } {
    const low = Math.round(sec * 2.0);
    const high = Math.round(sec * 2.3);
    return { low, high };
  }

  const { low, high } = estimateWordsRange(value);

  const presets = [
    { label: "Quick Intro", value: 20, description: "Brief introduction" },
    { label: "Balanced", value: 50, description: "Standard pitch" },
    { label: "Full Story", value: 90, description: "Detailed narrative" },
  ];

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value);
    onChange(newValue);
  }, [onChange]);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    if (!disabled && onChangeComplete) {
      onChangeComplete(value);
    }
  }, [disabled, onChangeComplete, value]);

  const handlePresetClick = useCallback((presetValue: number) => {
    if (!disabled) {
      onChange(presetValue);
      onChangeComplete?.(presetValue);
    }
  }, [disabled, onChange, onChangeComplete]);

  const getSliderColor = () => {
    if (value <= 30) return "from-green-400 to-green-600";
    if (value <= 60) return "from-blue-400 to-blue-600";
    return "from-purple-400 to-purple-600";
  };

  const getThumbPosition = () => {
    return `calc(${pct}% - 16px)`;
  };

  return (
    <div className="space-y-6">
      {/* Preset Chips */}
      <div className="flex flex-wrap justify-center gap-3">
        {presets.map((preset) => (
          <motion.div key={preset.value} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant={value === preset.value ? "primary" : "outline"}
              size="sm"
              onClick={() => handlePresetClick(preset.value)}
              disabled={disabled || isUpdating}
              className="text-xs"
            >
              {preset.label} • {preset.value}s
            </Button>
          </motion.div>
        ))}
      </div>

      {/* Slider Container */}
      <div className="relative px-4">
        {/* Track Background */}
        <div className="relative h-3 bg-slate-200 rounded-full overflow-hidden">
          {/* Gradient Track */}
          <motion.div
            className={`h-full bg-gradient-to-r ${getSliderColor()} transition-all duration-300`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Range Input */}
        <input
          type="range"
          min={MIN_SECONDS}
          max={MAX_SECONDS}
          step={STEP}
          value={value}
          onChange={handleChange}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
          disabled={disabled || isUpdating}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          aria-label="Pitch length in seconds"
        />

        {/* Custom Thumb */}
        <motion.div
          className={`
            absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-full shadow-lg border-4 border-white
            ${disabled || isUpdating ? 'bg-slate-400' : 'bg-white'}
            transition-all duration-200 pointer-events-none
          `}
          style={{ left: getThumbPosition() }}
          animate={{
            scale: isDragging ? 1.2 : 1,
            boxShadow: isDragging 
              ? "0 8px 25px rgba(0, 0, 0, 0.15)" 
              : "0 4px 15px rgba(0, 0, 0, 0.1)"
          }}
        >
          {/* Thumb Icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Clock className={`w-4 h-4 ${disabled || isUpdating ? 'text-slate-500' : 'text-slate-700'}`} />
          </div>
        </motion.div>

        {/* Live Seconds Display */}
        <motion.div
          className="absolute -top-12 bg-slate-900 text-white px-3 py-1 rounded-lg text-sm font-medium shadow-lg"
          style={{ left: getThumbPosition() }}
          animate={{
            scale: isDragging ? 1.1 : 1,
            opacity: isDragging ? 1 : 0.8,
          }}
        >
          <div className="text-center">
            {value}s
            {isUpdating && (
              <Loader2 className="w-3 h-3 animate-spin inline ml-1" />
            )}
          </div>
          {/* Tooltip Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900" />
        </motion.div>

        {/* Tick marks and labels */}
        <div className="absolute -bottom-8 left-0 right-0 flex justify-between text-xs text-slate-600">
          <div className="flex flex-col items-start">
            <div className="w-px h-3 bg-slate-400 mb-1" />
            <div className="text-center">
              <div className="font-medium">Quick Intro</div>
              <div className="text-slate-500">20s</div>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-px h-3 bg-slate-400 mb-1" />
            <div className="text-center">
              <div className="font-medium">Balanced Pitch</div>
              <div className="text-slate-500">~50s</div>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="w-px h-3 bg-slate-400 mb-1" />
            <div className="text-center">
              <div className="font-medium">Full Story</div>
              <div className="text-slate-500">90s</div>
            </div>
          </div>
        </div>
      </div>

      {/* Word Count Estimate */}
      <motion.div
        layout
        className="flex justify-center"
      >
        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
          <Clock className="w-4 h-4 text-slate-500" />
          <span className="text-sm text-slate-600">Estimated length:</span>
          <span className="font-medium text-slate-900">~{low}–{high} words</span>
          <AnimatePresence>
            {isUpdating && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Helper Text */}
      <div className="text-center">
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Most effective pitches are 45-60 seconds. You can always adjust the length after generation.
        </p>
      </div>
    </div>
  );
}