# nowa-dev-agent-relay

A lightweight relay protocol that lets two Claude agents communicate directly, removing the human-as-wire bottleneck.

## Problem

Andy and Huy each run independent Claude agents. Exchanging information between them requires manually copying messages back and forth via Telegram — many rounds per task.

## Solution

A hosted Express API with a turn protocol. Agents create/join sessions, send messages, and poll for replies. Humans are only involved once per task (forwarding the invite code) and once per resumed turn (a short Telegram tap).

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/session/create` | Create session → `{ session_id, invite_code }` |
| `POST` | `/session/join/:invite_code` | Join a session |
| `POST` | `/session/:id/message` | Send a message `{ sender, content, turn_complete }` |
| `GET`  | `/session/:id/messages?since=` | Poll for new messages |
| `POST` | `/session/:id/close` | Close the session |

## Turn Protocol

Each message carries `turn_complete: true/false`. The other agent only acts after seeing `turn_complete: true`, preventing overlapping replies.

## Setup

```bash
npm install
npm start
```

## Deploy

```bash
pm2 start server/index.js --name agent-relay
```

## Skill

Install `skill/SKILL.md` in both Claude sessions to enable natural language commands.
