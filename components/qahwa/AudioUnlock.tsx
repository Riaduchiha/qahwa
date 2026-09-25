"use client";

import { useEffect } from "react";
import { unlockQahwaAudio } from "@/lib/qahwa/audio";

export default function AudioUnlock() {
  useEffect(() => {
    const unlock = () => {
      unlockQahwaAudio();
    };

    window.addEventListener("pointerdown", unlock, {
      once: true,
      passive: true,
    });

    window.addEventListener("touchstart", unlock, {
      once: true,
      passive: true,
    });

    window.addEventListener("keydown", unlock, {
      once: true,
    });

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  return null;
}