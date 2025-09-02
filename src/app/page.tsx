"use client";
import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Mic, Upload, Zap, BarChart3, MessageSquare, ChevronRight, Moon, Sun, Copy, Check, Clock, FileText } from "lucide-react";
import { useTheme } from "next-themes";
import Recorder from "@/components/Recorder";
import ScoreCard from "@/components/ScoreCard";
import EnhancedScoreCard from "@/components/EnhancedScoreCard";
import { QuoteUpgrades } from "@/components/QuoteUpgrades";
import { DirectQuotes } from "@/components/DirectQuotes";
import ResumeUploader from "@/components/ResumeUploader";
import PitchLengthSlider from "@/components/PitchLengthSlider";
import GeneratedPitch from "@/components/GeneratedPitch";
import { computeMetrics } from "@/lib/metrics";
import { createRecorder, type RecordingResult } from "@/utils/recorder";
import type { CoachingResponse, Metrics } from "@/lib/types";
import { validateCoachingResponse } from "@/lib/coaching-schema";

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="fixed top-6 right-6 p-2.5 rounded-xl bg-card/80 border border-border backdrop-blur-sm z-50 w-10 h-10" />
    );
  }
  
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="fixed top-6 right-6 p-2.5 rounded-xl bg-card/80 hover:bg-accent border border-border backdrop-blur-sm transition-all z-50 group hover:scale-105 active:scale-95"
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
  const [coach, setCoach] = useState<CoachingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState("");
  const [pitchLength, setPitchLength] = useState(50);
  const [generatedPitch, setGeneratedPitch] = useState("");
  const [isGeneratingPitch, setIsGeneratingPitch] = useState(false);
  const [isAdjustingPitch, setIsAdjustingPitch] = useState(false);
  const [originalPitchLength, setOriginalPitchLength] = useState(50);
  const [copiedScript, setCopiedScript] = useState(false);
  const [isDeepMode, setIsDeepMode] = useState(false);
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
        body: JSON.stringify({ 
          transcript: transcriptText, 
          metrics: m,
          depth: isDeepMode ? "deep" : "brief"
        }),
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

  async function copyPolishedScript(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    }
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

          <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
            <div className="max-w-4xl mx-auto">
              {/* Header Section */}
              <div className="bg-gradient-to-r from-primary/5 to-primary/10 px-8 py-6 border-b border-border">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold claude-text">Create Your Pitch</h3>
                    <p className="text-sm text-muted-foreground">Upload your resume and customize your pitch</p>
                  </div>
                </div>
              </div>

              {/* Content Section */}
              <div className="p-8 space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Left Column - File Upload */}
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label htmlFor="resume-upload" className="text-sm font-medium claude-text flex items-center space-x-2">
                        <Upload className="w-4 h-4" />
                        <span>Resume Upload</span>
                      </label>
                      <div className="relative">
                        <input
                          id="resume-upload"
                          name="resume-upload"
                          type="file"
                          accept=".pdf,.docx,.txt"
                          onChange={(e) => e.target.files?.[0] && setResumeFile(e.target.files[0])}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          disabled={isGeneratingPitch}
                          aria-label="Upload resume file"
                        />
                        <div className={`
                          border-2 border-dashed rounded-xl p-6 text-center transition-all
                          ${resumeFile 
                            ? 'border-primary/50 bg-primary/5' 
                            : 'border-border hover:border-primary/30 hover:bg-primary/5'
                          }
                          ${isGeneratingPitch ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        `}>
                          {resumeFile ? (
                            <div className="space-y-3">
                              <div className="w-12 h-12 bg-primary/10 rounded-xl mx-auto flex items-center justify-center">
                                <FileText className="w-6 h-6 text-primary" />
                              </div>
                              <div>
                                <p className="text-sm font-medium claude-text truncate">{resumeFile.name}</p>
                                <p className="text-xs text-primary font-medium mt-1">✓ File ready</p>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                              <div>
                                <p className="text-sm claude-text font-medium">Drop your resume here</p>
                                <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
                                <p className="text-xs text-muted-foreground">PDF, DOCX, TXT (max 10MB)</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <label htmlFor="target-role" className="text-sm font-medium claude-text flex items-center space-x-2">
                        <MessageSquare className="w-4 h-4" />
                        <span>Target Role</span>
                        <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                      </label>
                      <input
                        id="target-role"
                        name="target-role"
                        type="text"
                        value={targetRole}
                        onChange={(e) => setTargetRole(e.target.value)}
                        placeholder="e.g., Software Engineer, Product Manager..."
                        className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all claude-text text-sm"
                        disabled={isGeneratingPitch}
                      />
                    </div>
                  </div>

                  {/* Right Column - Pitch Settings */}
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <label className="text-sm font-medium claude-text flex items-center space-x-2">
                        <Clock className="w-4 h-4" />
                        <span>Pitch Length</span>
                      </label>
                      <PitchLengthSlider
                        value={pitchLength}
                        onChange={setPitchLength}
                        disabled={isGeneratingPitch}
                      />
                    </div>
                    
                    <div className="pt-4">
                      <button
                        onClick={handleGeneratePitch}
                        disabled={!resumeFile || isGeneratingPitch}
                        className="w-full bg-primary hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] text-primary-foreground px-6 py-4 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center space-x-3 claude-button shadow-lg hover:shadow-xl"
                        aria-label={isGeneratingPitch ? "Generating pitch..." : "Generate elevator pitch"}
                      >
                        {isGeneratingPitch ? (
                          <div className="flex items-center space-x-3">
                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            <span>Generating your pitch...</span>
                          </div>
                        ) : (
                          <>
                            <Zap className="w-5 h-5" />
                            <span>Generate Pitch</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {generatedPitch && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.6 }}
                  className="mt-8 pt-8 border-t border-border"
                >
                  <GeneratedPitch
                    pitch={generatedPitch}
                    targetSeconds={pitchLength}
                    isGenerating={isGeneratingPitch}
                    isAdjusting={isAdjustingPitch}
                    onPractice={handlePracticeGenerated}
                    onLengthChange={handlePitchLengthChange}
                    currentLength={pitchLength}
                    onLengthUpdate={setPitchLength}
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
            <div className="flex items-center gap-3 mb-6 p-4 bg-muted/30 rounded-xl">
              <input
                type="checkbox"
                id="deep-mode"
                checked={isDeepMode}
                onChange={(e) => setIsDeepMode(e.target.checked)}
                className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
              />
              <label htmlFor="deep-mode" className="text-sm font-medium claude-text cursor-pointer">
                Deep-dive coaching
              </label>
              <span className="text-xs text-muted-foreground claude-text">
                {isDeepMode ? "Comprehensive analysis with detailed breakdowns" : "Quick feedback focused on key improvements"}
              </span>
            </div>
            
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
              {metrics && coach && 'overallScore' in coach && 'executivePresence' in coach ? (
                <>
                  {/* Brief Mode: Compact Layout */}
                  {!isDeepMode ? (
                    <>
                      <div className="bg-card border rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-medium claude-text">Quick Analysis</h3>
                          <div className="text-2xl font-bold text-primary">{coach.overallScore}/10</div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">{coach.mirrorBack}</p>
                        <p className="text-sm font-medium text-foreground">{coach.breakthrough}</p>
                      </div>
                      
                      {coach.directQuotes && coach.directQuotes.length > 0 && (
                        <DirectQuotes quotes={coach.directQuotes} />
                      )}
                      
                      {coach.lineEdits && coach.lineEdits.length > 0 && (
                        <QuoteUpgrades edits={coach.lineEdits} />
                      )}
                      
                      <div className="bg-card border rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-medium claude-text">Polished Script</h3>
                          <button
                            onClick={() => copyPolishedScript(coach.polishedScript)}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors"
                            title="Copy to clipboard"
                          >
                            {copiedScript ? (
                              <>
                                <Check className="w-4 h-4" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4" />
                                Copy
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-muted-foreground leading-relaxed claude-text">{coach.polishedScript}</p>
                      </div>
                      
                      {coach.coachingTips && coach.coachingTips.length > 0 && (
                        <div className="bg-card border rounded-2xl p-6">
                          <h3 className="text-lg font-medium mb-4 claude-text">Action Items</h3>
                          <ul className="space-y-2">
                            {coach.coachingTips.map((tip: string, i: number) => (
                              <li key={i} className="flex items-start space-x-2">
                                <ChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-foreground claude-text">{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    /* Deep Mode: Full Layout */
                    <>
                      <EnhancedScoreCard metrics={metrics} coaching={coach} />
                      {coach.directQuotes && coach.directQuotes.length > 0 && (
                        <DirectQuotes quotes={coach.directQuotes} />
                      )}
                      {coach.lineEdits && coach.lineEdits.length > 0 && (
                        <QuoteUpgrades edits={coach.lineEdits} />
                      )}
                    </>
                  )}
                </>
              ) : (
                metrics && <ScoreCard m={metrics} />
              )}

      {transcript && (
                <div className="bg-card border rounded-2xl p-6">
                  <h3 className="text-lg font-medium mb-4 claude-text">Transcript</h3>
                  <p className="text-muted-foreground leading-relaxed claude-text">{transcript}</p>
                </div>
      )}

      {coach && !('overallScore' in coach) && (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6">
                    <h3 className="text-lg font-medium text-emerald-600 dark:text-emerald-400 mb-4 claude-text">Strengths</h3>
                    <ul className="space-y-2">
                      {(coach as any).strengths?.map((s: string, i: number) => (
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
                      {(coach as any).improvements?.map((s: string, i: number) => (
                        <li key={i} className="flex items-start space-x-2">
                          <ChevronRight className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-blue-700 dark:text-blue-300 claude-text">{s}</span>
                        </li>
                      ))}
            </ul>
          </div>

                  <div className="md:col-span-2 bg-card border rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium claude-text">Polished Script</h3>
                      <button
                        onClick={() => copyPolishedScript((coach as any).polishedScript)}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors"
                        title="Copy to clipboard"
                      >
                        {copiedScript ? (
                          <>
                            <Check className="w-4 h-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-muted-foreground leading-relaxed claude-text">{(coach as any).polishedScript}</p>
                  </div>

                  <div className="md:col-span-2 bg-card border rounded-2xl p-6">
                    <h3 className="text-lg font-medium mb-4 claude-text">LinkedIn About Section</h3>
                    <p className="text-muted-foreground leading-relaxed claude-text">{(coach as any).aboutRewrite}</p>
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