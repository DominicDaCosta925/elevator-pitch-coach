import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";

export const runtime = "nodejs";

async function extractTextFromFile(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = file.name.toLowerCase();

  try {
    if (fileName.endsWith('.pdf')) {
      // Temporarily disabled PDF support due to library issues
      // You can upload a TXT or DOCX version of your resume instead
      throw new Error('PDF support is temporarily disabled. Please upload your resume as a .txt or .docx file instead.');
    } else if (fileName.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } else if (fileName.endsWith('.txt')) {
      return buffer.toString('utf-8');
    } else {
      throw new Error('Unsupported file type. Please upload a .txt or .docx file.');
    }
  } catch (error) {
    console.error('File extraction error:', error);
    throw error; // Re-throw the original error message
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

    // Validate file type (temporarily no PDF support)
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    const isValidExtension = file.name.toLowerCase().match(/\.(docx|txt)$/);
    
    if (!validTypes.includes(file.type) && !isValidExtension) {
      return NextResponse.json({ 
        error: "Please upload a DOCX or TXT file. PDF support is temporarily disabled." 
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
