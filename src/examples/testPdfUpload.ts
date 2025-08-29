// Example client code for testing the PDF upload API
// This demonstrates how to use both the Next.js API route and Express router

import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

interface PDFUploadResponse {
  ok: boolean;
  method?: string;
  pageCount?: number;
  bytes?: number;
  text?: string;
  error?: string;
}

// Test function for Next.js API route
async function testNextJSPDFUpload(pdfPath: string): Promise<void> {
  try {
    console.log('Testing Next.js PDF Upload API...');
    
    const form = new FormData();
    form.append('file', fs.createReadStream(pdfPath));
    
    const response = await fetch('http://localhost:3000/api/pdf-upload', {
      method: 'POST',
      body: form,
    });
    
    const result: PDFUploadResponse = await response.json();
    
    if (result.ok) {
      console.log('✅ Success!');
      console.log(`Method: ${result.method}`);
      console.log(`Pages: ${result.pageCount}`);
      console.log(`Size: ${result.bytes} bytes`);
      console.log(`Text length: ${result.text?.length} characters`);
      console.log(`First 200 characters: ${result.text?.substring(0, 200)}...`);
    } else {
      console.log('❌ Error:', result.error);
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
}

// Test function for Express router (if you mount it)
async function testExpressPDFUpload(pdfPath: string): Promise<void> {
  try {
    console.log('Testing Express PDF Upload API...');
    
    const form = new FormData();
    form.append('file', fs.createReadStream(pdfPath));
    
    const response = await fetch('http://localhost:3000/api/pdf/upload', {
      method: 'POST',
      body: form,
    });
    
    const result: PDFUploadResponse = await response.json();
    
    if (result.ok) {
      console.log('✅ Success!');
      console.log(`Method: ${result.method}`);
      console.log(`Pages: ${result.pageCount}`);
      console.log(`Size: ${result.bytes} bytes`);
      console.log(`Text length: ${result.text?.length} characters`);
      console.log(`First 200 characters: ${result.text?.substring(0, 200)}...`);
    } else {
      console.log('❌ Error:', result.error);
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
}

// Frontend example (for browser usage)
export function createPDFUploadForm(): HTMLFormElement {
  const form = document.createElement('form');
  form.innerHTML = `
    <input type="file" accept=".pdf" name="pdfFile" required>
    <button type="submit">Upload PDF</button>
    <div id="result"></div>
  `;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
    const resultDiv = form.querySelector('#result') as HTMLDivElement;
    
    if (!fileInput.files?.[0]) {
      resultDiv.innerHTML = '<p style="color: red;">Please select a PDF file</p>';
      return;
    }
    
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    
    try {
      resultDiv.innerHTML = '<p>Uploading and parsing PDF...</p>';
      
      const response = await fetch('/api/pdf-upload', {
        method: 'POST',
        body: formData
      });
      
      const result: PDFUploadResponse = await response.json();
      
      if (result.ok) {
        resultDiv.innerHTML = `
          <div style="color: green;">
            <h3>✅ Success!</h3>
            <p><strong>Method:</strong> ${result.method} (Mozilla PDF.js)</p>
            <p><strong>Pages:</strong> ${result.pageCount}</p>
            <p><strong>Size:</strong> ${result.bytes} bytes</p>
            <p><strong>Text length:</strong> ${result.text?.length} characters</p>
            <details>
              <summary>Preview text</summary>
              <pre style="white-space: pre-wrap; max-height: 200px; overflow-y: auto;">
                ${result.text?.substring(0, 1000)}...
              </pre>
            </details>
          </div>
        `;
      } else {
        resultDiv.innerHTML = `<p style="color: red;">❌ Error: ${result.error}</p>`;
      }
    } catch (error) {
      resultDiv.innerHTML = `<p style="color: red;">❌ Request failed: ${error}</p>`;
    }
  });
  
  return form;
}

// Export for testing
export { testNextJSPDFUpload, testExpressPDFUpload };

// Usage examples:
// 
// For Node.js testing:
// testNextJSPDFUpload('./path/to/test.pdf');
// testExpressPDFUpload('./path/to/test.pdf');
//
// For browser usage:
// const form = createPDFUploadForm();
// document.body.appendChild(form);
