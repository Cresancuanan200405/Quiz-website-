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

### Google Sign-In Setup
1. In Supabase Dashboard, go to Authentication -> Providers -> Google and enable it.
2. In Google Cloud Console, create OAuth 2.0 credentials (Web application).
3. Add these Authorized redirect URIs in Google Cloud:
	- `https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`
4. Copy Google Client ID and Client Secret into Supabase Google provider settings.
5. In Supabase Authentication URL settings, add your app URL(s):
	- `http://localhost:3000`
	- your production domain (if deployed)
6. Set the app origin used by the login callback:
	- Set `NEXT_PUBLIC_APP_URL=https://your-production-domain.vercel.app` (or your custom domain) in Vercel Production env.
	- `NEXT_PUBLIC_VERCEL_URL` is used only when `NEXT_PUBLIC_VERCEL_ENV=production` and no app URL override exists.
	- Avoid using preview deployment URLs for OAuth redirect targets.
7. In Supabase Auth, make sure both Site URL and Redirect URLs include your deployed domain as well as localhost for dev.
8. Ensure env vars are present in the app runtime:
	- `NEXT_PUBLIC_SUPABASE_URL`
	- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

After setup, the Google button in the login form redirects to Google OAuth and then back to `/login`, where the app hydrates session and routes to `/dashboard`.

### Notes
- The app uses local state stores for instant UI updates and mirrors profile changes to Supabase.
- Dashboard Fact of the Day uses a live API (`jsph.pl`) with loading and fallback behavior.
