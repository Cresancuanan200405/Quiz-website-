import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  tone?: "green" | "amber" | "blue";
}

const toneMap = {
  green: "from-green-500/16 via-emerald-400/8 to-transparent border-green-400/35 text-green-700 dark:text-green-200",
  amber: "from-amber-500/18 via-orange-400/8 to-transparent border-amber-400/35 text-amber-700 dark:text-amber-200",
  blue: "from-sky-500/16 via-indigo-400/10 to-transparent border-sky-400/35 text-sky-700 dark:text-sky-200",
};

export default function StatCard({ label, value, hint, icon, tone = "blue" }: StatCardProps) {
  return (
    <article
      className={`glass rounded-card border bg-gradient-to-br p-4 shadow-[0_14px_30px_rgba(15,23,42,0.12)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_38px_rgba(59,130,246,0.14)] dark:shadow-[0_18px_34px_rgba(2,8,25,0.42)] ${toneMap[tone]}`}
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
