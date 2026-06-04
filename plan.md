# Agent Relay Protocol — Plan

## Problem

Andy and Huy each run independent Claude agents. When their agents need to exchange information, the current workflow is:

1. Andy's agent produces a question
2. Andy manually copies it to Telegram
3. Huy pastes it into his agent
4. Huy's agent produces an answer
5. Huy manually copies it back to Telegram
6. Andy pastes it into his agent

This repeats many rounds per task. The human becomes the wire.

## Solution

Build a hosted relay protocol + Claude skill so agents communicate directly.  
The human is only involved **once per task** (to forward the invite code) and **once per resumed turn** (a short Telegram tap: "check session XYZ").

---

## Architecture

### Relay API
A lightweight Node.js / Express server hosted on the AIFoundri VPS.  
Sessions are stored in-memory with a 24-hour TTL after close.

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/session/create` | Create a new session → returns `{ session_id, invite_code }` |
| `POST` | `/session/join/:invite_code` | Huy's agent joins the session |
| `POST` | `/session/:id/message` | Send a message `{ sender, content, turn_complete }` |
| `GET`  | `/session/:id/messages?since=` | Poll for new messages |
| `POST` | `/session/:id/close` | Close the session |

**Session states:** `waiting` → `active` → `closed`

**Turn protocol:**
- Each message carries `turn_complete: false/true`
- The last message of a turn sets `turn_complete: true`
- The other agent only acts after seeing `turn_complete: true`
- This prevents chaotic overlapping replies

### Claude Skill
A `SKILL.md` installed by both Andy and Huy.  
Wraps the API so agents use natural language commands:

- *"create a relay session"* → calls `POST /session/create`, returns invite code
- *"join session ABC-123"* → calls `POST /session/join/ABC-123`
- *"send message: [content]"* → calls `POST /session/:id/message`
- *"check for new messages"* → polls `GET /session/:id/messages?since=`
- *"close session"* → calls `POST /session/:id/close`

---

## Full Workflow

### First contact (Turn 1)
```
Andy's agent   →  create_session  →  gets invite code "ABC-123"
Andy           →  taps Huy on Telegram: "check session ABC-123"
Huy's agent    →  join_session("ABC-123")
Andy's agent   →  send_message(content, turn_complete=true)
Huy's agent    →  polls → sees turn_complete=true → responds
                →  send_message(content, turn_complete=true)
Andy's agent   →  polls → sees turn_complete=true → continues task
```

### Resume (Turn 2+)
```
Andy's agent   →  send_message(session_id, content, turn_complete=true)
Andy           →  taps Huy on Telegram: "new question on ABC-123"
Huy's agent    →  polls session → sees new message → responds
```

Session stays alive until either agent calls `close_session` or 24h TTL expires.

---

## Build Plan

### Phase 1 — Relay API
- [ ] Init Node.js project (`express`, `uuid`, `cors`)
- [ ] Implement in-memory session store with TTL
- [ ] Implement all 5 endpoints
- [ ] Add basic error handling (invalid codes, expired sessions, etc.)
- [ ] Test locally with `curl`

### Phase 2 — Deploy to VPS
- [ ] Push to GitHub
- [ ] SSH into AIFoundri VPS
- [ ] Install dependencies, run with `pm2`
- [ ] Expose on port (add subdomain `relay.aifoundri.com` later)
- [ ] Smoke test from public IP

### Phase 3 — Claude Skill
- [ ] Write `SKILL.md` with full instructions for the agent
- [ ] Include API base URL, all command mappings, polling logic
- [ ] Include turn protocol explanation so agent knows when to respond vs wait
- [ ] Test skill in both Andy's and Huy's Claude sessions

### Phase 4 — End-to-End Test
- [ ] Andy and Huy run a real task using the relay
- [ ] Validate: session create → join → multi-round exchange → close
- [ ] Note any edge cases (agent crashes mid-session, double replies, etc.)

### Phase 5 — Hardening (after first real use)
- [ ] Swap in-memory store → SQLite or Redis for persistence across restarts
- [ ] Add session history endpoint for debugging
- [ ] Consider multi-agent sessions (3+ participants) if needed
- [ ] Add subdomain + HTTPS

---

## Git & Naming

| Item | Value |
|------|-------|
| GitHub org | `nowa-technologies` |
| Repo name | `nowa-dev-agent-relay` |
| First branch | `dev/andy/agent-relay-server` |
| Commit style | Imperative, short — e.g. `"Init agent relay protocol"` |

Convention: `{scope}-{team}-{project}` — `nowa` scope, `dev` team, `agent-relay` project.  
Hosted on GitHub (not Bitbucket) as shared tooling, not a NOWA product repo.

---

## Repo Structure

```
nowa-dev-agent-relay/
├── server/
│   ├── index.js          # Express app entry point
│   ├── sessions.js       # In-memory session store + TTL logic
│   └── routes/
│       ├── create.js
│       ├── join.js
│       ├── message.js
│       ├── messages.js
│       └── close.js
├── skill/
│   └── SKILL.md          # Claude skill — install in both agents
├── .gitignore
├── package.json
└── README.md
```

---

## Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Runtime | Node.js | Already on VPS, fast to scaffold |
| Framework | Express | Minimal, well-known |
| Storage | In-memory (v1) | No infra overhead for MVP |
| Process manager | pm2 | Keep server alive on VPS |
| Notifications | Manual Telegram tap | Simple, no bot setup needed for v1 |

---

## Notes

- Authentication: invite code is the only auth for v1. Add tokens later if needed.
- The skill should be designed so agents can use it without understanding the underlying protocol — just natural language commands.
- This protocol is generic — it can be reused for any two-agent collaboration, not just Andy ↔ Huy.
