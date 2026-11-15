import React, { useState, useEffect } from 'react';
import { ScoreViewer } from './components/ScoreViewer';
import { TrackList } from './components/TrackList';
import { PlaybackControls } from './components/PlaybackControls';
import { ScoreLoader } from './components/ScoreLoader';
import { globalPlaybackController, PlaybackState } from './audio/PlaybackController';
import { ScoreStep, TrackVoice, ScoreMetadata } from './types/music';
import { SAMPLE_SCORES } from './samples';
import { 
  FolderOpen, 
  Layers, 
  Music2, 
  HelpCircle
} from 'lucide-react';

export const App: React.FC = () => {
  // Score & playback state
  const [currentScoreData, setCurrentScoreData] = useState<string | ArrayBuffer | null>(null);
  const [scoreTitle, setScoreTitle] = useState<string>('Ode an die Freude');
  const [metadata, setMetadata] = useState<ScoreMetadata | null>(null);
  const [tracks, setTracks] = useState<TrackVoice[]>([]);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('stopped');
  const [currentStep, setCurrentStep] = useState<ScoreStep | null>(null);
  const [currentMeasure, setCurrentMeasure] = useState<number>(1);
  const [progress, setProgress] = useState<number>(0);
  const [bpm, setBpm] = useState<number>(112);
  const [fingeringEligible, setFingeringEligible] = useState<string[]>([]);
  const [fingeringTrackIds, setFingeringTrackIds] = useState<string[]>([]);

  // UI state
  const [isLoaderOpen, setIsLoaderOpen] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // Load default sample score on first launch
  useEffect(() => {
    if (SAMPLE_SCORES.length > 0) {
      setCurrentScoreData(SAMPLE_SCORES[0].xml);
      setScoreTitle(SAMPLE_SCORES[0].title);
    }
  }, []);

  // Subscribe to PlaybackController events
  useEffect(() => {
    const unsubscribe = globalPlaybackController.addListener({
      onStateChange: (newState) => {
        setPlaybackState(newState);
      },
      onStepChange: (step, measure, prog) => {
        setCurrentStep(step);
        setCurrentMeasure(measure);
        setProgress(prog);
      },
      onTracksChange: (newTracks) => {
        setTracks(newTracks);
      },
      onBpmChange: (newBpm) => {
        setBpm(newBpm);
      },
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleScoreLoaded = () => {
    const meta = globalPlaybackController.currentMetadata;
    if (meta) {
      setMetadata(meta);
      setTracks(meta.tracks);
      setBpm(meta.tempoBpm);
    }
  };

  const handleSelectScore = (data: string | ArrayBuffer, title: string) => {
    globalPlaybackController.stop();
    setFingeringTrackIds([]);
    setFingeringEligible([]);
    setScoreTitle(title);
    setCurrentScoreData(data);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-100 text-slate-900 overflow-hidden font-sans">
      {/* Top Navigation Bar */}
      <header className="print:hidden h-14 bg-white border-b border-slate-300 px-4 flex items-center justify-between z-20 shrink-0 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Music2 className="w-5 h-5" />
            </div>
            <span className="font-black text-base hidden sm:inline tracking-tight text-slate-900">
              Partitur<span className="text-blue-600">Player</span>
            </span>
          </div>

          <div className="h-5 w-[1px] bg-slate-300 hidden sm:block" />

          {/* Current Score Title */}
          <div className="min-w-0">
            <h1 className="font-extrabold text-sm sm:text-base text-slate-900 truncate max-w-[200px] sm:max-w-xs md:max-w-md">
              {scoreTitle}
            </h1>
            {metadata?.composer && (
              <p className="text-xs text-slate-500 font-medium truncate hidden sm:block">
                {metadata.composer}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Open Score Dialog */}
          <button
            onClick={() => setIsLoaderOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold border border-blue-200 transition shadow-xs cursor-pointer"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Datei öffnen</span>
          </button>

          {/* Toggle Tracks Sidebar */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
              isSidebarOpen
                ? 'bg-slate-900 text-white border-transparent shadow-xs'
                : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
            }`}
            title="Stimmen und Spuren ein-/ausblenden"
          >
            <Layers className="w-4 h-4" />
            <span className="hidden md:inline">Stimmen</span>
          </button>

          {/* Help Info */}
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            title="Kurzanleitung"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Area: Score Viewer + Side Panel */}
      <div className="flex-1 flex overflow-hidden relative print:overflow-visible">
        {/* Score Display (with tap to seek) */}
        <ScoreViewer
          scoreData={currentScoreData}
          onScoreLoaded={handleScoreLoaded}
          onError={(msg) => console.error(msg)}
          fingeringTrackIds={fingeringTrackIds}
          onFingeringEligible={setFingeringEligible}
        />

        {/* Tracks / Voices Sidebar */}
        {isSidebarOpen && (
          <div className="print:hidden absolute right-0 top-0 bottom-0 sm:relative w-full sm:w-auto h-full z-20">
            <TrackList
              tracks={tracks}
              fingeringEligible={fingeringEligible}
              fingeringTrackIds={fingeringTrackIds}
              onToggleFingering={(id) =>
                setFingeringTrackIds((prev) =>
                  prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                )
              }
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
            />
          </div>
        )}
      </div>

      {/* Bottom Practice & Playback Controls */}
      <PlaybackControls
        playbackState={playbackState}
        currentStep={currentStep}
        currentMeasure={currentMeasure}
        totalMeasures={metadata?.totalMeasures || 1}
        progress={progress}
        bpm={bpm}
      />

      {/* File Loader Modal */}
      <ScoreLoader
        isOpen={isLoaderOpen}
        onClose={() => setIsLoaderOpen(false)}
        onSelectScore={handleSelectScore}
      />

      {/* Quick Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 shadow-2xl border border-slate-300 max-w-md w-full">
            <h3 className="font-bold text-base mb-3 flex items-center gap-2 text-slate-900">
              <HelpCircle className="w-5 h-5 text-blue-600" />
              Tipps für das Üben mit der App
            </h3>
            <ul className="space-y-3 text-xs text-slate-700 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600">1.</span>
                <span><strong>Tippen zum Springen:</strong> Tippe an eine beliebige Stelle in der Partitur. Die rote Positionslinie und der Audio-Startpunkt springen direkt dorthin.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600">2.</span>
                <span><strong>Solo-Modus:</strong> Klicke bei einer Stimme (z.B. Sopran oder Alt) auf <em>Solo</em>, um sie isoliert zu üben. Klicke erneut darauf, um Solo wieder aufzuheben.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600">3.</span>
                <span><strong>Auswahl & Lautstärke:</strong> Mit den Häkchen können beliebige Stimmen ein- oder ausgeschaltet werden. Mit dem Schieberegler kannst du die Lautstärke jeder Stimme anpassen.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600">4.</span>
                <span><strong>Loop (Wiederholung):</strong> Aktiviere <em>Loop</em>, um schwierige Takte automatisch in einer Schleife zu üben.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600">5.</span>
                <span><strong>Tablet & Laptop:</strong> Funktioniert komplett offline. Auf dem Android-Tablet über das Menü „Zum Startbildschirm hinzufügen“ installieren.</span>
              </li>
            </ul>
            <button
              onClick={() => setShowHelp(false)}
              className="mt-5 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-md cursor-pointer"
            >
              Verstanden
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default App;
