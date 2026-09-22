# Math Quest: Multiplication Arena

A kid-friendly multiplication game built with React, TypeScript, and Vite. It works without an account and automatically syncs one shared progress history across every configured device when Supabase is enabled.

## Development

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

## Optional Supabase shared sync

1. Create/link the Supabase project locally, then apply the checked-in migration:

   ```bash
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

   Alternatively, run [supabase/migrations/20260919111500_create_math_quest_sync.sql](supabase/migrations/20260919111500_create_math_quest_sync.sql) in the Supabase SQL editor. Do not use the database password or a service-role key in the app.

2. Copy `.env.example` to `.env.local` and set only the project URL and publishable key. For existing local configuration that uses `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`, Vite maps just those two public values to its safe `VITE_` names. `SUPABASE_DB_PASSWORD` remains private and is never bundled.

3. No Supabase Authentication, email provider, or redirect URL configuration is needed. The app connects anonymously with the publishable key and starts syncing automatically.

The migration creates a single shared `rounds` / `attempts` dataset, enables RLS, and grants anonymous clients only select, insert, and update access — never delete. This is intentionally public and tamperable: a browser publishable key cannot identify or prove ownership of a visitor. Do not use it for private, sensitive, or trustworthy records.

## Deployment

The GitHub Actions workflow builds and deploys `trunk` to Azure Static Web Apps. After creating the Azure Static Web App, add its deployment token to the repository as the `AZURE_STATIC_WEB_APPS_API_TOKEN` Actions secret.

The game keeps the latest 100 completed rounds, settings, and personal records in memory for the current session. With Supabase configured, cloud history is authoritative and newly completed rounds are uploaded individually; browser `localStorage` is not used.
