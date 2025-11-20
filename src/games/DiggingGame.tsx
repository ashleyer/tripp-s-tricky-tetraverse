import React, { useState } from 'react';
import { playSound } from '../utils/sound';

interface SimpleGameProps {
  onFinish: (score: number, attempts: number, metrics?: Record<string, number>) => void;
}

const DiggingGame: React.FC<SimpleGameProps> = ({ onFinish }) => {
  const cells = Array.from({ length: 9 }, (_, i) => i);
  const [treasureIndex] = useState<number>(
    () => Math.floor(Math.random() * cells.length)
  );
  const [dug, setDug] = useState<number[]>([]);
  const [found, setFound] = useState(false);

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
        Tap a square to dig. Somewhere in this little yard is a hidden
        treasure. Can you find it?
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
                {isTreasure ? "💎" : isDug ? "🕳" : "🟫"}
              </span>
            </button>
          );
        })}
      </div>
      {found && (
        <p className="game-success-message">
          You found the treasure! Nice digging!
        </p>
      )}
    </div>
  );
};

export default DiggingGame;
