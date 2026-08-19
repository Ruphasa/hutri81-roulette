import anime from 'animejs';

export interface RouletteMotionOptions {
  readonly wheel?: HTMLElement | null;
  readonly readout?: HTMLElement | null;
  readonly activeLots: readonly string[];
  readonly fullPool?: readonly string[];
  readonly winner: string;
  readonly reducedMotion: boolean;
  readonly durationMs?: number;
  readonly onTick?: ((rate: number) => void) | undefined;
}

export const DEFAULT_ROULETTE_DURATION_MS = 7000;
export const REDUCED_MOTION_DURATION_MS = 50;

let currentRotation = 0;

export function getCurrentRotation(): number {
  return currentRotation;
}

export function resetCurrentRotation(): void {
  currentRotation = 0;
}

export async function animateRoulette(options: RouletteMotionOptions): Promise<void> {
  const {
    wheel,
    readout,
    activeLots,
    fullPool,
    winner,
    reducedMotion,
    durationMs = DEFAULT_ROULETTE_DURATION_MS,
    onTick
  } = options;
  const duration = reducedMotion ? REDUCED_MOTION_DURATION_MS : durationMs;
  const pool = fullPool && fullPool.length > 0 ? fullPool : activeLots;

  try {
    if (reducedMotion) {
      if (wheel) {
        anime.remove(wheel);
        wheel.style.transform = 'rotate(0deg)';
      }
      if (readout) {
        anime.remove(readout);
      }
      await new Promise(resolve => setTimeout(resolve, duration));
    } else {
      if (wheel) {
        anime.remove(wheel);
        if (readout) {
          anime.remove(readout);
        }
        // 1. "init" - start exactly from the currently displayed text
        const startLot = readout?.textContent?.trim() || '';
        let startIndex = pool.indexOf(startLot);
        if (startIndex === -1) {
          // If no previous winner, pick a random start
          startIndex = Math.floor(Math.random() * pool.length);
        }
        
        const winnerIndex = pool.indexOf(winner);
        const effectiveWinnerIndex = winnerIndex >= 0 ? winnerIndex : 0;
        
        // Calculate the exact distance in the array from start to winner
        let distance = (effectiveWinnerIndex - startIndex + pool.length) % pool.length;
        
        // 2. "interval" - We want the wheel to spin at least 50 ticks (2250 degrees)
        // so we add full revolutions of the array until it's a long enough spin.
        let totalTicks = distance;
        const MIN_TICKS = 50;
        if (pool.length > 0) {
          while (totalTicks < MIN_TICKS) {
            totalTicks += pool.length;
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
        const maxTick = Math.ceil(totalTicks * 1.5) + 50;
        for (let i = 0; i <= maxTick; i++) {
          if (pool.length > 0) {
            const currentIndex = (startIndex + i) % pool.length;
            sequence.push(pool[currentIndex] ?? winner);
          } else {
            sequence.push(winner);
          }
        }
        
        // Text proxy and wheel both use monotonic easeOutCubic to decelerate
        // simultaneously and click-stop at the exact same millisecond on the winner.
        if ((activeLots.length > 0 || pool.length > 0) && (readout || onTick)) {
          anime({
            targets: proxy,
            angle: deltaAngle,
            duration: duration,
            easing: 'easeOutCubic',
            update: () => {
              let tick = Math.max(0, Math.floor(proxy.angle / 45));
              if (tick !== lastIndex) {
                if (readout) {
                  readout.textContent = sequence[tick] ?? winner;
                }
                lastIndex = tick;
                const rate = deltaAngle > 0 ? Math.min(1.0, (deltaAngle - proxy.angle) / deltaAngle) : 1.0;
                onTick?.(rate);
              }
            }
          });
        }

        await new Promise<void>(resolve => {
          anime({
            targets: wheel,
            rotate: targetAngle,
            duration: duration,
            easing: 'easeOutCubic',
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
          scale: [1, 1.25, 1],
          duration: 450,
          easing: 'easeOutBack'
        });
      }
    }
  } finally {
    if (readout) readout.textContent = winner;
  }
}
