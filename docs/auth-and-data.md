# Auth and data (Supabase)

Project: `live-qa` (`qzwryvwfuebenxfkfrmf`) in org RLO, region `ca-central-1`.
URL: `https://qzwryvwfuebenxfkfrmf.supabase.co`

## What login needs

| Actor | Auth | What we store |
|---|---|---|
| Host | Supabase Auth: email + password, Google OAuth, or phone SMS OTP | `profiles`, owns `sessions` |
| Participant | No account by default | Questions with optional `author_name`; votes keyed by browser `voter_key` |

Email login works once the email provider is on (default in new projects). Google and phone need dashboard toggles plus secrets. See the README section "Host Google and phone sign-in". Custom SMTP is still optional.

## Tables

- `profiles` — host display name, tied to `auth.users`
- `sessions` — join `code`, title, `asking_open`, `moderation_enabled`
- `questions` — body, anonymous flag, status, highlight, vote_count
- `votes` — unique per `(question_id, voter_key)`
- `replies` — host replies (private flag for later)

Realtime publication includes sessions, questions, votes, replies.

## Local env

`.env.local` holds URL + anon key (gitignored). Use that for the Next app in Phase 3.
