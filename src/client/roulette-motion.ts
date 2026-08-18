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
        // 1. "init" - start exactly from the currently displayed text
        const startLot = readout?.textContent?.trim() || '';
        let startIndex = activeLots.indexOf(startLot);
        if (startIndex === -1) {
          // If no previous winner, pick a random start
          startIndex = Math.floor(Math.random() * activeLots.length);
        }
        
        const winnerIndex = activeLots.indexOf(winner);
        const effectiveWinnerIndex = winnerIndex >= 0 ? winnerIndex : 0;
        
        // Calculate the exact distance in the array from start to winner
        let distance = (effectiveWinnerIndex - startIndex + activeLots.length) % activeLots.length;
        
        // 2. "interval" - We want the wheel to spin at least 50 ticks (2250 degrees)
        // so we add full revolutions of the array until it's a long enough spin.
        let totalTicks = distance;
        const MIN_TICKS = 50;
        if (activeLots.length > 0) {
          while (totalTicks < MIN_TICKS) {
            totalTicks += activeLots.length;
          }
        }
        
        // Now calculate the exact angle the physical wheel needs to spin
        // so that it exactly matches the array traversal.
        const deltaAngle = totalTicks * 45;
        const targetAngle = currentRotation + deltaAngle;
        
        let proxy = { angle: 0 };
        let lastIndex = -1;
        
        const sequence: string[] = [];
        
        // Build the perfectly sequential pre-rolled sequence
        // We need to generate enough elements to cover the elastic overshoot.
        // easeOutElastic can overshoot by ~15-20%, so we generate up to totalTicks * 1.5
        const maxTick = Math.ceil(totalTicks * 1.5) + 50;
        for (let i = 0; i <= maxTick; i++) {
          if (activeLots.length > 0) {
            const currentIndex = (startIndex + i) % activeLots.length;
            sequence.push(activeLots[currentIndex] ?? winner);
          } else {
            sequence.push(winner);
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
