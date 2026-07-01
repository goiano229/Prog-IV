const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'database.sqlite');

let db;

function getDb() {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    initSchema(db);
  }
  return db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      username  TEXT    NOT NULL UNIQUE,
      password  TEXT    NOT NULL,
      criado_em TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS filmes (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo    TEXT    NOT NULL,
      conteudo  TEXT    NOT NULL,
      imagem    TEXT    NOT NULL,
      ordem     INTEGER NOT NULL DEFAULT 0,
      criado_em TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, closeDb };
