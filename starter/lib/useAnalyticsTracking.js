import { useEffect } from 'react';
import { useRouter } from 'next/router';

export function useAnalyticsTracking() {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;

    // Generate or retrieve session ID
    const getSessionId = () => {
      if (typeof window === 'undefined') return null;
      let sessionId = sessionStorage.getItem('analytics_session_id');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('analytics_session_id', sessionId);
      }
      return sessionId;
    };

    const trackPageClick = async () => {
      try {
        const sessionId = getSessionId();
        const now = new Date().toISOString();

        // Prepare click data
        const clickData = {
          path: router.asPath || router.pathname,
          source: document.referrer ? new URL(document.referrer).hostname : 'direct',
          referrer: document.referrer || null,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          session_id: sessionId,
          created_at: now,
          ip_address: null, // Can be obtained from API if needed
          property_id: null, // Can be extracted from URL if needed
        };

        // POST to server-side tracking endpoint which uses the service role key
        try {
          console.debug('Analytics: sending', clickData);
          const resp = await fetch('/api/track', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(clickData),
          });
          const json = await resp.json().catch(() => null);
          if (!resp.ok) {
            console.warn('Analytics POST failed', resp.status, json);
          } else {
            console.debug('Analytics POST success', json);
          }
        } catch (postErr) {
          console.warn('Failed to POST analytics:', postErr);
        }
      } catch (err) {
        console.warn('Analytics tracking error:', err);
      }
    };

    // Track on route change
    trackPageClick();
  }, [router.asPath, router.isReady]);
}
