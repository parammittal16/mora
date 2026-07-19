# MORA

MORA is a Next.js portfolio application backed by Supabase. This repository currently contains the database, authentication-session, and typed client foundation; it intentionally does not add UI screens.

## Local setup

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and fill in the values from **Supabase Dashboard → Project Settings → API**.
3. Apply the SQL migrations at `supabase/migrations/20260719000000_create_mora_portfolio_schema.sql` and `supabase/migrations/20260719001000_create_mora_intake_image_bucket.sql` (instructions below).
4. Start the app:

   ```bash
   npm install
   npm run dev
   ```

The `.env.local` file is ignored by Git. `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are deliberately browser-safe Supabase credentials. `SUPABASE_SERVICE_ROLE_KEY` is a server secret: do not prefix it with `NEXT_PUBLIC_`, do not place it in client components, and only set it if trusted server-only admin/background work needs it.

## Supabase dashboard setup

1. In **Project Settings → API**, copy the Project URL and Publishable key into `.env.local`.
2. In **SQL Editor**, paste and run both migrations in timestamp order, or use the Supabase CLI to link the project and run `supabase db push`. The first migration creates the application schema; the second creates the private `mora-intake-images` bucket and user-scoped Storage policies required by the intake wizard.
3. In **Authentication → URL Configuration**, add your local URL (for example, `http://localhost:3000`) as a Site URL/redirect URL. Add each deployed URL before enabling sign-in flows.
4. In **Authentication → Providers**, enable and configure the providers MORA will use. No sign-in UI is included yet.
5. Before production, add the same three environment variables in your deployment provider. Keep the service-role key restricted to server-side environment settings.

## Data access rules

- Each `auth.users` record can own one profile (`profiles.user_id` is unique).
- Handles are stored lowercase and must be 3–30 URL-safe characters; they are unique case-insensitively.
- Authenticated users can create, read, update, and delete only their profile and the portfolio records connected to it.
- Anonymous users can read only published profiles and the portfolio items/blueprints connected to published profiles.
- Row Level Security is enabled on every application table. The browser and normal server clients use the publishable key and are constrained by these policies.

## Supabase helpers

- `src/lib/supabase/client.ts` — browser client; uses public credentials only.
- `src/lib/supabase/server.ts` — request-scoped server client with the current auth cookies.
- `src/lib/supabase/admin.ts` — server-only service-role client for exceptional trusted jobs; bypasses RLS and must never be imported by client code.
- `src/proxy.ts` — Next.js 16 proxy that refreshes Supabase auth cookies. It is not an authorization boundary; server mutations must always validate the user and rely on RLS.
- `src/types/database.ts` — TypeScript schema types. Regenerate it after schema changes with `npx supabase gen types typescript --project-id <project-ref> > src/types/database.ts`.

## Validation

```bash
npm run lint
npm run build
```
