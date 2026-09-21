"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";


interface Employee {
  id: string;
  name: string;
  code: string;
}

type Step = "code" | "choice" | "camera" | "success" | "error";
type ActionType = "in" | "out";
type OutType = "temporary" | "final";

export default function PointagePage() {
  const [step, setStep] = useState<Step>("code");
  const [code, setCode] = useState("");
  const [matchedEmployee, setMatchedEmployee] = useState<Employee | null>(null);

  const [actionType, setActionType] = useState<ActionType>("in");
  const [outType, setOutType] = useState<OutType | null>(null);

  const [actionLabel, setActionLabel] = useState("Arrivee");
  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [successTime, setSuccessTime] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }

  function resetToCode() {
    stopCamera();

    setStep("code");
    setCode("");
    setMatchedEmployee(null);
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

      setTimeout(() => {
        resetToCode();
      }, 2500);
    }
  }

  async function prepareCamera(
    employee: Employee,
    nextAction: ActionType,
    nextOutType: OutType | null,
    label: string
  ) {
    setMatchedEmployee(employee);
    setActionType(nextAction);
    setOutType(nextOutType);
    setActionLabel(label);
    setStep("camera");

    await startCamera();
  }

  async function handleSubmitCode() {
    if (!code || saving) return;

    setSaving(true);
    setErrorMsg("");

    const { data: employee, error: employeeError } = (await supabase
      .from("employees")
      .select("id, name, code")
      .eq("code", code)
      .eq("active", true)
      .maybeSingle()) as { data: Employee | null; error: unknown };

    if (employeeError || !employee) {
      setSaving(false);
      setErrorMsg("Code non reconnu.");
      setStep("error");

      setTimeout(() => {
        resetToCode();
      }, 2000);

      return;
    }

    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: todayEvents } = (await supabase
      .from("employee_clock_events")
      .select("event_type, out_type, created_at")
      .eq("employee_id", employee.id)
      .gte("created_at", startOfDay.toISOString())
      .lte("created_at", endOfDay.toISOString())
      .order("created_at", { ascending: false })) as {
      data: { event_type: string; out_type: string | null; created_at: string }[] | null;
    };

    const lastEvent = todayEvents?.[0];

    setSaving(false);

    /*
     * Aucun pointage aujourd'hui
     * → ARRIVEE
     */
    if (!lastEvent) {
      await prepareCamera(
        employee as Employee,
        "in",
        null,
        "Arrivee"
      );
      return;
    }

    /*
     * Dernier événement = ARRIVEE ou RETOUR
     * → L'employé est actuellement présent.
     *
     * On lui demande donc de choisir :
     * - Sortie temporaire
     * - Sortie finale
     */
    if (lastEvent.event_type === "in") {
      setMatchedEmployee(employee as Employee);
      setStep("choice");
      return;
    }

    /*
     * Dernier événement = SORTIE
     * → L'employé revient.
     *
     * On enregistre automatiquement un "in".
     */
    if (lastEvent.event_type === "out") {
      await prepareCamera(
        employee as Employee,
        "in",
        null,
        "Retour"
      );
      return;
    }
  }

  async function chooseOutType(type: OutType) {
    if (!matchedEmployee) return;

    const label =
      type === "temporary"
        ? "Sortie temporaire"
        : "Sortie finale";

    await prepareCamera(
      matchedEmployee,
      "out",
      type,
      label
    );
  }

  async function handleCapture() {
    if (
      !videoRef.current ||
      !canvasRef.current ||
      !matchedEmployee ||
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

    if (!ctx) {
      setSaving(false);
      setErrorMsg("Impossible de prendre la photo.");
      setStep("error");
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
          setErrorMsg("Impossible de prendre la photo.");
          setStep("error");
          return;
        }

        try {
          const fileName = `${matchedEmployee.id}-${Date.now()}.jpg`;

          const { data: uploadData, error: uploadError } =
            await supabase.storage
              .from("employee-photos")
              .upload(fileName, blob, {
                contentType: "image/jpeg",
              });

          if (uploadError) {
            throw new Error(uploadError.message);
          }

          let photoUrl: string | null = null;

          if (uploadData) {
            const { data: publicUrlData } = supabase.storage
              .from("employee-photos")
              .getPublicUrl(uploadData.path);

            photoUrl = publicUrlData.publicUrl;
          }

          const { error: insertError } = await supabase
            .from("employee_clock_events")
            .insert({
              employee_id: matchedEmployee.id,
              event_type: actionType,
              out_type:
                actionType === "out" ? outType : null,
              photo_url: photoUrl,
             } as never);

          if (insertError) {
            throw new Error(insertError.message);
          }

          stopCamera();

          setSuccessTime(
            new Date().toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
            })
          );

          setSaving(false);
          setStep("success");

          setTimeout(() => {
            resetToCode();
          }, 3000);
        } catch (error) {
          console.error(error);

          setSaving(false);
          setErrorMsg(
            error instanceof Error
              ? error.message
              : "Erreur lors de l'enregistrement."
          );
          setStep("error");

          setTimeout(() => {
            resetToCode();
          }, 3000);
        }
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

  function pressDigit(digit: string) {
    if (code.length < 6) {
      setCode((current) => current + digit);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-3rem)] flex-col items-center justify-center gap-6 p-6 text-qahwa-text">
      {step === "code" && (
        <>
          <h1 className="font-display text-2xl uppercase text-qahwa-text">
            Pointage
          </h1>

          <p className="text-sm text-qahwa-muted">
            Entre ton code personnel
          </p>

          <div className="flex gap-2">
            {Array.from({
              length: Math.max(4, code.length),
            }).map((_, index) => (
              <div
                key={index}
                className="flex h-12 w-10 items-center justify-center rounded-lg border border-qahwa-border bg-qahwa-panel2 font-display text-xl text-qahwa-text"
              >
                {code[index] ?? ""}
              </div>
            ))}
          </div>

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
            ].map((digit) => (
              <button
                key={digit}
                onClick={() => pressDigit(digit)}
                className="h-16 w-16 rounded-xl border border-qahwa-border bg-qahwa-panel font-display text-xl text-qahwa-text shadow-panel active:scale-95"
              >
                {digit}
              </button>
            ))}

            <button
              onClick={() =>
                setCode((current) => current.slice(0, -1))
              }
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
              disabled={saving}
              className="h-16 w-16 rounded-xl border border-qahwa-orange bg-qahwa-orange font-display text-sm uppercase text-qahwa-noir shadow-panel active:scale-95 disabled:opacity-50"
            >
              OK
            </button>
          </div>
        </>
      )}

      {step === "choice" && matchedEmployee && (
        <>
          <h1 className="font-display text-2xl uppercase text-qahwa-text">
            {matchedEmployee.name}
          </h1>

          <p className="text-sm text-qahwa-muted">
            Que veux-tu enregistrer ?
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => chooseOutType("temporary")}
              className="rounded-xl border border-qahwa-orange bg-qahwa-panel px-8 py-4 font-display text-lg uppercase text-qahwa-orange shadow-panel active:scale-95"
            >
              Sortie temporaire
            </button>

            <button
              onClick={() => chooseOutType("final")}
              className="rounded-xl border border-qahwa-rouge bg-qahwa-panel px-8 py-4 font-display text-lg uppercase text-qahwa-rouge shadow-panel active:scale-95"
            >
              Sortie finale
            </button>

            <button
              onClick={resetToCode}
              className="rounded-xl border border-qahwa-border bg-qahwa-panel2 px-8 py-3 font-display text-sm uppercase text-qahwa-muted"
            >
              Annuler
            </button>
          </div>
        </>
      )}

      {step === "camera" && matchedEmployee && (
        <>
          <h1 className="font-display text-xl uppercase text-qahwa-text">
            {matchedEmployee.name} — {actionLabel}
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

          <canvas
            ref={canvasRef}
            className="hidden"
          />

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
              {saving
                ? "Enregistrement..."
                : "Capturer"}
            </button>
          </div>
        </>
      )}

      {step === "success" && matchedEmployee && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-qahwa-green/40 bg-qahwa-green/10 p-8 text-center">
          <p className="font-display text-2xl text-qahwa-green">
            {actionLabel} enregistree
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