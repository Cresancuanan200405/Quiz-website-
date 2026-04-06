"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Swords, Trophy } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import CategoryCard from "@/components/CategoryCard";
import FactCard from "@/components/FactCard";
import StatCard from "@/components/StatCard";
import LeaderboardRow from "@/components/LeaderboardRow";
import CategoryPreviewModal from "@/components/CategoryPreviewModal";
import { categoryMeta, currentUser, leaderboardUsers, onlinePlayers } from "@/lib/mockData";

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<(typeof categoryMeta)[0] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [displayShowAllCategories, setDisplayShowAllCategories] = useState(false);

  return (
    <div className="min-h-screen pb-20 dark:bg-[#0A0B14] bg-[#F8F7FF] md:pb-0">
      <Sidebar />
      <TopBar title="Dashboard" />

      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full px-4 py-6 md:ml-[var(--sidebar-width)] md:w-[calc(100%-var(--sidebar-width))] md:px-8"
      >
        <div className="mx-auto w-full max-w-6xl space-y-5">
          <section className="glass rounded-card p-6 dark:from-violet-950/50 from-violet-50">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="mb-1 text-sm text-violet-700 dark:text-violet-200">Welcome back {currentUser.username}</p>
                <h1 className="font-sora text-3xl font-bold dark:text-white text-gray-900">Ready for another streak?</h1>
                <p className="mt-2 max-w-xl text-sm dark:text-white/70 text-gray-600">
                  You&apos;re just 420 points away from breaking into top 5. Keep answering fast to climb.
                </p>
              </div>
              <button
                type="button"
                aria-label="Start quiz"
                onClick={() => {
                  setSelectedCategory(null);
                  setIsModalOpen(false);
                }}
                className="focus-ring arcade-btn btn-primary inline-flex items-center gap-2 rounded-button px-5 py-3 font-medium"
              >
                Start Quiz <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <span className="rounded-full border border-green-400/25 bg-green-500/10 px-3 py-1 text-sm dark:text-green-200 text-green-700">
                Accuracy {currentUser.accuracy}%
              </span>
              <span className="rounded-full border border-blue-400/25 bg-blue-500/10 px-3 py-1 text-sm dark:text-blue-200 text-blue-700">
                Quizzes {currentUser.quizCount}
              </span>
              <span className="rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1 text-sm dark:text-violet-200 text-violet-700">
                Rank #{currentUser.rank}
              </span>
            </div>
          </section>

          <section className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {categoryMeta.slice(0, 4).map((category) => (
                <CategoryCard
                  key={category.name}
                  iconName={category.iconName}
                  name={category.name}
                  difficulty={category.difficulty}
                  color={category.color}
                  active={selectedCategory?.name === category.name}
                  onClick={() => {
                    setSelectedCategory(category);
                    setIsModalOpen(true);
                  }}
                  hideDifficulty={true}
                />
              ))}
            </div>

            <AnimatePresence initial={false} mode="wait">
              {displayShowAllCategories ? (
                <motion.div
                  key="expanded-categories"
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="grid gap-3 overflow-hidden sm:grid-cols-2 lg:grid-cols-4"
                >
                  {categoryMeta.slice(4, 8).map((category) => (
                    <CategoryCard
                      key={category.name}
                      iconName={category.iconName}
                      name={category.name}
                      difficulty={category.difficulty}
                      color={category.color}
                      active={selectedCategory?.name === category.name}
                      onClick={() => {
                        setSelectedCategory(category);
                        setIsModalOpen(true);
                      }}
                      hideDifficulty={true}
                    />
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setDisplayShowAllCategories((value) => !value)}
                className="focus-ring text-sm font-medium text-violet-700 transition-colors duration-150 hover:text-violet-600 dark:text-violet-200 dark:hover:text-violet-100"
              >
                {displayShowAllCategories ? "Show Less Categories" : "View All Categories"}
              </button>
            </div>
          </section>

          <section className="grid items-start gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard label="Accuracy" value={`${currentUser.accuracy}%`} tone="green" icon={<ShieldCheck className="h-4 w-4" />} />
              <StatCard label="Streak" value={`${currentUser.streak}`} tone="amber" icon={<Trophy className="h-4 w-4" />} />
              <StatCard label="Quizzes" value={`${currentUser.quizCount}`} tone="blue" icon={<ArrowRight className="h-4 w-4" />} />
            </div>
            <div className="glass rounded-card p-4 dark:bg-white/5 bg-gray-50 dark:border-white/10 border-gray-100">
              <div className="mb-2 flex items-center justify-between text-sm dark:text-white/70 text-gray-600">
                <p>Weekly Goal</p>
                <p>{currentUser.weeklyGoal}%</p>
              </div>
              <div className="h-3 overflow-hidden rounded-full dark:bg-white/10 bg-black/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${currentUser.weeklyGoal}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-green-400"
                />
              </div>
            </div>
          </div>

          <article className="glass rounded-card p-5 dark:bg-white/5 bg-white dark:border-white/10 border-gray-100 dark:shadow-none shadow-sm hover:shadow-md">
            <p className="mb-4 font-sora text-lg font-semibold dark:text-white text-gray-900">1v1 Quick Start</p>
            <div className="mb-4 grid grid-cols-3 items-center text-center">
              <div className="grid place-items-center gap-2">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-violet-500/20 font-semibold text-violet-700 dark:text-violet-200">
                  {currentUser.avatar}
                </span>
                <span className="text-xs dark:text-white/70 text-gray-600">You</span>
              </div>
              <span className="font-sora text-2xl font-bold text-violet-700 dark:text-violet-300">VS</span>
              <div className="grid place-items-center gap-2">
                <span className="grid h-12 w-12 place-items-center rounded-full dark:bg-white/10 bg-black/5 font-semibold dark:text-white/70 text-gray-600">?</span>
                <span className="text-xs dark:text-white/70 text-gray-600">Opponent</span>
              </div>
            </div>
            <p className="mb-4 text-sm dark:text-white/70 text-gray-600">{onlinePlayers.toLocaleString()} players online now.</p>
            <Link
              href="/battle"
              className="focus-ring arcade-btn btn-success inline-flex items-center gap-2 rounded-button px-4 py-2 text-sm font-medium"
            >
              <Swords className="h-4 w-4" /> Find Opponent
            </Link>
          </article>
        </section>

          <section className="grid items-start gap-4 lg:grid-cols-2">
          <article className="glass rounded-card p-4 dark:bg-white/5 bg-white dark:border-white/10 border-gray-100 dark:shadow-none shadow-sm hover:shadow-md">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-sora text-lg font-semibold dark:text-white text-gray-900">Leaderboard Preview</p>
              <Link href="/leaderboard" className="text-sm text-violet-700 hover:text-violet-600 dark:text-violet-200 dark:hover:text-violet-100">
                See all
              </Link>
            </div>
            <div className="space-y-2 overflow-x-auto">
              {leaderboardUsers.slice(0, 5).map((user, index) => (
                <LeaderboardRow
                  key={user.id}
                  user={{ ...user, rank: index + 1 }}
                  highlight={user.username === currentUser.username}
                  index={index}
                />
              ))}
            </div>
          </article>

          <FactCard dynamic featured />
            </section>
        </div>
      </motion.main>

      <CategoryPreviewModal
        isOpen={isModalOpen}
        category={selectedCategory}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCategory(null);
        }}
        onCategoryChange={(category) => {
          setSelectedCategory(category);
        }}
      />
    </div>
  );
}
