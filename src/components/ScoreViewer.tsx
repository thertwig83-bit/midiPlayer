import React, { useEffect, useRef, useState } from 'react';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import { globalPlaybackController, LoopPickingMode } from '../audio/PlaybackController';
import { ZoomIn, ZoomOut, RotateCcw, MousePointerClick, Crosshair } from 'lucide-react';

interface ScoreViewerProps {
  scoreData: string | ArrayBuffer | null;
  onScoreLoaded?: () => void;
  onError?: (err: string) => void;
}

export const ScoreViewer: React.FC<ScoreViewerProps> = ({
  scoreData,
  onScoreLoaded,
  onError,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);
  const [zoom, setZoom] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pickingMode, setPickingMode] = useState<LoopPickingMode>(null);

  useEffect(() => {
    const unsub = globalPlaybackController.addListener({
      onLoopChange: (_enabled, _start, _end, mode) => {
        setPickingMode(mode);
      },
    });
    return unsub;
  }, []);

  // Initialize OSMD on mount
  useEffect(() => {
    if (!containerRef.current) return;

    try {
      const osmd = new OpenSheetMusicDisplay(containerRef.current, {
        autoResize: true,
        backend: 'svg',
        drawTitle: true,
        drawSubtitle: true,
        drawComposer: true,
        drawPartNames: true,
        drawMetronomeMarks: true,
        followCursor: false, // We control smooth viewport auto-scroll ourselves
        coloringMode: 0,
      });

      osmdRef.current = osmd;
    } catch (err: any) {
      console.error('Failed to initialize OSMD:', err);
      setErrorMessage('Fehler bei der Initialisierung der Notenanzeige.');
    }

    return () => {
      if (osmdRef.current) {
        try {
          osmdRef.current.clear();
        } catch (_) {}
      }
    };
  }, []);

  // Load Score data whenever scoreData changes
  useEffect(() => {
    const osmd = osmdRef.current;
    if (!osmd || !scoreData || !containerRef.current) return;

    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);

    const loadAndRender = async () => {
      try {
        const dataToLoad = scoreData instanceof ArrayBuffer ? new Blob([scoreData]) : scoreData;
        await osmd.load(dataToLoad);
        if (!isMounted) return;

        osmd.zoom = zoom;
        osmd.render();

        // Style the cursor element for high visibility on white paper
        if (osmd.cursor && osmd.cursor.cursorElement) {
          const el = osmd.cursor.cursorElement;
          el.style.backgroundColor = '#dc2626'; // Vibrant Red cursor line
          el.style.width = '3.5px';
          el.style.borderRadius = '3px';
          el.style.boxShadow = '0 0 10px rgba(220, 38, 38, 0.85)';
          el.style.zIndex = '100';
          el.style.transition = 'left 0.06s ease-out, top 0.06s ease-out';
        }

        // Initialize playback controller with loaded score
        await globalPlaybackController.loadScore(osmd, containerRef.current!);

        setIsLoading(false);
        onScoreLoaded?.();
      } catch (err: any) {
        console.error('Error loading score:', err);
        if (isMounted) {
          setIsLoading(false);
          const msg = err?.message || 'Die Partitur konnte nicht geladen werden. Bitte Dateiformat überprüfen.';
          setErrorMessage(msg);
          onError?.(msg);
        }
      }
    };

    loadAndRender();

    return () => {
      isMounted = false;
    };
  }, [scoreData]);

  // Handle Zoom change
  const handleZoom = (newZoom: number) => {
    const clamped = Math.max(0.5, Math.min(2.0, newZoom));
    setZoom(clamped);
    const osmd = osmdRef.current;
    if (osmd && containerRef.current) {
      osmd.zoom = clamped;
      osmd.render();
      // Re-index steps with new zoom coordinates
      globalPlaybackController.loadScore(osmd, containerRef.current);
    }
  };

  // Click & Tap on Score to Seek
  const handleScoreClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // 1. Check if an SVG element of a measure was clicked directly
    const targetEl = e.target as Element | null;
    let clickedMeasureIndex: number | null = null;

    if (targetEl) {
      const measureGroup = targetEl.closest('g[id^="osmd-m"]');
      if (measureGroup && measureGroup.id) {
        const match = measureGroup.id.match(/^osmd-m(\d+)/);
        if (match) {
          clickedMeasureIndex = parseInt(match[1], 10);
        }
      }
    }

    // 2. Pass client coordinates and any detected measure index
    globalPlaybackController.seekByMouseClick(e.clientX, e.clientY, clickedMeasureIndex);
  };

  return (
    <div className="relative flex-1 flex flex-col h-full bg-slate-200 overflow-hidden select-none">
      {/* Top Notice & Zoom Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-300 bg-white shadow-xs z-10 text-xs text-slate-700">
        <div className="flex items-center gap-2">
          {pickingMode ? (
            <div className="flex items-center gap-2 bg-amber-500 text-white font-bold px-3 py-1 rounded-full animate-pulse shadow-sm">
              <Crosshair className="w-4 h-4 animate-spin" />
              <span>
                {pickingMode === 'start'
                  ? '👉 Tippe auf den gewünschten Takt für den Schleifen-ANFANG'
                  : '👉 Tippe auf den gewünschten Takt für das Schleifen-ENDE'}
              </span>
            </div>
          ) : (
            <>
              <MousePointerClick className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-slate-800">
                Tippe an einen beliebigen Takt, um dort zu starten
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => handleZoom(zoom - 0.1)}
            title="Verkleinern"
            className="p-1 hover:bg-white text-slate-700 rounded transition"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="w-12 text-center font-mono font-bold text-slate-800">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => handleZoom(zoom + 0.1)}
            title="Vergrößern"
            className="p-1 hover:bg-white text-slate-700 rounded transition"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleZoom(1.0)}
            title="Zoom zurücksetzen"
            className="p-1 hover:bg-white text-slate-600 rounded transition ml-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 z-20 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-bold text-slate-800 text-sm">Partitur wird vorbereitet...</p>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between">
          <span>{errorMessage}</span>
          <button 
            onClick={() => setErrorMessage(null)} 
            className="ml-3 font-semibold underline text-xs"
          >
            Ausblenden
          </button>
        </div>
      )}

      {/* Scrollable Viewport containing the White Sheet Music Paper */}
      <div
        ref={scrollViewportRef}
        className="scrollable-score-viewport flex-1 overflow-auto p-4 sm:p-6 md:p-8 flex justify-center items-start scroll-smooth"
      >
        {/* Dedicated White Paper Sheet Container */}
        <div 
          onClick={handleScoreClick}
          className={`score-page-container bg-white text-black shadow-xl rounded-xl p-4 sm:p-8 md:p-10 w-full max-w-5xl mx-auto border transition-all ${
            pickingMode 
              ? 'ring-4 ring-amber-400/60 border-amber-400 cursor-crosshair' 
              : 'border-slate-300 cursor-pointer'
          } min-h-[600px]`}
        >
          <div
            ref={containerRef}
            className={`w-full relative ${pickingMode ? 'cursor-crosshair' : 'cursor-pointer'}`}
            style={{
              backgroundColor: '#ffffff',
            }}
          />
        </div>
      </div>
    </div>
  );
};
