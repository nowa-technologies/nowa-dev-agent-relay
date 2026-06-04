const { createSession } = require('../sessions');

module.exports = (req, res) => {
  const session = createSession();
  res.json({
    session_id: session.id,
    invite_code: session.invite_code,
    status: session.status,
    expires_at: session.expires_at,
  });
};
