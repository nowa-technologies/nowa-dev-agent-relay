const { getSession } = require('../sessions');

module.exports = (req, res) => {
  const { id } = req.params;
  const { since_id, since } = req.query;

  const session = getSession(id);
  if (!session) return res.status(404).json({ error: 'Session not found or expired' });

  let messages;

  if (since_id) {
    // Preferred: dedup by message ID — return all messages after this ID
    const idx = session.messages.findIndex(m => m.id === since_id);
    messages = idx === -1 ? session.messages : session.messages.slice(idx + 1);
  } else if (since) {
    // Fallback: filter by timestamp
    const sinceTs = parseInt(since, 10) || 0;
    messages = session.messages.filter(m => m.timestamp > sinceTs);
  } else {
    messages = session.messages;
  }

  const last = session.messages[session.messages.length - 1] || null;

  res.json({
    session_id: id,
    status: session.status,
    participants: session.participants,
    last_message_id: last ? last.id : null,
    messages,
  });
};
