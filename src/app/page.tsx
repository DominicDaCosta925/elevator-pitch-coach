"use client";



import React, { useState } from "react";
import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { ResumeUploadCard } from "@/components/cards/ResumeUploadCard";
import { PitchSettingsCard } from "@/components/cards/PitchSettingsCard";
import { PracticeCard } from "@/components/cards/PracticeCard";
import { ResultsCard } from "@/components/cards/ResultsCard";

import { createRecorder } from "@/utils/recorder";
import { computeMetrics } from "@/lib/metrics";
import type { CoachingResponse, Metrics } from "@/lib/types";

interface RecordingResult {
  blob: Blob;
  durationSec: number;
  mimeType: string;
}

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-9 h-9 rounded-lg bg-card border" />;
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 border border-border bg-transparent text-foreground hover:bg-secondary rounded-lg transition-colors outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  );
};

export default function ElevatorPitchCoach() {
  console.log("LIVE: src/app/page.tsx");
  
  // Debug CSS variables
  React.useEffect(() => {
    const html = document.documentElement;
    const computedStyle = getComputedStyle(html);
    console.log("🎨 CSS Variables Debug:");
    console.log("HTML classes:", html.className);
    console.log("--background:", computedStyle.getPropertyValue('--background'));
    console.log("--card:", computedStyle.getPropertyValue('--card'));
    console.log("--primary:", computedStyle.getPropertyValue('--primary'));
    console.log("--accent:", computedStyle.getPropertyValue('--accent'));
  }, []);
  
  // File & Generation State
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [generatedPitch, setGeneratedPitch] = useState<string>("");
  const [isGeneratingPitch, setIsGeneratingPitch] = useState(false);
  
  // Settings State
  const [selectedDuration, setSelectedDuration] = useState<30 | 60 | 90>(60);
  const [selectedDepth, setSelectedDepth] = useState<"brief" | "deep">("brief");
  const [targetRole, setTargetRole] = useState("");

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  
  // Coaching State
  const [coaching, setCoaching] = useState<CoachingResponse | null>(null);
  const [isCoaching, setIsCoaching] = useState(false);
  
  // UI State
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState("");

  // File Upload Handler
  const handleFileSelect = async (file: File | null) => {
    if (!file) {
      setResumeFile(null);
      return;
    }

    try {
      setResumeFile(file);
      setError("");
    } catch (err) {
      setError("Failed to process resume file");
      console.error("File processing error:", err);
    }
  };

  // Generate Pitch Handler
  const handleGeneratePitch = async () => {
    if (!resumeFile) return;

    setIsGeneratingPitch(true);
    setError("");

    try {
      // First analyze the resume
      const formData = new FormData();
      formData.append("file", resumeFile);

      const analyzeRes = await fetch("/api/resume-analyze", {
        method: "POST",
        body: formData,
      });

      if (!analyzeRes.ok) {
        throw new Error("Failed to analyze resume");
      }

      const analyzeData = await analyzeRes.json();

      // Then generate the pitch
      const generateRes = await fetch("/api/generate-pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: analyzeData.text,
          targetSeconds: selectedDuration,
          targetRole: targetRole || "General",
        }),
      });

      if (!generateRes.ok) {
        throw new Error("Failed to generate pitch");
      }

      const generateData = await generateRes.json();
      setGeneratedPitch(generateData.pitch);
      
      toast.success("Pitch generated successfully! Practice it below.");
    } catch (err) {
      setError("Failed to generate pitch. Please try again.");
      console.error("Pitch generation error:", err);
    } finally {
      setIsGeneratingPitch(false);
    }
  };

  // Recording Handlers
  const handleStartRecording = async () => {
    try {
      setError("");
      setIsRecording(true);
      
      const recorder = await createRecorder();
      await recorder.start();
      
      // Store recorder instance for stopping
      (window as any).__recorder = recorder;
    } catch (err) {
      setError("Failed to start recording. Please check microphone permissions.");
      setIsRecording(false);
      console.error("Recording start error:", err);
    }
  };

  const handleStopRecording = async () => {
    try {
      const recorder = (window as any).__recorder;
      if (!recorder) {
        throw new Error("No active recorder found");
      }

      const result: RecordingResult = await recorder.stop();
      setIsRecording(false);
      
      // Process the recording
      await handleRecorded(result);
    } catch (err) {
      setError("Failed to stop recording. Please try again.");
      setIsRecording(false);
      console.error("Recording stop error:", err);
    }
  };

  const handleRecorded = async (result: RecordingResult) => {
    try {
      setError("");
      
      // Create form data for transcription
      const formData = new FormData();
      const audioFile = new File([result.blob], `rec-${Date.now()}.webm`, {
        type: result.mimeType || "audio/webm",
      });
      formData.append("file", audioFile);
      formData.append("durationSec", result.durationSec.toFixed(2));

      // Transcribe audio
      const transcribeRes = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
        cache: "no-store",
      });

      if (!transcribeRes.ok) {
        throw new Error("Transcription failed");
      }

      const transcribeData = await transcribeRes.json();
      
      if (!transcribeData.transcript?.trim()) {
        throw new Error("No speech detected. Please try recording again.");
      }

      setTranscript(transcribeData.transcript);
      
      // Compute metrics
      const computedMetrics = computeMetrics(transcribeData.transcript, result.durationSec);
      setMetrics(computedMetrics);

      // Get AI coaching
      await getCoaching(transcribeData.transcript, computedMetrics);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process recording");
      console.error("Recording processing error:", err);
    }
  };

  const getCoaching = async (transcript: string, metrics: Metrics) => {
    setIsCoaching(true);
    
    try {
      const coachRes = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          metrics,
          targetRole: targetRole || "General",
          pitchLengthSec: selectedDuration,
          depth: selectedDepth,
        }),
      });

      if (!coachRes.ok) {
        throw new Error("Coaching analysis failed");
      }

      const coachData = await coachRes.json();
      setCoaching(coachData);
      
    } catch (err) {
      setError("Failed to get coaching feedback. Please try again.");
      console.error("Coaching error:", err);
    } finally {
      setIsCoaching(false);
    }
  };

  // Copy Handler
  const handleCopy = async () => {
    const textToCopy = coaching?.polishedScript || generatedPitch;
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      toast.success("Script copied to clipboard!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="mx-auto max-w-screen-2xl w-full px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div>
              <h1 className="text-2xl font-heading font-bold h-heading text-foreground">
                Elevator Pitch Coach
              </h1>
              <p className="text-sm text-muted-foreground">
                AI-powered practice and feedback
              </p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8">
        <div className="mx-auto max-w-screen-2xl w-full px-4 sm:px-6 lg:px-8">
        <div className="rounded-xl p-3 mb-4 bg-card text-card-foreground border border-border">
          TOKEN TEST (Tailwind) — this box should be dark gray with light text.
        </div>
        <div className="rounded-xl p-3 mb-4" style={{ background: "var(--card)", color: "var(--card-foreground)", border: "1px solid var(--border)" }}>
          TOKEN TEST (Inline) — this box should be dark gray with light text.
        </div>
        {/* Error Banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
          >
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </motion.div>
        )}

        {/* Two Column Grid - Figma Layout */}
        <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
          {/* Left Column */}
          <div className="space-y-6">
            <ResumeUploadCard
              onFileSelect={handleFileSelect}
              selectedFile={resumeFile}
              isProcessing={isGeneratingPitch}
            />
            
            <PitchSettingsCard
              selectedDuration={selectedDuration}
              onDurationChange={setSelectedDuration}
              selectedDepth={selectedDepth}
              onDepthChange={setSelectedDepth}
              targetRole={targetRole}
              onTargetRoleChange={setTargetRole}
              onGeneratePitch={handleGeneratePitch}
              isGenerating={isGeneratingPitch}
              hasResumeFile={!!resumeFile}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <PracticeCard
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
              isRecording={isRecording}
              isDisabled={!generatedPitch}
              generatedPitch={generatedPitch}
            />
            
            <ResultsCard
              coaching={coaching || undefined}
              polishedScript={generatedPitch}
              onCopy={handleCopy}
              isCopied={isCopied}
            />
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}