#!/bin/bash
set -e

echo "Installing git hooks..."
cp scripts/pre-push.sh .git/hooks/pre-push
chmod +x .git/hooks/pre-push
echo "✓ pre-push hook installed"
echo ""
echo "Run 'scripts/smoke-test.sh' to test the backend manually before pushing."
