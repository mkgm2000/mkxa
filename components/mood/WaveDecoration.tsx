export function WaveDecoration({ className }: { className?: string }) {
  const bars = Array.from({ length: 32 }, (_, i) => {
    const h = 12 + Math.sin((i / 32) * Math.PI * 4) * 18 + (i % 3) * 4;
    return { i, h };
  });
  return (
    <svg
      viewBox="0 0 320 60"
      preserveAspectRatio="none"
      aria-hidden
      className={className}
    >
      {bars.map(({ i, h }) => (
        <rect
          key={i}
          x={i * 10 + 1}
          y={30 - h / 2}
          width={4}
          height={h}
          rx={2}
          fill="rgba(27,29,31,0.12)"
        />
      ))}
    </svg>
  );
}
