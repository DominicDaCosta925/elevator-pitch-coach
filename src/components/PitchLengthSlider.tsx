"use client";
import React, { useMemo, useCallback } from "react";

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
    { label: "Quick Intro", value: 20 },
    { label: "Balanced", value: 50 },
    { label: "Full Story", value: 90 },
  ];

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value);
    onChange(newValue);
  }, [onChange]);

  const handleMouseUp = useCallback(() => {
    if (!disabled) {
      onChangeComplete?.(value);
    }
  }, [disabled, value, onChangeComplete]);

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-900">
          Pitch Length
        </label>
        <div className="flex items-center space-x-2">
          {isUpdating && (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
          )}
        </div>
      </div>

      {/* Preset chips */}
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => {
              onChange(p.value);
              if (!disabled) {
                onChangeComplete?.(p.value);
              }
            }}
            disabled={disabled}
            className={`px-3 py-1.5 rounded-full text-sm border transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 disabled:opacity-50 ${
              value === p.value
                ? "bg-blue-600 text-white border-transparent"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
            aria-pressed={value === p.value}
          >
            {p.label} • {p.value}s
          </button>
        ))}
      </div>

      {/* Slider wrapper */}
      <div className="relative pt-8 pb-10">
        {/* Track background with gradient indicating detail density */}
        <div
          className="absolute left-0 right-0 h-3 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, rgba(59,130,246,0.3) 0%, rgba(59,130,246,0.6) 50%, rgba(59,130,246,1) 100%)",
          }}
        />

        {/* Native range input */}
        <input
          type="range"
          min={MIN_SECONDS}
          max={MAX_SECONDS}
          step={STEP}
          value={value}
          onChange={handleChange}
          onMouseUp={handleMouseUp}
          onTouchEnd={handleMouseUp}
          disabled={disabled}
          aria-label="Elevator pitch length in seconds"
          className="w-full appearance-none bg-transparent relative z-10 focus:outline-none disabled:opacity-50"
          style={{ 
            height: 0,
            WebkitAppearance: 'none',
          }}
        />

        {/* Custom thumb + tooltip */}
        <div
          className="pointer-events-none absolute -top-2 transition-all duration-150"
          style={{ left: `calc(${pct}% - 16px)` }}
          aria-hidden
        >
          {/* Thumb visualization with stopwatch icon */}
          <div className="w-8 h-8 rounded-full bg-white border-2 border-blue-600 shadow-lg flex items-center justify-center">
            <span className="text-xs">⏱️</span>
          </div>
          {/* Tooltip above thumb */}
          <div className="-mt-10 mb-1 px-2 py-1 rounded-md bg-gray-900 text-white text-xs text-center shadow-lg whitespace-nowrap">
            {value}s
          </div>
        </div>

        {/* Tick marks and semantic labels */}
        <div className="absolute -bottom-8 left-0 right-0 flex justify-between text-xs text-gray-600">
          <div className="flex flex-col items-start">
            <div className="w-px h-3 bg-gray-400 mb-1" />
            <span className="font-medium">Quick Intro</span>
            <span className="text-gray-400">20s</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-px h-3 bg-gray-400 mb-1" />
            <span className="font-medium">Balanced Pitch</span>
            <span className="text-gray-400">~50s</span>
          </div>
          <div className="flex flex-col items-end">
            <div className="w-px h-3 bg-gray-400 mb-1" />
            <span className="font-medium">Full Story</span>
            <span className="text-gray-400">90s</span>
          </div>
        </div>
      </div>

      {/* Word count estimate + helper text */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
          <span className="text-sm text-gray-600">Estimated length:</span>
          <span className="font-medium text-gray-900">~{low}–{high} words</span>
        </div>
        <p className="text-xs text-gray-500">
          💡 Most pitches work best between 45–60 seconds. You can always adjust after generation.
        </p>
      </div>
    </div>
  );
}
