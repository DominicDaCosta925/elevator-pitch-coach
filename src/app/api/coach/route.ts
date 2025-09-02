// src/app/api/coach/route.ts - Product-Ready Executive Coaching API
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { validateCoachingResponse, type ValidatedCoachingResponse } from "@/lib/coaching-schema";
import type { CoachingResponse } from "@/lib/types";

export const runtime = "nodejs";

const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

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
  const targetCount = depth === "brief" ? 2 : 3;
  
  // Filler-specific tip if high count
  if (metrics.fillerCount >= 6) {
    const fillers = transcript.match(/\b(um|uh|like|you know|so|actually)\b/gi);
    if (fillers && fillers.length > 0) {
      tips.push(`You said "${fillers.slice(0, 2).join('...')}" ${metrics.fillerCount}× in ${metrics.durationSec}s — replace with 1-beat pauses and start with "I am [name], a [role] who [value]"`);
    } else {
      tips.push(`${metrics.fillerCount} filler words in ${metrics.durationSec}s slows your impact — practice 1-beat pauses and memorize your opening line`);
    }
  }
  
  // Metric-specific tip if numbers present
  const metricMatch = transcript.match(/(\d+%|\$\d+|\d+[KMB]|increased|boosted|grew|improved).*?(\d+%)/i);
  if (metricMatch) {
    const metric = metricMatch[2] || metricMatch[1];
    tips.push(`You mentioned "${metric}" — strengthen this by adding business context: "${metric} sales lift = $X incremental revenue" or "${metric} efficiency gain = Y hours saved daily"`);
  }
  
  // Pace-specific tip
  if (metrics.wordsPerMinute > 170) {
    const fastPhrase = transcript.split(/[.!?]/).find(s => s.trim().length > 20)?.trim().slice(0, 40);
    if (fastPhrase) {
      tips.push(`Your pace (${metrics.wordsPerMinute} wpm) rushes past impact moments — after saying "${fastPhrase}..." pause 2 beats to let it land`);
    } else {
      tips.push(`${metrics.wordsPerMinute} wpm is too fast for executive presence — slow to 140-160 and pause after key achievements`);
    }
  } else if (metrics.wordsPerMinute < 120) {
    tips.push(`${metrics.wordsPerMinute} wpm feels hesitant — practice until you can deliver key phrases with confident energy`);
  }
  
  // Generic qualification tip if too few specific issues
  if (tips.length < targetCount) {
    const weakWord = transcript.match(/\b(helped|worked|was involved|contributed|assisted)\b/i)?.[0];
    if (weakWord) {
      tips.push(`Replace "${weakWord}" with stronger verbs: drove, led, delivered, created, transformed — own your role in the results`);
    }
  }
  
  // Opening strength tip if still needed
  if (tips.length < targetCount) {
    const opener = transcript.split(/[.!?]/)[0]?.trim();
    if (opener && opener.length > 10) {
      tips.push(`Your opener "${opener.slice(0, 30)}..." — practice until this flows in under 3 seconds with executive confidence`);
    } else {
      tips.push(`Strengthen your opening hook — lead with your role and biggest result in the first 5 seconds`);
    }
  }
  
  return tips.slice(0, targetCount);
}

const CTA_TEMPLATE_POOL = [
  "I'm targeting {role} roles at high-growth teams that value data-driven product development — are you open to a quick chat this week?",
  "I'm actively exploring opportunities in {domain}, and I'd love to connect to share examples of my work — would you be available for a conversation soon?", 
  "I'm excited to apply this impact in {role} positions where data drives revenue and innovation — are you free later this week to discuss?",
  "I'm pursuing {role} opportunities where I can deliver measurable business value through machine learning — happy to walk through my approach if you have time this week.",
  "I'm seeking {role} roles on teams solving complex business challenges with data — would you be open to a brief call in the next few days?"
];

function ensureCtaEnding(script: string, targetRole?: string): string {
  // Enhanced CTA detection patterns
  const hasCtaPattern = /(\?|opportunities?|discuss|connect|conversation|next steps?|interested|available|chat|call|time|week|available|open to)\.?\s*$/i;
  
  if (hasCtaPattern.test(script.trim())) {
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
  
  console.log(`CTA appended: template ${templateIndex + 1} for role "${role}"`);
  return `${script.trim()} ${ctaText}`;
}

function trimToBriefMode(fullResponse: any, transcript: string, metrics: Metrics, depth: "brief" | "deep"): any {
  if (depth === "deep") return fullResponse;
  
  // Trim to Brief mode requirements
  const briefResponse = {
    ...fullResponse,
    directQuotes: fullResponse.directQuotes?.slice(0, 2) || [],
    lineEdits: fullResponse.lineEdits?.slice(0, 2) || [],
    coachingTips: generateContextualTips(transcript, metrics, "brief"),
  };
  
  // Remove Deep-only fields
  delete briefResponse.aboutRewrite;
  delete briefResponse.nextSteps;
  
  return briefResponse;
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

  const userPrompt = `COACHING SESSION WITH: "${transcript}"

PERFORMANCE DATA: 
- Duration: ${metrics.durationSec}s | Pace: ${metrics.wordsPerMinute} wpm | Fillers: ${metrics.fillerCount} | Readability: ${metrics.readability}
- Target role: ${targetRole} | Desired length: ${pitchLengthSec}s

YOUR COACHING MISSION:
${firstName ? firstName : 'This person'} just shared their professional story. As Dr. Sterling, you need to:

1. LISTEN FOR GOLD: Extract 3+ exact quotes, especially any metrics/percentages they mentioned
2. MIRROR THEN ELEVATE: Start with what's strong, then show the bigger opportunity they're missing
3. SURGICAL EDITS: Provide 3+ specific upgrades:
   - One cadence edit (remove filler/redundancy) 
   - One power-verb swap (helped→drove, worked→led)
   - One ROI reframe (features→business impact)
4. BREAKTHROUGH MOMENT: Create one "aha" insight that reframes their entire positioning
5. REALISTIC SCORING: Most professionals score 6-7; be honest but encouraging

WHAT MAKES THIS TRANSFORMATIONAL:
- Quote their exact words, then reveal the bigger story
- ${firstName ? `Use ${firstName}'s name once` : 'Use their name if mentioned'} to show personal investment
- Address specific performance issues (pace/fillers) with concrete advice
- End polished script with strong CTA for ${targetRole} roles

JSON RESPONSE REQUIRED:
{
  "overallScoreLLM": number (6-8 typical, be realistic),
  "executivePresence": {"score": number, "feedback": string, "improvement": string},
  "strategicPositioning": {"score": number, "feedback": string, "improvement": string}, 
  "credibilityBuilding": {"score": number, "feedback": string, "improvement": string},
  "audienceEngagement": {"score": number, "feedback": string, "improvement": string},
  "directQuotes": [string, string, string] (include metrics if mentioned),
  "mirrorBack": string (warm reflection, 1-2 sentences),
  "breakthrough": string (one "aha" reframe),
  "lineEdits": [
    {"quote": string, "upgrade": string, "why": string} (cadence edit),
    {"quote": string, "upgrade": string, "why": string} (power-verb edit), 
    {"quote": string, "upgrade": string, "why": string} (ROI edit)
  ],
  "polishedScript": string (${pitchLengthSec}s when spoken, strong CTA ending),
  "aboutRewrite": string (3-4 lines, business impact first),
  "coachingTips": [string, string, string] (3-5 concrete actions),
  "nextSteps": [string, string, string] (3-5 specific next moves)
}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await openai!.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.4,
        messages: [
          { role: "system", content: systemPrompt },
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
        // Add regeneration hint to system prompt for second attempt
        systemPrompt += `\n\nREGENERATION NOTE: Previous attempt failed validation. Ensure JSON has exactly the required fields with minimum lengths.`;
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

    // Compute objective scoring
    const objectiveScoring = computeObjectiveScoring(metrics, transcript);
    const firstName = extractFirstName(transcript);

    console.log(`Coaching API: Processing ${transcript.length} chars, ${depth} mode, objective score: ${objectiveScoring.overall}`);

    let validatedResponse: ValidatedCoachingResponse;

    if (!openai) {
      console.warn("Coaching API: No OpenAI key, using enhanced mock");
      validatedResponse = createEnhancedMockResponse(transcript, targetRole, metrics, depth);
    } else {
      try {
        validatedResponse = await generateCoachingWithRetry(transcript, metrics, targetRole, pitchLengthSec, firstName, depth);
      } catch (error) {
        console.error("Coaching API: Falling back to mock due to generation failure:", error);
        validatedResponse = createEnhancedMockResponse(transcript, targetRole, metrics, depth);
      }
    }

    // Apply objective scoring blend (80% objective, 20% LLM)
    const finalOverallScore = Math.round(
      (objectiveScoring.overall * 0.8 + (validatedResponse.overallScoreLLM || 7) * 0.2) * 10
    ) / 10;

    // Ensure CTA in polished script
    const scriptWithCta = ensureCtaEnding(validatedResponse.polishedScript, targetRole);

    // Construct final response (cast to satisfy interface)
    const finalResponse = {
      ...validatedResponse,
      overallScore: Math.min(10, Math.max(0, finalOverallScore)),
      rubric: objectiveScoring,
      polishedScript: scriptWithCta,
    } as CoachingResponse;

    console.log(`Coaching API: Success - score ${finalResponse.overallScore}, ${finalResponse.directQuotes?.length || 0} quotes`);
    return NextResponse.json(finalResponse);

  } catch (error: any) {
    console.error("Coaching API: Unexpected error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}