interface MKXALogoProps { size?: number; className?: string }

export function MKXALogo({ size = 80, className }: MKXALogoProps) {
  const h = size;
  const w = Math.round(size * 3.2);
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      role="img"
      aria-label="MKXA"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <text
        x={w * 0.04}
        y={h * 0.82}
        fontFamily="var(--font-mona), system-ui, sans-serif"
        fontWeight={800}
        fontSize={h * 0.95}
        letterSpacing={-h * 0.02}
        fill="#00C49A"
      >M</text>
      <text
        x={w * 0.30}
        y={h * 0.82}
        fontFamily="var(--font-mona), system-ui, sans-serif"
        fontWeight={800}
        fontSize={h * 0.95}
        letterSpacing={-h * 0.02}
        fill="#00C49A"
      >K</text>
      <text
        x={w * 0.54}
        y={h * 0.82}
        fontFamily="var(--font-mona), system-ui, sans-serif"
        fontWeight={800}
        fontSize={h * 0.95}
        letterSpacing={-h * 0.02}
        fill="#7CB518"
      >X</text>
      <text
        x={w * 0.78}
        y={h * 0.82}
        fontFamily="var(--font-mona), system-ui, sans-serif"
        fontWeight={800}
        fontSize={h * 0.95}
        letterSpacing={-h * 0.02}
        fill="#7CB518"
      >A</text>
    </svg>
  );
}
