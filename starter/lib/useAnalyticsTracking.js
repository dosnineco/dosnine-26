import { useEffect } from 'react';
import { useRouter } from 'next/router';

export function useAnalyticsTracking() {
  const router = useRouter();

  const getSessionId = () => {
    if (typeof window === 'undefined') return null;
    
    let sessionId = localStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  };

  const trackPageView = async () => {
    try {
      const sessionId = getSessionId();
      const referrer = document.referrer;
      const source = new URLSearchParams(window.location.search).get('utm_source') || 
                     (referrer ? new URL(referrer).hostname : 'direct');
      
      await fetch('/api/admin/track-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: router.asPath,
          source,
          referrer,
          session_id: sessionId,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString()
        })
      });
    } catch (err) {
      console.error('Analytics tracking error:', err);
    }
  };

  const trackLinkClick = async (e) => {
    if (e.target.dataset.track === 'true') {
      try {
        const sessionId = getSessionId();
        const referrer = document.referrer;
        const source = new URLSearchParams(window.location.search).get('utm_source') || 
                       (referrer ? new URL(referrer).hostname : 'direct');
        
        await fetch('/api/admin/track-click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: e.target.href || router.asPath,
            source,
            referrer,
            session_id: sessionId,
            user_agent: navigator.userAgent,
            timestamp: new Date().toISOString()
          })
        });
      } catch (err) {
        console.error('Link click tracking error:', err);
      }
    }
  };

  useEffect(() => {
    trackPageView();
  }, [router.asPath]);

  useEffect(() => {
    document.addEventListener('click', trackLinkClick);
    return () => document.removeEventListener('click', trackLinkClick);
  }, [router.asPath]);
}
