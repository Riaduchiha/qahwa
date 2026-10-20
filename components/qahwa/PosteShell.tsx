export default function PosteShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-qahwa-bg">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-qahwa-border bg-qahwa-panel px-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black">
          <img
            src="/logo-white.png"
            alt="Qahwa"
            className="h-6 w-6 object-contain"
          />
        </div>

        <span className="font-display text-sm uppercase tracking-wide text-qahwa-text">
          QAHWA
        </span>
      </header>

      {children}
    </div>
  );
}