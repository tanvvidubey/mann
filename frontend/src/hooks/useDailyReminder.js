import { useEffect, useRef } from 'react'

const REMINDER_KEY = 'mann_reminder_asked'

export function useDailyReminder(enabled) {
  const timeoutRef = useRef(null)

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !('Notification' in window)) return

    const scheduleReminder = () => {
      const now = new Date()
      const target = new Date(now)
      target.setHours(20, 0, 0, 0)
      if (now > target) target.setDate(target.getDate() + 1)
      const ms = target.getTime() - now.getTime()
      timeoutRef.current = setTimeout(() => {
        if (document.visibilityState === 'hidden') {
          new Notification('Mann', {
            body: 'Take a moment to record how your day felt.',
            icon: '/favicon.svg',
          })
        }
        scheduleReminder()
      }, ms)
    }

    if (Notification.permission === 'granted') {
      scheduleReminder()
    } else if (Notification.permission !== 'denied' && !localStorage.getItem(REMINDER_KEY)) {
      Notification.requestPermission().then((perm) => {
        localStorage.setItem(REMINDER_KEY, '1')
        if (perm === 'granted') scheduleReminder()
      })
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [enabled])
}
