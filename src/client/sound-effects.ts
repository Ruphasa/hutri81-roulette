export interface SoundEngine {
  playTick(rate?: number): void;
  playLockImpact(): void;
  playFanfare(): void;
  playForfeit(): void;
  toggleMute(): boolean;
  isMuted(): boolean;
  setMuted(muted: boolean): void;
}

function getDefaultStorage(): Pick<Storage, 'getItem' | 'setItem'> {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
  } catch {
    // Storage access might fail in sandboxed or restricted environments
  }
  const mem: Record<string, string> = {};
  return {
    getItem: (key: string) => mem[key] ?? null,
    setItem: (key: string, value: string) => {
      mem[key] = value;
    }
  };
}

export function createSoundEngine(
  storage: Pick<Storage, 'getItem' | 'setItem'> = getDefaultStorage()
): SoundEngine {
  let muted = false;
  try {
    muted = storage.getItem('raffle_muted') === 'true';
  } catch {
    muted = false;
  }

  let ctx: AudioContext | null = null;

  function safeSetStorage(key: string, value: string) {
    try {
      storage.setItem(key, value);
    } catch {
      // Ignore storage write errors in restricted contexts
    }
  }

  function getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      if (!ctx) {
        ctx = new AudioCtx();
      }
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      return ctx;
    } catch {
      return null;
    }
  }

  function playTone(
    freq: number,
    type: OscillatorType,
    duration: number,
    startGain = 0.15,
    endGain = 0.001
  ) {
    if (muted) return;
    try {
      const audioCtx = getAudioContext();
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const now = audioCtx.currentTime;

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(startGain, now);
      gain.gain.exponentialRampToValueAtTime(Math.max(endGain, 0.0001), now + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // Audio play failure ignored in restricted environments
    }
  }

  return {
    isMuted(): boolean {
      return muted;
    },
    setMuted(value: boolean): void {
      muted = value;
      safeSetStorage('raffle_muted', String(muted));
    },
    toggleMute(): boolean {
      muted = !muted;
      safeSetStorage('raffle_muted', String(muted));
      return muted;
    },
    playTick(rate = 1.0): void {
      if (muted) return;
      const freq = 600 + Math.min(rate * 200, 600);
      playTone(freq, 'triangle', 0.04, 0.1, 0.001);
    },
    playLockImpact(): void {
      if (muted) return;
      try {
        const audioCtx = getAudioContext();
        if (!audioCtx) return;
        const now = audioCtx.currentTime;

        // Deep bass thud
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.5);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.5);

        // High metallic ping
        const ping = audioCtx.createOscillator();
        const pingGain = audioCtx.createGain();
        ping.type = 'triangle';
        ping.frequency.setValueAtTime(880, now);
        pingGain.gain.setValueAtTime(0.2, now);
        pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        ping.connect(pingGain);
        pingGain.connect(audioCtx.destination);
        ping.start(now);
        ping.stop(now + 0.3);
      } catch {
        // Safe catch
      }
    },
    playFanfare(): void {
      if (muted) return;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, index) => {
        setTimeout(() => {
          playTone(freq, 'square', 0.25, 0.12, 0.001);
        }, index * 90);
      });
    },
    playForfeit(): void {
      if (muted) return;
      // Dissonant buzz down
      playTone(220, 'sawtooth', 0.35, 0.25, 0.01);
      setTimeout(() => {
        playTone(180, 'sawtooth', 0.4, 0.25, 0.01);
      }, 80);
    }
  };
}
