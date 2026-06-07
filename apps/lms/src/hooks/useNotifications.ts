'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Notification {
  id: string
  user_id: string
  type: 'new_assignment' | 'grade_updated' | 'announcement' | 'sync_complete' | 'system'
  title: string
  message: string
  is_read: boolean
  related_class_id?: string
  related_assignment_id?: string
  related_post_id?: string
  action_url?: string
  created_at: string
}

export function useNotifications(userId: string) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchNotifications = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const res = await fetch('/api/notifications')
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setNotifications(json.data)
        const unread = json.data.filter((n: Notification) => !n.is_read).length
        setUnreadCount(unread)
      }
    } catch (err) {
      console.error('[Notifications] Failed to load:', err)
    } finally {
      setLoading(false)
    }
  }

  const markAllAsRead = async () => {
    if (!userId) return
    try {
      const res = await fetch('/api/notifications', { method: 'PATCH' })
      const json = await res.json()
      if (json.success) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        setUnreadCount(0)
      }
    } catch (err) {
      console.error('[Notifications] Failed to mark read:', err)
    }
  }

  useEffect(() => {
    if (!userId) return

    fetchNotifications()

    // Setup Supabase Realtime subscription
    const supabase = createClient()
    const uniqueId = Math.random().toString(36).substring(7)
    const channel = supabase
      .channel(`user-notifications-${userId}-${uniqueId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification
          setNotifications(prev => [newNotif, ...prev])
          setUnreadCount(prev => prev + 1)
          
          // Trigger a beautiful audio alert or standard notification sound
          try {
            const audio = new Audio('/notification.mp3')
            audio.volume = 0.4
            audio.play().catch(() => {})
          } catch (e) {}
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  return {
    notifications,
    unreadCount,
    loading,
    refresh: fetchNotifications,
    markAllAsRead,
  }
}
