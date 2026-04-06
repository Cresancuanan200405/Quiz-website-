"use client";

import { motion } from "framer-motion";

interface SocialButtonProps {
  provider: "google" | "discord" | "github";
  onClick: () => void;
  label?: string;
}

function SocialIcon({ provider }: { provider: SocialButtonProps["provider"] }) {
  if (provider === "google") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.2-1.4 3.5-5.4 3.5-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 2.9 14.6 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.9H12z" />
      </svg>
    );
  }

  if (provider === "discord") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          fill="#A5B4FC"
          d="M20.3 5.4A16.3 16.3 0 0 0 16.2 4c-.2.4-.4 1-.5 1.4A15.4 15.4 0 0 0 8.2 5.4c-.2-.5-.4-1-.5-1.4a16.3 16.3 0 0 0-4.1 1.4C1 9.1.3 12.7.6 16.3A16.8 16.8 0 0 0 5.5 19c.4-.5.7-1 .9-1.5-.6-.2-1.1-.5-1.6-.8l.4-.3c3.2 1.5 6.7 1.5 9.8 0l.4.3c-.5.3-1 .6-1.6.8.3.5.6 1 .9 1.5a16.8 16.8 0 0 0 4.9-2.7c.4-4.1-.6-7.7-2.3-10.9ZM9.2 14.2c-1 0-1.7-.9-1.7-2s.8-2 1.7-2 1.8.9 1.7 2c0 1.1-.8 2-1.7 2Zm5.6 0c-1 0-1.7-.9-1.7-2s.8-2 1.7-2 1.8.9 1.7 2c0 1.1-.7 2-1.7 2Z"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.2.8-.6v-2c-3.4.7-4.1-1.4-4.1-1.4-.6-1.3-1.3-1.6-1.3-1.6-1-.7.1-.7.1-.7 1.1.1 1.7 1.1 1.7 1.1 1 .1.7 2 3.7 1.4 0-.8.4-1.4.7-1.7-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.4-2.3 1.1-3.2-.1-.3-.5-1.5.1-3.1 0 0 .9-.3 3.1 1.2a10.7 10.7 0 0 1 5.7 0C16.9 6 17.8 6.3 17.8 6.3c.6 1.6.2 2.8.1 3.1.7.9 1.1 1.9 1.1 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .4.2.7.8.6A12 12 0 0 0 12 .3Z"
      />
    </svg>
  );
}

export default function SocialButton({ provider, onClick, label }: SocialButtonProps) {
  const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);

  return (
    <motion.button
      type="button"
      aria-label={`Continue with ${providerName}`}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="focus-ring flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-black/10 bg-black/5 px-4 text-sm text-[var(--text-primary)] shadow-sm hover:border-black/20 hover:bg-black/10 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:border-white/30 dark:hover:bg-white/10"
    >
      <span className="absolute left-4 text-[var(--text-secondary)] dark:text-white/80">
        <SocialIcon provider={provider} />
      </span>
      <span>{label ?? `Continue with ${providerName}`}</span>
    </motion.button>
  );
}
