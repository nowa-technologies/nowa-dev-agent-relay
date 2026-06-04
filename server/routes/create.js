const { createSession } = require('../sessions');

module.exports = (req, res) => {
  const { participant } = req.body || {};
  const session = createSession();

  if (participant) {
    session.participants.push(participant);
  }

  res.json({
    session_id: session.id,
    invite_code: session.invite_code,
    status: session.status,
    your_name: participant || null,
    participants: session.participants,
    expires_at: session.expires_at,
  });
};
