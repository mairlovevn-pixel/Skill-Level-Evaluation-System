#!/bin/bash
# Delete all test Supervisor Assessment data

echo "🗑️  Deleting all Supervisor Assessment test data..."
echo ""

cd /home/user/webapp

# Delete all assessments
npx wrangler d1 execute webapp-production --local --command="DELETE FROM supervisor_assessments;"

echo ""
echo "✅ All Supervisor Assessment test data has been deleted!"
echo ""
echo "📊 Verification:"
npx wrangler d1 execute webapp-production --local --command="SELECT COUNT(*) as remaining FROM supervisor_assessments;"
