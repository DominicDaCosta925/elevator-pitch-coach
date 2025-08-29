"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createRecorder, type Recorder, type RecordingResult } from "@/utils/recorder";

export default function RecorderComponent({
  onRecorded,
  maxSeconds = 30,
}: { 
  onRecorded: (result: RecordingResult) => void; 
  maxSeconds?: number;
}) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const recorderRef = useRef<Recorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (recorderRef.current) {
        recorderRef.current.cleanup();
      }
    };
  }, []);

  async function start() {
    try {
      setError(null);
      
      // Create new recorder instance
      recorderRef.current = createRecorder();
      
      // Start recording
      await recorderRef.current.start();
      
      setRecording(true);
      startTimeRef.current = Date.now();
      
      // Start timer
      timerRef.current = setInterval(() => {
        const s = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsed(s);
        if (s >= maxSeconds) {
          stop();
        }
      }, 100);
      
    } catch (err) {
      console.error("Start recording error:", err);
      setError(err instanceof Error ? err.message : "Failed to start recording");
    }
  }

  async function stop() {
    if (!recorderRef.current || !recording) return;
    
    try {
      setRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      const result = await recorderRef.current.stop();
      onRecorded(result);
      
      // Reset state
      setElapsed(0);
      setError(null);
      
    } catch (err) {
      console.error("Stop recording error:", err);
      setError(err instanceof Error ? err.message : "Failed to stop recording");
      setRecording(false);
      setElapsed(0);
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = (elapsed / maxSeconds) * 100;
  const isNearMax = elapsed >= maxSeconds * 0.9;

  return (
    <div className="space-y-6">
      {/* Recording Interface */}
      <div className="flex flex-col items-center space-y-6">
        {/* Recording Button */}
        <motion.div
          whileHover={{ scale: recording ? 1 : 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative"
        >
          <Button
            onClick={recording ? stop : start}
            variant={recording ? "destructive" : "primary"}
            size="lg"
            className={`
              relative h-20 w-20 rounded-full shadow-xl transition-all duration-300
              ${recording 
                ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30 recording-pulse' 
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
              }
            `}
          >
            <AnimatePresence mode="wait">
              {recording ? (
                <motion.div
                  key="stop"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                >
                  <Square className="w-8 h-8" fill="currentColor" />
                </motion.div>
              ) : (
                <motion.div
                  key="mic"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                >
                  <Mic className="w-8 h-8" />
                </motion.div>
              )}
            </AnimatePresence>
          </Button>

          {/* Recording indicator ring */}
          <AnimatePresence>
            {recording && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping"
              />
            )}
          </AnimatePresence>
        </motion.div>

        {/* Timer and Status */}
        <div className="text-center space-y-2">
          <motion.div
            key={elapsed}
            initial={{ scale: 0.9, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`
              text-4xl font-mono font-bold transition-colors duration-200
              ${recording 
                ? isNearMax 
                  ? 'text-red-600' 
                  : 'text-blue-600' 
                : 'text-slate-600'
              }
            `}
          >
            {formatTime(elapsed)}
          </motion.div>
          
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <div className={`
              w-2 h-2 rounded-full transition-colors duration-200
              ${recording ? 'bg-red-500' : 'bg-slate-300'}
            `} />
            {recording ? 'Recording...' : 'Ready to record'}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-md">
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <motion.div
              className={`
                h-full transition-colors duration-200
                ${isNearMax ? 'bg-red-500' : 'bg-blue-500'}
              `}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>0:00</span>
            <span>{formatTime(maxSeconds)}</span>
          </div>
        </div>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-lg"
        >
          <p className="text-slate-600">
            {recording 
              ? `Click the stop button when you're finished, or recording will auto-stop at ${maxSeconds} seconds`
              : 'Click the microphone button to start recording your elevator pitch'
            }
          </p>
        </motion.div>
      </div>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 border border-red-200 rounded-xl p-4"
          >
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded-full flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}