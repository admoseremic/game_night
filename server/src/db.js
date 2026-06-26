// SQLite connection + schema. One file is the whole database; see spec §4.
import Database from 'better-sqlite3';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY, name TEXT NOT NULL,
  regular INTEGER NOT NULL DEFAULT 1, c1 TEXT NOT NULL, c2 TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY, name TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'Medium', dir TEXT NOT NULL DEFAULT 'high', icon TEXT NOT NULL DEFAULT '🎲'
);
CREATE TABLE IF NOT EXISTS plays (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id),
  played_at TEXT NOT NULL,
  parts TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_plays_played_at ON plays(played_at);
CREATE INDEX IF NOT EXISTS idx_plays_game_id ON plays(game_id);
`;

export function openDb(path = process.env.DB_PATH || ':memory:') {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}
