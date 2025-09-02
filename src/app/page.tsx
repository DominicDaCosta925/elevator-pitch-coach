"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sun, Moon, Copy, Check } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import Recorder from "@/components/Recorder";
import ScoreCard from "@/components/ScoreCard";
import EnhancedScoreCard from "@/components/EnhancedScoreCard";
import { QuoteUpgrades } from "@/components/QuoteUpgrades";
import { DirectQuotes } from "@/components/DirectQuotes";
import PitchLengthSlider from "@/components/PitchLengthSlider";
import GeneratedPitch from "@/components/GeneratedPitch";
import ResumeUploader from "@/components/ResumeUploader";
import { computeMetrics } from "@/lib/metrics";
import type { CoachingResponse, Metrics } from "@/lib/types";

interface RecordingResult {
  blob: Blob;
  durationSec: number;
  mimeType: string;
}

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-9 h-9 rounded-lg bg-card border" />;
  }
  
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="rounded-lg"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
};

const SegmentedToggle = ({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) => {
  return (
    <div className="inline-flex items-center bg-muted p-1 rounded-lg">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onChange(false)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                !value 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Brief
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Fast, surgical feedback</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onChange(true)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                value 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Deep
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Full coaching with edits & next steps</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

const ScoreCardSkeleton = () => (
  <Card className="premium-card">
    <CardHeader>
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-4 w-48" />
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-16 mx-auto" />
        <Skeleton className="h-4 w-24 mx-auto" />
      </div>
      <Separator />
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

// Removed unused ScriptSkeleton component

export default function Page() {
  const [transcript, setTranscript] = useState("");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [coach, setCoach] = useState<CoachingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeepMode, setIsDeepMode] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  
  // Resume pitch generation state
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState("");
  const [pitchLength, setPitchLength] = useState(30);
  const [generatedPitch, setGeneratedPitch] = useState("");
  const [isGeneratingPitch, setIsGeneratingPitch] = useState(false);
  const [isAdjustingPitch, setIsAdjustingPitch] = useState(false);
  const [originalPitchLength, setOriginalPitchLength] = useState(30);

  async function uploadBlob(blob: Blob, durationSec: number, mimeType: string) {
    const file = new File([blob], `rec-${Date.now()}.webm`, { type: mimeType || 'audio/webm' });
    const form = new FormData();
    form.append("file", file);
    form.append("durationSec", String(Math.round(durationSec * 100) / 100));

    const res = await fetch("/api/transcribe", {
      method: "POST",
      body: form,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`transcribe failed: ${res.status}`);
    const data = await res.json();
    return data.text as string;
  }

  async function handleRecorded({ blob, durationSec, mimeType }: RecordingResult) {
    try {
      setLoading(true);
      setTranscript("");
      setMetrics(null);
      setCoach(null);
      setError(null);

      const transcriptText = await uploadBlob(blob, durationSec, mimeType);
      
      if (!transcriptText || typeof transcriptText !== "string") {
        setError("No transcript was generated. Please try recording again.");
        return;
      }

      setTranscript(transcriptText);
      const m = computeMetrics(transcriptText, durationSec);
      setMetrics(m);

      // Coach API call
      const coachRes = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcriptText,
          metrics: m,
          depth: isDeepMode ? "deep" : "brief"
        }),
        cache: "no-store",
      });

      if (!coachRes.ok) {
        const errorData = await coachRes.json();
        throw new Error(errorData.error || "Coaching failed");
      }

      const coachData = await coachRes.json();
      setCoach(coachData);

    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const copyPolishedScript = async () => {
    if (!coach?.polishedScript) return;
    
    try {
      await navigator.clipboard.writeText(coach.polishedScript);
      setCopiedScript(true);
      toast.success("Script copied to clipboard!");
      setTimeout(() => setCopiedScript(false), 2000);
    } catch {
      toast.error("Failed to copy script");
    }
  };

  async function handleGeneratePitch() {
    if (!resumeFile) return;

    try {
      setIsGeneratingPitch(true);
      setError(null);

      const analyzeForm = new FormData();
      analyzeForm.append("file", resumeFile);
      
      const analyzeRes = await fetch("/api/resume-analyze", {
        method: "POST",
        body: analyzeForm,
      });
      
      if (!analyzeRes.ok) {
        const analyzeError = await analyzeRes.json();
        throw new Error(analyzeError.error || "Failed to analyze resume");
      }

      const analyzeData = await analyzeRes.json();

      const generateRes = await fetch("/api/generate-pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: analyzeData.text,
          targetSeconds: pitchLength,
          targetRole: targetRole.trim() || undefined,
        }),
      });

      if (!generateRes.ok) {
        const generateError = await generateRes.json();
        throw new Error(generateError.error || "Failed to generate pitch");
      }

      const pitchData = await generateRes.json();
      setGeneratedPitch(pitchData.pitch);
      setOriginalPitchLength(pitchLength);

    } catch {
      setError("Failed to generate pitch. Please try again.");
    } finally {
      setIsGeneratingPitch(false);
    }
  }

  async function handlePitchLengthChange(newLength: number) {
    if (!generatedPitch || newLength === originalPitchLength) return;

    try {
      setIsAdjustingPitch(true);
      setError(null);

      const res = await fetch("/api/adjust-pitch-length", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPitch: generatedPitch,
          targetSeconds: newLength,
          originalTargetSeconds: originalPitchLength,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to adjust pitch length");
      }

      const data = await res.json();
      setGeneratedPitch(data.pitch);
      setPitchLength(newLength);

    } catch {
      setError("Failed to adjust pitch length. Please try again.");
    } finally {
      setIsAdjustingPitch(false);
    }
  }

  function handlePracticeGenerated() {
    // Copy generated pitch to clipboard for easy practice
    if (generatedPitch) {
      navigator.clipboard.writeText(generatedPitch);
      toast.success("Pitch copied! Practice and record when ready.");
    }
  }

  // Extract CTA from polished script
  const extractCTA = (script: string) => {
    const sentences = script.split(/[.!?]+/).filter(s => s.trim());
    const lastSentence = sentences[sentences.length - 1]?.trim();
    if (lastSentence && (lastSentence.includes('?') || lastSentence.toLowerCase().includes('connect') || lastSentence.toLowerCase().includes('discuss'))) {
      return lastSentence;
    }
    return null;
  };

  const ScoreCardSkeleton = () => (
    <Card className="w-full rounded-2xl p-6 md:p-7 shadow-[0_6px_24px_rgba(0,0,0,0.08)] bg-card">
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
    </Card>
  );

  const renderPolishedScript = (script: string) => {
    const cta = extractCTA(script);
    if (!cta) return script;
    
    const scriptWithoutCTA = script.replace(cta, '').trim().replace(/[.!?]*$/, '');
    
    return (
      <div className="selectable">
        {scriptWithoutCTA}. <span className="cta-highlight">{cta}</span>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <main className="min-h-[100svh] bg-background">
        {loading && <Progress value={undefined} className="fixed top-0 left-0 right-0 z-50 h-1" />}
        
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="mx-auto w-full max-w-screen-2xl px-4 md:px-8 h-16 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-[-0.01em] font-heading">Elevator Pitch Coach</h1>
              <p className="text-sm text-muted-foreground">Fast, warm, surgical coaching</p>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <div className="mx-auto w-full max-w-screen-2xl px-4 md:px-8 py-8 md:py-12">
          <div className="grid gap-8 lg:gap-10 lg:grid-cols-3">
            {/* Left Column - Single Card */}
            <section className="col-span-1 w-full flex flex-col gap-8 lg:gap-10">
              {/* Resume Upload Section */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <Card className="w-full rounded-2xl p-6 md:p-7 shadow-[0_6px_24px_rgba(0,0,0,0.08)] bg-card">
                  <CardHeader>
                    <CardTitle className="font-heading text-2xl font-medium">Upload Your Resume</CardTitle>
                    <CardDescription className="max-w-prose">
                      Drag & drop or click to browse (PDF, DOCX, TXT · up to 10MB)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ResumeUploader onFileUploaded={setResumeFile} />
                    {resumeFile && (
                      <p className="text-sm text-muted-foreground">Selected: {resumeFile.name} · {(resumeFile.size / 1024).toFixed(0)} KB</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Scorecard */}
              <div className="sticky top-24">
                {loading ? (
                  <ScoreCardSkeleton />
                ) : coach ? (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, delay: 0.2 }}
                  >
                    <EnhancedScoreCard metrics={metrics || { durationSec: 0, wordsPerMinute: 0, fillerCount: 0, readability: 0 }} coaching={coach} />
                  </motion.div>
                ) : metrics ? (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, delay: 0.1 }}
                  >
                    <ScoreCard m={metrics} />
                  </motion.div>
                ) : null}
              </div>

            </section>

            {/* Right Column - Two Cards */}
            <section className="col-span-2 w-full">
              <div className="flex flex-col gap-8">
                {/* Pitch Settings */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: "easeOut", delay: 0.07 }}
                >
                  <Card className="w-full rounded-2xl p-6 md:p-7 shadow-[0_6px_24px_rgba(0,0,0,0.08)] bg-card">
                    <CardHeader>
                      <CardTitle className="font-heading text-2xl font-semibold pt-1">Pitch Settings</CardTitle>
                      <CardDescription className="text-sm text-muted-foreground max-w-prose">
                        Choose your target role, ideal length, and coaching depth.
                      </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="targetRole" className="block text-sm font-medium mb-2">Target Role (Optional)</label>
                        <input
                          id="targetRole"
                          type="text"
                          value={targetRole}
                          onChange={(e) => setTargetRole(e.target.value)}
                          placeholder="e.g., Senior Data Scientist"
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium">Pitch Length: {pitchLength}s</label>
                        <PitchLengthSlider
                          value={pitchLength}
                          onChange={setPitchLength}
                          disabled={isGeneratingPitch || isAdjustingPitch}
                        />
                        <div className="flex items-center gap-2">
                          {[20,30,45].map((p)=> (
                            <button
                              key={p}
                              type="button"
                              onClick={()=> setPitchLength(p)}
                              aria-pressed={pitchLength===p}
                              className={`px-3 py-1.5 rounded-md text-sm border transition ${pitchLength===p ? 'bg-[#2563EB] text-white border-transparent' : 'border-border hover:bg-accent'}`}
                            >
                              {p===20? '20s Quick' : p===30? '30s Balanced' : '45s Detailed'}
                            </button>
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground max-w-prose">
                          Estimated length: ~{Math.round(pitchLength*2.5*0.9)}–{Math.round(pitchLength*2.5*1.1)} words
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">Depth</span>
                        <ToggleGroup type="single" value={isDeepMode ? 'deep' : 'brief'} onValueChange={(v)=> v && setIsDeepMode(v==='deep')}>
                          <ToggleGroupItem value="brief">Brief</ToggleGroupItem>
                          <ToggleGroupItem value="deep">Deep</ToggleGroupItem>
                        </ToggleGroup>
                      </div>

                      <Button
                        onClick={handleGeneratePitch}
                        disabled={!resumeFile || isGeneratingPitch}
                        className="w-full md:w-auto bg-[#2563EB] text-white hover:bg-[#1e4fd3] focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
                      >
                        {isGeneratingPitch ? (
                          <span className="inline-flex items-center gap-2"><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>Generating…</span>
                        ) : (
                          "Generate pitch"
                        )}
                      </Button>
                    </div>
                    {loading && (
                      <Progress value={undefined} />
                    )}
                  </CardContent>
                </Card>
              </motion.div>

                {/* Practice & Results */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: "easeOut", delay: 0.08 }}
                >
                  <Card className="w-full rounded-2xl p-6 md:p-7 shadow-[0_6px_24px_rgba(0,0,0,0.08)] bg-card">
                    <CardHeader>
                      <CardTitle className="font-heading text-2xl font-semibold pt-1">Practice & Results</CardTitle>
                      <CardDescription className="text-sm text-muted-foreground max-w-prose">
                        Practice your elevator pitch and get instant AI feedback
                      </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Recording Controls */}
                    <div className="flex flex-col items-center space-y-4">
                      <Recorder onRecorded={handleRecorded} />
                    </div>

                    {error && (
                      <div className="w-full p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                        {error}
                      </div>
                    )}
                  </CardContent>
                </Card>
                </motion.div>

                {/* Results Section */}
                {(transcript || loading) && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.1 }}
                    className="space-y-6"
                  >
                    {/* Transcript */}
                    {transcript && (
                      <Card className="w-full rounded-2xl p-6 md:p-7 shadow-[0_6px_24px_rgba(0,0,0,0.08)] bg-card">
                        <CardHeader>
                          <CardTitle className="font-heading">Your Transcript</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm selectable leading-relaxed">{transcript}</p>
                        </CardContent>
                      </Card>
                    )}

                  {/* Polished Script */}
                  {generatedPitch && (
                    <div className="mt-6 p-4 bg-card border border-border rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-medium">Generated Pitch</h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(generatedPitch);
                            toast.success("Pitch copied! Practice and record when ready.");
                          }}
                          className="gap-2"
                        >
                          <Copy className="h-4 w-4" />
                          Copy
                        </Button>
                      </div>
                      <div className="text-base leading-relaxed select-text whitespace-pre-line">
                        {generatedPitch}
                      </div>
                    </div>
                  )}

                    {coach?.polishedScript && (
                      <Card className="w-full rounded-2xl p-6 md:p-7 shadow-[0_6px_24px_rgba(0,0,0,0.08)] bg-card">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="font-heading text-2xl font-medium">Polished Script</CardTitle>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={copyPolishedScript}
                              className="gap-2"
                            >
                              {copiedScript ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                              {copiedScript ? "Copied!" : "Copy"}
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-base leading-relaxed select-text whitespace-pre-line">
                            {renderPolishedScript(coach.polishedScript)}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                  {/* Direct Quotes */}
                  {coach?.directQuotes && coach.directQuotes.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: 0.2 }}
                    >
                      <DirectQuotes quotes={coach.directQuotes} />
                    </motion.div>
                  )}

                  {/* Quote Upgrades */}
                  {coach?.lineEdits && coach.lineEdits.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: 0.3 }}
                    >
                      <QuoteUpgrades edits={coach.lineEdits} />
                    </motion.div>
                  )}

                  {/* Deep Mode Sections */}
                  {isDeepMode && coach && (
                    <Accordion type="single" collapsible className="w-full">
                      {coach.aboutRewrite && (
                        <AccordionItem value="about-rewrite">
                          <AccordionTrigger className="font-heading">LinkedIn About Section</AccordionTrigger>
                          <AccordionContent>
                            <Card className="premium-card">
                              <CardContent className="pt-6">
                                <div className="text-sm leading-relaxed selectable">
                                  {coach.aboutRewrite}
                                </div>
                              </CardContent>
                            </Card>
                          </AccordionContent>
                        </AccordionItem>
                      )}
                      
                      {coach.nextSteps && coach.nextSteps.length > 0 && (
                        <AccordionItem value="next-steps">
                          <AccordionTrigger className="font-heading">Next Steps</AccordionTrigger>
                          <AccordionContent>
                            <Card className="premium-card">
                              <CardContent className="pt-6">
                                <ul className="space-y-2">
                                  {coach.nextSteps.map((step, index) => (
                                    <li key={index} className="text-sm flex items-start gap-2">
                                      <span className="text-primary font-medium">{index + 1}.</span>
                                      <span>{step}</span>
                                    </li>
                                  ))}
                                </ul>
                              </CardContent>
                            </Card>
                          </AccordionContent>
                        </AccordionItem>
                      )}
                    </Accordion>
                    )}
                  </motion.div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </TooltipProvider>
  );
}