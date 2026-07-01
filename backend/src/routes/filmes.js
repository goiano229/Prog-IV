const express = require('express');
const { getDb } = require('../db');
const autenticar = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const filmes = getDb().prepare('SELECT * FROM filmes ORDER BY ordem ASC').all();
  res.json(filmes);
});

router.get('/:id', (req, res) => {
  const filme = getDb().prepare('SELECT * FROM filmes WHERE id = ?').get(req.params.id);
  if (!filme) return res.status(404).json({ erro: 'Filme nao encontrado.' });
  res.json(filme);
});

router.post('/', autenticar, (req, res) => {
  const { titulo, conteudo, imagem, ordem } = req.body;

  if (!titulo || !conteudo || !imagem) {
    return res.status(400).json({ erro: 'titulo, conteudo e imagem sao obrigatorios.' });
  }

  const resultado = getDb()
    .prepare('INSERT INTO filmes (titulo, conteudo, imagem, ordem) VALUES (?, ?, ?, ?)')
    .run(titulo, conteudo, imagem, ordem ?? 0);

  const criado = getDb().prepare('SELECT * FROM filmes WHERE id = ?').get(resultado.lastInsertRowid);
  res.status(201).json(criado);
});

router.put('/:id', autenticar, (req, res) => {
  const db = getDb();
  const filme = db.prepare('SELECT * FROM filmes WHERE id = ?').get(req.params.id);
  if (!filme) return res.status(404).json({ erro: 'Filme nao encontrado.' });

  const { titulo, conteudo, imagem, ordem } = req.body;

  db.prepare(`
    UPDATE filmes SET
      titulo   = COALESCE(?, titulo),
      conteudo = COALESCE(?, conteudo),
      imagem   = COALESCE(?, imagem),
      ordem    = COALESCE(?, ordem)
    WHERE id = ?
  `).run(titulo ?? null, conteudo ?? null, imagem ?? null, ordem ?? null, req.params.id);

  res.json(db.prepare('SELECT * FROM filmes WHERE id = ?').get(req.params.id));
});

router.delete('/:id', autenticar, (req, res) => {
  const db = getDb();
  const filme = db.prepare('SELECT id FROM filmes WHERE id = ?').get(req.params.id);
  if (!filme) return res.status(404).json({ erro: 'Filme nao encontrado.' });

  db.prepare('DELETE FROM filmes WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

module.exports = router;
