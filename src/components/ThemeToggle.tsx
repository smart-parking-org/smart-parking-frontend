import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light' as const;
  const stored = localStorage.getItem('theme');
  if (stored === 'dark' || stored === 'light') return stored;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme());

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Đổi giao diện"
      onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      className="h-9 w-9"
    >
      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}
