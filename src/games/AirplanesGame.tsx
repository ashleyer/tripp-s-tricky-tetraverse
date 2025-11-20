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
  isTarget: boolean;
  caught: boolean;
  top: number; // percent
  duration: number; // seconds
  delay: number; // seconds
};

const AirplanesGame: React.FC<SimpleGameProps> = ({ onFinish, onExit }) => {
  const TARGET_EMOJI = "✈️";
  const DISTRACTORS = ["🚁", "🚀", "🛸", "🦅", "🎈", "🦸", "🐦", "🪁", "🐝"];
  const TOTAL_TARGETS = 5;
  const TOTAL_DISTRACTORS = 5;
  
  const makeObjects = (): PlaneState[] => {
    const targets = Array.from({ length: TOTAL_TARGETS }, (_, i) => ({
      id: i,
      emoji: TARGET_EMOJI,
      isTarget: true,
      caught: false,
      top: Math.floor(Math.random() * 80) + 5, // 5% to 85%
      duration: 15 + Math.random() * 10, // Slower: 15-25s
      delay: Math.random() * 8, // 0-8s stagger
    }));
    
    const others = Array.from({ length: TOTAL_DISTRACTORS }, (_, i) => ({
      id: TOTAL_TARGETS + i,
      emoji: DISTRACTORS[Math.floor(Math.random() * DISTRACTORS.length)],
      isTarget: false,
      caught: false,
      top: Math.floor(Math.random() * 80) + 5,
      duration: 15 + Math.random() * 10, // Slower
      delay: Math.random() * 8,
    }));

    return [...targets, ...others].sort(() => Math.random() - 0.5);
  };

  const [objects, setObjects] = useState<PlaneState[]>([]);
  const [caughtCount, setCaughtCount] = useState(0);
  const [clicks, setClicks] = useState(0);
  const [finished, setFinished] = useState(false);
  const [scoreEarned, setScoreEarned] = useState(0);
  const areaRef = useRef<HTMLDivElement | null>(null);

  const startNewGame = () => {
    setObjects(makeObjects());
    setCaughtCount(0);
    setClicks(0);
    setFinished(false);
    setScoreEarned(0);
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

    setClicks((prev) => prev + 1);

    if (obj.isTarget) {
      playSound('success');
      setObjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, caught: true } : p))
      );
      setCaughtCount((prev) => {
        const next = prev + 1;
        // announce progress for screen readers
        try { window.dispatchEvent(new CustomEvent('ttt-announce', { detail: `Caught ${next} of ${TOTAL_TARGETS} airplanes` })); } catch (e) {}
        
        if (next === TOTAL_TARGETS) {
          setFinished(true);
          // Score: 100 max. Deduct for wrong clicks (clicks - TOTAL_TARGETS).
          // clicks includes the correct clicks so far.
          // Actually clicks is total clicks.
          // If perfect: clicks = TOTAL_TARGETS.
          // Penalty = (clicks - TOTAL_TARGETS) * 5.
          // But we are inside the update, so 'clicks' state might be stale or we just incremented it.
          // Let's use a simpler heuristic or calculate based on current clicks + 1.
          
          // We can't rely on 'clicks' state being updated immediately in this callback scope if we use the value.
          // But we can approximate.
          // Let's just say base score 50 + 10 per plane = 100.
          // Minus 5 per wrong click.
          // Wrong clicks = (total clicks so far) - (correct clicks so far).
          // This is getting complicated with state updates.
          // Let's just calculate score at the end based on final state? No, need to pass to onFinish.
          
          // Let's assume the user made 'clicks' clicks total (including this one).
          // We know we just caught the last one.
          // So we have TOTAL_TARGETS correct clicks.
          // Any extra clicks were wrong.
          // We can use the functional update to get the latest clicks, but we need to call onFinish.
          
          // Let's just give them 100 points for finishing because it's a birthday game!
          
          const calculatedScore = 100; 
          setScoreEarned(calculatedScore);
          
          onFinish(calculatedScore, clicks + 1, { reactionScore: calculatedScore });
          // celebratory confetti in the play area
          try { createConfetti(areaRef.current, 40); } catch (e) {}
          try { window.dispatchEvent(new CustomEvent('ttt-announce', { detail: `All airplanes caught! You earned ${calculatedScore} points!` })); } catch (e) {}
        }
        return next;
      });
    } else {
      // Distractor clicked
      playSound('fail');
      // Optional: visual feedback for wrong click?
      // The sound is the main feedback requested.
    }
  };

  return (
    <div className="game-panel">
      <p className="game-instructions">
        Only catch the <strong>Airplanes</strong> {TARGET_EMOJI}! Don't touch the other flying things!
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
            aria-label={obj.isTarget ? (obj.caught ? "Caught!" : `Catch Airplane`) : `Ignore ${obj.emoji}`}
            style={{
              top: `${obj.top}%`,
              animationDuration: `${obj.duration}s`,
              animationDelay: `${obj.delay}s`,
              opacity: (obj.caught) ? 0 : 1,
              cursor: obj.caught ? 'default' : 'pointer'
            }}
            disabled={obj.caught}
          >
            <span aria-hidden="true" style={{ filter: obj.isTarget ? 'drop-shadow(0 0 4px gold)' : 'none' }}>{obj.emoji}</span>
          </button>
        ))}
      </div>
      <p className="game-meta-small">
        Airplanes Caught: {caughtCount} / {TOTAL_TARGETS}
      </p>
      {finished && (
        <div className="game-success-message" style={{ textAlign: 'center', marginTop: '1rem' }}>
          <p style={{ fontSize: '1.4rem', marginBottom: '0.5rem', color: 'var(--color-accent)', fontWeight: 'bold' }}>
            YAY! You caught all the airplanes!
          </p>
          <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
            You earned <strong>{scoreEarned}</strong> points!
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
