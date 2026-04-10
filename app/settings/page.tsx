"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronDown, Globe, Headphones, BellRing, LockKeyhole, Eye, Sparkles, Volume2, Shield, Users, Activity, AlertTriangle } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { cx } from "@/lib/utils";
import { useSettingsStore, type SettingsDifficulty, type SettingsLanguage } from "@/lib/settingsStore";
import { useTriviaFactsStore } from "@/lib/triviaFactsStore";
import { useAuthStore } from "@/lib/authStore";
import { useNotificationStore } from "@/lib/notificationStore";

const languageOptions: SettingsLanguage[] = ["English", "Spanish", "French", "Japanese"];
const difficultyOptions: SettingsDifficulty[] = ["Easy", "Medium", "Hard"];
const nextQuestionDelayOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => `${value} seconds`);

function SettingRow({
  icon,
  title,
  description,
  checked,
  onToggle,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onToggle: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-card border border-slate-200 bg-white/85 px-4 py-3 dark:border-white/10 dark:bg-white/5">
      <div className="flex min-w-0 items-start gap-3">
        <div className={cx("mt-0.5 grid h-9 w-9 place-items-center rounded-full", checked ? "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300" : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-[var(--text-secondary)]")}>{icon}</div>
        <div className="min-w-0">
          <p className="font-medium text-slate-900 dark:text-[var(--text-primary)]">{title}</p>
          <p className="text-sm text-slate-600 dark:text-[var(--text-secondary)]">{description}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onToggle(!checked)}
        className={cx(
          "relative h-7 w-12 shrink-0 rounded-full border transition-all duration-150",
          checked ? "border-violet-400 bg-violet-500/35 shadow-[0_0_18px_rgba(124,58,237,0.35)]" : "border-slate-300 bg-slate-200 dark:border-white/10 dark:bg-white/10"
        )}
      >
        <span
          className={cx(
            "absolute top-1 h-5 w-5 rounded-full transition-all duration-150",
            checked ? "left-6 bg-violet-100 shadow-[0_0_10px_rgba(196,181,253,0.8)]" : "left-1 bg-white/90 dark:bg-white/80"
          )}
        />
      </button>
    </div>
  );
}

function SelectField({
  icon,
  label,
  value,
  onChange,
  options,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div className="rounded-card border border-slate-200 bg-white/85 p-4 dark:border-white/10 dark:bg-white/5">
      <div className="mb-3 flex items-center gap-2 text-slate-900 dark:text-[var(--text-primary)]">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">{icon}</span>
        <p className="font-medium">{label}</p>
      </div>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="focus-ring w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 pr-10 text-sm text-slate-900 outline-none transition-colors hover:border-violet-400 dark:border-white/10 dark:bg-[var(--bg-card)] dark:text-[var(--text-primary)]"
        >
          {options.map((option) => (
            <option key={option} value={option} className="bg-white text-slate-900 dark:bg-[var(--bg-card)] dark:text-[var(--text-primary)]">
              {option}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-[var(--text-secondary)]" />
      </div>
    </div>
  );
}

function SettingsAccordion({
  title,
  description,
  icon,
  open,
  onToggle,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <article className="glass overflow-hidden rounded-card border border-slate-200 bg-white/88 dark:border-white/10 dark:bg-transparent">
      <button
        type="button"
        onClick={onToggle}
        className="focus-ring flex w-full items-start justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-violet-100 text-violet-700 shadow-[0_0_18px_rgba(124,58,237,0.12)] dark:bg-violet-500/15 dark:text-violet-300 dark:shadow-[0_0_18px_rgba(124,58,237,0.18)]">
            {icon}
          </div>
          <div>
            <h2 className="font-sora text-lg font-semibold text-slate-900 dark:text-[var(--text-primary)]">{title}</h2>
            <p className="text-sm text-slate-600 dark:text-[var(--text-secondary)]">{description}</p>
          </div>
        </div>
        <ChevronDown className={cx("mt-1 h-5 w-5 text-slate-500 transition-transform dark:text-[var(--text-secondary)]", open ? "rotate-180" : "rotate-0")} />
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="overflow-hidden"
      >
        <div className="space-y-3 border-t border-slate-200 px-5 pb-5 pt-4 dark:border-white/10">{children}</div>
      </motion.div>
    </article>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const {
    publicProfile,
    showOnlineStatus,
    soundEffects,
    music,
    autoStartNextQuiz,
    nextQuestionDelaySeconds,
    showDifficultyProgressionDialog,
    dailyReminder,
    challengeAlerts,
    emailNotifications,
    defaultLanguage,
    preferredDifficulty,
    setToggle,
    setDefaultLanguage,
    setPreferredDifficulty,
    setNextQuestionDelaySeconds,
    setShowDifficultyProgressionDialog,
  } = useSettingsStore();
  const authUser = useAuthStore((state) => state.user);
  const deleteAccount = useAuthStore((state) => state.deleteAccount);
  const changePassword = useAuthStore((state) => state.changePassword);
  const pushNotification = useNotificationStore((state) => state.pushNotification);
  const { factActivity } = useTriviaFactsStore();
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [confirmDeleteText, setConfirmDeleteText] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [openPanels, setOpenPanels] = useState<Record<string, boolean>>({
    profile: true,
    gameplay: false,
    notifications: false,
    activity: false,
    danger: false,
  });

  const activityLog = useMemo(() => factActivity.slice(0, 20), [factActivity]);

  const togglePanel = (key: string) => {
    setOpenPanels((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const canDeleteAccount = confirmDeleteText.trim().toUpperCase() === "DELETE ACCOUNT";
  const canSubmitPassword =
    newPassword.trim().length >= 8 &&
    confirmNewPassword.trim().length >= 8 &&
    newPassword.trim() === confirmNewPassword.trim() &&
    !isChangingPassword;

  const handleChangePassword = async () => {
    if (isChangingPassword) return;

    const normalizedPassword = newPassword.trim();
    const normalizedConfirm = confirmNewPassword.trim();

    if (normalizedPassword.length < 8) {
      const message = "Password must be at least 8 characters.";
      setPasswordError(message);
      pushNotification(message, "warning", 3200);
      return;
    }

    if (normalizedPassword !== normalizedConfirm) {
      const message = "New password and confirm password must match.";
      setPasswordError(message);
      pushNotification(message, "warning", 3200);
      return;
    }

    setPasswordError(null);
    setIsChangingPassword(true);

    try {
      await changePassword(normalizedPassword);
      setNewPassword("");
      setConfirmNewPassword("");
      pushNotification("Password updated successfully.", "success", 3200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update password right now.";
      setPasswordError(message);
      pushNotification(message, "error", 3600);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!canDeleteAccount || isDeletingAccount) {
      setDeleteError("Type DELETE ACCOUNT to unlock permanent deletion.");
      return;
    }

    setDeleteError(null);
    setIsDeletingAccount(true);

    try {
      await deleteAccount();
      router.replace("/login");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete account right now.";
      setDeleteError(message);
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 text-[var(--text-primary)] md:pb-0">
      <Sidebar />
      <TopBar title="Settings" />

      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full px-4 py-6 md:ml-[var(--sidebar-width)] md:w-[calc(100%-var(--sidebar-width))] md:px-8"
      >
        <div className="mx-auto w-full max-w-6xl space-y-5">
          <section className="glass overflow-hidden rounded-card border border-violet-200/65 bg-white/90 p-0 dark:border-violet-400/15 dark:bg-transparent">
            <div className="relative px-6 py-6 sm:px-7">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-violet-500/18 via-fuchsia-500/10 to-cyan-500/10" />
              <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                  <h1 className="font-sora text-3xl font-bold tracking-tight text-slate-900 dark:text-[var(--text-primary)]">User Settings</h1>
                  <p className="mt-2 text-sm text-slate-600 dark:text-[var(--text-secondary)]">
                    Clean dropdown panels for account controls, gameplay tuning, notifications, and activity tracking.
                  </p>
                </div>
                <div className="grid gap-2 rounded-card border border-violet-200/70 bg-white/80 px-4 py-3 text-sm text-slate-600 dark:border-violet-400/20 dark:bg-white/5 dark:text-[var(--text-secondary)]">
                  <p>Use each dropdown to focus on one settings area at a time.</p>
                  <p>Activity Log tracks your fact likes/saves in real time.</p>
                </div>
              </div>
            </div>
          </section>

          <div className="space-y-4">
            <SettingsAccordion
              title="Account & Profile"
              description="Control what other players can see and manage profile visibility."
              icon={<LockKeyhole className="h-4 w-4" />}
              open={openPanels.profile}
              onToggle={() => togglePanel("profile")}
            >
              <SettingRow icon={<Users className="h-4 w-4" />} title="Public Profile" description="Let other players view your profile card and badges." checked={publicProfile} onToggle={(value) => setToggle("publicProfile", value)} />
              <SettingRow icon={<Eye className="h-4 w-4" />} title="Online Status" description="Show when you are active on the platform." checked={showOnlineStatus} onToggle={(value) => setToggle("showOnlineStatus", value)} />

              <article className="rounded-card border border-violet-200/65 bg-violet-50/65 p-4 dark:border-violet-300/30 dark:bg-violet-500/10">
                <div className="mb-3 flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-violet-200/70 text-violet-700 dark:bg-violet-500/25 dark:text-violet-200">
                    <LockKeyhole className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-[var(--text-primary)]">Change Password</p>
                    <p className="text-sm text-slate-600 dark:text-[var(--text-secondary)]">Update your account password. Minimum 8 characters.</p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-[var(--text-secondary)]">
                    New Password
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(event) => {
                        setNewPassword(event.target.value);
                        if (passwordError) setPasswordError(null);
                      }}
                      placeholder="At least 8 characters"
                      className="focus-ring rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-900 placeholder:text-slate-400 dark:border-white/15 dark:bg-black/20 dark:text-[var(--text-primary)] dark:placeholder:text-[var(--text-secondary)]"
                    />
                  </label>

                  <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-[var(--text-secondary)]">
                    Confirm New Password
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={confirmNewPassword}
                      onChange={(event) => {
                        setConfirmNewPassword(event.target.value);
                        if (passwordError) setPasswordError(null);
                      }}
                      placeholder="Repeat your new password"
                      className="focus-ring rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-900 placeholder:text-slate-400 dark:border-white/15 dark:bg-black/20 dark:text-[var(--text-primary)] dark:placeholder:text-[var(--text-secondary)]"
                    />
                  </label>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      void handleChangePassword();
                    }}
                    disabled={!canSubmitPassword}
                    className={cx(
                      "focus-ring h-10 rounded-xl px-4 text-sm font-semibold transition-all",
                      canSubmitPassword
                        ? "bg-violet-500 text-white hover:bg-violet-400"
                        : "cursor-not-allowed bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-[var(--text-secondary)]"
                    )}
                  >
                    {isChangingPassword ? "Updating password..." : "Update Password"}
                  </button>
                  <p className="text-xs text-slate-600 dark:text-[var(--text-secondary)]">Use a password you do not reuse on other websites.</p>
                </div>

                {passwordError ? <p className="mt-2 text-sm text-red-700 dark:text-red-200">{passwordError}</p> : null}
              </article>
            </SettingsAccordion>

            <SettingsAccordion
              title="Gameplay & Sound"
              description="Tune your play experience, challenge flow, and sound feedback."
              icon={<Volume2 className="h-4 w-4" />}
              open={openPanels.gameplay}
              onToggle={() => togglePanel("gameplay")}
            >
              <SettingRow icon={<Headphones className="h-4 w-4" />} title="Sound Effects" description="Enable neon audio cues for quiz actions and transitions." checked={soundEffects} onToggle={(value) => setToggle("soundEffects", value)} />
              <SettingRow icon={<Sparkles className="h-4 w-4" />} title="Auto Start Next Quiz" description="Jump straight into another round after finishing." checked={autoStartNextQuiz} onToggle={(value) => setToggle("autoStartNextQuiz", value)} />
              <SelectField icon={<Sparkles className="h-4 w-4" />} label="Next Question Delay" value={`${nextQuestionDelaySeconds} seconds`} onChange={(value) => setNextQuestionDelaySeconds(Number.parseInt(value, 10))} options={nextQuestionDelayOptions} />
              <SettingRow icon={<Sparkles className="h-4 w-4" />} title="Show Progression Dialog" description="Show the difficulty progression dialog before starting a quiz." checked={showDifficultyProgressionDialog} onToggle={(value) => setShowDifficultyProgressionDialog(value)} />
              <SettingRow icon={<Volume2 className="h-4 w-4" />} title="Music" description="Play subtle ambient background music in the arcade UI." checked={music} onToggle={(value) => setToggle("music", value)} />
              <SelectField icon={<Shield className="h-4 w-4" />} label="Preferred Difficulty" value={preferredDifficulty} onChange={(value) => setPreferredDifficulty(value as SettingsDifficulty)} options={difficultyOptions} />
            </SettingsAccordion>

            <SettingsAccordion
              title="Notifications"
              description="Choose which alerts should reach you and how often."
              icon={<BellRing className="h-4 w-4" />}
              open={openPanels.notifications}
              onToggle={() => togglePanel("notifications")}
            >
              <SettingRow icon={<BellRing className="h-4 w-4" />} title="Daily Reminder" description="Send a reminder when your quiz streak is ready." checked={dailyReminder} onToggle={(value) => setToggle("dailyReminder", value)} />
              <SettingRow icon={<Sparkles className="h-4 w-4" />} title="Challenge Alerts" description="Get pinged when someone sends a 1v1 challenge." checked={challengeAlerts} onToggle={(value) => setToggle("challengeAlerts", value)} />
              <SettingRow icon={<Users className="h-4 w-4" />} title="Email Notifications" description="Receive platform updates and weekly summaries by email." checked={emailNotifications} onToggle={(value) => setToggle("emailNotifications", value)} />
              <SelectField icon={<Globe className="h-4 w-4" />} label="Default Language" value={defaultLanguage} onChange={(value) => setDefaultLanguage(value as SettingsLanguage)} options={languageOptions} />
            </SettingsAccordion>

            <SettingsAccordion
              title="My Activity"
              description="Activity Log of your saved and liked facts."
              icon={<Activity className="h-4 w-4" />}
              open={openPanels.activity}
              onToggle={() => togglePanel("activity")}
            >
              {activityLog.length ? (
                <div className="space-y-2">
                  {activityLog.map((item) => (
                    <article key={item.id} className="rounded-card border border-fuchsia-300/35 bg-fuchsia-100/55 px-4 py-3 dark:border-fuchsia-300/30 dark:bg-fuchsia-500/8">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-slate-900 dark:text-[var(--text-primary)]">{item.factTitle}</p>
                        <span className="rounded-full border border-fuchsia-300/45 bg-fuchsia-500/18 px-2.5 py-0.5 text-xs capitalize text-fuchsia-700 dark:text-fuchsia-200">
                          {item.action}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600 dark:text-[var(--text-secondary)]">{item.category} • {new Date(item.at).toLocaleString()}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <article className="rounded-card border border-fuchsia-300/35 bg-fuchsia-100/55 p-4 text-sm text-slate-600 dark:border-fuchsia-300/25 dark:bg-fuchsia-500/8 dark:text-[var(--text-secondary)]">
                  No activity yet. Like or save a fact from Dashboard or Trivia to populate this log.
                </article>
              )}
            </SettingsAccordion>

            <SettingsAccordion
              title="Danger Zone"
              description="Permanently delete this account and all associated data."
              icon={<AlertTriangle className="h-4 w-4" />}
              open={openPanels.danger}
              onToggle={() => togglePanel("danger")}
            >
              <article className="rounded-card border border-red-300/55 bg-red-50 p-4 dark:border-red-400/35 dark:bg-red-500/10">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-red-300/70 bg-red-100 text-red-600 dark:border-red-300/45 dark:bg-red-500/20 dark:text-red-200">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-sora text-base font-semibold text-red-700 dark:text-red-100">Delete Account</p>
                    <p className="mt-1 text-sm text-red-700/80 dark:text-red-100/85">
                      This removes your profile, quiz history, battle history, saved facts, and linked auth account for {authUser?.email ?? "this user"}. This action cannot be undone.
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-red-700 dark:text-red-100/85">
                    Type DELETE ACCOUNT to confirm
                    <input
                      value={confirmDeleteText}
                      onChange={(event) => {
                        setConfirmDeleteText(event.target.value);
                        if (deleteError) setDeleteError(null);
                      }}
                      placeholder="DELETE ACCOUNT"
                      className="focus-ring rounded-xl border border-red-300/60 bg-white px-3 py-2 text-sm normal-case tracking-normal text-red-800 placeholder:text-red-400 dark:border-red-300/35 dark:bg-black/20 dark:text-red-50 dark:placeholder:text-red-200/55"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      void handleDeleteAccount();
                    }}
                    disabled={!canDeleteAccount || isDeletingAccount}
                    className={cx(
                      "focus-ring h-11 rounded-xl px-4 text-sm font-semibold transition-all",
                      canDeleteAccount && !isDeletingAccount
                        ? "bg-red-500 text-white hover:bg-red-400"
                        : "cursor-not-allowed bg-red-200 text-red-700/70 dark:bg-red-500/35 dark:text-red-100/65"
                    )}
                  >
                    {isDeletingAccount ? "Deleting account..." : "Delete Account Permanently"}
                  </button>
                </div>

                {deleteError ? <p className="mt-3 text-sm text-red-700 dark:text-red-200">{deleteError}</p> : null}
              </article>
            </SettingsAccordion>
          </div>
        </div>
      </motion.main>
    </div>
  );
}
