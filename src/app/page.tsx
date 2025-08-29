"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Play, Brain, Target, FileText, Sparkles, TrendingUp, Clock, MessageCircle, CheckCircle } from "lucide-react";

import Recorder from "@/components/Recorder";
import ScoreCard from "@/components/ScoreCard";
import ResumeUploader from "@/components/ResumeUploader";
import PitchLengthSlider from "@/components/PitchLengthSlider";
import GeneratedPitch from "@/components/GeneratedPitch";
import { Button } from "@/components/ui/button";
import { computeMetrics } from "@/lib/metrics";
import { createRecorder, type RecordingResult } from "@/utils/recorder";
import type { Metrics, TranscriptionResult } from "@/lib/types";

export default function Page() {
  const [transcript, setTranscript] = useState("");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [coach, setCoach] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resume-based pitch generation state
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

      const transcribeText = await uploadBlob(blob, durationSec, mimeType);
      if (!transcribeText) {
        throw new Error("No transcript received from server");
      }

      setTranscript(transcribeText);
      const m = computeMetrics(transcribeText, durationSec);
      setMetrics(m);

      const coachRes = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: transcribeText, metrics: m }),
      });
      
      if (coachRes.ok) {
        const coachData = await coachRes.json();
        setCoach(coachData);
      }
    } catch (err) {
      console.error("Recording processing error:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleGeneratePitch() {
    if (!resumeFile) return;

    try {
      setIsGeneratingPitch(true);
      setError(null);

      const formData = new FormData();
      formData.append("file", resumeFile);

      const analyzeRes = await fetch("/api/resume-analyze", {
        method: "POST",
        body: formData,
      });

      if (!analyzeRes.ok) {
        const analyzeError = await analyzeRes.json();
        throw new Error(analyzeError.error || "Failed to analyze resume");
      }

      const analyzeData = await analyzeRes.json();

      const pitchRes = await fetch("/api/generate-pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: analyzeData.text,
          targetSeconds: pitchLength,
          targetRole: targetRole.trim() || undefined,
        }),
      });

      if (!pitchRes.ok) {
        const pitchError = await pitchRes.json();
        throw new Error(pitchError.error || "Failed to generate pitch");
      }

      const pitchData = await pitchRes.json();
      setGeneratedPitch(pitchData.pitch);
      setOriginalPitchLength(pitchLength);
    } catch (err) {
      console.error("Pitch generation error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate pitch");
    } finally {
      setIsGeneratingPitch(false);
    }
  }

  async function handlePitchLengthChange(newLength: number) {
    if (!generatedPitch || newLength === originalPitchLength) return;

    try {
      setIsAdjustingPitch(true);
      setError(null);

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
    } catch (err) {
      console.error("Pitch adjustment error:", err);
      setError(err instanceof Error ? err.message : "Failed to adjust pitch length");
    } finally {
      setIsAdjustingPitch(false);
    }
  }

  function handlePracticeGenerated() {
    recorderRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
    },
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50/30 border-b border-slate-200/60"
      >
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 tracking-tight">
              Elevator Pitch Coach
            </h1>
            <p className="text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto leading-relaxed mb-8">
              Practice and perfect your elevator pitch with AI-powered feedback
            </p>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-wrap justify-center gap-6 text-sm text-slate-500"
            >
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-blue-500" />
                AI-Powered Analysis
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-green-500" />
                Real-time Feedback
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-500" />
                Personalized Coaching
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.header>

      {/* Main Content */}
      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-6xl mx-auto px-6 py-12 space-y-16"
      >
        {/* Resume-Based Pitch Generation */}
        <motion.section 
          variants={itemVariants}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="glass rounded-3xl overflow-hidden shadow-xl border border-white/20"
        >
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white">
            <div className="flex items-center justify-center gap-3 mb-4">
              <FileText className="w-8 h-8" />
              <h2 className="text-3xl font-bold">Generate Your Pitch</h2>
            </div>
            <p className="text-blue-100 text-center max-w-2xl mx-auto">
              Upload your resume and let AI create a personalized elevator pitch tailored to your experience
            </p>
          </div>
          
          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <ResumeUploader
                  onFileUploaded={setResumeFile}
                  isProcessing={isGeneratingPitch}
                />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Target Role or Industry (Optional)
                  </label>
                  <input
                    type="text"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    placeholder="e.g., Software Engineer, Marketing Manager"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    disabled={isGeneratingPitch}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-4">
                    Pitch Length
                  </label>
                  <PitchLengthSlider
                    value={pitchLength}
                    onChange={setPitchLength}
                    onChangeComplete={() => {}}
                    disabled={isGeneratingPitch}
                    isUpdating={false}
                  />
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex justify-center"
            >
              <Button
                onClick={handleGeneratePitch}
                disabled={!resumeFile || isGeneratingPitch}
                loading={isGeneratingPitch}
                size="lg"
                className="px-8"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                {isGeneratingPitch ? "Generating Your Pitch..." : "Generate Pitch"}
              </Button>
            </motion.div>

            <AnimatePresence>
              {generatedPitch && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-6 pt-8 border-t border-slate-200"
                >
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-slate-800 mb-2">Adjust Pitch Length</h3>
                    <p className="text-slate-600">Drag to change length, auto-updates when you release</p>
                  </div>
                  
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
            </AnimatePresence>
          </div>
        </motion.section>

        {/* Practice Section */}
        <motion.section 
          ref={recorderRef} 
          variants={itemVariants}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="glass rounded-3xl overflow-hidden shadow-xl border border-white/20"
        >
          <div className="bg-gradient-to-r from-emerald-500 to-green-600 p-8 text-white">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Mic className="w-8 h-8" />
              <h2 className="text-3xl font-bold">Practice & Get Feedback</h2>
            </div>
            <p className="text-emerald-100 text-center max-w-2xl mx-auto">
              Record yourself practicing your pitch to get personalized coaching and performance insights
            </p>
          </div>
          
          <div className="p-8 space-y-8">
            <Recorder onRecorded={handleRecorded} maxSeconds={30} />
            
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center justify-center py-12 space-y-4"
                >
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-medium text-slate-800 mb-1">Analyzing your pitch...</h3>
                    <p className="text-slate-600">This will take just a moment</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.section>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="bg-red-50 border border-red-200 rounded-2xl p-6 shadow-lg"
            >
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                </div>
                <div>
                  <h3 className="font-semibold text-red-800 mb-1">Something went wrong</h3>
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Section */}
        <AnimatePresence>
          {(metrics || transcript || coach) && (
            <motion.section
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="glass rounded-3xl overflow-hidden shadow-xl border border-white/20"
            >
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-8 text-white">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <TrendingUp className="w-8 h-8" />
                  <h2 className="text-3xl font-bold">Your Results</h2>
                </div>
                <p className="text-purple-100 text-center max-w-2xl mx-auto">
                  Here's your comprehensive performance analysis and personalized coaching feedback
                </p>
              </div>

              <div className="p-8 space-y-8">
                {metrics && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <ScoreCard m={metrics} />
                  </motion.div>
                )}

                {transcript && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <MessageCircle className="w-5 h-5 text-slate-600" />
                      <h3 className="font-semibold text-slate-800">Transcript</h3>
                    </div>
                    <p className="text-slate-700 leading-relaxed">{transcript}</p>
                  </motion.div>
                )}

                {coach && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                  >
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <h3 className="font-semibold text-green-800">Strengths</h3>
                      </div>
                      <ul className="space-y-2 text-green-700">
                        {coach.strengths?.map((s: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Target className="w-5 h-5 text-blue-600" />
                        <h3 className="font-semibold text-blue-800">Areas for Improvement</h3>
                      </div>
                      <ul className="space-y-2 text-blue-700">
                        {coach.improvements?.map((s: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-6 lg:col-span-2">
                      <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-semibold text-indigo-800">Polished Script</h3>
                      </div>
                      <p className="text-indigo-700 leading-relaxed">{coach.polishedScript}</p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-6 lg:col-span-2">
                      <div className="flex items-center gap-2 mb-4">
                        <FileText className="w-5 h-5 text-purple-600" />
                        <h3 className="font-semibold text-purple-800">LinkedIn About Section</h3>
                      </div>
                      <p className="text-purple-700 leading-relaxed">{coach.aboutRewrite}</p>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </motion.main>
    </div>
  );
}