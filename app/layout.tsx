import type { Metadata } from "next";
import { DM_Sans, Sora } from "next/font/google";
import AchievementUnlockNotifier from "@/components/AchievementUnlockNotifier";
import ThemeHydrator from "@/components/ThemeHydrator";
import NotificationCenter from "@/components/NotificationCenter";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QuizArena",
  description: "Dark arcade premium quiz, trivia, and 1v1 battle platform",
  icons: {
    icon: "/images/Quiz3.png",
    shortcut: "/images/Quiz3.png",
    apple: "/images/Quiz3.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sora.variable} ${dmSans.variable} h-full antialiased dark`}
    >
      <body className="bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300">
        <ThemeHydrator />
        <AchievementUnlockNotifier />
        <NotificationCenter />
        {children}
      </body>
    </html>
  );
}
