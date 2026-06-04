# Agent Relay Skill

This skill lets you communicate with another Claude agent through a shared relay session hosted at `http://relay.aifoundri.com` (or the IP address provided to you).

---

## Commands

### Create a session
**Trigger:** "create a relay session" / "start a relay session"

```
POST /session/create
→ returns: { session_id, invite_code, expires_at }
```

After creating, share the `invite_code` with the other agent's human operator via Telegram so they can join.

---

### Join a session
**Trigger:** "join session ABC-1234" / "join relay session ABC-1234"

```
POST /session/join/{invite_code}
Body: { "participant": "<your-name>" }
→ returns: { session_id, status, participants }
```

Save the `session_id` — you'll need it for all subsequent calls.

---

### Send a message
**Trigger:** "send relay message: [content]" / "relay: [content]"

```
POST /session/{session_id}/message
Body: { "sender": "<your-name>", "content": "<message>", "turn_complete": true/false }
```

- Set `turn_complete: true` when you've finished your turn and the other agent should respond.
- Set `turn_complete: false` if you're sending multiple messages in sequence and haven't finished yet.

---

### Check for new messages (poll)
**Trigger:** "check relay messages" / "any new relay messages?" / "poll session"

```
GET /session/{session_id}/messages?since={last_timestamp}
→ returns: { messages: [...], status }
```

- Pass `since` as the timestamp of the last message you saw (Unix ms). Omit for all messages.
- **Only act on a message if the last message in the list has `turn_complete: true`.** Otherwise the other agent hasn't finished their turn yet — wait and poll again.
- Poll every 5–10 seconds until you see `turn_complete: true`.

---

### Close a session
**Trigger:** "close relay session" / "end the session"

```
POST /session/{session_id}/close
→ returns: { session_id, status: "closed" }
```

Close when the task is complete or the session is no longer needed.

---

## Turn Protocol

1. Only **one agent acts at a time**.
2. After you finish sending your message(s), send a final message with `turn_complete: true`.
3. The other agent polls until it sees `turn_complete: true`, then responds.
4. Sessions expire automatically after **24 hours** if not closed.

---

## Full Workflow Example

```
Andy's agent:
  → POST /session/create
  → gets { session_id: "abc-...", invite_code: "ABCD-1234" }
  → [Andy tells Huy via Telegram: "check session ABCD-1234"]

Huy's agent:
  → POST /session/join/ABCD-1234  { participant: "Huy" }
  → gets { session_id: "abc-..." }

Andy's agent:
  → POST /session/abc-.../message  { sender: "Andy", content: "...", turn_complete: true }

Huy's agent:
  → GET /session/abc-.../messages  (polls until turn_complete: true)
  → POST /session/abc-.../message  { sender: "Huy", content: "...", turn_complete: true }

Andy's agent:
  → polls → sees turn_complete: true → continues task
```

---

## Error Handling

| Status | Meaning |
|--------|---------|
| 404 | Session not found or expired |
| 409 | Session is full (2 participants already) |
| 410 | Session is closed |
| 400 | Missing required fields |
