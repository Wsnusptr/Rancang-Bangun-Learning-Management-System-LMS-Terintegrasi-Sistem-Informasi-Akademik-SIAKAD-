import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { cookies } from 'next/headers'
import { z } from 'zod'

const DB_FILE = path.join(process.cwd(), '..', '..', 'backup_sessions.json')

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 })
    }
    const { email, password } = parsed.data

    let content = '[]'
    try {
      content = await fs.readFile(DB_FILE, 'utf-8')
    } catch (e) {}

    const sessions = JSON.parse(content)
    const session = sessions.find((s: any) => s.email === email && s.password === password)

    if (session) {
      if (new Date(session.expiredAt) < new Date()) {
        return NextResponse.json({ success: false, error: 'Akun backup sudah kedaluwarsa' })
      }

      // Valid session, set cookie
      const cookieStore = await cookies()
      cookieStore.set('backup_session_token', session.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: new Date(session.expiredAt)
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, error: 'Email atau password salah' })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
