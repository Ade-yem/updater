import { useCallback, useState } from 'react';

const STORAGE_KEY = 'voice-announcements-enabled';

function getInitialEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

export function useVoiceAnnouncements() {
  const [enabled, setEnabledState] = useState<boolean>(getInitialEnabled);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const setEnabled = useCallback((next: boolean) => {
    localStorage.setItem(STORAGE_KEY, String(next));
    setEnabledState(next);
  }, []);

  const toggle = useCallback(() => {
    setEnabled(!enabled);
  }, [enabled, setEnabled]);

  const speak = useCallback(
    (text: string) => {
      if (!enabled || !supported) return;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    },
    [enabled, supported],
  );

  return { enabled, toggle, supported, speak };
}
