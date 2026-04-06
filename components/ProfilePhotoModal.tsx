"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link2, UploadCloud, X } from "lucide-react";
import ProfilePhoto from "@/components/ProfilePhoto";
import { useProfilePhotoStore, type ProfilePhotoValue } from "@/lib/profilePhotoStore";
import { cx } from "@/lib/utils";

type PhotoTab = "upload" | "avatar";

const avatarBgClasses = [
  "bg-red-500/25",
  "bg-yellow-500/25",
  "bg-teal-500/25",
  "bg-orange-500/25",
] as const;

const cartoonAvatarUrls = Array.from({ length: 25 }, (_, index) => {
  const seed = `arcade-avatar-${index + 1}`;
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}`;
});

interface ProfilePhotoModalProps {
  onClose: () => void;
  fallbackText: string;
  onSaved?: () => void;
}

export default function ProfilePhotoModal({ onClose, fallbackText, onSaved }: ProfilePhotoModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { photo, setPhoto } = useProfilePhotoStore();

  const [activeTab, setActiveTab] = useState<PhotoTab>("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [webUrl, setWebUrl] = useState(photo.type === "image" ? photo.value : "");
  const [draft, setDraft] = useState<ProfilePhotoValue>(photo);

  const isDraftValid = useMemo(() => {
    if (draft.type === "image") return draft.value.trim().length > 0;
    return draft.value.trim().length > 0;
  }, [draft]);

  const readFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const src = typeof reader.result === "string" ? reader.result : "";
      if (!src) return;
      setDraft({ type: "image", value: src });
      setWebUrl(src);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) readFile(file);
  };

  const handleSave = () => {
    if (!isDraftValid) return;
    setPhoto(draft);
    onSaved?.();
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4 py-4 backdrop-blur-md"
      >
        <motion.section
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.98 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          onClick={(event) => event.stopPropagation()}
          className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-card border border-violet-400/40 bg-[var(--bg-card)]/90 p-5 backdrop-blur-md shadow-[0_0_35px_rgba(124,58,237,0.25)]"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-sora text-xl font-semibold text-[var(--text-primary)]">Profile Photo</h2>
              <p className="text-sm text-[var(--text-secondary)]">Pick a look that matches your arcade identity.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close profile photo modal"
              className="focus-ring rounded-full border border-white/20 bg-white/10 p-1.5 hover:border-violet-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-5 flex justify-center">
            <ProfilePhoto
              photo={draft}
              fallbackText={fallbackText}
              className="h-32 w-32 border-2 border-violet-400/70"
              textClassName="text-4xl"
              neon
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="mb-4 inline-flex w-full rounded-full border border-violet-400/35 bg-black/10 p-1 dark:bg-white/5">
              <button
                type="button"
                onClick={() => setActiveTab("upload")}
                className={cx(
                  "focus-ring flex-1 rounded-full px-4 py-2 text-sm font-medium transition-all",
                  activeTab === "upload"
                    ? "bg-violet-500/30 text-violet-100 shadow-[0_0_12px_rgba(124,58,237,0.35)]"
                    : "text-[var(--text-secondary)]"
                )}
              >
                Local Upload
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("avatar")}
                className={cx(
                  "focus-ring flex-1 rounded-full px-4 py-2 text-sm font-medium transition-all",
                  activeTab === "avatar"
                    ? "bg-violet-500/30 text-violet-100 shadow-[0_0_12px_rgba(124,58,237,0.35)]"
                    : "text-[var(--text-secondary)]"
                )}
              >
                Choose Avatar
              </button>
            </div>

            {activeTab === "upload" ? (
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={handleDrop}
                className={cx(
                  "rounded-card border-2 border-dashed p-6 text-center transition-all",
                  isDragging
                    ? "border-violet-400 bg-violet-500/15"
                    : "border-violet-400/35 bg-black/5 dark:bg-white/5"
                )}
              >
                <UploadCloud className="mx-auto mb-3 h-8 w-8 text-violet-400" />
                <p className="text-sm font-medium text-[var(--text-primary)]">Drop an image here</p>
                <p className="text-xs text-[var(--text-secondary)]">PNG, JPG, WEBP up to 10MB</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="focus-ring mt-4 rounded-button border border-violet-400/40 bg-violet-500/15 px-3 py-2 text-sm text-violet-200 hover:bg-violet-500/25"
                >
                  Browse files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) readFile(file);
                  }}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="max-h-72 overflow-y-auto rounded-card border border-black/10 bg-black/5 p-3 dark:border-white/10 dark:bg-white/5">
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                    {cartoonAvatarUrls.map((url, index) => {
                      const active = draft.type === "image" && draft.value === url;
                      const bgClass = avatarBgClasses[index % avatarBgClasses.length];
                      return (
                        <button
                          key={url}
                          type="button"
                          onClick={() => setDraft({ type: "image", value: url })}
                          className={cx(
                            "focus-ring cursor-pointer overflow-hidden rounded-full border-2 p-0.5 transition-all",
                            active
                              ? "border-violet-400 shadow-[0_0_0_2px_rgba(167,139,250,0.95),0_0_22px_rgba(124,58,237,0.45)]"
                              : "border-black/10 hover:border-violet-400/55 dark:border-white/15",
                            bgClass,
                          )}
                        >
                          {/* DiceBear URL avatars are dynamic external images. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`Cartoon avatar ${index + 1}`}
                            className="h-10 w-10 rounded-full object-cover sm:h-12 sm:w-12"
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label htmlFor="profile-web-url" className="mb-1.5 block text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                    Web Image URL
                  </label>
                  <div className="relative">
                    <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
                    <input
                      id="profile-web-url"
                      type="url"
                      value={webUrl}
                      onChange={(event) => {
                        const next = event.target.value;
                        setWebUrl(next);
                        const trimmed = next.trim();
                        if (trimmed.length > 0) {
                          setDraft({ type: "image", value: trimmed });
                        }
                      }}
                      placeholder="https://example.com/avatar.png"
                      className="focus-ring w-full rounded-card border border-black/10 bg-black/5 py-2.5 pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/70 hover:border-violet-400/45 dark:border-white/15 dark:bg-white/5"
                    />
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">Paste a direct image link for instant preview.</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 flex shrink-0 items-center justify-end gap-2 border-t border-black/10 pt-4 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="focus-ring rounded-button border border-black/10 bg-black/5 px-4 py-2 text-sm text-[var(--text-primary)] hover:border-violet-400/45 dark:border-white/15 dark:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!isDraftValid}
              className="focus-ring arcade-btn btn-primary rounded-button px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save Photo
            </button>
          </div>
        </motion.section>
      </motion.div>
    </AnimatePresence>
  );
}
