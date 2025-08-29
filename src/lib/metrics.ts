import { FILLER_WORDS } from "./fillerWords";
import type { Metrics } from "./types";

export function countFillers(text: string | undefined) {
  if (!text || typeof text !== "string") return 0;
  const lower = text.toLowerCase();
  return FILLER_WORDS.reduce((acc, f) => {
    const re = new RegExp(`\\b${f.replace(/\s+/g,"\\s+")}\\b`, "g");
    return acc + (lower.match(re)?.length ?? 0);
  }, 0);
}

export function estimateReadabilityGrade(text: string | undefined) {
  if (!text || typeof text !== "string") return 5; // Default to 5th grade level
  const sentences = Math.max(1, (text.match(/[.!?]/g) || []).length);
  const words = Math.max(1, text.trim().split(/\s+/).length);
  const syllables = Math.max(
    1,
    text.toLowerCase().replace(/[^a-z]/g,"").replace(/(?:[^aeiouy]|^)y/g,"").match(/[aeiouy]{1,2}/g)?.length ?? 1
  );
  return Math.round(0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59);
}

export function computeMetrics(transcript: string | undefined, durationSec: number): Metrics {
  // Defensive: handle undefined/null transcript
  if (!transcript || typeof transcript !== "string") {
    return {
      durationSec: Math.max(1, durationSec),
      wordsPerMinute: 0,
      fillerCount: 0,
      readability: 5, // Default to 5th grade level
    };
  }
  
  const words = Math.max(1, transcript.trim().split(/\s+/).length);
  return {
    durationSec,
    wordsPerMinute: Math.round((words / Math.max(1, durationSec)) * 60),
    fillerCount: countFillers(transcript),
    readability: estimateReadabilityGrade(transcript),
  };
}
