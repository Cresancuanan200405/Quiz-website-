import { cx } from "@/lib/utils";

interface AnswerButtonProps {
  label: string;
  value: string;
  selected: boolean;
  revealed: boolean;
  isCorrect: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export default function AnswerButton({
  label,
  value,
  selected,
  revealed,
  isCorrect,
  disabled,
  onClick,
}: AnswerButtonProps) {
  const stateClass = !revealed
    ? selected
      ? "border-violet-300 bg-violet-500/20 text-[var(--text-primary)] shadow-violet-glow dark:text-violet-100"
      : "border-black/8 bg-white/80 text-[var(--text-primary)] hover:-translate-y-0.5 hover:border-violet-400 hover:bg-white hover:shadow-violet-glow dark:border-white/15 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10"
    : isCorrect
      ? "border-green-400 bg-green-500/20 text-green-800 shadow-green-glow dark:text-green-200"
      : selected
        ? "border-red-400 bg-red-500/20 text-red-800 shadow-red-glow dark:text-red-200"
        : "border-black/8 bg-white/60 text-[var(--text-muted)] opacity-70 dark:border-white/10 dark:bg-white/4 dark:text-white/45";

  return (
    <button
      type="button"
      aria-label={`Answer ${label}: ${value}`}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "answer-btn focus-ring arcade-btn h-full min-h-[52px] rounded-card border p-2 text-center sm:min-h-[60px] sm:p-2.5",
        "flex flex-col items-center justify-center gap-1.5",
        stateClass,
        disabled && "cursor-not-allowed"
      )}
    >
      <span className="grid h-6 w-6 place-items-center rounded-full border border-black/10 bg-black/10 text-[9px] font-semibold text-[var(--text-primary)] dark:border-white/20 dark:bg-black/30 dark:text-white">
        {label}
      </span>
      <span className="max-w-[32ch] text-[11px] font-medium leading-snug sm:text-[12px]">{value}</span>
    </button>
  );
}
