"use client";

import { useEffect, useRef, useState } from "react";

type SelectOption = {
  value: string;
  label: string;
};

type StudioSelectProps = {
  value: string | number;
  options: SelectOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
  disabled?: boolean;
};

export default function StudioSelect({
  value,
  options,
  onChange,
  ariaLabel = "Choisir une option",
  disabled = false,
}: StudioSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedValue = String(value);
  const selectedOption = options.find(
    (option) => option.value === selectedValue
  );

  useEffect(() => {
    function handleOutsideClick(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#101010] px-3 py-2.5 text-left text-xs text-white outline-none transition hover:border-[#FF6B00]/60 focus-visible:border-[#FF6B00] focus-visible:ring-1 focus-visible:ring-[#FF6B00] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="truncate">
          {selectedOption?.label ?? "Choisir une option"}
        </span>
        <span className="shrink-0 text-[#FF6B00]">
          {open ? "⌃" : "⌄"}
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 right-0 top-full z-[100] mt-1 max-h-60 overflow-y-auto rounded-lg border border-[#FF6B00]/30 bg-[#1B1B1B] p-1 shadow-xl"
        >
          {options.map((option) => {
            const selected = option.value === selectedValue;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2.5 text-left text-xs transition ${
                  selected
                    ? "bg-[#FF6B00]/15 text-[#FF6B00]"
                    : "text-white hover:bg-[#FF6B00]/15 hover:text-[#FF6B00]"
                }`}
              >
                <span>{option.label}</span>
                {selected && (
                  <span className="shrink-0 text-[#FF6B00]">✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
