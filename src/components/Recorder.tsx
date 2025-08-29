"use client";
import React, { useEffect, useRef, useState } from "react";

export default function Recorder({
  onRecorded,
  maxSeconds = 30,
}: { onRecorded: (b: Blob, d: number) => void; maxSeconds?: number }) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startRef = useRef<number>(0);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
    chunksRef.current = [];
    mr.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const dur = (Date.now() - startRef.current) / 1000;
      onRecorded(blob, dur);
      stream.getTracks().forEach((t) => t.stop());
      setElapsed(0);
    };
    mediaRecorderRef.current = mr;
    mr.start();
    setRecording(true);
    startRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const s = Math.floor((Date.now() - startRef.current) / 1000);
      setElapsed(s);
      if (s >= maxSeconds) stop();
    }, 200);
  }

  function stop() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  return (
    <div className="flex items-center gap-3">
      {!recording ? (
        <button onClick={start} className="px-4 py-2 rounded-2xl bg-blue-600 text-white">Start (max {maxSeconds}s)</button>
      ) : (
        <button onClick={stop} className="px-4 py-2 rounded-2xl bg-red-600 text-white">Stop</button>
      )}
      <span className="text-sm text-gray-600 tabular-nums">{elapsed}s</span>
    </div>
  );
}
