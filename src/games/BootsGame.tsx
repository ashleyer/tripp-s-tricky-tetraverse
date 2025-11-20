import React, { useState, useEffect } from 'react';
import { playSound } from '../utils/sound';

interface SimpleGameProps {
  onFinish: (score: number, attempts: number, metrics?: Record<string, number>) => void;
  onExit?: () => void;
}

const BootsGame: React.FC<SimpleGameProps> = ({ onFinish, onExit }) => {
  const COLORS = ["🟡", "🟢", "🟣", "🔴"];
  const [targetColor, setTargetColor] = useState("");
  const [choices, setChoices] = useState<string[]>([]);
  const [clickedIndex, setClickedIndex] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [finished, setFinished] = useState(false);

  const startNewGame = () => {
    setTargetColor(COLORS[Math.floor(Math.random() * 4)]);
    setChoices(Array.from({ length: 6 }, () => COLORS[Math.floor(Math.random() * 4)]));
    setClickedIndex(null);
    setAttempts(0);
    setFinished(false);
    playSound('click');
  };

  useEffect(() => {
    startNewGame();
  }, []);

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
        <div className="game-success-message" style={{ textAlign: 'center', marginTop: '1rem' }}>
          <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
            Isabelle loves your style. You picked the right boots!
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

export default BootsGame;
