'use client';

import { useTheme } from '../contexts/ThemeContext';

// Define the data type for the track
interface Track {
  name: string;
  uri: string;
  album: {
    images: { url: string }[];
  };
  artists: { name: string }[];
}

interface PlayerControlsProps {
  isPlaying: boolean;
  progressMs: number;
  durationMs: number;
  currentTrack: Track | null;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onShowInlinePlayer?: () => void; // Add this prop
  shuffle?: boolean;
  onToggleShuffle?: () => void;
  onSeek?: (ms: number) => void;
}

export default function PlayerControls({
  isPlaying,
  progressMs,
  durationMs,
  currentTrack,
  onPlayPause,
  onNext,
  onPrevious,
  onShowInlinePlayer,
  shuffle = false,
  onToggleShuffle,
  onSeek,
}: PlayerControlsProps) {
  const { currentTheme } = useTheme();

  if (!currentTrack) {
    // If there's no current track, render nothing
    return null;
  }

  // Convert milliseconds to minute:second format (e.g., 1:35)
  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return minutes + ':' + (Number(seconds) < 10 ? '0' : '') + seconds;
  };

  const progressPercent = durationMs > 0 ? (progressMs / durationMs) * 100 : 0;

  return (
    <div className="flex flex-col items-center w-full">
      <div className="flex items-center gap-4 w-full max-w-4xl">
        {/* Song/album clickable area */}
        <div className="flex items-center gap-3 cursor-pointer group" onClick={onShowInlinePlayer} title="Show full player">
          <img 
            src={currentTrack.album.images[0]?.url} 
            alt={currentTrack.name} 
            className={`w-12 h-12 rounded-lg ${currentTheme.cardShadow} group-hover:scale-105 transition-transform ${currentTheme.cardBorder} border`} 
          />
          <div className="flex flex-col justify-center">
            <span className={`font-medium truncate max-w-[140px] ${currentTheme.textPrimary} group-hover:${currentTheme.textSecondary} transition-colors`}>{currentTrack.name}</span>
            <span className={`text-xs ${currentTheme.textMuted} truncate max-w-[140px]`}>{currentTrack.artists.map(a => a.name).join(', ')}</span>
          </div>
        </div>
        
        <div className="flex-1 flex items-center justify-center gap-3">
          {/* Shuffle Button */}
          {typeof shuffle === 'boolean' && onToggleShuffle && (
            <button
              onClick={onToggleShuffle}
              className={`p-2 rounded-lg text-sm transition-colors ${
                shuffle 
                  ? `${currentTheme.buttonBg} ${currentTheme.buttonText}` 
                  : `${currentTheme.accent} ${currentTheme.textMuted} hover:${currentTheme.secondary}`
              }`}
              title={shuffle ? 'Shuffle On' : 'Shuffle Off'}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 5h2v2H4V5zm0 4h2v2H4V9zm0 4h2v2H4v-2zm4-8h2v2H8V5zm0 4h2v2H8V9zm0 4h2v2H8v-2zm4-8h2v2h-2V5zm0 4h2v2h-2V9zm0 4h2v2h-2v-2z"/>
                <path d="M16 3l-4 4h3v6h-3l4 4V3z"/>
              </svg>
            </button>
          )}
          
          <button 
            onClick={onPrevious} 
            className={`${currentTheme.textMuted} hover:${currentTheme.textPrimary} transition-colors p-2`}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M8.445 14.832A1 1 0 0010 14.03V5.968a1 1 0 00-1.555-.832L4.12 9.168a1 1 0 000 1.664l4.325 4.032zM15.445 14.832A1 1 0 0017 14.03V5.968a1 1 0 00-1.555-.832L11.12 9.168a1 1 0 000 1.664l4.325 4.032z"/></svg>
          </button>
          
          {isPlaying ? (
            <button 
              onClick={onPlayPause} 
              className={`relative ${currentTheme.playerBg} backdrop-blur-sm ${currentTheme.textPrimary} rounded-full p-3 hover:scale-105 hover:${currentTheme.secondary} transition-all duration-300 ${currentTheme.cardShadow} ring-1 ${currentTheme.playerBorder}`}
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v4a1 1 0 11-2 0V8z" clipRule="evenodd"/></svg>
            </button>
          ) : (
            <button 
              onClick={onPlayPause} 
              className={`relative ${currentTheme.playerBg} backdrop-blur-sm ${currentTheme.textPrimary} rounded-full p-3 hover:scale-105 hover:${currentTheme.secondary} transition-all duration-300 ${currentTheme.cardShadow} ring-1 ${currentTheme.playerBorder}`}
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8.032v3.936a1 1 0 001.555.832l3.222-1.968a1 1 0 000-1.664L9.555 7.168z" clipRule="evenodd"/></svg>
            </button>
          )}
          
          <button 
            onClick={onNext} 
            className={`${currentTheme.textMuted} hover:${currentTheme.textPrimary} transition-colors p-2`}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M4.555 5.168A1 1 0 003 5.968v8.064a1 1 0 001.555.832L8.88 10.832a1 1 0 000-1.664L4.555 5.168zM11.555 5.168A1 1 0 0010 5.968v8.064a1 1 0 001.555.832l4.325-4.032a1 1 0 000-1.664l-4.325-4.032z"/></svg>
          </button>
        </div>
        
        <div className="flex flex-col items-end min-w-[80px]">
          <span className={`text-xs ${currentTheme.textMuted}`}>{formatTime(progressMs)} / {formatTime(durationMs)}</span>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full max-w-4xl mt-2">
        <input
          type="range"
          min={0}
          max={durationMs}
          value={progressMs}
          onChange={e => onSeek && onSeek(Number(e.target.value))}
          className={`w-full h-2 ${currentTheme.secondary} rounded-lg appearance-none cursor-pointer`}
          style={{ 
            cursor: 'pointer',
            background: `linear-gradient(to right, #374151 0%, #374151 ${(progressMs / durationMs) * 100}%, #e5e7eb ${(progressMs / durationMs) * 100}%, #e5e7eb 100%)`,
          }}
        />
      </div>
    </div>
  );
}
