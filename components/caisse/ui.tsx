"use client";

import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import { STATUS_LABELS } from "@/lib/caisse/constants";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const BASE =
  "inline-flex min-h-[48px] items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A] disabled:cursor-not-allowed disabled:opacity-40";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-[#FF6B00] text-black hover:bg-[#FF8A2B]",
  secondary: "border border-white/15 text-white hover:bg-white/10",
  danger: "border border-red-400/40 text-red-300 hover:bg-red-400/10",
  ghost: "text-white/60 hover:text-white",
};

export function Button({
  variant = "secondary",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={type}
      className={`${BASE} ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

export const surface = "rounded-xl border border-white/10 bg-[#141414]";

export const fieldClass =
  "w-full min-h-[48px] rounded-lg border border-white/15 bg-[#0A0A0A] px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00]";

export function StatusBadge({ status }: { status: string }) {
  const attention = status === "recue" || status === "prete";
  return (
    <span
      className={`rounded-md px-2 py-1 text-xs font-semibold ${
        attention
          ? "bg-[#FFF3E8] text-black"
          : "border border-white/15 text-white/70"
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function Modal({
  title,
  onClose,
  children,
  layer = "z-50",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  layer?: string;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className={`fixed inset-0 ${layer} flex items-center justify-center bg-black/75 p-4`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-xl border border-white/15 bg-[#141414] p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg">{title}</h2>
          <Button
            variant="ghost"
            onClick={onClose}
            aria-label="Fermer"
            className="!min-h-0 !px-2 !py-1"
          >
            ✕
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PanelHeader({
  title,
  subtitle,
  onClose,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
      <div className="min-w-0">
        <h2 className="truncate font-display text-2xl">{title}</h2>
        {subtitle && <p className="mt-0.5 truncate text-sm text-white/55">{subtitle}</p>}
      </div>
      <Button variant="secondary" onClick={onClose} className="!min-h-0 !px-3 !py-2">
        Fermer
      </Button>
    </div>
  );
}
