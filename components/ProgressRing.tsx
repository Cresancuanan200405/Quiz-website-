interface ProgressRingProps {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  label?: string;
}

export default function ProgressRing({
  value,
  size = 220,
  stroke = 14,
  color = "#7C3AED",
  track = "rgba(255,255,255,0.12)",
  label,
}: ProgressRingProps) {
  const normalized = Math.min(100, Math.max(0, value));
  const radius = (size - stroke) / 2;
  const circumference = radius * Math.PI * 2;
  const dashoffset = circumference - (normalized / 100) * circumference;

  return (
    <div className="relative grid place-items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={track} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", transition: "stroke-dashoffset 900ms ease" }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="font-sora text-4xl font-bold text-[var(--text-primary)]">{Math.round(normalized)}%</p>
        {label ? <p className="text-xs text-[var(--text-secondary)]">{label}</p> : null}
      </div>
    </div>
  );
}
