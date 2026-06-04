const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const DB_PATH = path.join(__dirname, '..', 'data', 'sessions.json');

function loadSessions() {
  try {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const obj = JSON.parse(raw);
    return new Map(Object.entries(obj));
  } catch {
    return new Map();
  }
}

function persist() {
  const obj = Object.fromEntries(sessions);
  fs.writeFileSync(DB_PATH, JSON.stringify(obj, null, 2), 'utf8');
}

const sessions = loadSessions();

function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function createSession() {
  const id = uuidv4();
  const invite_code = generateInviteCode();
  const session = {
    id,
    invite_code,
    status: 'waiting',
    participants: [],
    messages: [],
    created_at: Date.now(),
    expires_at: Date.now() + SESSION_TTL_MS,
  };
  sessions.set(id, session);
  persist();
  return session;
}

function getSessionByInviteCode(invite_code) {
  for (const session of sessions.values()) {
    if (session.invite_code === invite_code) return session;
  }
  return null;
}

function getSession(id) {
  const session = sessions.get(id);
  if (!session) return null;
  if (Date.now() > session.expires_at) {
    sessions.delete(id);
    persist();
    return null;
  }
  return session;
}

function addMessage(session, sender, content, turn_complete) {
  const message = {
    id: uuidv4(),
    sender,
    content,
    turn_complete: !!turn_complete,
    timestamp: Date.now(),
  };
  session.messages.push(message);
  persist();
  return message;
}

function closeSession(session) {
  session.status = 'closed';
  persist();
}

// Prune expired sessions every hour
setInterval(() => {
  const now = Date.now();
  let pruned = false;
  for (const [id, session] of sessions.entries()) {
    if (now > session.expires_at) {
      sessions.delete(id);
      pruned = true;
    }
  }
  if (pruned) persist();
}, 60 * 60 * 1000);

module.exports = {
  createSession,
  getSession,
  getSessionByInviteCode,
  addMessage,
  closeSession,
};
