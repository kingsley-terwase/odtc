import { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';

export const GOOGLE_CLIENT_ID = import.meta.env?.VITE_GOOGLE_CLIENT_ID || '';
const SRC = 'https://accounts.google.com/gsi/client';

let loader;
const loadGsi = () => {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SRC; s.async = true; s.defer = true;
      s.onload = resolve; s.onerror = () => { loader = null; reject(new Error('Google sign-in could not load')); };
      document.head.appendChild(s);
    });
  }
  return loader;
};

// Google Identity Services button. Renders nothing until VITE_GOOGLE_CLIENT_ID is set.
export default function GoogleButton({ onCredential, onError, text = 'continue_with' }) {
  const ref = useRef(null);
  const cb = useRef(onCredential);
  cb.current = onCredential;
  const [ok, setOk] = useState(true);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return undefined;
    let dead = false;
    loadGsi().then(() => {
      if (dead || !ref.current) return;
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: (r) => r?.credential && cb.current(r.credential) });
      window.google.accounts.id.renderButton(ref.current, { theme: 'outline', size: 'large', shape: 'pill', text, width: Math.min(400, ref.current.offsetWidth || 360), logo_alignment: 'center' });
    }).catch((e) => { if (!dead) { setOk(false); onError?.(e.message); } });
    return () => { dead = true; };
  }, [text, onError]);

  if (!GOOGLE_CLIENT_ID || !ok) return null;
  return <Box ref={ref} sx={{ display: 'flex', justifyContent: 'center', minHeight: 44, width: '100%' }} />;
}
