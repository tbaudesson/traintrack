/** The soft waves behind every page, drawn once and fixed while pages scroll. */
export function PageBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <svg viewBox="0 0 400 320" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-[42vh] w-full">
        <path className="t-wave-1" d="M0 120C80 60 150 170 240 150S360 60 400 90V320H0Z" />
        <path className="t-wave-2" d="M0 210C90 150 170 280 270 240S370 190 400 200V320H0Z" />
      </svg>
      <svg viewBox="0 0 400 120" preserveAspectRatio="none" className="absolute inset-x-0 top-0 h-[18vh] w-full">
        <path className="t-wave-1" d="M0 0H400V40C320 90 250 30 170 60S50 90 0 50Z" />
      </svg>
    </div>
  );
}
