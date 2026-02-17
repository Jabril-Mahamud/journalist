#!/bin/bash
# Database Schema Verification Script
# Checks if the new user-scoped schema is correctly applied

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Verifying Database Schema"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if postgres pod exists
if ! kubectl get pod postgres-0 >/dev/null 2>&1; then
    echo "❌ Postgres pod not found"
    echo "   Run 'make dev' first"
    exit 1
fi

echo "✓ Postgres pod found"
echo ""

echo "Checking tables..."
echo ""

# Check tables exist
TABLES=$(kubectl exec -it postgres-0 -- psql -U postgres -d journalist -t -c "\dt" 2>/dev/null | grep -E "users|journal_entries|focus_points|entry_focus_points" | wc -l)

if [ "$TABLES" -eq 4 ]; then
    echo "✓ All 4 tables exist"
else
    echo "⚠️  Expected 4 tables, found $TABLES"
    echo "   Tables should be: users, journal_entries, focus_points, entry_focus_points"
fi

echo ""
echo "Checking schema..."
echo ""

# Check users table
echo "Users table:"
kubectl exec -it postgres-0 -- psql -U postgres -d journalist -c "\d users" 2>/dev/null | grep -E "id|clerk_user_id|email|created_at"

echo ""
echo "Journal Entries table:"
kubectl exec -it postgres-0 -- psql -U postgres -d journalist -c "\d journal_entries" 2>/dev/null | grep -E "id|user_id|title|content|created_at|updated_at"

echo ""
echo "Focus Points table:"
kubectl exec -it postgres-0 -- psql -U postgres -d journalist -c "\d focus_points" 2>/dev/null | grep -E "id|user_id|name|created_at"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Schema Check Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "If you see user_id columns in journal_entries and focus_points,"
echo "then the migration was successful! ✨"
echo ""