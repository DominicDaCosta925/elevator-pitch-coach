import { z } from "zod";

// Base schema shared by both modes
const BaseCoachingSchema = z.object({
  overallScore: z.number().min(0).max(10),
  rubric: z.object({
    pace: z.number().min(0).max(10),
    fillers: z.number().min(0).max(10),
    readability: z.number().min(0).max(10),
    contentDensity: z.number().min(0).max(10),
  }),
  overallScoreLLM: z.number().min(0).max(10).optional(),
  executivePresence: z.object({
    score: z.number().min(0).max(10),
    feedback: z.string().min(10),
    improvement: z.string().min(10),
  }),
  strategicPositioning: z.object({
    score: z.number().min(0).max(10),
    feedback: z.string().min(10),
    improvement: z.string().min(10),
  }),
  credibilityBuilding: z.object({
    score: z.number().min(0).max(10),
    feedback: z.string().min(10),
    improvement: z.string().min(10),
  }),
  audienceEngagement: z.object({
    score: z.number().min(0).max(10),
    feedback: z.string().min(10),
    improvement: z.string().min(10),
  }),
  mirrorBack: z.string().min(20).max(200),
  breakthrough: z.string().min(20).max(200),
  polishedScript: z.string().min(50),
});

// Brief mode schema (compact)
export const BriefCoachingSchema = BaseCoachingSchema.extend({
  directQuotes: z.array(z.string()).min(1).max(2),
  lineEdits: z.array(z.object({
    quote: z.string().min(5),
    upgrade: z.string().min(5),
    why: z.string().min(10),
  })).min(1).max(2),
  coachingTips: z.array(z.string().min(10)).min(2).max(3),
  // Brief mode omits aboutRewrite and nextSteps
});

// Deep-dive mode schema (comprehensive)
export const DeepCoachingSchema = BaseCoachingSchema.extend({
  directQuotes: z.array(z.string()).min(3),
  lineEdits: z.array(z.object({
    quote: z.string().min(5),
    upgrade: z.string().min(5),
    why: z.string().min(10),
  })).min(3),
  coachingTips: z.array(z.string().min(10)).min(3).max(5),
  aboutRewrite: z.string().min(50),
  nextSteps: z.array(z.string().min(10)).min(3).max(5),
});

// Union type for runtime validation
export function validateCoachingResponse(data: any, depth: "brief" | "deep") {
  if (depth === "brief") {
    return BriefCoachingSchema.parse(data);
  } else {
    return DeepCoachingSchema.parse(data);
  }
}

export type BriefCoachingResponse = z.infer<typeof BriefCoachingSchema>;
export type DeepCoachingResponse = z.infer<typeof DeepCoachingSchema>;
export type ValidatedCoachingResponse = BriefCoachingResponse | DeepCoachingResponse;
