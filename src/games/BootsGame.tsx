import React, { useState } from 'react';
import { playSound } from '../utils/sound';

interface SimpleGameProps {
  onFinish: (score: number, attempts: number, metrics?: Record<string, number>) => void;
}

const BootsGame: React.FC<SimpleGameProps> = ({ onFinish }) => {
  const COLORS = ["🟡", "🟢", "🟣", "🔴"];
  const [targetColor] = useState(() => COLORS[Math.floor(Math.random() * 4)]);
  const [choices] = useState(() =>
    Array.from({ length: 6 }, () => COLORS[Math.floor(Math.random() * 4)])
  );
  const [clickedIndex, setClickedIndex] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [finished, setFinished] = useState(false);

  const handleBootClick = (index: number) => {
    if (finished) return;
    playSound('click');
    setClickedIndex(index);
    setAttempts((prev) => prev + 1);

    const isCorrect = choices[index] === targetColor;
    if (isCorrect) {
      playSound('success');
      setFinished(true);
      const score = Math.max(10, 100 - (attempts) * 20);
      onFinish(score, attempts + 1, { accuracy: score });
    } else {
      playSound('fail');
    }
  };

  return (
    <div className="game-panel">
      <p className="game-instructions">
        Isabelle needs boots that match this color: {" "}
        <span aria-hidden="true" className="boots-target">
          {targetColor}
        </span>
        . Tap the boots that look the same.
      </p>
      <div className="boots-row" aria-label="Boot choices">
        {choices.map((color, index) => {
          const selected = clickedIndex === index;
          return (
            <button
              key={`${color}-${index}`}
              type="button"
              className={`boots-cell ${selected ? "boots-cell-selected" : ""}`}
              onClick={() => handleBootClick(index)}
              aria-pressed={selected}
            >
              <span aria-hidden="true">👢</span>
              <span aria-hidden="true" className="boots-color-dot">
                {color}
              </span>
            </button>
          );
        })}
      </div>
      <p className="game-meta-small">Guesses: {attempts}</p>
      {finished && (
        <p className="game-success-message">
          Isabelle loves your style. You picked the right boots!
        </p>
      )}
    </div>
  );
};

export default BootsGame;
