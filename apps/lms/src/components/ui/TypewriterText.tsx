'use client'

import { useState, useEffect } from 'react'

export default function TypewriterText({ 
  texts, 
  typeSpeed = 50, 
  deleteSpeed = 30,
  delay = 3000 
}: { 
  texts: string | string[], 
  typeSpeed?: number, 
  deleteSpeed?: number,
  delay?: number 
}) {
  const textArray = Array.isArray(texts) ? texts : [texts]
  const [displayText, setDisplayText] = useState('')
  const [textIndex, setTextIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isWaiting, setIsWaiting] = useState(false)

  useEffect(() => {
    const currentFullText = textArray[textIndex]

    if (isWaiting) {
      const timeout = setTimeout(() => {
        setIsWaiting(false)
        if (!isDeleting) {
          setIsDeleting(true)
        } else {
          setIsDeleting(false)
          setTextIndex((prev) => (prev + 1) % textArray.length)
        }
      }, isDeleting ? 200 : delay) // 200ms wait before typing next, delay ms before deleting
      return () => clearTimeout(timeout)
    }

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (displayText.length < currentFullText.length) {
          setDisplayText(currentFullText.slice(0, displayText.length + 1))
        } else {
          // If there's only 1 text, we can either loop it or stop. We'll loop it.
          setIsWaiting(true)
        }
      } else {
        if (displayText.length > 0) {
          setDisplayText(currentFullText.slice(0, displayText.length - 1))
        } else {
          setIsWaiting(true)
        }
      }
    }, isDeleting ? deleteSpeed : typeSpeed)

    return () => clearTimeout(timeout)
  }, [displayText, isDeleting, isWaiting, textIndex, textArray, typeSpeed, deleteSpeed, delay])

  return (
    <span>
      {displayText}
      <span className="animate-pulse border-r-[2px] border-amber-600 dark:border-amber-400 ml-0.5"></span>
    </span>
  )
}
