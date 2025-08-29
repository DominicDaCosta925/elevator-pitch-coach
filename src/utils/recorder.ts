// src/utils/recorder.ts
export interface RecordingResult {
  blob: Blob;
  durationSec: number;
  mimeType: string;
}

export interface Recorder {
  start(): Promise<void>;
  stop(): Promise<RecordingResult>;
  isRecording(): boolean;
  cleanup(): void;
}

// Detect best available mime type
function detectBestMimeType(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4'
  ];
  
  for (const mimeType of candidates) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }
  
  // Fallback to default
  return 'audio/webm';
}

export function createRecorder(): Recorder {
  let mediaRecorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let chunks: Blob[] = [];
  let startTime: number = 0;
  let mimeType: string = '';

  return {
    async start(): Promise<void> {
      try {
        // Clean up any existing recording
        this.cleanup();
        
        // Get user media
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Detect best mime type
        mimeType = detectBestMimeType();
        
        // Create MediaRecorder
        mediaRecorder = new MediaRecorder(stream, { mimeType });
        chunks = [];
        
        // Set up event handlers
        mediaRecorder.addEventListener('dataavailable', (event) => {
          if (event.data && event.data.size > 0) {
            chunks.push(event.data);
          }
        });
        

        // Start recording with timeslice and track time
        startTime = performance.now();
        mediaRecorder.start(100); // Use 100ms timeslice to force more frequent data chunks
        
        console.log('Recording started with mime type:', mimeType, 'using 100ms timeslice');
      } catch (error) {
        console.error('Failed to start recording:', error);
        this.cleanup();
        throw error;
      }
    },

    async stop(): Promise<RecordingResult> {
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        throw new Error('No active recording to stop');
      }

      // Add delay before stopping to ensure audio is fully captured
      await new Promise(r => setTimeout(r, 100));

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Recording stop timeout after 4 seconds'));
        }, 4000);

        let stopEventReceived = false;
        let finalDataReceived = false;

        const checkComplete = async () => {
          if (stopEventReceived && finalDataReceived) {
            clearTimeout(timeout);
            
            const endTime = performance.now();
            const durationSec = Math.round(((endTime - startTime) / 1000) * 100) / 100;
            
            // Validate minimum recording duration
            if (durationSec < 0.5) {
              console.warn('Recording too short:', durationSec, 'seconds');
              reject(new Error(`Recording too short: ${durationSec}s (minimum 0.5s)`));
              return;
            }
            
            const blob = new Blob(chunks, { type: mimeType });
            
            // Enhanced logging with audio data validation
            console.log('Recording stopped - details:', {
              durationSec,
              mimeType,
              totalChunks: chunks.length,
              blobSize: blob.size,
              chunkSizes: chunks.map(chunk => chunk.size),
              avgBytesPerSecond: Math.round(blob.size / durationSec)
            });
            
            // Log first few bytes to verify it's valid audio data
            if (blob.size > 0) {
              const arrayBuffer = await blob.slice(0, 16).arrayBuffer();
              const bytes = new Uint8Array(arrayBuffer);
              const hexBytes = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
              console.log('Audio blob first 16 bytes (hex):', hexBytes);
              
              // Check for common audio file signatures
              const signature = Array.from(bytes.slice(0, 4)).map(b => b.toString(16).padStart(2, '0')).join('');
              console.log('Audio signature:', signature);
            } else {
              console.error('Empty audio blob detected!');
              reject(new Error('Empty audio blob - no data captured'));
              return;
            }
            
            this.cleanup();
            
            resolve({
              blob,
              durationSec,
              mimeType
            });
          }
        };

        // Handle stop event
        mediaRecorder!.addEventListener('stop', () => {
          console.log('MediaRecorder stop event received');
          stopEventReceived = true;
          checkComplete();
        });

        // Handle final data event after requesting data
        const handleFinalData = (event: BlobEvent) => {
          if (event.data && event.data.size > 0) {
            chunks.push(event.data);
            console.log('Data chunk received, size:', event.data.size, 'total chunks:', chunks.length);
          }
          console.log('Final data chunk received, size:', event.data?.size || 0);
          finalDataReceived = true;
          checkComplete();
        };

        // Add temporary listener for final data
        mediaRecorder!.addEventListener('dataavailable', handleFinalData);

        // Stop recording and request final data
        mediaRecorder!.stop();
        
        // Request any remaining data - this is crucial for getting the final chunk
        setTimeout(() => {
          if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.requestData();
          }
        }, 10);
      });
    },

    isRecording(): boolean {
      return mediaRecorder?.state === 'recording';
    },

    cleanup(): void {
      if (mediaRecorder) {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
        mediaRecorder = null;
      }
      
      if (stream) {
        stream.getTracks().forEach(track => {
          track.stop();
        });
        stream = null;
      }
      
      chunks = [];
      startTime = 0;
      mimeType = '';
    }
  };
}
