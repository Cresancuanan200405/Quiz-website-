/*
You are a senior full-stack Next.js developer and UI/UX designer. Build a complete, fully functional "QuizArena" — a gamified Quiz, Trivia & 1v1 Battle Platform using Next.js 14 (App Router), TypeScript, and Tailwind CSS.

## TECH STACK
- Next.js 14 with App Router
- TypeScript (strict mode)
- Tailwind CSS (with tailwind.config.ts customizations)
- Framer Motion for animations
- Lucide React for icons
- No external database — use local state + mock data

## DESIGN DIRECTION — "Dark Arcade Premium"
Aesthetic: Dark-mode first. Deep navy/slate backgrounds. Electric violet (#7C3AED) as primary. Neon green (#22C55E) for success. Rose red (#EF4444) for errors. Amber (#F59E0B) for streaks.
- Font: `Sora` (headings) + `DM Sans` (body) from Google Fonts
- Cards: glassmorphism with `backdrop-blur`, subtle `border border-white/10`, layered box-shadows
- Hover effects: lift + glow + border color shift on all interactive elements
- Active states: scale(0.97) press effect on buttons
- Shadows: deep colored drop shadows matching element color (e.g., violet glow on primary buttons)
- Background: layered gradient mesh with radial glows, subtle noise texture overlay
- Transitions: 200ms ease on all interactive elements, 400ms on page transitions
- Rounded corners: 12px cards, 10px buttons, 999px pills

## FILE STRUCTURE
Create these files:


app/
layout.tsx          — root layout with Sora + DM Sans fonts, dark bg
page.tsx            — Dashboard (main hub)
quiz/page.tsx       — Quiz Interface
battle/page.tsx     — 1v1 Battle Mode
leaderboard/page.tsx — Leaderboard
trivia/page.tsx     — Trivia Hub
profile/page.tsx    — Profile Page
results/page.tsx    — Results Screen
components/
Sidebar.tsx         — Left nav sidebar
TopBar.tsx          — Top header
CategoryCard.tsx    — Reusable category card
StatCard.tsx        — Reusable stat card
LeaderboardRow.tsx  — Reusable LB row
AnswerButton.tsx    — Quiz answer button with states
FactCard.tsx        — Trivia fact card
BattleArena.tsx     — Battle matchmaking + quiz + results
ProgressRing.tsx    — SVG circular progress indicator
Timer.tsx           — Countdown timer with color states
lib/
mockData.ts         — All mock data (questions, users, facts, leaderboard)
types.ts            — All TypeScript interfaces
utils.ts            — Score calculation, formatters

## COMPONENT SPECS

### Sidebar.tsx
- Fixed left sidebar, 240px wide on desktop
- Logo at top: lightning bolt icon + "QuizArena" in Sora bold
- Nav items: Dashboard, Play Quiz, 1v1 Battle, Leaderboard, Trivia Hub, Profile
- Each nav item: icon (Lucide) + label, hover: bg-white/5 + left accent bar in violet
- Active item: bg-violet-500/15 + border-l-2 border-violet-400 + text-violet-300
- Bottom: user avatar + username + rank badge + points pill
- Mobile: hidden, replaced by bottom tab bar
- Smooth active state transitions

### TopBar.tsx
- Sticky top, height 60px, backdrop-blur bg
- Left: page title (dynamic)
- Right: streak badge (flame icon + count, amber), points badge (violet), notification bell, user avatar
- Subtle border-bottom: border-white/5

### Dashboard (app/page.tsx)
State: useState for active category, loading states
Layout:
1. Hero banner — gradient mesh card, "Welcome back {name}" heading, subtitle showing progress to next rank, large "Start Quiz" CTA button with violet glow shadow + arrow icon, 3 stat pills (accuracy, quizzes, rank)
2. Category grid — 2x2 grid of CategoryCard: icon (emoji), name, question count, difficulty pill, hover: translateY(-4px) + colored glow shadow matching category color
3. Two-column section:
   - Left: Stats panel — 3 StatCards (accuracy with green, streak with amber, quizzes with blue), weekly goal progress bar with animated fill
   - Right: 1v1 Battle quick-start — VS card showing user avatar vs "?" opponent, online player count, "Find Opponent" button in green
4. Two-column section:
   - Left: Leaderboard preview — top 5 rows with medal emojis for top 3, current user highlighted
   - Right: Fact of the Day — amber accent card, fact text, like/save/next buttons

### Quiz Interface (app/quiz/page.tsx)
State: 
- questions: Question[] (10 from mockData)
- currentIndex: number
- selectedAnswer: string | null
- isRevealed: boolean
- score: number
- streak: number
- timeLeft: number (useInterval countdown from 15)
- answers: AnswerRecord[]

Layout (centered, max-w-2xl):
- Top bar: progress bar (animated fill, violet), question counter, streak pill, score pill, Timer component
- Question card: glassmorphism card, category badge, question text in Sora 20px
- 4 AnswerButton components in 2x2 grid:
  - Default: border border-white/15 bg-white/5 hover:bg-white/10 hover:border-violet-400 hover:shadow-lg hover:shadow-violet-500/20 hover:translateY(-2px)
  - Selected + Correct: bg-green-500/20 border-green-400 text-green-300 shadow-green-500/30
  - Selected + Incorrect: bg-red-500/20 border-red-400 text-red-300 shadow-red-500/30
  - Other (after reveal): opacity-40
  - Each has a letter badge (A/B/C/D) + answer text
- Feedback banner (slides up after answer): correct = green with explanation, wrong = red with correct answer shown
- Next button (appears after answer): violet primary button

Timer component:
- Circular SVG ring, color changes: green (>8s) → amber (4-8s) → red (<4s)
- Pulses red when <4s (CSS animation)
- Auto-advances to next question at 0

### Results Screen (app/results/page.tsx)
Props via searchParams: score, total, category, timeTaken
State: animate numbers on mount (useEffect counter animation)

Layout (centered):
- Confetti burst animation on load (CSS keyframes, colored squares falling)
- Large score display with ProgressRing SVG (animated stroke-dashoffset on mount)
- Accuracy percentage animated count-up
- Rank change row: old rank → new rank with green arrow + "+N ranks" badge
- Performance grid: 4 metrics (correct, streak, avg time, points earned)
- 3 CTA buttons: Play Again (primary violet), Try Another Quiz (outlined), View Leaderboard (ghost)

### Leaderboard (app/leaderboard/page.tsx)
State: activeTab ('global' | 'daily' | 'weekly'), hoveredRow

Layout:
- Tab switcher with sliding indicator (Framer Motion layoutId)
- Table rows with:
  - Rank number (🥇🥈🥉 for top 3)
  - Avatar circle + username + quiz count
  - Score (bold)
  - Accuracy with mini horizontal bar
  - Tier badge (Legendary/Expert/Pro/Rising)
- Current user row: violet-tinted bg, sticky highlight
- Hover: translateX(4px) + bg-white/5 + shadow
- Animated entry: staggered fade-in-up on tab change

### Trivia Hub (app/trivia/page.tsx)
State: activeFilter, likedFacts: Set<string>, savedFacts: Set<string>, currentFactIndex

Layout:
- Filter chips row: All / Science / History / Tech / Nature / Arts
  - Active chip: bg-violet-500 text-white shadow-violet-500/40
  - Hover: border-violet-400
- Featured card (first, larger): amber left border accent, "Today's Pick" badge, title, body text, action row
- Fact cards feed: scrollable list
  - Each card: glassmorphism, category badge, fact title, fact body
  - Like button: toggles filled heart, color flip to rose-500, count bump
  - Save button: toggles filled bookmark, color flip to violet-400
  - Next button: shifts to next fact
- Smooth card entry animations (Framer Motion)

### Profile (app/profile/page.tsx)
State: activeTab ('stats' | 'history' | 'saved')

Layout:
- Profile hero: large avatar with violet ring border, username, handle, join date, badges row, total points with star icon
- Tab switcher for Stats / History / Saved
- Stats tab: 2x3 grid of metric cards
- History tab: list of past quizzes with category icon, name, date, score badge
- Saved tab: list of saved facts

### 1v1 Battle (app/battle/page.tsx)
State machine: 'idle' | 'searching' | 'found' | 'countdown' | 'playing' | 'finished'

Screens (conditional render):
1. Idle: description of battle mode, "Find Opponent" CTA
2. Searching: spinning ring animation (CSS), "Finding opponent..." text, pulsing dots, cancel button
3. Found: both avatars slide in from sides, VS badge pops in, opponent name + rank, "Battle starts in 3..." countdown
4. Playing: same as Quiz but with dual progress bars at top (you vs opponent color coded violet vs orange), live score tickers
5. Finished: 
   - Winner/Loser banner with animation
   - Side-by-side comparison: avatar, score, accuracy
   - Horizontal comparison bar (violet for you, orange for opponent)
   - Rematch + New Opponent buttons

## MOCK DATA (lib/mockData.ts)
Export:
- 30 questions across categories: { id, category, difficulty, question, options: string[4], correctAnswer: string, explanation }
- 20 users for leaderboard: { id, username, avatar (initials), score, accuracy, quizCount, rank, tier }
- 15 trivia facts: { id, category, title, body, likes }
- currentUser object matching user shape + quizHistory array

## TAILWIND CONFIG
Extend with:
- Custom shadow utilities: shadow-violet-glow, shadow-green-glow, shadow-red-glow
- Custom animation: 'float' (translateY oscillation), 'pulse-glow', 'count-up'
- Font families: sora, dm-sans
- Custom colors matching the palette above

## GLOBAL STYLES (app/globals.css)
- Dark background: #0A0B14 (near black with slight blue tint)
- Noise texture overlay using SVG data URI on ::before pseudo on body
- Radial gradient glow spots: violet top-left, blue bottom-right, very subtle
- Scrollbar styling: thin, dark with violet thumb
- Selection color: violet

## KEY INTERACTIONS TO IMPLEMENT
1. Answer button click → immediate visual state → 600ms delay → reveal all → show feedback → Next button appears
2. Timer reaches 0 → auto-mark as wrong → advance
3. Leaderboard tab switch → staggered row re-animation
4. Like/Save on trivia → optimistic UI toggle with scale animation
5. Battle state machine transitions with Framer Motion AnimatePresence
6. All page transitions: fade + slight translateY via layout animation

## ACCESSIBILITY
- All buttons have aria-labels
- Focus rings visible (violet outline)
- Keyboard navigable quiz (1/2/3/4 keys for answers, Enter to advance)
- Reduced motion: respect prefers-reduced-motion

## ROUTING
Use Next.js Link for all navigation. Active route detection via usePathname() in Sidebar.
After quiz completion → router.push('/results?score=X&total=10&category=Y')

## IMPORTANT NOTES
- All pages must be fully functional with working state — no placeholder-only components
- Use 'use client' where needed for interactivity
- Keep all mock data realistic and varied
- Every hover, active, and focus state must be implemented
- No external API calls — everything runs locally
- The app must work by running `npm run dev` with zero errors

Generate all files completely with full code, no truncation, no "// ... rest of code" shortcuts. Start with: tailwind.config.ts → lib/types.ts → lib/mockData.ts → lib/utils.ts → app/globals.css → app/layout.tsx → components/ (all) → app/ pages (all).
*/