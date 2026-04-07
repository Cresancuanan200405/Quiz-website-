import { cx } from "@/lib/utils";
import { motion } from "framer-motion";

interface TimerProps {
  timeLeft: number;
  total?: number;
}

export default function Timer({ timeLeft, total = 15 }: TimerProps) {
  const ratio = Math.max(0, Math.min(1, timeLeft / total));
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - ratio);
  const isCritical = timeLeft < 4;

  const tone = timeLeft > 8 ? "text-green-300" : timeLeft > 4 ? "text-amber-300" : "text-red-300";
  const stroke = timeLeft > 8 ? "#22C55E" : timeLeft > 4 ? "#F59E0B" : "#EF4444";

  return (
    <motion.div
      className="relative grid h-12 w-12 place-items-center"
      animate={isCritical ? { scale: [1, 1.08, 1] } : { scale: 1 }}
      transition={isCritical ? { duration: 0.55, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2, ease: "easeOut" }}
    >
      <svg className="absolute inset-0" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={radius} stroke="rgba(255,255,255,0.12)" strokeWidth="5" fill="none" />
        <motion.circle
          cx="22"
          cy="22"
          r={radius}
          stroke={stroke}
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={false}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.92, ease: [0.22, 1, 0.36, 1] }}
          transform="rotate(-90 22 22)"
        />
      </svg>
      <motion.span
        key={timeLeft}
        initial={{ opacity: 0.7, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
        className={cx("relative z-10 font-sora text-xs font-semibold", tone)}
        aria-label={`Time remaining ${timeLeft} seconds`}
      >
        {timeLeft}
      </motion.span>
    </motion.div>
  );
}
