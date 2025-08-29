import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

function getMockPitch(targetSeconds: number, targetRole?: string): string {
  const role = targetRole || "professional";
  
  if (targetSeconds <= 15) {
    return `Hi, I'm a passionate ${role} with proven experience in driving results. I specialize in problem-solving and collaboration, and I'm excited about opportunities to make a meaningful impact.`;
  } else if (targetSeconds <= 30) {
    return `Hi, I'm a dedicated ${role} with a strong background in delivering exceptional results. I have experience in leadership, project management, and strategic thinking. I'm passionate about innovation and continuous learning, and I thrive in collaborative environments where I can contribute to meaningful projects and drive positive outcomes.`;
  } else {
    return `Hello, I'm an experienced ${role} with a proven track record of success in dynamic environments. Throughout my career, I've developed expertise in strategic planning, team leadership, and process optimization. I'm passionate about leveraging technology and data-driven insights to solve complex problems and create value. I excel at building strong relationships with stakeholders and am known for my ability to adapt quickly to new challenges. I'm currently seeking opportunities where I can apply my skills in ${role} roles to drive innovation and contribute to organizational growth.`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { resumeText, targetSeconds, targetRole } = await req.json();

    if (!resumeText || typeof resumeText !== "string") {
      return NextResponse.json({ error: "Resume text is required" }, { status: 400 });
    }

    if (!targetSeconds || targetSeconds < 20 || targetSeconds > 90) {
      return NextResponse.json({ error: "Target seconds must be between 20 and 90" }, { status: 400 });
    }

    console.log("Generate pitch:", {
      resumeLength: resumeText.length,
      targetSeconds,
      targetRole: targetRole || "not specified"
    });

    // If no OpenAI API key, return mock response
    if (!openai) {
      console.warn("Generate pitch: No OPENAI_API_KEY found, returning mock response");
      return NextResponse.json({ 
        pitch: getMockPitch(targetSeconds, targetRole),
        targetSeconds,
        estimatedWords: Math.round((targetSeconds / 60) * 150) // ~150 words per minute
      });
    }

    // Calculate target word count (assuming ~150 words per minute speaking pace)
    const targetWords = Math.round((targetSeconds / 60) * 150);

    const systemPrompt = `You are an expert career coach specializing in creating compelling elevator pitches. Create a personalized elevator pitch based on the provided resume.

Guidelines:
- Target length: ${targetSeconds} seconds (~${targetWords} words)
- Speaking pace: ~150 words per minute
- Be specific and use concrete examples from the resume
- Focus on achievements, skills, and value proposition
- Make it conversational and confident
- Include a call to action or forward-looking statement
${targetRole ? `- Tailor for ${targetRole} roles specifically` : '- Keep it general but professional'}

Structure:
1. Brief introduction with current role/status
2. Key achievements and skills (with specific examples)
3. Value proposition (what you bring)
4. Forward-looking statement or call to action

Make it sound natural when spoken aloud, not like written text.`;

    const userPrompt = `Create an elevator pitch from this resume:

${resumeText}

Target: ${targetSeconds} seconds${targetRole ? ` for ${targetRole} roles` : ''}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      });

      const pitch = response.choices[0]?.message?.content ?? "";
      
      if (!pitch.trim()) {
        console.error("Empty pitch generated from OpenAI");
        return NextResponse.json({ 
          pitch: getMockPitch(targetSeconds, targetRole),
          targetSeconds,
          estimatedWords: targetWords,
          fallback: true
        });
      }

      console.log("Generate pitch: OpenAI response received, length:", pitch.length);

      return NextResponse.json({ 
        pitch: pitch.trim(),
        targetSeconds,
        estimatedWords: pitch.trim().split(/\s+/).length
      });

    } catch (openaiError: any) {
      console.error("OpenAI error in generate-pitch:", openaiError);
      
      // Handle rate limit specifically
      if (openaiError?.error?.code === 'rate_limit_exceeded') {
        console.warn("Rate limit exceeded, using mock pitch");
        return NextResponse.json({ 
          pitch: getMockPitch(targetSeconds, targetRole),
          targetSeconds,
          estimatedWords: targetWords,
          fallback: true,
          message: "Using sample pitch due to rate limits. Generated content will be available once limits reset."
        });
      }
      
      return NextResponse.json({ 
        pitch: getMockPitch(targetSeconds, targetRole),
        targetSeconds,
        estimatedWords: targetWords,
        fallback: true
      });
    }

  } catch (error) {
    console.error("Generate pitch error:", error);
    return NextResponse.json({ 
      error: "Failed to generate pitch" 
    }, { status: 500 });
  }
}
