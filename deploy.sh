#!/usr/bin/env bash
set -euo pipefail
cd /home/trevor/game_night && git pull
docker compose -f /home/trevor/docker/docker-compose.yml up -d --build game-night
