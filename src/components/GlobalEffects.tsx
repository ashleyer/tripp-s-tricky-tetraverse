import { useEffect, useState } from 'react';
import { playPop } from '../utils/sound';

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  tx: string;
  ty: string;
}

export function GlobalEffects() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Play pop sound on every click
      playPop();
      
      // Create visual particles
      createParticles(e.clientX, e.clientY);
    };

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const createParticles = (x: number, y: number) => {
    const colors = ['#ff6b6b', '#4cc9f0', '#ffd93d', '#ff9f43', '#6c5ce7'];
    const newParticles: Particle[] = [];
    const count = 8;
    
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const velocity = 60 + Math.random() * 60;
      const tx = Math.cos(angle) * velocity + 'px';
      const ty = Math.sin(angle) * velocity + 'px';
      
      newParticles.push({
        id: Date.now() + Math.random(),
        x,
        y,
        color: colors[Math.floor(Math.random() * colors.length)],
        tx,
        ty
      });
    }

    setParticles(prev => [...prev, ...newParticles]);
    
    // Cleanup particles after animation
    setTimeout(() => {
      setParticles(prev => prev.slice(count));
    }, 1000);
  };

  return (
    <div id="global-effects-canvas" style={{ position: 'fixed', top: 0, left: 0, width: 0, height: 0, zIndex: 9999, pointerEvents: 'none' }}>
      {particles.map(p => (
        <div
          key={p.id}
          className="click-particle"
          style={{
            left: p.x,
            top: p.y,
            backgroundColor: p.color,
            '--tx': p.tx,
            '--ty': p.ty
          } as any}
        />
      ))}
    </div>
  );
}
