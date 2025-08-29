import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
// Dynamic import for file-type to avoid module resolution issues

export const runtime = "nodejs";

// PDF parsing with pdf-text-extract (Node.js compatible)
async function parsePDF(buffer: Buffer): Promise<{ numpages: number; text: string }> {
  return new Promise((resolve, reject) => {
    try {
      // Use dynamic import for pdf-text-extract
      import('pdf-text-extract').then((pdfTextExtract) => {
        const extract = pdfTextExtract.default || pdfTextExtract;
        
        // Write buffer to a temporary file for processing
        const fs = require('fs');
        const path = require('path');
        const os = require('os');
        
        const tempFile = path.join(os.tmpdir(), `pdf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.pdf`);
        
        fs.writeFileSync(tempFile, buffer);
        
        // Extract text from the temporary file
        extract(tempFile, { splitPages: false }, (err: any, pages: string[]) => {
          // Clean up temporary file
          try {
            fs.unlinkSync(tempFile);
          } catch (cleanupError) {
            console.warn('Could not clean up temp file:', cleanupError);
          }
          
          if (err) {
            reject(new Error(`PDF text extraction failed: ${err.message || err}`));
            return;
          }
          
          if (!pages || pages.length === 0) {
            reject(new Error('No text could be extracted from PDF'));
            return;
          }
          
          const fullText = Array.isArray(pages) ? pages.join('\n').trim() : String(pages).trim();
          
          resolve({
            numpages: Array.isArray(pages) ? pages.length : 1,
            text: fullText
          });
        });
      }).catch((importError) => {
        reject(new Error(`PDF parsing module import failed: ${importError.message}`));
      });
    } catch (error) {
      reject(new Error(`PDF parsing setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
}

async function extractTextFromFile(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = file.name.toLowerCase();

  try {
    if (fileName.endsWith('.pdf')) {
      // Robust PDF parsing with MIME validation
      const fileType = await import("file-type");
      const detectedFileType = await fileType.fromBuffer(buffer);
      
      if (!detectedFileType || detectedFileType.mime !== 'application/pdf') {
        throw new Error('Invalid PDF file. File appears to be corrupted or not a valid PDF.');
      }

      const pdfData = await parsePDF(buffer);
      
      if (!pdfData.numpages || pdfData.numpages === 0) {
        throw new Error('PDF appears to be empty (0 pages).');
      }

      const extractedText = pdfData.text?.trim() || "";
      if (extractedText.length === 0) {
        throw new Error('No text could be extracted from PDF. The file might be image-based or password-protected.');
      }

      return extractedText;
    } else if (fileName.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } else if (fileName.endsWith('.txt')) {
      return buffer.toString('utf-8');
    } else {
      throw new Error('Unsupported file type. Please upload a PDF, DOCX, or TXT file.');
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

    // Validate file type (PDF support now enabled)
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
