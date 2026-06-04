const { getSessionByInviteCode } = require('../sessions');

module.exports = (req, res) => {
  const { invite_code } = req.params;
  const { participant } = req.body;

  const session = getSessionByInviteCode(invite_code);
  if (!session) return res.status(404).json({ error: 'Session not found or expired' });
  if (session.status === 'closed') return res.status(410).json({ error: 'Session is closed' });
  if (session.participants.length >= 2) return res.status(409).json({ error: 'Session is full' });

  if (participant && !session.participants.includes(participant)) {
    session.participants.push(participant);
  }
  if (session.participants.length >= 2) {
    session.status = 'active';
  } else {
    session.status = 'active'; // even one joiner activates for simplicity
  }

  res.json({
    session_id: session.id,
    status: session.status,
    participants: session.participants,
  });
};
