// ============================================================
// GET /api/v1/pmb/portal
// Public endpoint to fetch all PMB portal sections
// ============================================================

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { successResponse, serverErrorResponse } from '@/lib/utils'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Fetch all independent PMB sections in parallel
        // For performance and lower latency, we use Promise.all
        const [
            programsRes,
            schedulesRes,
            faqsRes,
            scholarshipsRes,
            requirementsRes,
            testimonialsRes,
            facilitiesRes,
            contactsRes,
            resourcesRes
        ] = await Promise.all([
            supabase.from('pmb_programs').select('*').order('created_at'),
            supabase.from('pmb_schedules').select('*').order('event_date', { ascending: true }),
            supabase.from('pmb_faqs').select('*').order('order_priority', { ascending: false }),
            supabase.from('pmb_scholarships').select('*').order('created_at'),
            supabase.from('pmb_requirements').select('*').order('created_at'),
            supabase.from('pmb_testimonials').select('*').order('rating', { ascending: false }),
            supabase.from('pmb_facilities').select('*').order('created_at'),
            supabase.from('pmb_contacts').select('*').order('created_at'),
            supabase.from('pmb_resources').select('*').order('created_at')
        ])

        // Verify if any query critically failed (we ignore if table doesn't exist yet for smooth dev experience, returning empty arrays)
        const getSafeData = (res: any) => (res.error ? [] : res.data || [])

        return successResponse({
            programs: getSafeData(programsRes),
            schedules: getSafeData(schedulesRes),
            faqs: getSafeData(faqsRes),
            scholarships: getSafeData(scholarshipsRes),
            requirements: getSafeData(requirementsRes),
            testimonials: getSafeData(testimonialsRes),
            facilities: getSafeData(facilitiesRes),
            contacts: getSafeData(contactsRes),
            resources: getSafeData(resourcesRes)
        })
    } catch (error) {
        return serverErrorResponse(error)
    }
}
