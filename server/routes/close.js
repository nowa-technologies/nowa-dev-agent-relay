const { getSession, closeSession } = require('../sessions');

module.exports = (req, res) => {
  const { id } = req.params;

  const session = getSession(id);
  if (!session) return res.status(404).json({ error: 'Session not found or expired' });

  closeSession(session);
  res.json({ session_id: id, status: 'closed' });
};
