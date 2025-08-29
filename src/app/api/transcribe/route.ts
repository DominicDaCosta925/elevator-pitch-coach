// src/app/api/transcribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { toFile } from "openai/uploads";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as unknown as File | null;
    const durationSec = Number(formData.get("durationSec") || 0);

    if (!file) {
      return NextResponse.json({ error: "missing file" }, { status: 400 });
    }

    // Convert browser File -> Node-readable file
    const bytes = await file.arrayBuffer();
    const ofile = await toFile(Buffer.from(bytes), file.name || "audio.webm", {
      type: file.type || "audio/webm",
    });

    // Transcribe with GPT-4o mini transcribe (faster, very accurate)
    const tr = await openai.audio.transcriptions.create({
      model: "gpt-4o-mini-transcribe",
      file: ofile,
      // Optional extras:
      // language: "en",            // hint language if you want
      // response_format: "json",   // default is fine
      // temperature: 0,            // keep it literal
    });

    // `text` is the full transcript
    const transcript = (tr as any).text ?? "";
    const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;

    return NextResponse.json({ transcript, durationSec, wordCount });
  } catch (err) {
    console.error("transcribe error:", err);
    // Fallback to whisper-1 if needed (useful if your account/model access is limited)
    try {
      const formData = await req.formData();
      const file = formData.get("file") as unknown as File | null;
      const durationSec = Number(formData.get("durationSec") || 0);
      if (!file) return NextResponse.json({ error: "missing file" }, { status: 400 });

      const bytes = await file.arrayBuffer();
      const ofile = await toFile(Buffer.from(bytes), file.name || "audio.webm", {
        type: file.type || "audio/webm",
      });

      const w = await openai.audio.transcriptions.create({
        model: "whisper-1",
        file: ofile,
      });

      const transcript = (w as any).text ?? "";
      const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
      return NextResponse.json({ transcript, durationSec, wordCount, model: "whisper-1" });
    } catch (fallbackErr) {
      console.error("fallback transcribe error:", fallbackErr);
      return NextResponse.json({ error: "transcription failed" }, { status: 500 });
    }
  }
}
