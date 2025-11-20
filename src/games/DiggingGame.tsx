import React, { useState, useEffect } from 'react';
import { playSound } from '../utils/sound';

interface SimpleGameProps {
  onFinish: (score: number, attempts: number, metrics?: Record<string, number>) => void;
  onExit?: () => void;
}

const DiggingGame: React.FC<SimpleGameProps> = ({ onFinish, onExit }) => {
  const cells = Array.from({ length: 9 }, (_, i) => i);
  const [treasureIndex, setTreasureIndex] = useState<number>(0);
  const [dug, setDug] = useState<number[]>([]);
  const [found, setFound] = useState(false);

  const startNewGame = () => {
    setTreasureIndex(Math.floor(Math.random() * cells.length));
    setDug([]);
    setFound(false);
    playSound('click');
  };

  useEffect(() => {
    startNewGame();
  }, []);

  const handleDig = (index: number) => {
    if (found || dug.includes(index)) return;
    playSound('click');
    const newDug = [...dug, index];
    setDug(newDug);
    if (index === treasureIndex) {
      playSound('success');
      setFound(true);
      const attempts = newDug.length;
      const score = Math.max(10, 100 - (attempts - 1) * 15);
      onFinish(score, attempts, { persistence: attempts });
    } else if (newDug.length === cells.length) {
      playSound('fail');
      onFinish(10, newDug.length, { persistence: newDug.length });
    }
  };

  return (
    <div className="game-panel">
      <p className="game-instructions">
        Tap a spot marked with X to dig. Somewhere in this sandy island is Long Shorty's
        hidden loot. Can you find it?
      </p>
      <div className="dig-grid" role="grid" aria-label="Digging squares">
        {cells.map((cell) => {
          const isDug = dug.includes(cell);
          const isTreasure = found && cell === treasureIndex;
          return (
            <button
              key={cell}
              type="button"
              className={`dig-cell ${isDug ? "dig-cell-dug" : ""} ${
                isTreasure ? "dig-cell-treasure" : ""
              }`}
              onClick={() => handleDig(cell)}
              aria-label={
                isTreasure
                  ? "Treasure found here!"
                  : isDug
                  ? "Already dug here"
                  : "Undug ground"
              }
            >
              <span aria-hidden="true">
                {isTreasure ? "💰" : isDug ? "🕳️" : "❌"}
              </span>
            </button>
          );
        })}
      </div>
      {found && (
        <div className="game-success-message" style={{ textAlign: 'center', marginTop: '1rem' }}>
          <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
            You found the loot! Nice digging, matey!
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

export default DiggingGame;
