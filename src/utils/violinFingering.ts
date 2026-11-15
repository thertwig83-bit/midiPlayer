import type { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';

/**
 * Automatic violin fingering.
 *
 * - Strings: G3 (55), D4 (62), A4 (69), E5 (76)
 * - Fingers: 0 (open), 1-4, positions 1..9
 * - Lowered finger ("tief") is marked with ↓, raised finger ("hoch") with ↑
 * - Label: string letter + finger, e.g. "A1", "D2↓", "E0"
 */

const OPEN_STRINGS = [55, 62, 69, 76];
const STRING_NAMES = ['G', 'D', 'A', 'E'];

/** Offset (semitones above the open string) of the 1st finger per position (1..9). */
const POSITION_BASE = [2, 4, 5, 7, 9, 11, 12, 14, 16];

/** Finger offsets relative to the position base: natural and varied (lowered / raised) placement. */
const FINGER_PATTERN: { finger: number; delta: number; arrow: '' | '↓' | '↑' }[] = [
  { finger: 1, delta: -1, arrow: '↓' },
  { finger: 1, delta: 0, arrow: '' },
  { finger: 2, delta: 1, arrow: '↓' },
  { finger: 2, delta: 2, arrow: '' },
  { finger: 3, delta: 3, arrow: '' },
  { finger: 3, delta: 4, arrow: '↑' },
  { finger: 4, delta: 5, arrow: '' },
  { finger: 4, delta: 6, arrow: '↑' },
];

/** Playable range used to decide whether a voice is a "violin voice". */
export const VIOLIN_MIN_MIDI = 55; // G3
export const VIOLIN_MAX_MIDI = 96; // C7

interface Candidate {
  string: number;
  position: number;
  finger: number;
  arrow: '' | '↓' | '↑';
  cost: number;
}

function candidatesFor(midi: number): Candidate[] {
  const result: Candidate[] = [];
  for (let s = 0; s < OPEN_STRINGS.length; s++) {
    const offset = midi - OPEN_STRINGS[s];
    if (offset < 0) continue;
    for (let p = 0; p < POSITION_BASE.length; p++) {
      const positionCost = p * 0.6;
      if (offset === 0) {
        // open string is available independent of the position
        result.push({ string: s, position: p, finger: 0, arrow: '', cost: positionCost + 0.2 });
        continue;
      }
      for (const f of FINGER_PATTERN) {
        if (POSITION_BASE[p] + f.delta !== offset) continue;
        result.push({
          string: s,
          position: p,
          finger: f.finger,
          arrow: f.arrow,
          cost: positionCost + (f.arrow ? 0.5 : 0) + (f.finger === 4 && s < 3 && midi === OPEN_STRINGS[s + 1] ? 0.6 : 0),
        });
      }
    }
  }
  return result;
}

function transitionCost(a: Candidate, b: Candidate, samePitch: boolean): number {
  let cost = Math.abs(a.position - b.position) * 1.5;
  if (a.string !== b.string) cost += 0.3;
  if (samePitch) {
    if (a.string !== b.string || a.finger !== b.finger || a.position !== b.position) cost += 2;
  } else if (a.string === b.string && a.position === b.position && a.finger === b.finger && b.finger > 0) {
    // same finger on same string for a different pitch needs a slide
    cost += 4;
  }
  return cost;
}

export interface FingeringResult {
  text: string;
}

/** Computes fingerings for a monophonic sequence of MIDI pitches (dynamic programming). */
export function computeFingerings(pitches: number[]): (FingeringResult | null)[] {
  const result: (FingeringResult | null)[] = new Array(pitches.length).fill(null);
  const cands = pitches.map(candidatesFor);

  // Process contiguous runs of playable notes
  let i = 0;
  while (i < pitches.length) {
    if (cands[i].length === 0) {
      i++;
      continue;
    }
    let j = i;
    while (j < pitches.length && cands[j].length > 0) j++;

    const n = j - i;
    const best: number[][] = [];
    const prev: number[][] = [];
    for (let k = 0; k < n; k++) {
      const cs = cands[i + k];
      best.push(new Array(cs.length).fill(Infinity));
      prev.push(new Array(cs.length).fill(-1));
      for (let c = 0; c < cs.length; c++) {
        if (k === 0) {
          best[k][c] = cs[c].cost;
          continue;
        }
        const ps = cands[i + k - 1];
        const samePitch = pitches[i + k] === pitches[i + k - 1];
        for (let q = 0; q < ps.length; q++) {
          const v = best[k - 1][q] + transitionCost(ps[q], cs[c], samePitch) + cs[c].cost;
          if (v < best[k][c]) {
            best[k][c] = v;
            prev[k][c] = q;
          }
        }
      }
    }
    let idx = 0;
    for (let c = 1; c < best[n - 1].length; c++) {
      if (best[n - 1][c] < best[n - 1][idx]) idx = c;
    }
    for (let k = n - 1; k >= 0; k--) {
      const cand = cands[i + k][idx];
      result[i + k] = { text: `${STRING_NAMES[cand.string]}${cand.finger}${cand.arrow}` };
      idx = prev[k][idx];
    }
    i = j;
  }
  return result;
}

function noteMidi(note: any): number | null {
  const pitch = note?.Pitch;
  if (!pitch) return null;
  // OSMD octave is relative to MusicXML octave (xml = octave + 3); MIDI C4 = 60
  return 12 * (pitch.Octave + 4) + pitch.FundamentalNote + pitch.AccidentalHalfTones;
}

interface VoiceNote {
  voiceEntry: any;
  note: any;
  midi: number;
}

function collectVoiceNotes(voice: any): { notes: VoiceNote[]; hasAnyNote: boolean } {
  const notes: VoiceNote[] = [];
  let hasAnyNote = false;
  for (const ve of voice.VoiceEntries) {
    if (ve.IsGrace) continue;
    const real = ve.Notes.filter((n: any) => !n.isRest());
    if (real.length === 0) continue;
    hasAnyNote = true;
    if (real.length !== 1) continue; // chords: no fingering
    const note = real[0];
    const tie = note.NoteTie;
    if (tie && tie.StartNote !== note) continue; // tied continuation
    const midi = noteMidi(note);
    if (midi === null) continue;
    notes.push({ voiceEntry: ve, note, midi });
  }
  return { notes, hasAnyNote };
}

function allMidi(voice: any): number[] {
  const list: number[] = [];
  for (const ve of voice.VoiceEntries) {
    if (ve.IsGrace) continue;
    for (const n of ve.Notes) {
      if (n.isRest()) continue;
      const m = noteMidi(n);
      if (m !== null) list.push(m);
    }
  }
  return list;
}

/** Track ids ("instrumentIndex_voiceId") whose notes all lie within the violin range. */
export function findViolinTrackIds(osmd: OpenSheetMusicDisplay): string[] {
  const ids: string[] = [];
  osmd.Sheet.Instruments.forEach((inst: any, instIdx: number) => {
    for (const voice of inst.Voices) {
      const pitches = allMidi(voice);
      if (pitches.length === 0) continue;
      if (pitches.every(m => m >= VIOLIN_MIN_MIDI && m <= VIOLIN_MAX_MIDI)) {
        ids.push(`${instIdx}_${voice.VoiceId}`);
      }
    }
  });
  return ids;
}

const OWN_MARKER = '__violinFingering';

/** Adds/removes the generated fingerings in the OSMD model (call render() afterwards). */
export function applyFingerings(osmd: OpenSheetMusicDisplay, enabledTrackIds: string[]): void {
  const enabled = new Set(enabledTrackIds);
  osmd.Sheet.Instruments.forEach((inst: any, instIdx: number) => {
    for (const voice of inst.Voices) {
      // remove generated instructions
      for (const ve of voice.VoiceEntries) {
        const list: any[] = ve.TechnicalInstructions;
        for (let k = list.length - 1; k >= 0; k--) {
          if (list[k][OWN_MARKER]) list.splice(k, 1);
        }
      }
      if (!enabled.has(`${instIdx}_${voice.VoiceId}`)) continue;

      const { notes } = collectVoiceNotes(voice);
      const fingerings = computeFingerings(notes.map(n => n.midi));
      notes.forEach((n, k) => {
        const f = fingerings[k];
        if (!f) return;
        n.voiceEntry.TechnicalInstructions.push({
          type: 0, // TechnicalInstructionType.Fingering
          value: f.text,
          placement: 1, // PlacementEnum.Below
          sourceNote: n.note,
          fontFamily: undefined,
          [OWN_MARKER]: true,
        });
      });
    }
  });
}
