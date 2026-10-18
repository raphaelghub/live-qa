# Auth and data (Supabase)

Project: `live-qa` (`qzwryvwfuebenxfkfrmf`) in org RLO, region `ca-central-1`.
URL: `https://qzwryvwfuebenxfkfrmf.supabase.co`

## What login needs

| Actor | Auth | What we store |
|---|---|---|
| Host | Supabase Auth: email + password, Google OAuth, or phone SMS OTP | `profiles`, owns `sessions` |
| Participant | No account by default | Questions with optional `author_name`; votes keyed by browser `voter_key` |

Email signup on production creates the user and profile, then stops with `Account created. Confirm your email...` because Confirm email is on. Login then returns `Email not confirmed`. Google returns `Unsupported provider: provider is not enabled`. Phone returns `Unsupported phone provider`. See the README section "Host Google and phone sign-in" for the remaining dashboard toggles and secrets. Custom SMTP is required only if Confirm email stays on and the host inbox is not a project team address.

## Tables

- `profiles` — host display name, tied to `auth.users`
- `sessions` — join `code`, title, `asking_open`, `moderation_enabled`
- `questions` — body, anonymous flag, status, highlight, vote_count
- `votes` — unique per `(question_id, voter_key)`
- `replies` — host replies (private flag for later)

Realtime publication includes sessions, questions, votes, replies.

## Local env

`.env.local` holds URL + anon key (gitignored). Use that for the Next app in Phase 3.
