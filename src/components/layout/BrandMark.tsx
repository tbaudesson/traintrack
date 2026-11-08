import Image from "next/image";

/** The app's logo, as it appears on the home screen. */
export function BrandMark({ size = 72 }: { size?: number }) {
  return (
    <Image
      src="/icons/logo.png"
      alt=""
      width={size}
      height={size}
      unoptimized
      priority
      className="drop-shadow-[0_10px_18px_rgb(76_29_149/0.35)]"
    />
  );
}
