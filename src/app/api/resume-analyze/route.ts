import { NextRequest, NextResponse } from "next/server";
import pdf from "pdf-parse";
import mammoth from "mammoth";

export const runtime = "nodejs";

async function extractTextFromFile(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = file.name.toLowerCase();

  try {
    if (fileName.endsWith('.pdf')) {
      const data = await pdf(buffer);
      return data.text;
    } else if (fileName.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } else if (fileName.endsWith('.txt')) {
      return buffer.toString('utf-8');
    } else {
      throw new Error('Unsupported file type');
    }
  } catch (error) {
    console.error('File extraction error:', error);
    throw new Error('Failed to extract text from file');
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    console.log("Resume analyze: received file:", {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Validate file type
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    const isValidExtension = file.name.toLowerCase().match(/\.(pdf|docx|txt)$/);
    
    if (!validTypes.includes(file.type) && !isValidExtension) {
      return NextResponse.json({ 
        error: "Invalid file type. Please upload a PDF, DOCX, or TXT file." 
      }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ 
        error: "File too large. Please upload a file smaller than 10MB." 
      }, { status: 400 });
    }

    // Extract text from file
    const extractedText = await extractTextFromFile(file);
    
    if (!extractedText.trim()) {
      return NextResponse.json({ 
        error: "No text could be extracted from the file." 
      }, { status: 400 });
    }

    console.log("Resume analyze: extracted text length:", extractedText.length);

    // Clean up the text (remove excessive whitespace, normalize line breaks)
    const cleanedText = extractedText
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, '\n') // Replace multiple line breaks with single
      .trim();

    return NextResponse.json({ 
      text: cleanedText,
      wordCount: cleanedText.split(/\s+/).length,
      extractedFrom: file.name
    });

  } catch (error) {
    console.error("Resume analysis error:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to analyze resume" 
    }, { status: 500 });
  }
}
