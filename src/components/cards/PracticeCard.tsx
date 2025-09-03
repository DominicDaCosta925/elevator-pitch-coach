"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, Play, Square } from "lucide-react";

interface PracticeCardProps {
  onStartRecording: () => void;
  onStopRecording: () => void;
  isRecording?: boolean;
  isDisabled?: boolean;
  generatedPitch?: string;
}

export function PracticeCard({
  onStartRecording,
  onStopRecording,
  isRecording = false,
  isDisabled = false,
  generatedPitch,
}: PracticeCardProps) {
  const [recordingTime, setRecordingTime] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMicClick = () => {
    if (isDisabled) return;
    if (isRecording) {
      onStopRecording();
    } else {
      onStartRecording();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut", delay: 0.2 }}
      className="bg-card border border-border rounded-2xl p-6"
    >
      <div className="mb-6">
        <h2 className="text-xl font-heading font-semibold h-heading text-card-foreground mb-2">
          Practice Your Pitch
        </h2>
        <p className="text-sm text-muted-foreground">
          {isDisabled 
            ? "Generate a pitch to start practicing"
            : "Record yourself delivering your elevator pitch"
          }
        </p>
      </div>

      {/* Generated Pitch Display */}
      {generatedPitch && (
        <div className="mb-6 p-4 bg-muted rounded-lg">
          <h3 className="text-sm font-medium text-card-foreground mb-2">Your Generated Pitch</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {generatedPitch}
          </p>
        </div>
      )}

      {/* Recording Controls */}
      <div className="flex flex-col items-center space-y-4">
        {/* Mic Button */}
        <div className="relative">
          <motion.button
            onClick={handleMicClick}
            disabled={isDisabled}
            title={isDisabled ? "Upload resume to start" : isRecording ? "Stop recording" : "Start recording"}
            className={`
              relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background
              ${isDisabled
                ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                : isRecording
                ? 'bg-accent text-accent-foreground shadow-lg'
                : 'bg-primary text-primary-foreground hover:scale-105 shadow-md hover:shadow-lg'
              }
            `}
            whileHover={!isDisabled ? { scale: 1.05 } : {}}
            whileTap={!isDisabled ? { scale: 0.95 } : {}}
            animate={isRecording ? { scale: [1, 1.1, 1] } : {}}
            transition={isRecording ? { duration: 1, repeat: Infinity } : { duration: 0.2 }}
          >
            {isDisabled ? (
              <MicOff className="w-6 h-6" />
            ) : isRecording ? (
              <Square className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
            
            {/* Recording Pulse */}
            {isRecording && (
              <motion.div
                className="absolute inset-0 rounded-full bg-accent"
                animate={{ scale: [1, 1.5], opacity: [0.7, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
          </motion.button>
        </div>

        {/* Timer */}
        <div className="text-center">
          <div className={`text-2xl font-mono font-medium ${isRecording ? 'text-accent' : 'text-muted-foreground'}`}>
            {formatTime(recordingTime)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {isDisabled 
              ? "Upload resume to start"
              : isRecording 
              ? (
                <span className="flex items-center justify-center gap-1">
                  <span className="w-2 h-2 bg-accent rounded-full animate-pulse"></span>
                  Recording in progress...
                </span>
              )
              : "Click to start recording"
            }
          </div>
        </div>

        {/* Recording Tips */}
        <div className={`text-center space-y-2 ${isDisabled ? 'opacity-50' : ''}`}>
          <div className="text-xs text-muted-foreground">
            💡 <strong>Tips:</strong>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1 max-w-sm">
            <li>• Speak clearly and at a moderate pace</li>
            <li>• Make eye contact with your imaginary listener</li>
            <li>• Keep it under 60 seconds for best results</li>
          </ul>
        </div>
      </div>
    </motion.div>
  );
}
