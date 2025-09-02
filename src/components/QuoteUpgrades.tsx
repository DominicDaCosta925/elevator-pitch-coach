import React from "react";

type LineEdit = { quote: string; upgrade: string; why: string };

export function QuoteUpgrades({ edits }: { edits: LineEdit[] }) {
  if (!edits?.length) return null;
  
  return (
    <div className="mt-4 grid gap-3">
      <h3 className="text-lg font-semibold text-foreground">Line-by-Line Coaching</h3>
      {edits.map((e, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-4 transition-colors">
          <div className="text-sm font-semibold mb-3 text-muted-foreground">
            What you said → Coach's upgrade
          </div>
          <div className="space-y-2">
            <div className="p-3 rounded-lg bg-muted/50">
              <span className="font-medium text-sm text-muted-foreground">You:</span>
              <p className="text-sm mt-1 italic">"{e.quote}"</p>
            </div>
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <span className="font-medium text-sm text-primary">Upgrade:</span>
              <p className="text-sm mt-1 font-medium">{e.upgrade}</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50">
              <span className="font-medium text-xs text-muted-foreground">Why this works:</span>
              <p className="text-xs mt-1 text-muted-foreground">{e.why}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
