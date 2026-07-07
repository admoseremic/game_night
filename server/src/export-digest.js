// Pure markdown renderer for GET /export — the monthly digest an LLM web-fetches
// to write the Game Night newsletter (for Claudes that can't use MCP connectors,
// e.g. locked-down work laptops). ALL stat math comes from mcp-tools.js and the
// client's stats.js — this file only formats, so digest numbers always match the
// app. Spec: docs/superpowers/specs/2026-07-06-export-digest-design.md
import { leaderboard, currentStreak } from '../../client/src/lib/stats.js';
import { getPlays, getRecords } from './mcp-tools.js';

export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
export const YEAR_RE = /^\d{4}$/;

const SITE = 'https://gamenight.trevorwithdata.com';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

// 'YYYY-MM' of the calendar month before `now` — the default digest window
// (the newsletter is written just after month end).
export function prevMonthOf(now) {
  const y = now.getFullYear(), m = now.getMonth(); // m is 0-based
  return m === 0 ? `${y - 1}-12` : `${y}-${String(m).padStart(2, '0')}`;
}

const label = (month) => `${MONTHS[Number(month.slice(5)) - 1]} ${month.slice(0, 4)}`;

// LOCAL-time month/date of a stored play date — the same bucketing the app uses
// (stats.js inPeriod does new Date(play.d) + getMonth() in local time). Stored
// dates are mixed: migrated plays are UTC instants ('...T05:59:00.000Z') that can
// fall on the previous LOCAL day, app-created ones are zoneless local
// ('2026-06-28T23:58'). String-prefix slicing put evening UTC plays in the wrong
// day/month, making the digest disagree with the app. The production container
// runs TZ=America/Denver (compose), matching the players' timezone.
const pad = (n) => String(n).padStart(2, '0');
const localYM = (s) => { const d = new Date(s); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
const localYMD = (s) => { const d = new Date(s); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

// One play as a log line: "- 2026-06-02 — Brass: 1. Sam (120) · 2. Trevor (100)"
const playLine = (p) => `- ${localYMD(p.date)} — ${p.game}: ` +
  p.results.map(r => `${r.rank}. ${r.player}${r.score == null ? '' : ` (${r.score})`}`).join(' · ');

// Leaderboard rows (client stats.js shape) as a markdown table.
function table(rows) {
  const out = ['| # | Player | Plays | Wins | Weighted wins | Win % | Last places |',
    '|---|--------|-------|------|---------------|-------|-------------|'];
  for (const r of rows) out.push(`| ${r.rank} | ${r.name} | ${r.plays} | ${r.wins} | ${r.wwinsStr} | ${r.winPct}% | ${r.losses} |`);
  return out.join('\n');
}

// Shared "how to read" preamble + current-streaks section (the streaks are
// CURRENT as of now for both renderers, even on historical periods).
const LEGEND = `How to read this data:

- Each play lists players in finishing order; **rank 1 is the winner**.
- **Weighted wins**: a win counts its game's tier weight — Light 0.5, Medium 1.0, Heavy 1.5.
- Each game has a score direction: some count highest score as best, some lowest.
- Scores are optional — plays without scores still count for wins; they just can't set records.`;

const currentStreaks = (data) => data.players
  .map(p => ({ name: p.name, streak: currentStreak(data.plays, p.id) }))
  .filter(s => s.streak >= 2).sort((a, b) => b.streak - a.streak);

const streaksSection = (streaks) => streaks.length
  ? streaks.map(s => `- ${s.name}: ${s.streak} wins in a row`).join('\n')
  : 'No active streaks of 2+ wins.';

export function renderDigest(data, { month, now = new Date() } = {}) {
  const m = month || prevMonthOf(now);
  const monthPlays = data.plays.filter(p => localYM(p.d) === m);
  const records = getRecords(data, {}).records;
  // "Broken this month" = the CURRENT all-time record was set inside the month.
  // (A record set and then re-broken later won't show in the earlier month.)
  const newRecords = records.filter(r => localYM(r.date) === m);
  const streaks = currentStreaks(data);
  const none = `No plays recorded in ${label(m)}.`;

  // Feed getPlays the already-bucketed plays (its since/until args compare raw
  // date strings, which would re-introduce the UTC-vs-local mismatch).
  // getPlays returns newest-first; a newsletter log reads oldest-first.
  const monthLog = getPlays({ ...data, plays: monthPlays }, { limit: 200 });
  const chrono = [...monthLog.plays].reverse();

  // Year-to-date THROUGH the digest month (not through "now"), so historical
  // months render the standings as that year stood at the time.
  const ytdPlays = data.plays.filter(p => {
    const ym = localYM(p.d);
    return ym.slice(0, 4) === m.slice(0, 4) && ym <= m;
  });

  return `# Game Night — Monthly Digest: ${label(m)}

Generated ${localYMD(now)} from live data at ${SITE}.

${LEGEND}

## ${label(m)} leaderboard

${monthPlays.length ? table(leaderboard(data, monthPlays, 'wins')) : none}

## ${label(m)} play log (${monthPlays.length} plays)

${chrono.length ? chrono.map(playLine).join('\n') : none}

## All-time records broken in ${label(m)}

${newRecords.length
    ? newRecords.map(r => `- 🆕 **${r.game}**: ${r.score} by ${r.holder} on ${localYMD(r.date)}`).join('\n')
    : 'None.'}

## ${m.slice(0, 4)} year-to-date leaderboard (through ${MONTHS[Number(m.slice(5)) - 1]})

${ytdPlays.length ? table(leaderboard(data, ytdPlays, 'wins')) : `No plays recorded in ${m.slice(0, 4)} up to ${MONTHS[Number(m.slice(5)) - 1]}.`}

## Current win streaks

${streaksSection(streaks)}

---

For a different month: ${SITE}/export/YYYY-MM (e.g. ${SITE}/export/2026-05).
Whole-year summary: ${SITE}/export/YYYY (e.g. ${SITE}/export/${m.slice(0, 4)}).
Full raw dataset as JSON: ${SITE}/api/state
`;
}

// Year summary for GET /export/YYYY — aggregates only, NO play-by-play log
// (a full year is hundreds of plays; the monthly URLs carry the logs).
// Same local-time bucketing (localYM) and same stats.js math as the digest.
// Spec: docs/superpowers/specs/2026-07-07-year-summary-design.md
export function renderYearSummary(data, { year, now = new Date() } = {}) {
  const y = year || prevMonthOf(now).slice(0, 4);
  const yearPlays = data.plays.filter(p => localYM(p.d).slice(0, 4) === y);
  const newRecords = getRecords(data, {}).records.filter(r => localYMD(r.date).slice(0, 4) === y);
  const none = `No plays recorded in ${y}.`;

  // Monthly champions: per month with plays, everyone tied for most raw wins
  // (leaderboard() ranks sequentially, so ties are detected by win count).
  const champRows = [];
  for (let i = 1; i <= 12; i++) {
    const mPlays = yearPlays.filter(p => localYM(p.d) === `${y}-${pad(i)}`);
    if (!mPlays.length) continue;
    const rows = leaderboard(data, mPlays, 'wins');
    const champs = rows.filter(r => r.wins === rows[0].wins).map(r => r.name).join(' & ');
    champRows.push(`| ${MONTHS[i - 1]} | ${champs} | ${mPlays.length} |`);
  }
  const champTable = ['| Month | Champion | Plays |', '|-------|----------|-------|', ...champRows].join('\n');

  // Most-played games, top 10; ties broken by name so output is deterministic.
  const counts = {};
  for (const p of yearPlays) counts[p.g] = (counts[p.g] || 0) + 1;
  const mostPlayed = Object.entries(counts)
    .map(([gid, n]) => ({ name: data.games.find(g => g.id === gid).name, n }))
    .sort((a, b) => (b.n - a.n) || a.name.localeCompare(b.name))
    .slice(0, 10);
  const gamesTable = ['| Game | Plays |', '|------|-------|',
    ...mostPlayed.map(g => `| ${g.name} | ${g.n} |`)].join('\n');

  return `# Game Night — Year Summary: ${y}

Generated ${localYMD(now)} from live data at ${SITE}.

${LEGEND}

## ${y} leaderboard

${yearPlays.length ? table(leaderboard(data, yearPlays, 'wins')) : none}

## Monthly champions

${champRows.length ? champTable : none}

## Most-played games

${mostPlayed.length ? gamesTable : none}

## All-time records broken in ${y}

${newRecords.length
    ? newRecords.map(r => `- 🆕 **${r.game}**: ${r.score} by ${r.holder} on ${localYMD(r.date)}`).join('\n')
    : 'None.'}

## Current win streaks

${streaksSection(currentStreaks(data))}

---

Monthly detail (leaderboard + full play log): ${SITE}/export/YYYY-MM (e.g. ${SITE}/export/${y}-05).
Other years: ${SITE}/export/YYYY. Full raw dataset as JSON: ${SITE}/api/state
`;
}
