import { requireSiakadAuth } from '@/lib/api-auth'
import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

// Mock storage file in project root
const WEIGHTS_FILE = path.join(process.cwd(), '..', '..', 'master_weights.json')

export async function GET() {
  try {
    let data = { absen: 10, tugas: 20, kuis: 10, uts: 30, uas: 30 }
    try {
      const fileContent = await fs.readFile(WEIGHTS_FILE, 'utf-8')
      data = JSON.parse(fileContent)
    } catch (e) {
      // File doesn't exist yet, use default
    }
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Validate
    const total = Number(body.absen) + Number(body.tugas) + Number(body.kuis) + Number(body.uts) + Number(body.uas)
    if (total !== 100) {
      return NextResponse.json({ success: false, error: 'Total bobot harus 100%' }, { status: 400 })
    }

    await fs.writeFile(WEIGHTS_FILE, JSON.stringify(body, null, 2), 'utf-8')

    return NextResponse.json({ success: true, message: 'Bobot berhasil disimpan', data: body })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
