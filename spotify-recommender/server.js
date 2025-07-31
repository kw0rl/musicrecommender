// server.js (Full and Complete Version - Using spotifyRoutes.js)

// Import necessary modules
const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');
const cors = require('cors');
require('dotenv').config();
const vision = require('@google-cloud/vision');
const path = require('path'); 
const fs = require('fs');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const passport = require('passport');
const authMiddleware = require('./middleware/authMiddleware');

// Initialize Express app
const app = express();
const port = process.env.PORT || 3001;


const uploadsDir = path.join(__dirname, 'uploads', 'profile-images');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(express.json({ limit: '10mb' }));

// CORS Configuration for production
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [process.env.FRONTEND_URL]
  : ['http://localhost:3000', 'http://localhost:3002'];

app.use(cors({ 
    origin: allowedOrigins,
    credentials: true // Enable credentials for CORS
}));


// MySQL session store configuration
const sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

app.use(session({
  key: 'session_cookie_name',
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true in production with HTTPS
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Serve static files with CORS headers and cache control
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  
  // Add cache control headers to prevent aggressive caching
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Initialize API Clients with proper Google credentials handling
let visionClient;
try {
  // First, try to use credentials from environment variable
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    visionClient = new vision.ImageAnnotatorClient({
      credentials: credentials
    });
    console.log('Google Vision client initialized with environment credentials');
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Fallback to application credentials file path
    visionClient = new vision.ImageAnnotatorClient();
    console.log('Google Vision client initialized with application credentials file');
  } else {
    // Try default authentication
    visionClient = new vision.ImageAnnotatorClient();
    console.log('Google Vision client initialized with default authentication');
  }
} catch (error) {
  console.error('Failed to initialize Google Vision client:', error.message);
  // Create a mock client that will throw an error when used
  visionClient = {
    annotateImage: async () => {
      throw new Error('Google Vision API not properly configured. Please set GOOGLE_CREDENTIALS_JSON environment variable.');
    }
  };
}

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI
});
const spotifyRoutes = require('./routes/spotifyRoutes')(spotifyApi);
app.use('/api/spotify', spotifyRoutes);

// ---- External Route Section ----



try {
  // ---- LOAD ROUTES FROM EXTERNAL FILES ----
  // Load auth routes
  const authRoutes = require('./routes/authRoutes');
  app.use('/api/auth', authRoutes); 
  console.log('Auth routes loaded successfully.');

  // Load Google Auth routes  
  const googleAuthRoutes = require('./routes/googleAuthRoutes');
  app.use('/auth', googleAuthRoutes);
  console.log('Google Auth routes loaded successfully.');

  // Load admin routes
  const adminRoutes = require('./routes/adminRoutes');
  app.use('/api/admin', adminRoutes);
  console.log('Admin routes loaded successfully.');


  // ---- SPOTIFY ROUTES CODE Goes Here ----
  // We pass the existing 'spotifyApi' object into the route file


  console.log('Spotify routes loaded successfully.');
  // ----------------------------------------

} catch (e) {
  console.error("Error loading external routes:", e);
}
// ---- End of Route Section ----

// Function to get Spotify access token
const grantSpotifyAccessToken = async () => {
  try {
    const data = await spotifyApi.clientCredentialsGrant();
    const accessToken = data.body['access_token'];
    const expiresIn = data.body['expires_in'];
    spotifyApi.setAccessToken(accessToken);
    console.log('Spotify access token granted successfully!');
    console.log('Token expires in:', expiresIn, 'seconds');
    const refreshTimeout = (expiresIn - 300) * 1000;
    setTimeout(grantSpotifyAccessToken, refreshTimeout);
  } catch (err) {
    console.error('Error retrieving Spotify access token:', err.message);
    setTimeout(grantSpotifyAccessToken, 60000);
  }
};

// Import getValidSpotifyToken from spotifyRoutes
const { getValidSpotifyToken } = require('./routes/spotifyRoutes');

// Function to search playlists based on emotion with user token
async function getPlaylistForEmotionWithUserToken(emotion, userSpotifyApi) {
    let searchQuery = '';
    const searchOptions = { limit: 50, offset: 0 };
    switch (emotion.toLowerCase()) {
        case 'happy': searchQuery = 'happy pop uplifting'; break;
        case 'sad': searchQuery = 'sad slow chill'; break;
        case 'angry': searchQuery = 'angry workout rock'; break;
        case 'neutral': {
            const randomTerms = ['music', 'hits', 'mix', 'songs', 'playlist', 'top'];
            const randomQuery = randomTerms[Math.floor(Math.random() * randomTerms.length)];
            try {
                const data = await userSpotifyApi.searchPlaylists(randomQuery, searchOptions);
                if (data.body?.playlists?.items?.length > 0) {
                    const validPlaylists = data.body.playlists.items
                        .filter(p => p && p.name && p.id)
                        .map(p => ({
                            id: p.id,
                            name: p.name,
                            description: p.description || 'Tiada deskripsi.',
                            image: p.images[0]?.url || null,
                            uri: p.uri,
                            owner: p.owner?.display_name || p.owner?.id || 'Unknown'
                        }))
                        .filter(p =>
                            !/spotify/i.test(p.owner) &&
                            !/records|band|artist|label|official|music|verified|company|group|collective|entertainment|media|radio|club|team|choir|ensemble/i.test(p.owner)
                        );
                    if (validPlaylists.length > 0) {
                        // Shuffle and pick 10 random playlists
                        const shuffled = validPlaylists.sort(() => 0.5 - Math.random());
                        return shuffled.slice(0, 10);
                    }
                }
                return [];
            } catch (err) {
                console.error(`Error fetching random playlist for neutral emotion:`, err);
                return null;
            }
        }
        default: break;
    }

    try {
        console.log(`Searching Spotify for playlists with query: "${searchQuery}" for emotion: "${emotion}"`);
        const data = await userSpotifyApi.searchPlaylists(searchQuery, searchOptions);

        if (data.body?.playlists?.items?.length > 0) {
            const validPlaylists = data.body.playlists.items
                .filter(p => p && p.name && p.id)
                .map(p => ({
                    id: p.id,
                    name: p.name,
                    description: p.description || 'Tiada deskripsi.',
                    image: p.images[0]?.url || null,
                    uri: p.uri,
                    owner: p.owner?.display_name || p.owner?.id || 'Unknown'
                }))
                .filter(p =>
                    !/spotify/i.test(p.owner) &&
                    !/records|band|artist|label|official|music|verified|company|group|collective|entertainment|media|radio|club|team|choir|ensemble/i.test(p.owner)
                );

            // Return first 50 playlists
            return validPlaylists.slice(0, 50);
        }

        return [];

    } catch (err) {
        console.error(`Critical error in getPlaylistForEmotionWithUserToken for emotion "${emotion}":`, err);
        return null;
    }
}

// Function to search playlists based on emotion (old version - keep for backward compatibility)
async function getPlaylistForEmotion(emotion) {
    let searchQuery = '';
    const searchOptions = { limit: 50, offset: 0 };
    switch (emotion.toLowerCase()) {
        case 'happy': searchQuery = 'happy pop uplifting'; break;
        case 'sad': searchQuery = 'sad slow chill'; break;
        case 'angry': searchQuery = 'angry workout rock'; break;
        case 'neutral': {
            const randomTerms = ['music', 'hits', 'mix', 'songs', 'playlist', 'top'];
            const randomQuery = randomTerms[Math.floor(Math.random() * randomTerms.length)];
            try {
                const data = await spotifyApi.searchPlaylists(randomQuery, searchOptions);
                if (data.body?.playlists?.items?.length > 0) {
                    const validPlaylists = data.body.playlists.items
                        .filter(p => p && p.name && p.id)
                        .map(p => ({
                            id: p.id,
                            name: p.name,
                            description: p.description || 'Tiada deskripsi.',
                            image: p.images[0]?.url || null,
                            uri: p.uri,
                            owner: p.owner?.display_name || p.owner?.id || 'Unknown'
                        }))
                        .filter(p =>
                            !/spotify/i.test(p.owner) &&
                            !/records|band|artist|label|official|music|verified|company|group|collective|entertainment|media|radio|club|team|choir|ensemble/i.test(p.owner)
                        );
                    if (validPlaylists.length > 0) {
                        // Shuffle and pick 10 random playlists
                        const shuffled = validPlaylists.sort(() => 0.5 - Math.random());
                        return shuffled.slice(0, 10);
                    }
                }
                return [];
            } catch (err) {
                console.error(`Error fetching random playlist for neutral emotion:`, err.message);
                if (err.statusCode === 401) await grantSpotifyAccessToken();
                return null;
            }
        }
        default: break;
    }

    try {
        console.log(`Searching Spotify for playlists with query: "${searchQuery}" for emotion: "${emotion}"`);
        const data = await spotifyApi.searchPlaylists(searchQuery, searchOptions);

        if (data.body?.playlists?.items?.length > 0) {
            const validPlaylists = data.body.playlists.items
                .filter(p => p && p.name && p.id)
                .map(p => ({
                    id: p.id,
                    name: p.name,
                    description: p.description || 'Tiada deskripsi.',
                    image: p.images[0]?.url || null,
                    uri: p.uri,
                    owner: p.owner?.display_name || p.owner?.id || 'Unknown'
                }))
                .filter(p =>
                    !/spotify/i.test(p.owner) &&
                    !/records|band|artist|label|official|music|verified|company|group|collective|entertainment|media|radio|club|team|choir|ensemble/i.test(p.owner)
                );

            // Return first 10 playlists
            return validPlaylists.slice(0, 50);
        }

        return [];

    } catch (err) {
        console.error(`Critical error in getPlaylistForEmotion for emotion "${emotion}":`, err);
        if (err.statusCode === 401) {
            await grantSpotifyAccessToken();
        } else if (err.statusCode === 403) {
            console.error('Access forbidden - user needs to reconnect with new scopes');
        }
        return null;
    }
}
// === API ENDPOINTS (Still Defined Inside server.js) ===

// Emotion-based playlist recommendation endpoint
app.get('/recommendations/:emotion', authMiddleware, async (req, res) => {
  const { emotion } = req.params;
  const userId = req.user.id;
  
  try {
    // First try with user's Spotify token
    const userSpotifyToken = await getValidSpotifyToken(userId);
    if (!userSpotifyToken) {
      return res.status(400).json({ 
        error: 'Spotify not connected. Please connect your Spotify account first.' 
      });
    }
    
    // Create temporary SpotifyApi instance with user token
    const userSpotifyApi = new SpotifyWebApi();
    userSpotifyApi.setAccessToken(userSpotifyToken);
    
    // Get playlist using user token
    let playlistData = await getPlaylistForEmotionWithUserToken(emotion, userSpotifyApi);
    
    // If user token fails, fallback to global client credentials
    if (!playlistData) {
      console.log(`User token failed for user ${userId}, trying with global client credentials...`);
      playlistData = await getPlaylistForEmotion(emotion);
    }
    
    if (playlistData) {
      res.json({ emotion, playlist: playlistData });
    } else {
      res.status(404).json({ error: `Could not find a suitable playlist for the emotion: ${emotion}.` });
    }
  } catch (error) {
    console.error('Error in recommendations endpoint:', error);
    
    // Final fallback - try with global client credentials
    try {
      console.log(`Final fallback for user ${userId}, using global client credentials...`);
      const playlistData = await getPlaylistForEmotion(emotion);
      if (playlistData) {
        res.json({ emotion, playlist: playlistData });
      } else {
        res.status(500).json({ error: 'Failed to get recommendations. Please try again.' });
      }
    } catch (fallbackError) {
      console.error('Even fallback failed:', fallbackError);
      res.status(500).json({ error: 'Failed to get recommendations. Please try again.' });
    }
  }
});

// Replace the old app.post('/api/detect-emotion', ...) block with this one:
app.post('/api/detect-emotion', async (req, res) => {
  try {
    const { image } = req.body; 
    if (!image) return res.status(400).json({ error: 'No image data provided.' });

    const request = {
      image: { content: image },
      features: [{ type: 'FACE_DETECTION', maxResults: 1 }], 
    };

    console.log('Sending request to Cloud Vision API...');
    const [result] = await visionClient.annotateImage(request); 
    const faces = result.faceAnnotations;

    if (!faces || faces.length === 0) {
      return res.status(400).json({ error: 'No face detected.' });
    }

    const face = faces[0]; 
    
    // ---- NEW LOGIC STARTS HERE ----

    // 1. Create a mapping from likelihood levels (string) to scores (number)
    const likelihoodScores = {
      'UNKNOWN': 0,
      'VERY_UNLIKELY': 1,
      'UNLIKELY': 2,
      'POSSIBLE': 3,
      'LIKELY': 4,
      'VERY_LIKELY': 5
    };

    // 2. Get scores for the emotions we care about
    const emotionScores = {
      happy: likelihoodScores[face.joyLikelihood] || 0,
      sad: likelihoodScores[face.sorrowLikelihood] || 0,
      angry: likelihoodScores[face.angerLikelihood] || 0
    };

    console.log('Detected emotion scores:', emotionScores);

    // 3. Find the emotion with the highest score
    let mainEmotion = 'neutral';
    let maxScore = 0;

    for (const emotion in emotionScores) {
      if (emotionScores[emotion] > maxScore) {
        maxScore = emotionScores[emotion];
        mainEmotion = emotion;
      }
    }

    // 4. Set a minimum threshold to avoid inaccurate guesses
    const minimumThreshold = 2; 
    if (maxScore < minimumThreshold) {
      mainEmotion = 'neutral';
    }

    console.log(`Selected primary emotion based on highest score: "${mainEmotion}" with score ${maxScore}`);
    
    // Send back the selected emotion
    res.json({ emotion: mainEmotion });

    // ---- NEW LOGIC ENDS HERE ----

  } catch (error) {
    console.error('Error during emotion detection with Cloud Vision API:', error);
    res.status(500).json({ error: 'Server error while processing the image.' });
  }
});

// Direct image serving endpoint for testing
app.get('/api/serve-image/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const imagePath = path.join(__dirname, 'uploads', 'profile-images', filename);
    
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    // Set proper headers
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Send file
    res.sendFile(imagePath);
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Debug endpoint for profile images
app.get('/api/debug-profile-images', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const [users] = await dbPool.query('SELECT profile_image FROM users WHERE id = ?', [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = users[0];
    const debug_info = {
      user_id: userId,
      profile_image_path: user.profile_image,
      full_url: user.profile_image ? `${process.env.BACKEND_URL || `http://localhost:${port}`}${user.profile_image}` : null,
      alternative_url: user.profile_image ? `${process.env.BACKEND_URL || `http://localhost:${port}`}/api/serve-image/${path.basename(user.profile_image)}` : null,
      uploads_dir_exists: fs.existsSync(path.join(__dirname, 'uploads')),
      profile_images_dir_exists: fs.existsSync(path.join(__dirname, 'uploads', 'profile-images')),
      backend_url: process.env.BACKEND_URL || `http://localhost:${port}`,
    };
    
    // Check if actual image file exists
    if (user.profile_image) {
      const imagePath = path.join(__dirname, user.profile_image);
      debug_info.image_file_exists = fs.existsSync(imagePath);
      debug_info.image_full_path = imagePath;
    }
    
    res.json(debug_info);
  } catch (error) {
    console.error('Debug profile images error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start the server
app.listen(port, async () => {
  const backendUrl = process.env.BACKEND_URL || `http://localhost:${port}`;
  console.log(`Recommendation service listening at ${backendUrl}`);
  await grantSpotifyAccessToken();
});
