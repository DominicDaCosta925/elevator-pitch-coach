// src/app/api/coach/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

function getMockResponse(transcript: string) {
  return {
    strengths: [
      "Clear articulation and good pace",
      "Confident tone throughout the presentation",
      "Well-structured message with logical flow"
    ],
    improvements: [
      "Add more specific examples to strengthen your points",
      "Consider reducing filler words for greater impact",
      "Practice maintaining eye contact with your audience"
    ],
    polishedScript: `Thank you for the opportunity to share my background. I'm a dedicated professional with proven experience in delivering results. My expertise lies in problem-solving and collaboration, where I've consistently contributed to successful outcomes. I'm passionate about continuous learning and bringing innovative solutions to new challenges. I'm excited about the opportunity to contribute to your team and help drive meaningful impact together.`,
    aboutRewrite: `Results-driven professional with expertise in problem-solving and collaborative leadership. Passionate about driving innovation and delivering measurable outcomes in dynamic environments.`
  };
}

export async function POST(req: NextRequest) {
  try {
    const { transcript, metrics } = await req.json();

    if (!transcript || typeof transcript !== "string") {
      console.error("Coach API: Invalid transcript received:", { transcript, metrics });
      return NextResponse.json({ error: "missing transcript" }, { status: 400 });
    }

    // If no OpenAI API key, return mock response
    if (!openai) {
      console.warn("Coach API: No OPENAI_API_KEY found, returning mock response");
      return NextResponse.json(getMockResponse(transcript));
    }

    const sys = `You are an interview & pitch coach. Be concise, specific, and actionable. Return strict JSON that matches this schema:
{
  "strengths": string[],
  "improvements": string[],
  "polishedScript": string,
  "aboutRewrite": string
}`;

    const usr = `
Transcript:
"""${transcript}"""

Metrics (approx):
${JSON.stringify(metrics ?? {}, null, 2)}

Constraints:
- Prioritize clarity, pace, and confidence.
- Keep "polishedScript" ~80–120 words.
- Keep "aboutRewrite" 2–3 crisp sentences.
- Do not include extra commentary—only return JSON.
`;

    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: usr },
      ],
      response_format: { type: "json_object" },
    });

    const content = resp.choices[0]?.message?.content ?? "";
    console.log("Coach API: OpenAI response received, content length:", content.length);

    let json: any = {};
    try {
      json = JSON.parse(content);
    } catch (parseErr) {
      console.error("Coach API: Failed to parse OpenAI response as JSON:", parseErr);
      console.error("Coach API: Raw content:", content);
      // Return mock response if parsing fails
      return NextResponse.json(getMockResponse(transcript));
    }

    return NextResponse.json({
      strengths: json.strengths ?? [],
      improvements: json.improvements ?? [],
      polishedScript: json.polishedScript ?? "",
      aboutRewrite: json.aboutRewrite ?? "",
    });
  } catch (err) {
    console.error("Coach API: Unexpected error:", err);
    // Return mock response instead of error
    try {
      const { transcript } = await req.json();
      console.log("Coach API: Falling back to mock response due to error");
      return NextResponse.json(getMockResponse(transcript || ""));
    } catch {
      console.error("Coach API: Could not parse request for fallback");
      return NextResponse.json(getMockResponse(""));
    }
  }
}
