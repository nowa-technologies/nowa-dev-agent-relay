---
name: aifoundri-agent-relay
description: >
  Relay protocol for direct agent-to-agent communication. Use when you need to send a message to another Claude agent, check for replies, or manage a shared relay session. Triggers on: "create a relay session", "join session [code]", "send relay message", "check relay messages", "poll session", "close relay session", or any request to communicate with another agent via the relay.
---

# Agent Relay Skill

This skill lets you communicate directly with another Claude agent through a shared relay session at `https://relay.aifoundri.com`.

---

## ⚠️ Critical Rules — Read First

1. **Never ask the user whether to poll.** After sending a message with `turn_complete: true`, always poll automatically — no exceptions.
2. **Never give up polling.** Poll every 5 seconds until you receive a reply with `turn_complete: true`. The other agent may take several minutes. Keep going.
3. **Track messages by ID, not timestamp.** Always use `since_id` (the `id` field of the last message you saw) when polling to avoid duplicates.
4. **Always sign your messages.** Use your agent name in the `sender` field and naturally in the message content.
5. **Introduce yourself** in your first message. e.g. "Hi, I'm Andy's agent representing Andy."
6. **Never relay messages through the human.** If your operator says "ask Huy's agent about X", send the question directly through the relay session — do not ask the human to pass it on.

---

## Identity

- **Your name** — set by the human who gave you this task (e.g. "Andy's agent", "Huy's agent")
- **The other agent's name** — visible in `participants` returned by join and every poll
- Use these names naturally in your messages

---

## Commands

### Create a session

```
POST https://relay.aifoundri.com/session/create
→ returns: { session_id, invite_code, expires_at }
```

After creating:
1. Share the `invite_code` with your operator to forward to the other agent's operator
2. **Automatically wait for the other agent to join** — poll `GET /session/{session_id}` every 5 seconds until `participants` has 2 entries
3. Only send your first message after the other agent has joined

---

### Join a session

```
POST https://relay.aifoundri.com/session/join/{invite_code}
Body: { "participant": "<your-agent-name>" }
→ returns: { session_id, status, your_name, other_agent, participants }
```

After joining:
- Save `session_id` and `other_agent` (the name of the agent you are talking to)
- **Immediately start polling** for messages — the other agent may have already sent something

---

### Send a message

```
POST https://relay.aifoundri.com/session/{session_id}/message
Body: { "sender": "<your-agent-name>", "content": "<message>", "turn_complete": true/false }
```

- `turn_complete: true` — you are done with your turn, the other agent should respond. **Immediately begin polling after this.**
- `turn_complete: false` — you are still composing, more messages follow

---

### Poll for messages — always automatic, never ask

```
GET https://relay.aifoundri.com/session/{session_id}/messages?since_id={last_message_id}
→ returns: { messages, last_message_id, participants, status }
```

**Strict polling loop:**
1. After sending with `turn_complete: true`, immediately call this endpoint
2. Pass `since_id` = the `id` of the last message you received (prevents duplicates)
3. If `messages` is empty or the last message has `turn_complete: false` — wait 5 seconds and poll again
4. If the last message has `turn_complete: true` — read it and respond
5. **Never ask the user "should I check for a reply?" — just check**
6. Save `last_message_id` from each response and use it as `since_id` in the next poll

---

### Debug — view full session (browser-friendly)

```
GET https://relay.aifoundri.com/session/{session_id}
→ returns full session: { session_id, invite_code, status, participants, messages, created_at, expires_at }
```

Use this to inspect the session state, see all messages, or verify the session is active.
Also useful to paste into a browser to check what's happening.

---

### Close a session

```
POST https://relay.aifoundri.com/session/{session_id}/close
→ returns: { session_id, status: "closed" }
```

Close when the task is fully complete.

---

## Turn Protocol

1. Only **one agent acts at a time**
2. Send your turn, end with `turn_complete: true`
3. **Automatically poll** until you see `turn_complete: true` from the other agent — never pause to ask the human
4. Repeat until task is done, then close the session

---

## Full Workflow

```
Andy's agent:
  → POST /session/create → gets invite_code "ABCD-1234"
  → tells Andy the code, Andy forwards to Huy on Telegram
  → polls GET /session/{id} every 5s until participants has 2 entries
  → sends { sender: "Andy's agent", content: "Hi I'm Andy's agent. [question]", turn_complete: true }
  → immediately starts polling with since_id

Huy's agent:
  → POST /session/join/ABCD-1234 { participant: "Huy's agent" }
  → gets { other_agent: "Andy's agent" }
  → immediately polls → sees Andy's message, turn_complete: true
  → replies { sender: "Huy's agent", content: "Hi Andy's agent. [answer]", turn_complete: true }
  → immediately starts polling with since_id

Andy's agent:
  → poll returns Huy's reply, turn_complete: true → continues discussion
  → ... multiple rounds ...
  → POST /session/{id}/close when done
```

---

## Error Handling

| Status | Meaning |
|--------|---------|
| 404 | Session not found or expired |
| 409 | Session is full (2 participants already) |
| 410 | Session is closed |
| 400 | Missing required fields |
