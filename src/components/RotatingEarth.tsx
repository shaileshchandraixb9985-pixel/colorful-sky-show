import earthTexture from "@/assets/earth-texture.jpg";

interface Props {
  size?: number;
  night?: boolean;
}

/** A real satellite-imagery globe that spins continuously. */
export function RotatingEarth({ size = 112, night = false }: Props) {
  return (
    <div
      className="relative shrink-0 select-none"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* atmosphere glow */}
      <div
        className="glow-pulse absolute inset-0 rounded-full blur-xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--brand) 70%, transparent), transparent 70%)",
          transform: "scale(1.25)",
        }}
      />
      <div className="relative size-full overflow-hidden rounded-full ring-1 ring-foreground/25 shadow-2xl">
        {/* spinning surface */}
        <div
          className="earth-spin absolute inset-0"
          style={{
            backgroundImage: `url(${earthTexture})`,
            backgroundSize: "200% 100%",
            backgroundRepeat: "repeat-x",
            filter: night ? "brightness(0.62) saturate(1.05)" : "brightness(1.05)",
          }}
        />
        {/* sphere shading */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.38), rgba(255,255,255,0) 42%), radial-gradient(circle at 72% 72%, rgba(0,0,10,0.72), rgba(0,0,10,0) 62%)",
          }}
        />
        {/* terminator sweep */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "linear-gradient(100deg, rgba(0,0,20,0) 45%, rgba(0,0,20,0.55) 100%)",
          }}
        />
      </div>
    </div>
  );
}
