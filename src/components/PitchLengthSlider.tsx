"use client";

import React, { useMemo, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Loader2 } from "lucide-react";

interface PitchLengthSliderProps {
  value: number;
  onChange: (seconds: number) => void;
  onChangeComplete?: (seconds: number) => void;
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
  const [isDragging, setIsDragging] = useState(false);

  const pct = useMemo(() => {
    return ((value - MIN_SECONDS) / (MAX_SECONDS - MIN_SECONDS)) * 100;
  }, [value]);

  function estimateWordsRange(sec: number): { low: number; high: number } {
    const low = Math.round(sec * 2.0);
    const high = Math.round(sec * 2.3);
    return { low, high };
  }

  const { low, high } = estimateWordsRange(value);

  const presets = [
    { label: "Quick", value: 20, description: "20s" },
    { label: "Balanced", value: 50, description: "50s" },
    { label: "Detailed", value: 90, description: "90s" },
  ];

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value);
    onChange(newValue);
  }, [onChange]);

  const handleMouseDown = useCallback(() => {
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    if (!disabled && onChangeComplete) {
      setTimeout(() => {
        onChangeComplete(value);
      }, 100);
    }
  }, [disabled, onChangeComplete, value]);

  const handlePresetClick = useCallback((presetValue: number) => {
    if (!disabled) {
      onChange(presetValue);
      if (onChangeComplete) {
        setTimeout(() => {
          onChangeComplete(presetValue);
        }, 100);
      }
    }
  }, [disabled, onChange, onChangeComplete]);

  const getSliderColor = () => {
    if (value <= 30) return "from-emerald-500 to-emerald-600";
    if (value <= 60) return "from-blue-500 to-blue-600";
    return "from-purple-500 to-purple-600";
  };

  return (
    <div className="slider-container">
      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-2">Pitch Length</h3>
        <p className="text-sm text-muted-foreground">Choose your target duration</p>
      </div>

      {/* Current Value Display */}
      <div className="slider-value">
        <div className="slider-value-main">
          {value}s
          <AnimatePresence>
            {isUpdating && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="inline-block ml-2"
              >
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div className="slider-value-sub">
          ~{low}–{high} words estimated
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="slider-presets">
        {presets.map((preset) => (
          <motion.button
            key={preset.value}
            onClick={() => handlePresetClick(preset.value)}
            disabled={disabled || isUpdating}
            whileHover={!disabled && !isUpdating ? { scale: 1.05 } : {}}
            whileTap={!disabled && !isUpdating ? { scale: 0.95 } : {}}
            className={`preset-button ${value === preset.value ? 'active' : ''}`}
          >
            <div className="text-center">
              <div className="font-semibold">{preset.label}</div>
              <div className="text-xs opacity-75">{preset.description}</div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Slider Track */}
      <div className="relative px-2">
        <div className="slider-track">
          {/* Progress Fill */}
          <motion.div
            className={`slider-progress bg-gradient-to-r ${getSliderColor()}`}
            style={{ width: `${pct}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
          
          {/* Slider Input */}
          <input
            type="range"
            min={MIN_SECONDS}
            max={MAX_SECONDS}
            step={1}
            value={value}
            onChange={handleSliderChange}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchEnd={handleMouseUp}
            disabled={disabled || isUpdating}
            className="slider-input"
            aria-label="Pitch length in seconds"
          />
          
          {/* Custom Thumb */}
          <motion.div
            className={`slider-thumb ${isDragging ? 'dragging' : ''}`}
            style={{ left: `calc(${pct}% - 12px)` }}
            animate={{
              scale: isDragging ? 1.2 : 1,
            }}
            transition={{ duration: 0.2 }}
          >
            <Clock className="w-3 h-3 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </motion.div>
        </div>

        {/* Track Labels */}
        <div className="slider-labels">
          <div className="text-center">
            <div className="font-medium">20s</div>
            <div className="text-xs">Quick</div>
          </div>
          <div className="text-center">
            <div className="font-medium">50s</div>
            <div className="text-xs">Balanced</div>
          </div>
          <div className="text-center">
            <div className="font-medium">90s</div>
            <div className="text-xs">Detailed</div>
          </div>
        </div>
      </div>

      {/* Word Count Estimate */}
      <div className="word-estimate">
        <div className="flex items-center justify-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Estimated length:</span>
          <span className="font-semibold text-foreground">~{low}–{high} words</span>
        </div>
      </div>

      {/* Helper Text */}
      <div className="text-center mt-4">
        <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
          Most effective pitches are 45-60 seconds. Drag the slider for precise control or use preset buttons for quick selection.
        </p>
      </div>
    </div>
  );
}