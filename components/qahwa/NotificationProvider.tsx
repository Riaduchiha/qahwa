"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ToastType = "success" | "error" | "info" | "warning";

type ToastOptions = {
  title?: string;
  /** Durée d'affichage en millisecondes (0 = ne disparaît pas seul). */
  duration?: number;
};

type ToastItem = {
  id: number;
  type: ToastType;
  message: string;
  title?: string;
  duration: number;
};

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" = bouton rouge (suppression, perte de données). */
  tone?: "default" | "danger";
};

type PendingConfirm = ConfirmOptions & {
  id: number;
  resolve: (value: boolean) => void;
};

type ToastApi = {
  success: (message: string, options?: ToastOptions) => number;
  error: (message: string, options?: ToastOptions) => number;
  info: (message: string, options?: ToastOptions) => number;
  warning: (message: string, options?: ToastOptions) => number;
  dismiss: (id: number) => void;
};

type NotificationContextValue = {
  toast: ToastApi;
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
};

const NotificationContext = createContext<NotificationContextValue | null>(
  null
);

const ACCENT = "#FF6B00";

/* ------------------------------------------------------------------ */
/*  Hooks publics                                                      */
/* ------------------------------------------------------------------ */

function useNotificationContext() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error(
      "NotificationProvider manquant : entoure la page (ou le layout) avec <NotificationProvider>."
    );
  }

  return context;
}

/**
 * Pour afficher des messages :
 *   const toast = useToast();
 *   toast.success("Affiche enregistrée.");
 *   toast.error("Impossible d'enregistrer.");
 */
export function useToast() {
  return useNotificationContext().toast;
}

/**
 * Pour demander une confirmation (remplace window.confirm) :
 *   const confirm = useConfirm();
 *   if (!(await confirm({ message: "Supprimer ?", tone: "danger" }))) return;
 */
export function useConfirm() {
  return useNotificationContext().confirm;
}

/**
 * Prévient l'utilisateur quand il quitte une page avec des modifications
 * non enregistrées (clic sur un lien de l'application).
 *   useUnsavedChangesGuard(hasUnsavedChanges);
 *
 * Pour un bouton "Retour" personnalisé, utilise plutôt useConfirm().
 * Note : à la fermeture de l'onglet ou à l'actualisation, le navigateur
 * affiche toujours son propre message, qu'on ne peut pas personnaliser.
 */
export function useUnsavedChangesGuard(
  dirty: boolean,
  options?: Partial<ConfirmOptions>
) {
  const confirm = useConfirm();
  const router = useRouter();
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!dirty) return;

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    async function onClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.(
        "a[href]"
      ) as HTMLAnchorElement | null;

      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);

      if (url.origin !== window.location.origin) return;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const ok = await confirm({
        title: "Quitter sans enregistrer ?",
        message:
          "Tu as des modifications non enregistrées. Si tu quittes maintenant, elles seront perdues.",
        confirmLabel: "Quitter sans enregistrer",
        cancelLabel: "Rester sur la page",
        tone: "danger",
        ...optionsRef.current,
      });

      if (ok) router.push(url.pathname + url.search + url.hash);
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty, confirm, router]);
}

/* ------------------------------------------------------------------ */
/*  Affichage d'un message (toast)                                     */
/* ------------------------------------------------------------------ */

const TOAST_STYLES: Record<
  ToastType,
  { icon: string; bar: string; iconClass: string }
> = {
  success: {
    icon: "✓",
    bar: "bg-emerald-400",
    iconClass: "bg-emerald-500/15 text-emerald-300",
  },
  error: {
    icon: "!",
    bar: "bg-red-400",
    iconClass: "bg-red-500/15 text-red-300",
  },
  warning: {
    icon: "▲",
    bar: "bg-amber-400",
    iconClass: "bg-amber-500/15 text-amber-300",
  },
  info: {
    icon: "i",
    bar: "bg-[#FF6B00]",
    iconClass: "bg-[#FF6B00]/15 text-[#FF8A2B]",
  },
};

function ToastView({
  item,
  onClose,
}: {
  item: ToastItem;
  onClose: (id: number) => void;
}) {
  const [visible, setVisible] = useState(false);
  const style = TOAST_STYLES[item.type];

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (item.duration <= 0) return;
    const timer = window.setTimeout(() => onClose(item.id), item.duration);
    return () => window.clearTimeout(timer);
  }, [item.id, item.duration, onClose]);

  return (
    <div
      role={item.type === "error" ? "alert" : "status"}
      className={`pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-xl border border-white/10 bg-[#1B1B1B] p-4 pl-5 shadow-2xl shadow-black/50 transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      }`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${style.bar}`} />

      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${style.iconClass}`}
        aria-hidden="true"
      >
        {style.icon}
      </span>

      <div className="min-w-0 flex-1">
        {item.title && (
          <p className="text-sm font-semibold text-white">{item.title}</p>
        )}
        <p
          className={`break-words text-sm ${
            item.title ? "mt-0.5 text-white/60" : "text-white/85"
          }`}
        >
          {item.message}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onClose(item.id)}
        aria-label="Fermer la notification"
        className="shrink-0 rounded-md px-1.5 py-0.5 text-xs text-white/40 transition hover:bg-white/10 hover:text-white"
      >
        ✕
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Fenêtre de confirmation                                            */
/* ------------------------------------------------------------------ */

function ConfirmDialog({
  pending,
  onAnswer,
}: {
  pending: PendingConfirm;
  onAnswer: (value: boolean) => void;
}) {
  const danger = pending.tone === "danger";

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onAnswer(false);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onAnswer]);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center p-4 sm:items-center"
      role="alertdialog"
      aria-modal="true"
      aria-label={pending.title ?? "Confirmation"}
    >
      <button
        type="button"
        aria-label="Annuler"
        onClick={() => onAnswer(false)}
        className="absolute inset-0 cursor-default bg-black/75 backdrop-blur-sm"
      />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#1B1B1B] p-6 shadow-2xl">
        <div
          className={`mb-4 flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold ${
            danger
              ? "bg-red-500/15 text-red-300"
              : "bg-[#FF6B00]/15 text-[#FF8A2B]"
          }`}
          aria-hidden="true"
        >
          {danger ? "!" : "?"}
        </div>

        <h2 className="text-lg font-bold text-white">
          {pending.title ?? "Confirmer l’action"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-white/60">
          {pending.message}
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => onAnswer(false)}
            autoFocus={danger}
            className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            {pending.cancelLabel ?? "Annuler"}
          </button>

          <button
            type="button"
            onClick={() => onAnswer(true)}
            autoFocus={!danger}
            className={`rounded-xl px-5 py-3 text-sm font-bold transition hover:brightness-110 ${
              danger ? "bg-red-500 text-white" : "text-black"
            }`}
            style={danger ? undefined : { backgroundColor: ACCENT }}
          >
            {pending.confirmLabel ?? "Confirmer"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export default function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [queue, setQueue] = useState<PendingConfirm[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (type: ToastType, message: string, options?: ToastOptions) => {
      idRef.current += 1;
      const id = idRef.current;
      const duration = options?.duration ?? (type === "error" ? 7000 : 4000);

      setToasts((previous) => [
        ...previous.slice(-3),
        { id, type, message, title: options?.title, duration },
      ]);

      return id;
    },
    []
  );

  const toast = useMemo<ToastApi>(
    () => ({
      success: (message, options) => push("success", message, options),
      error: (message, options) => push("error", message, options),
      info: (message, options) => push("info", message, options),
      warning: (message, options) => push("warning", message, options),
      dismiss,
    }),
    [push, dismiss]
  );

  const confirm = useCallback((options: ConfirmOptions | string) => {
    return new Promise<boolean>((resolve) => {
      const normalized: ConfirmOptions =
        typeof options === "string" ? { message: options } : options;

      idRef.current += 1;
      const id = idRef.current;

      setQueue((previous) => [...previous, { ...normalized, id, resolve }]);
    });
  }, []);

  const current = queue[0];

  const answer = useCallback(
    (value: boolean) => {
      if (!current) return;
      current.resolve(value);
      setQueue((previous) => previous.slice(1));
    },
    [current]
  );

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <NotificationContext.Provider value={value}>
      {children}

      {/* Messages : en bas à droite pour ne pas gêner les alertes du haut */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col gap-3 sm:left-auto sm:right-4 sm:w-96"
      >
        {toasts.map((item) => (
          <ToastView key={item.id} item={item} onClose={dismiss} />
        ))}
      </div>

      {current && <ConfirmDialog key={current.id} pending={current} onAnswer={answer} />}
    </NotificationContext.Provider>
  );
}
