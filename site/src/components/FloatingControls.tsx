import { FaGithub, FaSun, FaMoon } from 'react-icons/fa'
import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

export function FloatingControls() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme')
    return (stored as Theme) || 'system'
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') {
      root.removeAttribute('data-theme')
      localStorage.removeItem('theme')
    } else {
      root.setAttribute('data-theme', theme)
      localStorage.setItem('theme', theme)
    }
  }, [theme])

  const cycleTheme = () => {
    setTheme(t => t === 'light' ? 'dark' : t === 'dark' ? 'system' : 'light')
  }

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  return (
    <div className="fab">
      <button onClick={cycleTheme} title={`Theme: ${theme}`} className="fab-button">
        {isDark ? <FaSun size={24} /> : <FaMoon size={24} />}
      </button>
      <a href="https://github.com/runsascoded/use-prms" className="fab-button" title="GitHub">
        <FaGithub size={24} />
      </a>
    </div>
  )
}
