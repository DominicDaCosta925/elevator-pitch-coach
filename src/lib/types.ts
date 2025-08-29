export type TranscriptionResult = {
  transcript: string;
  durationSec: number;
  wordCount: number;
  error?: string;
};

export type Metrics = {
  durationSec: number;
  wordsPerMinute: number;
  fillerCount: number;
  readability: number; // ≈ grade level
};
