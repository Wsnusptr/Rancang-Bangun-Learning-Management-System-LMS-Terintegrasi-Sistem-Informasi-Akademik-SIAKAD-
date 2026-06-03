import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { requireRole } from '@/lib/auth'
import { z } from 'zod'

const DB_FILE = path.join(process.cwd(), '..', '..', 'backup_sessions.json')

async function readDB() {
  try {
    const content = await fs.readFile(DB_FILE, 'utf-8')
    return JSON.parse(content)
  } catch (e) {
    return []
  }
}

async function writeDB(data: any) {
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

const generateSchema = z.object({
  classId: z.string().uuid(),
  className: z.string().min(1),
  backupName: z.string().min(1),
  durationHours: z.number().min(1).max(24)
})

export async function POST(request: Request) {
  try {
    const authCheck = await requireRole('lecturer', 'admin')
    if (authCheck.response) return authCheck.response

    const body = await request.json()
    const parsed = generateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 })
    }

    const { classId, className, backupName, durationHours } = parsed.data

    // Generate random credential
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    const email = `backup.${randomSuffix}@jayakarta.ac.id`
    const password = `Bkp${Math.random().toString(36).slice(-6)}!`

    const expiredAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString()

    const newRecord = {
      id: Date.now().toString(),
      classId,
      className,
      backupName,
      email,
      password, // In a real app we'd hash this or not store it, but for mock login we need it
      expiredAt,
      createdAt: new Date().toISOString()
    }

    const db = await readDB()
    db.push(newRecord)
    await writeDB(db)

    return NextResponse.json({ 
      success: true, 
      data: {
        email,
        password,
        expiredAt
      }
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
