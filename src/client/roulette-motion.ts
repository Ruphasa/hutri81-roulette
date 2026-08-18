export interface RouletteMotionOptions {
  readonly wheel: HTMLElement;
  readonly readout: HTMLElement;
  readonly activeLots: readonly string[];
  readonly winner: string;
  readonly reducedMotion: boolean;
  readonly durationMs?: number;
}

export async function animateRoulette(options: RouletteMotionOptions): Promise<void> {
  const { wheel, readout, activeLots, winner, reducedMotion, durationMs = 6500 } = options;
  const duration = reducedMotion ? 250 : durationMs;

  return new Promise((resolve) => {
    let interval: ReturnType<typeof setInterval> | undefined;

    if (!reducedMotion && activeLots.length > 0) {
      let index = 0;
      interval = setInterval(() => {
        index = (index + 1) % activeLots.length;
        readout.textContent = activeLots[index] ?? null;
      }, 50);
    }

    const animation = wheel.animate([
      { transform: 'rotate(0deg)' },
      { transform: `rotate(${360 * 5}deg)` }
    ], {
      duration,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)'
    });

    animation.onfinish = () => {
      if (interval) clearInterval(interval);
      readout.textContent = winner;
      resolve();
    };
  });
}
