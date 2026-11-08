import { OpenSheetMusicDisplay, Note as OSMDNote } from 'opensheetmusicdisplay';
import { globalSynth } from './Synthesizer';
import { ScoreStep, TrackVoice, SoundType, NoteEvent, ScoreMetadata } from '../types/music';

export type PlaybackState = 'stopped' | 'playing' | 'paused' | 'counting_in';
export type LoopPickingMode = 'start' | 'end' | null;

export interface CountInBeat {
  measure: number;
  totalMeasures: number;
  beat: number;
  beatsPerMeasure: number;
}

export interface MetronomeBeat {
  measureIndex: number;
  measureNumber: number;
  beatNumber: number;
  beatsPerMeasure: number;
  isFirstBeat: boolean;
  quarterTimestamp: number;
}

export interface PlaybackListener {
  onStateChange?: (state: PlaybackState) => void;
  onStepChange?: (step: ScoreStep, currentMeasure: number, progressRatio: number) => void;
  onTracksChange?: (tracks: TrackVoice[]) => void;
  onBpmChange?: (bpm: number) => void;
  onLoopChange?: (enabled: boolean, startMeasure: number, endMeasure: number, pickingMode: LoopPickingMode) => void;
  onCountInBeat?: (info: CountInBeat | null) => void;
  onCountInSettingChange?: (countInMeasures: number) => void;
}

export class PlaybackController {
  private osmd: OpenSheetMusicDisplay | null = null;
  private container: HTMLElement | null = null;
  private state: PlaybackState = 'stopped';
  private bpm: number = 100;
  private speedMultiplier: number = 1.0;
  private tracks: TrackVoice[] = [];
  private steps: ScoreStep[] = [];
  private beats: MetronomeBeat[] = [];
  private currentStepIndex: number = 0;
  private metadata: ScoreMetadata | null = null;

  // Audio scheduling
  private schedulerTimer: number | null = null;
  private stepTimeoutHandles: number[] = [];
  private nextStepToSchedule: number = 0;
  private nextBeatToSchedule: number = 0;
  private playbackInitialStep: number = 0;
  private playbackAudioStartTime: number = 0; // audioContext.currentTime when started
  private playbackStepStartOffset: number = 0; // score seconds offset at start
  private isMetronomeEnabled: boolean = false;
  private metronomeVolume: number = 0.5;

  // Count-in / Vorklick (0, 1, 2, or 3 measures)
  private countInMeasures: number = 0;
  private countInTimeouts: number[] = [];

  // A-B Loop for practice
  private loopEnabled: boolean = false;
  private loopStartMeasure: number = 1;
  private loopEndMeasure: number = 999;
  private loopPickingMode: LoopPickingMode = null;

  private listeners: Set<PlaybackListener> = new Set();

  constructor() {}

  public addListener(listener: PlaybackListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyState(): void {
    this.listeners.forEach(l => l.onStateChange?.(this.state));
  }

  private notifyStep(step: ScoreStep): void {
    const total = this.steps.length > 0 ? this.steps.length : 1;
    const progress = Math.min(1, Math.max(0, step.stepIndex / total));
    this.listeners.forEach(l => l.onStepChange?.(step, step.measureNumber, progress));
  }

  private notifyTracks(): void {
    this.listeners.forEach(l => l.onTracksChange?.([...this.tracks]));
  }

  private notifyBpm(): void {
    this.listeners.forEach(l => l.onBpmChange?.(this.effectiveBpm));
  }

  public notifyLoop(): void {
    this.listeners.forEach(l => l.onLoopChange?.(this.loopEnabled, this.loopStartMeasure, this.loopEndMeasure, this.loopPickingMode));
  }

  private notifyCountInBeat(info: CountInBeat | null): void {
    this.listeners.forEach(l => l.onCountInBeat?.(info));
  }

  private notifyCountInSetting(): void {
    this.listeners.forEach(l => l.onCountInSettingChange?.(this.countInMeasures));
  }

  public get countIn(): number {
    return this.countInMeasures;
  }

  public setCountIn(measures: number): void {
    this.countInMeasures = Math.max(0, Math.min(3, measures));
    this.notifyCountInSetting();
  }

  public get isLoopEnabled(): boolean {
    return this.loopEnabled;
  }

  public get loopStart(): number {
    return this.loopStartMeasure;
  }

  public get loopEnd(): number {
    return this.loopEndMeasure;
  }

  public get loopPicking(): LoopPickingMode {
    return this.loopPickingMode;
  }

  public setLoopPickingMode(mode: LoopPickingMode): void {
    this.loopPickingMode = mode;
    this.notifyLoop();
  }

  public get effectiveBpm(): number {
    return Math.round(this.bpm * this.speedMultiplier);
  }

  public get currentTracks(): TrackVoice[] {
    return [...this.tracks];
  }

  public get currentState(): PlaybackState {
    return this.state;
  }

  public get currentMetadata(): ScoreMetadata | null {
    return this.metadata;
  }

  public get currentStep(): ScoreStep | null {
    return this.steps[this.currentStepIndex] || null;
  }

  public get totalStepsCount(): number {
    return this.steps.length;
  }

  public get isLooping(): boolean {
    return this.loopEnabled;
  }

  public get loopRange(): { start: number; end: number } {
    return { start: this.loopStartMeasure, end: this.loopEndMeasure };
  }

  public get metronomeActive(): boolean {
    return this.isMetronomeEnabled;
  }

  /**
   * Initializes the controller with the loaded OSMD instance
   */
  public async loadScore(osmd: OpenSheetMusicDisplay, container: HTMLElement): Promise<ScoreMetadata> {
    this.stop();
    this.osmd = osmd;
    this.container = container;

    // Detect Tempo
    if (osmd.Sheet.HasBPMInfo && osmd.Sheet.DefaultStartTempoInBpm > 20) {
      this.bpm = osmd.Sheet.DefaultStartTempoInBpm;
    } else {
      this.bpm = 100;
    }
    this.speedMultiplier = 1.0;

    // Extract Tracks and Voices
    this.tracks = this.extractTracks(osmd);

    // Build timeline steps
    this.steps = this.indexScoreSteps(osmd);

    // Build timeline metronome beats according to each measure's time signature (3/4, 4/4, etc.)
    this.beats = this.indexScoreBeats(osmd, this.steps);
    this.cancelCountIn();
    this.nextBeatToSchedule = 0;

    const totalMeasures = osmd.Sheet.SourceMeasures.length;
    this.loopEnabled = false;
    this.loopStartMeasure = 1;
    this.loopEndMeasure = Math.max(1, totalMeasures);
    this.loopPickingMode = null;
    this.notifyLoop();

    const title = osmd.Sheet.TitleString || 'Unbenanntes Werk';
    const composer = osmd.Sheet.ComposerString || '';
    const timeSig = osmd.Sheet.SourceMeasures[0]?.ActiveTimeSignature 
      ? `${osmd.Sheet.SourceMeasures[0].ActiveTimeSignature.Numerator}/${osmd.Sheet.SourceMeasures[0].ActiveTimeSignature.Denominator}`
      : '4/4';

    this.metadata = {
      title,
      composer,
      tempoBpm: this.bpm,
      timeSignature: timeSig,
      totalMeasures,
      tracks: [...this.tracks],
    };

    // Ensure cursor is positioned at start
    osmd.cursor.reset();
    osmd.cursor.show();
    this.currentStepIndex = 0;

    this.updateSynthTrackVolumes();
    this.notifyTracks();
    this.notifyBpm();
    this.notifyState();
    if (this.steps[0]) {
      this.notifyStep(this.steps[0]);
    }

    return this.metadata;
  }

  private extractTracks(osmd: OpenSheetMusicDisplay): TrackVoice[] {
    const tracks: TrackVoice[] = [];
    const instruments = osmd.Sheet.Instruments;

    for (let instIdx = 0; instIdx < instruments.length; instIdx++) {
      const inst = instruments[instIdx];
      const instName = inst.NameLabel?.text?.trim() || inst.Name || `Spur ${instIdx + 1}`;

      for (let vIdx = 0; vIdx < inst.Voices.length; vIdx++) {
        const voice = inst.Voices[vIdx];
        const voiceId = voice.VoiceId;
        // Uniquely identify track by both instrument index and voiceId
        const trackId = `${instIdx}_${voiceId}`;

        // Determine friendly track name
        let name = instName;
        if (inst.Voices.length > 1) {
          name = `${instName} (Stimme ${vIdx + 1})`;
        }

        // Guess suitable sound profile from name
        const lower = name.toLowerCase();
        let soundType: SoundType = 'piano';
        if (lower.includes('sopran') || lower.includes('alt') || lower.includes('tenor') || lower.includes('bass') || lower.includes('chor')) {
          soundType = 'choir';
        } else if (lower.includes('violine') || lower.includes('geige') || lower.includes('viola') || lower.includes('cello') || lower.includes('streich')) {
          soundType = 'strings';
        } else if (lower.includes('flöte') || lower.includes('flute') || lower.includes('oboe') || lower.includes('klarinette')) {
          soundType = 'flute';
        } else if (lower.includes('trompete') || lower.includes('posaune') || lower.includes('horn') || lower.includes('brass')) {
          soundType = 'brass';
        } else if (lower.includes('orgel') || lower.includes('organ')) {
          soundType = 'organ';
        } else if (lower.includes('kontrabass') || lower.includes('bass')) {
          soundType = 'acoustic_bass';
        }

        tracks.push({
          id: trackId,
          instrumentIndex: instIdx,
          voiceIndex: vIdx,
          voiceId: voiceId,
          name: name,
          instrumentName: instName,
          volume: 0.8,
          muted: false,
          solo: false,
          soundType: soundType,
        });
      }
    }

    return tracks;
  }

  private indexScoreSteps(osmd: OpenSheetMusicDisplay): ScoreStep[] {
    const steps: ScoreStep[] = [];
    const cursor = osmd.cursor;
    cursor.reset();
    cursor.show();

    let stepIdx = 0;
    let lastTimestampQuarter = 0;
    let lastStepDurationQuarter = 1.0;

    while (!cursor.Iterator.EndReached) {
      const measureIndex = cursor.Iterator.CurrentMeasureIndex;
      const measureNumber = osmd.Sheet.SourceMeasures[measureIndex]?.MeasureNumberXML || (measureIndex + 1);

      // Use CurrentEnrolledTimestamp for correct linear timeline across repeats (Wiederholungen)
      let timestampQuarter: number;
      if (cursor.Iterator.CurrentEnrolledTimestamp) {
        timestampQuarter = cursor.Iterator.CurrentEnrolledTimestamp.RealValue * 4;
      } else {
        timestampQuarter = cursor.Iterator.currentTimeStamp.RealValue * 4;
      }

      // Extract notes under cursor
      const osmdNotes = cursor.NotesUnderCursor();
      const noteEvents: NoteEvent[] = [];
      let minNoteDurationQuarter = 4.0;

      for (const note of osmdNotes) {
        if (!note || note.isRest()) continue;

        // Correctly identify both the parent instrument and voice
        const parentVoice = note.ParentVoiceEntry?.ParentVoice;
        const parentInst = parentVoice?.Parent;
        
        let instIdx = parentInst ? osmd.Sheet.Instruments.indexOf(parentInst) : -1;
        let voiceId = parentVoice?.VoiceId ?? 0;

        if (instIdx === -1) {
          instIdx = 0;
        }

        const trackId = `${instIdx}_${voiceId}`;
        // Find matching track by trackId or instrument index
        const track = this.tracks.find(t => t.id === trackId) ||
                      this.tracks.find(t => t.instrumentIndex === instIdx) ||
                      this.tracks[0];

        const actualTrackId = track ? track.id : trackId;
        const durQuarter = (note.Length?.RealValue ?? 0.25) * 4;
        if (durQuarter > 0 && durQuarter < minNoteDurationQuarter) {
          minNoteDurationQuarter = durQuarter;
        }

        const durSeconds = durQuarter * (60 / this.bpm);
        const tie = (note as any).NoteTie || (note as any).Tie;

        noteEvents.push({
          midiNote: note.halfTone,
          pitchName: note.Pitch ? note.Pitch.ToString() : '',
          duration: durSeconds,
          volume: 0.8,
          trackId: actualTrackId,
          isRest: false,
          isTied: !!(tie && tie.StartNote !== note),
        });
      }

      // Strict monotonic timeline safeguard: Playback timeline MUST ALWAYS advance forward, never jump backwards
      if (stepIdx > 0 && timestampQuarter < lastTimestampQuarter) {
        timestampQuarter = lastTimestampQuarter + (lastStepDurationQuarter || 1.0);
      }

      lastTimestampQuarter = timestampQuarter;
      lastStepDurationQuarter = (noteEvents.length > 0) ? minNoteDurationQuarter : 1.0;

      // Record visual coordinates of cursor at this step for click-to-seek
      let visualBounds = undefined;
      if (cursor.cursorElement) {
        const el = cursor.cursorElement;
        visualBounds = {
          x: el.offsetLeft,
          y: el.offsetTop,
          width: el.offsetWidth || 20,
          height: el.offsetHeight || 80,
          page: cursor.currentPageNumber || 1,
        };
      }

      steps.push({
        stepIndex: stepIdx,
        measureIndex,
        measureNumber,
        timestampQuarter,
        timeSeconds: timestampQuarter * (60 / this.bpm),
        notes: noteEvents,
        visualBounds,
      });

      stepIdx++;
      cursor.next();
    }

    // Reset cursor to 0 after indexing
    cursor.reset();
    return steps;
  }

  /**
   * Generates discrete metronome beats across the score based on each measure's
   * exact Time Signature (e.g. 3/4 -> 3 beats, 4/4 -> 4 beats, 6/8 -> 6 beats).
   */
  private indexScoreBeats(osmd: OpenSheetMusicDisplay, steps: ScoreStep[]): MetronomeBeat[] {
    const beats: MetronomeBeat[] = [];
    if (steps.length === 0) return beats;

    let lastMeasureIndex = -1;
    let lastQuarterTimestamp = -1;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const isNewMeasure = (i === 0) || (step.measureIndex !== lastMeasureIndex) || (step.timestampQuarter > lastQuarterTimestamp + 0.05);

      if (isNewMeasure) {
        lastMeasureIndex = step.measureIndex;

        const sourceMeasure = osmd.Sheet.SourceMeasures[step.measureIndex];
        const timeSig = sourceMeasure?.ActiveTimeSignature || osmd.Sheet.SourceMeasures[0]?.ActiveTimeSignature;
        const beatsPerMeasure = timeSig?.Numerator || 4;
        const beatDenominator = timeSig?.Denominator || 4;
        const beatQuarterDuration = 4 / beatDenominator;
        const measureStartQuarter = step.timestampQuarter;

        let measureDurationQuarter = beatsPerMeasure * beatQuarterDuration;
        if (sourceMeasure?.Duration) {
          measureDurationQuarter = sourceMeasure.Duration.RealValue * 4;
        }

        const actualBeatsCount = Math.max(1, Math.round(measureDurationQuarter / beatQuarterDuration));

        for (let b = 1; b <= actualBeatsCount; b++) {
          beats.push({
            measureIndex: step.measureIndex,
            measureNumber: step.measureNumber,
            beatNumber: b,
            beatsPerMeasure: beatsPerMeasure,
            isFirstBeat: (b === 1),
            quarterTimestamp: measureStartQuarter + (b - 1) * beatQuarterDuration,
          });
        }

        lastQuarterTimestamp = measureStartQuarter + measureDurationQuarter - 0.01;
      }
    }

    return beats;
  }

  /**
   * Click-to-seek: translates mouse click screen coordinates and/or clicked SVG element
   * directly to the exact measure and step.
   */
  public seekByMouseClick(clientX: number, clientY: number, directMeasureIndex: number | null): void {
    if (this.steps.length === 0 || !this.osmd) return;

    let targetMeasureIndex = directMeasureIndex;
    let targetMeasureRect: { left: number; top: number; width: number; height: number } | null = null;

    // 1. If direct DOM match was found, compute its bounding box
    if (targetMeasureIndex !== null) {
      const staveGroups = document.querySelectorAll(`g[id^="osmd-m${targetMeasureIndex}-"]`);
      if (staveGroups.length > 0) {
        let left = Infinity;
        let right = -Infinity;
        let top = Infinity;
        let bottom = -Infinity;

        staveGroups.forEach(g => {
          const r = g.getBoundingClientRect();
          if (r.left < left) left = r.left;
          if (r.right > right) right = r.right;
          if (r.top < top) top = r.top;
          if (r.bottom > bottom) bottom = r.bottom;
        });

        if (left < right) {
          targetMeasureRect = { left, top, width: right - left, height: bottom - top };
        }
      }
    }

    // 2. If no direct DOM match: determine measure from click coordinates across all measures
    if (targetMeasureIndex === null) {
      const totalMeasures = this.osmd.Sheet.SourceMeasures.length;
      let closestMeasureIdx = 0;
      let minDistance = Infinity;

      for (let m = 0; m < totalMeasures; m++) {
        const staveGroups = document.querySelectorAll(`g[id^="osmd-m${m}-"]`);
        if (staveGroups.length === 0) continue;

        let left = Infinity;
        let right = -Infinity;
        let top = Infinity;
        let bottom = -Infinity;

        staveGroups.forEach(g => {
          const r = g.getBoundingClientRect();
          if (r.left < left) left = r.left;
          if (r.right > right) right = r.right;
          if (r.top < top) top = r.top;
          if (r.bottom > bottom) bottom = r.bottom;
        });

        if (left >= right) continue;

        // Vertical margin around stave line
        top -= 15;
        bottom += 15;

        // Is the click directly inside this measure's column?
        const isInsideX = clientX >= left && clientX <= right;
        const isInsideY = clientY >= top && clientY <= bottom;

        if (isInsideX && isInsideY) {
          closestMeasureIdx = m;
          targetMeasureRect = { left, top, width: right - left, height: bottom - top };
          minDistance = 0;
          break;
        }

        // Distance with system row penalty
        const dy = (clientY < top) ? top - clientY : (clientY > bottom) ? clientY - bottom : 0;
        const dx = (clientX < left) ? left - clientX : (clientX > right) ? clientX - right : 0;
        const dist = dy * 8 + dx;

        if (dist < minDistance) {
          minDistance = dist;
          closestMeasureIdx = m;
          targetMeasureRect = { left, top, width: right - left, height: bottom - top };
        }
      }

      targetMeasureIndex = closestMeasureIdx;
    }

    // Find all steps for this measure
    const measureSteps = this.steps.filter(s => s.measureIndex === targetMeasureIndex);
    if (measureSteps.length === 0) {
      const fallbackStep = this.steps.find(s => s.measureIndex >= targetMeasureIndex) || this.steps[0];
      if (fallbackStep) {
        this.jumpToStep(fallbackStep.stepIndex);
      }
      return;
    }

    const targetMeasureNumber = measureSteps[0].measureNumber;
    const total = this.totalMeasures;

    // Check if user is in Loop-Auswahl mode (picking start or end measure)
    if (this.loopPickingMode === 'start') {
      let newStart = targetMeasureNumber;
      let newEnd = this.loopEndMeasure;

      // Ist Anfang hinter Endtakt, wird Endtakt automatisch auf Anfangstakt + 1 gesetzt.
      // Sonderfälle für ersten und letzten Takt:
      if (newStart >= newEnd) {
        newEnd = newStart + 1;
        if (newEnd > total) {
          newEnd = total;
          newStart = Math.max(1, total - 1);
        }
      }

      this.loopPickingMode = null;
      this.setLoop(true, newStart, newEnd);
      this.jumpToMeasure(newStart);
      return;
    }

    if (this.loopPickingMode === 'end') {
      let newEnd = targetMeasureNumber;
      let newStart = this.loopStartMeasure;

      // Und anders herum (Ist Endtakt vor Anfangstakt, wird Anfangstakt auf Endtakt - 1 gesetzt):
      // Sonderfälle für ersten und letzten Takt:
      if (newEnd <= newStart) {
        newStart = newEnd - 1;
        if (newStart < 1) {
          newStart = 1;
          newEnd = Math.min(total, 2);
        }
      }

      this.loopPickingMode = null;
      this.setLoop(true, newStart, newEnd);
      return;
    }

    // Grundsätzlich sollte beim Tippen oder Klicken auf einen Takt immer der Taktanfang ausgewählt werden.
    // Keine Note innerhalb des Taktes.
    this.jumpToStep(measureSteps[0].stepIndex);
  }

  public seekToCoordinates(containerX: number, containerY: number): void {
    // Kept for backwards compatibility
    if (this.steps.length === 0) return;
    this.seekByMouseClick(containerX, containerY, null);
  }

  /**
   * Jumps playback and cursor to specific step index
   */
  public jumpToStep(stepIndex: number): void {
    if (stepIndex < 0) stepIndex = 0;
    if (stepIndex >= this.steps.length) stepIndex = Math.max(0, this.steps.length - 1);

    const wasPlaying = this.state === 'playing';

    if (wasPlaying) {
      this.pauseInternal();
    }

    this.currentStepIndex = stepIndex;
    this.moveOsmdCursorToStep(stepIndex);

    const step = this.steps[stepIndex];
    if (step) {
      this.notifyStep(step);
      const bIdx = this.beats.findIndex(b => b.quarterTimestamp >= step.timestampQuarter);
      this.nextBeatToSchedule = (bIdx !== -1) ? bIdx : this.beats.length;
    }

    if (wasPlaying) {
      this.play();
    }
  }

  public jumpToMeasure(measureNumber: number): void {
    const targetIdx = this.steps.findIndex(s => s.measureNumber >= measureNumber);
    if (targetIdx !== -1) {
      this.jumpToStep(targetIdx);
    }
  }

  private moveOsmdCursorToStep(targetStepIndex: number): void {
    if (!this.osmd) return;
    const cursor = this.osmd.cursor;
    cursor.show();
    cursor.reset();

    for (let i = 0; i < targetStepIndex; i++) {
      if (cursor.Iterator.EndReached) break;
      cursor.next();
    }

    this.scrollCursorIntoView();
  }

  public scrollCursorIntoView(): void {
    if (!this.osmd) return;
    const cursorEl = this.osmd.cursor?.cursorElement;
    if (!cursorEl) return;

    const rect = cursorEl.getBoundingClientRect();
    const isVisible = (
      rect.top >= 80 &&
      rect.bottom <= (window.innerHeight - 130)
    );

    if (!isVisible) {
      cursorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /**
   * Playback Controls
   */
  public async play(): Promise<void> {
    if (this.state === 'playing' || this.state === 'counting_in') return;
    if (this.steps.length === 0) return;

    await globalSynth.init();

    // If Loop is enabled: ensure we start within the loop range
    if (this.loopEnabled) {
      const currentStep = this.currentStep;
      if (!currentStep || currentStep.measureNumber < this.loopStartMeasure || currentStep.measureNumber > this.loopEndMeasure) {
        this.currentStepIndex = this.findStepForLoopStart(this.loopStartMeasure, this.loopEndMeasure);
        this.moveOsmdCursorToStep(this.currentStepIndex);
      }
    } else if (this.currentStepIndex >= this.steps.length - 1) {
      // If at end of score, rewind to start
      this.currentStepIndex = 0;
      this.moveOsmdCursorToStep(0);
    }

    // If Vorklick (Count-In) is configured, perform count-in before real playback
    if (this.countInMeasures > 0) {
      this.startCountIn();
      return;
    }

    this.startPlaybackInternal();
  }

  private startCountIn(): void {
    this.cancelCountIn();

    const synthCtx = globalSynth.audioContext;
    if (!synthCtx) return;

    this.state = 'counting_in';
    this.notifyState();

    // Target starting step
    const startStep = this.steps[this.currentStepIndex] || this.steps[0];
    const sourceMeasure = this.osmd?.Sheet.SourceMeasures[startStep.measureIndex];
    const timeSig = sourceMeasure?.ActiveTimeSignature || this.osmd?.Sheet.SourceMeasures[0]?.ActiveTimeSignature;
    const beatsPerMeasure = timeSig?.Numerator || 4;
    const beatDenominator = timeSig?.Denominator || 4;
    const beatQuarterDuration = 4 / beatDenominator;
    const beatDurationSec = beatQuarterDuration * (60 / this.effectiveBpm);

    const totalCountInBeats = this.countInMeasures * beatsPerMeasure;
    const totalCountInDurationSec = totalCountInBeats * beatDurationSec;

    const now = synthCtx.currentTime;
    const countInStartTime = now + 0.05;

    // Schedule audio clicks and visual notifications
    for (let k = 0; k < totalCountInBeats; k++) {
      const measureNum = Math.floor(k / beatsPerMeasure) + 1;
      const beatNum = (k % beatsPerMeasure) + 1;
      const isFirstBeat = (beatNum === 1);
      const clickAudioTime = countInStartTime + k * beatDurationSec;

      // Always play click during count-in
      globalSynth.playClick(isFirstBeat, clickAudioTime);

      const delayMs = Math.max(0, (clickAudioTime - now) * 1000);
      const timeoutId = window.setTimeout(() => {
        if (this.state !== 'counting_in') return;
        this.notifyCountInBeat({
          measure: measureNum,
          totalMeasures: this.countInMeasures,
          beat: beatNum,
          beatsPerMeasure: beatsPerMeasure,
        });
      }, delayMs);
      this.countInTimeouts.push(timeoutId);
    }

    // Schedule start of playback exactly when count-in finishes
    const playbackStartTime = countInStartTime + totalCountInDurationSec;
    const startDelayMs = Math.max(0, (playbackStartTime - now) * 1000);

    const finishTimeoutId = window.setTimeout(() => {
      if (this.state !== 'counting_in') return;
      this.notifyCountInBeat(null);
      this.startPlaybackInternal(playbackStartTime);
    }, startDelayMs);
    this.countInTimeouts.push(finishTimeoutId);
  }

  public cancelCountIn(): void {
    this.countInTimeouts.forEach(h => clearTimeout(h));
    this.countInTimeouts = [];
    this.notifyCountInBeat(null);
  }

  private startPlaybackInternal(explicitAudioStartTime?: number): void {
    const synthCtx = globalSynth.audioContext;
    if (!synthCtx) return;

    this.state = 'playing';
    this.notifyState();

    this.nextStepToSchedule = this.currentStepIndex;
    const currentStepObj = this.steps[this.currentStepIndex];
    const initialTimeOffset = currentStepObj ? currentStepObj.timestampQuarter * (60 / this.effectiveBpm) : 0;

    this.playbackInitialStep = this.currentStepIndex;
    this.playbackAudioStartTime = explicitAudioStartTime !== undefined ? explicitAudioStartTime : synthCtx.currentTime;
    this.playbackStepStartOffset = initialTimeOffset;

    // Align next metronome beat with current step
    if (currentStepObj) {
      const bIdx = this.beats.findIndex(b => b.quarterTimestamp >= currentStepObj.timestampQuarter);
      this.nextBeatToSchedule = (bIdx !== -1) ? bIdx : this.beats.length;
    } else {
      this.nextBeatToSchedule = 0;
    }

    this.startSchedulerLoop();
  }

  public getScoreRepeats(): { startMeasure: number; endMeasure: number }[] {
    const repeats: { startMeasure: number; endMeasure: number }[] = [];
    for (let i = 0; i < this.steps.length - 1; i++) {
      const curM = this.steps[i].measureNumber;
      const nextM = this.steps[i + 1].measureNumber;
      if (nextM < curM) {
        if (!repeats.some(r => r.startMeasure === nextM && r.endMeasure === curM)) {
          repeats.push({ startMeasure: nextM, endMeasure: curM });
        }
      }
    }
    return repeats;
  }

  public findStepForLoopStart(loopStart: number, loopEnd: number): number {
    const repeats = this.getScoreRepeats();
    // Check if loopStart lies inside a repeat that ends before loopEnd,
    // and this repeat is NOT active in the loop (e.g. repStart < loopStart)
    const inactivePrecedingRepeat = repeats.find(r =>
      r.startMeasure <= loopStart && loopStart <= r.endMeasure &&
      !(r.startMeasure >= loopStart && r.endMeasure <= loopEnd) &&
      loopEnd > r.endMeasure
    );

    if (inactivePrecedingRepeat) {
      // Find the pass of loopStart that continues past inactivePrecedingRepeat.endMeasure
      for (let i = this.steps.length - 1; i >= 0; i--) {
        if (this.steps[i].measureNumber === loopStart) {
          let reachesPast = false;
          for (let j = i; j < this.steps.length; j++) {
            if (this.steps[j].measureNumber > inactivePrecedingRepeat.endMeasure) {
              reachesPast = true;
              break;
            }
            if (j + 1 < this.steps.length && this.steps[j + 1].measureNumber < this.steps[j].measureNumber) {
              break;
            }
          }
          if (reachesPast) {
            let firstStepOfMeasure = i;
            while (firstStepOfMeasure > 0 && this.steps[firstStepOfMeasure - 1].measureNumber === loopStart) {
              firstStepOfMeasure--;
            }
            return firstStepOfMeasure;
          }
        }
      }
    }

    return this.findStepForMeasure(loopStart);
  }

  private getLoopBoundaries(): {
    startStepIdx: number;
    endStepIdx: number;
    startScoreTime: number;
    endScoreTime: number;
  } | null {
    if (!this.loopEnabled || this.steps.length === 0 || !this.osmd) return null;

    const startStepIdx = this.findStepForLoopStart(this.loopStartMeasure, this.loopEndMeasure);
    if (startStepIdx === -1 || startStepIdx >= this.steps.length) return null;

    // Build the step sequence for [loopStartMeasure, loopEndMeasure].
    // Rule: Wiederholungszeichen werden nur dann berücksichtigt, wenn der
    // zu wiederholende Abschnitt vollständig zwischen gewählten Anfangs- und Endtakt des Loops liegt.
    let endStepIdx = startStepIdx;

    for (let i = startStepIdx; i < this.steps.length; i++) {
      const curStep = this.steps[i];
      const mNum = curStep.measureNumber;

      // Ensure we stay within loop bounds
      if (mNum < this.loopStartMeasure || mNum > this.loopEndMeasure) {
        break;
      }

      endStepIdx = i;

      // Check transition to next step
      if (i + 1 < this.steps.length) {
        const nextStep = this.steps[i + 1];
        const nextMNum = nextStep.measureNumber;

        // Is there a backward repeat jump in the score?
        if (nextMNum < mNum) {
          const repStart = nextMNum;
          const repEnd = mNum;
          // Only repeat if the section to be repeated lies completely within [loopStartMeasure, loopEndMeasure]
          const isFullyInsideLoop = (
            repStart >= this.loopStartMeasure &&
            repEnd <= this.loopEndMeasure
          );

          if (isFullyInsideLoop) {
            // Repeat section is fully inside loop -> allow the repetition
            continue;
          } else {
            // Repeat section is NOT fully inside loop -> ignore repeat!
            if (mNum === this.loopEndMeasure) {
              // At loop end: the loop pass is finished!
              break;
            } else {
              // Intermediate measure with inactive repeat: skip the repeat jump to mNum + 1
              const nextMIdx = this.steps.findIndex((s, idx) => idx > i && s.measureNumber === mNum + 1);
              if (nextMIdx !== -1 && this.steps[nextMIdx].measureNumber <= this.loopEndMeasure) {
                i = nextMIdx - 1;
                continue;
              } else {
                break;
              }
            }
          }
        }

        // If next step advances past the loop end measure
        if (nextMNum > this.loopEndMeasure) {
          break;
        }
      }
    }

    const startStep = this.steps[startStepIdx];
    const endStep = this.steps[endStepIdx];
    if (!startStep || !endStep) return null;

    const startScoreTime = startStep.timestampQuarter * (60 / this.effectiveBpm);

    // Calculate exact musical end time of loopEndMeasure:
    // start timestamp of loopEndMeasure + full measure duration
    let endScoreTime: number;
    const sourceMeasure = this.osmd.Sheet.SourceMeasures[endStep.measureIndex];
    if (sourceMeasure && sourceMeasure.Duration) {
      let measureStartQuarter = endStep.timestampQuarter;
      for (let i = endStepIdx; i >= startStepIdx; i--) {
        if (this.steps[i].measureIndex === endStep.measureIndex) {
          measureStartQuarter = this.steps[i].timestampQuarter;
        } else {
          break;
        }
      }
      const measureDurationQuarter = sourceMeasure.Duration.RealValue * 4;
      endScoreTime = (measureStartQuarter + measureDurationQuarter) * (60 / this.effectiveBpm);
    } else {
      let maxDurSec = 0.5;
      if (endStep.notes.length > 0) {
        maxDurSec = Math.max(...endStep.notes.map(n => (n.duration / (60 / this.bpm)) * (60 / this.effectiveBpm)));
      }
      endScoreTime = (endStep.timestampQuarter * (60 / this.effectiveBpm)) + maxDurSec;
    }

    if (endScoreTime <= startScoreTime) {
      endScoreTime = startScoreTime + 1.0;
    }

    return {
      startStepIdx,
      endStepIdx,
      startScoreTime,
      endScoreTime,
    };
  }

  private startSchedulerLoop(): void {
    if (this.schedulerTimer !== null) {
      clearInterval(this.schedulerTimer);
    }

    // Chris Wilson Web Audio Lookahead Scheduler pattern:
    // Ticks every 25ms, schedules audio 150ms in advance
    const scheduleIntervalMs = 25;
    const scheduleAheadTimeSec = 0.15;

    this.schedulerTimer = window.setInterval(() => {
      if (this.state !== 'playing') return;

      const synthCtx = globalSynth.audioContext;
      if (!synthCtx) return;

      const currentAudioTime = synthCtx.currentTime;
      const elapsedScoreTime = (currentAudioTime - this.playbackAudioStartTime);
      const currentScoreTime = this.playbackStepStartOffset + elapsedScoreTime;
      const scheduleUntilScoreTime = currentScoreTime + scheduleAheadTimeSec;

      while (this.nextStepToSchedule < this.steps.length) {
        // Check A-B loop boundary before scheduling step
        if (this.loopEnabled) {
          const loopBounds = this.getLoopBoundaries();
          if (loopBounds && this.nextStepToSchedule > loopBounds.endStepIdx) {
            // All steps of loopEndMeasure are scheduled.
            // When does the repeated pass begin? Exactly at loopEndTime:
            const loopEndTime = this.playbackAudioStartTime + (loopBounds.endScoreTime - this.playbackStepStartOffset);

            this.playbackAudioStartTime = loopEndTime;
            this.playbackStepStartOffset = loopBounds.startScoreTime;
            this.nextStepToSchedule = loopBounds.startStepIdx;
            this.playbackInitialStep = loopBounds.startStepIdx;

            // Reset metronome beat index for loop start
            const loopStartStep = this.steps[loopBounds.startStepIdx];
            if (loopStartStep) {
              const bIdx = this.beats.findIndex(b => b.quarterTimestamp >= loopStartStep.timestampQuarter);
              this.nextBeatToSchedule = (bIdx !== -1) ? bIdx : this.beats.length;
            }

            // Schedule the visual cursor and UI jump to coincide with loopEndTime
            const jumpDelayMs = Math.max(0, (loopEndTime - currentAudioTime) * 1000);
            const targetStep = this.steps[loopBounds.startStepIdx];

            const jumpTimeoutId = window.setTimeout(() => {
              if (this.state !== 'playing' || !this.loopEnabled) return;
              this.currentStepIndex = loopBounds.startStepIdx;
              this.moveOsmdCursorToStep(loopBounds.startStepIdx);
              if (targetStep) {
                this.notifyStep(targetStep);
              }
            }, jumpDelayMs);

            this.stepTimeoutHandles.push(jumpTimeoutId);
            break;
          }
        }

        const step = this.steps[this.nextStepToSchedule];
        const stepScoreTime = step.timestampQuarter * (60 / this.effectiveBpm);

        if (stepScoreTime > scheduleUntilScoreTime) {
          // Not ready to be scheduled yet
          break;
        }

        // Schedule step for audio time
        const audioScheduleTime = this.playbackAudioStartTime + (stepScoreTime - this.playbackStepStartOffset);
        this.scheduleStepAudio(step, Math.max(currentAudioTime, audioScheduleTime));

        // Schedule visual UI & cursor update
        const delayMs = Math.max(0, (audioScheduleTime - currentAudioTime) * 1000);
        const scheduledIdx = this.nextStepToSchedule;
        
        const timeoutId = window.setTimeout(() => {
          if (this.state !== 'playing') return;
          if (scheduledIdx > this.playbackInitialStep) {
            this.osmd?.cursor?.next();
            this.scrollCursorIntoView();
          }
          this.currentStepIndex = scheduledIdx;
          this.notifyStep(step);
        }, delayMs);

        this.stepTimeoutHandles.push(timeoutId);
        this.nextStepToSchedule++;
      }

      // Schedule discrete Metronome Beats according to measure Time Signatures (3/4, 4/4, etc.)
      if (this.isMetronomeEnabled) {
        while (this.nextBeatToSchedule < this.beats.length) {
          const beat = this.beats[this.nextBeatToSchedule];
          const beatScoreTime = beat.quarterTimestamp * (60 / this.effectiveBpm);

          // If loop is enabled, don't schedule clicks past loop end
          if (this.loopEnabled) {
            const loopBounds = this.getLoopBoundaries();
            if (loopBounds && beatScoreTime >= loopBounds.endScoreTime) {
              break;
            }
          }

          if (beatScoreTime > scheduleUntilScoreTime) {
            break;
          }

          const beatAudioTime = this.playbackAudioStartTime + (beatScoreTime - this.playbackStepStartOffset);
          if (beatAudioTime >= currentAudioTime - 0.05) {
            globalSynth.playClick(beat.isFirstBeat, Math.max(currentAudioTime, beatAudioTime));
          }

          this.nextBeatToSchedule++;
        }
      }

      // Check if end reached
      if (this.nextStepToSchedule >= this.steps.length) {
        const lastStep = this.steps[this.steps.length - 1];
        const lastStepScoreTime = lastStep.timestampQuarter * (60 / this.effectiveBpm);
        const finalDelay = Math.max(0, (lastStepScoreTime - currentScoreTime + 0.5) * 1000);
        
        window.setTimeout(() => {
          if (this.state === 'playing' && this.nextStepToSchedule >= this.steps.length) {
            this.stop();
          }
        }, finalDelay);
      }
    }, scheduleIntervalMs);
  }

  private scheduleStepAudio(step: ScoreStep, audioTime: number): void {
    // Check if any track has SOLO active
    const hasSolo = this.tracks.some(t => t.solo);

    // Schedule all notes for audible tracks
    for (const note of step.notes) {
      const track = this.tracks.find(t => t.id === note.trackId);
      if (!track) continue;

      // Determine track audibility based on Solo / Mute rules
      let isAudible = false;
      if (hasSolo) {
        isAudible = track.solo && !track.muted;
      } else {
        isAudible = !track.muted;
      }

      if (!isAudible) continue;

      const durSeconds = (note.duration / (60 / this.bpm)) * (60 / this.effectiveBpm);
      globalSynth.playNote(
        note.midiNote,
        durSeconds,
        track.volume,
        track.soundType,
        track.id,
        audioTime
      );
    }
  }

  private findStepForMeasure(measureNumber: number): number {
    const idx = this.steps.findIndex(s => s.measureNumber >= measureNumber);
    return idx !== -1 ? idx : 0;
  }

  public pause(): void {
    this.pauseInternal();
    this.state = 'paused';
    this.notifyState();
  }

  private pauseInternal(): void {
    this.cancelCountIn();
    if (this.schedulerTimer !== null) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    this.clearTimeouts();
    globalSynth.stopAllNotes();
  }

  public stop(): void {
    this.pauseInternal();
    this.state = 'stopped';

    if (this.loopEnabled) {
      this.currentStepIndex = this.findStepForLoopStart(this.loopStartMeasure, this.loopEndMeasure);
    } else {
      this.currentStepIndex = 0;
    }
    this.nextStepToSchedule = this.currentStepIndex;
    const currentStep = this.currentStep;
    if (currentStep) {
      const bIdx = this.beats.findIndex(b => b.quarterTimestamp >= currentStep.timestampQuarter);
      this.nextBeatToSchedule = (bIdx !== -1) ? bIdx : 0;
    } else {
      this.nextBeatToSchedule = 0;
    }
    this.moveOsmdCursorToStep(this.currentStepIndex);

    this.notifyState();
    if (this.steps[this.currentStepIndex]) {
      this.notifyStep(this.steps[this.currentStepIndex]);
    }
  }

  private clearTimeouts(): void {
    this.stepTimeoutHandles.forEach(h => clearTimeout(h));
    this.stepTimeoutHandles = [];
  }

  public updateSynthTrackVolumes(): void {
    const hasSolo = this.tracks.some(t => t.solo);
    for (const track of this.tracks) {
      let isAudible = false;
      if (hasSolo) {
        isAudible = track.solo && !track.muted;
      } else {
        isAudible = !track.muted;
      }
      globalSynth.setTrackVolume(track.id, track.volume, !isAudible);
    }
  }

  /**
   * Track / Voice Controls (Solo, Mute, Volume, Sound)
   */
  public setVoiceMuted(trackId: string, muted: boolean): void {
    const track = this.tracks.find(t => t.id === trackId);
    if (!track) return;
    track.muted = muted;
    this.updateSynthTrackVolumes();
    this.notifyTracks();
  }

  public setVoiceSolo(trackId: string, solo: boolean): void {
    const track = this.tracks.find(t => t.id === trackId);
    if (!track) return;
    track.solo = solo;
    this.updateSynthTrackVolumes();
    this.notifyTracks();
  }

  public setVoiceVolume(trackId: string, volume: number): void {
    const track = this.tracks.find(t => t.id === trackId);
    if (!track) return;
    track.volume = Math.max(0, Math.min(1, volume));
    this.updateSynthTrackVolumes();
    this.notifyTracks();
  }

  public setVoiceSoundType(trackId: string, soundType: SoundType): void {
    const track = this.tracks.find(t => t.id === trackId);
    if (!track) return;
    track.soundType = soundType;
    this.notifyTracks();
  }

  public setAllVoicesActive(active: boolean): void {
    this.tracks.forEach(t => {
      t.muted = !active;
      t.solo = false;
    });
    this.updateSynthTrackVolumes();
    this.notifyTracks();
  }

  public isolateSingleVoice(trackId: string): void {
    this.tracks.forEach(t => {
      t.solo = (t.id === trackId);
      if (t.id === trackId) {
        t.muted = false;
      }
    });
    this.updateSynthTrackVolumes();
    this.notifyTracks();
  }

  public clearAllSolo(): void {
    this.tracks.forEach(t => {
      t.solo = false;
    });
    this.updateSynthTrackVolumes();
    this.notifyTracks();
  }

  /**
   * Tempo / BPM & Speed multiplier
   */
  public setBpm(newBpm: number): void {
    this.bpm = Math.max(30, Math.min(260, newBpm));
    if (this.state === 'playing') {
      const currentStep = this.currentStepIndex;
      this.pauseInternal();
      this.jumpToStep(currentStep);
    }
    this.notifyBpm();
  }

  public setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = Math.max(0.25, Math.min(2.5, multiplier));
    if (this.state === 'playing') {
      const currentStep = this.currentStepIndex;
      this.pauseInternal();
      this.jumpToStep(currentStep);
    }
    this.notifyBpm();
  }

  public setMetronome(enabled: boolean): void {
    this.isMetronomeEnabled = enabled;
    if (this.isMetronomeEnabled && this.state === 'playing') {
      const currentStep = this.currentStep;
      if (currentStep) {
        const bIdx = this.beats.findIndex(b => b.quarterTimestamp >= currentStep.timestampQuarter);
        this.nextBeatToSchedule = (bIdx !== -1) ? bIdx : this.beats.length;
      }
    }
  }

  public get totalMeasures(): number {
    return this.metadata?.totalMeasures || this.osmd?.Sheet?.SourceMeasures?.length || 1;
  }

  public setLoop(enabled: boolean, startMeasure?: number, endMeasure?: number): void {
    this.loopEnabled = enabled;
    if (startMeasure !== undefined) this.loopStartMeasure = Math.max(1, startMeasure);
    if (endMeasure !== undefined) this.loopEndMeasure = Math.max(this.loopStartMeasure, endMeasure);

    if (this.loopEnabled) {
      const currentStep = this.currentStep;
      if (!currentStep || currentStep.measureNumber < this.loopStartMeasure || currentStep.measureNumber > this.loopEndMeasure) {
        const startStepIdx = this.findStepForLoopStart(this.loopStartMeasure, this.loopEndMeasure);
        this.jumpToStep(startStepIdx);
      }
    }
    this.notifyLoop();
  }

  public adjustLoop(startDelta: number, endDelta: number): void {
    const total = this.totalMeasures;
    let newStart = this.loopStartMeasure + startDelta;
    let newEnd = this.loopEndMeasure + endDelta;

    newStart = Math.max(1, Math.min(total, newStart));
    newEnd = Math.max(1, Math.min(total, newEnd));

    // Ist Anfang hinter Endtakt, wird Endtakt automatisch auf Anfangstakt + 1 gesetzt.
    // Sonderfälle für ersten und letzten Takt
    if (startDelta !== 0 && newStart >= newEnd) {
      newEnd = newStart + 1;
      if (newEnd > total) {
        newEnd = total;
        newStart = Math.max(1, total - 1);
      }
    } else if (endDelta !== 0 && newEnd <= newStart) {
      newStart = newEnd - 1;
      if (newStart < 1) {
        newStart = 1;
        newEnd = Math.min(total, 2);
      }
    }

    this.setLoop(true, newStart, newEnd);
  }
}

export const globalPlaybackController = new PlaybackController();
