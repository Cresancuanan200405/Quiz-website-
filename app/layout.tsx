import type { Metadata } from "next";
import { DM_Sans, Sora } from "next/font/google";
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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
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
            `,
          }}
        />
      </head>
      <body className="bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300">
        <ThemeHydrator />
        <NotificationCenter />
        {children}
      </body>
    </html>
  );
}
