export const _BASE = (import.meta as any).env?.BASE_URL ?? "/";
export const soundPaths: Record<string, string> = {
  click: `${_BASE}sounds/click.mp3`,
  success: `${_BASE}sounds/success.mp3`,
  fail: `${_BASE}sounds/fail.mp3`,
};

export function playSound(key: keyof typeof soundPaths) {
  const path = soundPaths[key];
  if (!path) return;
  const audio = new Audio(path);
  audio.play().catch(() => {});
}
