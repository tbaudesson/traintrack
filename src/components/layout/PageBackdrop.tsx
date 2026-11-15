/** A restrained technical field: depth without competing with the content. */
export function PageBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 opacity-[0.035] dark:opacity-[0.07]" style={{ backgroundImage: "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)", backgroundSize: "32px 32px", maskImage: "linear-gradient(to bottom, black, transparent 72%)" }} />
      <div className="absolute -right-28 -top-28 size-96 rounded-full bg-accent-600/10 blur-3xl" />
      <div className="absolute -bottom-48 -left-36 size-[30rem] rounded-full bg-accent-900/10 blur-3xl" />
    </div>
  );
}
