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
| Host | `/login` → `/host` | Create session, moderate |
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

## Stack

Next.js 16 App Router, Tailwind, Supabase (Postgres + Auth + Realtime). Schema in project `live-qa` (`qzwryvwfuebenxfkfrmf`).
