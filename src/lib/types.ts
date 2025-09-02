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

export interface CoachingResponse {
  overallScore: number;
  rubric?: {
    pace: number;
    fillers: number;
    readability: number;
    contentDensity: number;
  };
  overallScoreLLM?: number;
  personalNote?: string;
  executivePresence: { 
    score: number; 
    feedback: string; 
    improvement: string; 
    encouragement?: string;
  };
  strategicPositioning: { 
    score: number; 
    feedback: string; 
    improvement: string; 
    marketInsight?: string;
  };
  credibilityBuilding: { 
    score: number; 
    feedback: string; 
    improvement: string; 
    strengthsToLeverage?: string;
  };
  audienceEngagement: { 
    score: number; 
    feedback: string; 
    improvement: string; 
    callToActionStrategy?: string;
  };
  directQuotes?: string[];
  mirrorBack?: string;
  breakthrough?: string;
  lineEdits?: Array<{ quote: string; upgrade: string; why: string }>;
  polishedScript: string;
  aboutRewrite: string;
  coachingTips: string[];
  nextSteps: string[];
  strengths?: string[];
  priorityImprovements?: string[];
  personalizedInsights?: string[];
  confidenceBuilders?: string[];
  actionPlan?: {
    immediate: string[];
    shortTerm: string[];
    strategic: string[];
  };
  coachingNotes?: string;
}
