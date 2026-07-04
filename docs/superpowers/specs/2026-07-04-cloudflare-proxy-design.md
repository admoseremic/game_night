# Cloudflare Proxy for gamenight.trevorwithdata.com — Design

**Date:** 2026-07-04
**Status:** Approved (Trevor, in-session)

## Problem

A friend on Trevor's own ISP cannot reach the app from his home WiFi. His public IP
(64.32.60.90) and the server (64.32.60.10) sit on the same ISP /24; both routers treat
the subnet as on-link and ARP directly, and the ISP's client isolation silently drops
customer↔customer traffic (verified: `ping 64.32.60.90` from the box returns
"Destination Host Unreachable from 64.32.60.10" — the router's own failed ARP).
This affects **every customer of the ISP on that segment**, not just one friend.

## Solution

Put Cloudflare's free proxy in front of `gamenight` only. The domain then resolves to
Cloudflare edge IPs (never on-link for ISP neighbors); Cloudflare fetches from the
origin over a normally-routed path. $0, no new servers, app stays on the home box.

## Design

### 1. Scope
- Only `gamenight.trevorwithdata.com` is proxied (orange cloud).
- Every other record migrates verbatim and stays DNS-only (grey cloud): apex A →
  Vercel (216.198.79.1), `www` CNAME → Vercel, `chess` A → 64.32.60.10, 5 MX
  (Namecheap eforward — inert after the move, unused per Trevor), 3 TXT
  (firebase verification + 2 SPF), plus anything else found in the Namecheap export.

### 2. Zone migration (verify-before-flip)
1. Add `trevorwithdata.com` to the Cloudflare account (free plan) — done via API
   with a token Trevor creates. Cloudflare assigns two nameservers.
2. Source of truth for records: the full table copied from Namecheap Advanced DNS
   (Trevor provides). The dig-based inventory above is the cross-check.
3. Recreate all records in the Cloudflare zone via API.
4. **Gate:** query Cloudflare's assigned nameservers directly and diff every record
   against Namecheap's live answers. Flip only on a clean diff.

### 3. Nameserver switch
At Namecheap (Trevor, in the dashboard): Domain → Nameservers → Custom DNS → the two
Cloudflare nameservers. Identical record sets make propagation timing a non-event.
Known casualty: Namecheap email forwarding stops working on custom NS — accepted
(unused). Cloudflare Email Routing is the free replacement if ever wanted.

### 4. Cloudflare zone settings
- SSL/TLS mode: **Full (strict)** — origin has a valid Let's Encrypt cert via Caddy.
- Everything else default. No cache rules (CF doesn't cache HTML/JSON by default;
  `index.html` is already `no-store` from the server).
- Watch-item: Caddy's next cert renewal happens through the proxy (HTTP-01 normally
  passes). If a renewal ever fails, switch the origin to a 15-year Cloudflare
  Origin CA cert instead of debugging renewals.

### 5. App change: SSE heartbeat
Cloudflare severs idle connections at ~100s; the SSE stream writes only on mutations.
Add a 30s `: ping\n\n` comment broadcast to `makeHub()` in `server/src/events.js`:
the interval starts when the client count goes 0→1 and is cleared when the last
client disconnects (an always-on timer would also keep the `node --test` process
alive). Test-driven in `server/src/events.test.js`. Without it the app
still works (EventSource auto-reconnects), but connections churn every ~100s.

### 6. Verification (acceptance)
- `dig gamenight.trevorwithdata.com` returns Cloudflare edge IPs; site serves.
- Log-a-play on one device → second device updates via SSE push (through CF).
- `chess`, apex, and `www` resolve exactly as before; those sites unaffected.
- **The real test:** the friend's WiFi loads the full app data.

### 7. Rollback (both instant)
- Tier 1: grey-cloud the `gamenight` record → traffic goes direct to 64.32.60.10
  again (today's behavior exactly).
- Tier 2: revert Namecheap to BasicDNS (original records still there).

## Alternatives considered

- **Migrate to GCP free-tier e2-micro** (fully designed, shelved): solves the same
  problem by moving the app off the subnet, adds off-home-box uptime, but costs
  hours of migration + a VM to maintain + an unresolved ~$3.65/mo external-IPv4
  ambiguity. Revisit if hosting independence becomes a goal; the Cloudflare front
  makes a later cutover easier (instant DNS flips), so nothing is wasted.
- **Fix at the ISP** (proxy-ARP/hairpin on the segment): the "right" fix, out of our
  control; can still be requested in parallel.
- **Static route on the friend's router**: fixes one household at best, uncertain.
