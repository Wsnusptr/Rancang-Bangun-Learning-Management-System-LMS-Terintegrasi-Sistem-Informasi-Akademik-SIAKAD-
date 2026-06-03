// POST /api/v1/pmb/sync - sinkronkan profil calon mahasiswa ke tabel mahasiswa_baru
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { z } from 'zod'

const pmbSchema = z.object({
  full_name: z.string().optional(),
  phone: z.string().optional(),
  date_of_birth: z.string().optional(),
  address: z.string().optional(),
  intended_program: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('nim, name, phone, date_of_birth, address, intended_program')
      .eq('id', user.id)
      .single()

    if (profile?.nim) {
      return NextResponse.json({ success: true, skipped: true, reason: 'already_enrolled' })
    }

    const bodyStr = await request.json().catch(() => ({}))
    const parsed = pmbSchema.safeParse(bodyStr)
    const body = parsed.success ? parsed.data : {}
    const fullName = body.full_name || profile?.name || user.user_metadata?.full_name || user.user_metadata?.name || ''
    const phone = body.phone ?? profile?.phone ?? ''
    const dateOfBirth = body.date_of_birth ?? profile?.date_of_birth ?? null
    const address = body.address ?? profile?.address ?? ''
    const intendedProgram = body.intended_program ?? profile?.intended_program ?? ''

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      return NextResponse.json({ success: true, skipped: true, reason: 'no_service_role' })
    }

    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey
    )

    const { error } = await admin.from('mahasiswa_baru').upsert(
      {
        email: user.email.toLowerCase(),
        full_name: fullName,
        phone: phone || null,
        date_of_birth: dateOfBirth || null,
        address: address || null,
        intended_program: intendedProgram || null,
        google_id: user.id,
        status: 'registered',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'email' }
    )

    if (error) {
      console.error('[PMB Sync]', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sync failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
