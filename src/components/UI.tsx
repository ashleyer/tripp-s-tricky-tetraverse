import React from 'react';

export const PrimaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = (props) => (
  <button {...props} className={`primary-button ${props.className ?? ''}`.trim()} />
);

export const SecondaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = (props) => (
  <button {...props} className={`secondary-button ${props.className ?? ''}`.trim()} />
);

export const ModalBackdrop: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div className="modal-backdrop" role="dialog" aria-modal="true">
    <div className="modal-content">{children}</div>
  </div>
);

export const FooterBrand: React.FC = () => (
  <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 10, textAlign: 'center' }} className="brand-footer">
    Built with ❤️ in Boston by <a href="https://github.com/ashleyer" target="_blank" rel="noreferrer" style={{ color: 'var(--brand-darkgreen)' }}>@ashleyer</a>
  </div>
);

export const GameOverModal: React.FC<{
  score: number;
  onPlayAgain: () => void;
  onBack: () => void;
}> = ({ score, onPlayAgain, onBack }) => (
  <div className="modal-backdrop" role="dialog" aria-modal="true" style={{ zIndex: 2000 }}>
    <div className="modal-content" style={{ textAlign: 'center' }}>
      <div className="confetti-burst" aria-hidden="true"></div>
      <h2 className="design-title" style={{ fontSize: '2rem', color: 'var(--color-accent)' }}>Game Over!</h2>
      <p style={{ fontSize: '1.2rem', margin: '1rem 0' }}>
        You earned <strong>{score}</strong> points!
      </p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
        <button className="primary-button interactive-hover" onClick={onPlayAgain}>
          Play Again 🔄
        </button>
        <button className="secondary-button interactive-hover" onClick={onBack}>
          Back to Tetraverse 🏠
        </button>
      </div>
      <FooterBrand />
    </div>
  </div>
);
