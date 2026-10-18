"use client";

import { Button, Modal } from "./ui";

export type Confirmation = {
  message: string;
  label: string;
  action: () => Promise<void>;
};

export function ConfirmDialog({
  confirmation,
  busy,
  onCancel,
}: {
  confirmation: Confirmation;
  busy: boolean;
  onCancel: () => void;
}) {
  return (
    <Modal title="Confirmer l'action" onClose={onCancel} layer="z-[60]">
      <p className="whitespace-pre-line text-sm leading-relaxed text-white/70">
        {confirmation.message}
      </p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button disabled={busy} onClick={onCancel}>
          Annuler
        </Button>
        <Button
          variant="primary"
          disabled={busy}
          onClick={() => void confirmation.action()}
        >
          {busy ? "En cours…" : confirmation.label}
        </Button>
      </div>
    </Modal>
  );
}