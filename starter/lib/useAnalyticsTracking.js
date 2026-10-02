import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '@clerk/nextjs';

const SESSION_KEY = 'dosnineAnalyticsSessionId';

function getSessionId() {
  if (typeof window === 'undefined') return null;
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function detectDevice() {
  if (typeof window === 'undefined') return { device: null, browser: null, os: null };
  const ua = navigator.userAgent;
  const width = window.innerWidth;

  let device = 'desktop';
  if (/Mobi|Android/i.test(ua) && width < 768) device = 'mobile';
  else if (width < 1024) device = 'tablet';

  let browser = 'Other';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = 'Chrome';
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';

  let os = 'Other';
  if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Win/i.test(ua)) os = 'Windows';
  else if (/Mac/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  return { device, browser, os };
}

async function send(payload) {
  try {
    await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    /* silent */
  }
}

export function useAnalyticsTracking() {
  const router = useRouter();
  const { user, isSignedIn } = useUser();
  const entryTimeRef = useRef(null);
  const maxScrollRef = useRef(0);
  const currentPathRef = useRef(null);
  const mountedRef = useRef(false);

  // Track scroll depth during the session on this page
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onScroll = () => {
      const scrolled = window.scrollY + window.innerHeight;
      const total = document.documentElement.scrollHeight;
      if (!total) return;
      const pct = Math.min(100, Math.round((scrolled / total) * 100));
      if (pct > maxScrollRef.current) maxScrollRef.current = pct;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // On path change: flush the previous page's engagement, then fire a new page_view
  useEffect(() => {
    if (!router.isReady) return;

    const currentPath = router.asPath || router.pathname;
    const { device, browser, os } = detectDevice();

    // Flush engagement for the previous page
    if (mountedRef.current && currentPathRef.current && entryTimeRef.current) {
      const timeOnPage = Date.now() - entryTimeRef.current;
      if (timeOnPage > 500) {
        send({
          event_type: 'engagement',
          path: currentPathRef.current,
          time_on_page_ms: timeOnPage,
          scroll_depth: maxScrollRef.current,
          session_id: getSessionId(),
          clerk_user_id: user?.id || null,
          is_authenticated: Boolean(isSignedIn),
          device_type: device,
          browser,
          os,
        });
      }
    }

    // Reset for the new page
    entryTimeRef.current = Date.now();
    maxScrollRef.current = 0;
    currentPathRef.current = currentPath;
    mountedRef.current = true;

    // Fire the page_view
    send({
      event_type: 'page_view',
      path: currentPath,
      page_url:
        typeof window !== 'undefined' ? window.location.href : currentPath,
      referrer:
        typeof document !== 'undefined' ? document.referrer || null : null,
      session_id: getSessionId(),
      clerk_user_id: user?.id || null,
      is_authenticated: Boolean(isSignedIn),
      device_type: device,
      browser,
      os,
      language:
        typeof navigator !== 'undefined' ? navigator.language : null,
      screen_width:
        typeof window !== 'undefined' ? window.innerWidth : null,
      screen_height:
        typeof window !== 'undefined' ? window.innerHeight : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.asPath, router.isReady]);

  // Flush engagement on unload
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onUnload = () => {
      if (!currentPathRef.current || !entryTimeRef.current) return;
      const timeOnPage = Date.now() - entryTimeRef.current;
      if (timeOnPage < 500) return;

      const { device, browser, os } = detectDevice();
      const payload = JSON.stringify({
        event_type: 'engagement',
        path: currentPathRef.current,
        time_on_page_ms: timeOnPage,
        scroll_depth: maxScrollRef.current,
        session_id: getSessionId(),
        device_type: device,
        browser,
        os,
      });
      // sendBeacon is the reliable way to fire on unload
      try {
        navigator.sendBeacon(
          '/api/track',
          new Blob([payload], { type: 'application/json' })
        );
      } catch {
        /* silent */
      }
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, []);
}