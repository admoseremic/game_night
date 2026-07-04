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
