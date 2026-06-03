'use client'

import * as React from 'react'

interface ThemeProviderProps {
  children: React.ReactNode
  attribute?: string
  defaultTheme?: string
  enableSystem?: boolean
}

const ThemeContext = React.createContext<{
  theme: string
  setTheme: (theme: string) => void
}>({ theme: 'light', setTheme: () => {} })

export function useTheme() {
  return React.useContext(ThemeContext)
}

export function ThemeProvider({
  children,
  defaultTheme = 'light',
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<string>(defaultTheme)

  React.useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || defaultTheme
    setThemeState(savedTheme)
  }, [defaultTheme])

  const setTheme = React.useCallback((newTheme: string) => {
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('light')
    } else {
      document.documentElement.classList.remove('dark')
      document.documentElement.classList.add('light')
    }
  }, [])

  // Sync classes
  React.useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('light')
    } else {
      document.documentElement.classList.remove('dark')
      document.documentElement.classList.add('light')
    }
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
