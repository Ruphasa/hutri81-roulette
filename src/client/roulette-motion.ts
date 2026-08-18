import anime from 'animejs';

export interface RouletteMotionOptions {
  readonly wheel?: HTMLElement | null;
  readonly readout?: HTMLElement | null;
  readonly activeLots: readonly string[];
  readonly winner: string;
  readonly reducedMotion: boolean;
  readonly durationMs?: number;
}

let currentRotation = 0;

export function getCurrentRotation(): number {
  return currentRotation;
}

export function resetCurrentRotation(): void {
  currentRotation = 0;
}

export async function animateRoulette(options: RouletteMotionOptions): Promise<void> {
  const { wheel, readout, activeLots, winner, reducedMotion, durationMs = 4000 } = options;
  const duration = reducedMotion ? 50 : durationMs;

  let interval: ReturnType<typeof setInterval> | undefined;

  try {
    if (reducedMotion) {
      if (wheel) {
        anime.remove(wheel);
        wheel.style.transform = 'rotate(0deg)';
      }
      await new Promise(resolve => setTimeout(resolve, duration));
    } else {
      if (activeLots.length > 0 && readout) {
        let index = 0;
        interval = setInterval(() => {
          index = (index + 1) % activeLots.length;
          readout.textContent = activeLots[index] ?? null;
        }, 50);
      }

      if (wheel) {
        anime.remove(wheel);
        const targetAngle = currentRotation + 1440 + (Math.random() * 360);
        await new Promise<void>(resolve => {
          anime({
            targets: wheel,
            rotate: targetAngle,
            duration: duration,
            easing: 'easeOutElastic(1, .8)', // Dramatic Persona 5 bounce
            complete: () => {
              currentRotation = targetAngle;
              resolve();
            }
          });
        });
      }

      if (readout) {
        anime({
          targets: readout,
          scale: [0, 1.2, 1],
          opacity: [0, 1],
          duration: 800,
          easing: 'easeOutElastic(1, .5)'
        });
      }
    }
  } finally {
    if (interval) clearInterval(interval);
    if (readout) readout.textContent = winner;
  }
}

