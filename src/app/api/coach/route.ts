// src/app/api/coach/route.ts - Product-Ready Executive Coaching API
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { validateCoachingResponse, type ValidatedCoachingResponse } from "@/lib/coaching-schema";
import type { CoachingResponse } from "@/lib/types";

export const runtime = "nodejs";

const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000, // 30s timeout
      maxRetries: 1
    })
  : null;

// Cached constants for performance  
const SYSTEM_PROMPT_COMPACT = `You are Dr. Alexandra Sterling, executive coach. Voice: warm, direct. Quote exact words, create breakthrough moments.

OUTPUT STRUCTURE:
{
  "overallScoreLLM": number (1-10),
  "executivePresence": {"score": number, "feedback": string, "improvement": string},
  "strategicPositioning": {"score": number, "feedback": string, "improvement": string}, 
  "credibilityBuilding": {"score": number, "feedback": string, "improvement": string},
  "audienceEngagement": {"score": number, "feedback": string, "improvement": string},
  "directQuotes": [string] (≥3, include metrics),
  "mirrorBack": string (address first name once, warm+specific),
  "breakthrough": string,
  "lineEdits": [{"quote": string, "upgrade": string, "why": string}] (≥3: cadence+power-verb+ROI),
  "polishedScript": string (must end with CTA),
  "coachingTips": [string] (3-5),
  "aboutRewrite": string (3-4 lines),
  "nextSteps": [string] (3-5)
}`;

const JSON_SCHEMA_DEEP = {
  type: "object",
  properties: {
    overallScoreLLM: { type: "number", minimum: 1, maximum: 10 },
    executivePresence: { type: "object", properties: { score: { type: "number" }, feedback: { type: "string" }, improvement: { type: "string" } }, required: ["score", "feedback", "improvement"] },
    strategicPositioning: { type: "object", properties: { score: { type: "number" }, feedback: { type: "string" }, improvement: { type: "string" } }, required: ["score", "feedback", "improvement"] },
    credibilityBuilding: { type: "object", properties: { score: { type: "number" }, feedback: { type: "string" }, improvement: { type: "string" } }, required: ["score", "feedback", "improvement"] },
    audienceEngagement: { type: "object", properties: { score: { type: "number" }, feedback: { type: "string" }, improvement: { type: "string" } }, required: ["score", "feedback", "improvement"] },
    directQuotes: { type: "array", items: { type: "string" }, minItems: 3 },
    mirrorBack: { type: "string", minLength: 20 },
    breakthrough: { type: "string", minLength: 20 },
    lineEdits: { type: "array", items: { type: "object", properties: { quote: { type: "string" }, upgrade: { type: "string" }, why: { type: "string" } }, required: ["quote", "upgrade", "why"] }, minItems: 3 },
    polishedScript: { type: "string", minLength: 50 },
    aboutRewrite: { type: "string", minLength: 50 },
    coachingTips: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
    nextSteps: { type: "array", items: { type: "string" }, minItems: 3 }
  },
  required: ["overallScoreLLM", "executivePresence", "strategicPositioning", "credibilityBuilding", "audienceEngagement", "directQuotes", "mirrorBack", "breakthrough", "lineEdits", "polishedScript", "aboutRewrite", "coachingTips", "nextSteps"]
};

type Metrics = {
  durationSec: number;
  wordsPerMinute: number;
  fillerCount: number;
  readability: number;
};

type CoachRequest = {
  transcript: string;
  metrics: Metrics;
  personaHint?: string;
  targetRole?: string;
  pitchLengthSec?: number;
  depth?: "brief" | "deep";
};

function computeObjectiveScoring(metrics: Metrics, transcript: string): {
  pace: number;
  fillers: number;
  readability: number;
  contentDensity: number;
  overall: number;
} {
  // Pace scoring: optimal around 150 wpm
  const paceScore = metrics.wordsPerMinute <= 0 
    ? 5.0 
    : Math.max(0, 10 - Math.abs(metrics.wordsPerMinute - 150) / 15);

  // Filler penalty: each filler reduces score significantly
  const fillerScore = Math.max(0, 10 - (metrics.fillerCount * 1.2));

  // Readability: target grade 6-9 (conversational but professional)
  const readabilityScore = metrics.readability <= 0 
    ? 6.0 
    : Math.max(0, 10 - Math.abs(metrics.readability - 7.5) / 1.5);

  // Content density with metric bonus
  const wordCount = transcript.split(/\s+/).filter(Boolean).length;
  const baseContentScore = Math.min(10, wordCount / 12); // 120 words = 10 points
  
  // Metric density bonus: detect numbers/percentages/business metrics
  const hasMetrics = /(\d+%|\$\d+|\d+[KMB]|\d+\.\d+[xX]|ARR|MRR|MAU|DAU|retention|churn|ROI|revenue|growth|efficiency|latency)/i.test(transcript);
  const metricBonus = hasMetrics ? 1.5 : 0;
  
  const contentDensityScore = Math.min(10, baseContentScore + metricBonus);

  // Weighted overall: content and pace matter most
  const overall = (
    paceScore * 0.3 + 
    fillerScore * 0.25 + 
    readabilityScore * 0.2 + 
    contentDensityScore * 0.25
  );

  return {
    pace: Math.round(paceScore * 10) / 10,
    fillers: Math.round(fillerScore * 10) / 10,
    readability: Math.round(readabilityScore * 10) / 10,
    contentDensity: Math.round(contentDensityScore * 10) / 10,
    overall: Math.round(overall * 10) / 10,
  };
}

function extractFirstName(transcript: string): string {
  // Try to extract first name from common patterns
  const patterns = [
    /(?:I'm|I am|My name is)\s+([A-Z][a-z]+)/i,
    /(?:Hi|Hello),?\s+I'm\s+([A-Z][a-z]+)/i,
    /^([A-Z][a-z]+)\s+here/i,
  ];
  
  for (const pattern of patterns) {
    const match = transcript.match(pattern);
    if (match) return match[1];
  }
  return ""; // Will address generically if no name found
}

function generateContextualTips(transcript: string, metrics: Metrics, depth: "brief" | "deep"): string[] {
  const tips: string[] = [];
  const targetCount = depth === "brief" ? 3 : 4; // Brief needs 2-3, aim for 3
  
  // Priority 1: Filler-specific tip with pause timing if high count (≥6)
  if (metrics.fillerCount >= 6) {
    const fillers = transcript.match(/\b(um|uh|like|you know|so|actually)\b/gi);
    const opener = transcript.split(/[.!?]/)[0]?.trim();
    if (fillers && fillers.length > 0) {
      const shortOpener = opener ? `"${opener.split(/\s+/).slice(0, 6).join(' ')}"` : `"I am [name], a [role] who delivers [value]"`;
      tips.push(`You said "${fillers.slice(0, 2).join('...')}" ${metrics.fillerCount}× in ${metrics.durationSec}s — replace with 2-beat pauses and practice: ${shortOpener}`);
    } else {
      tips.push(`${metrics.fillerCount} filler words in ${metrics.durationSec}s — practice 2-beat pauses between key phrases and memorize your opening line`);
    }
  }
  
  // Priority 2: %→$ conversion tip if transcript has % or $
  const percentMatch = transcript.match(/(\d+%)/i);
  const dollarMatch = transcript.match(/(\$\d+[KMB]?)/i);
  if (percentMatch || dollarMatch) {
    const metric = percentMatch?.[1] || dollarMatch?.[1];
    const contextPhrase = transcript.match(new RegExp(`[^.]*${metric?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^.]*`, 'i'))?.[0]?.trim();
    if (contextPhrase) {
      tips.push(`You said "${contextPhrase}" — convert to business impact: "${metric} = $X revenue" or "${metric} = Y cost savings/efficiency hours"`);
    }
  }
  
  // Priority 3: Verb strengthening if "I like/helped" detected
  const weakVerbMatch = transcript.match(/\b(I\s+(?:like|helped|worked|assisted|contributed|was\s+involved))\b/i);
  if (weakVerbMatch) {
    const phrase = weakVerbMatch[1];
    const replacement = phrase.toLowerCase().includes('like') ? 'I specialize in' : 
                       phrase.toLowerCase().includes('helped') ? 'I drove' :
                       phrase.toLowerCase().includes('worked') ? 'I led' : 'I delivered';
    tips.push(`Replace "${phrase}" with "${replacement}" — own your active role in creating the results`);
  }
  
  // Fill remaining slots with transcript-specific observations
  if (tips.length < targetCount) {
    // Pace-specific tip
    if (metrics.wordsPerMinute > 170) {
      const fastPhrase = transcript.split(/[.!?]/).find(s => s.trim().length > 20)?.trim().slice(0, 40);
      if (fastPhrase) {
        tips.push(`Your pace (${metrics.wordsPerMinute} wpm) rushes past impact — after saying "${fastPhrase}..." pause 2 beats to let it land`);
      }
    } else if (metrics.wordsPerMinute < 120) {
      tips.push(`${metrics.wordsPerMinute} wpm feels hesitant — practice delivering your strongest phrase with confident energy`);
    }
  }
  
  if (tips.length < targetCount) {
    // Opening strength tip
    const opener = transcript.split(/[.!?]/)[0]?.trim();
    if (opener && opener.length > 10) {
      tips.push(`Your opener "${opener.slice(0, 30)}..." — practice until this flows confidently in under 3 seconds`);
    }
  }
  
  // Ensure we have at least 2 tips for brief mode
  if (tips.length < 2) {
    tips.push(`Strengthen your value proposition — lead with the transformation you create, not just the work you do`);
  }
  
  return tips.slice(0, depth === "brief" ? 3 : targetCount);
}

function synthesizeDeepTips(currentTips: string[], transcript: string, metrics: Metrics, directQuotes: string[]): string[] {
  const tips = [...currentTips];
  const targetMin = 3;
  const targetMax = 5;
  
  if (tips.length >= targetMin) {
    return tips.slice(0, targetMax); // Already sufficient
  }
  
  console.log(`Deep mode tips insufficient: ${tips.length}/3 minimum, synthesizing additional tips`);
  
  // Pattern 1: % → $ conversion if metric present
  const percentMatch = transcript.match(/(\d+%)/i);
  const dollarMatch = transcript.match(/(\$\d+[KMB]?)/i);
  if ((percentMatch || dollarMatch) && !tips.some(t => t.includes('$') || t.includes('%'))) {
    const metric = percentMatch?.[1] || dollarMatch?.[1];
    const metricContext = directQuotes.find(q => q.includes(metric)) || 
                         transcript.match(new RegExp(`[^.]*${metric?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^.]*`, 'i'))?.[0]?.trim();
    if (metricContext) {
      tips.push(`You mentioned "${metricContext}" — quantify the business impact: "${metric} ≈ $X this quarter using your run-rate" or "${metric} = Y efficiency hours saved"`);
    }
  }
  
  // Pattern 2: Mechanism/Scope if system mentioned
  const mechanismMatch = transcript.match(/\b(recommendation system|onboarding|activation|conversion|dashboard|algorithm|model|platform|automation|workflow)\b/i);
  if (mechanismMatch && tips.length < targetMax && !tips.some(t => t.toLowerCase().includes(mechanismMatch[1].toLowerCase()))) {
    const mechanism = mechanismMatch[1];
    tips.push(`Your "${mechanism}" work — add scope details: "reduced steps N→M," "cut time-to-value by Y days," or "A/B tested with ~Z users" to show scale`);
  }
  
  // Pattern 3: Verb strengthening if weak verbs present
  const weakVerbMatch = transcript.match(/\b(I\s+(?:like|helped|worked|assisted|contributed|was\s+involved|participated))\b/i);
  if (weakVerbMatch && tips.length < targetMax && !tips.some(t => t.includes(weakVerbMatch[1]))) {
    const phrase = weakVerbMatch[1];
    const strongVerb = phrase.toLowerCase().includes('like') ? 'I lead' : 
                      phrase.toLowerCase().includes('helped') ? 'I drove' :
                      phrase.toLowerCase().includes('worked') ? 'I built' : 'I delivered';
    tips.push(`Replace "${phrase}" with "${strongVerb}" — take active ownership of your transformational role in the results`);
  }
  
  // Pattern 4: Cadence/Pause for fast pace or complex sentences
  if (tips.length < targetMax && (metrics.wordsPerMinute > 150 || transcript.includes(', which ') || transcript.includes(' and '))) {
    const complexClause = transcript.match(/([^.]*(?:, which|, and|that)[^.]{15,})/i)?.[1]?.trim();
    if (complexClause && complexClause.length > 30) {
      const pausePoint = complexClause.substring(0, 40);
      tips.push(`Your pace (${metrics.wordsPerMinute} wpm) rushes complex ideas — after "${pausePoint}..." pause 1 beat to let the impact register`);
    } else if (metrics.wordsPerMinute > 150) {
      tips.push(`${metrics.wordsPerMinute} wpm feels rushed for executive presence — practice slowing to 140-160 wpm and pause after your strongest achievement`);
    }
  }
  
  // Pattern 5: Opening strength if still needed
  if (tips.length < targetMin) {
    const opener = transcript.split(/[.!?]/)[0]?.trim();
    if (opener && opener.length > 15) {
      tips.push(`Your opener "${opener.slice(0, 35)}..." — practice delivering this hook with executive confidence in under 4 seconds`);
    }
  }
  
  const finalTips = tips.slice(0, targetMax);
  console.log(`Deep tips synthesized: ${currentTips.length} → ${finalTips.length}`);
  return finalTips;
}

const CTA_TEMPLATE_POOL = [
  "I'm targeting {role} roles at high-growth teams that value data-driven product development — are you open to a quick chat this week?",
  "I'm actively exploring opportunities in {domain}, and I'd love to connect to share examples of my work — would you be available for a conversation soon?", 
  "I'm excited to apply this impact in {role} positions where data drives revenue and innovation — are you free later this week to discuss?",
  "I'm pursuing {role} opportunities where I can deliver measurable business value through machine learning — happy to walk through my approach if you have time this week.",
  "I'm seeking {role} roles on teams solving complex business challenges with data — would you be open to a brief call in the next few days?"
];

function normalizeCtaText(text: string): string {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function ensureCtaEnding(script: string, targetRole?: string): string {
  const scriptTrimmed = script.trim();
  
  // Enhanced CTA detection patterns
  const hasCtaPattern = /(\?|opportunities?|discuss|connect|conversation|next steps?|interested|available|chat|call|time|week|available|open to)\.?\s*$/i;
  
  if (hasCtaPattern.test(scriptTrimmed)) {
    return script; // Already has strong CTA
  }

  // Select CTA template using simple rotation based on role length
  const role = targetRole || "leadership";
  const domain = role.toLowerCase().includes('data') ? 'data science and analytics' : 
                 role.toLowerCase().includes('engineer') ? 'engineering and technology' :
                 role.toLowerCase().includes('product') ? 'product management' : 
                 'strategic leadership';
  
  const templateIndex = (role.length + script.length) % CTA_TEMPLATE_POOL.length;
  const selectedTemplate = CTA_TEMPLATE_POOL[templateIndex];
  
  // Fill template with dynamic content
  const ctaText = selectedTemplate
    .replace('{role}', role)
    .replace('{domain}', domain);
  
  // Deduplicate by checking if script already contains this CTA
  const normalizedScript = normalizeCtaText(scriptTrimmed);
  const normalizedCta = normalizeCtaText(ctaText);
  
  if (normalizedScript.includes(normalizedCta)) {
    console.log(`CTA already present, skipping append for role "${role}"`);
    return script;
  }
  
  console.log(`CTA appended: template ${templateIndex + 1} for role "${role}"`);
  return `${scriptTrimmed} ${ctaText}`;
}

function trimScriptToLength(script: string, targetSeconds: number): string {
  // Estimate at 150 WPM (2.5 words per second)
  const wordsPerSecond = 2.5;
  const targetWords = Math.floor(targetSeconds * wordsPerSecond);
  const currentWords = script.split(/\s+/).length;
  
  if (currentWords <= targetWords) {
    return script;
  }
  
  console.log(`Script length: ${currentWords} words, target: ${targetWords} words for ${targetSeconds}s`);
  
  let trimmed = script;
  
  // Step 1: Strip hedges and filler phrases
  const hedges = /\b(really|just|actually|sort of|kind of|basically|essentially|literally|quite|rather|pretty much|very much|somewhat|fairly|relatively)\b/gi;
  trimmed = trimmed.replace(hedges, '');
  
  // Step 2: Collapse extra clauses safely
  trimmed = trimmed.replace(/,\s*which\s+[^,]+,/g, ','); // Remove ", which [clause],"
  trimmed = trimmed.replace(/\s+and\s+[^.]+\s+and\s+/g, ' and '); // Collapse multiple "and" chains
  trimmed = trimmed.replace(/\s+that\s+is\s+[^,]+,/g, ','); // Remove ", that is [phrase],"
  
  // Step 3: Use shorter synonyms
  const synonyms: [RegExp, string][] = [
    [/\butilize\b/gi, 'use'],
    [/\bfacilitate\b/gi, 'enable'],
    [/\boptimize\b/gi, 'improve'],
    [/\bleverage\b/gi, 'use'],
    [/\bimplement\b/gi, 'build'],
    [/\bmethodology\b/gi, 'method'],
    [/\bfunctionality\b/gi, 'features'],
  ];
  
  synonyms.forEach(([pattern, replacement]) => {
    trimmed = trimmed.replace(pattern, replacement);
  });
  
  // Step 4: Clean up extra spaces
  trimmed = trimmed.replace(/\s+/g, ' ').trim();
  
  // Preserve CTA: extract it, trim body, reattach
  const ctaMatch = trimmed.match(/(.+)(\s+(?:I'm targeting|I'm actively|I'm excited|I'm pursuing|I'm seeking).+\?)$/);
  if (ctaMatch) {
    const [, body, cta] = ctaMatch;
    const bodyWords = body.split(/\s+/);
    const ctaWords = cta.split(/\s+/);
    const maxBodyWords = targetWords - ctaWords.length;
    
    if (bodyWords.length > maxBodyWords) {
      const trimmedBody = bodyWords.slice(0, maxBodyWords).join(' ');
      trimmed = `${trimmedBody}${cta}`;
    }
  }
  
  const finalWords = trimmed.split(/\s+/).length;
  console.log(`Script trimmed from ${currentWords} to ${finalWords} words`);
  
  return trimmed;
}

function trimToBriefCompliance(fullResponse: any, transcript: string, metrics: Metrics): any {
  console.log(`Brief compliance trim: ${fullResponse.directQuotes?.length || 0} quotes, ${fullResponse.lineEdits?.length || 0} edits, ${fullResponse.coachingTips?.length || 0} tips`);
  
  // 1. Trim directQuotes to ≤2 (prioritize metrics/business levers)
  let quotes = fullResponse.directQuotes || [];
  const metricQuote = quotes.find((q: string) => /(\d+%|\$\d+|\d+[KMB]|revenue|sales|efficiency|conversion|activation)/i.test(q));
  const businessQuote = quotes.find((q: string) => q !== metricQuote && /business|impact|growth|value|ROI|profit/i.test(q));
  
  const trimmedQuotes = [];
  if (metricQuote) trimmedQuotes.push(metricQuote);
  if (businessQuote && trimmedQuotes.length < 2) trimmedQuotes.push(businessQuote);
  
  // Fill remaining slots with most actionable quotes
  quotes.filter(q => !trimmedQuotes.includes(q)).slice(0, 2 - trimmedQuotes.length).forEach(q => trimmedQuotes.push(q));
  
  // 2. Trim lineEdits to exactly 2 (prioritize cadence + power-verb)
  let edits = fullResponse.lineEdits || [];
  const cadenceEdit = edits.find((e: any) => /shorten|tight|pause|breath|trim|syllable/i.test(e.why));
  const powerVerbEdit = edits.find((e: any) => 
    /drove|led|shipped|launched|delivered|created|scaled|reduced/i.test(e.upgrade) || 
    /verbs.*drove|verbs.*led|verbs.*delivered|verbs.*stronger/i.test(e.why)
  );
  
  const trimmedEdits = [];
  if (cadenceEdit) trimmedEdits.push(cadenceEdit);
  if (powerVerbEdit && powerVerbEdit !== cadenceEdit && trimmedEdits.length < 2) {
    trimmedEdits.push(powerVerbEdit);
  }
  
  // Fill remaining slots with impactful edits (%/$, ROI, conversion)
  if (trimmedEdits.length < 2) {
    const impactEdits = edits.filter(e => !trimmedEdits.includes(e) && 
      /ROI|impact|revenue|\$|%|conversion|activation/i.test(e.why || e.upgrade));
    impactEdits.slice(0, 2 - trimmedEdits.length).forEach(e => trimmedEdits.push(e));
  }
  
  // Final fallback: use first available edits
  while (trimmedEdits.length < 2 && edits.length > trimmedEdits.length) {
    const nextEdit = edits.find(e => !trimmedEdits.includes(e));
    if (nextEdit) trimmedEdits.push(nextEdit);
  }
  
  // 3. Ensure coachingTips ∈ [2,3]
  let tips = fullResponse.coachingTips || [];
  if (tips.length < 2) {
    // Synthesize one tip from transcript
    const percentMatch = transcript.match(/(\d+%)/i);
    const weakVerbMatch = transcript.match(/\b(I\s+(?:helped|like|worked))\b/i);
    
    if (percentMatch && !tips.some(t => t.includes('%'))) {
      tips.push(`You mentioned "${percentMatch[1]}" — convert to business impact: "${percentMatch[1]} = $X revenue this quarter"`);
    } else if (weakVerbMatch && !tips.some(t => t.includes(weakVerbMatch[1]))) {
      const phrase = weakVerbMatch[1];
      const strongVerb = phrase.includes('helped') ? 'I drove' : phrase.includes('like') ? 'I lead' : 'I built';
      tips.push(`Replace "${phrase}" with "${strongVerb}" — own your transformational role`);
    } else {
      tips.push(`Strengthen your value proposition — lead with the transformation you create, not just tasks you completed`);
    }
  } else if (tips.length > 3) {
    // Keep the 3 most transcript-anchored tips
    const transcriptTerms = transcript.toLowerCase().split(/\s+/);
    tips = tips
      .map(tip => ({
        tip,
        anchored: transcriptTerms.some(term => tip.toLowerCase().includes(term) && term.length > 3)
      }))
      .sort((a, b) => b.anchored ? 1 : -1)
      .slice(0, 3)
      .map(item => item.tip);
  }
  
  const briefResponse = {
    ...fullResponse,
    directQuotes: trimmedQuotes.slice(0, 2),
    lineEdits: trimmedEdits.slice(0, 2),
    coachingTips: tips.slice(0, 3),
  };
  
  // Remove Deep-only fields
  delete briefResponse.aboutRewrite;
  delete briefResponse.nextSteps;
  
  console.log(`Brief compliance result: ${briefResponse.directQuotes.length} quotes, ${briefResponse.lineEdits.length} edits, ${briefResponse.coachingTips.length} tips`);
  return briefResponse;
}

function truncateTranscriptSafely(transcript: string, maxTokens = 400): { text: string, truncated: boolean } {
  const words = transcript.split(/\s+/);
  if (words.length <= maxTokens) return { text: transcript, truncated: false };
  
  // Keep opening + any lines with metrics
  const sentences = transcript.split(/[.!?]+/);
  const opening = sentences[0] || "";
  const metricSentences = sentences.filter(s => /\d+%|\$\d+|users|ARR|MAU|revenue|efficiency/i.test(s));
  
  const kept = [opening, ...metricSentences.slice(0, 2)].join('. ').trim();
  return { 
    text: kept.length > 50 ? kept : transcript.slice(0, maxTokens * 4), 
    truncated: true 
  };
}

async function generateCoachingFast(
  transcript: string, 
  metrics: Metrics, 
  targetRole: string, 
  pitchLengthSec: number,
  firstName: string
): Promise<{ response: any, timings: any, meta: any }> {
  const startTime = performance.now();
  const timings: any = {};
  
  // Token budget safeguard
  const { text: safeTranscript, truncated } = truncateTranscriptSafely(transcript);
  timings.buildPromptMs = performance.now() - startTime;
  
  // Slim prompt (60-70% reduction)
  const userPrompt = `TRANSCRIPT: "${safeTranscript}"
METRICS: ${metrics.durationSec}s, ${metrics.wordsPerMinute}wpm, ${metrics.fillerCount} fillers, readability ${metrics.readability}
TARGET: ${targetRole}, ${pitchLengthSec}s pitch
NAME: ${firstName}

Provide coaching with: 3+ exact quotes, 3+ line edits (quote→upgrade→why), realistic scores, warm mirrorBack using first name, breakthrough insight, polished script, about rewrite, 3-5 specific tips, 3+ next steps.`;

  const llmStart = performance.now();
  
  try {
    if (!openai) throw new Error("OpenAI not configured");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.25,
      top_p: 0.9,
      max_tokens: 600, // Always Deep content, trim locally
      messages: [
        { role: "system", content: SYSTEM_PROMPT_COMPACT },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" }
    });

    timings.llmMs = performance.now() - llmStart;
    const validationStart = performance.now();
    
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response content");
    
    const parsed = JSON.parse(content);
    timings.validationMs = performance.now() - validationStart;
    
    return {
      response: parsed,
      timings,
      meta: { 
        truncated, 
        tokens: response.usage?.total_tokens || 0,
        model: "gpt-4o-mini" 
      }
    };
    
  } catch (error) {
    console.error("Fast coaching generation failed:", error);
    throw error;
  }
}

async function generateCoachingWithRetry(
  transcript: string, 
  metrics: Metrics, 
  targetRole: string, 
  pitchLengthSec: number,
  firstName: string,
  depth: "brief" | "deep"
): Promise<ValidatedCoachingResponse> {
  
  let systemPrompt = `You are Dr. Alexandra Sterling, a world-renowned executive coach who sees potential others miss and transforms careers through breakthrough moments.

YOUR SIGNATURE APPROACH:
- Listen deeply, quote their exact words, then reveal the bigger story they're telling
- ${firstName ? `Call them ${firstName} once` : 'Use their name if mentioned'} to show personal investment  
- Mirror their energy first, then elevate it strategically
- Create that "wait, I could actually go for that role?" transformation
- Be warm but direct - like a mentor who believes in them completely

YOUR COACHING SUPERPOWERS:
1. DEEP LISTENING: Quote 3+ exact phrases, especially any numbers/metrics they mention
2. SURGICAL UPGRADES: Give 3+ specific before→after edits that transform weak language into executive presence
3. STRATEGIC REFRAMING: Help them see themselves as the market will with proper positioning
4. BREAKTHROUGH INSIGHTS: One "aha" moment that shifts how they view their career trajectory

REQUIRED EDIT TYPES (in your 3+ lineEdits):
- Cadence edit: Remove filler words, tighten redundancy 
- Power-verb edit: Transform passive helpers into active drivers
- ROI edit: Shift from feature-talk to business impact language

SCORING PHILOSOPHY:
- Most professionals deserve 6-7 scores with specific growth areas
- Reserve 8+ for truly polished executives  
- Your job is honest assessment + transformation roadmap

TONE EXAMPLES:
- "${firstName ? firstName + ', ' : ''}I heard you say '[quote]' but what I'm really hearing is [much bigger opportunity]"
- "You're playing it safe when you say '[quote]' - but your results tell a different story"
- "Here's what hiring managers will miss if you position yourself this way..."
- Show genuine excitement: "This is actually your secret weapon because..."

Return only valid JSON with all required fields. Be specific, warm, and transformational.`;

  const userPrompt = `TRANSCRIPT: "${transcript}"
METRICS: ${metrics.durationSec}s, ${metrics.wordsPerMinute}wpm, ${metrics.fillerCount} fillers, readability ${metrics.readability}
TARGET: ${targetRole}, ${pitchLengthSec}s pitch
NAME: ${firstName}

Coach with: 3+ exact quotes (include metrics), 3+ line edits (cadence+power-verb+ROI), realistic scores, warm mirrorBack using first name, breakthrough insight, polished script ending with CTA, 3-5 specific tips, aboutRewrite (3-4 lines), nextSteps (3-5).`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await openai!.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.25, // Optimized for speed
        max_tokens: 600, // Cap generation length
        messages: [
          { role: "system", content: SYSTEM_PROMPT_COMPACT }, // Use compact prompt
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error("Empty response from OpenAI");

      const parsed = JSON.parse(content);
      
      // Add required rubric field (will be overwritten with objective scoring)
      const withRubric = {
        ...parsed,
        rubric: { pace: 7, fillers: 7, readability: 7, contentDensity: 7 },
        coachingTips: generateContextualTips(transcript, metrics, depth)
      };

      // Trim to appropriate mode
      const modeResponse = trimToBriefMode(withRubric, transcript, metrics, depth);

      // Validate against appropriate schema
      const validated = validateCoachingResponse(modeResponse, depth);
      
      console.log(`Coaching API: Attempt ${attempt + 1} succeeded with ${validated.directQuotes.length} quotes, ${validated.lineEdits.length} edits`);
      return validated;

    } catch (error) {
      console.error(`Coaching API: Attempt ${attempt + 1} failed:`, error);
      
      if (attempt === 0) {
        // Analyze validation error and create specific checklist
        const errorMessage = error instanceof Error ? error.message : String(error);
        let specificNudge = "\n\nREGENERATION CHECKLIST:";
        
        // Parse Zod validation errors for specific missing items
        if (errorMessage.includes("directQuotes") || errorMessage.includes("Brief mode: directQuotes must be ≤2")) {
          if (depth === "brief") {
            specificNudge += "\n- Brief mode: keep ≤2 direct quotes (prioritize metrics/business impact)";
          } else {
            specificNudge += "\n- Include ≥3 directQuotes including the metric line (25%, $X, etc)";
          }
        }
        
        if (errorMessage.includes("lineEdits") || errorMessage.includes("Brief mode: lineEdits must be ≤2")) {
          if (depth === "brief") {
            specificNudge += "\n- Brief mode: keep ≤2 line edits prioritizing cadence and power-verb";
          } else {
            specificNudge += "\n- Include ≥3 lineEdits covering: cadence (pause/trim), power-verb (drove/led), ROI (revenue/impact)";
          }
        }
        
        if (errorMessage.includes("CTA") || errorMessage.includes("polishedScript")) {
          specificNudge += "\n- End polishedScript with CTA question (? mark required)";
        }
        
        if (errorMessage.includes("coachingTips") || errorMessage.includes("Deep mode requires 3-5") || errorMessage.includes("Brief mode: coachingTips must be 2-3")) {
          if (depth === "brief") {
            specificNudge += `\n- Brief mode: ensure 2-3 transcript-specific tips; end polishedScript with CTA`;
          } else {
            specificNudge += `\n- Include 3-5 transcript-specific coaching tips. Reference the '%' quote with a %→$ conversion, or the 'helped' phrasing with verb-strengthening, and include mechanism/scope tip`;
          }
        }
        
        if (depth === "deep") {
          if (errorMessage.includes("aboutRewrite")) {
            specificNudge += "\n- Include aboutRewrite (3-4 lines, business-impact first)";
          }
          if (errorMessage.includes("nextSteps")) {
            specificNudge += "\n- Include 3-5 nextSteps items";
          }
        }
        
        systemPrompt += specificNudge;
      }
    }
  }

  // Fallback to mock response if both attempts fail
  throw new Error("Failed to generate valid coaching response after 2 attempts");
}

function createEnhancedMockResponse(transcript: string, targetRole: string, metrics: Metrics, depth: "brief" | "deep"): ValidatedCoachingResponse {
  const firstName = extractFirstName(transcript);
  const hasMetrics = /(\d+%|\$\d+|\d+[KMB]|increased|boosted|grew|reduced|improved)/.test(transcript);
  const specificMetric = transcript.match(/(\d+%|\$\d+|\d+[KMB])/)?.[0];
  
  // Enhanced quote extraction
  const quotes = [];
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 5);
  
  // Always include opening
  quotes.push(sentences[0]?.trim().slice(0, 50) + "..." || "Hi, I am...");
  
  // Find metric quote if exists
  if (hasMetrics) {
    const metricSentence = sentences.find(s => /(\d+%|\$\d+|\d+[KMB]|increased|boosted|grew)/.test(s));
    if (metricSentence) quotes.push(metricSentence.trim());
  }
  
  // Add passionate/aspirational quote
  const passionSentence = sentences.find(s => /(passionate|love|excited|looking for|seeking)/.test(s));
  if (passionSentence) quotes.push(passionSentence.trim());
  
  // Ensure we have at least 3 quotes
  while (quotes.length < 3 && sentences.length > quotes.length) {
    quotes.push(sentences[quotes.length]?.trim() || "Additional context from pitch");
  }
  
  return {
    overallScore: 7.3,
    rubric: { pace: 7.5, fillers: 6.8, readability: 7.2, contentDensity: hasMetrics ? 8.2 : 6.8 },
    overallScoreLLM: 7.1,
    executivePresence: {
      score: 7,
      feedback: `${firstName ? firstName + ', ' : ''}I can hear the confidence building as you talk about your achievements. Your voice has natural authority, especially when you mention ${specificMetric ? 'that ' + specificMetric + ' result' : 'your results'}.`,
      improvement: "Start with your shoulders back and claim that executive presence from word one - you've earned it."
    },
    strategicPositioning: {
      score: hasMetrics ? 8 : 6,
      feedback: hasMetrics ? 
        `You're thinking like a strategist when you lead with quantified business impact. ${specificMetric ? 'That ' + specificMetric + ' achievement' : 'Those results'} immediately position you above your peers.` : 
        "I can sense the strategic thinking, but we need to quantify the impact to help hiring managers see your true value.",
      improvement: hasMetrics ? 
        "Connect that business impact directly to the market challenge you're solving." : 
        "Add specific metrics to transform good positioning into executive-level positioning."
    },
    credibilityBuilding: {
      score: hasMetrics ? 8 : 6,
      feedback: hasMetrics ? 
        "Your credibility is rock-solid with those quantified results. You're not just telling me what you do - you're proving the value you create." :
        "I believe in your expertise, but hiring managers need proof points to champion you internally.",
      improvement: "Lead with your single most impressive metric to establish immediate credibility."
    },
    audienceEngagement: {
      score: 6,
      feedback: `Your passion comes through clearly, but ${firstName ? firstName : 'you'}, your energy should match the magnitude of your impact.`,
      improvement: "Practice pausing after your biggest achievement - let that number land with power."
    },
    directQuotes: quotes.slice(0, 3),
    mirrorBack: `${firstName ? firstName + ', ' : ''}I heard someone describing genuine expertise and real business impact. But you're presenting it like it's ordinary when it's actually exceptional.`,
    breakthrough: hasMetrics ? 
      `Here's your breakthrough moment: Stop saying you 'helped' companies. You DROVE measurable results. ${specificMetric ? 'That ' + specificMetric + ' didn\'t happen TO you - you MADE it happen.' : 'Those results aren\'t luck - they\'re your signature.'}` :
      "Your breakthrough insight: The market doesn't need another task-doer. They need a proven value-creator. Your experience proves you deliver results - now own that identity.",
    lineEdits: [
      {
        quote: hasMetrics ? "I helped companies increase" : "I work with",
        upgrade: hasMetrics ? "I drove measurable growth for companies, including a" : "I specialize in transforming",
        why: "Passive language undercuts your impact - active verbs position you as the driver of results"
      },
      {
        quote: firstName ? `I'm ${firstName}` : "I am looking for",
        upgrade: firstName ? `I'm ${firstName}, a results-driven` : "I'm actively targeting",
        why: "Generic introductions waste precious seconds - lead with your value identity"
      },
      {
        quote: "opportunities where I can make an impact",
        upgrade: `${targetRole} roles where I can replicate this ${hasMetrics ? 'measurable' : 'transformational'} success`,
        why: "Vague impact language gets forgotten - specific outcome promises get remembered"
      }
    ],
    polishedScript: hasMetrics ? 
      `I'm a strategic ${targetRole} who drives measurable business transformation. Most recently, I led initiatives that delivered ${specificMetric || 'significant ROI'} while building competitive advantages that scale. My expertise lies in turning complex challenges into quantified business value. I'm targeting ${targetRole} roles where I can replicate this success and drive breakthrough performance. I'd love to explore how my track record aligns with your growth objectives - are you available for a brief conversation this week?` :
      `I'm a strategic ${targetRole} who transforms organizational challenges into competitive advantages. My approach combines innovative thinking with measurable execution to drive sustainable business growth. I specialize in turning complex problems into scalable solutions that create lasting value. I'm targeting ${targetRole} roles where I can deliver similar transformational impact. I'd welcome the opportunity to discuss how my experience aligns with your strategic priorities - would you be open to a quick call this week?`,
    coachingTips: generateContextualTips(transcript, metrics, depth),
    ...(depth === "deep" && {
      aboutRewrite: hasMetrics ? 
        `Results-driven ${targetRole} with a proven track record of driving measurable business transformation. Combines strategic thinking with execution excellence to deliver quantified value, including ${specificMetric || 'significant performance improvements'}. Passionate about turning complex organizational challenges into sustainable competitive advantages.` :
        `Strategic ${targetRole} who transforms organizational challenges into measurable business value. Proven expertise in driving growth through innovative problem-solving and execution excellence. Passionate about creating sustainable competitive advantages through data-driven decision making and scalable solution design.`,
      nextSteps: [
        "Write down your top 3 quantified achievements and practice leading with the strongest one",
        hasMetrics ? "Research how your results compare to industry benchmarks to strengthen positioning" : "Identify specific metrics from your experience, even if they seem small",
        `Practice your polished script targeting ${targetRole} roles until the CTA feels conversational`
      ]
    })
  };
}

export async function POST(req: Request) {
  const requestStart = performance.now();
  const timings: any = {};
  
  try {
    const body = (await req.json()) as CoachRequest;
    const transcript = (body.transcript || "").trim();
    const metrics = body.metrics || { durationSec: 0, wordsPerMinute: 0, fillerCount: 0, readability: 0 };
    const targetRole = body.targetRole || "leadership";
    const pitchLengthSec = body.pitchLengthSec || 30;
    const depth = body.depth || "brief";

    if (!transcript) {
      return NextResponse.json({ error: "missing transcript" }, { status: 400 });
    }

    // Local computations (no LLM needed)
    const objectiveStart = performance.now();
    const objectiveScoring = computeObjectiveScoring(metrics, transcript);
    const firstName = extractFirstName(transcript);
    timings.objectiveMs = performance.now() - objectiveStart;

    console.log(`Coaching API: ${transcript.length} chars, ${depth} mode`);

    let deepResponse: any;
    let meta: any = {};

    if (!openai) {
      console.warn("Coaching API: No OpenAI key, using mock");
      const mockStart = performance.now();
      deepResponse = createEnhancedMockResponse(transcript, targetRole, metrics, "deep");
      timings.llmMs = performance.now() - mockStart;
      meta.fallbackToMock = true;
    } else {
      try {
        // Always generate Deep content, surgical optimizations applied
        const llmStart = performance.now();
        deepResponse = await generateCoachingWithRetry(transcript, metrics, targetRole, pitchLengthSec, firstName, "deep");
        timings.llmMs = performance.now() - llmStart;
        meta.model = "gpt-4o-mini";
      } catch (error) {
        console.error("Coaching API: Generation failed, single retry:", error);
        
        // Max 1 retry 
        try {
          const retryStart = performance.now();
          deepResponse = await generateCoachingWithRetry(transcript, metrics, targetRole, pitchLengthSec, firstName, "deep");
          timings.llmMs = performance.now() - retryStart;
          meta.model = "gpt-4o-mini";
          meta.retried = true;
        } catch (retryError) {
          console.error("Coaching API: Retry failed, using mock fallback");
          const mockStart = performance.now();
          deepResponse = createEnhancedMockResponse(transcript, targetRole, metrics, "deep");
          timings.llmMs = performance.now() - mockStart;
          meta.fallbackToMock = true;
        }
      }
    }

    // Local post-processing (fast)
    const postProcessStart = performance.now();
    
    // Apply mode-specific trimming locally
    let finalResponse: any;
    if (depth === "brief") {
      // Brief mode: strict compliance trim (≤2 quotes, ≤2 edits, 2-3 tips)
      finalResponse = trimToBriefCompliance(deepResponse, transcript, metrics);
    } else {
      // Deep mode: tip synthesizer for 3-5 tips
      if (deepResponse.coachingTips) {
        const enhancedTips = synthesizeDeepTips(
          deepResponse.coachingTips,
          transcript,
          metrics,
          deepResponse.directQuotes || []
        );
        deepResponse.coachingTips = enhancedTips;
      }
      finalResponse = deepResponse;
    }

    // Apply objective scoring blend (80% objective, 20% LLM)
    const finalOverallScore = Math.round(
      (objectiveScoring.overall * 0.8 + (finalResponse.overallScoreLLM || 7) * 0.2) * 10
    ) / 10;

    // Apply pitch length guard and CTA ensuring (local processing)
    let scriptWithCta = ensureCtaEnding(finalResponse.polishedScript || "", targetRole);
    scriptWithCta = trimScriptToLength(scriptWithCta, pitchLengthSec);
    
    // Ensure mirrorBack uses first name and direct voice
    let mirrorBack = finalResponse.mirrorBack || "";
    mirrorBack = mirrorBack.replace(/\bsomeone\b/gi, 'you');
    if (firstName && !mirrorBack.toLowerCase().includes(firstName.toLowerCase())) {
      mirrorBack = `${firstName}, ${mirrorBack.replace(/^[A-Z]/, (c) => c.toLowerCase())}`;
    }
    
    timings.postProcessMs = performance.now() - postProcessStart;
    timings.totalMs = performance.now() - requestStart;
    
    // Construct final response with performance telemetry
    const result = {
      ...finalResponse,
      overallScore: Math.min(10, Math.max(0, finalOverallScore)),
      rubric: objectiveScoring,
      polishedScript: scriptWithCta,
      mirrorBack,
      meta: {
        performance: timings,
        ...meta
      }
    } as CoachingResponse;

    console.log(`Coaching API: ${timings.totalMs.toFixed(1)}ms total (LLM: ${timings.llmMs?.toFixed(1) || 0}ms)`);
    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Coaching API: Unexpected error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}