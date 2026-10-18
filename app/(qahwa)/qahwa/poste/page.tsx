"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/components/qahwa/NotificationProvider";

interface Employee {
  id: string;
  name: string;
  position: string;
  code: string;
  photo_url: string | null;
}

type Step =
  | "checking"
  | "code"
  | "choice"
  | "camera"
  | "welcome"
  | "error";

type ActionType = "in" | "out";
type OutType = "temporary" | "final";

function roleRoute(position: string) {
  const p = (position || "").toLowerCase();

  if (p.includes("barista")) return "/qahwa/poste/kds";
  if (p.includes("serveur")) return "/qahwa/poste/tables";
  if (p.includes("caiss")) return "/qahwa/poste/tables";

  return "/qahwa";
}

export default function PostePage() {
  const router = useRouter();
  const toast = useToast();

  const [step, setStep] = useState<Step>("checking");
  const [code, setCode] = useState("");
  const [employee, setEmployee] = useState<Employee | null>(null);

  const [actionType, setActionType] = useState<ActionType>("in");
  const [outType, setOutType] = useState<OutType | null>(null);
  const [actionLabel, setActionLabel] = useState("Arrivee");

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
          router.replace(
            roleRoute((emp as { position: string }).position)
          );
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
    if (code.length < 6) {
      setCode((c) => c + d);
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }

  function resetToCode() {
    stopCamera();

    localStorage.removeItem("qahwa-poste-employee");

    setStep("code");
    setCode("");
    setEmployee(null);
    setActionType("in");
    setOutType(null);
    setActionLabel("Arrivee");
    setErrorMsg("");
    setSaving(false);
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });

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

  async function handleSubmit() {
    if (!code || saving) return;

    setSaving(true);

    const res = await fetch("/api/poste/verify-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
    });

    setSaving(false);

    if (!res.ok) {
      setErrorMsg("Code non reconnu.");
      setStep("error");

      setTimeout(resetToCode, 2000);
      return;
    }

    const { employee: emp, status } = await res.json();

    setEmployee(emp as Employee);

    if (status === "choice") {
      setStep("choice");
      return;
    }

    if (status === "return") {
      setActionType("in");
      setOutType(null);
      setActionLabel("Retour");
      setStep("camera");

      await startCamera();
      return;
    }

    setActionType("in");
    setOutType(null);
    setActionLabel("Arrivee");
    setStep("camera");

    await startCamera();
  }

  async function chooseOutType(type: OutType) {
    setActionType("out");
    setOutType(type);

    setActionLabel(
      type === "temporary"
        ? "Sortie temporaire"
        : "Sortie finale"
    );

    setStep("camera");

    await startCamera();
  }

  async function handleCapture() {
    if (
      !videoRef.current ||
      !canvasRef.current ||
      !employee ||
      saving
    ) {
      return;
    }

    setSaving(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");

    ctx?.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          setSaving(false);
          return;
        }

        const formData = new FormData();

        formData.append("employee_id", employee.id);
        formData.append("event_type", actionType);

        if (outType) {
          formData.append("out_type", outType);
        }

        formData.append("photo", blob, "photo.jpg");

        const res = await fetch("/api/poste/clock-event", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const { error } = await res.json();

          toast.error("Erreur enregistrement : " + error);

          setSaving(false);
          return;
        }

        stopCamera();

        if (actionType === "out") {
          localStorage.removeItem("qahwa-poste-employee");

          setSaving(false);
          setStep("welcome");

          setTimeout(() => {
            window.location.replace("/qahwa/poste");
          }, 1600);

          return;
        }

        localStorage.setItem(
          "qahwa-poste-employee",
          JSON.stringify({
            id: employee.id,
            name: employee.name,
          })
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
      stopCamera();
    };
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-qahwa-bg p-4 text-qahwa-text sm:p-6">
      <style>{`
        @keyframes qahwa-welcome-in {
          0% {
            opacity: 0;
            transform: scale(0.85) translateY(10px);
          }

          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes qahwa-ring {
          0% {
            transform: scale(0.9);
            opacity: 0.8;
          }

          100% {
            transform: scale(1.6);
            opacity: 0;
          }
        }

        @keyframes qahwa-glow-drift {
          0%,
          100% {
            transform: translate(-10%, -10%) scale(1);
          }

          50% {
            transform: translate(10%, 10%) scale(1.15);
          }
        }

        .qahwa-welcome-anim {
          animation: qahwa-welcome-in 0.5s
            cubic-bezier(0.22, 1, 0.36, 1);
        }

        .qahwa-ring {
          animation: qahwa-ring 1.4s ease-out infinite;
        }

        .qahwa-glow {
          animation: qahwa-glow-drift 8s ease-in-out infinite;
        }

        .qahwa-key {
          transition:
            transform 0.12s ease,
            background 0.12s ease,
            border-color 0.12s ease;
        }

        .qahwa-key:active {
          transform: scale(0.93);
        }
      `}</style>

      {/* GLOW ARRIERE-PLAN */}
      <div
        aria-hidden
        className="qahwa-glow pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-qahwa-orange/20 blur-3xl"
      />

      {/* VERIFICATION */}
      {step === "checking" && (
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-qahwa-panel shadow-panel">
            <Image
              src="/logo-white.png"
              alt="Qahwa"
              width={34}
              height={34}
              priority
            />
          </div>

          <p className="text-sm text-qahwa-muted">
            Verification...
          </p>
        </div>
      )}

      {/* CODE */}
      {step === "code" && (
        <div className="relative z-10 flex w-full max-w-md flex-col items-center">
          {/* LOGO */}
          <div className="mb-8 flex flex-col items-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-qahwa-panel shadow-2xl">
              <Image
                src="/logo-white.png"
                alt="Qahwa"
                width={42}
                height={42}
                priority
              />
            </div>

            <h1 className="mt-5 font-display text-3xl uppercase tracking-[0.18em] text-qahwa-text">
              QAHWA
            </h1>

            <div className="mt-2 flex items-center gap-2">
              <span className="h-px w-8 bg-qahwa-orange" />

              <p className="text-[10px] font-display uppercase tracking-[0.25em] text-qahwa-muted">
                Espace personnel
              </p>

              <span className="h-px w-8 bg-qahwa-orange" />
            </div>
          </div>

          {/* CARD */}
          <div className="w-full rounded-[2rem] border border-white/10 bg-qahwa-panel/90 p-5 shadow-2xl backdrop-blur-xl sm:p-6">
            <div className="mb-5 text-center">
              <p className="text-sm text-qahwa-muted">
                Entre ton code personnel
              </p>
            </div>

            {/* CODE */}
            <div className="mb-6 flex justify-center gap-2.5">
              {Array.from({ length: 6 }).map((_, i) => {
                const filled = i < code.length;

                return (
                  <div
                    key={i}
                    className={`flex h-12 w-10 items-center justify-center rounded-xl border text-xl transition-all ${
                      filled
                        ? "border-qahwa-orange/60 bg-qahwa-orange/10 text-qahwa-orange shadow-[0_0_18px_rgba(255,107,0,0.12)]"
                        : "border-white/10 bg-black/30 text-transparent"
                    }`}
                  >
                    {filled ? "•" : "•"}
                  </div>
                );
              })}
            </div>

            {/* CLAVIER */}
            <div className="grid grid-cols-3 gap-3">
              {[
                "1",
                "2",
                "3",
                "4",
                "5",
                "6",
                "7",
                "8",
                "9",
              ].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => pressDigit(d)}
                  disabled={saving || code.length >= 6}
                  className="qahwa-key flex h-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] font-display text-xl text-qahwa-text transition hover:border-qahwa-orange/40 hover:bg-qahwa-orange/10 hover:text-qahwa-orange active:scale-95 disabled:opacity-40"
                >
                  {d}
                </button>
              ))}

              {/* EFFACER */}
              <button
                type="button"
                onClick={() =>
                  setCode((c) => c.slice(0, -1))
                }
                disabled={saving || code.length === 0}
                className="qahwa-key flex h-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] font-display text-[10px] uppercase tracking-wide text-qahwa-muted transition hover:border-white/20 hover:text-qahwa-text active:scale-95 disabled:opacity-30"
              >
                Effacer
              </button>

              {/* 0 */}
              <button
                type="button"
                onClick={() => pressDigit("0")}
                disabled={saving || code.length >= 6}
                className="qahwa-key flex h-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] font-display text-xl text-qahwa-text transition hover:border-qahwa-orange/40 hover:bg-qahwa-orange/10 hover:text-qahwa-orange active:scale-95 disabled:opacity-40"
              >
                0
              </button>

              {/* ENTRER */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving || code.length === 0}
                className="qahwa-key flex h-16 items-center justify-center rounded-2xl border border-qahwa-orange bg-qahwa-orange font-display text-sm uppercase tracking-wide text-qahwa-noir shadow-[0_0_24px_rgba(255,107,0,0.18)] transition hover:bg-qahwa-orange/90 active:scale-95 disabled:opacity-40"
              >
                {saving ? "..." : "Entrer"}
              </button>
            </div>

            {/* SECURITE */}
            <div className="mt-5 flex items-center justify-center gap-2 text-[10px] uppercase tracking-wider text-qahwa-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-qahwa-green" />
              Poste sécurisé
            </div>
          </div>
        </div>
      )}

      {/* CHOIX SORTIE */}
      {step === "choice" && employee && (
        <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-5 rounded-[2rem] border border-white/10 bg-qahwa-panel/90 p-7 text-center shadow-2xl backdrop-blur-xl">
          {employee.photo_url ? (
            <img
              src={employee.photo_url}
              alt={employee.name}
              className="h-20 w-20 rounded-full object-cover ring-2 ring-qahwa-orange/30"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-qahwa-orange/10 font-display text-2xl uppercase text-qahwa-orange ring-2 ring-qahwa-orange/20">
              {employee.name.charAt(0)}
            </div>
          )}

          <div>
            <h1 className="font-display text-2xl uppercase tracking-wide text-qahwa-text">
              {employee.name}
            </h1>

            <p className="mt-1 text-xs uppercase tracking-wider text-qahwa-muted">
              {employee.position || "Employé"}
            </p>

            <p className="mt-4 text-sm text-qahwa-muted">
              Que veux-tu enregistrer ?
            </p>
          </div>

          <div className="flex w-full flex-col gap-3">
            <button
              onClick={() =>
                chooseOutType("temporary")
              }
              className="rounded-2xl border border-qahwa-orange/40 bg-qahwa-orange/10 px-8 py-4 font-display text-base uppercase text-qahwa-orange shadow-panel transition hover:bg-qahwa-orange/15 active:scale-95"
            >
              Sortie temporaire
            </button>

            <button
              onClick={() => chooseOutType("final")}
              className="rounded-2xl border border-qahwa-rouge/40 bg-qahwa-rouge/10 px-8 py-4 font-display text-base uppercase text-qahwa-rouge shadow-panel transition hover:bg-qahwa-rouge/15 active:scale-95"
            >
              Sortie finale
            </button>

            <button
              onClick={resetToCode}
              className="rounded-2xl border border-white/10 bg-white/5 px-8 py-3 font-display text-sm uppercase text-qahwa-muted transition hover:text-qahwa-text active:scale-95"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* CAMERA */}
      {step === "camera" && employee && (
        <div className="relative z-10 flex w-full max-w-lg flex-col items-center gap-5 rounded-[2rem] border border-white/10 bg-qahwa-panel/90 p-5 shadow-2xl backdrop-blur-xl sm:p-6">
          <div className="text-center">
            <h1 className="font-display text-xl uppercase tracking-wide text-qahwa-text">
              {employee.name}
            </h1>

            <div className="mt-2 inline-flex items-center rounded-full border border-qahwa-orange/20 bg-qahwa-orange/10 px-3 py-1">
              <span className="text-[10px] font-display uppercase tracking-wider text-qahwa-orange">
                {actionLabel}
              </span>
            </div>

            <p className="mt-3 text-sm text-qahwa-muted">
              Regarde la camera et prends la photo
            </p>
          </div>

          <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-panel">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="aspect-[4/3] w-full object-cover"
            />

            <div className="pointer-events-none absolute inset-5 rounded-2xl border border-white/20" />

            <div className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-qahwa-orange/40" />
          </div>

          <canvas
            ref={canvasRef}
            className="hidden"
          />

          <div className="flex w-full gap-3">
            <button
              onClick={resetToCode}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-display uppercase text-qahwa-muted transition hover:text-qahwa-text active:scale-95"
            >
              Annuler
            </button>

            <button
              onClick={handleCapture}
              disabled={saving}
              className="flex-1 rounded-xl border border-qahwa-orange bg-qahwa-orange px-6 py-3 text-sm font-display uppercase text-qahwa-noir shadow-[0_0_24px_rgba(255,107,0,0.15)] transition hover:bg-qahwa-orange/90 active:scale-95 disabled:opacity-50"
            >
              {saving
                ? "Enregistrement..."
                : "Capturer"}
            </button>
          </div>
        </div>
      )}

      {/* BIENVENUE */}
      {step === "welcome" && employee && (
        <div className="qahwa-welcome-anim relative z-10 flex flex-col items-center gap-5 text-center">
          <div className="relative flex h-28 w-28 items-center justify-center">
            <span className="qahwa-ring absolute inset-0 rounded-full border-2 border-qahwa-orange" />

            {employee.photo_url ? (
              <img
                src={employee.photo_url}
                alt={employee.name}
                className="h-24 w-24 rounded-full object-cover ring-2 ring-white/10"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-qahwa-orange/20 font-display text-3xl uppercase text-qahwa-orange ring-2 ring-qahwa-orange/20">
                {employee.name.charAt(0)}
              </div>
            )}
          </div>

          <div>
            <p className="font-display text-2xl uppercase tracking-wide text-qahwa-text">
              {actionType === "out"
                ? "Sortie enregistrée"
                : `Bonjour ${employee.name}`}
            </p>

            <p className="mt-2 text-sm text-qahwa-muted">
              {actionType === "out"
                ? outType === "temporary"
                  ? "Sortie temporaire enregistrée."
                  : "Sortie finale enregistrée."
                : `${employee.position || "Employe"} — direction ton poste...`}
            </p>
          </div>
        </div>
      )}

      {/* ERREUR */}
      {step === "error" && (
        <div className="relative z-10 w-full max-w-sm rounded-2xl border border-qahwa-rouge/40 bg-qahwa-rouge/10 p-8 text-center text-qahwa-rouge shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-qahwa-rouge/30 bg-qahwa-rouge/10 text-xl">
            !
          </div>

          <p className="font-display text-sm uppercase tracking-wide">
            {errorMsg}
          </p>
        </div>
      )}
    </div>
  );
}