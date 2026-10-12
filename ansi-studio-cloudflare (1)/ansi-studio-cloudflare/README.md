# ANSI Studio — Cloudflare Pages + D1

This project includes a static ANSI text editor, Pages Functions API, and a D1 schema for accounts, saved creations, profiles and settings.

## Important before public launch

- The account system uses username/password; email is optional.
- Passwords are PBKDF2-SHA256 hashes. Sessions use a Secure, HttpOnly, SameSite=Lax cookie and only a hash of the session token is stored in D1.
- There is **no automated password-reset, email-verification, self-service account-deletion, or email-delivery feature** in this starter. The legal pages say so. Users without a recovery path can permanently lose access. Do not advertise email recovery until you build and test it.
- Add Cloudflare rate limiting and preferably Turnstile before sharing publicly. Do not rely on a disclaimer instead of security.
- The legal pages are starting templates, not legal advice. The site operator must publish a monitored contact method and check local privacy/consumer obligations before launch.
- Uploaded branding/profile images are stored as data URLs in D1 and kept small (200 KB for profile picture, around 200 KB for logo). For larger use, use Cloudflare R2 instead.

## Local development on Windows PowerShell

1. Install Node.js LTS from https://nodejs.org/ and restart PowerShell.
2. Open PowerShell in this project folder.
3. Install Wrangler:

   ```powershell
   npm install --save-dev wrangler
   ```

4. Log in to Cloudflare:

   ```powershell
   npx wrangler login
   ```

5. Create the D1 database:

   ```powershell
   npx wrangler d1 create ansi-studio-db
   ```

   Copy the returned database ID into `wrangler.toml`, replacing `REPLACE_WITH_YOUR_D1_DATABASE_ID`.

6. Apply the schema to the local development database and the remote database:

   ```powershell
   npx wrangler d1 execute ansi-studio-db --local --file=./schema.sql
   npx wrangler d1 execute ansi-studio-db --remote --file=./schema.sql
   ```

7. Run the site locally:

   ```powershell
   npx wrangler pages dev ./public
   ```

   Open the local URL Wrangler prints. Use its HTTPS/localhost URL and test registration, login, saving, reload, logout, and login again.

## Deploy to Cloudflare Pages

1. In the Cloudflare dashboard, open **Workers & Pages** and create a Pages project, or use the CLI below.
2. Make sure `wrangler.toml` contains the actual D1 `database_id`.
3. Apply `schema.sql` to the remote D1 database (step 6 above).
4. If you have not created a Pages project yet, create it once:

   ```powershell
   npx wrangler pages project create ansi-studio --production-branch main
   ```

   If the project already exists, skip that command. Then deploy from this folder:

   ```powershell
   npx wrangler pages deploy ./public --project-name=ansi-studio
   ```

5. In the Cloudflare dashboard, open the Pages project and check **Settings → Functions → D1 database bindings**. Add a binding named exactly `DB` and select `ansi-studio-db` if the binding did not come across from Wrangler configuration.
6. If you use a Git-connected Pages project instead, set the build output directory to `public`, keep the `functions` folder at the project root, and configure the same D1 binding named `DB` in project settings.
7. Test on the deployed HTTPS URL. Registration should reject duplicate usernames, require terms acceptance, and allow a blank email. Verify a user cannot load another user's saved creation.

## Project layout

- `public/index.html` — editor and account UI
- `public/terms.html` — Terms of Service
- `public/privacy.html` — Privacy Policy
- `public/rules.html` — Community Rules
- `functions/api/` — Pages Functions API routes
- `functions/_utils.js` — password hashing, session cookies, common helpers
- `schema.sql` — D1 tables and indexes
- `wrangler.toml` — Pages output directory and D1 binding configuration

## Account constraints

- Username: 3–24 letters, numbers or underscores; case-insensitive uniqueness.
- Password: 10–128 characters.
- Email: optional; if provided, it must look like an email address and can only be used on one account.
- Terms acceptance: version and timestamp are stored at registration.
- Sessions: 14 days, HttpOnly + Secure + SameSite=Lax cookie.
