"use client";

import { useEffect } from "react";

/** Enregistre le service worker de la caisse (uniquement pour /caisse). */
export function CaisseServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/caisse-sw.js", { scope: "/caisse" })
      .catch((error) => console.error("Service worker caisse :", error));
  }, []);

  return null;
}