const { getSession } = require('../sessions');

// GET /session/:id — full session info for debug and status checks
module.exports = (req, res) => {
  const { id } = req.params;

  const session = getSession(id);
  if (!session) return res.status(404).json({ error: 'Session not found or expired' });

  res.json({
    session_id: session.id,
    invite_code: session.invite_code,
    status: session.status,
    participants: session.participants,
    message_count: session.messages.length,
    messages: session.messages,
    created_at: session.created_at,
    expires_at: session.expires_at,
  });
};
