import { SoundType } from '../types/music';

interface ActiveVoice {
  oscillators: OscillatorNode[];
  gains: GainNode[];
  filters: BiquadFilterNode[];
  stop: (time?: number) => void;
}

export class Synthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private trackGains: Map<string, GainNode> = new Map();
  private activeVoices: Set<ActiveVoice> = new Set();
  private isInitialized = false;

  constructor() {}

  public async init(): Promise<void> {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      return;
    }

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
    const freq = this.midiToFreq(midiNote);
    const effectiveVol = Math.max(0, Math.min(1, volume));

    const oscs: OscillatorNode[] = [];
    const gains: GainNode[] = [];
    const filters: BiquadFilterNode[] = [];

    // Synthesize timbre according to soundType
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

    // Balanced ADSR Envelope with smooth 12ms attack to prevent clicking/scratching
    const peak = vol * 0.25;
    env.gain.setValueAtTime(0.00001, start);
    env.gain.linearRampToValueAtTime(peak, start + 0.012);
    const sustain = peak * 0.45;
    env.gain.exponentialRampToValueAtTime(Math.max(0.00001, sustain), start + 0.16);
    // Sustain to release
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
    filters: BiquadFilterNode[]
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
    filters: BiquadFilterNode[]
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
  }
}

export const globalSynth = new Synthesizer();
