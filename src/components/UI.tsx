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
