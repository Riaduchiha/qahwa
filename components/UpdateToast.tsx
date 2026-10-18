"use client";

import { useEffect, useState } from "react";

export default function UpdateToast() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;
      if (reg.waiting) setWaiting(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener("statechange", () => {
          if (nw.state === "installed" && navigator.serviceWorker.controller) {
            setWaiting(nw);
          }
        });
      });
    });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  if (!waiting) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-[100] mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl border border-qahwa-orange/40 bg-qahwa-noir px-4 py-3 shadow-[0_12px_36px_rgba(0,0,0,0.5)]">
      <p className="font-display text-xs uppercase text-qahwa-blanc">
        Nouvelle version disponible
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => setWaiting(null)}
          className="rounded-lg border border-qahwa-blanc/20 px-3 py-1.5 font-display text-[11px] uppercase text-qahwa-blanc/60"
        >
          Plus tard
        </button>
        <button
          onClick={() => waiting.postMessage({ type: "SKIP_WAITING" })}
          className="rounded-lg border border-qahwa-orange bg-qahwa-orange px-3 py-1.5 font-display text-[11px] uppercase text-qahwa-noir"
        >
          Actualiser
        </button>
      </div>
    </div>
  );
}
