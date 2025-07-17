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
const passport = require('passport');

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
  ? [process.env.FRONTEND_URL, 'https://your-app-name.ondigitalocean.app']
  : ['http://localhost:3000', 'http://localhost:3002'];

app.use(cors({ 
    origin: allowedOrigins,
    credentials: true // Enable credentials for CORS
}));

// Session middleware (required for Passport)
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true in production with HTTPS
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize API Clients
const visionClient = new vision.ImageAnnotatorClient();
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: 'http://127.0.0.1:3001/api/spotify/callback' 
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

  // Load test routes
  const testRoutes = require('./routes/testRoutes');
  app.use('/api/test', testRoutes);
  console.log('Test routes loaded successfully.');

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

// Function to search playlists based on emotion
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
        console.error(`Critical error in getPlaylistForEmotion for emotion "${emotion}":`, err.message);
        if (err.statusCode === 401) await grantSpotifyAccessToken();
        return null;
    }
}
// === API ENDPOINTS (Still Defined Inside server.js) ===

// Emotion-based playlist recommendation endpoint
app.get('/recommendations/:emotion', async (req, res) => {
  const { emotion } = req.params;
  const playlistData = await getPlaylistForEmotion(emotion);
  if (playlistData) {
    res.json({ emotion, playlist: playlistData });
  } else {
    res.status(404).json({ error: `Could not find a suitable playlist for the emotion: ${emotion}.` });
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

// Start the server
app.listen(port, async () => {
  console.log(`Recommendation service listening at http://localhost:${port}`);
  await grantSpotifyAccessToken(); 
});
