// Pure markdown renderer for GET /export — the monthly digest an LLM web-fetches
// to write the Game Night newsletter (for Claudes that can't use MCP connectors,
// e.g. locked-down work laptops). ALL stat math comes from mcp-tools.js and the
// client's stats.js — this file only formats, so digest numbers always match the
// app. Spec: docs/superpowers/specs/2026-07-06-export-digest-design.md
import { leaderboard, currentStreak } from '../../client/src/lib/stats.js';
import { getPlays, getRecords } from './mcp-tools.js';

export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

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

export function renderDigest(data, { month, now = new Date() } = {}) {
  const m = month || prevMonthOf(now);
  const monthPlays = data.plays.filter(p => localYM(p.d) === m);
  const records = getRecords(data, {}).records;
  // "Broken this month" = the CURRENT all-time record was set inside the month.
  // (A record set and then re-broken later won't show in the earlier month.)
  const newRecords = records.filter(r => localYM(r.date) === m);
  const streaks = data.players
    .map(p => ({ name: p.name, streak: currentStreak(data.plays, p.id) }))
    .filter(s => s.streak >= 2).sort((a, b) => b.streak - a.streak);
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

How to read this data:

- Each play lists players in finishing order; **rank 1 is the winner**.
- **Weighted wins**: a win counts its game's tier weight — Light 0.5, Medium 1.0, Heavy 1.5.
- Each game has a score direction: some count highest score as best, some lowest.
- Scores are optional — plays without scores still count for wins; they just can't set records.

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

${streaks.length ? streaks.map(s => `- ${s.name}: ${s.streak} wins in a row`).join('\n') : 'No active streaks of 2+ wins.'}

---

For a different month: ${SITE}/export/YYYY-MM (e.g. ${SITE}/export/2026-05).
Full raw dataset as JSON: ${SITE}/api/state
`;
}

// The previous month's digest as an HTML-escaped hidden <div>, for embedding
// in the served app shell (GET / in server/src/index.js): ONE fetch of the
// main URL hands any AI the data without knowing /export. Escaping makes the
// text inert — player/game names can never break the page.
// HIDING MECHANISM MATTERS: readability-style extractors (claude.ai's consumer
// web fetch, Mozilla Readability) DROP nodes with inline style="display:none"
// or aria-hidden="true", but never apply stylesheets — so we hide via the
// .ai-readable class declared in client/index.html's <style>. Invisible to
// humans and screen readers, extractable by AI fetchers. Do not "fix" this
// back to inline hiding. Spec: docs/superpowers/specs/2026-07-06-embedded-digest-design.md
const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export function digestHtmlFragment(data, { now = new Date() } = {}) {
  return `<div class="ai-readable">\n${escapeHtml(renderDigest(data, { now }))}\n</div>`;
}
