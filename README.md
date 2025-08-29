![Elevator Pitch Coach](./public/readme-banner.svg)

![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![Next.js](https://img.shields.io/badge/next.js-15-black)
![TypeScript](https://img.shields.io/badge/typescript-blue)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

# Elevator Pitch Coach

A simple web app that records your elevator pitch, transcribes it with AI, and gives you feedback on timing, filler words, and clarity.

## Why I Built This

Practicing an elevator pitch is awkward. You either ramble to yourself or ask someone to listen and give feedback. I wanted a quick, no-friction tool to record a 30-second intro and get instant feedback on what worked and what didn't.

Hit record, get feedback, iterate. That's it.

## How It Works

- Record your pitch using your browser's microphone
- Audio gets transcribed using OpenAI's speech-to-text models
- App computes metrics like speaking pace, filler word count, and readability
- AI coach analyzes your transcript and returns strengths, improvements, and a polished version
- UI displays everything in a clean scorecard with actionable feedback

## Features

- On-device audio recording with real-time timer
- Automatic transcription with fallback models (gpt-4o-mini-transcribe → whisper-1)
- Speech metrics: words per minute, filler word detection, readability scoring
- AI coaching feedback with strengths, improvements, and script suggestions
- Resume upload for personalized pitch generation
- Clean, mobile-friendly interface

## Tech Stack

- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **OpenAI APIs** for transcription and coaching
- **MediaRecorder API** for audio capture

## Quick Start

### Prerequisites

- Node.js 18+
- OpenAI API key

### Installation

```bash
git clone https://github.com/DominicDaCosta925/elevator-pitch-coach.git
cd elevator-pitch-coach
npm install
```

### Environment Setup

Create `.env.local` in the project root:

```
OPENAI_API_KEY=sk-your-key-here
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | Your OpenAI API key for transcription and coaching |

## API Reference

### Transcribe Audio

```bash
curl -X POST http://localhost:3000/api/transcribe \
  -H "Content-Type: multipart/form-data" \
  -F "file=@sample.webm" \
  -F "durationSec=12"
```

Response:
```json
{
  "transcript": "Hi, I'm testing the elevator pitch coach.",
  "durationSec": 12,
  "wordCount": 8,
  "model": "gpt-4o-mini-transcribe"
}
```

### Get Coaching Feedback

```bash
curl -X POST http://localhost:3000/api/coach \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "Hi, I'm testing the elevator pitch coach.",
    "metrics": {"durationSec": 10, "wordsPerMinute": 150, "fillerCount": 1, "readability": 8}
  }'
```

Response:
```json
{
  "strengths": ["Clear introduction", "Good pacing"],
  "improvements": ["Add specific examples", "Include a call to action"],
  "polishedScript": "Hi, I'm [name], and I built an AI-powered elevator pitch coach...",
  "aboutRewrite": "Developer focused on creating practical tools..."
}
```

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── transcribe/route.ts    # Audio transcription endpoint
│   │   ├── coach/route.ts         # AI coaching endpoint
│   │   ├── resume-analyze/        # Resume processing
│   │   └── generate-pitch/        # Pitch generation
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                   # Main app interface
├── components/
│   ├── Recorder.tsx               # Audio recording component
│   ├── ScoreCard.tsx             # Metrics display
│   ├── ResumeUploader.tsx        # File upload component
│   └── PitchLengthSlider.tsx     # Duration selector
├── lib/
│   ├── metrics.ts                # Speech analysis functions
│   ├── fillerWords.ts            # Filler word detection
│   └── types.ts                  # TypeScript definitions
└── utils/
    └── recorder.ts               # Audio recording utilities
```

## Roadmap

- Better filler word detection (context-aware, not just word matching)
- Mobile app polish and iOS Safari compatibility
- Preset pitch templates for different industries
- Export options (text, audio, PDF report)
- Real scoring rubric based on pitch effectiveness research
- Team/organization features for practice sessions

## Screenshots

Drop your screenshots here:
- `public/screenshot-main.png` - Main recording interface
- `public/screenshot-feedback.png` - Coaching feedback view
- `public/demo.gif` - Full recording and feedback flow

## Notes

- Use Chrome for best MediaRecorder support
- If transcription fails, check browser console and verify your `OPENAI_API_KEY`
- Safari has quirks with audio MIME types; the app handles fallbacks automatically
- Short recordings (under 3 seconds) may not transcribe well

## License

MIT License - see LICENSE file for details.