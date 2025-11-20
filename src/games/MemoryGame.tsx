import React, { useMemo, useState, useRef } from 'react';
import { playSound } from '../utils/sound';

interface SimpleGameProps {
  onFinish: (score: number, attempts: number, metrics?: Record<string, number>) => void;
}

const MemoryGame: React.FC<SimpleGameProps> = ({ onFinish }) => {
  const initialCards = useMemo(
    () => ["🐶", "🐶", "🦄", "🦄", "✈️", "✈️", "🧱", "🧱"],
    []
  );

  const shuffled = useMemo(
    () => [...initialCards].sort(() => Math.random() - 0.5),
    [initialCards]
  );

  const [cards] = useState<string[]>(shuffled);
  const [flippedIndexes, setFlippedIndexes] = useState<number[]>([]);
  const [matchedIndexes, setMatchedIndexes] = useState<number[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [finished, setFinished] = useState(false);
  const firstFlipTimestamp = useRef<number | null>(null);
  const holdTimes = useRef<number[]>([]);

  const handleCardClick = (index: number) => {
    if (finished) return;
    if (flippedIndexes.includes(index) || matchedIndexes.includes(index)) {
      return;
    }
    if (flippedIndexes.length === 2) return;

    playSound('click');
    const newFlipped = [...flippedIndexes, index];
    setFlippedIndexes(newFlipped);

    if (newFlipped.length === 2) {
      const [a, b] = newFlipped;
      setAttempts((prev) => prev + 1);
      // measure hold time between the two flips
      if (firstFlipTimestamp.current) {
        const dt = (Date.now() - firstFlipTimestamp.current) / 1000;
        holdTimes.current.push(dt);
      }
      firstFlipTimestamp.current = null;
      if (cards[a] === cards[b]) {
        playSound('success');
        setMatchedIndexes((prev) => {
          const next = [...prev, a, b];
          // check finish condition using the updated array
          if (next.length === cards.length) {
            setFinished(true);
            const score = 100 - (attempts + 1 - cards.length / 2) * 10;
            const avgHold = holdTimes.current.length ? (holdTimes.current.reduce((s,n)=>s+n,0)/holdTimes.current.length) : 0;
            const concentration = Math.min(100, Math.round(avgHold * 20));
            onFinish(Math.max(10, score), attempts + 1, { concentration, avgHoldTime: Math.round(avgHold*100)/100 });
          }
          return next;
        });
        setFlippedIndexes([]);
      } else {
        playSound('fail');
        setTimeout(() => setFlippedIndexes([]), 800);
      }
    }
  };

  const handleCardFlipStart = () => {
    if (flippedIndexes.length === 0) {
      firstFlipTimestamp.current = Date.now();
    }
  };

  return (
    <div className="game-panel">
      <p className="game-instructions">
        Tap two cards to flip them over. Try to find all the matching pairs
        using as few tries as you can.
      </p>
      <div className="memory-grid" role="grid" aria-label="Memory cards grid">
        {cards.map((card, index) => {
          const isFlipped =
            flippedIndexes.includes(index) || matchedIndexes.includes(index);
          return (
            <button
              key={index}
              type="button"
              className={`memory-card ${isFlipped ? "memory-card-flipped" : ""}`}
              onClick={() => { handleCardFlipStart(); handleCardClick(index); }}
              aria-label={isFlipped ? `Card showing ${card}` : "Hidden card"}
            >
              <span aria-hidden="true">{isFlipped ? card : "❓"}</span>
            </button>
          );
        })}
      </div>
      <p className="game-meta-small">Attempts: {attempts}</p>
      {finished && (
        <p className="game-success-message">
          Great job! You matched all the cards!
        </p>
      )}
    </div>
  );
};

export default MemoryGame;
