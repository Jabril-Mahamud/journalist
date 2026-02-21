#!/bin/bash
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Pre-push checks"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "▶ Frontend lint..."
cd frontend && npm run lint --silent
echo "✓ Lint passed"

echo ""
echo "▶ Frontend type check..."
npx tsc --noEmit
echo "✓ Type check passed"

cd ..

echo ""
echo "▶ Backend syntax check..."
cd backend && python -m py_compile main.py models.py schemas.py crud.py auth.py database.py
echo "✓ Backend syntax passed"

cd ..

echo ""
echo "▶ Helm lint..."
helm lint ./journalist --values ./journalist/values.secret.yaml
echo "✓ Helm lint passed"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All checks passed — pushing"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
