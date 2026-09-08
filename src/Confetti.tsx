import { useEffect, useState, type CSSProperties } from 'react';
import './confetti.css';

// Fixed values keep renders stable while scattering pieces across the viewport.
const pieces = Array.from({ length: 252 }, (_, index) => ({
  left: `${(index * 37) % 100}%`,
  '--delay': `${Math.floor(index / 126) * 1.25 + (index % 12) * 0.065}s`,
  '--duration': `${4 + (index % 7) * 0.17}s`,
  '--drift': `${((index * 29) % 200) - 100}px`,
  '--spin': `${index % 2 ? -540 : 720}deg`,
  '--color': ['var(--fir)', 'var(--blue)', 'var(--sunshine)', '#92c951', '#ef9561', '#69bde8'][index % 6],
}) as CSSProperties);

export function Confetti() {
  const [visible, setVisible] = useState(() => !window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => setVisible(false), 7500);
    return () => window.clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return <div className="celebration-confetti" aria-hidden="true">
    {pieces.map((style, index) => <span className="confetti-piece" style={style} key={index}><i /></span>)}
  </div>;
}
