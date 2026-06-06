import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
    const tables = [
        'pmb_programs', 'pmb_schedules', 'pmb_faqs', 'pmb_scholarships', 
        'pmb_requirements', 'pmb_testimonials', 'pmb_facilities', 'pmb_contacts', 'pmb_resources'
    ]
    const schema: Record<string, string[]> = {}
    
    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1)
        if (data && data.length > 0) {
            schema[table] = Object.keys(data[0])
        } else if (data && data.length === 0) {
            // Need to insert a dummy to get keys, then delete it, or we can just return empty
            // Wait, if it's empty, we can't get keys using REST API this way.
            schema[table] = ['empty']
        } else {
            schema[table] = [error?.message || 'error']
        }
    }
    
    return NextResponse.json(schema)
}
