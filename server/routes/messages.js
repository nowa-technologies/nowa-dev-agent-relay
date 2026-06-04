const { getSession } = require('../sessions');

module.exports = (req, res) => {
  const { id } = req.params;
  const since = parseInt(req.query.since, 10) || 0;

  const session = getSession(id);
  if (!session) return res.status(404).json({ error: 'Session not found or expired' });

  const messages = session.messages.filter(m => m.timestamp > since);
  res.json({
    session_id: id,
    status: session.status,
    messages,
  });
};
