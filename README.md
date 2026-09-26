# Math Quest: Multiplication Arena

A kid-friendly multiplication game built with React, TypeScript, and Vite. Guests can practice for one visit. Players who sign in with Google save private scores across devices through Supabase.

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

## Google sign-in and private sync

1. Create or link a Supabase project and apply all checked-in migrations in order:

   ```bash
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

   For a project managed in the SQL editor, run the SQL files in `supabase/migrations` by filename order. Apply the database changes **before** deploying this app. The reset migration archives the shared history in the owner-only `private` schema and clears the public tables. The following migration assigns each new round to an Auth user and replaces the shared RLS policies. If the reset migration was previously run before its archive step existed, data already deleted by that run cannot be recovered here.

2. In Google Auth Platform, create a web OAuth client. Set the production site origin (and local development origin if needed) as authorized JavaScript origins. In Supabase Authentication, enable Google and enter the same client ID and its secret there. Configure the Site URL for the production site. Enable only the sign-in providers you intend to offer; disable anonymous Auth sign-ins. The app uses Google's on-site Identity Services button, so Google returns an ID token to the page instead of redirecting the browser through the Supabase project hostname. Supabase exchanges that token for the same private Auth session. The old Supabase callback URI can remain authorized for rollback, but the current app no longer uses it.

3. Copy `.env.example` to `.env.local` and set the project URL, publishable key, and public Google OAuth web client ID. Add the Supabase values as GitHub Actions build secrets and `VITE_GOOGLE_CLIENT_ID` as a repository variable. Keep the Google client secret in Supabase, and never put a database password or service-role key in Vite variables.

4. Verify two test Google accounts: each can see only its own rounds, signing out clears the screen's history, and guest play makes no Supabase requests for scores. Check that an old deployed client can no longer read or write the shared tables before inviting the class.

5. In GitHub repository Settings → Secrets and variables → Actions → Variables, set `MATH_QUEST_GOOGLE_AUTH_READY` to `true`, then run the **Build and deploy Math Quest** workflow manually. Until this variable is set, pushes to `trunk` still build and test but do not deploy, so the existing site keeps working during setup.

Supabase Auth keeps each account's Google identity, including the email and display name it receives. The game tables contain the Supabase user ID and gameplay results; they do not copy email or profile photos. The UI displays the Google name from the signed-in Auth session. Each account can read and update only its own rounds and attempts. Guest scores exist in browser memory only and disappear on reload or sign-out. If a signed-in player finishes while offline, the round remains in memory and retries while that tab stays open; closing it before sync completes loses that round.

### Retention and deletion

Keep student accounts and game records only while the class is active. On your manual end-of-class request, identify the class user IDs in Supabase Auth, export anything the owner needs, then delete those Auth users with an administrative credential or the Supabase dashboard. The `rounds.user_id` foreign key cascades to their rounds and attempts. Verify deletion by querying the game tables for those IDs. The archived pre-class history in `private.legacy_rounds` and `private.legacy_attempts` is separate and is not visible to app users. Obtain school or parent approval for the sign-in and storage of identifiable game performance before inviting minors.

## Deployment

The GitHub Actions workflow builds and deploys `trunk` to Azure Static Web Apps. After creating the Azure Static Web App, add its deployment token to the repository as the `AZURE_STATIC_WEB_APPS_API_TOKEN` Actions secret.

The game keeps the latest 100 completed rounds, settings, and personal records in memory for the current session. Signed-in cloud history is private to that account; browser `localStorage` is not used for game data.
