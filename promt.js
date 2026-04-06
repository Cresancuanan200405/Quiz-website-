/*
Generate a complete modern Next.js web app for a Quiz & Trivia Platform with the following features:

GENERAL REQUIREMENTS:
- Use Next.js 14+ (app directory)
- Tailwind CSS for styling
- Modern, clean, minimal UI inspired by Duolingo, Kahoot, Notion dashboards
- Reusable components (buttons, cards, modals, headers, navbars)
- Responsive design (desktop-first)
- Include animations and interactive hover/focus states
- Structure code for scalability (components, pages, API routes)
- Include placeholder data for users, quizzes, trivia facts, and 1v1 matches
- Use React hooks for state management
- Optional: use Zustand or Context API for global state if needed

NAVIGATION & PAGES:
- Left Sidebar: Dashboard, Play Quiz, 1v1 Battle, Leaderboard, Trivia Hub, Profile
- Top Header: User info, score, avatar

1. Dashboard Page
  - Header: username, avatar, rank, total score
  - “Start Quiz” button
  - Category cards: Science, History, Tech, Random
  - 1v1 Battle section with “Find Opponent” button
  - Leaderboard preview (Top 5 users)
  - Fact of the Day card with “Explore More” button
  - Personal stats: accuracy, quizzes taken, streak
  - Make card-based layout with subtle shadows and hover effects

2. Play Quiz Page
  - Centered question card
  - Four large clickable answer buttons
  - Top progress bar
  - Score and streak indicators
  - Timer in top-right corner
  - Show correct/wrong feedback (green/red) on selection
  - Smooth transition to next question

3. Result Page
  - Large score display
  - Accuracy percentage
  - Rank change (e.g., #20 → #12)
  - Performance insights
  - Buttons: Play Again, Try Another Quiz, View Leaderboard

4. Leaderboard Page
  - Tabs: Global, Daily, Weekly
  - Table with Rank, Username, Score, Accuracy
  - Highlight current user row

5. Trivia Hub
  - Featured Fact of the Day
  - Category filter buttons
  - Scrollable fact cards with Like, Save, Next buttons
  - Infinite feed layout (like social feed)
  - Use card-based design with hover effects

6. Profile Page
  - User avatar and username
  - Rank, total score
  - Stats: accuracy, quizzes taken, best score
  - Quiz history list
  - Saved facts section

7. 1v1 Battle Page
  - Matchmaking screen: “Finding opponent...”
  - Match found screen: show opponent avatar/name
  - Battle quiz interface (similar to quiz page)
  - Result comparison: your score vs opponent score, winner highlight, rematch button

COMPONENTS:
- Navbar.tsx (sidebar)
- Header.tsx
- DashboardCard.tsx
- QuizCard.tsx
- QuestionCard.tsx
- ResultCard.tsx
- LeaderboardTable.tsx
- FactCard.tsx
- StatsCard.tsx
- 1v1MatchCard.tsx

API ROUTES (use /app/api/ structure):
- /api/quizzes → fetch quizzes
- /api/questions → fetch questions
- /api/facts → fetch trivia facts
- /api/users → fetch user info and scores
- /api/matches → handle 1v1 matchmaking and results

STYLING:
- Tailwind CSS utility classes
- Rounded corners (12-16px)
- Soft shadows
- Hover effects and transition animations
- Card layouts for quizzes, facts, and leaderboard

STATE MANAGEMENT:
- Use React hooks or Context API/Zustand for global user state, scores, quiz progress, and 1v1 match state

OUTPUT:
- Provide the full code for pages, components, and API placeholders
- Include modern, clean UI layout inspired by popular quiz/learning platforms
- Use placeholder images for avatars and placeholder data for quizzes, trivia, and users
- Make code copy-paste ready for a freshly created Next.js app
*/