"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Mic, Square, AlertCircle, CheckCircle, Volume2 } from "lucide-react";
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
  const [permission, setPermission] = useState<PermissionState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  
  const recorderRef = useRef<Recorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Check microphone permission on mount
  useEffect(() => {
    checkMicrophonePermission();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const checkMicrophonePermission = useCallback(async () => {
    try {
      if (navigator.permissions) {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setPermission(result.state);
        
        result.addEventListener('change', () => {
          setPermission(result.state);
        });
      }
    } catch (err) {
      console.warn("Could not check microphone permission:", err);
    }
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recorderRef.current) {
      recorderRef.current.cleanup();
      recorderRef.current = null;
    }
    setRecording(false);
    setElapsed(0);
    setIsProcessing(false);
  }, []);

  const start = useCallback(async () => {
    try {
      setError(null);
      setIsProcessing(true);
      setHasRecorded(false);
      
      // Check if we already have a recorder instance
      if (recorderRef.current) {
        recorderRef.current.cleanup();
      }
      
      recorderRef.current = createRecorder();
      await recorderRef.current.start();
      
      setRecording(true);
      setIsProcessing(false);
      startTimeRef.current = Date.now();
      
      timerRef.current = setInterval(() => {
        const s = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsed(s);
        if (s >= maxSeconds) {
          stop();
        }
      }, 100); // More frequent updates for smoother timer
      
    } catch (err) {
      setIsProcessing(false);
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      
      if (errorMessage.includes("Permission denied") || errorMessage.includes("NotAllowedError")) {
        setError("Microphone access denied. Please allow microphone access and try again.");
        setPermission("denied");
      } else if (errorMessage.includes("NotFoundError")) {
        setError("No microphone found. Please connect a microphone and try again.");
      } else {
        setError(`Failed to start recording: ${errorMessage}`);
      }
      
      setRecording(false);
      cleanup();
    }
  }, [maxSeconds]);

  const stop = useCallback(async () => {
    if (!recorderRef.current || !recording) {
      return;
    }

    try {
      setIsProcessing(true);
      setRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      const result = await recorderRef.current.stop();
      
      // Validate recording
      if (!result.blob || result.blob.size === 0) {
        throw new Error("Recording failed - no audio data captured");
      }
      
      if (result.durationSec < 0.5) {
        throw new Error("Recording too short - please record for at least 0.5 seconds");
      }
      
      setHasRecorded(true);
      onRecorded(result);
      setElapsed(0);
      setIsProcessing(false);
      
      // Clean up after successful recording
      if (recorderRef.current) {
        recorderRef.current.cleanup();
        recorderRef.current = null;
      }
      
    } catch (err) {
      setIsProcessing(false);
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(`Recording failed: ${errorMessage}`);
      setElapsed(0);
      cleanup();
    }
  }, [recording, onRecorded]);

  const handleButtonClick = useCallback(() => {
    if (recording) {
      stop();
    } else {
      start();
    }
  }, [recording, start, stop]);

  const clearError = useCallback(() => {
    setError(null);
    setHasRecorded(false);
  }, []);

  const getButtonState = () => {
    if (isProcessing) return "processing";
    if (recording) return "recording";
    if (hasRecorded) return "completed";
    return "ready";
  };

  const buttonState = getButtonState();

  return (
    <div className="text-center space-y-8">
      {/* Permission Status */}
      {permission === "denied" && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2 text-destructive">
            <AlertCircle className="w-4 h-4" />
            <p className="text-sm font-medium">Microphone access required</p>
          </div>
          <p className="text-xs text-destructive/80 mt-1">
            Please enable microphone permissions in your browser settings and refresh the page.
          </p>
        </div>
      )}

      {/* Main Recording Button */}
      <div className="relative">
        <motion.button
          onClick={handleButtonClick}
          disabled={!!error || isProcessing || permission === "denied"}
          className={`
            relative w-28 h-28 rounded-full font-medium text-lg transition-all duration-300
            flex items-center justify-center mx-auto shadow-lg
            ${buttonState === "recording" 
              ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground recording-pulse' 
              : buttonState === "completed"
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
              : buttonState === "processing"
              ? 'bg-muted cursor-not-allowed'
              : 'bg-primary hover:bg-primary/90 hover:scale-105 text-primary-foreground btn-hover'
            }
            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
          `}
          whileTap={{ scale: 0.95 }}
          aria-label={
            recording ? "Stop recording" : 
            isProcessing ? "Processing..." :
            hasRecorded ? "Recording completed" :
            "Start recording"
          }
        >
          {isProcessing ? (
            <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : recording ? (
            <Square className="w-10 h-10" />
          ) : hasRecorded ? (
            <CheckCircle className="w-10 h-10" />
          ) : (
            <Mic className="w-10 h-10" />
          )}
        </motion.button>

        {/* Recording Pulse Ring */}
        {recording && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ 
              scale: [1, 1.2, 1], 
              opacity: [0.3, 0.1, 0.3] 
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 rounded-full border-4 border-destructive pointer-events-none"
          />
        )}

        {/* Audio Level Indicator */}
        {recording && (
          <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
            <div className="flex items-center space-x-1">
              <Volume2 className="w-3 h-3 text-muted-foreground" />
              <div className="flex space-x-1">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 h-4 bg-primary rounded-full"
                    animate={{
                      scaleY: [0.3, 1, 0.3],
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      delay: i * 0.1,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Timer and Status */}
      <div className="space-y-3">
        <div className="relative">
          <p className="text-3xl font-mono tabular-nums text-foreground">
            {Math.floor(elapsed / 60).toString().padStart(2, '0')}:
            {(elapsed % 60).toString().padStart(2, '0')}
          </p>
          {maxSeconds > 0 && (
            <div className="w-48 h-1 bg-muted rounded-full mx-auto mt-2 overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                style={{ width: `${(elapsed / maxSeconds) * 100}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          )}
        </div>
        
        <p className="text-sm text-muted-foreground claude-text">
          {isProcessing ? 
            'Processing...' :
          recording ? 
            `Recording in progress... (${maxSeconds - elapsed}s remaining)` : 
          hasRecorded ?
            'Recording completed! Upload successful.' :
            `Click to start recording (max ${maxSeconds}s)`
          }
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-destructive/10 border border-destructive/20 rounded-lg p-4"
        >
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-destructive">Recording Error</p>
              <p className="text-xs text-destructive/80 mt-1">{error}</p>
              <button
                onClick={clearError}
                className="text-xs text-destructive hover:text-destructive/80 underline mt-2"
              >
                Try again
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Success Message */}
      {hasRecorded && !error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4"
        >
          <div className="flex items-center space-x-2 text-emerald-600">
            <CheckCircle className="w-4 h-4" />
            <p className="text-sm font-medium">Recording uploaded successfully!</p>
          </div>
          <p className="text-xs text-emerald-600/80 mt-1">
            Your audio is being analyzed. Results will appear below.
          </p>
        </motion.div>
      )}

      {/* Recording Tips */}
      {!recording && !hasRecorded && !error && (
        <div className="bg-muted/50 rounded-lg p-4 text-left">
          <h4 className="text-sm font-medium mb-2 claude-text">Recording Tips:</h4>
          <ul className="text-xs text-muted-foreground space-y-1 claude-text">
            <li>• Speak clearly and at a normal pace</li>
            <li>• Find a quiet environment</li>
            <li>• Keep your microphone close</li>
            <li>• Record for at least 10-15 seconds</li>
          </ul>
        </div>
      )}
    </div>
  );
}