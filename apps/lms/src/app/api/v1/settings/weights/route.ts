import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

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
