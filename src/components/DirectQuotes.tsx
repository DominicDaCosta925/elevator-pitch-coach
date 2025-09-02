import React from "react";
import { Quote } from "lucide-react";

interface DirectQuotesProps {
  quotes: string[];
}

export function DirectQuotes({ quotes }: DirectQuotesProps) {
  if (!quotes || quotes.length === 0) return null;

  return (
    <div className="bg-card border rounded-2xl p-6">
      <h3 className="text-lg font-medium mb-4 claude-text flex items-center gap-2">
        <Quote className="w-5 h-5 text-primary" />
        What You Actually Said
      </h3>
      <div className="space-y-3">
        {quotes.map((quote, index) => (
          <blockquote 
            key={index}
            className="border-l-4 border-primary/30 pl-4 py-2 bg-muted/30 rounded-r-lg"
          >
            <p className="text-muted-foreground italic claude-text">
              &ldquo;{quote}&rdquo;
            </p>
          </blockquote>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-4 claude-text">
        These exact phrases from your pitch show your natural communication style.
      </p>
    </div>
  );
}
