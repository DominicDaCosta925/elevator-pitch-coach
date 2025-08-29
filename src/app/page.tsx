"use client";
import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Mic, Upload, Zap, BarChart3, MessageSquare, ChevronRight, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import Recorder from "@/components/Recorder";
import ScoreCard from "@/components/ScoreCard";
import ResumeUploader from "@/components/ResumeUploader";
import PitchLengthSlider from "@/components/PitchLengthSlider";
import GeneratedPitch from "@/components/GeneratedPitch";
import { computeMetrics } from "@/lib/metrics";
import { createRecorder, type RecordingResult } from "@/utils/recorder";
import type { Metrics } from "@/lib/types";

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="fixed top-6 right-6 p-2 rounded-full bg-card hover:bg-accent transition-colors z-50 border"
    >
      {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
};

export default function Page() {
  const [transcript, setTranscript] = useState("");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [coach, setCoach] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState("");
  const [pitchLength, setPitchLength] = useState(50);
  const [generatedPitch, setGeneratedPitch] = useState("");
  const [isGeneratingPitch, setIsGeneratingPitch] = useState(false);
  const [isAdjustingPitch, setIsAdjustingPitch] = useState(false);
  const [originalPitchLength, setOriginalPitchLength] = useState(50);
  const recorderRef = useRef<HTMLDivElement>(null);

  async function uploadBlob(blob: Blob, durationSec: number, mimeType: string) {
    const file = new File([blob], `rec-${Date.now()}.webm`, { type: mimeType || 'audio/webm' });
    const form = new FormData();
    form.append("file", file);
    form.append("durationSec", String(Math.round(durationSec * 100) / 100));

    const res = await fetch("/api/transcribe", {
      method: "POST",
      body: form,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`transcribe failed: ${res.status}`);
    const data = await res.json();
    return data.text as string;
  }

  async function handleRecorded({ blob, durationSec, mimeType }: RecordingResult) {
    try {
      setLoading(true);
      setTranscript("");
      setMetrics(null);
      setCoach(null);
      setError(null);

      const transcriptText = await uploadBlob(blob, durationSec, mimeType);
      
      if (!transcriptText || typeof transcriptText !== "string") {
        setError("No transcript was generated. Please try recording again.");
        return;
      }

      setTranscript(transcriptText);
      const m = computeMetrics(transcriptText, durationSec);
      setMetrics(m);

      const cRes = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: transcriptText, metrics: m }),
      });
      const cJson = await cRes.json();
      setCoach(cJson);
    } catch (err) {
      setError("Something went wrong while processing your recording. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGeneratePitch() {
    if (!resumeFile) return;

    try {
      setIsGeneratingPitch(true);
      setError(null);

      const analyzeForm = new FormData();
      analyzeForm.append("file", resumeFile);
      
      const analyzeRes = await fetch("/api/resume-analyze", {
        method: "POST",
        body: analyzeForm,
      });
      
      if (!analyzeRes.ok) {
        const analyzeError = await analyzeRes.json();
        throw new Error(analyzeError.error || "Failed to analyze resume");
      }

      const analyzeData = await analyzeRes.json();

      const generateRes = await fetch("/api/generate-pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: analyzeData.text,
          targetSeconds: pitchLength,
          targetRole: targetRole.trim() || undefined,
        }),
      });

      if (!generateRes.ok) {
        const generateError = await generateRes.json();
        throw new Error(generateError.error || "Failed to generate pitch");
      }

      const pitchData = await generateRes.json();
      setGeneratedPitch(pitchData.pitch);
      setOriginalPitchLength(pitchLength);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate pitch. Please try again.");
    } finally {
      setIsGeneratingPitch(false);
    }
  }

  async function handlePitchLengthChange(newLength: number) {
    if (!generatedPitch || newLength === originalPitchLength) return;

    try {
      setIsAdjustingPitch(true);
      
      const adjustRes = await fetch("/api/adjust-pitch-length", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPitch: generatedPitch,
          targetSeconds: newLength,
          originalTargetSeconds: originalPitchLength,
        }),
      });

      if (!adjustRes.ok) {
        const adjustError = await adjustRes.json();
        throw new Error(adjustError.error || "Failed to adjust pitch length");
      }

      const adjustData = await adjustRes.json();
      setGeneratedPitch(adjustData.pitch);
      setOriginalPitchLength(newLength);

    } catch (err) {
      setError("Failed to adjust pitch length. Please try again.");
    } finally {
      setIsAdjustingPitch(false);
    }
  }

  function handlePracticeGenerated() {
    recorderRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ThemeToggle />
      
      {/* Hero Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center space-y-8"
          >
            <div className="inline-flex items-center px-4 py-2 rounded-full border bg-card/50 backdrop-blur-sm">
              <Zap className="w-4 h-4 mr-2 text-primary" />
              <span className="text-sm font-medium">AI-Powered Coaching</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
              Perfect Your
              <span className="text-primary block">Elevator Pitch</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Practice with AI feedback, generate personalized pitches from your resume, 
              and build confidence for any opportunity.
            </p>

            <div className="flex items-center justify-center space-x-8 pt-8">
              <div className="flex items-center text-sm text-muted-foreground">
                <MessageSquare className="w-4 h-4 mr-2" />
                Real-time Analysis
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <BarChart3 className="w-4 h-4 mr-2" />
                Performance Metrics
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Zap className="w-4 h-4 mr-2" />
                Personalized Coaching
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 space-y-16 pb-20">
        
        {/* Generate Section */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="space-y-8"
        >
          <div className="text-center space-y-4">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Upload className="w-4 h-4 mr-2" />
              Step 1: Generate
            </div>
            <h2 className="text-3xl font-bold">Create Your Pitch</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Upload your resume and let AI craft a personalized elevator pitch tailored to your experience
            </p>
          </div>

          <div className="bg-card border rounded-2xl p-8 shadow-lg">
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <ResumeUploader 
                  onFileUploaded={setResumeFile} 
                  isProcessing={isGeneratingPitch}
                />
                
                <div className="space-y-3">
                  <label className="text-sm font-medium">Target Role (Optional)</label>
                  <input
                    type="text"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    placeholder="Software Engineer, Product Manager..."
                    className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <PitchLengthSlider
                  value={pitchLength}
                  onChange={setPitchLength}
                  disabled={isGeneratingPitch}
                />
                
                <button
                  onClick={handleGeneratePitch}
                  disabled={!resumeFile || isGeneratingPitch}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-4 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isGeneratingPitch ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Generating...</span>
                    </div>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Generate Pitch</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {generatedPitch && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.6 }}
                className="mt-8 pt-8 border-t"
              >
                <PitchLengthSlider
                  value={pitchLength}
                  onChange={setPitchLength}
                  onChangeComplete={handlePitchLengthChange}
                  disabled={isGeneratingPitch}
                  isUpdating={isAdjustingPitch}
                />
                
                <GeneratedPitch
                  pitch={generatedPitch}
                  targetSeconds={pitchLength}
                  isGenerating={isGeneratingPitch}
                  isAdjusting={isAdjustingPitch}
                  onPractice={handlePracticeGenerated}
                />
              </motion.div>
            )}
          </div>
        </motion.section>

        {/* Practice Section */}
        <motion.section
          ref={recorderRef}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="space-y-8"
        >
          <div className="text-center space-y-4">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Mic className="w-4 h-4 mr-2" />
              Step 2: Practice
            </div>
            <h2 className="text-3xl font-bold">Record & Improve</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Practice your pitch and receive AI-powered feedback on timing, clarity, and delivery
            </p>
          </div>

          <div className="bg-card border rounded-2xl p-8 shadow-lg">
            <Recorder onRecorded={handleRecorded} maxSeconds={90} />
            
            {loading && (
              <div className="mt-8 flex items-center justify-center py-12">
                <div className="text-center space-y-4">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-muted-foreground">Analyzing your pitch...</p>
                </div>
              </div>
            )}
          </div>
        </motion.section>

        {/* Results Section */}
        {(metrics || transcript || coach) && (
          <motion.section
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="text-center space-y-4">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <BarChart3 className="w-4 h-4 mr-2" />
                Your Results
              </div>
              <h2 className="text-3xl font-bold">Performance Analysis</h2>
            </div>

            <div className="space-y-8">
              {metrics && <ScoreCard m={metrics} />}

              {transcript && (
                <div className="bg-card border rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-4">Transcript</h3>
                  <p className="text-muted-foreground leading-relaxed">{transcript}</p>
                </div>
              )}

              {coach && (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 mb-4">Strengths</h3>
                    <ul className="space-y-2">
                      {coach.strengths?.map((s: string, i: number) => (
                        <li key={i} className="flex items-start space-x-2">
                          <ChevronRight className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-emerald-700 dark:text-emerald-300">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-4">Improvements</h3>
                    <ul className="space-y-2">
                      {coach.improvements?.map((s: string, i: number) => (
                        <li key={i} className="flex items-start space-x-2">
                          <ChevronRight className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-blue-700 dark:text-blue-300">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="md:col-span-2 bg-card border rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4">Polished Script</h3>
                    <p className="text-muted-foreground leading-relaxed">{coach.polishedScript}</p>
                  </div>

                  <div className="md:col-span-2 bg-card border rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4">LinkedIn About Section</h3>
                    <p className="text-muted-foreground leading-relaxed">{coach.aboutRewrite}</p>
                  </div>
                </div>
              )}
            </div>
          </motion.section>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-6">
            <h3 className="font-semibold text-destructive mb-2">Something went wrong</h3>
            <p className="text-destructive/80">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}