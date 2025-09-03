export default function DesignSanity() {
  return (
    <main className="min-h-screen bg-background text-foreground p-8">
      <div className="mx-auto max-w-screen-md space-y-6">
        <h1 className="h-heading text-2xl font-semibold">Design Sanity</h1>
        <div className="rounded-2xl p-6 bg-card text-card-foreground border border-border shadow-sm">
          Card surface should be #232323 on dark, text #EDEDED.
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { label: "Quick", sec: 30 },
            { label: "Balanced", sec: 60 },
            { label: "Thorough", sec: 90 },
          ].map(o => (
            <button key={o.sec} className="h-10 rounded-[var(--radius)] border border-border hover:bg-secondary transition-colors">
              {o.label} — {o.sec}s
            </button>
          ))}
        </div>
        <p>CTA: <span className="cta-highlight">Let's connect next week.</span></p>
      </div>
    </main>
  );
}
