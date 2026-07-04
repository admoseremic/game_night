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
