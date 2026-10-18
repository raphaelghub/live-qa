# Live Q&A (Signal) architecture

## Domain model

```ts
type QuestionStatus = 'pending' | 'live' | 'answered' | 'dismissed'

type Session = {
  id: string
  hostId: string
  code: string // 6-char join code
  title: string
  askingOpen: boolean
  moderationEnabled: boolean
}

type Question = {
  id: string
  sessionId: string
  body: string
  authorName: string | null
  isAnonymous: boolean
  status: QuestionStatus
  isHighlighted: boolean
  voteCount: number
  createdAt: string
}

// Votes: (questionId, voterKey) — voterKey is localStorage UUID
```

Organizing structure: status as enum state machine; votes as set keyed by voter; session as aggregate root. UI reads session + questions ordered by `isHighlighted desc, voteCount desc, createdAt desc`.

## Module map (Next.js App Router)

- `lib/supabase/{client,server,middleware}.ts` — browser/server clients
- `lib/domain.ts` — types + pure sort helpers
- `app/login` and `app/signup` — host email/password, Google OAuth, phone OTP
- `app/auth/callback` — PKCE code exchange for Google
- `app/host` — list/create sessions (auth required)
- `app/host/[code]` — moderate: highlight, answer, close asking
- `app/join` — enter code
- `app/e/[code]` — participant feed + ask + upvote
- `app/wall/[code]` — present board (read-only highlight view)
- Realtime: subscribe to `questions` + `sessions` filtered by session_id

## Auth

- Hosts: Supabase Auth email/password, Google, or phone OTP → `profiles`
- Participants: anon key only; optional name on question; `voter_key` in localStorage
