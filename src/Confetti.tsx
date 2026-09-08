import { useEffect, useRef, useState } from 'react';
import { startConfetti } from './confetti-renderer';
import './confetti.css';

export function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(() => !window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);

  useEffect(() => {
    if (!visible || !canvasRef.current) return;
    const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const stop = startConfetti(canvasRef.current, () => setVisible(false));
    const onMotionChange = () => { if (motion?.matches) { stop(); setVisible(false); } };
    motion?.addEventListener('change', onMotionChange);
    return () => { stop(); motion?.removeEventListener('change', onMotionChange); };
  }, [visible]);

  if (!visible) return null;

  return <canvas ref={canvasRef} className="celebration-confetti" aria-hidden="true" />;
}
