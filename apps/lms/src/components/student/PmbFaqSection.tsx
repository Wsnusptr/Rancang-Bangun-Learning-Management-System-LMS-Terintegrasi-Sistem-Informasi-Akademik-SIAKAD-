'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, MessageCircleQuestion, Loader2 } from 'lucide-react'

export default function PmbFaqSection() {
  const [faqs, setFaqs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const res = await fetch('/api/v1/pmb/portal')
        if (res.ok) {
          const json = await res.json()
          setFaqs(json.data?.faqs || [])
        }
      } catch (err) {
        console.error('Error fetching FAQs:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchFaqs()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
      </div>
    )
  }

  if (faqs.length === 0) return null

  return (
    <div className="space-y-3 mt-8">
      <div className="flex items-center gap-2 mb-4 px-1">
        <MessageCircleQuestion className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
        <h2 className="text-[11px] md:text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
          Tanya Jawab (FAQ)
        </h2>
      </div>
      
      <div className="space-y-2.5">
        {faqs.map((faq) => (
          <div 
            key={faq.id} 
            className="rounded-xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-[#121B2E] overflow-hidden transition-all duration-200 shadow-sm"
          >
            <button
              onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
              className="flex w-full items-center justify-between p-4 sm:p-5 text-left hover:bg-slate-50 dark:hover:bg-[#1A2640] transition-colors"
            >
              <h4 className="text-xs font-bold text-slate-800 dark:text-gray-200 pr-4 leading-snug">
                {faq.question}
              </h4>
              <div className={`flex shrink-0 h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 transition-colors ${openId === faq.id ? 'bg-blue-100 dark:bg-blue-900/50' : ''}`}>
                <ChevronDown 
                  className={`h-3.5 w-3.5 transition-transform duration-300 ${
                    openId === faq.id ? 'rotate-180 text-blue-600 dark:text-blue-400' : 'text-slate-500'
                  }`} 
                />
              </div>
            </button>
            <div 
              className={`grid transition-all duration-300 ease-in-out ${
                openId === faq.id ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <div className="p-4 sm:p-5 pt-0 sm:pt-0 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400 mt-1">
                  {faq.answer}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
