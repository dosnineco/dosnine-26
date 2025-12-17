#!/bin/bash

echo "🔧 Setting up Storage Bucket for Agent Documents"
echo ""
echo "⚠️  IMPORTANT: You need to add SUPABASE_SERVICE_ROLE_KEY to your .env.local file"
echo ""
echo "📝 Steps to get your Service Role Key:"
echo "1. Go to https://supabase.com/dashboard/project/etikxypnxjsonefwnzkr/settings/api"
echo "2. Copy the 'service_role' key (NOT the anon key)"
echo "3. Add this line to .env.local:"
echo "   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here"
echo ""
echo "📋 Then run this SQL in your Supabase SQL Editor:"
echo "   https://supabase.com/dashboard/project/etikxypnxjsonefwnzkr/editor"
echo ""
cat create-agent-documents-bucket.sql
echo ""
echo "✅ Or you can copy the SQL from: create-agent-documents-bucket.sql"
