import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  tone?: "green" | "amber" | "blue";
}

const toneMap = {
  green: "from-green-500/20 to-green-400/5 border-green-400/30 text-green-700 dark:text-green-200",
  amber: "from-amber-500/20 to-amber-400/5 border-amber-400/30 text-amber-700 dark:text-amber-200",
  blue: "from-sky-500/20 to-sky-400/5 border-sky-400/30 text-sky-700 dark:text-sky-200",
};

export default function StatCard({ label, value, hint, icon, tone = "blue" }: StatCardProps) {
  return (
    <article
      className={`glass rounded-card border bg-gradient-to-br p-4 ${toneMap[tone]} hover:-translate-y-1`}
    >
      <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-widest text-[var(--text-secondary)]">
        <span>{label}</span>
        {icon}
      </div>
      <p className="font-sora text-2xl font-semibold text-[var(--text-primary)]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[var(--text-secondary)]">{hint}</p> : null}
    </article>
  );
}
