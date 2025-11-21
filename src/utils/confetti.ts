export function createConfetti(container: HTMLElement | null, count = 24) {
  if (!container) return;
  const colors = ["#ff7ab6", "#ffd166", "#60a5fa", "#4ade80", "#f97316"];
  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    el.className = "confetti-piece";
    const color = colors[Math.floor(Math.random() * colors.length)];
    el.style.background = color;
    const left = Math.random() * 80 + 10;
    const top = Math.random() * 40 + 5;
    el.style.left = `${left}%`;
    el.style.top = `${top}%`;
    const dur = 800 + Math.floor(Math.random() * 1600);
    el.style.setProperty("--d", `${dur}ms`);
    container.appendChild(el);
    el.addEventListener("animationend", () => el.remove());
  }
}
