'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, Sparkles, MessageSquare } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { createClient } from '@/lib/supabase/client'

interface Message {
  role: 'user' | 'ai'
  content: string
}

export default function PmbChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      content: 'Halo Sobat Camaba Jayakarta! 👋 Saya asisten virtual PMB STMIK Jayakarta. Ada yang bisa saya bantu terkait pendaftaran, program studi, biaya kuliah, atau fasilitas kampus?'
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Sobat Camaba'
        setMessages([
          {
            role: 'ai',
            content: `Halo ${name}, Sobat Camaba Jayakarta! 👋 Saya asisten virtual PMB STMIK Jayakarta. Ada yang bisa saya bantu terkait pendaftaran, program studi, biaya kuliah, atau fasilitas kampus?`
          }
        ])
      }
    }
    fetchUser()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    if (!input.trim() || isLoading) return
    
    const userMessage = input.trim()
    setInput('')
    
    // Add user message to UI
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }]
    setMessages(newMessages)
    setIsLoading(true)

    try {
      // Prepare history for API
      const history = messages
        .filter(m => m.role !== 'ai' || m.content !== messages[0].content) // Skip first greeting
        .map(m => ({
          role: m.role,
          content: m.content
        }))

      const res = await fetch('/api/v1/pmb/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMessage, history })
      })

      const json = await res.json()
      
      setIsLoading(false)

      if (json.success) {
        const fullText = json.data.text
        setMessages(prev => [...prev, { role: 'ai', content: '' }])
        
        let i = 0
        const interval = setInterval(() => {
          i += 2 // characters per tick
          const currentText = fullText.slice(0, i)
          setMessages(prev => {
            const newM = [...prev]
            newM[newM.length - 1] = { ...newM[newM.length - 1], content: currentText }
            return newM
          })
          if (i >= fullText.length) {
            clearInterval(interval)
          }
        }, 15) // tick interval
      } else {
        setMessages(prev => [...prev, { role: 'ai', content: 'Maaf, terjadi kesalahan: ' + json.error }])
      }
    } catch (err) {
      console.error('Chat error:', err)
      setIsLoading(false)
      setMessages(prev => [...prev, { role: 'ai', content: 'Maaf, saya tidak dapat terhubung ke server saat ini. Silakan coba beberapa saat lagi.' }])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] md:h-[calc(100vh-100px)] max-w-4xl mx-auto p-2 md:p-6 select-none font-sans">
      <div className="bg-white dark:bg-[#121B2E] rounded-t-2xl border border-b-0 border-slate-200 dark:border-slate-800 p-4 md:p-6 flex items-center justify-between z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-sm md:text-base font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
              Tanya AI PMB <Sparkles className="h-4 w-4 text-amber-500" />
            </h1>
            <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-bold mt-1">
              Asisten Virtual Pendaftaran Mahasiswa Baru
            </p>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#0D1424] border-x border-slate-200 dark:border-slate-800 p-4 space-y-6">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-[85%] md:max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              
              {/* Avatar */}
              <div className="shrink-0 mt-auto">
                {msg.role === 'user' ? (
                  <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center border-2 border-white dark:border-[#121B2E]">
                    <User className="h-4 w-4 text-slate-500 dark:text-slate-300" />
                  </div>
                ) : (
                  <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center border-2 border-white dark:border-[#121B2E]">
                    <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                )}
              </div>

              {/* Bubble */}
              <div 
                className={`p-4 rounded-2xl ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none shadow-md shadow-blue-600/20' 
                    : 'bg-white dark:bg-[#121B2E] text-slate-700 dark:text-slate-200 rounded-bl-none shadow-sm border border-slate-100 dark:border-slate-800'
                }`}
              >
                <div className={`text-[11px] md:text-xs font-medium leading-relaxed ${msg.role === 'user' ? 'whitespace-pre-wrap' : 'prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-strong:font-black prose-strong:text-slate-800 dark:prose-strong:text-slate-100 prose-headings:font-bold prose-headings:text-slate-800 dark:prose-headings:text-white prose-pre:bg-slate-800 prose-pre:text-slate-100 prose-a:text-blue-500 hover:prose-a:text-blue-600'}`}>
                  {msg.role === 'user' ? (
                    msg.content
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-3 max-w-[85%] md:max-w-[75%] flex-row">
              <div className="shrink-0 mt-auto">
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center border-2 border-white dark:border-[#121B2E]">
                  <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="p-4 rounded-2xl rounded-bl-none bg-white dark:bg-[#121B2E] border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <div className="flex gap-1.5 py-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-[10px] md:text-xs font-bold text-slate-500 ml-2">Asisten sedang mengetik...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white dark:bg-[#121B2E] rounded-b-2xl border border-t-0 border-slate-200 dark:border-slate-800 p-4">
        <form onSubmit={handleSend} className="relative flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tanyakan sesuatu tentang pendaftaran, biaya, atau jurusan..."
            className="w-full bg-slate-50 dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 min-h-[50px] max-h-[120px] text-xs font-medium text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none transition-all"
            rows={1}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="h-12 w-12 shrink-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-xl flex items-center justify-center transition-all shadow-md shadow-blue-600/20 active:scale-95"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </form>
        <p className="text-[9px] text-center text-slate-400 dark:text-slate-500 font-semibold mt-3">
          AI dapat melakukan kesalahan. Pastikan untuk memverifikasi informasi penting ke kontak resmi PMB STMIK Jayakarta.
        </p>
      </div>
    </div>
  )
}
