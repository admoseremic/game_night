# Cloudflare Proxy Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Front `gamenight.trevorwithdata.com` with Cloudflare's free proxy so same-ISP-subnet visitors stop blackholing, without changing behavior of any other record on the domain.

**Architecture:** Full DNS zone moves from Namecheap BasicDNS to a Cloudflare free zone (already created). All records stay DNS-only except `gamenight`, which gets proxied after an SSE-heartbeat change ships to the origin. A tiny cron replaces Namecheap Dynamic DNS using the same Cloudflare API token.

**Tech Stack:** Cloudflare API v4 (curl + bash), Node 20 `node:test` for the server change, existing Docker/Caddy stack untouched.

## Global Constraints

- Cloudflare zone ID: `7b25959344a785197f1175ec4e5e9c77`; assigned NS: `leonidas.ns.cloudflare.com`, `zariyah.ns.cloudflare.com`.
- API token lives at `/home/trevor/.cloudflare/token` (mode 600). Never commit it; never echo it into logs. Load with `TOKEN=$(cat /home/trevor/.cloudflare/token)`.
- Origin IP for A records: `64.32.60.10`. Apex/`www`/`ai`/`blog` belong to Vercel — never proxy (grey cloud) and never edit.
- Deliberately NOT migrated (per approved spec): the 5 `eforward*` MX records and the `spf.efwd.registrar-servers.com` TXT (Namecheap email forwarding, confirmed unused; two `v=spf1` at one name is invalid SPF anyway).
- Nothing here is deployed automatically: server changes reach production only via `git push` + `./deploy.sh` on this box (project rule).
- The screenshots in `screenshots/` contain a Namecheap DDNS password — they must never be committed.

---

### Task 1: Create the DNS record manifest and push it to the Cloudflare zone

**Files:**
- Create: `infra/cloudflare/dns-records.json` (the migrated zone, for provenance/disaster recovery)
- Create: `infra/cloudflare/push-records.sh`

**Interfaces:**
- Produces: a populated Cloudflare zone whose answers (via `leonidas.ns.cloudflare.com`) match Namecheap's for every migrated record; Task 3 flips NS on the strength of Task 2's diff.

- [ ] **Step 1: Write the manifest** — exact content of `infra/cloudflare/dns-records.json` (ttl 1 = "automatic"; every record grey-cloud for the flip; `gamenight` goes orange later in Task 6):

```json
[
  {"type":"A","name":"trevorwithdata.com","content":"216.198.79.1","ttl":1,"proxied":false},
  {"type":"A","name":"chess.trevorwithdata.com","content":"64.32.60.10","ttl":1,"proxied":false},
  {"type":"A","name":"gamenight.trevorwithdata.com","content":"64.32.60.10","ttl":1,"proxied":false},
  {"type":"A","name":"home.trevorwithdata.com","content":"64.32.60.10","ttl":1,"proxied":false},
  {"type":"CNAME","name":"_1e317bb9fe5269fc405f277d83697a6e.trevorwithdata.com","content":"5249ED55FA83B88E4797431BB8EB91AE.56E7DC5C9131165515A10CA6308B430F.663f7bf606a6c.comodoca.com","ttl":1,"proxied":false},
  {"type":"CNAME","name":"_690ab41e82facb8ce1fa94a7e4c5e44b.trevorwithdata.com","content":"F8913D729406056D5306E37292C419D1.7F0AE3B2BAEFECB2A17DD6C58E704F61.663119a176fac.comodoca.com","ttl":1,"proxied":false},
  {"type":"CNAME","name":"_8af30dba66548cda0a4dc2bc896ce2ff.trevorwithdata.com","content":"a11c5797fa9edb00bdfb52e53277c3d6.4f8b323e41cb60a4bc6055b190addbfb.comodoca.com","ttl":1,"proxied":false},
  {"type":"CNAME","name":"_fdb365971b40b47936de0e4fc349fdc0.trevorwithdata.com","content":"4E6A240C158A99FB8A6FF8928DB9F460.B5C57AFE25C6045B95F724B666805F83.644d96cb76f69.comodoca.com","ttl":1,"proxied":false},
  {"type":"CNAME","name":"7ql7seayy4da.trevorwithdata.com","content":"gv-5gaoq2qpngj674.dv.googlehosted.com","ttl":1,"proxied":false},
  {"type":"CNAME","name":"ai.trevorwithdata.com","content":"580bd851859ebee0.vercel-dns-017.com","ttl":1,"proxied":false},
  {"type":"CNAME","name":"blog.trevorwithdata.com","content":"6eaf36a0b451d73c.vercel-dns-017.com","ttl":1,"proxied":false},
  {"type":"CNAME","name":"firebase1._domainkey.trevorwithdata.com","content":"mail-trevorwithdata-com.dkim1._domainkey.firebasemail.com","ttl":1,"proxied":false},
  {"type":"CNAME","name":"firebase2._domainkey.trevorwithdata.com","content":"mail-trevorwithdata-com.dkim2._domainkey.firebasemail.com","ttl":1,"proxied":false},
  {"type":"CNAME","name":"health.trevorwithdata.com","content":"health-tracker-4075c.web.app","ttl":1,"proxied":false},
  {"type":"CNAME","name":"metrics.trevorwithdata.com","content":"8f99160e571fc0427f000101.data.adobedc.net","ttl":1,"proxied":false},
  {"type":"CNAME","name":"pm.trevorwithdata.com","content":"pm-kanban.web.app","ttl":1,"proxied":false},
  {"type":"CNAME","name":"summit2025.trevorwithdata.com","content":"summit-games-a1f9f.web.app","ttl":1,"proxied":false},
  {"type":"CNAME","name":"www.trevorwithdata.com","content":"85426a52a5fb3bfd.vercel-dns-017.com","ttl":1,"proxied":false},
  {"type":"TXT","name":"trevorwithdata.com","content":"v=spf1 include:_spf.firebasemail.com ~all","ttl":1,"proxied":false},
  {"type":"TXT","name":"trevorwithdata.com","content":"firebase=trevorlytics-54a04","ttl":1,"proxied":false},
  {"type":"TXT","name":"_atproto.trevorwithdata.com","content":"did=did:plc:3ylanrz2myw2yr65vrr36qo4","ttl":1,"proxied":false}
]
```

- [ ] **Step 2: Write `infra/cloudflare/push-records.sh`**

```bash
#!/usr/bin/env bash
# One-shot: push infra/cloudflare/dns-records.json into the Cloudflare zone.
# Idempotent-ish: skips a record if an identical (type,name,content) already exists.
# Token: ~/.cloudflare/token (Zone.DNS Edit). See docs/superpowers/specs/2026-07-04-cloudflare-proxy-design.md.
set -euo pipefail
ZONE=7b25959344a785197f1175ec4e5e9c77
TOKEN=$(cat /home/trevor/.cloudflare/token)
API=https://api.cloudflare.com/client/v4
DIR="$(cd "$(dirname "$0")" && pwd)"

jq -c '.[]' "$DIR/dns-records.json" | while read -r rec; do
  type=$(jq -r .type <<<"$rec"); name=$(jq -r .name <<<"$rec"); content=$(jq -r .content <<<"$rec")
  exists=$(curl -s -H "Authorization: Bearer $TOKEN" \
    "$API/zones/$ZONE/dns_records?type=$type&name=$name" | jq --arg c "$content" '[.result[]|select(.content==$c)]|length')
  if [ "$exists" -gt 0 ]; then echo "SKIP  $type $name (already present)"; continue; fi
  ok=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    "$API/zones/$ZONE/dns_records" -d "$rec" | jq -r .success)
  echo "$([ "$ok" = true ] && echo CREATE || echo FAIL!)  $type $name"
done
```

- [ ] **Step 3: Run it** — `chmod +x infra/cloudflare/push-records.sh && ./infra/cloudflare/push-records.sh`
Expected: 21 lines, all `CREATE` (or `SKIP` on re-run), zero `FAIL!`.

- [ ] **Step 4: Commit**

```bash
git add infra/cloudflare/dns-records.json infra/cloudflare/push-records.sh
git commit -m "feat(infra): Cloudflare DNS zone manifest + push script"
```

### Task 2: Verify the Cloudflare zone answers match Namecheap, record for record

**Files:** none (read-only gate)

**Interfaces:**
- Consumes: populated zone from Task 1.
- Produces: a clean diff — the go/no-go gate for the user's NS flip in Task 3.

- [ ] **Step 1: Diff every manifest record between the two authorities**

```bash
jq -r '.[] | .type + " " + .name' infra/cloudflare/dns-records.json | sort -u | while read -r type name; do
  old=$(dig +short "$type" "$name" @dns1.registrar-servers.com | sort)
  new=$(dig +short "$type" "$name" @leonidas.ns.cloudflare.com | sort)
  [ "$old" = "$new" ] && echo "OK    $type $name" || printf 'DIFF  %s %s\n  namecheap: %s\n  cloudflare: %s\n' "$type" "$name" "$old" "$new"
done
```
Expected: all `OK`. Known acceptable DIFFs: none (everything is grey-cloud at this stage). TXT quoting differences (`"..."`) are cosmetic only if byte-identical inside quotes.

- [ ] **Step 2: Confirm the two intentionally-dropped items are the ONLY missing data** — `dig +short MX trevorwithdata.com @dns1.registrar-servers.com` shows the 5 eforward MX (present at Namecheap, intentionally absent at Cloudflare); apex TXT at Cloudflare lacks only the `spf.efwd` string.

### Task 3: Nameserver flip (USER ACTION) and zone activation

**Files:** none

**Interfaces:**
- Consumes: clean diff from Task 2.
- Produces: `status:"active"` Cloudflare zone; DNS served by leonidas/zariyah.

- [ ] **Step 1 (USER):** Namecheap → Domain List → trevorwithdata.com → Manage → Nameservers → **Custom DNS** → `leonidas.ns.cloudflare.com`, `zariyah.ns.cloudflare.com` → save.
- [ ] **Step 2: Watch registry + activation** — `dig +short NS trevorwithdata.com @a.gtld-servers.net` until it shows the Cloudflare pair (registry updates within minutes). Cloudflare re-checks periodically; force with `curl -s -X PUT -H "Authorization: Bearer $TOKEN" $API/zones/$ZONE/activation_check`. Poll `curl -s -H "Authorization: Bearer $TOKEN" $API/zones/$ZONE | jq -r .result.status` until `active`.
- [ ] **Step 3: Public spot-checks** — `dig +short A gamenight.trevorwithdata.com` (still `64.32.60.10` — grey), `dig +short CNAME www.trevorwithdata.com` (Vercel), `curl -sI https://chess.trevorwithdata.com | head -1` and `curl -sI https://trevorwithdata.com | head -1` (both 200/30x as before).

### Task 4: SSE heartbeat (TDD)

**Files:**
- Modify: `server/src/events.js`
- Test: `server/src/events.test.js`

**Interfaces:**
- Consumes: `makeHub()` as used by `server/src/index.js` (signature unchanged; new optional `{heartbeatMs}` param, default 30000).
- Produces: every connected SSE client receives `: ping\n\n` each 30s so Cloudflare's ~100s idle timeout never fires.

- [ ] **Step 1: Write the failing tests** — append to `server/src/events.test.js`:

```js
test('heartbeat pings connected clients every 30s', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const hub = makeHub();
  const a = fakeReply();
  hub.add(a);
  t.mock.timers.tick(30_000);
  t.mock.timers.tick(30_000);
  const pings = a._chunks.filter((c) => c.startsWith(': ping'));
  assert.equal(pings.length, 2);
});

test('heartbeat stops when the last client leaves and resumes on re-add', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const hub = makeHub();
  const a = fakeReply();
  hub.add(a);
  a.raw.emit('close');
  t.mock.timers.tick(90_000);
  assert.equal(a._chunks.filter((c) => c.startsWith(': ping')).length, 0);
  const b = fakeReply();
  hub.add(b);
  t.mock.timers.tick(30_000);
  assert.equal(b._chunks.filter((c) => c.startsWith(': ping')).length, 1);
});
```

- [ ] **Step 2: Run to verify failure** — `cd server && npm test`
Expected: the two new tests FAIL (no pings written); the three existing tests still pass.

- [ ] **Step 3: Implement** — replace `server/src/events.js` with:

```js
// In-memory set of connected SSE clients + broadcast. See spec §13.
// Heartbeat: Cloudflare (and some proxies) sever idle connections after ~100s,
// so while at least one client is connected we write a `: ping` comment every
// 30s. The timer is stopped (and unref'd) whenever the room empties so an idle
// server — or the test runner — is never kept alive by a dangling interval.
export function makeHub({ heartbeatMs = 30_000 } = {}) {
  const clients = new Set();
  let beat = null;
  const stopIfEmpty = () => {
    if (beat && clients.size === 0) { clearInterval(beat); beat = null; }
  };
  const startBeat = () => {
    if (beat) return;
    beat = setInterval(() => {
      for (const reply of clients) {
        try { reply.raw.write(': ping\n\n'); } catch { clients.delete(reply); }
      }
      stopIfEmpty();
    }, heartbeatMs);
    beat.unref?.();
  };
  return {
    add(reply) {
      reply.raw.write(': connected\n\n'); // SSE preamble / keep-alive comment
      clients.add(reply);
      startBeat();
      reply.raw.on('close', () => { clients.delete(reply); stopIfEmpty(); });
    },
    broadcast(eventName) {
      const payload = `event: ${eventName}\ndata: {"type":"${eventName}"}\n\n`;
      for (const reply of clients) {
        try { reply.raw.write(payload); } catch { clients.delete(reply); }
      }
      stopIfEmpty();
    },
    count() { return clients.size; },
  };
}
```

- [ ] **Step 4: Run tests** — `cd server && npm test`. Expected: all 5 events tests PASS (and the rest of the suite untouched).
- [ ] **Step 5: Commit** — `git add server/src/events.js server/src/events.test.js && git commit -m "feat(sse): 30s heartbeat so proxies don't sever idle streams"`

### Task 5: Deploy heartbeat to the origin and verify live

**Files:** none (uses existing `deploy.sh`)

- [ ] **Step 1:** `git push && ./deploy.sh` (manual deploy per project rule).
- [ ] **Step 2: Verify pings on the live stream** — `timeout 70 curl -sN https://gamenight.trevorwithdata.com/api/events | cat -A | head` Expected: `: connected` immediately, then `: ping` at ~30s and ~60s.

### Task 6: Turn on the proxy for gamenight

**Files:** none (API calls)

- [ ] **Step 1: SSL mode Full (strict)** — `curl -s -X PATCH -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' $API/zones/$ZONE/settings/ssl -d '{"value":"strict"}' | jq -r '.success'` → `true`.
- [ ] **Step 2: Orange-cloud gamenight** — get the record id: `RID=$(curl -s -H "Authorization: Bearer $TOKEN" "$API/zones/$ZONE/dns_records?name=gamenight.trevorwithdata.com&type=A" | jq -r '.result[0].id')`, then `curl -s -X PATCH -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' $API/zones/$ZONE/dns_records/$RID -d '{"proxied":true}' | jq -r .success` → `true`.
- [ ] **Step 3: Verify through the proxy** — `dig +short gamenight.trevorwithdata.com` now returns Cloudflare edge IPs (104./172./188. ranges, NOT 64.32.60.10); `curl -s https://gamenight.trevorwithdata.com/api/state | head -c 80` returns JSON; `timeout 150 curl -sN https://gamenight.trevorwithdata.com/api/events | head` stays connected past 100s with pings flowing; `curl -sI https://gamenight.trevorwithdata.com | grep -i 'cf-ray'` proves CF is in path. Confirm `chess` still resolves to `64.32.60.10` direct.
- [ ] **Step 4: App-level test** — open the app on a phone, log a fake play, watch a second device update via SSE, then delete the play.

### Task 7: Replace Namecheap Dynamic DNS with a Cloudflare updater

**Files:**
- Create: `infra/cloudflare/update-ip.sh`
- Modify: crontab on this box (`crontab -e` equivalent via `crontab -l | ... | crontab -`)

**Interfaces:**
- Consumes: same token file; zone ID as above.
- Produces: `chess`/`home`/`gamenight` A records track the home public IP if the ISP ever changes it. (Ubiquiti's Namecheap DDNS entry goes inert at NS flip; USER disables it in UniFi → Settings → Internet → WAN → Dynamic DNS whenever convenient.)

- [ ] **Step 1: Write `infra/cloudflare/update-ip.sh`**

```bash
#!/usr/bin/env bash
# Keep home-IP A records in Cloudflare current (replaces Namecheap Dynamic DNS,
# which died when the domain moved to Cloudflare nameservers on 2026-07-04).
# Cron: every 15 min. Only writes when the public IP actually changed.
set -euo pipefail
ZONE=7b25959344a785197f1175ec4e5e9c77
TOKEN=$(cat /home/trevor/.cloudflare/token)
API=https://api.cloudflare.com/client/v4
HOSTS="chess.trevorwithdata.com home.trevorwithdata.com gamenight.trevorwithdata.com"

IP=$(curl -s --max-time 10 https://api.ipify.org)
[[ "$IP" =~ ^[0-9.]+$ ]] || { echo "bad IP lookup: $IP" >&2; exit 1; }

for host in $HOSTS; do
  rec=$(curl -s -H "Authorization: Bearer $TOKEN" "$API/zones/$ZONE/dns_records?type=A&name=$host")
  current=$(jq -r '.result[0].content' <<<"$rec"); rid=$(jq -r '.result[0].id' <<<"$rec")
  if [ "$current" != "$IP" ]; then
    curl -s -X PATCH -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
      "$API/zones/$ZONE/dns_records/$rid" -d "{\"content\":\"$IP\"}" >/dev/null
    echo "$(date '+%F %T') updated $host: $current -> $IP"
  fi
done
```

- [ ] **Step 2: Dry-run** — `chmod +x infra/cloudflare/update-ip.sh && ./infra/cloudflare/update-ip.sh` Expected: no output (IP unchanged), exit 0.
- [ ] **Step 3: Install cron** — `(crontab -l; echo '*/15 * * * * /home/trevor/game_night/infra/cloudflare/update-ip.sh >> /home/trevor/docker/game-night/cf-ddns.log 2>&1') | crontab -` then `crontab -l` to confirm.
- [ ] **Step 4: Commit** — `git add infra/cloudflare/update-ip.sh && git commit -m "feat(infra): Cloudflare IP updater cron (replaces Namecheap DDNS)"`

### Task 8: Acceptance, hygiene, and documentation

**Files:**
- Modify: `.gitignore`, `CLAUDE.md`
- Modify: memory files under `/home/trevor/.claude/projects/-home-trevor-game-night/memory/`

- [ ] **Step 1: THE acceptance test (USER + friend):** friend opens the app on his home WiFi — data loads. Also re-test from cellular and from this LAN.
- [ ] **Step 2: Keep secrets out of git** — `echo 'screenshots/' >> .gitignore` (they contain the Namecheap DDNS password); `git status` must show screenshots/ ignored, never staged.
- [ ] **Step 3: Update `CLAUDE.md`** — in Deploy/Gotchas: DNS now hosted at Cloudflare (token at `~/.cloudflare/token`, zone ID above); gamenight is proxied (SSE survives via 30s heartbeat; Cloudflare idle limit ~100s); cert renewals now happen through the proxy — if Caddy renewal fails, switch origin to a Cloudflare Origin CA cert; IP updater cron replaces router DDNS.
- [ ] **Step 4: Update memories** — `game-night-isp-subnet-blackhole.md`: resolved via CF proxy on 2026-07-04; new memory for Cloudflare zone/token/DDNS-cron facts.
- [ ] **Step 5: Commit docs** — `git add .gitignore CLAUDE.md && git commit -m "docs: record Cloudflare proxy cutover"`
- [ ] **Step 6 (USER, later):** disable the Namecheap DDNS entry on the Ubiquiti; optionally delete/rotate the Cloudflare token ONLY IF the updater cron is re-pointed at a narrower replacement token (the cron depends on it — don't delete blindly).
