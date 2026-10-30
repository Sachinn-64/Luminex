#!/bin/bash
# fix_secrets.sh
# Rewrites git history to remove all hardcoded secrets
# Run from the trinetra root directory

set -e

echo "=== Fixing secrets in git history ==="

# Filter-branch to rewrite all commits
# For each commit, apply sed fixes to the offending files

git filter-branch -f --tree-filter '
  # ── gundetection/.env ──────────────────────────────────
  if [ -f gundetection/.env ]; then
    sed -i.bak "s/GOOGLE_API_KEY=AQ\..*/GOOGLE_API_KEY=your_gemini_api_key_here/g" gundetection/.env
    sed -i.bak "s/GEMINI_API_KEY=AQ\..*/GEMINI_API_KEY=your_gemini_api_key_here/g" gundetection/.env
    rm -f gundetection/.env.bak
  fi

  # ── ChatbotPopup.tsx ────────────────────────────────────
  if [ -f client/src/components/ChatbotPopup.tsx ]; then
    sed -i.bak "s/const GEMINI_API_KEY = \"AIzaSy[A-Za-z0-9_-]*\";/const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;/g" client/src/components/ChatbotPopup.tsx
    sed -i.bak "s/const OPENWEATHER_API_KEY = \"[a-f0-9]*\";/const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY as string;/g" client/src/components/ChatbotPopup.tsx
    sed -i.bak "s/const GOOGLE_CLOUD_API_KEY = \"AIzaSy[A-Za-z0-9_-]*\";/const GOOGLE_CLOUD_API_KEY = import.meta.env.VITE_GOOGLE_CLOUD_API_KEY as string;/g" client/src/components/ChatbotPopup.tsx
    rm -f client/src/components/ChatbotPopup.tsx.bak
  fi

  # ── AIMap.tsx ───────────────────────────────────────────
  if [ -f client/src/pages/AIMap.tsx ]; then
    sed -i.bak "s/const GOOGLE_MAPS_API_KEY = .AIzaSy[A-Za-z0-9_-]*.;/const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;/g" client/src/pages/AIMap.tsx
    sed -i.bak "s/const GEMINI_API_KEY = .AIzaSy[A-Za-z0-9_-]*.;/const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;/g" client/src/pages/AIMap.tsx
    rm -f client/src/pages/AIMap.tsx.bak
  fi

  # ── app/app.py ──────────────────────────────────────────
  if [ -f app/app.py ]; then
    sed -i.bak "s/os.environ\[.GOOGLE_API_KEY.\] = .AIzaSy[A-Za-z0-9_-]*.//g" app/app.py
    rm -f app/app.py.bak
  fi

  # ── app/app1.py ─────────────────────────────────────────
  if [ -f app/app1.py ]; then
    sed -i.bak "s/GEMINI_API_KEY = .AIzaSy[A-Za-z0-9_-]*.//g" app/app1.py
    rm -f app/app1.py.bak
  fi

  # ── lost-and-found/app.py ───────────────────────────────
  if [ -f lost-and-found/app.py ]; then
    sed -i.bak "s/gemini_key = .AIzaSy[A-Za-z0-9_-]*.//g" lost-and-found/app.py
    rm -f lost-and-found/app.py.bak
  fi

  # ── app/lib/firebase.ts ─────────────────────────────────
  if [ -f app/lib/firebase.ts ]; then
    sed -i.bak "s/apiKey: .AIzaSy[A-Za-z0-9_-]*.//g" app/lib/firebase.ts
    rm -f app/lib/firebase.ts.bak
  fi

  # ── client/src/lib/firebase.ts ──────────────────────────
  if [ -f client/src/lib/firebase.ts ]; then
    sed -i.bak "s/apiKey: .AIzaSy[A-Za-z0-9_-]*.//g" client/src/lib/firebase.ts
    rm -f client/src/lib/firebase.ts.bak
  fi

  # ── app/lib/hospitalService.ts ──────────────────────────
  if [ -f app/lib/hospitalService.ts ]; then
    sed -i.bak "s/GOOGLE_PLACES_API_KEY = .AIzaSy[A-Za-z0-9_-]*./GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || .../g" app/lib/hospitalService.ts
    rm -f app/lib/hospitalService.ts.bak
  fi

  # ── app/app/(tabs)/map.tsx ──────────────────────────────
  if [ -f "app/app/(tabs)/map.tsx" ]; then
    sed -i.bak "s/const apiKey = .AIzaSy[A-Za-z0-9_-]*./const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || ./g" "app/app/(tabs)/map.tsx"
    rm -f "app/app/(tabs)/map.tsx.bak"
  fi

  # ── app/app/(tabs)/medical.tsx ──────────────────────────
  if [ -f "app/app/(tabs)/medical.tsx" ]; then
    sed -i.bak "s/const apiKey = .5b3ce[a-f0-9]*./const apiKey = process.env.EXPO_PUBLIC_OPENROUTESERVICE_API_KEY || ./g" "app/app/(tabs)/medical.tsx"
    rm -f "app/app/(tabs)/medical.tsx.bak"
  fi

' HEAD

echo ""
echo "=== History rewritten successfully ==="
echo "Now run: git push origin main --force"
