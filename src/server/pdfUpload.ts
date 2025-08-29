import { Router, Request, Response } from 'express';
import multer from 'multer';
// Dynamic import for file-type will be used in the handler

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

interface PDFUploadResponse {
  ok: boolean;
  method?: string;
  pageCount?: number;
  bytes?: number;
  text?: string;
  error?: string;
}

// Configure multer for memory storage (secure, no files written to disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Only allow single file upload
  },
  fileFilter: (req, file, cb) => {
    // Basic MIME type check (will be verified more thoroughly later)
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Create Express router
const router = Router();

// PDF upload and parsing endpoint
router.post('/upload', upload.single('file'), async (req: Request, res: Response<PDFUploadResponse>) => {
  try {
    // Validate file presence
    if (!req.file) {
      return res.status(400).json({ 
        ok: false, 
        error: "No file provided" 
      });
    }

    const { buffer, originalname, size } = req.file;

    // MIME type validation using file-type (more reliable than multer's check)
    const fileType = await import('file-type');
    const detectedFileType = await fileType.fromBuffer(buffer);
    
    if (!detectedFileType || detectedFileType.mime !== 'application/pdf') {
      return res.status(400).json({ 
        ok: false, 
        error: "Invalid file type. Only PDF files are accepted." 
      });
    }

    console.log("PDF Upload: Processing file", {
      name: originalname,
      size: size,
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
      //     return res.json({
      //       ok: true,
      //       method: "ocr-fallback",
      //       pageCount: ocrResult.pageCount,
      //       bytes: buffer.length,
      //       text: ocrResult.text
      //     });
      //   } catch (ocrError) {
      //     return res.status(500).json({ 
      //       ok: false, 
      //       error: "Failed to extract text from PDF using both direct parsing and OCR" 
      //     });
      //   }
      // }

      return res.status(500).json({ 
        ok: false, 
        error: parseError instanceof Error ? parseError.message : "PDF parsing failed" 
      });
    }

    // Validate extracted content
    if (!pdfData.numpages || pdfData.numpages === 0) {
      return res.status(400).json({ 
        ok: false, 
        error: "PDF appears to be empty (0 pages)" 
      });
    }

    const extractedText = pdfData.text?.trim() || "";
    if (extractedText.length === 0) {
      // TODO: This is another good place for OCR fallback
      // The PDF might be image-based or have non-extractable text
      return res.status(400).json({ 
        ok: false, 
        error: "No text could be extracted from PDF. The file might be image-based or password-protected." 
      });
    }

    // Success response
    const response: PDFUploadResponse = {
      ok: true,
      method: "pdf-text-extract",
      pageCount: pdfData.numpages,
      bytes: buffer.length,
      text: extractedText
    };

    console.log("PDF Upload: Success", {
      pageCount: pdfData.numpages,
      textLength: extractedText.length,
      fileSize: buffer.length
    });

    res.json(response);

  } catch (error) {
    console.error("PDF Upload: Unexpected error", error);
    
    res.status(500).json({ 
      ok: false, 
      error: "Internal server error during PDF processing" 
    });
  }
});

// Handle multer errors
router.use('/upload', (error: any, req: Request, res: Response, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        ok: false,
        error: 'File too large. Maximum size is 10MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        ok: false,
        error: 'Too many files. Only one file allowed'
      });
    }
  }
  
  res.status(400).json({
    ok: false,
    error: error.message || 'File upload error'
  });
});

// Test endpoint
router.get('/info', (req: Request, res: Response) => {
  res.json({
    message: "PDF Upload API",
    endpoints: {
      "POST /upload": "Upload and parse PDF file",
      maxSize: "10MB",
      acceptedTypes: ["application/pdf"],
      response: {
        success: "{ ok: true, method: 'pdf-parse', pageCount: number, bytes: number, text: string }",
        error: "{ ok: false, error: string }"
      }
    }
  });
});

export default router;

// Example usage in your Express app:
// import express from 'express';
// import pdfUploadRouter from './server/pdfUpload';
// 
// const app = express();
// 
// // Mount the PDF upload router
// app.use('/api/pdf', pdfUploadRouter);
// 
// // Now you can POST to /api/pdf/upload with a PDF file
// // And GET /api/pdf/info for API information
