const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/session/create', require('./routes/create'));
app.post('/session/join/:invite_code', require('./routes/join'));
app.post('/session/:id/message', require('./routes/message'));
app.get('/session/:id/messages', require('./routes/messages'));
app.get('/session/:id', require('./routes/session'));
app.post('/session/:id/close', require('./routes/close'));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Agent relay listening on port ${PORT}`));
