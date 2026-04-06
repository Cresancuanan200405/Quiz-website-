## QuizArena Finals

### Local Development
1. Install dependencies:

```bash
npm install
```

2. Create environment file from the scaffold:

```bash
cp .env.example .env.local
```

3. Fill in `.env.local` with your Supabase anon key.

4. Start the app:

```bash
npm run dev
```

### Supabase Wiring
- Browser client is in [lib/supabase/client.ts](lib/supabase/client.ts).
- Profile/avatar persistence helpers are in [lib/supabase/profilePersistence.ts](lib/supabase/profilePersistence.ts).
- Profile edits and avatar changes are persisted into `public.app_user_profiles`.

### Notes
- The app uses local state stores for instant UI updates and mirrors profile changes to Supabase.
- Dashboard Fact of the Day uses a live API (`jsph.pl`) with loading and fallback behavior.
