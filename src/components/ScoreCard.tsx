import type { Metrics } from "@/lib/types";

export default function ScoreCard({ m }: { m: Metrics }) {
  const ok = (b: boolean) => (b ? "border-green-400" : "border-amber-400");
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4">
      <Card label="Time" value={`${Math.round(m.durationSec)}s`} cls={ok(m.durationSec >= 25 && m.durationSec <= 35)} />
      <Card label="WPM" value={`${m.wordsPerMinute}`} cls={ok(m.wordsPerMinute >= 125 && m.wordsPerMinute <= 165)} />
      <Card label="Fillers" value={`${m.fillerCount}`} cls={ok(m.fillerCount <= 3)} />
      <Card label="Readability (≈grade)" value={`${m.readability}`} cls={ok(m.readability <= 10)} />
    </div>
  );
}

function Card({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className={`rounded-2xl p-4 border ${cls}`}>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
