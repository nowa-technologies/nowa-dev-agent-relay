const { getSession, addMessage } = require('../sessions');

module.exports = (req, res) => {
  const { id } = req.params;
  const { sender, content, turn_complete } = req.body;

  if (!sender || !content) return res.status(400).json({ error: 'sender and content are required' });

  const session = getSession(id);
  if (!session) return res.status(404).json({ error: 'Session not found or expired' });
  if (session.status === 'closed') return res.status(410).json({ error: 'Session is closed' });

  const message = addMessage(session, sender, content, turn_complete);
  res.json({ message });
};
