import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/utils'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const chatSchema = z.object({
  prompt: z.string().min(1),
  history: z.array(z.any()).optional().default([])
})

export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (response) return response

    // Ensure it's for PMB role (or admins/lecturers testing it)
    if (user.role !== 'student' && user.role !== 'admin' && user.role !== 'lecturer' && user.role !== 'staff') {
        // We allow all roles to test it, but mainly it's for PMB (which are 'student' without NIM initially in this system)
    }

    const body = await request.json()
    const parsed = chatSchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse('Invalid payload', 400)
    }

    const { prompt, history } = parsed.data

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return errorResponse('API Key AI belum dikonfigurasi oleh admin sistem.', 500)
    }

    // Convert chat history to Gemini format
    let contents = []
    
    // Fetch live PMB data from SIAKAD database
    const supabase = await createClient()
    const [
        programsRes, schedulesRes, faqsRes, scholarshipsRes, requirementsRes, facilitiesRes, contactsRes
    ] = await Promise.all([
        supabase.from('pmb_programs').select('*').limit(20),
        supabase.from('pmb_schedules').select('*').limit(20),
        supabase.from('pmb_faqs').select('*').limit(20),
        supabase.from('pmb_scholarships').select('*').limit(20),
        supabase.from('pmb_requirements').select('*').limit(20),
        supabase.from('pmb_facilities').select('*').limit(20),
        supabase.from('pmb_contacts').select('*').limit(10)
    ])

    const pmbContext = `
Data Resmi PMB STMIK Jayakarta (Gunakan HANYA data ini sebagai referensi utama menjawab pertanyaan):
- Program Studi: ${JSON.stringify(programsRes.data || [])}
- Jadwal & Gelombang: ${JSON.stringify(schedulesRes.data || [])}
- FAQ: ${JSON.stringify(faqsRes.data || [])}
- Beasiswa: ${JSON.stringify(scholarshipsRes.data || [])}
- Persyaratan Pendaftaran: ${JSON.stringify(requirementsRes.data || [])}
- Fasilitas Kampus: ${JSON.stringify(facilitiesRes.data || [])}
- Kontak & Pusat Informasi (Alamat, Telp, Email): ${JSON.stringify(contactsRes.data || [])}

ATURAN FORMATTING JAWABAN (SANGAT PENTING UNTUK TAMPILAN MOBILE):
1. Wajib gunakan teks **Tebal (Bold)** untuk menyoroti nama jurusan, angka biaya, tanggal, atau poin penting.
2. Wajib gunakan *Bullet points* (-) atau *Numbered lists* (1. 2.) untuk menyajikan daftar (misalnya daftar syarat, daftar fasilitas, daftar program studi).
3. Beri jarak satu baris kosong (spasi paragraf) antar topik agar mudah dibaca di layar HP yang sempit.
4. Jangan membuat satu paragraf panjang yang padat. Pecah menjadi beberapa paragraf pendek atau poin-poin.
5. Gunakan sapaan kasual tapi sopan (kak, bro, sis). Jawab dengan rapi, terstruktur, dan terkesan profesional namun asik.
`
    // Add system context
    const systemInstruction = "Kamu adalah AI Asisten PMB (Penerimaan Mahasiswa Baru) STMIK Jayakarta. Nama kamu adalah 'Sobat Camaba'. Tugasmu adalah membantu calon mahasiswa baru dengan memberikan informasi seputar pendaftaran, kampus, jurusan, biaya, dan fasilitas di STMIK Jayakarta secara akurat berdasarkan data sistem. Jangan menyebarkan informasi palsu atau berasumsi jika data tidak ada di referensimu. Jangan menyebutkan bahwa kamu dari Google, OpenAI, atau Gemini, cukup katakan kamu adalah asisten dari STMIK Jayakarta.\n\n" + pmbContext

    
    const isGroq = apiKey.startsWith('gsk_')
    const isOpenAI = apiKey.startsWith('sk-')

    if (isGroq || isOpenAI) {
      // Use OpenAI Compatible Format
      const apiUrl = isGroq ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions'
      const openAIMessages = [
        { role: 'system', content: systemInstruction },
        ...(history || []).map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        })),
        { role: 'user', content: prompt }
      ]

      const payload = {
        model: isGroq ? 'llama3-8b-8192' : 'gpt-3.5-turbo',
        messages: openAIMessages,
        temperature: 0.7,
        max_tokens: 1024
      }

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errorData = await res.json()
        console.error('OpenAI/Groq API Error:', errorData)
        return errorResponse('Gagal menghubungi layanan AI.', 500)
      }

      const data = await res.json()
      const textResponse = data.choices?.[0]?.message?.content || 'Maaf, saya tidak bisa memproses permintaan Anda saat ini.'
      return successResponse({ text: textResponse })
    }

    // Default to Gemini format
    // Format history
    if (history && Array.isArray(history)) {
        history.forEach((msg: any) => {
            contents.push({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            })
        })
    }

    // Add current prompt
    contents.push({
        role: 'user',
        parts: [{ text: prompt }]
    })

    const payload = {
        system_instruction: {
            parts: { text: systemInstruction }
        },
        contents: contents,
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
        }
    }

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })

    if (!res.ok) {
        const errorData = await res.json()
        console.error('Gemini API Error:', errorData)
        return errorResponse('Gagal menghubungi layanan AI.', 500)
    }

    const data = await res.json()
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Maaf, saya tidak bisa memproses permintaan Anda saat ini.'

    return successResponse({ text: textResponse })
  } catch (error: any) {
    console.error('Chat API Error:', error)
    return errorResponse(error.message || 'Terjadi kesalahan pada server', 500)
  }
}
