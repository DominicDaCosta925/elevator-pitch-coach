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

import Recorder from "@/components/Recorder";
import ScoreCard from "@/components/ScoreCard";
import EnhancedScoreCard from "@/components/EnhancedScoreCard";
import { QuoteUpgrades } from "@/components/QuoteUpgrades";
import { DirectQuotes } from "@/components/DirectQuotes";
// import PitchLengthSlider from "@/components/PitchLengthSlider";
// import GeneratedPitch from "@/components/GeneratedPitch";
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

  // Extract CTA from polished script
  const extractCTA = (script: string) => {
    const sentences = script.split(/[.!?]+/).filter(s => s.trim());
    const lastSentence = sentences[sentences.length - 1]?.trim();
    if (lastSentence && (lastSentence.includes('?') || lastSentence.toLowerCase().includes('connect') || lastSentence.toLowerCase().includes('discuss'))) {
      return lastSentence;
    }
    return null;
  };

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
      <div className="min-h-screen bg-background">
        {loading && <Progress value={undefined} className="fixed top-0 left-0 right-0 z-50 h-1" />}
        
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-heading font-semibold">Elevator Pitch Coach</h1>
              <p className="text-sm text-muted-foreground">AI-powered practice & feedback</p>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Recording Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
              >
                <Card className="premium-card">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="font-heading">Record Your Pitch</CardTitle>
                        <CardDescription>
                          Practice your elevator pitch and get instant AI feedback
                        </CardDescription>
                      </div>
                      <SegmentedToggle value={isDeepMode} onChange={setIsDeepMode} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center space-y-4">
                      <Recorder onRecorded={handleRecorded} />
                      {error && (
                        <div className="w-full p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                          {error}
                        </div>
                      )}
                    </div>
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
                    <Card className="premium-card">
                      <CardHeader>
                        <CardTitle className="font-heading">Your Transcript</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm selectable leading-relaxed">{transcript}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Polished Script */}
                  {coach?.polishedScript && (
                    <Card className="premium-card">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="font-heading">Polished Script</CardTitle>
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
                        <div className="text-sm leading-relaxed">
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

            {/* Sidebar - Scorecard */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                {loading ? (
                  <ScoreCardSkeleton />
                ) : coach ? (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, delay: 0.2 }}
                  >
                    <EnhancedScoreCard coach={coach} />
                  </motion.div>
                ) : metrics ? (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, delay: 0.1 }}
                  >
                    <ScoreCard metrics={metrics} />
                  </motion.div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}