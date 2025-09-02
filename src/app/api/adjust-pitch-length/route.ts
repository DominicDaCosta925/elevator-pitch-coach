import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

function adjustMockPitch(originalPitch: string, targetSeconds: number): string {
  const words = originalPitch.split(/\s+/);
  const targetWords = Math.round((targetSeconds / 60) * 150);
  
  if (words.length > targetWords) {
    // Shorten the pitch
    return words.slice(0, targetWords).join(' ') + '.';
  } else if (words.length < targetWords * 0.8) {
    // Lengthen the pitch by adding more descriptive language
    const expanded = originalPitch.replace(
      /\./g, 
      ', and I bring strong analytical skills and leadership experience to every project.'
    );
    return expanded;
  }
  
  return originalPitch;
}

export async function POST(req: NextRequest) {
  try {
    const { currentPitch, targetSeconds, originalTargetSeconds } = await req.json();

    if (!currentPitch || typeof currentPitch !== "string") {
      return NextResponse.json({ error: "Current pitch is required" }, { status: 400 });
    }

    if (!targetSeconds || targetSeconds < 20 || targetSeconds > 90) {
      return NextResponse.json({ error: "Target seconds must be between 20 and 90" }, { status: 400 });
    }

    console.log("Adjust pitch length:", {
      originalLength: currentPitch.length,
      originalTargetSeconds,
      newTargetSeconds: targetSeconds
    });

    // If no OpenAI API key, return mock adjustment
    if (!openai) {
      console.warn("Adjust pitch: No OPENAI_API_KEY found, returning mock adjustment");
      return NextResponse.json({ 
        pitch: adjustMockPitch(currentPitch, targetSeconds),
        targetSeconds,
        estimatedWords: Math.round((targetSeconds / 60) * 150)
      });
    }

    // Calculate target word count
    const targetWords = Math.round((targetSeconds / 60) * 150);
    // const currentWords = currentPitch.split(/\s+/).length;

    let instruction = "";
    if (targetSeconds > (originalTargetSeconds || 30)) {
      instruction = `Expand this elevator pitch to be approximately ${targetSeconds} seconds long (~${targetWords} words). Add more specific details, examples, or achievements while maintaining the core message and flow.`;
    } else if (targetSeconds < (originalTargetSeconds || 30)) {
      instruction = `Shorten this elevator pitch to be approximately ${targetSeconds} seconds long (~${targetWords} words). Keep the most impactful points while maintaining a natural flow.`;
    } else {
      instruction = `Refine this elevator pitch to be exactly ${targetSeconds} seconds long (~${targetWords} words). Optimize for clarity and impact.`;
    }

    const systemPrompt = `You are an expert at adjusting elevator pitch length while maintaining quality and impact. 

Guidelines:
- Target: ${targetSeconds} seconds (~${targetWords} words)
- Speaking pace: ~150 words per minute
- Maintain the core message and personal brand
- Keep it natural and conversational
- Preserve specific achievements and value propositions
- Ensure smooth flow and natural transitions

${instruction}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.5, // Lower temperature for consistency
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Adjust this pitch:\n\n${currentPitch}` }
        ],
      });

      const adjustedPitch = response.choices[0]?.message?.content ?? "";
      
      if (!adjustedPitch.trim()) {
        console.error("Empty adjusted pitch generated from OpenAI");
        return NextResponse.json({ 
          pitch: adjustMockPitch(currentPitch, targetSeconds),
          targetSeconds,
          estimatedWords: targetWords,
          fallback: true
        });
      }

      console.log("Adjust pitch: OpenAI response received, new length:", adjustedPitch.length);

      return NextResponse.json({ 
        pitch: adjustedPitch.trim(),
        targetSeconds,
        estimatedWords: adjustedPitch.trim().split(/\s+/).length
      });

    } catch (openaiError) {
      console.error("OpenAI error in adjust-pitch-length:", openaiError);
      return NextResponse.json({ 
        pitch: adjustMockPitch(currentPitch, targetSeconds),
        targetSeconds,
        estimatedWords: targetWords,
        fallback: true
      });
    }

  } catch (error) {
    console.error("Adjust pitch length error:", error);
    return NextResponse.json({ 
      error: "Failed to adjust pitch length" 
    }, { status: 500 });
  }
}
