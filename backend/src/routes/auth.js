const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db');

const router = express.Router();

router.post('/registrar', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ erro: 'username e password sao obrigatorios.' });
  }

  const db = getDb();
  const existente = db.prepare('SELECT id FROM usuarios WHERE username = ?').get(username);
  if (existente) {
    return res.status(409).json({ erro: 'Usuario ja existe.' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const resultado = db.prepare('INSERT INTO usuarios (username, password) VALUES (?, ?)').run(username, hash);

  res.status(201).json({ id: resultado.lastInsertRowid, username });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ erro: 'username e password sao obrigatorios.' });
  }

  const db = getDb();
  const usuario = db.prepare('SELECT * FROM usuarios WHERE username = ?').get(username);
  if (!usuario || !bcrypt.compareSync(password, usuario.password)) {
    return res.status(401).json({ erro: 'Credenciais invalidas.' });
  }

  const token = jwt.sign(
    { id: usuario.id, username: usuario.username },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({ token });
});

module.exports = router;
