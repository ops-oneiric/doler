import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ThemeMode, FontSize, AppSettings } from '../types';
import { getSettings, saveSettings, subscribe } from '../store';

interface ThemeCtx {
  theme: ThemeMode;
  fontSize: FontSize;
  setTheme: (t: ThemeMode) => void;
  setFontSize: (f: FontSize) => void;
}

const Ctx = createContext<ThemeCtx>({
  theme: 'light',
  fontSize: 'medium',
  setTheme: () => {},
  setFontSize: () => {},
});

export const useTheme = () => useContext(Ctx);

const FONT_MAP: Record<FontSize, string> = {
  small: '13px',
  medium: '15px',
  large: '17px',
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setLocal] = useState<AppSettings>(getSettings);

  useEffect(() => subscribe(() => setLocal(getSettings())), []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
    document.documentElement.style.fontSize = FONT_MAP[settings.fontSize];
  }, [settings]);

  const setTheme = (theme: ThemeMode) => {
    const next = { ...settings, theme };
    saveSettings(next);
    setLocal(next);
  };
  const setFontSize = (fontSize: FontSize) => {
    const next = { ...settings, fontSize };
    saveSettings(next);
    setLocal(next);
  };

  return (
    <Ctx.Provider value={{ ...settings, setTheme, setFontSize }}>
      {children}
    </Ctx.Provider>
  );
}
