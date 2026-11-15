import { SoundType } from '../types/music';

interface ActiveVoice {
  oscillators: OscillatorNode[];
  gains: GainNode[];
  filters: BiquadFilterNode[];
  stop: (time?: number) => void;
}

interface WaveAHDSR {
  duration: number;
  volume: number;
}

interface WaveZone {
  midi?: number;
  originalPitch: number;
  keyRangeLow: number;
  keyRangeHigh: number;
  loopStart: number;
  loopEnd: number;
  coarseTune?: number;
  fineTune?: number;
  sampleRate: number;
  ahdsr?: boolean | WaveAHDSR[];
  sample?: string;
  file?: string;
  buffer?: AudioBuffer;
  delay?: number;
  sustain?: number;
}

interface WavePreset {
  zones: WaveZone[];
}

interface PresetConfig {
  file: string;
  varName: string;
  gainScale: number;
  attackSec: number;
  releaseSec: number;
}

const BASE_URL = import.meta.env.BASE_URL || './';

const SOUNDFONT_PRESETS: Record<SoundType, PresetConfig> = {
  strings: {
    file: `${BASE_URL}soundfonts/0400_FluidR3_GM_sf2_file.js`,
    varName: '_tone_0400_FluidR3_GM_sf2_file',
    gainScale: 0.9,
    attackSec: 0.035,
    releaseSec: 0.14,
  },
  piano: {
    file: `${BASE_URL}soundfonts/0000_GeneralUserGS_sf2_file.js`,
    varName: '_tone_0000_GeneralUserGS_sf2_file',
    gainScale: 0.95,
    attackSec: 0.006,
    releaseSec: 0.18,
  },
  choir: {
    file: `${BASE_URL}soundfonts/0520_GeneralUserGS_sf2_file.js`,
    varName: '_tone_0520_GeneralUserGS_sf2_file',
    gainScale: 0.85,
    attackSec: 0.04,
    releaseSec: 0.16,
  },
  organ: {
    file: `${BASE_URL}soundfonts/0190_GeneralUserGS_sf2_file.js`,
    varName: '_tone_0190_GeneralUserGS_sf2_file',
    gainScale: 0.8,
    attackSec: 0.015,
    releaseSec: 0.08,
  },
  flute: {
    file: `${BASE_URL}soundfonts/0730_GeneralUserGS_sf2_file.js`,
    varName: '_tone_0730_GeneralUserGS_sf2_file',
    gainScale: 0.9,
    attackSec: 0.025,
    releaseSec: 0.1,
  },
  brass: {
    file: `${BASE_URL}soundfonts/0560_GeneralUserGS_sf2_file.js`,
    varName: '_tone_0560_GeneralUserGS_sf2_file',
    gainScale: 0.85,
    attackSec: 0.018,
    releaseSec: 0.1,
  },
  acoustic_bass: {
    file: `${BASE_URL}soundfonts/0320_FluidR3_GM_sf2_file.js`,
    varName: '_tone_0320_FluidR3_GM_sf2_file',
    gainScale: 1.0,
    attackSec: 0.01,
    releaseSec: 0.12,
  },
};

export class Synthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private trackGains: Map<string, GainNode> = new Map();
  private activeVoices: Set<ActiveVoice> = new Set();
  private isInitialized = false;
  private loadingPromises: Map<SoundType, Promise<WavePreset | null>> = new Map();
  private decodedPresets: Map<SoundType, WavePreset> = new Map();

  constructor() {}

  public async init(initialSounds: SoundType[] = ['strings', 'piano']): Promise<void> {
    if (!this.isInitialized || !this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.65;

      // Professional DynamicsCompressor to completely eliminate clipping and distortion
      // when multiple voices or harmonic chords play simultaneously
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-6, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(8, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.15, this.ctx.currentTime);

      // Audio routing: trackGains -> masterGain -> compressor -> ctx.destination
      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);

      this.isInitialized = true;
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    // Ensure initial required soundfonts are loaded and decoded before playback starts
    await Promise.all(initialSounds.map(s => this.ensureSoundLoaded(s)));

    // Preload remaining soundfonts in the background
    const allSounds: SoundType[] = ['strings', 'piano', 'choir', 'organ', 'flute', 'brass', 'acoustic_bass'];
    for (const s of allSounds) {
      if (!initialSounds.includes(s)) {
        void this.ensureSoundLoaded(s);
      }
    }
  }

  public async ensureSoundLoaded(soundType: SoundType): Promise<WavePreset | null> {
    if (this.decodedPresets.has(soundType)) {
      return this.decodedPresets.get(soundType)!;
    }
    const existing = this.loadingPromises.get(soundType);
    if (existing) return existing;

    const promise = this.loadAndDecodePreset(soundType);
    this.loadingPromises.set(soundType, promise);
    return promise;
  }

  private async loadAndDecodePreset(soundType: SoundType): Promise<WavePreset | null> {
    const cfg = SOUNDFONT_PRESETS[soundType];
    if (!cfg || !this.ctx) return null;

    try {
      let preset: WavePreset | undefined = (window as any)[cfg.varName];
      if (!preset) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = cfg.file;
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error(`Failed to load soundfont ${cfg.file}`));
          document.head.appendChild(script);
        });
        preset = (window as any)[cfg.varName];
      }

      if (!preset || !Array.isArray(preset.zones)) {
        return null;
      }

      const ctx = this.ctx;
      await Promise.all(
        preset.zones.map(async (zone) => {
          if (zone.buffer) return;
          zone.delay = 0;
          zone.loopStart = typeof zone.loopStart === 'number' ? zone.loopStart : 0;
          zone.loopEnd = typeof zone.loopEnd === 'number' ? zone.loopEnd : 0;
          zone.coarseTune = typeof zone.coarseTune === 'number' ? zone.coarseTune : 0;
          zone.fineTune = typeof zone.fineTune === 'number' ? zone.fineTune : 0;
          zone.originalPitch = typeof zone.originalPitch === 'number' ? zone.originalPitch : 6000;
          zone.sampleRate = typeof zone.sampleRate === 'number' ? zone.sampleRate : 44100;

          if (zone.sample) {
            const decoded = atob(zone.sample);
            const len = Math.floor(decoded.length / 2);
            const buf = ctx.createBuffer(1, len, zone.sampleRate);
            const ch = buf.getChannelData(0);
            for (let i = 0; i < len; i++) {
              const b1 = decoded.charCodeAt(i * 2) & 0xff;
              const b2 = decoded.charCodeAt(i * 2 + 1) & 0xff;
              let n = b2 * 256 + b1;
              if (n >= 32768) n -= 65536;
              ch[i] = n / 32768.0;
            }
            zone.buffer = buf;
          } else if (zone.file) {
            const decoded = atob(zone.file);
            const ab = new ArrayBuffer(decoded.length);
            const view = new Uint8Array(ab);
            for (let i = 0; i < decoded.length; i++) {
              view[i] = decoded.charCodeAt(i);
            }
            zone.buffer = await ctx.decodeAudioData(ab);
          }
        })
      );

      this.decodedPresets.set(soundType, preset);
      return preset;
    } catch (err) {
      console.warn(`Soundfont fallback to synth for ${soundType}:`, err);
      return null;
    }
  }

  public get audioContext(): AudioContext | null {
    return this.ctx;
  }

  public get currentTime(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  public setMasterVolume(val: number): void {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, val)), this.ctx.currentTime);
    }
  }

  public getTrackGainNode(trackId: string): GainNode {
    if (!this.ctx || !this.masterGain) {
      throw new Error("Synthesizer not initialized");
    }
    let gainNode = this.trackGains.get(trackId);
    if (!gainNode) {
      gainNode = this.ctx.createGain();
      gainNode.gain.value = 1.0;
      gainNode.connect(this.masterGain);
      this.trackGains.set(trackId, gainNode);
    }
    return gainNode;
  }

  public setTrackVolume(trackId: string, volume: number, muted: boolean): void {
    if (!this.ctx) return;
    const gainNode = this.getTrackGainNode(trackId);
    const targetGain = muted ? 0 : Math.max(0, Math.min(1, volume));
    gainNode.gain.cancelScheduledValues(this.ctx.currentTime);
    gainNode.gain.setValueAtTime(targetGain, this.ctx.currentTime);
  }

  public midiToFreq(midiNote: number): number {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  }

  private findZone(preset: WavePreset, pitch: number): WaveZone | null {
    for (let i = preset.zones.length - 1; i >= 0; i--) {
      const zone = preset.zones[i];
      if (zone.keyRangeLow <= pitch && zone.keyRangeHigh + 1 >= pitch && zone.buffer) {
        return zone;
      }
    }
    return preset.zones.find(z => !!z.buffer) || null;
  }

  private playSampleNote(
    preset: WavePreset,
    soundType: SoundType,
    midiNote: number,
    startTime: number,
    duration: number,
    volume: number,
    dest: AudioNode
  ): boolean {
    if (!this.ctx) return false;
    const zone = this.findZone(preset, midiNote);
    if (!zone || !zone.buffer) return false;

    const cfg = SOUNDFONT_PRESETS[soundType];
    const baseDetune = zone.originalPitch - 100.0 * (zone.coarseTune || 0) - (zone.fineTune || 0);
    const playbackRate = Math.pow(2, (100.0 * midiNote - baseDetune) / 1200.0);

    const start = Math.max(this.ctx.currentTime, startTime);
    const attack = Math.min(cfg.attackSec, duration * 0.35);
    const release = cfg.releaseSec;
    const stopTime = start + duration;

    const src = this.ctx.createBufferSource();
    src.buffer = zone.buffer;
    src.playbackRate.setValueAtTime(playbackRate, start);

    const delay = zone.delay || 0;
    if (zone.loopStart > 0 && zone.loopEnd > zone.loopStart) {
      src.loop = true;
      src.loopStart = zone.loopStart / zone.sampleRate + delay;
      src.loopEnd = zone.loopEnd / zone.sampleRate + delay;
    } else {
      src.loop = false;
    }

    const env = this.ctx.createGain();
    const peak = Math.max(0.0001, volume * 0.42 * cfg.gainScale);

    env.gain.setValueAtTime(0.0001, start);
    env.gain.linearRampToValueAtTime(peak, start + Math.max(0.004, attack));

    if (soundType === 'piano' || soundType === 'acoustic_bass') {
      const sustain = Math.max(0.0001, peak * 0.35);
      env.gain.exponentialRampToValueAtTime(sustain, start + Math.min(duration, 1.2));
    } else {
      env.gain.setValueAtTime(peak, stopTime);
    }

    env.gain.exponentialRampToValueAtTime(0.0001, stopTime + release);

    src.connect(env);
    env.connect(dest);

    src.start(start, delay);
    src.stop(stopTime + release + 0.02);

    const voice: ActiveVoice = {
      oscillators: [],
      gains: [env],
      filters: [],
      stop: (cancelTime = this.ctx!.currentTime) => {
        try {
          env.gain.cancelScheduledValues(cancelTime);
          env.gain.setValueAtTime(Math.max(0.0001, env.gain.value), cancelTime);
          env.gain.exponentialRampToValueAtTime(0.0001, cancelTime + 0.04);
        } catch (_) {}
        try {
          src.stop(cancelTime + 0.05);
        } catch (_) {}
      },
    };

    this.activeVoices.add(voice);
    const cleanupTime = (stopTime + release + 0.1 - this.ctx.currentTime) * 1000;
    setTimeout(() => {
      this.activeVoices.delete(voice);
    }, Math.max(20, cleanupTime));

    return true;
  }

  public playNote(
    midiNote: number,
    duration: number,
    volume: number,
    soundType: SoundType,
    trackId: string,
    scheduledTime?: number
  ): void {
    if (!this.ctx || !this.masterGain) return;
    if (midiNote < 12 || midiNote > 127) return;

    const startTime = scheduledTime !== undefined ? scheduledTime : this.ctx.currentTime;
    // Don't play notes scheduled too far in past
    if (startTime < this.ctx.currentTime - 0.2) return;

    const trackGain = this.getTrackGainNode(trackId);
    const effectiveVol = Math.max(0, Math.min(1, volume));

    // Prefer real WebAudioFont instrument samples if loaded; trigger background load if not yet ready
    const preset = this.decodedPresets.get(soundType);
    if (preset) {
      if (this.playSampleNote(preset, soundType, midiNote, startTime, duration, effectiveVol, trackGain)) {
        return;
      }
    } else {
      void this.ensureSoundLoaded(soundType);
    }

    const freq = this.midiToFreq(midiNote);
    const oscs: OscillatorNode[] = [];
    const gains: GainNode[] = [];
    const filters: BiquadFilterNode[] = [];

    // Fallback synthesized timbre if sample preset is still decoding
    switch (soundType) {
      case 'strings':
        this.createStringsVoice(freq, startTime, duration, effectiveVol, trackGain, oscs, gains, filters);
        break;
      case 'organ':
        this.createOrganVoice(freq, startTime, duration, effectiveVol, trackGain, oscs, gains, filters);
        break;
      case 'flute':
        this.createFluteVoice(freq, startTime, duration, effectiveVol, trackGain, oscs, gains, filters);
        break;
      case 'brass':
        this.createBrassVoice(freq, startTime, duration, effectiveVol, trackGain, oscs, gains, filters);
        break;
      case 'choir':
        this.createChoirVoice(freq, startTime, duration, effectiveVol, trackGain, oscs, gains, filters);
        break;
      case 'acoustic_bass':
        this.createBassVoice(freq, startTime, duration, effectiveVol, trackGain, oscs, gains, filters);
        break;
      case 'piano':
      default:
        this.createPianoVoice(freq, startTime, duration, effectiveVol, trackGain, oscs, gains, filters);
        break;
    }

    const voice: ActiveVoice = {
      oscillators: oscs,
      gains,
      filters,
      stop: (stopTime = this.ctx!.currentTime) => {
        gains.forEach(g => {
          try {
            g.gain.cancelScheduledValues(stopTime);
            g.gain.setValueAtTime(g.gain.value, stopTime);
            g.gain.exponentialRampToValueAtTime(0.0001, stopTime + 0.05);
          } catch (_) {}
        });
        oscs.forEach(o => {
          try {
            o.stop(stopTime + 0.06);
          } catch (_) {}
        });
      }
    };

    this.activeVoices.add(voice);

    const cleanupTime = (startTime + duration + 0.2 - this.ctx.currentTime) * 1000;
    setTimeout(() => {
      this.activeVoices.delete(voice);
    }, Math.max(10, cleanupTime));
  }

  // Piano sound: percussive envelope, rich harmonics
  private createPianoVoice(
    freq: number,
    start: number,
    dur: number,
    vol: number,
    dest: AudioNode,
    oscs: OscillatorNode[],
    gains: GainNode[],
    filters: BiquadFilterNode[]
  ) {
    if (!this.ctx) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const env = this.ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, start);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, start); // 2nd harmonic

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(freq * 6, 8000), start);
    filter.frequency.exponentialRampToValueAtTime(Math.min(freq * 2, 2000), start + dur);

    const peak = vol * 0.25;
    env.gain.setValueAtTime(0.00001, start);
    env.gain.linearRampToValueAtTime(peak, start + 0.012);
    const sustain = peak * 0.45;
    env.gain.exponentialRampToValueAtTime(Math.max(0.00001, sustain), start + 0.16);
    const stopTime = start + dur;
    env.gain.setValueAtTime(Math.max(0.00001, sustain * 0.8), stopTime);
    env.gain.exponentialRampToValueAtTime(0.00001, stopTime + 0.12);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(env);
    env.connect(dest);

    osc1.start(start);
    osc2.start(start);
    osc1.stop(stopTime + 0.15);
    osc2.stop(stopTime + 0.15);

    oscs.push(osc1, osc2);
    gains.push(env);
    filters.push(filter);
  }

  // Strings sound: warm sawtooth + triangle, smooth attack
  private createStringsVoice(
    freq: number,
    start: number,
    dur: number,
    vol: number,
    dest: AudioNode,
    oscs: OscillatorNode[],
    gains: GainNode[],
    filters: BiquadFilterNode[]
  ) {
    if (!this.ctx) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, start);
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 1.002, start); // Subtle chorus

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(freq * 3.5, 5000), start);

    const peak = vol * 0.22;
    env.gain.setValueAtTime(0.00001, start);
    env.gain.linearRampToValueAtTime(peak, start + 0.045); // Smooth bowed attack
    const stopTime = start + dur;
    env.gain.setValueAtTime(peak, stopTime);
    env.gain.exponentialRampToValueAtTime(0.00001, stopTime + 0.15); // String release

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(env);
    env.connect(dest);

    osc1.start(start);
    osc2.start(start);
    osc1.stop(stopTime + 0.2);
    osc2.stop(stopTime + 0.2);

    oscs.push(osc1, osc2);
    gains.push(env);
    filters.push(filter);
  }

  // Organ sound: pure harmonics, fast attack, steady sustain
  private createOrganVoice(
    freq: number,
    start: number,
    dur: number,
    vol: number,
    dest: AudioNode,
    oscs: OscillatorNode[],
    gains: GainNode[],
    filters: BiquadFilterNode[]
  ) {
    if (!this.ctx) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const osc3 = this.ctx.createOscillator();
    const env = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, start); // 8'
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, start); // 4'
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(freq * 3, start); // 2 2/3'

    const peak = vol * 0.20;
    env.gain.setValueAtTime(0.00001, start);
    env.gain.linearRampToValueAtTime(peak, start + 0.018);
    const stopTime = start + dur;
    env.gain.setValueAtTime(peak, stopTime);
    env.gain.exponentialRampToValueAtTime(0.00001, stopTime + 0.06);

    osc1.connect(env);
    osc2.connect(env);
    osc3.connect(env);
    env.connect(dest);

    osc1.start(start);
    osc2.start(start);
    osc3.start(start);
    osc1.stop(stopTime + 0.08);
    osc2.stop(stopTime + 0.08);
    osc3.stop(stopTime + 0.08);

    oscs.push(osc1, osc2, osc3);
    gains.push(env);
  }

  // Flute sound: pure tone + breath overtone
  private createFluteVoice(
    freq: number,
    start: number,
    dur: number,
    vol: number,
    dest: AudioNode,
    oscs: OscillatorNode[],
    gains: GainNode[],
    _filters: BiquadFilterNode[]
  ) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);

    const peak = vol * 0.22;
    env.gain.setValueAtTime(0.00001, start);
    env.gain.linearRampToValueAtTime(peak, start + 0.035);
    const stopTime = start + dur;
    env.gain.setValueAtTime(peak, stopTime);
    env.gain.exponentialRampToValueAtTime(0.00001, stopTime + 0.08);

    osc.connect(env);
    env.connect(dest);

    osc.start(start);
    osc.stop(stopTime + 0.1);

    oscs.push(osc);
    gains.push(env);
  }

  // Brass sound: punchy attack, bright filter
  private createBrassVoice(
    freq: number,
    start: number,
    dur: number,
    vol: number,
    dest: AudioNode,
    oscs: OscillatorNode[],
    gains: GainNode[],
    filters: BiquadFilterNode[]
  ) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, start);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 1.5, start);
    filter.frequency.linearRampToValueAtTime(Math.min(freq * 4.5, 6000), start + 0.04);
    filter.frequency.exponentialRampToValueAtTime(Math.min(freq * 2.5, 3000), start + dur);

    const peak = vol * 0.22;
    env.gain.setValueAtTime(0.00001, start);
    env.gain.linearRampToValueAtTime(peak, start + 0.022);
    const stopTime = start + dur;
    env.gain.setValueAtTime(peak * 0.8, stopTime);
    env.gain.exponentialRampToValueAtTime(0.00001, stopTime + 0.08);

    osc.connect(filter);
    filter.connect(env);
    env.connect(dest);

    osc.start(start);
    osc.stop(stopTime + 0.1);

    oscs.push(osc);
    gains.push(env);
    filters.push(filter);
  }

  // Choir / Voice Synth: vowel formant characteristics
  private createChoirVoice(
    freq: number,
    start: number,
    dur: number,
    vol: number,
    dest: AudioNode,
    oscs: OscillatorNode[],
    gains: GainNode[],
    filters: BiquadFilterNode[]
  ) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    const formant = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, start);

    // "Ah" formant resonance
    formant.type = 'bandpass';
    formant.frequency.setValueAtTime(800, start);
    formant.Q.setValueAtTime(4.0, start);

    const peak = vol * 0.22;
    env.gain.setValueAtTime(0.00001, start);
    env.gain.linearRampToValueAtTime(peak, start + 0.05);
    const stopTime = start + dur;
    env.gain.setValueAtTime(peak, stopTime);
    env.gain.exponentialRampToValueAtTime(0.00001, stopTime + 0.15);

    osc.connect(formant);
    formant.connect(env);
    env.connect(dest);

    osc.start(start);
    osc.stop(stopTime + 0.2);

    oscs.push(osc);
    gains.push(env);
    filters.push(formant);
  }

  // Bass voice: deep, solid foundation
  private createBassVoice(
    freq: number,
    start: number,
    dur: number,
    vol: number,
    dest: AudioNode,
    oscs: OscillatorNode[],
    gains: GainNode[],
    _filters: BiquadFilterNode[]
  ) {
    if (!this.ctx) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const env = this.ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, start);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq / 2, start); // Sub octave

    const peak = vol * 0.28;
    env.gain.setValueAtTime(0.00001, start);
    env.gain.linearRampToValueAtTime(peak, start + 0.015);
    const stopTime = start + dur;
    env.gain.setValueAtTime(peak * 0.7, stopTime);
    env.gain.exponentialRampToValueAtTime(0.00001, stopTime + 0.1);
    env.gain.exponentialRampToValueAtTime(0.0001, stopTime + 0.1);

    osc1.connect(env);
    osc2.connect(env);
    env.connect(dest);

    osc1.start(start);
    osc2.start(start);
    osc1.stop(stopTime + 0.12);
    osc2.stop(stopTime + 0.12);

    oscs.push(osc1, osc2);
    gains.push(env);
  }

  // Metronome tick: crisp, woodblock-style accent on beat 1 and clear standard beat
  public playClick(isFirstBeat: boolean, scheduledTime?: number): void {
    if (!this.ctx || !this.masterGain) return;
    const start = scheduledTime !== undefined ? scheduledTime : this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // Clear 1600 Hz for accented 1st beat, 1050 Hz for regular beats
    osc.frequency.setValueAtTime(isFirstBeat ? 1600 : 1050, start);

    const peak = isFirstBeat ? 0.35 : 0.22;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(peak, start + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.035);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(start);
    osc.stop(start + 0.04);
  }

  public stopAllNotes(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for (const voice of this.activeVoices) {
      voice.stop(now);
    }
    this.activeVoices.clear();
  }

  public close(): void {
    this.stopAllNotes();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.isInitialized = false;
    this.decodedPresets.clear();
    this.loadingPromises.clear();
  }
}

export const globalSynth = new Synthesizer();
