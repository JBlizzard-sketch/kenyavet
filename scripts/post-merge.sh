#!/bin/bash
set -e

pnpm install --frozen-lockfile
pnpm --filter db push

# Auto-push to GitHub — non-blocking (won't fail setup if push errors)
bash scripts/auto-push.sh || true
