import { useEffect, useState } from 'react';

export default function useAnnouncer() {
  const [announceText, setAnnounceText] = useState('');

  useEffect(() => {
    const handler = (e: Event) => {
      const detail: any = (e as CustomEvent).detail;
      if (typeof detail === 'string') setAnnounceText(detail);
    };
    window.addEventListener('ttt-announce', handler as EventListener);
    return () => window.removeEventListener('ttt-announce', handler as EventListener);
  }, []);

  return { announceText, setAnnounceText };
}
