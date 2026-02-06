import { supabase } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // Test 1: Check if table exists and fetch signups with specific columns
    const { data: signups, error: signupsError, count } = await supabase
      .from('course_preorders')
      .select('id, name, email, phone, price_choice, buy_now, discounted_amount, payment_confirmed, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Test 2: Check table schema
    const { error: schemaError } = await supabase
      .from('course_preorders')
      .select('id')
      .limit(0)

    const debug = {
      tableExists: !schemaError,
      schemaError: schemaError ? {
        message: schemaError.message,
        code: schemaError.code,
        details: schemaError.details,
        hint: schemaError.hint
      } : null,
      
      signupsQuery: {
        success: !signupsError,
        count: count || 0,
        rowsReturned: signups?.length || 0,
        error: signupsError ? {
          message: signupsError.message,
          code: signupsError.code,
          details: signupsError.details,
          hint: signupsError.hint
        } : null
      },
      
      data: signups || [],
      
      environment: {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        supabaseUrlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...'
      }
    }

    return res.status(200).json(debug)
  } catch (err) {
    return res.status(500).json({ 
      error: 'Debug error',
      message: err.message,
      stack: err.stack 
    })
  }
}
