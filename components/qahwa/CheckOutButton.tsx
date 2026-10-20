"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/qahwa/NotificationProvider";

type OutType = "temporary" | "final";

export default function CheckOutButton() {
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [outType, setOutType] = useState<OutType>("final");
  const [saving, setSaving] = useState(false);
  const [employeeName, setEmployeeName] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("qahwa-poste-employee");

    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      setEmployeeName(parsed.name ?? null);
    } catch {
      localStorage.removeItem("qahwa-poste-employee");
    }
  }, []);

  async function openCamera(type: OutType) {
    setMenuOpen(false);
    setOutType(type);
    setOpen(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      toast.error("Impossible d'accéder à la caméra.");
      setOpen(false);
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });

      streamRef.current = null;
    }
  }

  function closeCamera() {
    stopCamera();
    setOpen(false);
  }

  async function handleCapture() {
    const raw = localStorage.getItem("qahwa-poste-employee");

    if (!raw || !videoRef.current || !canvasRef.current || saving) {
      return;
    }

    let employee: {
      id: string;
      name?: string;
    };

    try {
      employee = JSON.parse(raw);
    } catch {
      localStorage.removeItem("qahwa-poste-employee");
      setOpen(false);
      return;
    }

    setSaving(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      setSaving(false);
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          setSaving(false);
          return;
        }

        try {
          const formData = new FormData();

          formData.append("employee_id", employee.id);
          formData.append("event_type", "out");
          formData.append("out_type", outType);
          formData.append("photo", blob, "photo.jpg");

          const res = await fetch("/api/poste/clock-event", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            const data = await res.json();

            toast.error(
              "Erreur enregistrement : " + (data.error || "Erreur inconnue.")
            );

            setSaving(false);
            return;
          }

          localStorage.removeItem("qahwa-poste-employee");

          stopCamera();

          setSaving(false);
          setOpen(false);

          window.location.replace("/qahwa/poste");
        } catch (error) {
          console.error(error);

          toast.error("Une erreur est survenue pendant l'enregistrement.");

          setSaving(false);
        }
      },
      "image/jpeg",
      0.85
    );
  }

  return (
    <>
      <style>{`
        @keyframes qahwa-checkout-glow {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.45;
          }

          50% {
            transform: scale(1.12);
            opacity: 0.7;
          }
        }

        @keyframes qahwa-checkout-in {
          0% {
            opacity: 0;
            transform: scale(0.94) translateY(12px);
          }

          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .qahwa-checkout-glow {
          animation: qahwa-checkout-glow 5s ease-in-out infinite;
        }

        .qahwa-checkout-in {
          animation: qahwa-checkout-in 0.35s
            cubic-bezier(0.22, 1, 0.36, 1);
        }
      `}</style>

      {/* BOUTON DISCRET */}
      <div className="fixed bottom-4 right-4 z-40">
        {menuOpen && (
          <>
            <button
              type="button"
              aria-label="Fermer"
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-40 cursor-default"
            />

            <div className="qahwa-checkout-in absolute bottom-12 right-0 z-50 w-56 overflow-hidden rounded-2xl border border-white/10 bg-qahwa-panel/95 shadow-2xl backdrop-blur-xl">
              {employeeName && (
                <p className="truncate border-b border-white/5 px-4 py-2.5 text-[10px] uppercase tracking-wider text-qahwa-muted">
                  {employeeName}
                </p>
              )}

              <button
                type="button"
                onClick={() => openCamera("temporary")}
                className="block w-full px-4 py-3 text-left font-display text-[11px] uppercase tracking-wide text-qahwa-text transition hover:bg-white/5"
              >
                Sortie temporaire
              </button>

              <button
                type="button"
                onClick={() => openCamera("final")}
                className="block w-full border-t border-white/5 px-4 py-3 text-left font-display text-[11px] uppercase tracking-wide text-qahwa-rouge transition hover:bg-qahwa-rouge/10"
              >
                Terminer ma journée
              </button>
            </div>
          </>
        )}

        <button
          type="button"
          aria-label="Menu de sortie"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 text-qahwa-muted opacity-60 backdrop-blur-md transition hover:opacity-100 active:scale-95"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2v10" />
            <path d="M18.4 6.6a9 9 0 1 1-12.8 0" />
          </svg>
        </button>
      </div>

      {/* CHECKOUT CAMERA */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/90 px-4 py-6 backdrop-blur-md">
          <div className="qahwa-checkout-in relative w-full max-w-md">
            {/* GLOW */}
            <div
              aria-hidden
              className="qahwa-checkout-glow pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-qahwa-orange/10 blur-3xl"
            />

            {/* CARD */}
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-qahwa-panel/95 p-5 shadow-2xl backdrop-blur-xl sm:p-6">
              {/* HEADER */}
              <div className="mb-6 flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-black/40 shadow-xl">
                  <img
                    src="/logo-white.png"
                    alt="Qahwa"
                    className="h-9 w-9 object-contain"
                  />
                </div>

                <h2 className="mt-4 font-display text-2xl uppercase tracking-[0.14em] text-qahwa-text">
                  QAHWA
                </h2>

                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`h-px w-6 ${
                      outType === "temporary"
                        ? "bg-qahwa-orange"
                        : "bg-qahwa-rouge"
                    }`}
                  />

                  <span
                    className={`text-[10px] font-display uppercase tracking-[0.2em] ${
                      outType === "temporary"
                        ? "text-qahwa-orange"
                        : "text-qahwa-rouge"
                    }`}
                  >
                    {outType === "temporary"
                      ? "Sortie temporaire"
                      : "Sortie finale"}
                  </span>

                  <span
                    className={`h-px w-6 ${
                      outType === "temporary"
                        ? "bg-qahwa-orange"
                        : "bg-qahwa-rouge"
                    }`}
                  />
                </div>
              </div>

              {/* EMPLOYE */}
              <div className="mb-5 rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-qahwa-orange/10 ring-1 ring-qahwa-orange/20">
                    <span className="font-display text-lg uppercase text-qahwa-orange">
                      {employeeName ? employeeName.charAt(0) : "Q"}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-display text-sm uppercase tracking-wide text-qahwa-text">
                      {employeeName || "Employé"}
                    </p>

                    <p className="mt-0.5 text-[10px] uppercase tracking-wider text-qahwa-muted">
                      Confirmation de sortie
                    </p>
                  </div>
                </div>
              </div>

              {/* TEXTE */}
              <div className="mb-4 text-center">
                <p className="text-sm text-qahwa-muted">
                  Prends une photo avant de terminer.
                </p>
              </div>

              {/* CAMERA */}
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="aspect-[4/3] w-full object-cover"
                />

                {/* CADRE CAMERA */}
                <div className="pointer-events-none absolute inset-4 rounded-2xl border border-white/20" />

                <div className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-qahwa-orange/40" />

                {/* INDICATEUR */}
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 backdrop-blur-md">
                  <span className="h-1.5 w-1.5 rounded-full bg-qahwa-green" />

                  <span className="text-[9px] uppercase tracking-wider text-white/70">
                    Caméra active
                  </span>
                </div>
              </div>

              <canvas ref={canvasRef} className="hidden" />

              {/* ACTIONS */}
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={closeCamera}
                  disabled={saving}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 font-display text-xs uppercase tracking-wide text-qahwa-muted transition hover:border-white/20 hover:text-qahwa-text active:scale-95 disabled:opacity-40"
                >
                  Annuler
                </button>

                <button
                  type="button"
                  onClick={handleCapture}
                  disabled={saving}
                  className={`rounded-2xl px-4 py-4 font-display text-xs uppercase tracking-wide text-qahwa-noir shadow-[0_0_24px_rgba(255,107,0,0.16)] transition active:scale-95 disabled:opacity-50 ${
                    outType === "temporary"
                      ? "border border-qahwa-orange bg-qahwa-orange hover:bg-qahwa-orange/90"
                      : "border border-qahwa-rouge bg-qahwa-rouge hover:bg-qahwa-rouge/90"
                  }`}
                >
                  {saving ? "Enregistrement..." : "Capturer"}
                </button>
              </div>

              {/* SECURITE */}
              <div className="mt-5 flex items-center justify-center gap-2 text-[9px] uppercase tracking-[0.18em] text-qahwa-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-qahwa-green" />
                Poste sécurisé
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}