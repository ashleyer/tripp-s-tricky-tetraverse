import React, { useEffect, useRef, useState } from 'react';
import { playSound } from '../utils/sound';
import { createConfetti } from '../utils/confetti';

interface SimpleGameProps {
  onFinish: (score: number, attempts: number, metrics?: Record<string, number>) => void;
}

type PlaneState = {
  id: number;
  caught: boolean;
  top: number; // percent
  duration: number; // seconds
  delay: number; // seconds
};

const AirplanesGame: React.FC<SimpleGameProps> = ({ onFinish }) => {
  const TOTAL_PLANES = 6;
  const makePlanes = (): PlaneState[] =>
    Array.from({ length: TOTAL_PLANES }, (_, i) => ({
      id: i,
      caught: false,
      top: Math.round(6 + Math.random() * 72),
      duration: Math.round(6 + Math.random() * 10),
      delay: Math.round(Math.random() * 300) / 100, // up to 3s
    }));

  const [planes, setPlanes] = useState<PlaneState[]>(makePlanes);
  const [caughtCount, setCaughtCount] = useState(0);
  const [clicks, setClicks] = useState(0);
  const [finished, setFinished] = useState(false);
  const areaRef = useRef<HTMLDivElement | null>(null);

  const handlePlaneClick = (id: number) => {
    if (finished) return;
    playSound('click');
    setClicks((prev) => prev + 1);
    setPlanes((prev) =>
      prev.map((p) => (p.id === id ? { ...p, caught: true } : p))
    );
    setCaughtCount((prev) => {
      const next = prev + 1;
      // announce progress for screen readers
      try { window.dispatchEvent(new CustomEvent('ttt-announce', { detail: `Caught ${next} of ${TOTAL_PLANES} planes` })); } catch (e) {}
      if (next === TOTAL_PLANES) {
        playSound('success');
        setFinished(true);
        const score = Math.max(10, 100 - (clicks + 1 - TOTAL_PLANES) * 5);
        onFinish(score, clicks + 1, { reactionScore: score });
        // celebratory confetti in the play area
        try { createConfetti(areaRef.current, 28); } catch (e) {}
        try { window.dispatchEvent(new CustomEvent('ttt-announce', { detail: `All planes caught! Great reflexes!` })); } catch (e) {}
      }
      return next;
    });
  };

  // allow restart if wanted: when finished, repopulate after a short delay
  useEffect(() => {
    if (!finished) return;
    const t = setTimeout(() => {
      // reset for a fresh round without forcing the user back
      setPlanes(makePlanes);
      setCaughtCount(0);
      setClicks(0);
      setFinished(false);
    }, 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  return (
    <div className="game-panel">
      <p className="game-instructions">
        Tap the airplanes as they “zoom” by. Catch them all!
      </p>
      <div
        ref={areaRef}
        className="planes-area"
        aria-label="Airplanes to tap"
        aria-live="polite"
      >
        {planes.map((plane) => (
          <button
            key={plane.id}
            type="button"
            className={`plane ${plane.caught ? "plane-caught" : "fly"}`}
            onClick={() => handlePlaneClick(plane.id)}
            aria-label={plane.caught ? "Plane already caught" : "Catch plane"}
            style={{
              top: `${plane.top}%`,
              animationDuration: `${plane.duration}s`,
              animationDelay: `${plane.delay}s`,
              animationPlayState: plane.caught ? 'paused' : 'running',
            }}
          >
            <span aria-hidden="true">✈️</span>
          </button>
        ))}
      </div>
      <p className="game-meta-small">
        Caught: {caughtCount} / {TOTAL_PLANES}
      </p>
      {finished && (
        <p className="game-success-message">
          All planes landed safely. Great reflexes!
        </p>
      )}
    </div>
  );
};

export default AirplanesGame;
