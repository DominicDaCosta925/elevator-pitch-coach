"use client";
import React, { useState, useCallback } from "react";

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
  const [isDragging, setIsDragging] = useState(false);

  const min = 10;
  const max = 60;
  const step = 5;

  const handleMouseDown = useCallback(() => {
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      onChangeComplete?.(value);
    }
  }, [isDragging, value, onChangeComplete]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value);
    onChange(newValue);
  }, [onChange]);

  // Calculate position for visual markers
  const getMarkerPosition = (seconds: number) => {
    return ((seconds - min) / (max - min)) * 100;
  };

  const markers = [10, 20, 30, 40, 50, 60];

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          Pitch Length
        </label>
        <div className="flex items-center space-x-2">
          {isUpdating && (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
          )}
          <span className="text-lg font-semibold text-blue-600">
            {value}s
          </span>
        </div>
      </div>

      <div className="relative">
        {/* Slider track */}
        <div className="relative h-2 bg-gray-200 rounded-full">
          {/* Progress fill */}
          <div 
            className="absolute h-2 bg-blue-600 rounded-full transition-all duration-150"
            style={{ width: `${getMarkerPosition(value)}%` }}
          />
        </div>

        {/* Slider input */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
          disabled={disabled}
          className={`
            absolute inset-0 w-full h-2 opacity-0 cursor-pointer
            ${disabled ? 'cursor-not-allowed' : ''}
          `}
        />

        {/* Visual markers */}
        <div className="absolute -bottom-6 w-full">
          {markers.map(seconds => (
            <div
              key={seconds}
              className="absolute transform -translate-x-1/2"
              style={{ left: `${getMarkerPosition(seconds)}%` }}
            >
              <div className="w-1 h-3 bg-gray-300 mx-auto"></div>
              <span className="text-xs text-gray-500 block text-center mt-1">
                {seconds}s
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Short & Concise</span>
          <span>Detailed & Comprehensive</span>
        </div>
      </div>
    </div>
  );
}
