#!/usr/bin/env bash
set -e

# KenyaVet — GitHub Push Script
# Creates the repo on first run, then pushes commits.
# Requires: GITHUB_PERSONAL_ACCESS_TOKEN env var

GITHUB_USER="JBlizzard-sketch"
REPO_NAME="kenyavet"
REMOTE_URL="https://${GITHUB_PERSONAL_ACCESS_TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git"

if [ -z "$GITHUB_PERSONAL_ACCESS_TOKEN" ]; then
  echo "ERROR: GITHUB_PERSONAL_ACCESS_TOKEN is not set."
  exit 1
fi

echo "==> Checking if repo exists on GitHub..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $GITHUB_PERSONAL_ACCESS_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/${GITHUB_USER}/${REPO_NAME}")

if [ "$HTTP_STATUS" = "404" ]; then
  echo "==> Repo not found. Creating ${GITHUB_USER}/${REPO_NAME}..."
  curl -s -X POST \
    -H "Authorization: Bearer $GITHUB_PERSONAL_ACCESS_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    -H "Content-Type: application/json" \
    https://api.github.com/user/repos \
    -d "{
      \"name\": \"${REPO_NAME}\",
      \"description\": \"KenyaVet — Domestic staff vetting and background verification platform for premium Nairobi households\",
      \"private\": false,
      \"auto_init\": false,
      \"has_issues\": true,
      \"has_projects\": true,
      \"has_wiki\": false
    }" | grep -E '"full_name"|"html_url"'
  echo "==> Repo created."
else
  echo "==> Repo already exists (HTTP ${HTTP_STATUS})."
fi

echo "==> Configuring git remote..."
git remote remove origin 2>/dev/null || true
git remote add origin "$REMOTE_URL"

echo "==> Staging any uncommitted changes..."
git add -A
if ! git diff --cached --quiet; then
  git commit -m "chore: sync $(date '+%Y-%m-%d %H:%M')"
fi

echo "==> Pushing to GitHub..."
git push -u origin main --force-with-lease 2>/dev/null || git push -u origin main

echo "==> Done! https://github.com/${GITHUB_USER}/${REPO_NAME}"
