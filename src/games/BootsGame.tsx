import React, { useState, useEffect, useRef } from 'react';
import { playSound } from '../utils/sound';
import { createConfetti } from '../utils/confetti';
import { GameOverModal } from '../components/UI';

interface SimpleGameProps {
  onFinish: (score: number, attempts: number, metrics?: Record<string, number>) => void;
  onExit?: () => void;
}

type BootItem = {
  id: number;
  color: string; // 'yellow', 'green', 'purple', 'red'
  emoji: string;
  left: number; // 5-85%
  duration: number; // speed
  caught: boolean;
};

const BootsGame: React.FC<SimpleGameProps> = ({ onFinish, onExit }) => {
  const COLORS = [
    { id: 'yellow', label: 'Yellow', hex: '#FFD700', emoji: '🟡' },
    { id: 'green', label: 'Green', hex: '#4CAF50', emoji: '🟢' },
    { id: 'purple', label: 'Purple', hex: '#9C27B0', emoji: '🟣' },
    { id: 'red', label: 'Red', hex: '#F44336', emoji: '🔴' },
  ];
  
  const [targetColor, setTargetColor] = useState(COLORS[0]);
  const [boots, setBoots] = useState<BootItem[]>([]);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [finished, setFinished] = useState(false);
  const [scoreEarned, setScoreEarned] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);
  const spawnTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const GOAL = 5;

  const startNewGame = () => {
    const t = COLORS[Math.floor(Math.random() * COLORS.length)];
    setTargetColor(t);
    setBoots([]);
    setScore(0);
    setMistakes(0);
    setFinished(false);
    setScoreEarned(0);
    nextId.current = 0;
    playSound('click');
    
    startSpawning();
  };

  const startSpawning = () => {
    if (spawnTimer.current) clearInterval(spawnTimer.current);
    
    spawnTimer.current = setInterval(() => {
      setBoots(prev => {
        if (prev.length > 8) return prev; 
        
        const isTarget = Math.random() > 0.4; 
        const colorObj = isTarget 
          ? targetColor 
          : COLORS.filter(c => c.id !== targetColor.id)[Math.floor(Math.random() * (COLORS.length - 1))];
          
        const newBoot: BootItem = {
          id: nextId.current++,
          color: colorObj.id,
          emoji: '👢',
          left: Math.floor(Math.random() * 80) + 10,
          duration: 3 + Math.random() * 3, // 3-6s fall time
          caught: false,
        };
        return [...prev, newBoot];
      });
    }, 1000); 
  };

  useEffect(() => {
    startNewGame();
    return () => {
      if (spawnTimer.current) clearInterval(spawnTimer.current);
    };
  }, []);

  // Check win condition
  useEffect(() => {
    if (score >= GOAL && !finished) {
      if (spawnTimer.current) clearInterval(spawnTimer.current);
      setFinished(true);
      playSound('success');
      const finalScore = Math.max(10, 100 - (mistakes * 10));
      setScoreEarned(finalScore);
      onFinish(finalScore, score + mistakes, { accuracy: Math.round((score / (score + mistakes || 1)) * 100) });
      if (containerRef.current) createConfetti(containerRef.current, 40);
    }
  }, [score, mistakes, finished, onFinish]);

  const handleBootClick = (id: number, colorId: string) => {
    if (finished) return;
    
    const boot = boots.find(b => b.id === id);
    if (!boot || boot.caught) return;

    if (colorId === targetColor.id) {
      playSound('pop');
      setBoots(prev => prev.map(b => b.id === id ? { ...b, caught: true } : b));
      setScore(s => s + 1);
    } else {
      playSound('fail');
      setMistakes(m => m + 1);
    }
  };

  const handleAnimationEnd = (id: number) => {
    setBoots(prev => prev.filter(b => b.id !== id));
  };

  return (
    <div className="game-panel" ref={containerRef} style={{ 
      overflow: 'hidden', 
      position: 'relative',
      background: `linear-gradient(to bottom, #ffffff 0%, ${targetColor.hex}22 100%)`
    }}>
      <div style={{ 
        position: 'absolute', top: 0, left: 0, right: 0, 
        padding: '10px', background: 'rgba(255,255,255,0.9)', 
        zIndex: 10, textAlign: 'center',
        borderBottom: `4px solid ${targetColor.hex}`,
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <p className="game-instructions" style={{ margin: 0 }}>
          Tap the <strong>{targetColor.label} Boots</strong>!
        </p>
        <div style={{ marginTop: 4, fontSize: '1.5rem', height: 30 }}>
          {Array.from({ length: GOAL }).map((_, i) => (
            <span key={i} style={{ opacity: i < score ? 1 : 0.2, filter: i < score ? 'none' : 'grayscale(1)' }}>
              {i < score ? '👢' : '🧦'}
            </span>
          ))}
        </div>
      </div>

      <div className="boots-rain-area" style={{ position: 'relative', height: '100%', marginTop: '60px' }}>
        {boots.map(boot => (
          <button
            key={boot.id}
            className={`falling-boot ${boot.caught ? 'boot-splashed' : ''}`}
            style={{
              position: 'absolute',
              left: `${boot.left}%`,
              top: -60,
              fontSize: '3.5rem',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              animation: `fall ${boot.duration}s linear forwards`,
              filter: boot.color === targetColor.id 
                ? `drop-shadow(0 0 8px ${targetColor.hex})` 
                : 'grayscale(0.6) opacity(0.8)',
              opacity: boot.caught ? 0 : 1,
              transition: 'opacity 0.2s, transform 0.2s',
              zIndex: boot.caught ? 5 : 1
            }}
            onClick={() => handleBootClick(boot.id, boot.color)}
            onAnimationEnd={() => handleAnimationEnd(boot.id)}
            disabled={boot.caught}
            aria-label={`${COLORS.find(c=>c.id===boot.color)?.label} boot`}
          >
            <div style={{ position: 'relative' }}>
              {boot.emoji}
              <div style={{
                position: 'absolute', bottom: 8, right: 8,
                width: 14, height: 14, borderRadius: '50%',
                background: COLORS.find(c => c.id === boot.color)?.hex,
                border: '2px solid white'
              }} />
            </div>
          </button>
        ))}
      </div>

      {finished && (
        <GameOverModal
          score={scoreEarned}
          onPlayAgain={startNewGame}
          onBack={onExit || (() => {})}
        />
      )}
      
      <style>{`
        @keyframes fall {
          from { transform: translateY(0px) rotate(-5deg); }
          to { transform: translateY(600px) rotate(5deg); }
        }
        .falling-boot:active { transform: scale(0.9); }
        .boot-splashed { transform: scale(1.4) rotate(15deg) !important; opacity: 0 !important; transition: all 0.3s ease-out !important; }
      `}</style>
    </div>
  );
};

export default BootsGame;
