export interface TrackVoice {
  id: string; // unique ID: instrumentId_voiceId
  instrumentIndex: number;
  voiceIndex: number;
  voiceId: number;
  name: string;
  instrumentName: string;
  volume: number; // 0.0 - 1.0
  muted: boolean;
  solo: boolean;
  soundType: SoundType;
}

export type SoundType = 
  | 'piano' 
  | 'strings' 
  | 'organ' 
  | 'flute' 
  | 'brass' 
  | 'choir' 
  | 'acoustic_bass';

export interface NoteEvent {
  midiNote: number; // 60 = C4
  pitchName: string; // e.g. "C4"
  duration: number; // duration in seconds
  volume: number; // 0.0 - 1.0
  trackId: string;
  isRest: boolean;
  isTied: boolean;
}

export interface ScoreStep {
  stepIndex: number;
  measureIndex: number;
  measureNumber: number;
  timestampQuarter: number; // quarter notes from start
  timeSeconds: number; // time in seconds based on bpm
  notes: NoteEvent[];
  // Bounding box for visual click mapping
  visualBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
    page: number;
  };
}

export interface ScoreMetadata {
  title: string;
  composer: string;
  tempoBpm: number;
  timeSignature: string;
  totalMeasures: number;
  tracks: TrackVoice[];
}
