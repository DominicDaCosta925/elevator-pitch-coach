"use client";
import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Mic, Square } from "lucide-react";
import { createRecorder, type Recorder, type RecordingResult } from "@/utils/recorder";

export default function RecorderComponent({
  onRecorded,
  maxSeconds = 90,
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
      recorderRef.current = createRecorder();
      await recorderRef.current.start();
      
      setRecording(true);
      startTimeRef.current = Date.now();
      
      timerRef.current = setInterval(() => {
        const s = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsed(s);
        if (s >= maxSeconds) {
          stop();
        }
      }, 200);
      
    } catch (err) {
      setError("Failed to start recording. Please check microphone permissions.");
      setRecording(false);
    }
  }

  async function stop() {
    if (!recorderRef.current || !recorderRef.current.isRecording()) {
      return;
    }

    try {
      setRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      const result = await recorderRef.current.stop();
      onRecorded(result);
      setElapsed(0);
      
    } catch (err) {
      setError("Failed to stop recording properly.");
      setElapsed(0);
      
      if (recorderRef.current) {
        recorderRef.current.cleanup();
      }
    }
  }

  return (
    <div className="text-center space-y-8">
      <div className="relative">
        <motion.button
          onClick={recording ? stop : start}
          disabled={!!error}
          className={`
            relative w-24 h-24 rounded-full font-medium text-lg transition-all duration-200 
            flex items-center justify-center mx-auto
            ${recording 
              ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' 
              : 'bg-primary hover:bg-primary/90 text-primary-foreground'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          whileTap={{ scale: 0.95 }}
          animate={recording ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 1, repeat: recording ? Infinity : 0 }}
        >
          {recording ? (
            <Square className="w-8 h-8" />
          ) : (
            <Mic className="w-8 h-8" />
          )}
        </motion.button>

        {recording && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute inset-0 rounded-full border-4 border-primary animate-pulse"
          />
        )}
      </div>

      <div className="space-y-2">
        <p className="text-2xl font-mono tabular-nums text-foreground">
          {Math.floor(elapsed / 60).toString().padStart(2, '0')}:
          {(elapsed % 60).toString().padStart(2, '0')}
        </p>
        <p className="text-sm text-muted-foreground">
          {recording ? 'Recording in progress...' : `Click to start (max ${maxSeconds}s)`}
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}