import React, { useState, useRef } from 'react';
import { playSound } from '../utils/sound';
import { createConfetti } from '../utils/confetti';

interface SimpleGameProps {
  onFinish: (score: number, attempts: number, metrics?: Record<string, number>) => void;
  onExit?: () => void;
}

const BootsGame: React.FC<SimpleGameProps> = ({ onFinish, onExit }) => {
  const [bootColor, setBootColor] = useState('#FFD700'); // Yellow default
  const [soleColor, setSoleColor] = useState('#333333');
  const [detailColor, setDetailColor] = useState('#FFFFFF');
  const [pattern, setPattern] = useState<string>('none');
  const [stickers, setStickers] = useState<{id: number, emoji: string, x: number, y: number}[]>([]);
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const bootRef = useRef<SVGSVGElement>(null);

  const PALETTE = [
    '#FFD700', '#FF6B6B', '#4CAF50', '#2196F3', '#9C27B0', 
    '#FF9800', '#795548', '#607D8B', '#E91E63', '#00BCD4',
    '#FFFFFF', '#333333'
  ];

  const STICKER_OPTIONS = ['⭐', '❤️', '🌸', '🦋', '🌈', '🦄', '🦖', '⚽', '🎀', '💎'];

  const handleBootClick = (e: React.MouseEvent) => {
    if (!selectedSticker || finished) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setStickers([...stickers, { id: Date.now(), emoji: selectedSticker, x, y }]);
    playSound('pop');
    setSelectedSticker(null); 
  };

  const handleFinish = () => {
    setFinished(true);
    playSound('success');
    if (containerRef.current) createConfetti(containerRef.current, 50);
    // Award points for creativity!
    const score = 100; 
    onFinish(score, 1, { creativity: 100 });
  };

  const reset = () => {
    setBootColor('#FFD700');
    setSoleColor('#333333');
    setDetailColor('#FFFFFF');
    setPattern('none');
    setStickers([]);
    setFinished(false);
    setSelectedSticker(null);
  };

  return (
    <div className="game-panel" ref={containerRef} style={{ 
      minHeight: '80vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: '#f0f8ff',
      padding: '10px',
      position: 'relative'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <h2 style={{ margin: '0 0 5px 0' }}>Design Isabelle's Boots!</h2>
        <p style={{ margin: 0, color: '#666' }}>Pick colors, patterns, and add stickers.</p>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        
        {/* Boot Preview */}
        <div 
          style={{ position: 'relative', width: '300px', height: '300px', cursor: selectedSticker ? 'crosshair' : 'default' }}
          onClick={handleBootClick}
        >
           {/* SVG Boot */}
           <svg ref={bootRef} viewBox="0 0 200 200" width="100%" height="100%" style={{ filter: 'drop-shadow(0 10px 10px rgba(0,0,0,0.2))' }}>
              <defs>
                <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="10" cy="10" r="3" fill={detailColor} fillOpacity="0.5"/>
                </pattern>
                <pattern id="stripes" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect x="0" y="0" width="10" height="20" fill={detailColor} fillOpacity="0.5"/>
                </pattern>
                <pattern id="stars" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
                   <path d="M15 0 L18 10 L29 10 L20 18 L23 29 L15 22 L7 29 L10 18 L1 10 L12 10 Z" fill={detailColor} fillOpacity="0.5" transform="scale(0.5) translate(15,15)"/>
                </pattern>
              </defs>
              
              {/* Boot Shape */}
              <path 
                d="M60,20 L140,20 L140,120 C140,150 120,170 90,170 L40,170 C30,170 20,160 20,150 L20,130 C20,120 30,110 40,110 L60,110 L60,20 Z" 
                fill={bootColor} 
                stroke="#333" 
                strokeWidth="3"
              />
              
              {/* Pattern Overlay */}
              {pattern !== 'none' && (
                 <path 
                 d="M60,20 L140,20 L140,120 C140,150 120,170 90,170 L40,170 C30,170 20,160 20,150 L20,130 C20,120 30,110 40,110 L60,110 L60,20 Z" 
                 fill={`url(#${pattern})`} 
                 style={{ pointerEvents: 'none' }}
               />
              )}

              {/* Sole */}
              <path 
                d="M20,150 L20,160 C20,175 30,180 40,180 L90,180 C130,180 150,150 150,120 L150,110 L140,110 L140,120 C140,145 125,170 90,170 L40,170 C30,170 20,160 20,150 Z" 
                fill={soleColor} 
                stroke="#333" 
                strokeWidth="2"
              />

              {/* Top Rim */}
              <rect x="58" y="20" width="84" height="15" rx="5" fill={detailColor} stroke="#333" strokeWidth="2" />

           </svg>

           {/* Stickers Layer */}
           {stickers.map(s => (
             <div key={s.id} style={{
               position: 'absolute',
               left: `${s.x}%`,
               top: `${s.y}%`,
               transform: 'translate(-50%, -50%)',
               fontSize: '2rem',
               pointerEvents: 'none',
               filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))'
             }}>
               {s.emoji}
             </div>
           ))}
        </div>

        {/* Controls */}
        {!finished && (
          <div className="controls-area" style={{ 
            width: '100%', maxWidth: '500px', 
            background: 'white', borderRadius: '16px', 
            padding: '15px', marginTop: '20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            
            {/* Color Selectors */}
            <div style={{ marginBottom: '15px' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '5px' }}>Boot Color</div>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '5px' }}>
                {PALETTE.map(c => (
                  <button 
                    key={c} 
                    onClick={() => { setBootColor(c); playSound('click'); }}
                    style={{ 
                      width: 30, height: 30, borderRadius: '50%', background: c, 
                      border: bootColor === c ? '3px solid #333' : '1px solid #ccc',
                      flexShrink: 0, cursor: 'pointer'
                    }} 
                    aria-label={`Select color ${c}`}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
               <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '5px' }}>Sole</div>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {PALETTE.slice(0, 6).map(c => (
                      <button 
                        key={c} 
                        onClick={() => { setSoleColor(c); playSound('click'); }}
                        style={{ 
                          width: 24, height: 24, borderRadius: '50%', background: c, 
                          border: soleColor === c ? '2px solid #333' : '1px solid #ccc',
                          cursor: 'pointer'
                        }} 
                        aria-label={`Select sole color ${c}`}
                      />
                    ))}
                  </div>
               </div>
               <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '5px' }}>Details</div>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {PALETTE.slice(0, 6).map(c => (
                      <button 
                        key={c} 
                        onClick={() => { setDetailColor(c); playSound('click'); }}
                        style={{ 
                          width: 24, height: 24, borderRadius: '50%', background: c, 
                          border: detailColor === c ? '2px solid #333' : '1px solid #ccc',
                          cursor: 'pointer'
                        }} 
                        aria-label={`Select detail color ${c}`}
                      />
                    ))}
                  </div>
               </div>
            </div>

            {/* Patterns */}
            <div style={{ marginBottom: '15px' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '5px' }}>Pattern</div>
              <div style={{ display: 'flex', gap: '10px' }}>
                {['none', 'dots', 'stripes', 'stars'].map(p => (
                  <button 
                    key={p}
                    onClick={() => { setPattern(p); playSound('click'); }}
                    style={{
                      padding: '5px 10px', borderRadius: '12px',
                      background: pattern === p ? '#4cc9f0' : '#eee',
                      border: 'none', fontSize: '0.8rem', textTransform: 'capitalize',
                      cursor: 'pointer'
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Stickers */}
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '5px' }}>
                Stickers {selectedSticker ? '(Tap boot to place!)' : ''}
              </div>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '5px' }}>
                {STICKER_OPTIONS.map(s => (
                  <button 
                    key={s}
                    onClick={() => { setSelectedSticker(s); playSound('click'); }}
                    style={{
                      fontSize: '1.5rem', background: selectedSticker === s ? '#fffbe8' : 'transparent',
                      border: selectedSticker === s ? '2px solid #ffd700' : '1px solid transparent',
                      borderRadius: '8px', cursor: 'pointer', padding: '4px'
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div style={{ padding: '10px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
        {!finished ? (
          <button className="primary-button" onClick={handleFinish} style={{ fontSize: '1.2rem', padding: '12px 32px' }}>
            Done! ✨
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '10px' }}>
             <button className="secondary-button" onClick={reset}>Design Another</button>
             <button className="primary-button" onClick={onExit}>Back to Arcade</button>
          </div>
        )}
      </div>

      {finished && (
        <div style={{ 
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          background: 'white', padding: '20px', borderRadius: '20px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)', textAlign: 'center', zIndex: 100,
          width: '90%', maxWidth: '320px'
        }}>
          <h2 style={{ fontSize: '2rem', margin: '0 0 10px 0' }}>Beautiful!</h2>
          <p>What a stylish boot!</p>
          <div style={{ fontSize: '3rem' }}>👢✨</div>
          <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button className="primary-button" onClick={reset}>Make Another</button>
            <button className="secondary-button" onClick={onExit}>Exit</button>
          </div>
        </div>
      )}

    </div>
  );
};

export default BootsGame;
