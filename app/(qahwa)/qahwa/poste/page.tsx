"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface Employee {
  id: string;
  name: string;
  position: string;
  code: string;
  photo_url: string | null;
}

type Step = "checking" | "code" | "camera" | "welcome" | "error";

function roleRoute(position: string) {
  const p = (position || "").toLowerCase();
  if (p.includes("barista")) return "/qahwa/poste/kds";
  if (p.includes("serveur")) return "/qahwa/poste/tables";
  if (p.includes("caiss")) return "/qahwa/poste/tables";
  return "/qahwa";
}

export default function PostePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("checking");
  const [code, setCode] = useState("");
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("qahwa-poste-employee");
    if (!raw) {
      setStep("code");
      return;
    }

    (async () => {
      try {
        const saved = JSON.parse(raw);
        const { data: emp } = await supabase
          .from("employees")
          .select("id, name, position, code")
          .eq("id", saved.id)
          .maybeSingle();
        if (emp) {
          router.replace(roleRoute(emp.position));
        } else {
          localStorage.removeItem("qahwa-poste-employee");
          setStep("code");
        }
      } catch {
        localStorage.removeItem("qahwa-poste-employee");
        setStep("code");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pressDigit(d: string) {
    if (code.length < 6) setCode((c) => c + d);
  }

  function resetToCode() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setStep("code");
    setCode("");
    setEmployee(null);
    setErrorMsg("");
  }

  async function handleSubmit() {
    if (!code) return;

    const { data: emp } = await supabase
      .from("employees")
      .select("id, name, position, code, photo_url")
      .eq("code", code)
      .eq("active", true)
      .maybeSingle();

    if (!emp) {
      setErrorMsg("Code non reconnu.");
      setStep("error");
      setTimeout(resetToCode, 2000);
      return;
    }

    setEmployee(emp as Employee);
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
    if (!videoRef.current || !canvasRef.current || !employee) return;
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

        const fileName = `${employee.id}-${Date.now()}.jpg`;
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
          employee_id: employee.id,
          event_type: "in",
          photo_url: photoUrl,
        });

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        localStorage.setItem(
          "qahwa-poste-employee",
          JSON.stringify({ id: employee.id, name: employee.name })
        );

        setSaving(false);
        setStep("welcome");

        setTimeout(() => {
          router.push(roleRoute(employee.position));
        }, 1600);
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

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 overflow-hidden bg-qahwa-bg p-6 text-qahwa-text">
      <style>{`
        @keyframes qahwa-welcome-in {
          0% { opacity: 0; transform: scale(0.85) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes qahwa-ring {
          0% { transform: scale(0.9); opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes qahwa-glow-drift {
          0%, 100% { transform: translate(-10%, -10%) scale(1); }
          50% { transform: translate(10%, 10%) scale(1.15); }
        }
        .qahwa-welcome-anim {
          animation: qahwa-welcome-in 0.5s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .qahwa-ring {
          animation: qahwa-ring 1.4s ease-out infinite;
        }
        .qahwa-glow {
          animation: qahwa-glow-drift 8s ease-in-out infinite;
        }
        .qahwa-key {
          transition: transform 0.12s ease, background 0.12s ease;
        }
        .qahwa-key:active {
          transform: scale(0.92);
        }
      `}</style>

      <div
        aria-hidden
        className="qahwa-glow pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-qahwa-orange/20 blur-3xl"
      />

      {step === "checking" && (
        <p className="relative z-10 text-sm text-qahwa-muted">
          Verification...
        </p>
      )}

      {step === "code" && (
        <>
          <div className="relative z-10 flex flex-col items-center gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-black/40 shadow-panel backdrop-blur-xl">
              <Image src="/logo-white.png" alt="Qahwa" width={32} height={32} />
            </div>
            <h1 className="font-display text-3xl uppercase tracking-wide text-qahwa-text">
              QAHWA
            </h1>
            <p className="text-sm text-qahwa-muted">
              Entre ton code personnel pour commencer
            </p>
          </div>

          <div className="relative z-10 flex gap-2.5">
            {Array.from({ length: Math.max(4, code.length) }).map((_, i) => (
              <div
                key={i}
                className={`flex h-14 w-11 items-center justify-center rounded-xl border font-display text-2xl transition-all ${
                  i < code.length
                    ? "border-qahwa-orange/60 bg-qahwa-orange/10 text-qahwa-orange"
                    : "border-white/10 bg-black/30 text-qahwa-text backdrop-blur-xl"
                }`}
              >
                {code[i] ?? ""}
              </div>
            ))}
          </div>

          <div className="relative z-10 grid grid-cols-3 gap-3 rounded-3xl border border-white/10 bg-black/30 p-4 shadow-panel backdrop-blur-xl">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
              <button
                key={d}
                onClick={() => pressDigit(d)}
                className="qahwa-key h-16 w-16 rounded-2xl border border-white/10 bg-white/5 font-display text-xl text-qahwa-text shadow-panel"
              >
                {d}
              </button>
            ))}
            <button
              onClick={() => setCode((c) => c.slice(0, -1))}
              className="qahwa-key h-16 w-16 rounded-2xl border border-white/10 bg-white/5 font-display text-[11px] uppercase text-qahwa-muted shadow-panel"
            >
              Effacer
            </button>
            <button
              onClick={() => pressDigit("0")}
              className="qahwa-key h-16 w-16 rounded-2xl border border-white/10 bg-white/5 font-display text-xl text-qahwa-text shadow-panel"
            >
              0
            </button>
            <button
              onClick={handleSubmit}
              className="qahwa-key h-16 w-16 rounded-2xl border border-qahwa-orange bg-qahwa-orange font-display text-sm uppercase text-qahwa-noir shadow-panel"
            >
              OK
            </button>
          </div>
        </>
      )}

      {step === "camera" && employee && (
        <div className="relative z-10 flex flex-col items-center gap-4">
          <h1 className="font-display text-xl uppercase text-qahwa-text">
            {employee.name} — Arrivee
          </h1>
          <p className="text-sm text-qahwa-muted">
            Regarde la camera et prends la photo
          </p>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full max-w-sm rounded-2xl border border-white/10 shadow-panel"
          />
          <canvas ref={canvasRef} className="hidden" />
          <div className="flex gap-3">
            <button
              onClick={resetToCode}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-display uppercase text-qahwa-muted backdrop-blur-xl"
            >
              Annuler
            </button>
            <button
              onClick={handleCapture}
              disabled={saving}
              className="rounded-xl border border-qahwa-orange bg-qahwa-orange px-6 py-2 text-sm font-display uppercase text-qahwa-noir disabled:opacity-50"
            >
              {saving ? "Enregistrement..." : "Capturer"}
            </button>
          </div>
        </div>
      )}

      {step === "welcome" && employee && (
        <div className="qahwa-welcome-anim relative z-10 flex flex-col items-center gap-4 text-center">
          <div className="relative flex h-24 w-24 items-center justify-center">
            <span className="qahwa-ring absolute inset-0 rounded-full border-2 border-qahwa-orange" />
            {employee.photo_url ? (
              <img
                src={employee.photo_url}
                alt={employee.name}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-qahwa-orange/20 font-display text-2xl uppercase text-qahwa-orange">
                {employee.name.charAt(0)}
              </div>
            )}
          </div>
          <p className="font-display text-2xl uppercase text-qahwa-text">
            Bonjour {employee.name}
          </p>
          <p className="text-sm text-qahwa-muted">
            {employee.position || "Employe"} — direction ton poste...
          </p>
        </div>
      )}

      {step === "error" && (
        <div className="relative z-10 rounded-2xl border border-qahwa-rouge/40 bg-qahwa-rouge/10 p-8 text-center text-qahwa-rouge backdrop-blur-xl">
          {errorMsg}
        </div>
      )}
    </div>
  );
}