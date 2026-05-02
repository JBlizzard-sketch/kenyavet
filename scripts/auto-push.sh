#!/usr/bin/env bash
# KenyaVet — Auto-push to GitHub
# Runs periodically. Detects new Replit checkpoint commits and pushes them.

GITHUB_USER="JBlizzard-sketch"
REPO_NAME="kenyavet"

if [ -z "$GITHUB_PERSONAL_ACCESS_TOKEN" ]; then
  echo "[auto-push] ERROR: GITHUB_PERSONAL_ACCESS_TOKEN not set. Skipping."
  exit 0
fi

REMOTE_URL="https://${GITHUB_PERSONAL_ACCESS_TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git"

echo "[auto-push] $(date '+%Y-%m-%d %H:%M:%S') — Checking for new commits to push..."

LOCAL_SHA=$(git --no-optional-locks rev-parse HEAD 2>/dev/null)
REMOTE_SHA=$(git --no-optional-locks ls-remote "$REMOTE_URL" refs/heads/main 2>/dev/null | awk '{print $1}')

if [ "$LOCAL_SHA" = "$REMOTE_SHA" ]; then
  echo "[auto-push] Already up to date. Nothing to push."
  exit 0
fi

echo "[auto-push] Local: $LOCAL_SHA"
echo "[auto-push] Remote: $REMOTE_SHA"
echo "[auto-push] Pushing new commits..."

git --no-optional-locks push "$REMOTE_URL" main 2>&1
echo "[auto-push] Done — https://github.com/${GITHUB_USER}/${REPO_NAME}"
