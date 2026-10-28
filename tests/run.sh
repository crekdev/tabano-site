#!/usr/bin/env bash
# Pruebas de navegador (requieren Python 3 + Playwright con Chromium). Uso: bash tests/run.sh
# Se construyen dos copias temporales: A) sin GTM (baseline, sin banner) y B) con el GTM configurado en
# src/config.mjs, para probar el consentimiento. Las peticiones a googletagmanager.com se interceptan en el test.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="$PWD/tests/out"; mkdir -p "$OUT/shots"; export OUT
node build.mjs && node scripts/check.mjs && node scripts/contrast.mjs >/dev/null && echo "contraste OK"
GTM_ID="$(node -e "import('./src/config.mjs').then(m=>console.log(m.SITE.gtmId))")"; export GTM_ID
[ -n "$GTM_ID" ] || { echo "SITE.gtmId está vacío: la variante B probaría un ID inexistente"; exit 1; }
TMP="$(mktemp -d)"
for v in A B; do
  mkdir -p "$TMP/$v" && tar --exclude=./dist --exclude=./tests/out --exclude=./.git -cf - . | tar -xf - -C "$TMP/$v"
done
( cd "$TMP/A" && sed -i -E "s/gtmId: '[^']*'/gtmId: ''/" src/config.mjs && node build.mjs >/dev/null )
( cd "$TMP/B" && node build.mjs >/dev/null )
python3 tests/server.py "$TMP/A/dist" 8765 "$OUT/post.log" & S1=$!
python3 tests/server.py "$TMP/B/dist" 8766 "$OUT/post2.log" & S2=$!
trap 'kill $S1 $S2 2>/dev/null || true; rm -rf "$TMP"' EXIT
sleep 1
echo "== A) sin GTM =="
python3 tests/e2e.py | python3 -c "import json,sys;d=json.load(sys.stdin);print('desbordes:',d['overflow']);print('consola:',[c for c in d['console'] if '404' not in c[2]])"
python3 tests/form.py
BASE=http://127.0.0.1:8765 python3 tests/a11y.py
echo "== B) con GTM $GTM_ID =="
python3 tests/gtm.py
BASE=http://127.0.0.1:8766 python3 tests/a11y.py
