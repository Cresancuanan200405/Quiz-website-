import type { Metadata } from "next";
import Script from "next/script";
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
      className={`${sora.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300">
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            (function() {
              try {
                var stored = localStorage.getItem('quizarena-theme');
                var theme = stored ? JSON.parse(stored).state?.theme : 'dark';
                if (theme === 'light') {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                } else {
                  document.documentElement.classList.add('dark');
                }
              } catch(e) {
                document.documentElement.classList.add('dark');
              }
            })();
          `}
        </Script>
        <ThemeHydrator />
        <AchievementUnlockNotifier />
        <NotificationCenter />
        {children}
      </body>
    </html>
  );
}
