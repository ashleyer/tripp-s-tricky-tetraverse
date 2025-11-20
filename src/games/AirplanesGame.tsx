import React, { useEffect, useRef, useState } from 'react';
import { playSound } from '../utils/sound';
import { createConfetti } from '../utils/confetti';

interface SimpleGameProps {
  onFinish: (score: number, attempts: number, metrics?: Record<string, number>) => void;
  onExit?: () => void;
}

type PlaneState = {
  id: number;
  emoji: string;
  caught: boolean;
  top: number; // percent
  duration: number; // seconds
  delay: number; // seconds
};

const AirplanesGame: React.FC<SimpleGameProps> = ({ onFinish, onExit }) => {
  const TOTAL_OBJECTS = 10;
  const OBJECT_TYPES = ["✈️", "🚁", "🚀", "🛸", "🦅", "🎈", "🦸", "🐦", "🪁", "🐝"];
  
  const makeObjects = (): PlaneState[] =>
    Array.from({ length: TOTAL_OBJECTS }, (_, i) => ({
      id: i,
      emoji: OBJECT_TYPES[Math.floor(Math.random() * OBJECT_TYPES.length)],
      caught: false,
      top: Math.floor(Math.random() * 80) + 5, // 5% to 85%
      duration: 5 + Math.random() * 7, // 5-12s
      delay: Math.random() * 6, // 0-6s stagger
    }));

  const [objects, setObjects] = useState<PlaneState[]>([]);
  const [caughtCount, setCaughtCount] = useState(0);
  const [clicks, setClicks] = useState(0);
  const [finished, setFinished] = useState(false);
  const areaRef = useRef<HTMLDivElement | null>(null);

  const startNewGame = () => {
    setObjects(makeObjects());
    setCaughtCount(0);
    setClicks(0);
    setFinished(false);
    playSound('click');
  };

  useEffect(() => {
    startNewGame();
  }, []);

  const handleObjectClick = (id: number) => {
    if (finished) return;
    
    // Find the object to check if it's already caught
    const obj = objects.find(o => o.id === id);
    if (!obj || obj.caught) return;

    playSound('click');
    setClicks((prev) => prev + 1);
    setObjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, caught: true } : p))
    );
    setCaughtCount((prev) => {
      const next = prev + 1;
      // announce progress for screen readers
      try { window.dispatchEvent(new CustomEvent('ttt-announce', { detail: `Caught ${next} of ${TOTAL_OBJECTS} objects` })); } catch (e) {}
      if (next === TOTAL_OBJECTS) {
        playSound('success');
        setFinished(true);
        const score = Math.max(10, 100 - (clicks + 1 - TOTAL_OBJECTS) * 5);
        onFinish(score, clicks + 1, { reactionScore: score });
        // celebratory confetti in the play area
        try { createConfetti(areaRef.current, 28); } catch (e) {}
        try { window.dispatchEvent(new CustomEvent('ttt-announce', { detail: `All flying objects caught! Great reflexes!` })); } catch (e) {}
      }
      return next;
    });
  };

  return (
    <div className="game-panel">
      <p className="game-instructions">
        Tap the flying things as they zoom across the sky! Catch them all!
      </p>
      <div
        ref={areaRef}
        className="planes-area"
        aria-label="Sky with flying objects"
        aria-live="polite"
      >
        {objects.map((obj) => (
          <button
            key={obj.id}
            type="button"
            className={`flying-object ${obj.caught ? "flying-object-caught" : ""}`}
            onClick={() => handleObjectClick(obj.id)}
            aria-label={obj.caught ? "Caught!" : `Catch ${obj.emoji}`}
            style={{
              top: `${obj.top}%`,
              animationDuration: `${obj.duration}s`,
              animationDelay: `${obj.delay}s`,
              // If caught, we let the CSS class handle the transition/hiding
            }}
            disabled={obj.caught}
          >
            <span aria-hidden="true">{obj.emoji}</span>
          </button>
        ))}
      </div>
      <p className="game-meta-small">
        Caught: {caughtCount} / {TOTAL_OBJECTS}
      </p>
      {finished && (
        <div className="game-success-message" style={{ textAlign: 'center', marginTop: '1rem' }}>
          <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
            The sky is clear! You're a super catcher!
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button 
              className="primary-button interactive-hover" 
              onClick={startNewGame}
            >
              Play Again 🔄
            </button>
            {onExit && (
              <button 
                className="secondary-button interactive-hover" 
                onClick={onExit}
              >
                Back to Menu 🏠
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AirplanesGame;
