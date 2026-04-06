"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserCircle, faCog, faTrophy, faSignOutAlt } from "@fortawesome/free-solid-svg-icons";
import { currentUser } from "@/lib/mockData";

interface AvatarDropdownProps {
  onSignOut?: () => void;
}

export default function AvatarDropdown({ onSignOut }: AvatarDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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

  const handleSignOut = () => {
    setIsOpen(false);
    onSignOut?.();
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
        aria-label={`User menu for ${currentUser.username}`}
        onClick={() => setIsOpen(!isOpen)}
        className="focus-ring grid h-9 w-9 place-items-center rounded-full bg-violet-500/20 text-xs font-semibold text-violet-500 dark:text-violet-200 hover:bg-violet-500/30 dark:hover:bg-violet-500/25 transition-colors duration-150 cursor-pointer border border-violet-400/20 hover:border-violet-400/40 dark:border-violet-400/20 dark:hover:border-violet-400/30"
      >
        {currentUser.avatar}
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
                {currentUser.username}
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {currentUser.tier}
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
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-500/10 transition-colors duration-100"
              >
                <FontAwesomeIcon icon={faSignOutAlt} className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
