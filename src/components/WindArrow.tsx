interface Props {
  /** Meteorological direction: degrees the wind is coming FROM. */
  deg: number;
  size?: number;
  className?: string;
}

/**
 * Small SVG arrow. By convention (like Windfinder), the arrow points
 * in the direction the wind is *going toward*, i.e. we rotate by `deg + 180`.
 */
export default function WindArrow({ deg, size = 18, className = '' }: Props) {
  const rotation = (deg + 180) % 360;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      style={{ transform: `rotate(${rotation}deg)` }}
      aria-label={`Direction ${Math.round(deg)}°`}
    >
      <path d="M12 2 L18 20 L12 16 L6 20 Z" fill="currentColor" />
    </svg>
  );
}
