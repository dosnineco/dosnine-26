import { useEffect } from 'react'

export default function AdBanner() {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error('Adsense error:', e);
    }
  }, []);

  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block', textAlign: 'center' }}
      data-ad-client="ca-pub-2046215299064356" // replace with your ID
      data-ad-slot="XXXXXXXXXX" // replace with your ad slot
      data-ad-format="auto"
      data-full-width-responsive="true"
    ></ins>
  )
}
