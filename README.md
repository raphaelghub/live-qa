# Signal — live audience Q&A

Self-hosted Slido-like Q&A. Signal UI (variant A). Supabase Auth for hosts. Anonymous participants join with a code.

**Production:** [https://signal-live-qa.netlify.app](https://signal-live-qa.netlify.app)

Deploy note: `npx netlify deploy --prod` (env via `netlify env:set`; never commit `.env*`).

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use `localhost`, not `127.0.0.1` (Next.js dev blocks that origin).

Needs `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Flows

| Who | URL | What |
|---|---|---|
| Join | `/` | Enter `#CODE` |
| Participant | `/e/CODE` | Ask, upvote |
| Host | `/login` → `/host` | Email, Google, or phone, then create and moderate |
| Host room | `/host/CODE` | Moderate, reply, archive, share/QR, export |
| Present | `/wall/CODE` | Light stage board with QR + latest divider |

## Demo host (local)

Seeded for verification: `demo@live-qa.local` / `signal-host-123`

With `npm run dev` up:

```bash
npm run demo:qa
```

Writes `artifacts/demo/full-usage.webm`, `export.csv`, and `session-code.txt`.

Create a real host via `/signup` when email delivery is configured. New Supabase projects rate-limit signup emails.

Hosts can also sign in with Google or a phone SMS code. Those providers stay off until you turn them on in the Supabase dashboard. See [Host Google and phone sign-in](#host-google-and-phone-sign-in).

## Host Google and phone sign-in

App code is already wired. Email and password keep working without these steps.

Live measurements on 2026-10-18 against `https://signal-live-qa.netlify.app` and project `qzwryvwfuebenxfkfrmf`:

- Email signup created `auth.users` row `3e00ca29-52d6-4de5-aa76-f25c77554d79` with `email_confirmed_at` null and a `confirmation_token`. The form stayed on `/signup` with `Account created. Confirm your email (or ask an admin to confirm it), then log in.`
- Email login then returned `Email not confirmed`.
- Google `/auth/v1/authorize` returned `{"code":400,"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}`.
- Phone OTP returned `Unsupported phone provider` (`phone_provider_disabled`).
- Production `/auth/callback` is deployed. A request with no code redirects to `/login?error=oauth`.
- Google authorize accepted `redirect_to=https://signal-live-qa.netlify.app/auth/callback` and `http://localhost:3000/auth/callback`. It failed on the provider, not on the redirect allow list.

### Email confirmation (required for signup to reach `/host`)

In [Auth Providers, Email](https://supabase.com/dashboard/project/qzwryvwfuebenxfkfrmf/auth/providers):

1. Turn **Confirm email** off if a new host should land on `/host` immediately after signup.
2. Or leave Confirm email on, add custom SMTP, and have the host click the confirmation mail. Built-in SMTP only delivers to pre-authorized team addresses.

`signupAction` now sends `emailRedirectTo` to `/auth/callback?next=/host`. `/auth/callback` exchanges both PKCE `code` and `token_hash`.

### Redirect URLs

In [URL Configuration](https://supabase.com/dashboard/project/qzwryvwfuebenxfkfrmf/auth/url-configuration):

1. Set **Site URL** to `https://signal-live-qa.netlify.app`.
2. Add these **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/auth/callback**`
   - `https://signal-live-qa.netlify.app/auth/callback`
   - `https://signal-live-qa.netlify.app/auth/callback**`

Netlify preview deploys need their own callback URL in that list, such as `https://<preview-id>--signal-live-qa.netlify.app/auth/callback**`.

### Google (paused for secrets)

1. Create a Google Cloud **Web application** OAuth client.
2. Authorized JavaScript origins: `http://localhost:3000` and `https://signal-live-qa.netlify.app`.
3. Authorized redirect URI: `https://qzwryvwfuebenxfkfrmf.supabase.co/auth/v1/callback`. Copy the exact URI from [Auth Providers, Google](https://supabase.com/dashboard/project/qzwryvwfuebenxfkfrmf/auth/providers?provider=Google).
4. Paste the **client ID** and **client secret** into that Google provider page and enable it.

Do not put the Google client secret in Netlify or `.env.local`. Supabase Auth holds it. Pause here until those two Google Cloud values are pasted.

### Phone SMS (paused for secrets)

1. Enable **Phone** on [Auth Providers](https://supabase.com/dashboard/project/qzwryvwfuebenxfkfrmf/auth/providers).
2. Allow phone signups if hosts should create an account from `/signup`.
3. Paste Twilio **Account SID**, **Auth Token**, and **sender number** or Messaging Service SID.

The app sends an SMS OTP, then verifies the 6-digit code. Participants on `/` and `/e/CODE` stay anonymous. They never see this form. Pause here until the Twilio values are pasted.

## Stack

Next.js 16 App Router, Tailwind, Supabase (Postgres + Auth + Realtime). Schema in project `live-qa` (`qzwryvwfuebenxfkfrmf`).
