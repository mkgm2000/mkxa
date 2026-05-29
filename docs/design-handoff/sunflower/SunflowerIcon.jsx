import React from "react";

/**
 * Chubby sunflower app-icon mark.
 *
 * <SunflowerIcon />                       → flower only, transparent bg
 * <SunflowerIcon withTile />              → flower on the blue iOS-style squircle
 * <SunflowerIcon animated />              → gentle bob + sway loop
 * <SunflowerIcon size={64} />             → any pixel size (default 96)
 *
 * Honors prefers-reduced-motion automatically (animation is CSS, see sunflower.css).
 */
export default function SunflowerIcon({
  size = 96,
  withTile = false,
  animated = false,
  title = "Sunflower",
  className = "",
  ...rest
}) {
  const flower = (
    <svg
      className={`sf-svg${animated ? " sf-animated" : ""}`}
      width={withTile ? "84%" : size}
      height={withTile ? "84%" : size}
      viewBox="0 0 200 200"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="sf-petal" cx="50%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#ffe169" />
          <stop offset="55%" stopColor="#ffc02e" />
          <stop offset="100%" stopColor="#f59300" />
        </radialGradient>
        <radialGradient id="sf-center" cx="42%" cy="34%" r="75%">
          <stop offset="0%" stopColor="#8a5a2b" />
          <stop offset="55%" stopColor="#6b3f17" />
          <stop offset="100%" stopColor="#4d2c0d" />
        </radialGradient>
        <radialGradient id="sf-centerHi" cx="40%" cy="30%" r="55%">
          <stop offset="0%" stopColor="#c98a44" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#c98a44" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 12 chubby petals around center (100,100) */}
      <g>
        {Array.from({ length: 12 }).map((_, i) => (
          <g key={i} transform={`rotate(${i * 30} 100 100)`}>
            <ellipse cx="100" cy="50" rx="16" ry="26" fill="url(#sf-petal)" />
          </g>
        ))}
      </g>

      {/* center disk */}
      <circle cx="100" cy="100" r="42" fill="url(#sf-center)" />
      <ellipse cx="90" cy="88" rx="25" ry="21" fill="url(#sf-centerHi)" />

      {/* seed dots */}
      <g fill="#3a2109" opacity="0.55">
        <circle cx="100" cy="100" r="2.4" />
        <circle cx="111" cy="98" r="2.4" /><circle cx="89" cy="98" r="2.4" />
        <circle cx="105" cy="109" r="2.4" /><circle cx="95" cy="109" r="2.4" />
        <circle cx="116" cy="107" r="2.4" /><circle cx="84" cy="107" r="2.4" />
        <circle cx="100" cy="88" r="2.4" />
        <circle cx="110" cy="87" r="2.2" /><circle cx="90" cy="87" r="2.2" />
        <circle cx="100" cy="114" r="2.2" />
        <circle cx="119" cy="97" r="2" /><circle cx="81" cy="97" r="2" />
      </g>

      {/* cute face */}
      <ellipse cx="88" cy="98" rx="4.4" ry="5.4" fill="#1b1208" />
      <ellipse cx="89.4" cy="96" rx="1.4" ry="1.7" fill="#fff" opacity="0.9" />
      <ellipse cx="112" cy="98" rx="4.4" ry="5.4" fill="#1b1208" />
      <ellipse cx="113.4" cy="96" rx="1.4" ry="1.7" fill="#fff" opacity="0.9" />
      <path d="M91 110 Q 100 119, 109 110" fill="none" stroke="#1b1208" strokeWidth="3.4" strokeLinecap="round" />
      <ellipse cx="80" cy="107" rx="5" ry="3" fill="#ff8a5c" opacity="0.45" />
      <ellipse cx="120" cy="107" rx="5" ry="3" fill="#ff8a5c" opacity="0.45" />
    </svg>
  );

  if (!withTile) {
    return (
      <span className={`sf-bare ${className}`} style={{ width: size, height: size, display: "inline-flex" }} {...rest}>
        {flower}
      </span>
    );
  }

  return (
    <span
      className={`sf-tile ${className}`}
      style={{ width: size, height: size }}
      {...rest}
    >
      {flower}
    </span>
  );
}
