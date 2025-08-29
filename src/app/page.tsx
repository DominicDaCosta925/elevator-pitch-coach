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
      className="fixed top-6 right-6 p-2.5 rounded-xl bg-card/80 hover:bg-accent border border-border backdrop-blur-sm transition-all z-50 group"
    >
      <div className="relative w-5 h-5">
        {theme === "dark" ? (
          <Sun className="h-5 w-5 text-primary group-hover:text-primary/80 transition-colors" />
        ) : (
          <Moon className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
        )}
      </div>
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
      
      {/* Hero Section - Claude Style */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-primary/3" />
        <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center space-y-8"
          >
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm">
              <div className="w-2 h-2 bg-primary rounded-full mr-3 animate-pulse" />
              <span className="text-sm font-medium text-primary claude-text">AI-Powered Coaching</span>
            </div>
            
            <div className="space-y-6">
              <h1 className="text-6xl md:text-7xl font-light tracking-tight claude-text">
                Perfect Your
                <span className="text-primary font-medium block mt-2">Elevator Pitch</span>
              </h1>
              
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed claude-text">
                Practice with AI feedback, generate personalized pitches from your resume, 
                and build confidence for any opportunity.
              </p>
            </div>

            <div className="flex items-center justify-center space-x-12 pt-8">
              <div className="flex items-center text-sm text-muted-foreground claude-text">
                <div className="w-1.5 h-1.5 bg-primary rounded-full mr-3" />
                Real-time Analysis
              </div>
              <div className="flex items-center text-sm text-muted-foreground claude-text">
                <div className="w-1.5 h-1.5 bg-primary rounded-full mr-3" />
                Performance Metrics
              </div>
              <div className="flex items-center text-sm text-muted-foreground claude-text">
                <div className="w-1.5 h-1.5 bg-primary rounded-full mr-3" />
                Personalized Coaching
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 space-y-16 pb-20">
        
        {/* Generate Section - More Compact */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="space-y-8"
        >
          <div className="text-center space-y-4">
            <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium claude-text">
              <Upload className="w-3.5 h-3.5 mr-2" />
              Step 1: Generate
            </div>
            <h2 className="text-4xl font-light claude-text">Create Your Pitch</h2>
            <p className="text-muted-foreground max-w-xl mx-auto claude-text">
              Upload your resume and let AI craft a personalized elevator pitch
            </p>
          </div>

          <div className="bg-card border rounded-2xl p-6 shadow-sm">
            <div className="max-w-4xl mx-auto">
              <div className="grid lg:grid-cols-3 gap-6 items-start">
                {/* Compact Upload Area */}
                <div className="lg:col-span-1 space-y-4">
                  <div className="space-y-3">
                    <label className="text-sm font-medium claude-text">Upload Resume</label>
                    <div className="relative">
                      <input
                        type="file"
                        accept=".pdf,.docx,.txt"
                        onChange={(e) => e.target.files?.[0] && setResumeFile(e.target.files[0])}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={isGeneratingPitch}
                      />
                      <div className={`
                        border-2 border-dashed rounded-xl p-4 text-center transition-all
                        ${resumeFile 
                          ? 'border-primary/50 bg-primary/5' 
                          : 'border-border hover:border-primary/30'
                        }
                      `}>
                        <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                        {resumeFile ? (
                          <div className="space-y-1">
                            <p className="text-sm font-medium claude-text truncate">{resumeFile.name}</p>
                            <p className="text-xs text-primary">Ready to generate</p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-sm claude-text">Drop file or click</p>
                            <p className="text-xs text-muted-foreground">PDF, DOCX, TXT</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium claude-text">Target Role</label>
                    <input
                      type="text"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      placeholder="Software Engineer..."
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all claude-text text-sm"
                    />
                  </div>
                </div>

                {/* Pitch Length & Generate */}
                <div className="lg:col-span-2 space-y-6">
                  <PitchLengthSlider
                    value={pitchLength}
                    onChange={setPitchLength}
                    disabled={isGeneratingPitch}
                  />
                  
                  <button
                    onClick={handleGeneratePitch}
                    disabled={!resumeFile || isGeneratingPitch}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 claude-button"
                  >
                    {isGeneratingPitch ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        <span>Generating your pitch...</span>
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
                  className="mt-8 pt-8 border-t border-border"
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
            <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium claude-text">
              <Mic className="w-3.5 h-3.5 mr-2" />
              Step 2: Practice
            </div>
            <h2 className="text-4xl font-light claude-text">Record & Improve</h2>
            <p className="text-muted-foreground max-w-xl mx-auto claude-text">
              Practice your pitch and receive AI-powered feedback on timing, clarity, and delivery
            </p>
          </div>

          <div className="bg-card border rounded-2xl p-8 shadow-sm">
            <Recorder onRecorded={handleRecorded} maxSeconds={90} />
            
            {loading && (
              <div className="mt-8 flex items-center justify-center py-12">
                <div className="text-center space-y-4">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-muted-foreground claude-text">Analyzing your pitch...</p>
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
              <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium claude-text">
                <BarChart3 className="w-3.5 h-3.5 mr-2" />
                Your Results
              </div>
              <h2 className="text-4xl font-light claude-text">Performance Analysis</h2>
            </div>

            <div className="space-y-8">
              {metrics && <ScoreCard m={metrics} />}

              {transcript && (
                <div className="bg-card border rounded-2xl p-6">
                  <h3 className="text-lg font-medium mb-4 claude-text">Transcript</h3>
                  <p className="text-muted-foreground leading-relaxed claude-text">{transcript}</p>
                </div>
              )}

              {coach && (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6">
                    <h3 className="text-lg font-medium text-emerald-600 dark:text-emerald-400 mb-4 claude-text">Strengths</h3>
                    <ul className="space-y-2">
                      {coach.strengths?.map((s: string, i: number) => (
                        <li key={i} className="flex items-start space-x-2">
                          <ChevronRight className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-emerald-700 dark:text-emerald-300 claude-text">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6">
                    <h3 className="text-lg font-medium text-blue-600 dark:text-blue-400 mb-4 claude-text">Improvements</h3>
                    <ul className="space-y-2">
                      {coach.improvements?.map((s: string, i: number) => (
                        <li key={i} className="flex items-start space-x-2">
                          <ChevronRight className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-blue-700 dark:text-blue-300 claude-text">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="md:col-span-2 bg-card border rounded-2xl p-6">
                    <h3 className="text-lg font-medium mb-4 claude-text">Polished Script</h3>
                    <p className="text-muted-foreground leading-relaxed claude-text">{coach.polishedScript}</p>
                  </div>

                  <div className="md:col-span-2 bg-card border rounded-2xl p-6">
                    <h3 className="text-lg font-medium mb-4 claude-text">LinkedIn About Section</h3>
                    <p className="text-muted-foreground leading-relaxed claude-text">{coach.aboutRewrite}</p>
                  </div>
                </div>
              )}
            </div>
          </motion.section>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-6">
            <h3 className="font-medium text-destructive mb-2 claude-text">Something went wrong</h3>
            <p className="text-destructive/80 claude-text">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}