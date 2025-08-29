"use client";
import React from "react";

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

  const actualSeconds = estimateReadingTime(pitch);

  if (isGenerating) {
    return (
      <div className="w-full p-8 border-2 border-dashed border-gray-300 rounded-2xl">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">
              Generating Your Elevator Pitch
            </h3>
            <p className="text-sm text-gray-600">
              Analyzing your resume and crafting a personalized {targetSeconds}-second pitch...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Your Generated Elevator Pitch
        </h3>
        <div className="flex items-center space-x-4">
          {isAdjusting && (
            <div className="flex items-center space-x-2 text-sm text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
              <span>Adjusting length...</span>
            </div>
          )}
          <div className="text-sm text-gray-600">
            <span className="font-medium">Target:</span> {targetSeconds}s
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">Estimated:</span> ~{actualSeconds}s
          </div>
        </div>
      </div>

      {/* Pitch Content */}
      <div className={`
        relative p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200 shadow-sm
        ${isAdjusting ? 'opacity-60' : ''}
      `}>
        {isAdjusting && (
          <div className="absolute inset-0 bg-white bg-opacity-50 rounded-2xl flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
          </div>
        )}
        
        <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
          {pitch}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-gray-500">
          💡 Tip: Practice this pitch with the recorder below to get personalized feedback!
        </div>
        
        {onPractice && (
          <button
            onClick={onPractice}
            disabled={isAdjusting}
            className={`
              px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform
              ${isAdjusting 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:from-emerald-600 hover:to-green-600 hover:scale-105 shadow-lg hover:shadow-xl'
              }
            `}
          >
            🎙️ Practice This Pitch
          </button>
        )}
      </div>

      {/* Quality indicators */}
      <div className="flex items-center space-x-4 pt-2 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <div className={`
            w-2 h-2 rounded-full
            ${Math.abs(actualSeconds - targetSeconds) <= 5 
              ? 'bg-green-500' 
              : Math.abs(actualSeconds - targetSeconds) <= 10 
                ? 'bg-yellow-500' 
                : 'bg-red-500'
            }
          `}></div>
          <span className="text-xs text-gray-600">
            Length {Math.abs(actualSeconds - targetSeconds) <= 5 ? 'Perfect' : 'Good'}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span className="text-xs text-gray-600">
            Personalized
          </span>
        </div>
      </div>
    </div>
  );
}
