import { useCallback, useEffect, useRef, useState } from 'react';

export const useThemeState = () => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('app_theme');
    if (saved === 'pixel') return 'minecraft';
    if (saved === 'terrarium') return 'neo-chinese';
    if (
      [
        'rainy',
        'paper',
        'ultra-rgb',
        'laser-tunnel',
        'dragonScale',
        'blackGold',
        'synthwaveGrid',
        'kinetic-chrome',
      ].includes(saved || '')
    ) {
      return 'glass';
    }
    return saved || 'glass';
  });

  const previousThemeRef = useRef<string | null>(null);

  useEffect(() => {
    if (theme !== 'landetian') {
      localStorage.setItem('app_theme', theme);
    }
  }, [theme]);

  const handleSecretCode = useCallback(
    (code: string) => {
      const lower = code.toLowerCase();
      if (lower === '1335465359') setTheme('sewer');
      if (lower === 'merry christmas' || lower === '圣诞快乐') setTheme('christmas');

      if (lower === 'landetian' || lower === '蓝的天') {
        if (theme !== 'landetian') {
          previousThemeRef.current = theme;
          setTheme('landetian');
        }
      } else if (lower === 'exit_landetian') {
        if (theme === 'landetian' && previousThemeRef.current) {
          setTheme(previousThemeRef.current);
          previousThemeRef.current = null;
        }
      }
    },
    [theme],
  );

  return {
    theme,
    setTheme,
    handleSecretCode,
  };
};
