"use client";
import React, { useEffect, useRef, useState } from "react";
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
      }, 200);
      
    } catch (err) {
      console.error("Failed to start recording:", err);
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
      
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Stop recording and get result
      const result = await recorderRef.current.stop();
      
      console.log("Recording completed:", {
        durationSec: result.durationSec,
        mimeType: result.mimeType,
        blobSize: result.blob.size
      });
      
      // Pass result to parent
      onRecorded(result);
      
      setElapsed(0);
      
    } catch (err) {
      console.error("Failed to stop recording:", err);
      setError("Failed to stop recording properly.");
      setElapsed(0);
      
      // Cleanup on error
      if (recorderRef.current) {
        recorderRef.current.cleanup();
      }
    }
  }

  const isRecording = recording && recorderRef.current?.isRecording();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {!isRecording ? (
          <button 
            onClick={start} 
            className="px-4 py-2 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            disabled={recording}
          >
            Start (max {maxSeconds}s)
          </button>
        ) : (
          <button 
            onClick={stop} 
            className="px-4 py-2 rounded-2xl bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            Stop
          </button>
        )}
        <span className="text-sm text-gray-600 tabular-nums">{elapsed}s</span>
      </div>
      
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}
    </div>
  );
}