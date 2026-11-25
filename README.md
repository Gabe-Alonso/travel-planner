# Wayfarers: plan trips with friends

A Next.js + Supabase web app for planning group trips:

- **Sign in** with Google, Facebook, or email and password (Supabase Auth). Every page except login needs you to be signed in.
- **Home page** lists your trips. Anyone can create a trip, and the creator becomes the trip's **👑 Group Leader**.
- **Invite links**: share `/invite/<code>` and anyone who opens it and signs in joins the trip.
- **Vote** on the destination. As you type a city name, a dropdown suggests matches (Open-Meteo geocoding), and each option gets a Wikipedia photo. Voters' profile pictures appear next to the option they picked, and a countdown runs to the leader's deadline. When the timer ends, the option with the most votes wins automatically; if there's a tie, the leader picks.
- **Places** to go and **Housing** options: paste a link (Airbnb, Booking.com, a hotel site, Google Maps…) and the app pulls in the listing's thumbnail and title. Click a card to open the listing.
- **Settings** (Group Leaders only): edit trip details, set or extend the voting deadline, override the chosen destination or reopen voting, promote/demote/remove members, reset the invite link, and delete the trip.
- Votes and lists update live (Supabase Realtime).

## Tech

- Next.js 16 (App Router, `src/proxy.ts` for auth redirects), React 19, Tailwind CSS v4
- Supabase: Auth, Postgres with row-level security, Realtime
- No API keys needed for city search (Open-Meteo) or city photos (Wikipedia)

## Setup

### 1. Supabase project

1. Create a project at <https://supabase.com/dashboard>.
2. Open **SQL Editor → New query**, paste all of [`supabase/schema.sql`](supabase/schema.sql), and click **Run**.
3. Copy the **Project URL** (Project Settings → Data API) and the **publishable key** (`sb_publishable_…`, Project Settings → API Keys). Do not use the legacy `anon` key or any secret key.

### 2. Run locally

```bash
cp .env.example .env.local   # then fill in the two values
npm install
npm run dev                  # http://localhost:3000
```

### 3. Auth providers (Supabase → Authentication)

**URL Configuration**

- Site URL: your Vercel URL, e.g. `https://your-app.vercel.app`
- Redirect URLs: add `https://your-app.vercel.app/**` and `http://localhost:3000/**`

**Google** (Authentication → Sign In / Providers → Google)

1. In Google Cloud Console → *APIs & Services → Credentials*, create an **OAuth client ID** of type *Web application*. You'll also need to fill in the OAuth consent screen once.
2. Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`. Supabase shows this exact URL on the Google provider page.
3. Paste the Client ID and Client Secret into Supabase and enable the provider.

**Facebook** (Authentication → Sign In / Providers → Facebook)

1. At <https://developers.facebook.com>, create an app with the *Authenticate and request data from users with Facebook Login* use case.
2. Under Facebook Login → Settings, add the same Supabase callback URL as a *Valid OAuth Redirect URI*.
3. Paste the App ID and App Secret into Supabase and enable the provider. Make sure the `email` permission is enabled, and switch the app to **Live** mode so friends can use it.

**Email**: enabled by default. By default Supabase asks new users to confirm their email address. Its built-in mailer is heavily rate-limited, so for real use either set up custom SMTP (Authentication → Emails) or turn off "Confirm email".

### 4. Deploy to Vercel

1. Import this GitHub repo at <https://vercel.com/new>. The framework is detected as Next.js.
2. Add the environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Deploy, then put the production URL into Supabase's Site URL and Redirect URLs (step 3).

## Project layout

```
supabase/schema.sql              tables, RLS policies, RPCs, triggers, realtime
src/proxy.ts                     redirects signed-out visitors to /login
src/lib/supabase/                browser / server / proxy Supabase clients
src/lib/data.ts                  server data loaders (trip context, profile)
src/app/login/                   sign-in page (Google, Facebook, email)
src/app/auth/                    OAuth callback, email confirm, sign-out
src/app/(app)/page.tsx           home: your trips
src/app/(app)/invite/[code]/     join a trip from an invite link
src/app/(app)/trips/[tripId]/    vote · places · housing · members · settings
src/app/api/link-preview/        fetches thumbnails/titles for pasted links
src/app/api/city-image/          finds a photo for a city via Wikipedia
```
