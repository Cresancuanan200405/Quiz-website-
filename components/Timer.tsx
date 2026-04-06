import { cx } from "@/lib/utils";

interface TimerProps {
  timeLeft: number;
  total?: number;
}

export default function Timer({ timeLeft, total = 15 }: TimerProps) {
  const ratio = Math.max(0, Math.min(1, timeLeft / total));
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - ratio);

  const tone = timeLeft > 8 ? "text-green-300" : timeLeft > 4 ? "text-amber-300" : "text-red-300";
  const stroke = timeLeft > 8 ? "#22C55E" : timeLeft > 4 ? "#F59E0B" : "#EF4444";

  return (
    <div className={cx("relative grid h-12 w-12 place-items-center", timeLeft < 4 && "animate-pulse")}>
      <svg className="absolute inset-0" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={radius} stroke="rgba(255,255,255,0.12)" strokeWidth="5" fill="none" />
        <circle
          cx="22"
          cy="22"
          r={radius}
          stroke={stroke}
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 22 22)"
        />
      </svg>
      <span className={cx("relative z-10 font-sora text-xs font-semibold", tone)} aria-label={`Time remaining ${timeLeft} seconds`}>
        {timeLeft}
      </span>
    </div>
  );
}
