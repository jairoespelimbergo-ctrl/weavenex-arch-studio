import React, { useEffect, useRef, useState } from 'react';

interface ArchitectRevealCardProps {
  index: number;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}

export function ArchitectRevealCard({
  index,
  onClick,
  className = '',
  children
}: ArchitectRevealCardProps) {
  const cardRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px'
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const delayMs = (index % 3) * 100;

  return (
    <article
      ref={cardRef}
      onClick={onClick}
      style={{ transitionDelay: `${delayMs}ms` }}
      className={`transition-all duration-700 ease-out will-change-transform ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${className}`}
    >
      {children}
    </article>
  );
}
