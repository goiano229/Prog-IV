require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const filmesRoutes = require('./routes/filmes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/auth', authRoutes);
app.use('/filmes', filmesRoutes);

app.use((_req, res) => res.status(404).json({ erro: 'Rota nao encontrada.' }));

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
}

module.exports = app;
