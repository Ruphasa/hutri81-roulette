export interface ConfettiManager {
  fire(options?: { count?: number }): void;
  stop(): void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vRot: number;
  opacity: number;
}

const COLORS = [
  '#dc2626', // Crimson Red
  '#ffffff', // Pure White
  '#facc15', // Vibrant Gold
  '#10b981', // Emerald Green
  '#ef4444', // Red-500
];

export function createConfetti(canvas: HTMLCanvasElement): ConfettiManager {
  const ctx = canvas.getContext('2d');
  let particles: Particle[] = [];
  let animId: number | null = null;

  function resize(): void {
    const parent = canvas.parentElement;
    const width = parent?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 800) || 800;
    const height = parent?.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 600) || 600;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
  }

  function loop(): void {
    if (!ctx) {
      animId = null;
      particles = [];
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      if (!p) continue;

      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35; // gravity
      p.vx *= 0.98; // air resistance
      p.rotation += p.vRot;
      p.opacity -= 0.008;

      if (p.opacity <= 0 || p.y > canvas.height + 50) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.5);
      ctx.restore();
    }

    if (particles.length > 0) {
      animId = requestAnimationFrame(loop);
    } else {
      animId = null;
    }
  }

  return {
    fire(options?: { count?: number }): void {
      resize();
      const count = options?.count ?? 80;

      // Spawn two bursts: left (20% x) and right (80% x)
      for (let i = 0; i < count; i++) {
        const fromLeft = i % 2 === 0;
        particles.push({
          x: fromLeft ? canvas.width * 0.2 : canvas.width * 0.8,
          y: canvas.height * 0.85,
          vx: (fromLeft ? 1 : -1) * (Math.random() * 12 + 4) + (Math.random() - 0.5) * 6,
          vy: -(Math.random() * 16 + 10),
          size: Math.random() * 10 + 6,
          color: COLORS[Math.floor(Math.random() * COLORS.length)] || '#facc15',
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.3,
          opacity: 1.0,
        });
      }

      if (animId === null) {
        animId = requestAnimationFrame(loop);
      }
    },
    stop(): void {
      if (animId !== null) {
        cancelAnimationFrame(animId);
        animId = null;
      }
      particles = [];
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    },
  };
}
