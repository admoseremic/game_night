// One-time migration: existing Firestore (game-night-trevorwithdata) -> SQLite. Spec §7.
// Usage: GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json DB_PATH=./server/data/gamenight.db \
//        node scripts/migrate-firestore-to-sqlite.mjs
import { openDb } from '../server/src/db.js';

export const NEWPAL = [
  ['#22D3EE', '#0EA5E9'], ['#A78BFA', '#7C3AED'], ['#F472B6', '#DB2777'], ['#FBBF24', '#F59E0B'],
  ['#4ADE80', '#16A34A'], ['#FB923C', '#EA580C'], ['#38BDF8', '#6366F1'], ['#F87171', '#DC2626'],
];

export function mapPlayer(doc, index, palette) {
  const d = doc.data();
  const pal = palette[index % palette.length];
  return { id: doc.id, name: d.name, regular: 1, c1: pal[0], c2: pal[1] };
}
export function mapGame(doc) {
  const d = doc.data();
  return { id: doc.id, name: d.name, tier: d.tier || 'Medium',
    dir: d.hi_score_wins === false ? 'low' : 'high', icon: d.icon || '🎲' };
}
export function mapPlay(doc) {
  const d = doc.data();
  const parts = (d.players || []).map(p => [p.player, p.rank, (p.score ?? null)]);
  return { id: doc.id, game_id: d.game, played_at: d.dateTime.toDate().toISOString(), parts: JSON.stringify(parts) };
}

async function main() {
  const admin = (await import('firebase-admin')).default;
  admin.initializeApp({ credential: admin.credential.applicationDefault() });
  const fs = admin.firestore();
  const db = openDb();

  const players = (await fs.collection('players').get()).docs;
  const games = (await fs.collection('games').get()).docs;
  const plays = (await fs.collection('plays').get()).docs;

  const insP = db.prepare('INSERT OR REPLACE INTO players(id,name,regular,c1,c2) VALUES(@id,@name,@regular,@c1,@c2)');
  const insG = db.prepare('INSERT OR REPLACE INTO games(id,name,tier,dir,icon) VALUES(@id,@name,@tier,@dir,@icon)');
  const insPl = db.prepare('INSERT OR REPLACE INTO plays(id,game_id,played_at,parts) VALUES(@id,@game_id,@played_at,@parts)');

  db.transaction(() => {
    players.forEach((doc, i) => insP.run(mapPlayer(doc, i, NEWPAL)));
    games.forEach(doc => insG.run(mapGame(doc)));
    plays.forEach(doc => insPl.run(mapPlay(doc)));
  })();

  console.log(`migrated: ${players.length} players, ${games.length} games, ${plays.length} plays`);
}

// Only run main() when executed directly (not when imported by tests).
if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error(e); process.exit(1); });
