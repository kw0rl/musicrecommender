// src/components/InlinePlayer.tsx
'use client';

import Image from 'next/image';

// Tentukan interface untuk props yang akan diterima oleh komponen ini
interface SpotifyTrack {
  name: string;
  uri: string;
  album: {
    images: { url: string }[];
  };
  artists: { name: string }[];
}

interface InlinePlayerProps {
  currentTrack: SpotifyTrack | null;
  isPlaying: boolean;
  progressMs: number;
  durationMs: number;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

// Fungsi untuk format masa dari milisaat ke M:SS
const formatTime = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export default function InlinePlayer({
  currentTrack,
  isPlaying,
  progressMs,
  durationMs,
  onPlayPause,
  onNext,
  onPrevious,
}: InlinePlayerProps) {
  if (!currentTrack) {
    return (
      <div className="p-4 text-center text-gray-400">
        Pilih satu lagu untuk dimainkan.
      </div>
    );
  }

  const progressPercentage = durationMs > 0 ? (progressMs / durationMs) * 100 : 0;

  return (
    <div className="relative p-4 sm:p-6 rounded-2xl mb-6 flex flex-col items-center backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl">
      {/* Background gradient overlay for extra frosted effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-gray-200/5 pointer-events-none"></div>
      
      {/* Content with relative positioning */}
      <div className="relative z-10 flex flex-col items-center w-full">
        {/* Gambar Album */}
        <Image
          src={currentTrack.album.images[0]?.url || 'https://via.placeholder.com/300'}
          alt={`Album cover for ${currentTrack.name}`}
          width={256}
          height={256}
          className="w-48 h-48 sm:w-64 sm:h-64 rounded-xl object-cover shadow-2xl mb-6 ring-1 ring-white/20"
        />

        {/* Maklumat Lagu */}
        <div className="text-center mb-6">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-800 truncate max-w-xs sm:max-w-md mb-2">{currentTrack.name}</h3>
          <p className="text-sm sm:text-base text-gray-600 truncate max-w-xs sm:max-w-md">{currentTrack.artists.map((artist) => artist.name).join(', ')}</p>
        </div>

        {/* Bar Kemajuan (Progress Bar) */}
        <div className="w-full max-w-md mb-6">
          <div className="bg-gray-300/50 rounded-full h-2 backdrop-blur-sm">
            <div
              className="bg-gray-800 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-600 mt-2">
            <span>{formatTime(progressMs)}</span>
            <span>{formatTime(durationMs)}</span>
          </div>
        </div>

        {/* Butang Kawalan */}
        <div className="flex items-center space-x-8">
          <button onClick={onPrevious} className="text-gray-600 hover:text-gray-800 transition-colors p-2">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M8.445 14.832A1 1 0 0010 14.03V5.968a1 1 0 00-1.555-.832L4.12 9.168a1 1 0 000 1.664l4.325 4.032zM15.445 14.832A1 1 0 0017 14.03V5.968a1 1 0 00-1.555-.832L11.12 9.168a1 1 0 000 1.664l4.325 4.032z"/></svg>
          </button>
          <button
            onClick={onPlayPause}
            className="relative bg-white backdrop-blur-sm text-gray-800 rounded-full p-4 hover:scale-105 hover:bg-gray-100 transition-all duration-300 shadow-lg ring-1 ring-gray-200"
          >
            {isPlaying ? (
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v4a1 1 0 11-2 0V8z" clipRule="evenodd"/></svg>
            ) : (
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8.032v3.936a1 1 0 001.555.832l3.222-1.968a1 1 0 000-1.664L9.555 7.168z" clipRule="evenodd"/></svg>
            )}
          </button>
          <button onClick={onNext} className="text-gray-600 hover:text-gray-800 transition-colors p-2">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M4.555 5.168A1 1 0 003 5.968v8.064a1 1 0 001.555.832L8.88 10.832a1 1 0 000-1.664L4.555 5.168zM11.555 5.168A1 1 0 0010 5.968v8.064a1 1 0 001.555.832l4.325-4.032a1 1 0 000-1.664l-4.325-4.032z"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}