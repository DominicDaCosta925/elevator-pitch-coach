"use client";
import React, { useState, useRef } from "react";
import Recorder from "@/components/Recorder";
import ScoreCard from "@/components/ScoreCard";
import ResumeUploader from "@/components/ResumeUploader";
import PitchLengthSlider from "@/components/PitchLengthSlider";
import GeneratedPitch from "@/components/GeneratedPitch";
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
  const [pitchLength, setPitchLength] = useState(50); // Default 50 seconds
  const [generatedPitch, setGeneratedPitch] = useState("");
  const [isGeneratingPitch, setIsGeneratingPitch] = useState(false);
  const [isAdjustingPitch, setIsAdjustingPitch] = useState(false);
  const [originalPitchLength, setOriginalPitchLength] = useState(50);
  
  const recorderRef = useRef<HTMLDivElement>(null);

  async function uploadBlob(blob: Blob, durationSec: number, mimeType: string) {
    // Fresh File for each request (prevents stale metadata/caching)
    const file = new File([blob], `rec-${Date.now()}.webm`, { type: mimeType || 'audio/webm' });
    const form = new FormData();
    form.append("file", file);
    form.append("durationSec", String(Math.round(durationSec * 100) / 100)); // Round to 2 decimal places

    const res = await fetch("/api/transcribe", {
      method: "POST",
      body: form,
      cache: "no-store", // prevent request caching
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

      // 1) Transcribe
      const transcriptText = await uploadBlob(blob, durationSec, mimeType);
      
      if (!transcriptText || typeof transcriptText !== "string") {
        console.error("No transcript received from API");
        setError("No transcript was generated. Please try recording again.");
        return;
      }

      setTranscript(transcriptText);
      const m = computeMetrics(transcriptText, durationSec);
      setMetrics(m);

      // 2) Coach
      const cRes = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: transcriptText, metrics: m }),
      });
      const cJson = await cRes.json();
      setCoach(cJson);
    } catch (err) {
      console.error("Error processing recording:", err);
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

      // 1) Analyze resume
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

      // 2) Generate pitch
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
      console.error("Error generating pitch:", err);
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
      console.error("Error adjusting pitch length:", err);
      setError("Failed to adjust pitch length. Please try again.");
    } finally {
      setIsAdjustingPitch(false);
    }
  }

  function handlePracticeGenerated() {
    recorderRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <main className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 py-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            🎤 Elevator Pitch Coach
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Generate a personalized pitch from your resume or practice an existing one
          </p>
        </div>

        {/* Resume-Based Pitch Generation Section */}
        <section className="bg-white/70 backdrop-blur-sm border border-white/20 rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-6 text-white">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">📄 Generate from Resume</h2>
              <p className="text-blue-100">
                Don't have a pitch yet? Upload your resume and we'll create one for you!
              </p>
            </div>
          </div>

          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <ResumeUploader 
                  onFileUploaded={setResumeFile} 
                  isProcessing={isGeneratingPitch}
                />
                
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-800">
                    Target Role/Industry (optional)
                  </label>
                  <input
                    type="text"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    placeholder="e.g., Software Engineer, Marketing Manager"
                    disabled={isGeneratingPitch}
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 bg-white"
                  />
                  <p className="text-sm text-gray-600">
                    💡 Help us tailor your pitch to specific roles or industries
                  </p>
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
                  className={`
                    w-full py-4 px-6 rounded-2xl font-semibold text-lg transition-all duration-200 transform
                    ${resumeFile && !isGeneratingPitch
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 hover:scale-105 shadow-lg hover:shadow-xl'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }
                  `}
                >
                  {isGeneratingPitch ? (
                    <div className="flex items-center justify-center space-x-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>Generating Your Perfect Pitch...</span>
                    </div>
                  ) : (
                    '✨ Generate Pitch'
                  )}
                </button>
              </div>
            </div>

            {generatedPitch && (
              <div className="space-y-6 pt-8 border-t border-gray-200">
                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Adjust Pitch Length</h3>
                  <p className="text-gray-600">Drag to change length, auto-updates when you release</p>
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
              </div>
            )}
          </div>
        </section>

        {/* Practice Section */}
        <section ref={recorderRef} className="bg-white/70 backdrop-blur-sm border border-white/20 rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-green-500 p-6 text-white">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">🎙️ Practice & Get Feedback</h2>
              <p className="text-emerald-100">
                Record yourself practicing your pitch to get personalized coaching
              </p>
            </div>
          </div>
          
          <div className="p-8 space-y-6">
            <Recorder onRecorded={handleRecorded} maxSeconds={30} />
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent mr-3"></div>
                <span className="text-lg text-gray-700">Analyzing your pitch...</span>
              </div>
            )}
          </div>
        </section>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 shadow-lg">
            <h3 className="font-semibold text-red-800 mb-2">⚠️ Error</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Results Section */}
        {(metrics || transcript || coach) && (
          <section className="bg-white/70 backdrop-blur-sm border border-white/20 rounded-3xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">📊 Your Results</h2>
                <p className="text-purple-100">
                  Here's your performance analysis and coaching feedback
                </p>
              </div>
            </div>

            <div className="p-8 space-y-8">
              {metrics && <ScoreCard m={metrics} />}

              {transcript && (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
                  <h3 className="font-semibold text-gray-800 mb-3">📝 Transcript</h3>
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{transcript}</p>
                </div>
              )}

              {coach && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
                    <h3 className="font-semibold text-green-800 mb-3">💪 Strengths</h3>
                    <ul className="list-disc pl-5 text-green-700 space-y-1">
                      {coach.strengths?.map((s: string, i: number) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                    <h3 className="font-semibold text-blue-800 mb-3">🎯 Improvements</h3>
                    <ul className="list-disc pl-5 text-blue-700 space-y-1">
                      {coach.improvements?.map((s: string, i: number) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 md:col-span-2">
                    <h3 className="font-semibold text-indigo-800 mb-3">✨ Polished Script</h3>
                    <p className="text-indigo-700 whitespace-pre-wrap leading-relaxed">{coach.polishedScript}</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6 md:col-span-2">
                    <h3 className="font-semibold text-purple-800 mb-3">💼 LinkedIn "About"</h3>
                    <p className="text-purple-700 whitespace-pre-wrap leading-relaxed">{coach.aboutRewrite}</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
