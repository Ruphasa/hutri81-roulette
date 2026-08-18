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

  try {
    if (reducedMotion) {
      if (wheel) {
        anime.remove(wheel);
        wheel.style.transform = 'rotate(0deg)';
      }
      await new Promise(resolve => setTimeout(resolve, duration));
    } else {
      if (wheel) {
        anime.remove(wheel);
        const targetAngle = currentRotation + 1440 + (Math.random() * 360);
        
        let proxy = { angle: 0 };
        let lastIndex = -1;
        
        const deltaAngle = targetAngle - currentRotation;
        const totalTicks = Math.floor(deltaAngle / 45);
        const sequence: string[] = [];
        
        const winnerIndex = activeLots.indexOf(winner);
        const effectiveWinnerIndex = winnerIndex >= 0 ? winnerIndex : 0;
        
        // To make it look like a physical wheel, we want the numbers to appear in order.
        // We need the index at `totalTicks` to be exactly `effectiveWinnerIndex`.
        // So `startIndex = effectiveWinnerIndex - totalTicks`.
        // We use modular arithmetic to wrap around `activeLots`.
        const startIndex = ((effectiveWinnerIndex - (totalTicks % activeLots.length)) % activeLots.length + activeLots.length) % activeLots.length;
        
        // Build pre-rolled sequence
        for (let i = 0; i <= totalTicks + 20; i++) {
          if (i >= totalTicks) {
            sequence.push(winner);
          } else {
            if (activeLots.length > 0) {
              const currentIndex = (startIndex + i) % activeLots.length;
              sequence.push(activeLots[currentIndex] ?? winner);
            } else {
              sequence.push(winner);
            }
          }
        }
        
        // We run a parallel proxy animation with the exact same easing and duration
        // to sync the text randomization speed with the wheel's physical momentum.
        if (activeLots.length > 0 && readout) {
          anime({
            targets: proxy,
            angle: deltaAngle,
            duration: duration,
            easing: 'easeOutElastic(1, .8)',
            update: () => {
              // The text updates every 45 "degrees" of momentum.
              // As the wheel slows down and bounces, the text will naturally follow.
              let tick = Math.max(0, Math.floor(proxy.angle / 45));
              if (tick !== lastIndex) {
                readout.textContent = sequence[tick] ?? winner;
                lastIndex = tick;
              }
            }
          });
        }

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
    if (readout) readout.textContent = winner;
  }
}
