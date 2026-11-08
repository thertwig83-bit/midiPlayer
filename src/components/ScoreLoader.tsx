import React, { useRef, useState } from 'react';
import { SAMPLE_SCORES, SampleScore } from '../samples';
import { Upload, FileMusic, Sparkles, FolderOpen, History, X } from 'lucide-react';

interface ScoreLoaderProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScore: (data: string | ArrayBuffer, title: string) => void;
}

interface RecentScore {
  id: string;
  title: string;
  date: string;
  data: string;
}

export const ScoreLoader: React.FC<ScoreLoaderProps> = ({
  isOpen,
  onClose,
  onSelectScore,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [recentScores, setRecentScores] = useState<RecentScore[]>(() => {
    try {
      const saved = localStorage.getItem('recent_scores');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  if (!isOpen) return null;

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();

    if (file.name.endsWith('.mxl')) {
      // Compressed MusicXML is a zip archive (binary ArrayBuffer)
      reader.onload = (e) => {
        if (e.target?.result) {
          onSelectScore(e.target.result as ArrayBuffer, file.name);
          onClose();
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Standard .musicxml or .xml text
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (content) {
          saveToRecent(file.name, content);
          onSelectScore(content, file.name);
          onClose();
        }
      };
      reader.readAsText(file);
    }
  };

  const saveToRecent = (title: string, data: string) => {
    try {
      if (data.length > 500000) return;
      const newEntry: RecentScore = {
        id: Date.now().toString(),
        title,
        date: new Date().toLocaleDateString('de-DE'),
        data,
      };
      const updated = [newEntry, ...recentScores.filter(s => s.title !== title)].slice(0, 5);
      setRecentScores(updated);
      localStorage.setItem('recent_scores', JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save to recent scores:', e);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSelectSample = (sample: SampleScore) => {
    onSelectScore(sample.xml, sample.title);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <FileMusic className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Partitur laden
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                MusicXML (.musicxml, .xml, .mxl) vom lokalen Gerät auswählen
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* File Drag & Drop / Upload Box */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
              isDragging
                ? 'border-blue-500 bg-blue-50/60'
                : 'border-slate-300 hover:border-blue-500 hover:bg-slate-50'
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                Datei auswählen oder hierher ziehen
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Unterstützt MusicXML, XML und komprimierte MXL-Dateien
              </p>
            </div>
            <button
              type="button"
              className="mt-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer"
            >
              <FolderOpen className="w-4 h-4" />
              Auf Laptop / Tablet durchsuchen
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".musicxml,.xml,.mxl"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />
          </div>

          {/* Sample Scores Section */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-500 uppercase tracking-wider mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Mitgelieferte Übungs-Partituren</span>
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              {SAMPLE_SCORES.map((score) => (
                <div
                  key={score.id}
                  onClick={() => handleSelectSample(score)}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/30 transition cursor-pointer flex items-center justify-between"
                >
                  <div className="min-w-0 pr-3">
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {score.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {score.composer} • {score.description}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-blue-600 shrink-0">
                    Öffnen →
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Scores (if any) */}
          {recentScores.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                <History className="w-3.5 h-3.5" />
                <span>Zuletzt geöffnete Dateien</span>
              </div>
              <div className="space-y-1.5">
                {recentScores.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => {
                      onSelectScore(r.data, r.title);
                      onClose();
                    }}
                    className="p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-slate-800 truncate pr-2">
                      {r.title}
                    </span>
                    <span className="text-[11px] text-slate-500 shrink-0">
                      {r.date}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
