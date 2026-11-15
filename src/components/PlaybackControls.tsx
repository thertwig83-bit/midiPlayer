import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  Repeat, 
  Clock, 
  ChevronLeft,
  ChevronRight,
  Gauge,
  Crosshair,
  Minus,
  Plus,
  X
} from 'lucide-react';
import { globalPlaybackController, PlaybackState, LoopPickingMode, CountInBeat } from '../audio/PlaybackController';
import { ScoreStep } from '../types/music';

interface PlaybackControlsProps {
  playbackState: PlaybackState;
  currentStep: ScoreStep | null;
  currentMeasure: number;
  totalMeasures: number;
  progress: number;
  bpm: number;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  playbackState,
  currentStep,
  currentMeasure,
  totalMeasures,
  progress,
  bpm,
}) => {
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0);
  const [isMetronome, setIsMetronome] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(globalPlaybackController.isLoopEnabled);
  const [loopStart, setLoopStart] = useState<number>(globalPlaybackController.loopStart);
  const [loopEnd, setLoopEnd] = useState<number>(globalPlaybackController.loopEnd);
  const [pickingMode, setPickingMode] = useState<LoopPickingMode>(globalPlaybackController.loopPicking);
  const [countIn, setCountIn] = useState<number>(globalPlaybackController.countIn);
  const [countInBeat, setCountInBeat] = useState<CountInBeat | null>(null);

  useEffect(() => {
    const unsub = globalPlaybackController.addListener({
      onLoopChange: (enabled, start, end, mode) => {
        setIsLooping(enabled);
        setLoopStart(start);
        setLoopEnd(end);
        setPickingMode(mode);
      },
      onCountInBeat: (info) => {
        setCountInBeat(info);
      },
      onCountInSettingChange: (val) => {
        setCountIn(val);
      },
    });
    return unsub;
  }, []);

  const handlePlayPause = () => {
    if (playbackState === 'playing' || playbackState === 'counting_in') {
      globalPlaybackController.pause();
    } else {
      globalPlaybackController.play();
    }
  };

  const handleStop = () => {
    globalPlaybackController.stop();
  };

  const handleCycleCountIn = () => {
    const next = (countIn + 1) % 4; // Cycles: 0 -> 1 -> 2 -> 3 -> 0
    setCountIn(next);
    globalPlaybackController.setCountIn(next);
  };

  const handleBpmChange = (newBpm: number) => {
    globalPlaybackController.setBpm(newBpm);
  };

  const handleSpeedChange = (mult: number) => {
    setSpeedMultiplier(mult);
    globalPlaybackController.setSpeedMultiplier(mult);
  };

  const handleToggleMetronome = () => {
    const next = !isMetronome;
    setIsMetronome(next);
    globalPlaybackController.setMetronome(next);
  };

  const handleToggleLoop = () => {
    const next = !isLooping;
    setIsLooping(next);
    if (!next) {
      globalPlaybackController.setLoop(false);
      globalPlaybackController.setLoopPickingMode(null);
    } else {
      globalPlaybackController.setLoop(true, loopStart, loopEnd);
    }
  };

  const handlePickStart = () => {
    const nextMode = pickingMode === 'start' ? null : 'start';
    globalPlaybackController.setLoopPickingMode(nextMode);
  };

  const handlePickEnd = () => {
    const nextMode = pickingMode === 'end' ? null : 'end';
    globalPlaybackController.setLoopPickingMode(nextMode);
  };

  const handlePreviousMeasure = () => {
    const target = Math.max(1, currentMeasure - 1);
    globalPlaybackController.jumpToMeasure(target);
  };

  const handleNextMeasure = () => {
    const target = Math.min(totalMeasures, currentMeasure + 1);
    globalPlaybackController.jumpToMeasure(target);
  };

  // Format MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const currentTimeSec = currentStep ? currentStep.timeSeconds : 0;

  return (
    <div className="print:hidden bg-white border-t border-slate-300 shadow-2xl px-4 py-3 z-30 select-none">
      {/* Progress Line */}
      <div className="relative w-full h-2 bg-slate-200 rounded-full mb-3 overflow-hidden cursor-pointer">
        <div 
          className="h-full bg-blue-600 rounded-full transition-all duration-100 ease-linear shadow-xs"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: Position & Measure Info */}
        <div className="flex items-center gap-3 min-w-[170px]">
          <div className="bg-slate-100 px-3.5 py-1.5 rounded-xl border border-slate-300 shadow-2xs">
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              {playbackState === 'counting_in' ? 'Vorklick' : 'Takt'}
            </div>
            <div className="text-lg font-black text-slate-900 font-mono leading-tight">
              {playbackState === 'counting_in' && countInBeat ? (
                <span className="text-amber-600 animate-pulse">
                  Schlag {countInBeat.beat} <span className="text-xs text-slate-500 font-normal">({countInBeat.measure}/{countInBeat.totalMeasures}T)</span>
                </span>
              ) : (
                <>
                  {currentMeasure} <span className="text-xs text-slate-500 font-normal">/ {totalMeasures || 1}</span>
                </>
              )}
            </div>
          </div>

          <div className="text-xs font-mono font-semibold text-slate-700 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>{formatTime(currentTimeSec)}</span>
            </div>
          </div>
        </div>

        {/* Center: Main Playback Controls */}
        <div className="flex items-center gap-2">
          {/* Previous Measure */}
          <button
            onClick={handlePreviousMeasure}
            title="Vorheriger Takt"
            className="p-2 text-slate-700 hover:bg-slate-100 hover:text-blue-600 rounded-full transition active:scale-95"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Stop Button */}
          <button
            onClick={handleStop}
            title="Wiedergabe stoppen und zum Anfang zurückkehren"
            className="p-2.5 text-slate-700 hover:bg-slate-100 hover:text-red-600 rounded-full transition active:scale-95"
          >
            <Square className="w-5 h-5 fill-current" />
          </button>

          {/* Big Play / Pause / Count-in Button */}
          <button
            onClick={handlePlayPause}
            title={
              playbackState === 'playing'
                ? 'Pause'
                : playbackState === 'counting_in'
                ? 'Vorklick abbrechen'
                : 'Wiedergabe starten'
            }
            className={`w-14 h-14 ${
              playbackState === 'counting_in'
                ? 'bg-amber-500 hover:bg-amber-600 animate-pulse'
                : 'bg-blue-600 hover:bg-blue-700'
            } active:scale-95 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30 transition cursor-pointer`}
          >
            {playbackState === 'playing' ? (
              <Pause className="w-7 h-7 fill-current" />
            ) : playbackState === 'counting_in' ? (
              <div className="flex flex-col items-center justify-center">
                <span className="text-xl font-black font-mono leading-none">
                  {countInBeat ? countInBeat.beat : '…'}
                </span>
                <span className="text-[9px] uppercase font-bold tracking-tight opacity-90 mt-0.5">
                  {countInBeat ? `${countInBeat.measure}/${countInBeat.totalMeasures}` : 'Vor'}
                </span>
              </div>
            ) : (
              <Play className="w-7 h-7 fill-current ml-0.5" />
            )}
          </button>

          {/* Next Measure */}
          <button
            onClick={handleNextMeasure}
            title="Nächster Takt"
            className="p-2 text-slate-700 hover:bg-slate-100 hover:text-blue-600 rounded-full transition active:scale-95"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Metronome Toggle */}
          <button
            onClick={handleToggleMetronome}
            title="Metronom (Klick im Takt)"
            className={`p-2.5 rounded-xl transition text-xs font-bold flex items-center gap-1 ml-2 ${
              isMetronome
                ? 'bg-blue-100 text-blue-700 border border-blue-400 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 border border-transparent'
            }`}
          >
            <span>Klick</span>
          </button>

          {/* Pre-roll / Count-in Toggle (0-3 measures) */}
          <button
            onClick={handleCycleCountIn}
            title={`Vorklick vor Beginn (${countIn === 0 ? 'Aus' : `${countIn} Takt${countIn > 1 ? 'e' : ''}`}) - Klicken zum Umschalten (0 bis 3 Takte)`}
            className={`p-2.5 rounded-xl transition text-xs font-bold flex items-center gap-1.5 ${
              countIn > 0
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-400 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 border border-transparent'
            }`}
          >
            <span>Vorklick: {countIn === 0 ? 'Aus' : `${countIn}T`}</span>
          </button>

          {/* A-B Loop Toggle */}
          <button
            onClick={handleToggleLoop}
            title="Schleife (Takt-Bereich wiederholen)"
            className={`p-2.5 rounded-xl transition text-xs font-bold flex items-center gap-1 ${
              isLooping
                ? 'bg-amber-100 text-amber-800 border border-amber-400 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 border border-transparent'
            }`}
          >
            <Repeat className="w-4 h-4" />
            <span>Loop</span>
          </button>
        </div>

        {/* Right: Tempo (BPM & Speed multipliers) */}
        <div className="flex items-center gap-3">
          {/* Quick Speed multipliers for practice */}
          <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
            {[0.75, 1.0, 1.25].map((mult) => (
              <button
                key={mult}
                onClick={() => handleSpeedChange(mult)}
                className={`px-2.5 py-1 rounded-md transition ${
                  speedMultiplier === mult
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                {mult}x
              </button>
            ))}
          </div>

          {/* BPM display & slider */}
          <div className="flex items-center gap-2 bg-slate-100 px-3.5 py-1.5 rounded-xl border border-slate-300">
            <Gauge className="w-4 h-4 text-slate-500" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase font-bold leading-none">
                Tempo
              </span>
              <span className="font-mono font-black text-sm text-slate-900 leading-none mt-0.5">
                {Math.round(bpm * speedMultiplier)} <span className="text-[10px] font-normal text-slate-500">BPM</span>
              </span>
            </div>
            <input
              type="range"
              min="40"
              max="200"
              value={bpm}
              onChange={(e) => handleBpmChange(parseInt(e.target.value))}
              className="w-16 sm:w-20 h-2 ml-1 bg-slate-300 rounded appearance-none cursor-pointer accent-blue-600"
              title={`Tempo anpassen (${bpm} BPM)`}
            />
          </div>
        </div>
      </div>

      {/* Exercise Loop Drawer (Übungsschleife) */}
      {isLooping && (
        <div className="mt-3 pt-2.5 border-t border-slate-200 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs text-slate-800 animate-fadeIn">
          <div className="flex items-center gap-1.5 font-bold text-amber-800">
            <Repeat className="w-4 h-4 text-amber-600" />
            <span>Übungsschleife:</span>
          </div>

          {/* Anfangstakt Button & +/- */}
          <div className="flex items-center gap-1 bg-amber-50/80 p-1 rounded-xl border border-amber-300">
            <button
              onClick={handlePickStart}
              title="Klicken, um den nächsten Klick in den Noten als Anfangstakt zu übernehmen"
              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-2xs ${
                pickingMode === 'start'
                  ? 'bg-amber-600 text-white animate-pulse ring-2 ring-amber-400 ring-offset-1'
                  : 'bg-white hover:bg-amber-100/70 text-slate-900 border border-amber-300'
              }`}
            >
              <Crosshair className={`w-3.5 h-3.5 ${pickingMode === 'start' ? 'animate-spin' : 'text-amber-700'}`} />
              <span>
                {pickingMode === 'start' ? 'Takt in Noten antippen...' : `Anfang: Takt ${loopStart}`}
              </span>
            </button>

            {/* Stepper buttons for touch */}
            <div className="flex items-center">
              <button
                onClick={() => globalPlaybackController.adjustLoop(-1, 0)}
                title="Anfangstakt -1"
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-amber-200 text-amber-900 font-black text-xs active:scale-90 transition cursor-pointer"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                onClick={() => globalPlaybackController.adjustLoop(1, 0)}
                title="Anfangstakt +1"
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-amber-200 text-amber-900 font-black text-xs active:scale-90 transition cursor-pointer"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          <span className="font-semibold text-slate-500 text-xs">bis</span>

          {/* Endtakt Button & +/- */}
          <div className="flex items-center gap-1 bg-amber-50/80 p-1 rounded-xl border border-amber-300">
            <button
              onClick={handlePickEnd}
              title="Klicken, um den nächsten Klick in den Noten als Endtakt zu übernehmen"
              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-2xs ${
                pickingMode === 'end'
                  ? 'bg-amber-600 text-white animate-pulse ring-2 ring-amber-400 ring-offset-1'
                  : 'bg-white hover:bg-amber-100/70 text-slate-900 border border-amber-300'
              }`}
            >
              <Crosshair className={`w-3.5 h-3.5 ${pickingMode === 'end' ? 'animate-spin' : 'text-amber-700'}`} />
              <span>
                {pickingMode === 'end' ? 'Takt in Noten antippen...' : `Ende: Takt ${loopEnd}`}
              </span>
            </button>

            {/* Stepper buttons */}
            <div className="flex items-center">
              <button
                onClick={() => globalPlaybackController.adjustLoop(0, -1)}
                title="Endtakt -1"
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-amber-200 text-amber-900 font-black text-xs active:scale-90 transition cursor-pointer"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                onClick={() => globalPlaybackController.adjustLoop(0, 1)}
                title="Endtakt +1"
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-amber-200 text-amber-900 font-black text-xs active:scale-90 transition cursor-pointer"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Cancel button if picking active */}
          {pickingMode && (
            <button
              onClick={() => globalPlaybackController.setLoopPickingMode(null)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer shadow-2xs"
              title="Auswahl abbrechen"
            >
              <X className="w-3.5 h-3.5" />
              <span>Abbrechen</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
