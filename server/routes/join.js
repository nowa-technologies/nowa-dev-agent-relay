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
  session.status = 'active';

  const other = session.participants.filter(p => p !== participant);

  res.json({
    session_id: session.id,
    status: session.status,
    your_name: participant || null,
    other_agent: other.length > 0 ? other[0] : null,
    participants: session.participants,
  });
};
