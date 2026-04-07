/* 
You are a senior full-stack Next.js developer and UI/UX designer working on the existing "QuizArena" platform. Your task is to add three specific features to the existing codebase: a Landing/Login Page, a Light/Dark mode toggle, and a Collapsible Sidebar.

## CONTEXT
This is an existing Next.js 14 (App Router) + TypeScript + Tailwind CSS + Framer Motion project. The design system uses:
- Fonts: Sora (headings) + DM Sans (body)
- Primary: violet (#7C3AED), Success: green (#22C55E), Error: red (#EF4444), Streak: amber (#F59E0B)
- Dark bg: #0A0B14, Cards: glassmorphism with backdrop-blur + border-white/10
- Existing components: Sidebar.tsx, TopBar.tsx, and all page files already exist

Do NOT rewrite existing pages. Only create new files and modify the specific files listed below.

---

## FEATURE 1: LANDING + LOGIN PAGE

### File: app/(auth)/login/page.tsx (new file)
### File: app/(auth)/layout.tsx (new file — no sidebar/topbar)
### File: components/auth/LoginForm.tsx (new file)
### File: components/auth/SocialButton.tsx (new file)
### Modify: middleware.ts (create if not exists — redirect unauthenticated users to /login)
### Modify: lib/authStore.ts (new file — Zustand store for auth state)

### LANDING PAGE DESIGN — "Hero + Auth Combined"

The login page IS the landing page. It is a full-screen split-layout:

LEFT PANEL (60% width on desktop, full width on mobile):
This is the marketing/hero side. Make it visually spectacular:

Background:
- Deep dark bg (#0A0B14) with animated gradient mesh
- 3 large radial glow orbs (violet, blue, indigo) that slowly float using CSS keyframe animation (8-12s loops, different directions per orb)
- Subtle noise texture overlay (SVG data URI)
- Decorative grid lines (very faint, 1px, white/3 opacity) like a graph paper background

Hero content (vertically centered, left-aligned, max-w-lg, px-16):
1. Top badge: small pill with lightning icon + "Now in Beta — Join 50,000+ players" — subtle violet border, glassmorphism bg
2. Main heading (Sora, 56px, line-height 1.1):
   Line 1: "Quiz. Battle." in white
   Line 2: "Dominate." in violet with animated gradient shimmer effect (background-clip: text, moving gradient animation)
3. Subheading (DM Sans, 18px, text-white/60, max-w-sm):
   "Challenge your mind. Crush your rivals. Climb the global leaderboard."
4. Feature highlights row (3 items inline):
   Each: small icon (Lucide) + short label
   - ⚡ 10,000+ Questions
   - 🏆 Live 1v1 Battles  
   - 🌍 Global Leaderboard
   Style: glassmorphism pill cards, border-white/10, hover: border-violet-400/50
5. Social proof strip (bottom of left panel):
   - Row of 5 small avatar circles (overlapping, -ml-2) in different colors with initials
   - "Join 50,247 players competing today" text
   - 5 gold star icons
   - Rating: "4.9/5 from 12k reviews"

Floating UI preview cards (positioned absolute, decorative, pointer-events-none):
- Card 1 (top-right area of left panel): mini leaderboard preview card — glassmorphism, shows top 3 users with scores, subtle violet glow
- Card 2 (bottom-left area): mini stat card — "Your streak: 🔥 14 days" — amber glow
- Card 3 (middle-right, slightly overlapping border): quiz question preview — shows a mini question with answer options, one highlighted green
- These cards have subtle float animations (translateY oscillation, different timing each)
- On mobile: hide these decorative cards

RIGHT PANEL (40% width on desktop, full width on mobile):
Clean auth panel, slightly lighter dark bg (#0F1020):
- Border-left: 1px border-white/5 (desktop only)
- Vertically and horizontally centered content
- Max-w-sm, padding 40px

Auth panel content:
1. Logo mark: lightning bolt icon (violet, 28px) + "QuizArena" in Sora bold 22px
2. Heading: "Welcome back" (Sora, 28px) on login, "Create your account" on register
3. Subtext: "Don't have an account? Sign up →" (clickable, toggle between login/register views)

Social login buttons (SocialButton.tsx):
- "Continue with Google" — white icon, border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/30 hover:shadow-lg transition-all
- "Continue with Discord" — indigo tint, same hover pattern
- "Continue with GitHub" — neutral, same hover pattern
- Each button: 44px height, rounded-xl, flex items-center gap-3, logo SVG on left, text centered, full width
- Hover: translateY(-1px) + box-shadow lift

Divider: "or continue with email" — horizontal lines + text, border-white/10 color

Email/Password form (LoginForm.tsx):
Fields:
- Email input: bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30
  Focus: border-violet-500 shadow-violet-500/20 shadow-lg outline-none ring-0
  Left icon: Mail icon (Lucide, white/40)
- Password input: same styling
  Left icon: Lock icon
  Right: eye toggle button (show/hide password) with smooth icon swap
- "Forgot password?" link — right-aligned, violet-400 text, hover: violet-300

Submit button:
- Full width, 48px height, rounded-xl
- Gradient: bg-gradient-to-r from-violet-600 to-indigo-600
- Hover: from-violet-500 to-indigo-500 + translateY(-1px) + shadow-xl shadow-violet-500/40
- Active: scale(0.98)
- Loading state: spinner icon + "Signing in..." text, pointer-events-none, opacity-80
- Framer Motion: whileHover, whileTap

Toggle to Register view:
- Smoothly animate between Login and Register with Framer Motion AnimatePresence + height transition
- Register adds: Username field (with User icon) + Confirm Password field
- Terms checkbox: "I agree to Terms of Service and Privacy Policy" — custom styled checkbox (violet accent)
- CTA changes to "Create Account"

Form validation (real-time):
- Email: valid format check, red border + error message below on blur
- Password: min 8 chars, show strength indicator bar (4 segments: weak/fair/good/strong, colors: red/amber/blue/green)
- Confirm password: match check
- All errors: slide-down animation, text-red-400 text-xs mt-1

Success state (mock — no real auth):
- On submit: 800ms loading → transition to success micro-animation
- Green checkmark circle animation (SVG stroke animation)
- "Welcome to QuizArena!" text
- Auto redirect to /dashboard after 1200ms using router.push

Mobile layout:
- Stack vertically: hero content collapses to compact top section (logo + tagline only, no floating cards)
- Auth form takes full screen below
- Or: show only the auth panel, hide left panel entirely on screens < 768px

### Auth State (lib/authStore.ts):
Use Zustand:
```typescript
interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithSocial: (provider: 'google' | 'discord' | 'github') => void
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
}
```
Mock login: any email + password with 8+ chars succeeds, sets user to currentUser from mockData
Persist to localStorage via Zustand persist middleware

### Middleware (middleware.ts):
Protect all routes except /login. Redirect to /login if not authenticated.
After login redirect to /dashboard (which is app/page.tsx).

---

## FEATURE 2: LIGHT / DARK MODE TOGGLE

### Modify: app/layout.tsx
### Modify: tailwind.config.ts
### New file: lib/themeStore.ts
### New file: components/ThemeToggle.tsx
### Modify: components/TopBar.tsx (add toggle)
### Modify: app/globals.css (add light mode CSS variables)

### Implementation:

tailwind.config.ts:
Set darkMode: 'class' — this enables class-based dark mode toggling.

lib/themeStore.ts (Zustand):
```typescript
interface ThemeState {
  theme: 'dark' | 'light'
  toggleTheme: () => void
  setTheme: (theme: 'dark' | 'light') => void
}
```
Persist to localStorage. On hydration, apply class to document.documentElement.

app/globals.css — define CSS variables for both modes:

:root (light mode defaults):
--bg-primary: #F8F7FF
--bg-secondary: #FFFFFF
--bg-card: rgba(255,255,255,0.8)
--border-color: rgba(0,0,0,0.08)
--text-primary: #0A0B14
--text-secondary: #4B5563
--text-muted: #9CA3AF
--shadow-color: rgba(124,58,237,0.1)

.dark:
--bg-primary: #0A0B14
--bg-secondary: #0F1020
--bg-card: rgba(255,255,255,0.04)
--border-color: rgba(255,255,255,0.08)
--text-primary: #FFFFFF
--text-secondary: rgba(255,255,255,0.7)
--text-muted: rgba(255,255,255,0.4)
--shadow-color: rgba(124,58,237,0.25)

Light mode design adjustments (apply using CSS variable approach + Tailwind dark: prefix):
- Background: soft lavender-tinted white (#F8F7FF) not stark white
- Cards: white with subtle shadow (0 2px 20px rgba(0,0,0,0.06)) instead of glassmorphism
- Borders: light gray (black/8) instead of white/10
- Text: near-black for primary, gray-600 for secondary
- Sidebar: white bg with right border shadow
- TopBar: white/95 backdrop blur
- Buttons: keep violet primary — it works in both modes
- Radial glow orbs on dashboard hero: reduce opacity in light mode
- Noise texture: remove or reduce in light mode

ThemeToggle.tsx component:
- Pill-shaped toggle button (not just an icon — make it a proper toggle pill)
- Width: 64px, Height: 32px
- Dark mode: dark bg with star/moon icon on the right (white)
- Light mode: light bg with sun icon on the left (amber)
- Sliding indicator: small circle that moves left↔right (Framer Motion spring animation)
- Framer Motion: layout animation on the sliding dot, AnimatePresence for icon swap
- The toggle itself: rounded-full, border border-white/10 (dark) or border-black/10 (light), cursor-pointer
- Hover: scale(1.05)

Add ThemeToggle to TopBar.tsx — place it between notification bell and user avatar.

app/layout.tsx:
- On mount (useEffect), read from themeStore and apply 'dark' or 'light' class to html element
- Wrap in ThemeProvider pattern or just apply directly
- Prevent flash of wrong theme: inline script in <head> to set class before render:
```html
<script dangerouslySetInnerHTML={{ __html: `
  try {
    const theme = JSON.parse(localStorage.getItem('theme-store') || '{}')?.state?.theme || 'dark';
    document.documentElement.classList.toggle('dark', theme === 'dark');
  } catch(e) { document.documentElement.classList.add('dark'); }
`}} />
```

Update ALL existing components to use dark: prefix variants so they adapt:
For each component, add light mode equivalents:
- bg-white/5 → bg-black/5 in light (or just use CSS var)
- text-white → text-gray-900 in light (use dark:text-white pattern)
- border-white/10 → border-black/8 in light
- Sidebar active item: dark:bg-violet-500/15 light:bg-violet-50
- Cards: dark:bg-white/5 light:bg-white light:shadow-md

---

## FEATURE 3: COLLAPSIBLE SIDEBAR

### Modify: components/Sidebar.tsx
### Modify: lib/sidebarStore.ts (new file)
### Modify: app/layout.tsx (adjust main content margin)

### Implementation:

lib/sidebarStore.ts (Zustand):
```typescript
interface SidebarState {
  isCollapsed: boolean
  toggleSidebar: () => void
  setCollapsed: (v: boolean) => void
}
```
Persist to localStorage.

Sidebar.tsx — Two states: expanded (240px) and collapsed (64px):

Expanded state (default, isCollapsed = false):
- Width: 240px
- Show: logo text + nav labels + user info section
- All existing content visible

Collapsed state (isCollapsed = true):
- Width: 64px
- Show: only icons (centered), no text
- Logo: only the lightning bolt icon (centered)
- Nav items: only Lucide icons (centered), no labels
  - Show tooltip on hover: absolutely positioned label pill to the right of the icon
  - Tooltip: bg-gray-900 dark / bg-white light, text, rounded-lg, shadow-xl, px-3 py-1.5, font-size 13px
  - Animate tooltip: opacity 0→1 + translateX(-4px→0) on hover
- User section: only avatar circle (centered), no name/rank/points
- Toggle button still visible

Toggle button:
- Position: absolute, right: -12px, top: 50% (vertically centered on sidebar)
- Style: small circle button, 24px diameter, bg matches card color, border border-white/10, shadow-md
- Icon: ChevronLeft (expanded) / ChevronRight (collapsed) — Lucide, 14px
- Hover: scale(1.1) + shadow-lg + border-violet-400
- On click: toggleSidebar()
- Also: add a keyboard shortcut — Ctrl+B toggles sidebar (document event listener in useEffect)

Framer Motion animation on Sidebar:
```typescript
<motion.aside
  animate={{ width: isCollapsed ? 64 : 240 }}
  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
>
```

Nav item in collapsed state:
```typescript
// Show only icon when collapsed, full item when expanded
<Link className="nav-item">
  <Icon size={18} className="flex-shrink-0" />
  <AnimatePresence>
    {!isCollapsed && (
      <motion.span
        initial={{ opacity: 0, width: 0 }}
        animate={{ opacity: 1, width: 'auto' }}
        exit={{ opacity: 0, width: 0 }}
        transition={{ duration: 0.2 }}
      >
        {label}
      </motion.span>
    )}
  </AnimatePresence>
  {isCollapsed && <CollapsedTooltip label={label} />}
</Link>
```

Main content area (app/layout.tsx):
Adjust margin-left dynamically based on sidebar state:
```typescript
<motion.main
  animate={{ marginLeft: isCollapsed ? 64 : 240 }}
  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
  className="flex-1 min-h-screen"
>
```

Mobile behavior (< 768px):
- Sidebar is hidden off-screen by default (translateX(-100%))
- Hamburger menu button in TopBar (visible only on mobile)
- Tap hamburger → sidebar slides in as overlay (fixed position, z-50)
- Dark overlay behind sidebar (bg-black/60) — tap to close
- No collapsed state on mobile — always full width (240px) when open

---

## SUMMARY OF FILES TO CREATE/MODIFY

CREATE (new files):
- app/(auth)/layout.tsx
- app/(auth)/login/page.tsx
- components/auth/LoginForm.tsx
- components/auth/SocialButton.tsx
- components/ThemeToggle.tsx
- lib/authStore.ts
- lib/themeStore.ts
- lib/sidebarStore.ts
- middleware.ts

MODIFY (existing files — surgical edits only):
- app/layout.tsx — add theme script, adjust sidebar margin animation
- app/globals.css — add light mode CSS variables
- tailwind.config.ts — add darkMode: 'class'
- components/Sidebar.tsx — add collapse logic + Framer Motion width animation
- components/TopBar.tsx — add ThemeToggle + mobile hamburger

---

## IMPORTANT CONSTRAINTS
- Do NOT rewrite existing page files (dashboard, quiz, battle, etc.) — only add dark: prefix variants where needed as a separate pass
- All new components must match existing design system exactly (same fonts, same violet primary, same glassmorphism card style)
- The login page floating cards must use the EXACT same card styling as the rest of the app
- Zustand must be the state management for auth, theme, and sidebar (already installed or run: npm install zustand)
- No breaking changes to existing routing or component interfaces
- TypeScript strict — no 'any' types
- All animations must respect prefers-reduced-motion

Generate all new files completely with full code. For modified files, show the complete updated file. Start with: middleware.ts → lib/authStore.ts → lib/themeStore.ts → lib/sidebarStore.ts → app/(auth)/layout.tsx → app/(auth)/login/page.tsx → components/auth/SocialButton.tsx → components/auth/LoginForm.tsx → components/ThemeToggle.tsx → components/Sidebar.tsx (modified) → components/TopBar.tsx (modified) → app/layout.tsx (modified) → app/globals.css (modified) → tailwind.config.ts (modified).

*/