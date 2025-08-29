import { NextRequest, NextResponse } from "next/server";
// Dynamic import for file-type to avoid module resolution issues

// PDF parsing with proper error handling
async function parsePDF(buffer: Buffer) {
  try {
    // Dynamic import to avoid server initialization issues
    const pdfParse = await import('pdf-parse').then(mod => mod.default);
    return await pdfParse(buffer);
  } catch (error) {
    throw new Error(`PDF parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export const runtime = "nodejs";

interface PDFUploadResponse {
  ok: boolean;
  method?: string;
  pageCount?: number;
  bytes?: number;
  text?: string;
  error?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<PDFUploadResponse>> {
  try {
    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    // Validate file presence
    if (!file) {
      return NextResponse.json({ 
        ok: false, 
        error: "No file provided" 
      }, { status: 400 });
    }

    // Enforce file size limit (10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        ok: false, 
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
      }, { status: 400 });
    }

    // Convert to buffer for processing
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // MIME type validation using file-type (more reliable than file.type)
    const fileType = await import("file-type");
    const detectedFileType = await fileType.fromBuffer(buffer);
    
    if (!detectedFileType || detectedFileType.mime !== 'application/pdf') {
      return NextResponse.json({ 
        ok: false, 
        error: "Invalid file type. Only PDF files are accepted." 
      }, { status: 400 });
    }

    console.log("PDF Upload: Processing file", {
      name: file.name,
      size: file.size,
      detectedMime: detectedFileType.mime
    });

    // Parse PDF content
    let pdfData;
    try {
      pdfData = await parsePDF(buffer);
    } catch (parseError) {
      console.error("PDF parsing error:", parseError);
      
      // TODO: Add OCR fallback service here
      // For PDFs that are image-based or have parsing issues,
      // you could integrate with services like:
      // - Google Cloud Vision API
      // - AWS Textract
      // - Azure Computer Vision
      // - Tesseract.js for client-side OCR
      // 
      // Example integration point:
      // if (parseError.message.includes('text extraction failed')) {
      //   try {
      //     const ocrResult = await ocrFallbackService(buffer);
      //     return NextResponse.json({
      //       ok: true,
      //       method: "ocr-fallback",
      //       pageCount: ocrResult.pageCount,
      //       bytes: buffer.length,
      //       text: ocrResult.text
      //     });
      //   } catch (ocrError) {
      //     return NextResponse.json({ 
      //       ok: false, 
      //       error: "Failed to extract text from PDF using both direct parsing and OCR" 
      //     }, { status: 500 });
      //   }
      // }

      return NextResponse.json({ 
        ok: false, 
        error: parseError instanceof Error ? parseError.message : "PDF parsing failed" 
      }, { status: 500 });
    }

    // Validate extracted content
    if (!pdfData.numpages || pdfData.numpages === 0) {
      return NextResponse.json({ 
        ok: false, 
        error: "PDF appears to be empty (0 pages)" 
      }, { status: 400 });
    }

    const extractedText = pdfData.text?.trim() || "";
    if (extractedText.length === 0) {
      // TODO: This is another good place for OCR fallback
      // The PDF might be image-based or have non-extractable text
      return NextResponse.json({ 
        ok: false, 
        error: "No text could be extracted from PDF. The file might be image-based or password-protected." 
      }, { status: 400 });
    }

    // Success response
    const response: PDFUploadResponse = {
      ok: true,
      method: "pdf-parse",
      pageCount: pdfData.numpages,
      bytes: buffer.length,
      text: extractedText
    };

    console.log("PDF Upload: Success", {
      pageCount: pdfData.numpages,
      textLength: extractedText.length,
      fileSize: buffer.length
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error("PDF Upload: Unexpected error", error);
    
    return NextResponse.json({ 
      ok: false, 
      error: "Internal server error during PDF processing" 
    }, { status: 500 });
  }
}

// Optional: Add a GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    message: "PDF Upload API",
    endpoints: {
      POST: "Upload and parse PDF file",
      maxSize: "10MB",
      acceptedTypes: ["application/pdf"],
      response: {
        success: "{ ok: true, method: 'pdf-parse', pageCount: number, bytes: number, text: string }",
        error: "{ ok: false, error: string }"
      }
    }
  });
}
