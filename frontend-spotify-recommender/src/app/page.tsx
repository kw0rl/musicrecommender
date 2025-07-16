// src/app/page.tsx
'use client';

import EmotionRecommender from '../components/EmotionRecommender';
import { useState, useEffect, useRef, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Script from 'next/script'; // <-- 1. Import Script component
import PlayerControls from '../components/PlayerControls';
import InlinePlayer from '../components/InlinePlayer';
import { useTheme, type Emotion } from '../contexts/ThemeContext';
// import AddToPlaylistModal from '../components/AddToPlaylistModal';

// Define interfaces
interface User {
  id: number;
  username: string;
  email: string;
  role: 'user' | 'admin';
  created_at: string;
}

// New interface for data from Spotify SDK
interface SpotifyTrack {
    name: string;
    uri: string;
    album: {
        images: { url: string }[];
    };
    artists: { name: string }[];
}

// Add interface for EmotionPlaylistData
interface EmotionPlaylistData {
  id: string;
  name: string;
  owner: string;
  image?: string;
  uri: string;
}

interface Track {
  id: string;
  name: string;
  artist: string;
  album: string;
  image?: string;
  uri: string;
}

interface Playlist {
  id: string;
  name: string;
  owner: string;
  image?: string;
  uri: string;
}

interface SearchResults {
  tracks: Track[];
  playlists: Playlist[];
}

export default function HomePage() {
  // Get theme context
  const { setEmotion, currentTheme } = useTheme();

  // State for user authentication
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // ---- ADD THIS NEW STATE ----
  const [recommendedPlaylists, setRecommendedPlaylists] = useState<any[]>([]);
  const [selectedPlaylistTracks, setSelectedPlaylistTracks] = useState<Track[]>([])
  const [selectedPlaylistUri, setSelectedPlaylistUri] = useState<string | undefined>(undefined); // <-- Add this
  const [view, setView] = useState<'recommendations' | 'tracks' | 'playing'>('recommendations');
  const [isLoading, setIsLoading] = useState(false); // General loading state
  const [error, setError] = useState<string | null>(null);
  // ------------------------------
  // State for emotion recommendations
  const [currentEmotion, setCurrentEmotion] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState<string>('');

  // State for camera functionality
  const [isCameraOn, setIsCameraOn] = useState<boolean>(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isDetectingEmotion, setIsDetectingEmotion] = useState<boolean>(false);
  const [errorFromEmotionDetection, setErrorFromEmotionDetection] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // State for music search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('track');
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearchExpanded, setIsSearchExpanded] = useState(true);

  // ---- ADD THIS NEW STATE ----
  const [spotifyPlayer, setSpotifyPlayer] = useState<Spotify.Player | null>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState({ progressMs: 0, durationMs: 0 });
  const [shuffle, setShuffle] = useState(false);

  const [isCreatePlaylistModalOpen, setIsCreatePlaylistModalOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  // const [isAddToPlaylistModalOpen, setIsAddToPlaylistModalOpen] = useState(false);
  // const [trackUriToAdd, setTrackUriToAdd] = useState<string | null>(null);

  const router = useRouter();

  // Helper function to update emotion and theme
  const updateEmotion = (emotion: string | null) => {
    setCurrentEmotion(emotion);
    // Map emotion string to Emotion type and update theme
    const emotionMapping: Record<string, Emotion> = {
      'happy': 'happy',
      'sad': 'sad', 
      'angry': 'angry',
      'neutral': 'neutral'
    };
    
    if (emotion && emotionMapping[emotion.toLowerCase()]) {
      setEmotion(emotionMapping[emotion.toLowerCase()]);
    } else {
      setEmotion(null); // Reset to default theme
    }
  };

    // useEffect to check login status
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const fetchUserDetails = async () => {
        try {
          const response = await fetch('http://localhost:3001/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } });
          if (response.ok) {
            const data = await response.json();
            setLoggedInUser(data.user);
          } else {
            console.warn('Failed to retrieve user information. Token may be invalid or expired.');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setLoggedInUser(null);
          }
        } catch (error) {
          console.error('Network error while retrieving user information:', error);
        } finally {
          setAuthLoading(false);
        }
      };
      fetchUserDetails();
    } else {
      setAuthLoading(false);
    }
  }, []);

  // useEffect to attach stream to video element
  useEffect(() => {
    if (isCameraOn && videoStream && videoRef.current) {
      videoRef.current.srcObject = videoStream;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play().catch(playError => {
          console.error("Error during videoRef.current.play():", playError);
          setCameraError("Camera is accessible, but failed to play video.");
        });
      };
      videoRef.current.onplaying = () => {
        console.log("Video is playing!");
      };
    } else if (!isCameraOn && videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [isCameraOn, videoStream]);

  // useEffect to get playlist recommendations WHEN currentEmotion changes
  // REPLACE the previous emotion recommendation useEffect with this:
  useEffect(() => {
    if (currentEmotion) {
      const fetchRecommendedPlaylists = async () => {
        setIsLoading(true);
        setError(null);
        setView('recommendations'); // Set view to show playlists
        try {
          const response = await fetch(`http://localhost:3001/recommendations/${currentEmotion}`);
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Failed to fetch recommendations.');

          setRecommendedPlaylists(data.playlist || []);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      };
      fetchRecommendedPlaylists();
    } else {
      setRecommendedPlaylists([]);
    }
  }, [currentEmotion]);

  // useEffect to clean up camera
  useEffect(() => {
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [videoStream]);

  // REPLACE the previous useEffect for the player with this one:
  useEffect(() => {
    const initializePlayer = (token: string) => {
      if (window.Spotify) {
        const player = new window.Spotify.Player({
          name: 'FYP Music Player',
          getOAuthToken: cb => { cb(token); },
          volume: 0.5
        });

        player.addListener('ready', ({ device_id }) => {
          console.log('Spotify Player is ready with device ID:', device_id);
          setDeviceId(device_id);
          setIsPlayerReady(true);
        });

        player.addListener('not_ready', ({ device_id }) => {
          console.log('This device ID has gone offline:', device_id);
          setIsPlayerReady(false);
        });

        // ---- MOST IMPORTANT PART: Listen to player state changes ----
        player.addListener('player_state_changed', (state) => {
          if (!state) {
            setCurrentTrack(null);
            setIsPlaying(false);
            setPlaybackProgress({ progressMs: 0, durationMs: 0 });
            return;
          }
          console.log("Player state changed:", state);
          setCurrentTrack(state.track_window.current_track as SpotifyTrack);
          setIsPlaying(!state.paused);
          setPlaybackProgress({ progressMs: state.position, durationMs: state.duration });
        });
        // ------------------------------------------------------------------

        player.addListener('authentication_error', ({ message }) => console.error(message));
        player.addListener('account_error', ({ message }) => alert(`Account Error: ${message}`));

        player.connect();
        setSpotifyPlayer(player);
      }
    };

    // When the component is ready and user is logged in, define the window function
    // that will be triggered by <Script>
    (window as any).onSpotifyWebPlaybackSDKReady = () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      fetch('http://localhost:3001/api/spotify/playback-token', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.ok ? res.json() : Promise.reject('Failed to get playback token'))
        .then(data => data.accessToken && initializePlayer(data.accessToken))
        .catch(e => console.error("Player initialization error:", e));
    };
  }, [initializePlayer]); // useCallback will be added to initializePlayer

  // Fetch current shuffle state when player/device is ready
  useEffect(() => {
    const fetchShuffleState = async () => {
      if (!isPlayerReady || !deviceId) return;
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`http://localhost:3001/api/spotify/shuffle-state?device_id=${deviceId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setShuffle(!!data.shuffle);
        }
      } catch (e) {
        // ignore
      }
    };
    fetchShuffleState();
  }, [isPlayerReady, deviceId]);

  // Handler to toggle shuffle
  const handleToggleShuffle = async () => {
    if (!isPlayerReady || !deviceId) return;
    const token = localStorage.getItem('token');
    const newShuffle = !shuffle;
    setShuffle(newShuffle);
    await fetch(`http://localhost:3001/api/spotify/shuffle?state=${newShuffle}&device_id=${deviceId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token!}`,
        },
      }
    );
  };

  // Function to start the camera
  const startCamera = async () => {
    setCameraError(null);
    updateEmotion(null);
    setInputValue('');
    setIsCameraOn(false);
    
    // Stop any existing stream first
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
    }
    setVideoStream(null);
    if (videoRef.current) {
        videoRef.current.srcObject = null;
    }

    // Check if mediaDevices is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Camera functionality is not supported by this browser.");
      return;
    }

    // Check current permission status
    const permissionStatus = await checkCameraPermission();
    console.log("Permission status before request:", permissionStatus);

    try {
      console.log("Requesting camera access...");
      
      // Try with different constraints for better compatibility
      const constraints = {
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("Camera access granted successfully");
      
      setVideoStream(stream);
      setIsCameraOn(true);
    } catch (err: any) {
      console.error("Camera error:", err);
      
      let userMessage = "Unable to access camera. Please ensure permission is granted.";
      
      switch (err.name) {
        case "NotAllowedError":
          userMessage = "Camera access was denied. Please click the camera icon in your browser's address bar and allow camera access, then refresh the page.";
          break;
        case "NotFoundError":
          userMessage = "No camera found on this device.";
          break;
        case "NotReadableError":
          userMessage = "Camera might be used by another application. Please close other apps using the camera and try again.";
          break;
        case "OverconstrainedError":
          userMessage = "Camera doesn't support the required settings. Trying with basic settings...";
          // Try with simpler constraints
          try {
            const simpleStream = await navigator.mediaDevices.getUserMedia({ video: true });
            setVideoStream(simpleStream);
            setIsCameraOn(true);
            return;
          } catch (simpleErr) {
            userMessage = "Camera access failed even with basic settings.";
          }
          break;
        case "AbortError":
          userMessage = "Camera access was aborted. Please try again.";
          break;
        case "SecurityError":
          userMessage = "Camera access blocked due to security settings. Please ensure you're on HTTPS or localhost.";
          break;
        default:
          userMessage = `Camera error: ${err.message || err.name || "Unknown error"}`;
      }
      
      setCameraError(userMessage);
      setIsCameraOn(false);
    }
  };

  // Function to stop the camera
  const stopCamera = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
    }
    setIsCameraOn(false);
    setVideoStream(null);
  };

    // Function to capture frame and detect emotion
  const captureFrameAndDetectEmotion = async () => {
    if (!videoRef.current || !canvasRef.current || !isCameraOn || videoRef.current.videoWidth === 0) {
      alert("Camera is not active or video data is not ready.");
      return;
    }
    setIsDetectingEmotion(true);
    setErrorFromEmotionDetection(null);
    updateEmotion(null);
    const context = canvasRef.current.getContext('2d');
    if (context) {
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0, videoRef.current.videoWidth, videoRef.current.videoHeight);
      const base64Image = canvasRef.current.toDataURL('image/jpeg').split(',')[1];
      if (!base64Image || base64Image.length < 100) {
        setErrorFromEmotionDetection("Failed to capture a valid image frame.");
        setIsDetectingEmotion(false);
        return;
      }
      try {
        const response = await fetch('http://localhost:3001/api/detect-emotion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Image }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to detect emotion.');
        updateEmotion(data.emotion);
        
        // 🎥 AUTO-TURN OFF CAMERA AFTER SUCCESSFUL DETECTION
        setTimeout(() => {
          stopCamera();
        }, 1000); // Wait 1 second to show the detection result, then turn off camera
        
      } catch (err: any) {
        setErrorFromEmotionDetection(err.message);
      } finally {
        setIsDetectingEmotion(false);
      }
    }
  };

  // Function for manual emotion input
  const handleDetectEmotionManual = () => {
    if (!inputValue.trim()) {
      alert("Please enter an emotion.");
      return;
    }
    stopCamera();
    updateEmotion(inputValue.trim().toLowerCase());
  };
  
  // Function for music search
  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!searchQuery.trim()) {
      alert("Please enter a search query.");
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    setSearchResults(null);
    const token = localStorage.getItem('token');
    try {
      const params = new URLSearchParams({ q: searchQuery, type: searchType });
      const response = await fetch(`http://localhost:3001/api/spotify/search?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token!}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Search failed.");
      setSearchResults(data);
    } catch (err: any) {
      setSearchError(err.message);
    } finally {
      setIsSearching(false);
    }
  };

  // Function to log out
  const handleLogout = () => {
    stopCamera();
    if (spotifyPlayer) {
      spotifyPlayer.pause();
      spotifyPlayer.disconnect();
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setLoggedInUser(null);
    router.push('/login');
  };

const handlePlay = async (uri: string) => {
    if (!isPlayerReady || !deviceId) {
        alert("Music player is not ready or Spotify account is not connected.");
        return;
    }

    const token = localStorage.getItem('token');
    const playlistBody: { device_id: string; [key: string]: any } = {
        device_id: deviceId
    };

    let shouldTurnOffShuffle = false;
    
    // Check if the clicked track is from search results
    const isFromSearchResults = searchResults && searchResults.tracks.some(track => track.uri === uri);
    
    // Check if the clicked track is from current playlist tracks
    const isFromCurrentPlaylist = selectedPlaylistTracks && selectedPlaylistTracks.some(track => track.uri === uri);

    if (isFromSearchResults) {
        // Playing from search results - use search context
        playlistBody.uris = searchResults!.tracks.map(track => track.uri);
        playlistBody.offset = { uri: uri };
        console.log("Playing from search results");
    } else if (isFromCurrentPlaylist && selectedPlaylistUri) {
        // Playing from current playlist - use playlist context
        playlistBody.context_uri = selectedPlaylistUri;
        const trackIndex = selectedPlaylistTracks.findIndex(track => track.uri === uri);
        if (trackIndex !== -1) {
            playlistBody.offset = { position: trackIndex };
        } else {
            playlistBody.offset = { position: 0 };
        }
        shouldTurnOffShuffle = true;
        console.log("Playing from current playlist");
    } else if (uri.includes('playlist')) {
        // Playing a playlist directly
        playlistBody.context_uri = uri;
        console.log("Playing playlist directly");
    } else {
        // Single track
        playlistBody.uris = [uri];
        console.log("Playing single track");
    }

    try {
        if (spotifyPlayer) {
            await spotifyPlayer.pause();
            await new Promise(res => setTimeout(res, 300));
        }

        if (shouldTurnOffShuffle && shuffle) {
            await fetch(`http://localhost:3001/api/spotify/shuffle?state=false&device_id=${deviceId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token!}`,
                },
            });
            setShuffle(false);
            // Wait longer for shuffle state to update
            await new Promise(res => setTimeout(res, 900));
        }

        console.log("PLAY REQUEST BODY:", playlistBody);
        // First play request
        let playRes = await fetch('http://localhost:3001/api/spotify/play', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token!}`,
            },
            body: JSON.stringify(playlistBody),
        });
        // Wait a bit and send again (Spotify bug workaround)
        await new Promise(res => setTimeout(res, 400));
        let playRes2 = await fetch('http://localhost:3001/api/spotify/play', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token!}`,
            },
            body: JSON.stringify(playlistBody),
        });
        setView('playing');
        if (!playRes.ok || !playRes2.ok) {
            console.error('Spotify play API error:', await playRes.text(), await playRes2.text());
        }
    } catch (err: any) {
        console.error("Error calling play API:", err);
        alert(err.message);
    }
};

  // Function to Pause/Resume Playback
  const handlePlayPause = async () => {
    if (!spotifyPlayer) return;
    await spotifyPlayer.togglePlay();
  };

  // Function to Play Next Track
  const handleNext = async () => {
    if (!spotifyPlayer) return;
    await spotifyPlayer.nextTrack();
  };

  // Function to Play Previous Track
  const handlePrevious = async () => {
    if (!spotifyPlayer) return;
    await spotifyPlayer.previousTrack();
  };
  // ADD THIS NEW FUNCTION inside HomePage
  const handlePlaylistSelect = async (playlistId: string) => {
    setIsLoading(true);
    setError(null);
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`http://localhost:3001/api/spotify/playlists/${playlistId}`, {
            headers: { 'Authorization': `Bearer ${token!}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch songs from the playlist.');

        setSelectedPlaylistTracks(data);
        // Find the playlist URI from recommendedPlaylists or searchResults
        let foundUri: string | undefined = undefined;
        if (recommendedPlaylists.length > 0) {
          const found = recommendedPlaylists.find((pl: any) => pl.id === playlistId);
          if (found) foundUri = found.uri;
        }
        // fallback: try to find in searchResults if needed
        if (!foundUri && searchResults && searchResults.playlists) {
          const found = searchResults.playlists.find((pl: any) => pl.id === playlistId);
          if (found) foundUri = found.uri;
        }
        setSelectedPlaylistUri(foundUri); // <-- Set the selected playlist URI
        setView('tracks'); // Switch view to show the list of tracks
    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsLoading(false);
    }
  };

  // Timer to update playback progress smoothly
useEffect(() => {
  let interval: NodeJS.Timeout | null = null;
  if (isPlaying && currentTrack && playbackProgress.durationMs > 0) {
    interval = setInterval(() => {
      setPlaybackProgress(prev => {
        // Only increment if not at end
        if (prev.progressMs + 1000 < prev.durationMs) {
          return { ...prev, progressMs: prev.progressMs + 1000 };
        } else {
          // Clamp to durationMs
          return { ...prev, progressMs: prev.durationMs };
        }
      });
    }, 1000);
  }
  return () => {
    if (interval) clearInterval(interval);
  };
}, [isPlaying, currentTrack, playbackProgress.durationMs]);

  // ---------------------------------------
  if (authLoading) {
    return <main className="flex min-h-screen items-center justify-center bg-gray-900 text-white"><p>Loading...</p></main>;
  }

  function initializePlayer(e: any): void {
    throw new Error('Function not implemented.');
  }

return (
  <>
    {loggedInUser && <Script src="https://sdk.scdn.co/spotify-player.js" />}
    
    {/* Full Screen Player Mode */}
    {view === 'playing' && currentTrack ? (
      <main className={`min-h-screen ${currentTheme.primary} ${currentTheme.textPrimary} flex flex-col`}>
        {/* Player Header with Back Button */}
        <header className={`${currentTheme.cardBg} ${currentTheme.cardBorder} border-b px-6 py-4`}>
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setView(selectedPlaylistTracks.length > 0 ? 'tracks' : 'recommendations')}
              className={`flex items-center space-x-2 ${currentTheme.textMuted} hover:${currentTheme.textPrimary} transition-colors`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-medium">Back</span>
            </button>
            <h1 className={`text-lg font-semibold ${currentTheme.textPrimary}`}>Now Playing</h1>
            <div className="w-16"></div> {/* Spacer for centering */}
          </div>
        </header>

        {/* Full Screen Player Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-lg w-full text-center space-y-8">
            {/* Album Art */}
            <div className="relative">
              <img 
                src={currentTrack.album.images[0]?.url || '/placeholder-album.png'} 
                alt={currentTrack.name}
                className="w-full aspect-square object-cover rounded-2xl shadow-2xl"
              />
            </div>

            {/* Track Info */}
            <div className="space-y-2">
              <h2 className={`text-2xl font-bold ${currentTheme.textPrimary}`}>
                {currentTrack.name}
              </h2>
              <p className={`text-lg ${currentTheme.textSecondary}`}>
                {currentTrack.artists.map(artist => artist.name).join(', ')}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className={`w-full bg-gray-200 rounded-full h-1 ${currentTheme.accent}`}>
                <div 
                  className={`h-1 rounded-full transition-all duration-1000 ${currentTheme.buttonBg}`}
                  style={{ 
                    width: playbackProgress.durationMs > 0 
                      ? `${(playbackProgress.progressMs / playbackProgress.durationMs) * 100}%` 
                      : '0%' 
                  }}
                ></div>
              </div>
              <div className={`flex justify-between text-sm ${currentTheme.textMuted}`}>
                <span>{Math.floor(playbackProgress.progressMs / 60000)}:{String(Math.floor((playbackProgress.progressMs % 60000) / 1000)).padStart(2, '0')}</span>
                <span>{Math.floor(playbackProgress.durationMs / 60000)}:{String(Math.floor((playbackProgress.durationMs % 60000) / 1000)).padStart(2, '0')}</span>
              </div>
            </div>

            {/* Player Controls */}
            <div className="flex items-center justify-center space-x-8">
              <button 
                onClick={handleToggleShuffle}
                className={`p-3 rounded-full transition-colors ${shuffle ? currentTheme.buttonBg + ' ' + currentTheme.buttonText : currentTheme.textMuted + ' hover:' + currentTheme.textPrimary}`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
                </svg>
              </button>

              <button 
                onClick={handlePrevious}
                className={`p-3 rounded-full ${currentTheme.textMuted} hover:${currentTheme.textPrimary} transition-colors`}
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                </svg>
              </button>

              <button 
                onClick={handlePlayPause}
                className={`p-4 rounded-full ${currentTheme.buttonBg} ${currentTheme.buttonText} hover:scale-105 transition-transform shadow-lg`}
              >
                {isPlaying ? (
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                  </svg>
                ) : (
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>

              <button 
                onClick={handleNext}
                className={`p-3 rounded-full ${currentTheme.textMuted} hover:${currentTheme.textPrimary} transition-colors`}
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                </svg>
              </button>
            </div>

            {/* Additional Controls - Remove since shuffle is now in main controls */}
          </div>
        </div>
      </main>
    ) : (
      // Normal App Layout
      <main className={`min-h-screen ${currentTheme.primary} ${currentTheme.textPrimary}`}>
        {/* Header */}
        <header className={`${currentTheme.cardBg} ${currentTheme.cardBorder} border-b sticky top-0 z-40 backdrop-blur-sm ${currentTheme.cardBg}/95`}>
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className={`text-2xl font-light tracking-wide ${currentTheme.textPrimary}`}>
                Music Emotion Recommender
              </h1>
              <div>
                {loggedInUser ? (
                  <div className="flex items-center space-x-6">
                    {isPlayerReady && (
                      <span className="text-xs px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-200" title={`Device ID: ${deviceId}`}>
                        Player Ready
                      </span>
                    )}
                    <Link href="/profile" className={`flex items-center space-x-2 text-sm ${currentTheme.textMuted} hover:${currentTheme.textPrimary} font-medium transition-colors`}>
                      <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                      <span className="font-semibold">{loggedInUser.username}</span>
                    </Link>
                    <button 
                      onClick={handleLogout} 
                      className={`px-4 py-2 text-sm ${currentTheme.textMuted} ${currentTheme.border} border rounded-lg hover:bg-gray-200 hover:border-gray-400 hover:text-gray-800 transition-all duration-200 transform hover:scale-105 active:scale-95`}
                    >
                      Log Out
                    </button>
                  </div>
                ) : (
                  <div className="flex space-x-3">
                    <Link href="/login" className={`px-4 py-2 text-sm ${currentTheme.textMuted} ${currentTheme.border} border rounded-lg hover:bg-gray-200 hover:border-gray-400 hover:text-gray-800 transition-all duration-200 transform hover:scale-105 active:scale-95`}>Log In</Link>
                    <Link href="/register" className={`px-4 py-2 text-sm ${currentTheme.buttonBg} ${currentTheme.buttonText} rounded-lg ${currentTheme.buttonHover} transition-colors`}>Register</Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          {loggedInUser ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Emotion Detection */}
              <div className="lg:col-span-1">
                <div className={`${currentTheme.cardBg} ${currentTheme.cardBorder} border rounded-xl p-6 ${currentTheme.cardShadow}`}>
                  <h2 className={`text-xl font-semibold mb-6 ${currentTheme.textPrimary}`}>Emotion Detection</h2>
                  
                  {/* Camera Section */}
                  <div className="space-y-4">
                    {!isCameraOn ? (
                      <button 
                        onClick={startCamera} 
                        className={`w-full px-6 py-3 ${currentTheme.buttonBg} ${currentTheme.buttonText} rounded-lg font-medium ${currentTheme.buttonHover} transition-colors`}
                      >
                        Start Camera
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div className="relative">
                          <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            muted 
                            className={`w-full aspect-square object-cover rounded-lg ${currentTheme.accent} ${currentTheme.border} border`} 
                            style={{ transform: 'scaleX(-1)' }} 
                          />
                        </div>
                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                        <div className="grid grid-cols-2 gap-2">
                          <button 
                            onClick={captureFrameAndDetectEmotion} 
                            disabled={isDetectingEmotion} 
                            className={`px-4 py-2 ${currentTheme.buttonBg} ${currentTheme.buttonText} rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed ${currentTheme.buttonHover} transition-colors`}
                          >
                            {isDetectingEmotion ? 'Detecting...' : 'Detect'}
                          </button>
                          <button 
                            onClick={stopCamera} 
                            className={`px-4 py-2 ${currentTheme.border} border ${currentTheme.textSecondary} rounded-lg font-medium hover:${currentTheme.secondary} transition-colors`}
                          >
                            Stop
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {cameraError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-3">
                        <p className="text-sm text-red-700">{cameraError}</p>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => window.location.reload()} 
                            className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded border border-red-300 hover:bg-red-200 transition-colors"
                          >
                            Refresh Page
                          </button>
                          <button 
                            onClick={() => {
                              setCameraError(null);
                              console.log("Retrying camera access...");
                              startCamera();
                            }} 
                            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded border border-blue-300 hover:bg-blue-200 transition-colors"
                          >
                            Retry
                          </button>
                        </div>
                        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                          <strong>Troubleshooting tips:</strong><br/>
                          1. Click the camera icon 🎥 in your browser address bar<br/>
                          2. Select "Allow" for camera access<br/>
                          3. Close other apps that might be using the camera<br/>
                          4. Try refreshing the page<br/>
                          5. Make sure you're on localhost or HTTPS
                        </div>
                      </div>
                    )}
                    {errorFromEmotionDetection && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-700">Error: {errorFromEmotionDetection}</p>
                      </div>
                    )}
                  </div>

                  {/* Manual Input Section */}
                  <div className={`mt-6 pt-6 ${currentTheme.border} border-t`}>
                    <div className="space-y-3">
                      <label className={`block text-sm font-medium ${currentTheme.textSecondary}`}>
                        Or enter manually:
                      </label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={inputValue} 
                          onChange={(e) => setInputValue(e.target.value)} 
                          placeholder="e.g. happy, sad, angry" 
                          className={`flex-1 px-3 py-2 ${currentTheme.inputBorder} border rounded-lg ${currentTheme.textPrimary} ${currentTheme.textMuted} focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent ${currentTheme.inputBg}`} 
                          disabled={isCameraOn} 
                        />
                        <button 
                          onClick={handleDetectEmotionManual} 
                          className={`px-4 py-2 ${currentTheme.buttonBg} ${currentTheme.buttonText} rounded-lg font-medium disabled:opacity-50 ${currentTheme.buttonHover} transition-colors`} 
                          disabled={isCameraOn}
                        >
                          Submit
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Current Emotion Display */}
                  {currentEmotion && (
                    <div className={`mt-6 pt-6 ${currentTheme.border} border-t`}>
                      <div className="flex items-center justify-center">
                        <div className={`px-4 py-2 ${currentTheme.accent} rounded-full`}>
                          <span className={`text-sm font-medium ${currentTheme.textPrimary}`}>
                            Current: {currentEmotion}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Results */}
              <div className="lg:col-span-2 space-y-8">
                {/* Search Section - Moved to top */}
                <div className={`${currentTheme.cardBg} ${currentTheme.cardBorder} border rounded-xl ${currentTheme.cardShadow} transition-all duration-300`}>
                  <div className="flex items-center justify-between p-6 pb-4">
                    <h2 className={`text-xl font-semibold ${currentTheme.textPrimary} flex items-center gap-3`}>
                      <button
                        onClick={() => setIsSearchExpanded(!isSearchExpanded)}
                        className={`p-1 rounded-lg ${currentTheme.textMuted} hover:${currentTheme.textPrimary} hover:bg-gray-100 transition-all duration-200`}
                        aria-label={isSearchExpanded ? "Minimize search" : "Expand search"}
                      >
                        <svg 
                          className={`w-5 h-5 transform transition-transform duration-200 ${isSearchExpanded ? 'rotate-90' : 'rotate-0'}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      Search Music
                    </h2>
                  </div>
                  
                  {isSearchExpanded && (
                    <div className="px-6 pb-6">
                      <form onSubmit={handleSearch} className="flex gap-4 mb-6">
                        <input 
                          type="text" 
                          value={searchQuery} 
                          onChange={(e) => setSearchQuery(e.target.value)} 
                          placeholder="Search songs and artists..." 
                          className={`flex-1 px-4 py-2 ${currentTheme.inputBorder} border rounded-lg ${currentTheme.textPrimary} placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent ${currentTheme.inputBg}`}
                        />
                        <button 
                          type="submit" 
                          disabled={isSearching} 
                          className={`px-6 py-2 ${currentTheme.buttonBg} ${currentTheme.buttonText} rounded-lg font-medium disabled:opacity-50 ${currentTheme.buttonHover} transition-colors`}
                        >
                          {isSearching ? 'Searching...' : 'Search'}
                        </button>
                      </form>

                      {isSearching && (
                        <div className="text-center py-8">
                          <div className={`inline-block animate-spin rounded-full h-6 w-6 border-2 ${currentTheme.border} ${currentTheme.buttonBg}`}></div>
                          <p className={`mt-2 ${currentTheme.textMuted}`}>Searching...</p>
                        </div>
                      )}

                      {searchError && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-red-700">Error: {searchError}</p>
                        </div>
                      )}

                      {/* Search Results */}
                      {searchResults && searchResults.tracks && searchResults.tracks.length > 0 && (
                        <div className="mb-8">
                          <h3 className={`text-lg font-semibold mb-4 ${currentTheme.textPrimary}`}>Tracks</h3>
                          <div className="space-y-2">
                            {searchResults.tracks.map((track: Track) => (
                              <div 
                                key={track.id} 
                                className={`flex items-center justify-between p-3 ${currentTheme.cardBorder} border rounded-lg hover:${currentTheme.secondary} transition-colors cursor-pointer group`}
                                onClick={() => handlePlay(track.uri)}
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <img 
                                    src={track.image || 'https://via.placeholder.com/48'} 
                                    alt={track.name} 
                                    className={`w-12 h-12 rounded-lg object-cover ${currentTheme.cardBorder} border`}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className={`font-medium ${currentTheme.textPrimary} truncate`}>{track.name}</p>
                                    <p className={`text-sm ${currentTheme.textMuted} truncate`}>{track.artist}</p>
                                  </div>
                                </div>
                                <svg className={`w-5 h-5 ${currentTheme.textMuted} group-hover:${currentTheme.textPrimary}`} fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z"/>
                                </svg>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {searchResults && searchResults.tracks && searchResults.tracks.length === 0 && (
                        <div className="text-center py-8">
                          <p className={currentTheme.textMuted}>No results found.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Emotion-based content */}
                {currentEmotion && (
                  <>
                    {view === 'recommendations' && (
                      <EmotionRecommender 
                        emotion={currentEmotion}
                        playlists={recommendedPlaylists}
                        isLoading={isLoading}
                        error={error}
                        onPlaylistSelect={handlePlaylistSelect}
                      />
                    )}

                    {view === 'tracks' && (
                      <div className={`${currentTheme.cardBg} ${currentTheme.cardBorder} border rounded-xl p-6 ${currentTheme.cardShadow}`}>
                        <div className="flex items-center justify-between mb-6">
                          <button 
                            onClick={() => { setView('recommendations'); setSelectedPlaylistTracks([]); }}
                            className={`flex items-center gap-2 ${currentTheme.textMuted} hover:${currentTheme.textPrimary} font-medium transition-colors`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                            </svg>
                            Back to Playlists
                          </button>
                          <button
                            onClick={() => handlePlay(selectedPlaylistUri || '')}
                            disabled={!isPlayerReady || !selectedPlaylistUri}
                            className={`px-4 py-2 ${currentTheme.buttonBg} ${currentTheme.buttonText} rounded-lg font-medium disabled:opacity-50 ${currentTheme.buttonHover} transition-colors`}
                            title="Play the whole playlist"
                          >
                            Play Playlist
                          </button>
                        </div>
                        
                        <h3 className={`text-xl font-semibold mb-4 ${currentTheme.textPrimary}`}>
                          {(() => {
                            let playlist = null;
                            if (recommendedPlaylists && recommendedPlaylists.length > 0 && selectedPlaylistUri) {
                              playlist = recommendedPlaylists.find((pl: any) => pl.uri === selectedPlaylistUri);
                            }
                            if (!playlist && searchResults && searchResults.playlists && selectedPlaylistUri) {
                              playlist = searchResults.playlists.find((pl: any) => pl.uri === selectedPlaylistUri);
                            }
                            return playlist ? playlist.name : 'Playlist Tracks';
                          })()}
                        </h3>

                        <div className="space-y-2">
                          {isLoading ? (
                            <div className="text-center py-8">
                              <div className={`inline-block animate-spin rounded-full h-6 w-6 border-2 ${currentTheme.border} ${currentTheme.buttonBg}`}></div>
                              <p className={`mt-2 ${currentTheme.textMuted}`}>Loading tracks...</p>
                            </div>
                          ) : (
                            selectedPlaylistTracks.map((track) => (
                              <div 
                                key={track.id} 
                                className={`flex items-center justify-between p-3 ${currentTheme.cardBorder} border rounded-lg hover:${currentTheme.secondary} transition-colors cursor-pointer group`}
                                onClick={() => handlePlay(track.uri)}
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <img 
                                    src={track.image || 'https://via.placeholder.com/48'} 
                                    alt={track.name} 
                                    className={`w-12 h-12 rounded-lg object-cover ${currentTheme.cardBorder} border`}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className={`font-medium ${currentTheme.textPrimary} truncate`}>{track.name}</p>
                                    <p className={`text-sm ${currentTheme.textMuted} truncate`}>{track.artist}</p>
                                  </div>
                                </div>
                                <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z"/>
                                </svg>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="min-h-screen">
              {/* Hero Section */}
              <div className="text-center py-20 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl mb-12">
                <div className="max-w-4xl mx-auto px-6">
                  <h1 className="text-5xl font-bold text-gray-900 mb-6">
                    Music Emotion Recommender
                  </h1>
                  <p className="text-xl text-gray-700 mb-8 leading-relaxed">
                    Discover the perfect soundtrack for your emotions. Our AI-powered system analyzes your facial expressions and recommends personalized Spotify playlists that match your mood.
                  </p>
                  <div className="flex justify-center gap-4 mb-12">
                    <Link href="/register" className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 shadow-lg">
                      Get Started
                    </Link>
                    <Link href="/login" className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
                      Log In
                    </Link>
                  </div>
                  
                  {/* Feature Icons */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Emotion Detection</h3>
                      <p className="text-gray-600">Advanced facial recognition technology to analyze your current emotional state</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Smart Recommendations</h3>
                      <p className="text-gray-600">Curated Spotify playlists that perfectly match your detected emotions</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Personalized Experience</h3>
                      <p className="text-gray-600">Tailored music recommendations based on your unique emotional patterns</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* How It Works Section */}
              <div className="py-16 bg-white">
                <div className="max-w-6xl mx-auto px-6">
                  <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">How It Works</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-2xl font-bold text-white">1</span>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">Capture Your Emotion</h3>
                      <p className="text-gray-600 leading-relaxed">
                        Take a photo or use your camera to capture your current facial expression. Our AI analyzes your emotion in real-time.
                      </p>
                    </div>
                    
                    <div className="text-center">
                      <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-2xl font-bold text-white">2</span>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">AI Analysis</h3>
                      <p className="text-gray-600 leading-relaxed">
                        Advanced machine learning algorithms process your facial features to determine your emotional state with high accuracy.
                      </p>
                    </div>
                    
                    <div className="text-center">
                      <div className="w-20 h-20 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-2xl font-bold text-white">3</span>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">Get Recommendations</h3>
                      <p className="text-gray-600 leading-relaxed">
                        Receive carefully curated Spotify playlists that match your mood and enhance your current emotional experience.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Features Section */}
              <div className="py-16 bg-gray-50">
                <div className="max-w-6xl mx-auto px-6">
                  <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">Key Features</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="bg-white rounded-xl p-8 shadow-lg">
                      <div className="flex items-center mb-6">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900">Multiple Authentication Options</h3>
                      </div>
                      <p className="text-gray-600">Sign up with email or connect instantly with your Google account for seamless access.</p>
                    </div>
                    
                    <div className="bg-white rounded-xl p-8 shadow-lg">
                      <div className="flex items-center mb-6">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900">Real-time Processing</h3>
                      </div>
                      <p className="text-gray-600">Get instant emotion detection and music recommendations without any waiting time.</p>
                    </div>
                    
                    <div className="bg-white rounded-xl p-8 shadow-lg">
                      <div className="flex items-center mb-6">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                          <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900">Spotify Integration</h3>
                      </div>
                      <p className="text-gray-600">Direct integration with Spotify for seamless playlist access and music streaming.</p>
                    </div>
                    
                    <div className="bg-white rounded-xl p-8 shadow-lg">
                      <div className="flex items-center mb-6">
                        <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mr-4">
                          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900">Privacy & Security</h3>
                      </div>
                      <p className="text-gray-600">Your photos are processed securely and never stored permanently on our servers.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Emotions We Detect Section */}
              <div className="py-16 bg-white">
                <div className="max-w-6xl mx-auto px-6">
                  <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">Emotions We Detect</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
                    {[
                      { emotion: 'Happy', icon: '😊', color: 'bg-yellow-100 text-yellow-600' },
                      { emotion: 'Sad', icon: '😢', color: 'bg-blue-100 text-blue-600' },
                      { emotion: 'Angry', icon: '😠', color: 'bg-red-100 text-red-600' },
                      { emotion: 'Surprised', icon: '😲', color: 'bg-purple-100 text-purple-600' },
                      { emotion: 'Neutral', icon: '😐', color: 'bg-gray-100 text-gray-600' },
                      { emotion: 'Excited', icon: '🤩', color: 'bg-green-100 text-green-600' }
                    ].map((item, index) => (
                      <div key={index} className="text-center">
                        <div className={`w-16 h-16 ${item.color} rounded-full flex items-center justify-center mx-auto mb-3`}>
                          <span className="text-2xl">{item.icon}</span>
                        </div>
                        <p className="font-semibold text-gray-900">{item.emotion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Call to Action Section */}
              <div className="py-20 bg-gradient-to-r from-blue-600 to-indigo-700">
                <div className="max-w-4xl mx-auto px-6 text-center">
                  <h2 className="text-4xl font-bold text-white mb-6">
                    Ready to Discover Your Perfect Playlist?
                  </h2>
                  <p className="text-xl text-blue-100 mb-10 leading-relaxed">
                    Join thousands of users who have already found their soundtrack to every emotion. Start your musical journey today!
                  </p>
                  <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <Link href="/register" className="px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-lg">
                      Sign Up for Free
                    </Link>
                    <Link href="/login" className="px-8 py-4 border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-all duration-300">
                      Already have an account?
                    </Link>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="py-12 bg-gray-900">
                <div className="max-w-6xl mx-auto px-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Music Emotion Recommender</h3>
                      <p className="text-gray-400 leading-relaxed">
                        Bridging the gap between your emotions and the perfect soundtrack for every moment.
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-4">Features</h4>
                      <ul className="space-y-2 text-gray-400">
                        <li>• AI Emotion Detection</li>
                        <li>• Spotify Integration</li>
                        <li>• Real-time Recommendations</li>
                        <li>• Secure Authentication</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-4">Technology</h4>
                      <ul className="space-y-2 text-gray-400">
                        <li>• Google Cloud Vision API</li>
                        <li>• Spotify Web API</li>
                        <li>• Next.js Frontend</li>
                        <li>• Node.js Backend</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-800 mt-8 pt-8 text-center">
                    <p className="text-gray-400">
                      © 2025 Music Emotion Recommender. Built with ❤️ for music lovers everywhere.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mini Player - Only show when track is playing and NOT in full screen mode */}
        {currentTrack && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
            {/* Progress Bar at the top of mini player */}
            <div className="w-full bg-gray-200 h-1">
              <div 
                className="h-1 bg-gray-800 transition-all duration-1000"
                style={{ 
                  width: playbackProgress.durationMs > 0 
                    ? `${(playbackProgress.progressMs / playbackProgress.durationMs) * 100}%` 
                    : '0%' 
                }}
              ></div>
            </div>
            
            <div className="max-w-7xl mx-auto px-6 py-3">
              <div className="flex items-center justify-between">
                <div 
                  className="flex items-center space-x-3 cursor-pointer flex-1 min-w-0"
                  onClick={() => setView('playing')}
                >
                  <img 
                    src={currentTrack.album.images[0]?.url || '/placeholder-album.png'} 
                    alt={currentTrack.name}
                    className="w-12 h-12 rounded object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium text-gray-900 truncate text-sm">
                      {currentTrack.name}
                    </h4>
                    <p className="text-xs text-gray-600 truncate">
                      {currentTrack.artists.map(artist => artist.name).join(', ')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <button 
                    onClick={handlePrevious}
                    className="p-2 rounded-full text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                    </svg>
                  </button>

                  <button 
                    onClick={handlePlayPause}
                    className="p-2 rounded-full bg-gray-800 text-white hover:scale-105 transition-transform"
                  >
                    {isPlaying ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    )}
                  </button>

                  <button 
                    onClick={handleNext}
                    className="p-2 rounded-full text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    )}
  </>
);

}

// Function to check camera permission status
  const checkCameraPermission = async () => {
    if (!navigator.permissions) {
      console.log("Permissions API not supported");
      return "unknown";
    }
    
    try {
      const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      console.log("Camera permission status:", permission.state);
      return permission.state;
    } catch (error) {
      console.log("Could not check camera permission:", error);
      return "unknown";
    }
  };


