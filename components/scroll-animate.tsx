'use client';

import { useEffect, useRef } from 'react';

export function ScrollAnimate({ 
  children, 
  className = '',
  animation = 'up' 
}: { 
  children: React.ReactNode;
  className?: string;
  animation?: 'up' | 'left' | 'right' | 'scale';
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  const animationClass = animation === 'left' 
    ? 'scroll-animate-left' 
    : animation === 'right' 
    ? 'scroll-animate-right' 
    : animation === 'scale' 
    ? 'scroll-animate-scale' 
    : 'scroll-animate';

  return (
    <div ref={ref} className={`${animationClass} ${className}`}>
      {children}
    </div>
  );
}
