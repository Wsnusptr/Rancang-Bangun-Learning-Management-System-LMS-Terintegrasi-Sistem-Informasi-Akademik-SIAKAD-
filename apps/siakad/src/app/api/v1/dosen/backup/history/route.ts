import { requireSiakadAuth } from '@/lib/api-auth'
import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: any) {
  const authError = requireSiakadAuth(request)
  if (authError) return authError

  try {
    // Fetch all classes that have an active backup lecturer
    const { data: classesData, error } = await supabase
      .from('classes')
      .select('id, class_name, backup_lecturer_id, updated_at, profiles!backup_lecturer_id(name, email)')
      .not('backup_lecturer_id', 'is', null)

    if (error) throw error

    // Transform into the format expected by SiakadClientDashboard
    const transformed = (classesData || []).map(cls => {
      // Create a dummy expiration date 6 months from last update
      const createdAt = new Date(cls.updated_at || Date.now())
      const expiredAt = new Date(createdAt.getTime() + 180 * 24 * 60 * 60 * 1000)
      
      const profile = Array.isArray(cls.profiles) ? cls.profiles[0] : cls.profiles;
      
      return {
        id: cls.id,
        className: cls.class_name,
        backupName: profile?.name || 'Unknown',
        email: profile?.email || 'unknown@example.com',
        createdAt: createdAt.toISOString(),
        expiredAt: expiredAt.toISOString()
      }
    })
    
    // Sort newest first
    const sorted = transformed.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    
    return NextResponse.json({ success: true, data: sorted })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
