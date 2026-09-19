"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function CheckOutButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [employeeName, setEmployeeName] = useState<string | null>(null);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("qahwa-poste-employee");
    if (raw) {
      const parsed = JSON.parse(raw);
      setEmployeeName(parsed.name);
    }
  }, []);

  async function openCamera() {
    setOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      alert("Impossible d'acceder a la camera.");
      setOpen(false);
    }
  }

  function closeCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setOpen(false);
  }

  async function handleCapture() {
    const raw = localStorage.getItem("qahwa-poste-employee");
    if (!raw || !videoRef.current || !canvasRef.current) return;
    const employee = JSON.parse(raw);
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
          event_type: "out",
          photo_url: photoUrl,
        });

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        localStorage.removeItem("qahwa-poste-employee");
        setSaving(false);
        router.push("/qahwa/poste");
      },
      "image/jpeg",
      0.85
    );
  }

  return (
    <>
      <button
        onClick={openCamera}
        className="fixed bottom-4 right-4 z-40 rounded-full border border-qahwa-rouge/40 bg-qahwa-rouge/15 px-4 py-2.5 font-display text-xs uppercase text-qahwa-rouge shadow-panel backdrop-blur-md"
      >
        {employeeName ? `${employeeName} — Terminer ma journee` : "Terminer ma journee"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/90 p-6">
          <p className="font-display text-lg uppercase text-white">
            Depart — prends une photo
          </p>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full max-w-sm rounded-xl border border-white/20 shadow-panel"
          />
          <canvas ref={canvasRef} className="hidden" />
          <div className="flex gap-3">
            <button
              onClick={closeCamera}
              className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-display uppercase text-white"
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
        </div>
      )}
    </>
  );
}