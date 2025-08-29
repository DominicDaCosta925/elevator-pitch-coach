import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  try {
    // Read the body ONCE
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const durationSec = Number(formData.get("durationSec") || 0);
    if (!file) return NextResponse.json({ error: "missing file" }, { status: 400 });

    // Buffer the incoming file and build a reusable File
    const buf = Buffer.from(await file.arrayBuffer());
    const filename = (file as any).name || `rec-${Date.now()}.webm`;
    const mime = file.type || "audio/webm";
    console.log("Transcribe API: received", { filename, mime, durationSec, size: buf.length });

    const ofile = new File([buf], filename, { type: mime });

    // Attempt 1: gpt-4o-mini-transcribe (fast)
    try {
      const tr = await openai.audio.transcriptions.create({
        model: "gpt-4o-mini-transcribe",
        file: ofile,
        language: "en",
        temperature: 0,
      } as any);
      console.log("Transcribe text (4o-mini):", JSON.stringify(tr.text));
      return NextResponse.json({ text: tr.text ?? "" });
    } catch (e: any) {
      console.log("First attempt failed", { status: e?.status, code: e?.code, message: e?.message });
    }

    // Attempt 2: whisper-1 (fallback)
    try {
      const tr = await openai.audio.transcriptions.create({
        model: "whisper-1",
        file: ofile,
        language: "en",
        temperature: 0,
      } as any);
      console.log("Transcribe text (whisper-1):", JSON.stringify(tr.text));
      return NextResponse.json({ text: tr.text ?? "" });
    } catch (e: any) {
      console.log("Fallback attempt failed", { status: e?.status, code: e?.code, message: e?.message });
      return NextResponse.json({ text: "" }); // graceful empty transcript
    }
  } catch (err: any) {
    console.error("Transcribe API fatal error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}