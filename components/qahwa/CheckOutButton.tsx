"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type OutType = "temporary" | "final";

export default function CheckOutButton() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
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
      alert("Impossible d'acceder a la camera.");
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

    if (
      !raw ||
      !videoRef.current ||
      !canvasRef.current ||
      saving
    ) {
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

    ctx.drawImage(
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

        try {
          const formData = new FormData();

          formData.append(
            "employee_id",
            employee.id
          );

          formData.append(
            "event_type",
            "out"
          );

          formData.append(
            "out_type",
            outType
          );

          formData.append(
            "photo",
            blob,
            "photo.jpg"
          );

          const res = await fetch(
            "/api/poste/clock-event",
            {
              method: "POST",
              body: formData,
            }
          );

          if (!res.ok) {
            const data = await res.json();

            alert(
              "Erreur enregistrement : " +
                (data.error || "Erreur inconnue.")
            );

            setSaving(false);
            return;
          }

          /*
           * IMPORTANT :
           * On supprime TOUJOURS la session locale
           * après une sortie temporaire OU finale.
           *
           * Sinon /qahwa/poste détecte encore
           * l'employé et le renvoie automatiquement
           * vers son poste.
           */
          localStorage.removeItem(
            "qahwa-poste-employee"
          );

          stopCamera();

          setSaving(false);
          setOpen(false);

          /*
           * On revient à l'écran de connexion du poste.
           * L'employé devra remettre son code pour
           * enregistrer son retour après une sortie temporaire.
           */
          window.location.replace(
            "/qahwa/poste"
          );
        } catch (error) {
          console.error(error);

          alert(
            "Une erreur est survenue pendant l'enregistrement."
          );

          setSaving(false);
        }
      },
      "image/jpeg",
      0.85
    );
  }

  return (
    <>
      <div className="fixed bottom-4 right-4 z-40 flex gap-2">
        <button
          onClick={() =>
            openCamera("temporary")
          }
          className="rounded-full border border-qahwa-orange/40 bg-qahwa-orange/15 px-4 py-2.5 font-display text-xs uppercase text-qahwa-orange shadow-panel backdrop-blur-md"
        >
          Sortie temporaire
        </button>

        <button
          onClick={() =>
            openCamera("final")
          }
          className="rounded-full border border-qahwa-rouge/40 bg-qahwa-rouge/15 px-4 py-2.5 font-display text-xs uppercase text-qahwa-rouge shadow-panel backdrop-blur-md"
        >
          {employeeName
            ? `${employeeName} — Terminer ma journee`
            : "Terminer ma journee"}
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/90 p-6">
          <p className="font-display text-lg uppercase text-white">
            {outType === "temporary"
              ? "Sortie temporaire"
              : "Sortie finale"}{" "}
            — prends une photo
          </p>

          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full max-w-sm rounded-xl border border-white/20 shadow-panel"
          />

          <canvas
            ref={canvasRef}
            className="hidden"
          />

          <div className="flex gap-3">
            <button
              onClick={closeCamera}
              disabled={saving}
              className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-display uppercase text-white disabled:opacity-50"
            >
              Annuler
            </button>

            <button
              onClick={handleCapture}
              disabled={saving}
              className="rounded-lg border border-qahwa-orange bg-qahwa-orange px-6 py-2 text-sm font-display uppercase text-qahwa-noir disabled:opacity-50"
            >
              {saving
                ? "Enregistrement..."
                : "Capturer"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}