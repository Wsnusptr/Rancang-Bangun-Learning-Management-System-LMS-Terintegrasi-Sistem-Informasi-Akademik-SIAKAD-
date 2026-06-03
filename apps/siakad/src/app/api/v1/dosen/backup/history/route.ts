import { requireSiakadAuth } from '@/lib/api-auth'
import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const DB_FILE = path.join(process.cwd(), '..', '..', 'backup_sessions.json')

export async function GET(request: any) {
  const authError = requireSiakadAuth(request)
  if (authError) return authError

  try {
    let content = '[]'
    try {
      content = await fs.readFile(DB_FILE, 'utf-8')
    } catch (e) {
      // ignore
    }
    const db = JSON.parse(content)
    
    // Sort newest first
    const sorted = db.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    
    return NextResponse.json({ success: true, data: sorted })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
