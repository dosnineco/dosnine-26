import { useEffect } from 'react';
import { useRouter } from 'next/router';

export function useAnalyticsTracking() {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;

    const trackPageClick = async () => {
      try {
        const now = new Date().toISOString();

        // Prepare analytics data matching server schema
        const trackData = {
          event_type: 'page_view',
          page_url: router.asPath || router.pathname,
          created_at: now,
        };

        // POST to server-side tracking endpoint
        try {
          // console.debug('Analytics: sending', trackData);
          const resp = await fetch('/api/track', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(trackData),
          });
          const json = await resp.json().catch(() => null);
          if (!resp.ok) {
            console.warn('Analytics POST failed', resp.status, json);
          } else {
            console.debug('Analytics POST success');
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
