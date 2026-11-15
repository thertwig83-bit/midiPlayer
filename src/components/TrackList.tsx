import React from 'react';
import { TrackVoice, SoundType } from '../types/music';
import { globalPlaybackController } from '../audio/PlaybackController';
import { 
  Volume2, 
  VolumeX, 
  Music, 
  CheckSquare2, 
  Square,
  Sparkles,
  SlidersHorizontal
} from 'lucide-react';

interface TrackListProps {
  tracks: TrackVoice[];
  /** Track ids that are inside the violin range (fingering available) */
  fingeringEligible?: string[];
  /** Track ids with fingering currently shown */
  fingeringTrackIds?: string[];
  onToggleFingering?: (trackId: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const SOUND_OPTIONS: { type: SoundType; label: string }[] = [
  { type: 'piano', label: 'Klavier' },
  { type: 'choir', label: 'Chor / Gesang' },
  { type: 'strings', label: 'Streicher' },
  { type: 'organ', label: 'Orgel' },
  { type: 'flute', label: 'Flöte' },
  { type: 'brass', label: 'Bläser' },
  { type: 'acoustic_bass', label: 'Bass' },
];

export const TrackList: React.FC<TrackListProps> = ({
  tracks,
  fingeringEligible = [],
  fingeringTrackIds = [],
  onToggleFingering,
}) => {
  const hasSolo = tracks.some(t => t.solo);

  const handleToggleMute = (track: TrackVoice) => {
    globalPlaybackController.setVoiceMuted(track.id, !track.muted);
  };

  const handleToggleSolo = (track: TrackVoice) => {
    if (track.solo) {
      // Toggle off solo
      globalPlaybackController.clearAllSolo();
    } else {
      // Isolate this single track
      globalPlaybackController.isolateSingleVoice(track.id);
    }
  };

  const handleVolumeChange = (trackId: string, val: number) => {
    globalPlaybackController.setVoiceVolume(trackId, val / 100);
  };

  const handleSoundChange = (trackId: string, sound: SoundType) => {
    globalPlaybackController.setVoiceSoundType(trackId, sound);
  };

  const handleAllActive = (active: boolean) => {
    globalPlaybackController.setAllVoicesActive(active);
  };

  const handleClearSolo = () => {
    globalPlaybackController.clearAllSolo();
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-300 w-full sm:w-80 md:w-96 shadow-xl z-20 select-none">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-blue-600" />
            <h2 className="font-extrabold text-base text-slate-900">
              Stimmen ({tracks.length})
            </h2>
          </div>
          {hasSolo && (
            <button
              onClick={handleClearSolo}
              className="text-xs px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg shadow-sm flex items-center gap-1 transition"
              title="Solo-Modus beenden"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Solo aufheben
            </button>
          )}
        </div>

        {/* Batch actions */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            onClick={() => handleAllActive(true)}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white hover:bg-blue-50 border border-slate-300 hover:border-blue-300 rounded-lg text-slate-800 font-semibold shadow-2xs transition"
          >
            <CheckSquare2 className="w-3.5 h-3.5 text-blue-600" />
            Alle Stimmen an
          </button>
          <button
            onClick={() => handleAllActive(false)}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white hover:bg-red-50 border border-slate-300 hover:border-red-300 rounded-lg text-slate-700 font-semibold shadow-2xs transition"
          >
            <Square className="w-3.5 h-3.5 text-slate-400" />
            Alle stumm
          </button>
        </div>
      </div>

      {/* Voice Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-100">
        {tracks.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            Keine Partitur geladen.
          </div>
        ) : (
          tracks.map((track) => {
            // Audibility check
            const isAudible = hasSolo ? (track.solo && !track.muted) : !track.muted;
            const isMutedBySolo = hasSolo && !track.solo;

            return (
              <div
                key={track.id}
                className={`p-3.5 rounded-xl border transition-all bg-white ${
                  track.solo
                    ? 'border-amber-500 ring-2 ring-amber-300 shadow-md'
                    : isAudible
                    ? 'border-slate-300 shadow-2xs hover:border-slate-400'
                    : 'border-slate-200 opacity-60 shadow-none'
                }`}
              >
                {/* Track Row: Checkbox, Name, Status & Solo Button */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Checkbox for selection */}
                    <button
                      onClick={() => handleToggleMute(track)}
                      className="p-0.5 rounded text-slate-700 hover:text-blue-600 transition"
                      title={track.muted ? 'Stimme aktivieren' : 'Stimme stummschalten'}
                    >
                      {track.muted ? (
                        <Square className="w-5 h-5 text-slate-400" />
                      ) : (
                        <CheckSquare2 className="w-5 h-5 text-blue-600" />
                      )}
                    </button>

                    <span 
                      className={`font-bold text-sm truncate cursor-pointer ${
                        track.muted || isMutedBySolo ? 'text-slate-500 line-through' : 'text-slate-900'
                      }`}
                      title={track.name}
                      onClick={() => handleToggleSolo(track)}
                    >
                      {track.name}
                    </span>
                  </div>

                  {/* Solo Button */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleToggleSolo(track)}
                      className={`px-3 py-1 text-xs font-black rounded-lg uppercase tracking-wide transition shadow-2xs ${
                        track.solo
                          ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                          : 'bg-slate-200 hover:bg-amber-100 hover:text-amber-900 text-slate-700'
                      }`}
                      title="Solo: Diese Stimme als einzige abspielen"
                    >
                      {track.solo ? '★ SOLO' : 'Solo'}
                    </button>
                  </div>
                </div>

                {/* Secondary controls: Volume & Instrument */}
                <div className="flex items-center gap-3 pt-1 text-xs border-t border-slate-100">
                  {/* Volume Slider */}
                  <div className="flex-1 flex items-center gap-2">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={Math.round(track.volume * 100)}
                      onChange={(e) => handleVolumeChange(track.id, parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      title={`Lautstärke: ${Math.round(track.volume * 100)}%`}
                    />
                    <span className="w-9 text-right font-mono font-semibold text-[11px] text-slate-600">
                      {Math.round(track.volume * 100)}%
                    </span>
                  </div>

                  {/* Instrument Selector */}
                  <div className="w-28 shrink-0">
                    <select
                      value={track.soundType}
                      onChange={(e) => handleSoundChange(track.id, e.target.value as SoundType)}
                      className="w-full py-1 px-1.5 bg-white border border-slate-300 rounded-md text-[11px] font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    >
                      {SOUND_OPTIONS.map((opt) => (
                        <option key={opt.type} value={opt.type}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Violin fingering toggle (only for voices inside the violin range) */}
                {fingeringEligible.includes(track.id) && (
                  <label className="flex items-center gap-2 mt-2.5 pt-2 text-xs border-t border-slate-100 cursor-pointer text-slate-700 font-medium">
                    <input
                      type="checkbox"
                      checked={fingeringTrackIds.includes(track.id)}
                      onChange={() => onToggleFingering?.(track.id)}
                      className="w-4 h-4 accent-blue-600 cursor-pointer"
                    />
                    Fingersatz (Violine)
                  </label>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 text-center font-medium">
        Tipp: Haken setzen zur Auswahl oder <strong>Solo</strong> für Einzeltraining.
      </div>
    </div>
  );
};
