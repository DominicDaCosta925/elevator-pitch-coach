"use client";
import React, { useState } from "react";
import Recorder from "@/components/Recorder";
import ScoreCard from "@/components/ScoreCard";
import { computeMetrics } from "@/lib/metrics";
import type { Metrics, TranscriptionResult } from "@/lib/types";

export default function Page() {
  const [transcript, setTranscript] = useState("");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [coach, setCoach] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRecorded(blob: Blob, durationSec: number) {
    try {
      setLoading(true);
      setTranscript("");
      setMetrics(null);
      setCoach(null);
      setError(null);

      // 1) Transcribe
      const fd = new FormData();
      fd.append("file", blob);
      fd.append("durationSec", String(durationSec));
      const tRes = await fetch("/api/transcribe", { method: "POST", body: fd });
      const tJson = await tRes.json();
      
      if (!tRes.ok || "error" in tJson) {
        console.error("Transcription failed:", tJson.error || "Unknown error");
        setError("Sorry, we couldn't transcribe your audio. Please try again.");
        return;
      }

      // Guard against missing transcript
      if (!tJson.transcript || typeof tJson.transcript !== "string") {
        console.error("No transcript received from API");
        setError("No transcript was generated. Please try recording again.");
        return;
      }

      setTranscript(tJson.transcript);
      const m = computeMetrics(tJson.transcript, durationSec);
      setMetrics(m);

      // 2) Coach
      const cRes = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: tJson.transcript, metrics: m }),
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

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">🎤 Elevator Pitch Coach</h1>

      <Recorder onRecorded={handleRecorded} maxSeconds={30} />
      {loading && <p className="text-gray-500">Analyzing…</p>}
      
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
