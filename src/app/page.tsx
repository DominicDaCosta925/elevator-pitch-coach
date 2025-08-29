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
  const [pitchLength, setPitchLength] = useState(30); // Default 30 seconds
  const [generatedPitch, setGeneratedPitch] = useState("");
  const [isGeneratingPitch, setIsGeneratingPitch] = useState(false);
  const [isAdjustingPitch, setIsAdjustingPitch] = useState(false);
  const [originalPitchLength, setOriginalPitchLength] = useState(30);
  
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
    <main className="max-w-3xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">🎤 Elevator Pitch Coach</h1>
        <p className="text-gray-600">Generate a personalized pitch from your resume or practice an existing one</p>
      </div>

      {/* Resume-Based Pitch Generation Section */}
      <section className="space-y-6 p-6 bg-blue-50 rounded-2xl border border-blue-200">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-blue-900">📄 Generate from Resume</h2>
          <p className="text-sm text-blue-700">Don't have a pitch yet? Upload your resume and we'll create one for you!</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <ResumeUploader 
              onFileUploaded={setResumeFile} 
              isProcessing={isGeneratingPitch}
            />
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Target Role/Industry (optional)
              </label>
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g., Software Engineer, Marketing Manager"
                disabled={isGeneratingPitch}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              <p className="text-xs text-gray-500">
                Help us tailor your pitch to specific roles or industries
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <PitchLengthSlider
              value={pitchLength}
              onChange={setPitchLength}
              disabled={isGeneratingPitch}
            />
            
            <button
              onClick={handleGeneratePitch}
              disabled={!resumeFile || isGeneratingPitch}
              className={`
                w-full py-3 px-4 rounded-xl font-medium transition-colors
                ${resumeFile && !isGeneratingPitch
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              {isGeneratingPitch ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Generating Pitch...</span>
                </div>
              ) : (
                'Generate Pitch'
              )}
            </button>
          </div>
        </div>

        {generatedPitch && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Adjust Pitch Length</h3>
              <span className="text-sm text-gray-600">Drag to change, auto-updates on release</span>
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
      </section>

      {/* Practice Section */}
      <section ref={recorderRef} className="space-y-4 p-6 bg-green-50 rounded-2xl border border-green-200">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-green-900">🎙️ Practice & Get Feedback</h2>
          <p className="text-sm text-green-700">Record yourself practicing your pitch to get personalized coaching</p>
        </div>
        
        <Recorder onRecorded={handleRecorded} maxSeconds={30} />
        {loading && <p className="text-gray-500">Analyzing…</p>}
      </section>
      
      {error && (
        <div className="p-4 rounded-2xl border border-red-200 bg-red-50">
          <h3 className="font-semibold text-red-800 mb-2">⚠️ Error</h3>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {metrics && <ScoreCard m={metrics} />}

      {transcript && (
        <section className="p-4 rounded-2xl border">
          <h3 className="font-semibold mb-2">Transcript</h3>
          <p className="text-sm whitespace-pre-wrap">{transcript}</p>
        </section>
      )}

      {coach && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl border">
            <h3 className="font-semibold mb-2">Strengths</h3>
            <ul className="list-disc pl-5 text-sm">
              {coach.strengths?.map((s: string, i: number) => <li key={i}>{s}</li>)}
            </ul>
          </div>
          <div className="p-4 rounded-2xl border">
            <h3 className="font-semibold mb-2">Improvements</h3>
            <ul className="list-disc pl-5 text-sm">
              {coach.improvements?.map((s: string, i: number) => <li key={i}>{s}</li>)}
            </ul>
          </div>
          <div className="p-4 rounded-2xl border md:col-span-2">
            <h3 className="font-semibold mb-2">Polished Script</h3>
            <p className="text-sm whitespace-pre-wrap">{coach.polishedScript}</p>
          </div>
          <div className="p-4 rounded-2xl border md:col-span-2">
            <h3 className="font-semibold mb-2">LinkedIn “About”</h3>
            <p className="text-sm whitespace-pre-wrap">{coach.aboutRewrite}</p>
          </div>
        </section>
      )}
    </main>
  );
}
