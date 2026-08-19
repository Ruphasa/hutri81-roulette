import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createSoundEngine } from './sound-effects';

describe('SoundEngine', () => {
  let mockStorage: Record<string, string>;
  let storage: Pick<Storage, 'getItem' | 'setItem'>;
  const originalAudioContext = window.AudioContext;

  beforeEach(() => {
    mockStorage = {};
    storage = {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value;
      }
    };
  });

  afterEach(() => {
    window.AudioContext = originalAudioContext;
  });

  describe('mute state management and persistence', () => {
    it('initializes as unmuted by default when storage is empty', () => {
      const engine = createSoundEngine(storage);
      expect(engine.isMuted()).toBe(false);
    });

    it('initializes as muted if storage has raffle_muted=true', () => {
      mockStorage['raffle_muted'] = 'true';
      const engine = createSoundEngine(storage);
      expect(engine.isMuted()).toBe(true);
    });

    it('toggles mute state and persists to storage', () => {
      const engine = createSoundEngine(storage);
      expect(engine.isMuted()).toBe(false);

      const muted = engine.toggleMute();
      expect(muted).toBe(true);
      expect(engine.isMuted()).toBe(true);
      expect(storage.getItem('raffle_muted')).toBe('true');

      const unmuted = engine.toggleMute();
      expect(unmuted).toBe(false);
      expect(engine.isMuted()).toBe(false);
      expect(storage.getItem('raffle_muted')).toBe('false');
    });

    it('sets mute state explicitly via setMuted', () => {
      const engine = createSoundEngine(storage);
      engine.setMuted(true);
      expect(engine.isMuted()).toBe(true);
      expect(storage.getItem('raffle_muted')).toBe('true');

      engine.setMuted(false);
      expect(engine.isMuted()).toBe(false);
      expect(storage.getItem('raffle_muted')).toBe('false');
    });

    it('uses fallback in-memory storage if storage argument is omitted', () => {
      const engine = createSoundEngine();
      expect(engine.isMuted()).toBe(false);
      expect(engine.toggleMute()).toBe(true);
      expect(engine.isMuted()).toBe(true);
    });
  });

  describe('sound playback execution and safety', () => {
    it('safely triggers sound methods without throwing even when AudioContext is absent or in jsdom', () => {
      const engine = createSoundEngine(storage);
      expect(() => {
        engine.playTick(1.0);
        engine.playLockImpact();
        engine.playFanfare();
        engine.playForfeit();
      }).not.toThrow();
    });

    it('does not attempt audio playback when muted', () => {
      const mockOscillator = {
        type: 'sine',
        frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn()
      };
      const mockGain = {
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn()
      };
      const createOscillatorMock = vi.fn().mockReturnValue(mockOscillator);
      const createGainMock = vi.fn().mockReturnValue(mockGain);
      const mockAudioCtx = {
        state: 'running',
        currentTime: 10,
        destination: {},
        createOscillator: createOscillatorMock,
        createGain: createGainMock,
        resume: vi.fn().mockResolvedValue(undefined)
      };

      window.AudioContext = class {
        constructor() {
          return mockAudioCtx as unknown as AudioContext;
        }
      } as unknown as typeof AudioContext;

      const engine = createSoundEngine(storage);
      engine.setMuted(true);

      engine.playTick(0.5);
      engine.playLockImpact();
      engine.playFanfare();
      engine.playForfeit();

      expect(createOscillatorMock).not.toHaveBeenCalled();
    });

    it('synthesizes tones via AudioContext when unmuted', () => {
      const mockOscillator = {
        type: 'sine',
        frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn()
      };
      const mockGain = {
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn()
      };
      const createOscillatorMock = vi.fn().mockReturnValue(mockOscillator);
      const createGainMock = vi.fn().mockReturnValue(mockGain);
      const resumeMock = vi.fn().mockResolvedValue(undefined);
      const mockAudioCtx = {
        state: 'suspended',
        currentTime: 0,
        destination: {},
        createOscillator: createOscillatorMock,
        createGain: createGainMock,
        resume: resumeMock
      };

      window.AudioContext = class {
        constructor() {
          return mockAudioCtx as unknown as AudioContext;
        }
      } as unknown as typeof AudioContext;

      const engine = createSoundEngine(storage);

      // Play tick
      engine.playTick(0.5);
      expect(resumeMock).toHaveBeenCalled();
      expect(createOscillatorMock).toHaveBeenCalled();
      expect(mockOscillator.start).toHaveBeenCalled();
      expect(mockOscillator.stop).toHaveBeenCalled();

      // Play lock impact
      createOscillatorMock.mockClear();
      engine.playLockImpact();
      expect(createOscillatorMock).toHaveBeenCalled();

      // Play forfeit
      createOscillatorMock.mockClear();
      engine.playForfeit();
      expect(createOscillatorMock).toHaveBeenCalled();
    });

    it('handles AudioContext resume or playback errors gracefully without throwing', () => {
      window.AudioContext = class {
        constructor() {
          throw new Error('Audio disabled by policy');
        }
      } as unknown as typeof AudioContext;

      const engine = createSoundEngine(storage);
      expect(() => {
        engine.playTick();
        engine.playLockImpact();
        engine.playFanfare();
        engine.playForfeit();
      }).not.toThrow();
    });
  });
});
