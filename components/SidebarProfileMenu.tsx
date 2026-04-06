"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserCircle, faCog, faTrophy, faSignOutAlt } from "@fortawesome/free-solid-svg-icons";
import { currentUser } from "@/lib/mockData";
import ProfilePhoto from "@/components/ProfilePhoto";
import { useProfilePhotoStore } from "@/lib/profilePhotoStore";
import { cx } from "@/lib/utils";

interface SidebarProfileMenuProps {
  isCollapsed: boolean;
  onSignOut: () => void;
}

const menuItems = [
  { icon: faUserCircle, label: "My Profile", href: "/profile" },
  { icon: faCog, label: "Settings", href: "/settings" },
  { icon: faTrophy, label: "Achievements", href: "/achievements" },
];

export default function SidebarProfileMenu({ isCollapsed, onSignOut }: SidebarProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { photo } = useProfilePhotoStore();

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", onClickOutside);
      return () => document.removeEventListener("mousedown", onClickOutside);
    }
  }, [isOpen]);

  const dropdownPositionClass = isCollapsed
    ? "left-full bottom-0 ml-2"
    : "bottom-full left-0 mb-2";

  const dropdownMotion = isCollapsed
    ? { initial: { opacity: 0, x: -8, scale: 0.96 }, animate: { opacity: 1, x: 0, scale: 1 }, exit: { opacity: 0, x: -8, scale: 0.96 } }
    : { initial: { opacity: 0, y: 8, scale: 0.96 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 8, scale: 0.96 } };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Open profile menu"
        className={cx(
          "focus-ring group w-full rounded-xl border transition-all duration-150",
          "dark:border-white/8 border-gray-100 dark:bg-white/5 bg-gray-50 hover:border-violet-400/40",
          isCollapsed ? "flex h-14 items-center justify-center" : "flex items-center gap-3 px-2 py-2"
        )}
      >
        <ProfilePhoto
          photo={photo}
          fallbackText={currentUser.username}
          className="h-9 w-9 flex-shrink-0 border-violet-400/50"
          textClassName="text-xs"
        />

        {!isCollapsed ? (
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate font-sora text-sm font-semibold text-[var(--text-primary)]">{currentUser.username}</p>
            <p className="text-xs text-[var(--text-secondary)]">{currentUser.tier}</p>
          </div>
        ) : null}
      </button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={dropdownMotion.initial}
            animate={dropdownMotion.animate}
            exit={dropdownMotion.exit}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={cx(
              "absolute z-50 w-56 rounded-card border dark:border-white/10 border-gray-200 dark:bg-[#14162B] bg-white shadow-xl",
              dropdownPositionClass
            )}
          >
            <div className="border-b dark:border-white/10 border-gray-200 px-4 py-3">
              <p className="font-sora text-sm font-semibold text-[var(--text-primary)]">{currentUser.username}</p>
              <p className="text-xs text-[var(--text-secondary)]">{currentUser.tier}</p>
            </div>

            <div className="py-1">
              {menuItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-primary)] transition-colors duration-100 hover:bg-violet-500/10"
                >
                  <FontAwesomeIcon icon={item.icon} className="h-4 w-4 text-violet-600 dark:text-violet-300" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>

            <div className="border-t dark:border-white/10 border-gray-200 py-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onSignOut();
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 transition-colors duration-100 hover:bg-red-500/10 dark:text-red-400"
              >
                <FontAwesomeIcon icon={faSignOutAlt} className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
