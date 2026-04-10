"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserCircle, faCog, faTrophy, faSignOutAlt } from "@fortawesome/free-solid-svg-icons";
import { AlertTriangle, LogOut } from "lucide-react";
import { useAuthStore } from "../lib/authStore";
import { useProfileStore } from "../lib/profileStore";
import { useProfilePhotoStore } from "../lib/profilePhotoStore";
import { useNotificationStore } from "../lib/notificationStore";

interface AvatarDropdownProps {
  onSignOut?: () => void;
}

export default function AvatarDropdown({ onSignOut }: AvatarDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const pushNotification = useNotificationStore((state) => state.pushNotification);
  const { displayName, handle, tier } = useProfileStore();
  const photo = useProfilePhotoStore((state) => state.photo);

  const avatarText = photo.type === "initials" ? photo.value : displayName.slice(0, 2).toUpperCase();
  const subtitle = user?.email ?? handle;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleSignOutRequest = () => {
    setIsOpen(false);
    setShowSignOutConfirm(true);
  };

  const handleConfirmSignOut = async () => {
    if (isSigningOut) return;

    setIsSigningOut(true);
    try {
      await logout();
      pushNotification("Signed out successfully.", "info");
      setShowSignOutConfirm(false);
      onSignOut?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sign out right now.";
      pushNotification(message, "error", 3200);
    } finally {
      setIsSigningOut(false);
    }
  };

  const menuItems = [
    { icon: faUserCircle, label: "My Profile", href: "/profile" },
    { icon: faCog, label: "Settings", href: "/settings" },
    { icon: faTrophy, label: "Achievements", href: "/achievements" },
  ];

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`User menu for ${displayName}`}
        onClick={() => setIsOpen(!isOpen)}
        className="focus-ring grid h-9 w-9 place-items-center rounded-full bg-violet-500/20 text-xs font-semibold text-violet-500 dark:text-violet-200 hover:bg-violet-500/30 dark:hover:bg-violet-500/25 transition-colors duration-150 cursor-pointer border border-violet-400/20 hover:border-violet-400/40 dark:border-violet-400/20 dark:hover:border-violet-400/30"
      >
        {avatarText}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-full mt-2 w-56 rounded-card border dark:border-white/10 border-gray-200 dark:bg-[#1A1B2E] bg-white shadow-lg dark:shadow-2xl"
          >
            {/* User Header */}
            <div className="border-b dark:border-white/10 border-gray-200 px-4 py-3">
              <p className="font-sora font-semibold text-[var(--text-primary)] text-sm">
                {displayName}
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {subtitle} • {tier}
              </p>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              {menuItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-violet-500/10 dark:hover:bg-violet-500/10 transition-colors duration-100"
                >
                  <FontAwesomeIcon icon={item.icon} className="h-4 w-4 text-violet-600 dark:text-violet-300" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>

            {/* Sign Out */}
            <div className="border-t dark:border-white/10 border-gray-200 py-1">
              <button
                type="button"
                onClick={handleSignOutRequest}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-500/10 transition-colors duration-100"
              >
                <FontAwesomeIcon icon={faSignOutAlt} className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSignOutConfirm ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm"
            onClick={() => {
              if (isSigningOut) return;
              setShowSignOutConfirm(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.97, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.97, opacity: 0, y: 10 }}
              className="glass w-full max-w-md rounded-[24px] border border-rose-400/35 bg-white/90 p-5 dark:bg-slate-900/90"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="inline-flex items-center gap-2 font-sora text-lg font-semibold text-[var(--text-primary)]">
                <AlertTriangle className="h-5 w-5 text-rose-500 dark:text-rose-300" /> Confirm Sign Out
              </p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                You are about to sign out of {user?.email ?? displayName}. Continue?
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSignOutConfirm(false)}
                  disabled={isSigningOut}
                  className="focus-ring arcade-btn rounded-button border border-black/10 px-4 py-2 text-sm text-[var(--text-secondary)] disabled:opacity-60 dark:border-white/15 dark:text-white/80"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleConfirmSignOut();
                  }}
                  disabled={isSigningOut}
                  className="focus-ring arcade-btn inline-flex items-center gap-2 rounded-button border border-rose-500/45 bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-70 dark:border-rose-400/45 dark:bg-rose-500/12 dark:text-rose-100"
                >
                  <LogOut className="h-4 w-4" />
                  {isSigningOut ? "Signing out..." : "Sign Out"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
