import React, { useRef, useState, useEffect } from 'react';

export default function LazyImage({ src, alt, className, placeholder }) {
  const imgRef = useRef();
  const [visible, setVisible] = useState(false);
  const [loadedSrc, setLoadedSrc] = useState(null);

  useEffect(() => {
    if ('loading' in HTMLImageElement.prototype) {
      // Browser supports native lazy loading
      setLoadedSrc(src);
      return;
    }

    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      });
    });

    if (imgRef.current) obs.observe(imgRef.current);

    return () => obs.disconnect();
  }, [src]);

  useEffect(() => {
    if (visible) setLoadedSrc(src);
  }, [visible, src]);

  if (!loadedSrc) {
    return (
      <div ref={imgRef} className={className} aria-hidden>
        {placeholder || <div className="w-full h-full bg-gray-200" />}
      </div>
    );
  }

  return <img src={loadedSrc} alt={alt} className={className} loading="lazy" />;
}
