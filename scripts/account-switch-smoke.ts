type LocalStore = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

const memory = new Map<string, string>();

const localStorageShim: LocalStore = {
  getItem: (key) => (memory.has(key) ? memory.get(key)! : null),
  setItem: (key, value) => {
    memory.set(key, value);
  },
  removeItem: (key) => {
    memory.delete(key);
  },
  clear: () => {
    memory.clear();
  },
};

(globalThis as Record<string, unknown>).window = {
  localStorage: localStorageShim,
  setTimeout,
  clearTimeout,
};
(globalThis as Record<string, unknown>).localStorage = localStorageShim;
(globalThis as Record<string, unknown>).document = { cookie: "" };

const run = async () => {
  const { useAuthStore } = await import("../lib/authStore");
  const { usePlayerStatsStore } = await import("../lib/playerStatsStore");

  const now = Date.now();
  const emailA = `smoke_a_${now}@example.com`;
  const emailB = `smoke_b_${now}@example.com`;
  const password = "SmokePass123!";

  await useAuthStore.getState().register("smokeA", emailA, password);
  await useAuthStore.getState().logout();

  await useAuthStore.getState().register("smokeB", emailB, password);
  await useAuthStore.getState().logout();

  await useAuthStore.getState().login(emailA, password);
  usePlayerStatsStore.setState({
    quizzesCompleted: 5,
    totalCorrectAnswers: 41,
    totalAnsweredQuestions: 50,
    bestStreak: 6,
    totalPoints: 2222,
    quizHistory: [],
  });
  localStorageShim.setItem("quizarena-player-stats", JSON.stringify({ seeded: true }));
  await useAuthStore.getState().logout();

  await useAuthStore.getState().login(emailB, password);

  const statsAfterSwitch = usePlayerStatsStore.getState();
  const persistedAfterSwitch = localStorageShim.getItem("quizarena-player-stats");

  let persistedPoints = 0;
  let persistedQuizzes = 0;
  if (persistedAfterSwitch) {
    try {
      const parsed = JSON.parse(persistedAfterSwitch) as {
        state?: { totalPoints?: number; quizzesCompleted?: number };
      };
      persistedPoints = Number(parsed.state?.totalPoints ?? 0);
      persistedQuizzes = Number(parsed.state?.quizzesCompleted ?? 0);
    } catch {
      persistedPoints = -1;
      persistedQuizzes = -1;
    }
  }

  const passed =
    statsAfterSwitch.totalPoints === 0 &&
    statsAfterSwitch.quizzesCompleted === 0 &&
    statsAfterSwitch.totalAnsweredQuestions === 0 &&
    persistedPoints === 0 &&
    persistedQuizzes === 0;

  console.log(
    JSON.stringify(
      {
        test: "account-switch-isolation",
        passed,
        accountA: emailA,
        accountB: emailB,
        statsAfterSwitch: {
          totalPoints: statsAfterSwitch.totalPoints,
          quizzesCompleted: statsAfterSwitch.quizzesCompleted,
          totalAnsweredQuestions: statsAfterSwitch.totalAnsweredQuestions,
        },
        persistedStatsAfterSwitch: {
          totalPoints: persistedPoints,
          quizzesCompleted: persistedQuizzes,
        },
        persistedAfterSwitch,
      },
      null,
      2
    )
  );
};

run().catch((error) => {
  console.error("account-switch-smoke failed:", error);
  process.exitCode = 1;
});
