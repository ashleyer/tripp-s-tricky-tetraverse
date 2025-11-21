export const _BASE = (import.meta as any).env?.BASE_URL ?? "/";
export const soundPaths: Record<string, string> = {
  click: `${_BASE}sounds/click.mp3`,
  success: `${_BASE}sounds/success.mp3`,
  fail: `${_BASE}sounds/fail.mp3`,
  hover: `${_BASE}sounds/hover.mp3`, // Placeholder
  pop: `${_BASE}sounds/pop.mp3`,     // Placeholder
};

// Simple Web Audio Context for synthesized sounds (Juice!)
const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

export function playSound(key: keyof typeof soundPaths) {
  const path = soundPaths[key];
  if (!path) return;
  const audio = new Audio(path);
  audio.volume = 0.4;
  audio.play().catch(() => {
    // Fallback to synth if file missing
    if (key === 'click' || key === 'pop') playPop();
    if (key === 'hover') playHover();
  });
}

export function playAlternateClick() {
  playSound('click');
}

export function playPop() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);
  
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
}

export function playHover() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(300, audioCtx.currentTime);
  osc.frequency.linearRampToValueAtTime(400, audioCtx.currentTime + 0.05);
  
  gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.05);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
}

export function playSuccessTone() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  
  [440, 554, 659, 880].forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    
    gain.gain.setValueAtTime(0.1, now + i * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now + i * 0.1);
    osc.stop(now + i * 0.1 + 0.3);
  });
}
