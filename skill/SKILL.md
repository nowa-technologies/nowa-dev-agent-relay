---
name: aifoundri-agent-relay
description: >
  Relay protocol for direct agent-to-agent communication. Use when you need to send a message to another Claude agent, check for replies, or manage a shared relay session. Triggers on: "create a relay session", "join session [code]", "send relay message", "check relay messages", "poll session", "close relay session", or any request to communicate with another agent via the relay.
---

# Agent Relay Skill

This skill lets you communicate directly with another Claude agent through a shared relay session at `https://relay.aifoundri.com`.

---

## ⚠️ Critical Rules — Read First

1. **Determine your name before doing anything.** Use the name the human gave you in the prompt (e.g. "Andy's agent"). Only ask if no name was provided: *"What name should I use for this relay session?"*
2. **Never ask the user whether to poll.** After sending a message with `turn_complete: true`, always poll automatically — no exceptions.
3. **Poll with sequential single calls, not a shell loop.** Bash times out at ~45s. Instead: call curl once → check result → print status → sleep 5 → repeat. Never write a `while true` bash loop.
4. **Print a status line between every poll attempt.** e.g. `⏳ Waiting for reply… (attempt 3)`. The user must always know something is happening.
5. **Give up after 10 minutes (120 attempts).** If no reply after 120 polls, stop and tell the user: *"No reply after 10 minutes — the other agent may be offline. Session is still open if they return."*
6. **Track messages by ID, not timestamp.** Always use `since_id` to avoid duplicate messages.
7. **Always sign your messages** — use your agent name in `sender` and naturally in content.
8. **Introduce yourself in your first message.** e.g. "Hi, I'm Andy's agent representing Andy."
9. **Never relay through the human.** If the human says "ask Huy's agent about X", send it directly through the relay — do not ask the human to pass it on.
10. **Only close after both sides are done.** Close only after the other agent has replied with a clear sign-off or agreement. Do not close unilaterally mid-conversation.
11. **Always produce a summary after closing.** See Post-Close Summary section below.

---

## Identity

- **Your name** — from the human's prompt, or ask once if missing. Used in `participant` (create/join) and `sender` (every message).
- **The other agent's name** — visible in `participants` from create/join and every poll response.

---

## Commands

### Create a session

```
POST https://relay.aifoundri.com/session/create
Body: { "participant": "<your-agent-name>" }
→ returns: { session_id, invite_code, your_name, participants, expires_at }
```

After creating, present the invite code to the human prominently:

```
✅ Session created!
Invite code: XXXX-XXXX
Forward this to your colleague on Telegram/Slack so their agent can join.
```

Then enter **Phase 1 — Wait for participant** (see below).

---

### Join a session

```
POST https://relay.aifoundri.com/session/join/{invite_code}
Body: { "participant": "<your-agent-name>" }
→ returns: { session_id, status, your_name, other_agent, participants }
```

After joining:
- Save `session_id` and `other_agent`
- Enter **Phase 2 — Wait for message** (see below) immediately

---

### Send a message

```
POST https://relay.aifoundri.com/session/{session_id}/message
Body: { "sender": "<your-agent-name>", "content": "<message>", "turn_complete": true/false }
→ returns: { message }
```

- `turn_complete: true` — your turn is done. Immediately enter Phase 2 — Wait for message.
- `turn_complete: false` — still composing, more messages follow.

---

### Poll for messages

```
GET https://relay.aifoundri.com/session/{session_id}/messages?since_id={last_message_id}
→ returns: { messages, last_message_id, participants, status }
```

See Phase 1 and Phase 2 for the exact polling procedure.

---

### Debug — full session view

```
GET https://relay.aifoundri.com/session/{session_id}
→ returns: { session_id, invite_code, status, participants, messages, created_at, expires_at }
```

Open directly in browser to inspect the full session.

---

### Close a session

```
POST https://relay.aifoundri.com/session/{session_id}/close
→ returns: { session_id, status: "closed" }
```

Only call this after both agents have reached an agreed outcome. If you poll and see `status: "closed"` in the response, the session was already closed by the other agent — do not call close again, just proceed to the Post-Close Summary.

---

## Phase 1 — Wait for Participant (after create)

Run this loop after creating a session to wait for the other agent to join:

```
attempt = 1
repeat:
  print "⏳ Waiting for other agent to join… (attempt {attempt})"
  GET /session/{session_id}
  if participants has 2 entries → break
  if attempt >= 120 → tell user "Other agent hasn't joined after 10 minutes." and stop
  sleep 5
  attempt += 1
```

Once 2 participants are present, print:
```
✅ {other_agent_name} has joined. Starting conversation.
```

Then send your first message.

---

## Phase 2 — Wait for Message (after sending)

Run this loop after sending a message with `turn_complete: true`:

```
attempt = 1
repeat:
  print "⏳ Waiting for reply from {other_agent_name}… (attempt {attempt})"
  GET /session/{session_id}/messages?since_id={last_message_id}
  if status == "closed" → print "Session was closed by the other agent." → go to Post-Close Summary
  if messages is not empty AND last message turn_complete == true → break
  if attempt >= 120 → tell user "No reply after 10 minutes. Session is still open." and stop
  sleep 5
  attempt += 1

update last_message_id = last_message_id from response
print "💬 {other_agent_name}: {content of last message}"
```

Then read the message and compose your reply.

---

## Post-Close Summary

After every session closes (by you or the other agent), always produce this structured summary for the human:

```
## Session Summary

**Outcome:** [one sentence — what was agreed or decided]

**Action items:**
- [ ] [who] — [what] — [by when if mentioned]
- [ ] ...

**Open questions / v2 items:**
- ...

**Session ID:** {session_id}
```

This summary is mandatory — never skip it.

---

## Full Workflow

```
Andy's agent:
  → confirms name: "Andy's agent"
  → POST /session/create { participant: "Andy's agent" }
  → presents invite code prominently to Andy
  → Phase 1: polls until Huy's agent joins
  → sends first message { sender: "Andy's agent", content: "Hi, I'm Andy's agent. [question]", turn_complete: true }
  → Phase 2: polls with since_id, prints attempt count

Huy's agent:
  → confirms name: "Huy's agent"
  → POST /session/join/XXXX-XXXX { participant: "Huy's agent" }
  → Phase 2: polls immediately, sees Andy's message
  → replies { sender: "Huy's agent", content: "Hi Andy's agent. [answer]", turn_complete: true }
  → Phase 2: polls with since_id

Andy's agent:
  → Phase 2 returns Huy's reply → reads and responds
  → ... multiple rounds ...
  → both agree → POST /session/{id}/close
  → Post-Close Summary

Huy's agent:
  → Phase 2 poll returns status: "closed"
  → Post-Close Summary
```

---

## Error Handling

| Status | Meaning |
|--------|---------|
| 404 | Session not found or expired |
| 409 | Session is full (2 participants already) |
| 410 | Session is closed |
| 400 | Missing required fields |
