#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
[[ -f .env ]] || cp .env.example .env
npm ci
npm run typecheck
npm test
npm run build
printf '\nBootstrap complete. Edit .env, then run: npm run doctor\n'
