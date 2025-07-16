'use client';

import { useTheme } from '../contexts/ThemeContext';

// Define the data structure for playlists
interface PlaylistData {
  name: string;
  description: string;
  cover_image: string | null;
  uri: string;
}

interface PlaylistItemData {
  id: string;
  name: string;
  description: string;
  image: string | null;
}

// Define props for the component
interface EmotionRecommenderProps {
  emotion: string;
  playlists: PlaylistItemData[];
  isLoading: boolean;
  error: string | null;
  onPlaylistSelect: (playlistId: string) => void;
}

export default function EmotionRecommender({
  emotion,
  playlists,
  isLoading,
  error,
  onPlaylistSelect,
}: EmotionRecommenderProps) {
  const { currentTheme } = useTheme();

  if (isLoading) {
    return (
      <div className={`${currentTheme.cardBg} ${currentTheme.cardBorder} border rounded-xl p-6 ${currentTheme.cardShadow}`}>
        <div className="text-center py-8">
          <div className={`inline-block animate-spin rounded-full h-6 w-6 border-2 ${currentTheme.border} ${currentTheme.buttonBg}`}></div>
          <p className={`mt-2 ${currentTheme.textMuted}`}>Looking for recommendations for "{emotion}"...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${currentTheme.cardBg} ${currentTheme.cardBorder} border rounded-xl p-6 ${currentTheme.cardShadow}`}>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">Sorry, an error occurred: {error}</p>
        </div>
      </div>
    );
  }

  if (!isLoading && playlists.length === 0) {
    return (
      <div className={`${currentTheme.cardBg} ${currentTheme.cardBorder} border rounded-xl p-6 ${currentTheme.cardShadow}`}>
        <div className="text-center py-8">
          <p className={currentTheme.textMuted}>No playlist recommendations found for emotion "{emotion}".</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${currentTheme.cardBg} ${currentTheme.cardBorder} border rounded-xl p-6 ${currentTheme.cardShadow}`}>
      <h3 className={`text-xl font-semibold mb-6 ${currentTheme.textPrimary}`}>
        Playlists for "{emotion.charAt(0).toUpperCase() + emotion.slice(1)}"
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {playlists.map((playlist) => (
          <button
            key={playlist.id}
            onClick={() => onPlaylistSelect(playlist.id)}
            className={`w-full text-left p-4 ${currentTheme.cardBorder} border rounded-lg flex items-center gap-4 hover:bg-gray-100 hover:border-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 transform hover:scale-[1.02] active:scale-[0.98]`}
          >
            <img
              src={playlist.image || 'https://via.placeholder.com/64'}
              alt={playlist.name}
              className={`w-16 h-16 rounded-lg object-cover flex-shrink-0 ${currentTheme.cardBorder} border`}
            />
            <div className="overflow-hidden flex-1">
              <p className={`font-semibold ${currentTheme.textPrimary} truncate`}>{playlist.name}</p>
              <p className={`text-sm ${currentTheme.textMuted} line-clamp-2 mt-1`}>{playlist.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
