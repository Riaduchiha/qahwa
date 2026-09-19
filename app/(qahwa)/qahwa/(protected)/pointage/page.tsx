"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface Employee {
  id: string;
  name: string;
  code: string;
}

type Step = "code" | "camera" | "success" | "error";

export default function PointagePage() {
  const [step, setStep] = useState<Step>("code");
  const [code, setCode] = useState("");
  const [matchedEmployee, setMatchedEmployee] = useState<Employee | null>(null);
  const [actionType, setActionType] = useState<"in" | "out">("in");
  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [successTime, setSuccessTime] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  function resetToCode() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setStep("code");
    setCode("");
    setMatchedEmployee(null);
    setErrorMsg("");
  }

  async function handleSubmitCode() {
    if (!code) return;

    const { data: employee } = await supabase
      .from("employees")
      .select("id, name, code")
      .eq("code", code)
      .eq("active", true)
      .maybeSingle();

    if (!employee) {
      setErrorMsg("Code non reconnu.");
      setStep("error");
      setTimeout(resetToCode, 2000);
      return;
    }

    const { data: lastEvent } = await supabase
      .from("employee_clock_events")
      .select("event_type")
      .eq("employee_id", employee.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextAction = !lastEvent || lastEvent.event_type === "out" ? "in" : "out";
    setActionType(nextAction);
    setMatchedEmployee(employee as Employee);
    setStep("camera");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setErrorMsg("Impossible d'acceder a la camera.");
      setStep("error");
      setTimeout(resetToCode, 2500);
    }
  }

  async function handleCapture() {
    if (!videoRef.current || !canvasRef.current || !matchedEmployee) return;
    setSaving(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          setSaving(false);
          return;
        }

        const fileName = `${matchedEmployee.id}-${Date.now()}.jpg`;
        const { data: uploadData } = await supabase.storage
          .from("employee-photos")
          .upload(fileName, blob, { contentType: "image/jpeg" });

        let photoUrl: string | null = null;
        if (uploadData) {
          const { data: publicUrlData } = supabase.storage
            .from("employee-photos")
            .getPublicUrl(uploadData.path);
          photoUrl = publicUrlData.publicUrl;
        }

        await supabase.from("employee_clock_events").insert({
          employee_id: matchedEmployee.id,
          event_type: actionType,
          photo_url: photoUrl,
        });

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        setSuccessTime(
          new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
        );
        setSaving(false);
        setStep("success");
        setTimeout(resetToCode, 3000);
      },
      "image/jpeg",
      0.85
    );
  }

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  function pressDigit(d: string) {
    if (code.length < 6) setCode((c) => c + d);
  }

  return (
    <div className="flex min-h-[calc(100vh-3rem)] flex-col items-center justify-center gap-6 p-6 text-qahwa-text">
      {step === "code" && (
        <>
          <h1 className="font-display text-2xl uppercase text-qahwa-text">
            Pointage
          </h1>
          <p className="text-sm text-qahwa-muted">Entre ton code personnel</p>

          <div className="flex gap-2">
            {Array.from({ length: Math.max(4, code.length) }).map((_, i) => (
              <div
                key={i}
                className="flex h-12 w-10 items-center justify-center rounded-lg border border-qahwa-border bg-qahwa-panel2 font-display text-xl text-qahwa-text"
              >
                {code[i] ?? ""}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
              <button
                key={d}
                onClick={() => pressDigit(d)}
                className="h-16 w-16 rounded-xl border border-qahwa-border bg-qahwa-panel font-display text-xl text-qahwa-text shadow-panel active:scale-95"
              >
                {d}
              </button>
            ))}
            <button
              onClick={() => setCode((c) => c.slice(0, -1))}
              className="h-16 w-16 rounded-xl border border-qahwa-border bg-qahwa-panel2 font-display text-sm text-qahwa-muted shadow-panel active:scale-95"
            >
              Effacer
            </button>
            <button
              onClick={() => pressDigit("0")}
              className="h-16 w-16 rounded-xl border border-qahwa-border bg-qahwa-panel font-display text-xl text-qahwa-text shadow-panel active:scale-95"
            >
              0
            </button>
            <button
              onClick={handleSubmitCode}
              className="h-16 w-16 rounded-xl border border-qahwa-orange bg-qahwa-orange font-display text-sm uppercase text-qahwa-noir shadow-panel active:scale-95"
            >
              OK
            </button>
          </div>
        </>
      )}

      {step === "camera" && matchedEmployee && (
        <>
          <h1 className="font-display text-xl uppercase text-qahwa-text">
            {matchedEmployee.name} — {actionType === "in" ? "Arrivee" : "Depart"}
          </h1>
          <p className="text-sm text-qahwa-muted">
            Regarde la camera et prends la photo
          </p>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full max-w-sm rounded-xl border border-qahwa-border shadow-panel"
          />
          <canvas ref={canvasRef} className="hidden" />
          <div className="flex gap-3">
            <button
              onClick={resetToCode}
              className="rounded-lg border border-qahwa-border bg-qahwa-panel2 px-4 py-2 text-sm font-display uppercase text-qahwa-muted"
            >
              Annuler
            </button>
            <button
              onClick={handleCapture}
              disabled={saving}
              className="rounded-lg border border-qahwa-orange bg-qahwa-orange px-6 py-2 text-sm font-display uppercase text-qahwa-noir disabled:opacity-50"
            >
              {saving ? "Enregistrement..." : "Capturer"}
            </button>
          </div>
        </>
      )}

      {step === "success" && matchedEmployee && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-qahwa-green/40 bg-qahwa-green/10 p-8 text-center">
          <p className="font-display text-2xl text-qahwa-green">
            {actionType === "in" ? "Arrivee enregistree" : "Depart enregistre"}
          </p>
          <p className="text-qahwa-text">
            {matchedEmployee.name} — {successTime}
          </p>
        </div>
      )}

      {step === "error" && (
        <div className="rounded-xl border border-qahwa-rouge/40 bg-qahwa-rouge/10 p-8 text-center text-qahwa-rouge">
          {errorMsg}
        </div>
      )}
    </div>
  );
}