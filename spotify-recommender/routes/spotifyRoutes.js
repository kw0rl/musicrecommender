// routes/spotifyRoutes.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const dbPool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');
const SpotifyWebApi = require('spotify-web-api-node');

module.exports = function(spotifyApi) {

    const getValidSpotifyToken = async (userId) => {
        try {
            const [users] = await dbPool.query('SELECT spotify_access_token, spotify_refresh_token, spotify_token_expires_at FROM users WHERE id = ?', [userId]);
            if (users.length === 0 || !users[0].spotify_refresh_token) {
                throw new Error('Pengguna tidak mempunyai sambungan Spotify yang sah.');
            }
            const user = users[0];
            
            // Check if token is expired or will expire soon (within 5 minutes)
            const tokenExpiryTime = new Date(user.spotify_token_expires_at);
            const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
            
            if (tokenExpiryTime < fiveMinutesFromNow) {
                console.log(`Token Spotify untuk pengguna ID ${userId} telah tamat tempoh atau akan tamat tempoh tidak lama lagi. Memohon token baru...`);
                const tempSpotifyApi = new SpotifyWebApi({
                    clientId: process.env.SPOTIFY_CLIENT_ID,
                    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
                    refreshToken: user.spotify_refresh_token,
                });
                
                const data = await tempSpotifyApi.refreshAccessToken();
                const newAccessToken = data.body['access_token'];
                const newExpiresIn = data.body['expires_in'];
                const newExpiresAt = new Date();
                newExpiresAt.setSeconds(newExpiresAt.getSeconds() + newExpiresIn);
                
                await dbPool.query('UPDATE users SET spotify_access_token = ?, spotify_token_expires_at = ? WHERE id = ?', [newAccessToken, newExpiresAt, userId]);
                console.log(`Token Spotify baru untuk pengguna ID ${userId} berjaya disimpan. Tamat tempoh pada: ${newExpiresAt}`);
                return newAccessToken;
            }
            
            console.log(`Menggunakan token Spotify sedia ada untuk pengguna ID ${userId}. Tamat tempoh pada: ${tokenExpiryTime}`);
            return user.spotify_access_token;
        } catch (err) {
            console.error(`Ralat mendapatkan token Spotify untuk pengguna ID ${userId}:`, err.message);
            throw err;
        }
    };

  // Endpoint untuk memulakan aliran log masuk Spotify
  // Ia menerima token JWT aplikasi kita sebagai query parameter
  router.get('/login', (req, res) => {
    // Ambil token JWT aplikasi kita dari query parameter URL
    const token = req.query.token;

    if (!token) {
      return res.status(401).send('Ralat: Token pengesahan aplikasi tidak disediakan.');
    }

    try {
      // Sahkan token ini hanya untuk pastikan ia sah sebelum teruskan
      jwt.verify(String(token), process.env.JWT_SECRET);

      const scopes = [
        'streaming',
        'user-read-email',
        'user-read-private',
        'user-read-playback-state',
        'user-modify-playback-state',
        'playlist-read-private',
        'playlist-read-collaborative',
        'playlist-modify-public',
        'playlist-modify-private'
      ];
      
      // Gunakan token JWT aplikasi kita sebagai parameter 'state' untuk dihantar ke Spotify
      // Ini cara kita "ingat" siapa pengguna ini selepas mereka kembali dari Spotify
      // Add show_dialog=true to force re-authorization
      const authorizeURL = spotifyApi.createAuthorizeURL(scopes, String(token)) + '&show_dialog=true';
      
      console.log("Mengarahkan pengguna ke URL kebenaran Spotify...");
      res.redirect(authorizeURL);

    } catch (err) {
      console.error("Token JWT tidak sah semasa cuba memulakan sambungan Spotify:", err.message);
      return res.status(401).send('Token aplikasi tidak sah.');
    }
  });

  // Endpoint untuk menerima callback dari Spotify
  router.get('/callback', async (req, res) => {
    // Spotify akan pulangkan 'code' dan juga 'state' yang kita hantar tadi
    const { code, state, error } = req.query;
    
    // 'state' kini mengandungi token JWT pengguna aplikasi kita
    const userJwt = state;

    if (error) {
      console.error('Ralat callback dari Spotify:', error);
      // Arahkan kembali ke frontend dengan mesej ralat
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/profile?spotify_error=${error}`);
    }
    if (!code || !userJwt) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/profile?spotify_error=invalid_callback`);
    }

    try {
      // Langkah 1: Sahkan token JWT (dari 'state') untuk dapatkan ID pengguna
      const decoded = jwt.verify(String(userJwt), process.env.JWT_SECRET);
      const userId = decoded.user.id;

      if (!userId) {
        throw new Error("Token JWT tidak mengandungi ID pengguna.");
      }

      // Langkah 2: Tukarkan 'authorization code' dari Spotify untuk dapatkan access & refresh token
      const data = await spotifyApi.authorizationCodeGrant(String(code));
      const accessToken = data.body['access_token'];
      const refreshToken = data.body['refresh_token'];
      const expiresIn = data.body['expires_in'];
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

      // Langkah 3: Simpan token-token Spotify ke dalam database untuk pengguna yang betul
      await dbPool.query(
        'UPDATE users SET spotify_access_token = ?, spotify_refresh_token = ?, spotify_token_expires_at = ? WHERE id = ?',
        [accessToken, refreshToken, expiresAt, userId]
      );
      
      console.log(`Token Spotify untuk pengguna ID ${userId} berjaya disimpan.`);
      
      // Langkah 4: Arahkan pengguna kembali ke halaman profil di frontend
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/profile?spotify_connected=true`);

    } catch (err) {
      console.error('Ralat semasa proses callback Spotify:', err.message);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/profile?spotify_error=callback_failed`);
    }
  });

  // Endpoint Carian Muzik (sedia ada dan masih dilindungi authMiddleware)
  router.get('/search', authMiddleware, async (req, res) => {
    const { q, type } = req.query; 
    if (!q) {
      return res.status(400).json({ error: 'Sila masukkan pertanyaan carian dalam parameter "q".' });
    }
    try {
      const searchTypes = type ? String(type).split(',') : ['track'];
      const data = await spotifyApi.search(String(q), searchTypes, { limit: 10 });
      const results = {
        tracks: data.body.tracks ? data.body.tracks.items.filter(t => t).map(track => ({
          id: track.id, name: track.name, artist: track.artists.map(a => a.name).join(', '),
          album: track.album.name, image: track.album.images[0]?.url, uri: track.uri
        })) : [],
        playlists: data.body.playlists ? data.body.playlists.items.filter(p => p).map(playlist => ({
          id: playlist.id, name: playlist.name, owner: playlist.owner.display_name,
          image: playlist.images[0]?.url, uri: playlist.uri
        })) : []
      };
      res.json(results);
    } catch (err) {
      console.error('Ralat semasa mencari di Spotify:', err);
      res.status(500).json({ error: 'Gagal mencari playlist.' });
    }
  });



// ---- ENDPOINT BARU: Dapatkan token akses Spotify untuk Web Playback SDK ----
// GET /api/spotify/playback-token
 // Endpoint untuk dapatkan token playback
    router.get('/playback-token', authMiddleware, async (req, res) => {
        try {
            const accessToken = await getValidSpotifyToken(req.user.id);
            res.json({ accessToken: accessToken });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
// -----------------------------------------------------------------------
    const executePlayerCommand = async (req, res, command) => {
        const { device_id } = req.body;
        if (!device_id && command.name !== 'play') return res.status(400).json({ error: 'device_id diperlukan.' });
        try {
            const accessToken = await getValidSpotifyToken(req.user.id);
            spotifyApi.setAccessToken(accessToken);
            await command(spotifyApi, req.body);
            res.status(204).send();
        } catch (err) {
            console.error(`Ralat semasa arahan pemain:`, err.response ? err.response.body : err.message);
            res.status(500).json({ error: 'Gagal melaksanakan arahan pemain.' });
        }
    };

// GANTIKAN BLOK router.put('/play', ...) SEDIA ADA DENGAN YANG INI:
router.put('/play', authMiddleware, async (req, res) => {
    const { uris, context_uri, device_id, offset } = req.body;

    if (!device_id) {
        return res.status(400).json({ error: 'device_id diperlukan.' });
    }
    if (!uris && !context_uri) {
        return res.status(400).json({ error: 'uris atau context_uri diperlukan.' });
    }

    try {
        const accessToken = await getValidSpotifyToken(req.user.id);
        spotifyApi.setAccessToken(accessToken);

        console.log(`Playing music for user ${req.user.id} on device ${device_id}`);
        console.log('Play request:', { uris, context_uri, device_id, offset });

        // Step 1: Transfer playback to the web player device
        try {
            await spotifyApi.transferMyPlayback([device_id], { play: false });
            await new Promise(res => setTimeout(res, 1000)); // 1 second
        } catch (transferError) {
            console.warn('Transfer playback warning (may be normal):', transferError.response ? transferError.response.body : transferError.message);
        }

        // Step 2: Build play options
        const playOptions = { device_id };
        if (context_uri) {
            playOptions.context_uri = context_uri;
        } else {
            playOptions.uris = uris;
        }
        if (offset) {
            playOptions.offset = offset; // Forward the full offset object
        }

        // Step 3: Play
        await spotifyApi.play(playOptions);

        res.status(204).send();
    } catch (err) {
        let errorMessage = 'Gagal memainkan muzik.';
        let statusCode = 500;

        if (err.response) {
            const spotifyError = err.response.body;
            console.error('Spotify API error response:', spotifyError);
            
            if (spotifyError.error) {
                errorMessage = spotifyError.error.message || spotifyError.error;
                statusCode = err.response.statusCode || 500;
                
                // Handle specific Spotify errors
                if (spotifyError.error.reason === 'NO_ACTIVE_DEVICE') {
                    errorMessage = 'Tiada peranti aktif dijumpai. Sila pastikan aplikasi Spotify terbuka.';
                } else if (spotifyError.error.reason === 'PREMIUM_REQUIRED') {
                    errorMessage = 'Akaun Spotify Premium diperlukan untuk memainkan muzik.';
                } else if (spotifyError.error.reason === 'NOT_FOUND') {
                    errorMessage = 'Lagu atau playlist tidak dijumpai.';
                } else if (statusCode === 403) {
                    errorMessage = 'Akses ditolak. Sila disconnect dan connect semula ke Spotify untuk dapatkan permissions yang baru.';
                }
            }
        } else {
            console.error('Non-HTTP error in play endpoint:', err.message);
            errorMessage = err.message || errorMessage;
        }

        console.error('Ralat dalam endpoint /play:', errorMessage);
        res.status(statusCode).json({ error: errorMessage });
    }
});
// ---------------------------------------------

// GET /api/spotify/shuffle-state?device_id=...
router.get('/shuffle-state', authMiddleware, async (req, res) => {
  const { device_id } = req.query;
  if (!device_id) {
    return res.status(400).json({ error: 'device_id diperlukan.' });
  }
  try {
    const accessToken = await getValidSpotifyToken(req.user.id);
    spotifyApi.setAccessToken(accessToken);
    const data = await spotifyApi.getMyCurrentPlaybackState();
    if (data.body && data.body.device && data.body.device.id === device_id) {
      res.json({ shuffle: data.body.shuffle_state });
    } else {
      res.json({ shuffle: false });
    }
  } catch (err) {
    console.error('Ralat semasa mendapatkan shuffle state:', err);
    res.status(err.statusCode || 500).json({ error: 'Gagal mendapatkan shuffle state.' });
  }
});

// PUT /api/spotify/shuffle?state=true/false&device_id=...
router.put('/shuffle', authMiddleware, async (req, res) => {
  const { state, device_id } = req.query;
  if (typeof state === 'undefined' || !device_id) {
    return res.status(400).json({ error: 'state dan device_id diperlukan.' });
  }
  try {
    const accessToken = await getValidSpotifyToken(req.user.id);
    spotifyApi.setAccessToken(accessToken);
    await spotifyApi.setShuffle(state === 'true', { device_id });
    res.status(204).send();
  } catch (err) {
    console.error('Ralat semasa set shuffle:', err.message);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// PUT /api/spotify/pause
router.put('/pause', authMiddleware, async (req, res) => {
    const { device_id } = req.body;
    try {
        const accessToken = await getValidSpotifyToken(req.user.id);
        spotifyApi.setAccessToken(accessToken);
        await spotifyApi.pause({ device_id });
        res.status(204).send();
    } catch (err) {
        console.error('Ralat semasa jeda:', err.response ? err.response.body : err.message);
        res.status(500).json({ error: 'Gagal menjeda lagu.' });
    }
});

// POST /api/spotify/next
router.post('/next', authMiddleware, async (req, res) => {
    const { device_id } = req.body;
    try {
        const accessToken = await getValidSpotifyToken(req.user.id);
        spotifyApi.setAccessToken(accessToken);
        await spotifyApi.skipToNext({ device_id });
        res.status(204).send();
    } catch (err) {
        console.error('Ralat ke lagu seterusnya:', err.response ? err.response.body : err.message);
        res.status(500).json({ error: 'Gagal ke lagu seterusnya.' });
    }
});

// POST /api/spotify/previous
router.post('/previous', authMiddleware, async (req, res) => {
    const { device_id } = req.body;
    try {
        const accessToken = await getValidSpotifyToken(req.user.id);
        spotifyApi.setAccessToken(accessToken);
        await spotifyApi.skipToPrevious({ device_id });
        res.status(204).send();
    } catch (err) {
        console.error('Ralat ke lagu sebelumnya:', err.response ? err.response.body : err.message);
        res.status(500).json({ error: 'Gagal ke lagu sebelumnya.' });
    }
});

// GET /api/spotify/playlists/:playlistId
router.get('/playlists/:playlistId', authMiddleware, async (req, res) => {
        const { playlistId } = req.params;

        try {
            // Kita guna token server untuk dapatkan senarai lagu
            const data = await spotifyApi.getPlaylistTracks(playlistId, {
                fields: 'items(track(id,name,uri,duration_ms,album(name,images),artists(name)))'
            });

            const tracks = data.body.items
                .filter(item => item.track)
                .map(item => ({
                    id: item.track.id,
                    name: item.track.name,
                    artist: item.track.artists.map(artist => artist.name).join(', '),
                    album: item.track.album.name,
                    image: item.track.album.images[0]?.url,
                    uri: item.track.uri,
                    duration_ms: item.track.duration_ms
                }));
            
            res.json(tracks);

        } catch (err) {
            console.error(`Ralat semasa mendapatkan trek untuk playlist ${playlistId}:`, err);
            res.status(500).json({ error: 'Gagal mendapatkan lagu dari playlist.' });
        }
    });

  // Health check endpoint to test Spotify connection
  router.get('/health', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;
      const token = await getValidSpotifyToken(userId);
      
      if (!token) {
        return res.status(400).json({ 
          connected: false, 
          error: 'Spotify not connected or token expired' 
        });
      }

      spotifyApi.setAccessToken(token);
      const me = await spotifyApi.getMe();
      
      res.json({ 
        connected: true, 
        spotify_user: me.body.display_name
      });
    } catch (err) {
      console.error('Spotify health check failed:', err.response ? err.response.body : err.message);
      res.status(500).json({ 
        connected: false, 
        error: err.message,
        details: err.response ? err.response.body : 'No additional details'
      });
    }
  });

  // Disconnect from Spotify endpoint
  router.post('/disconnect', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;
      
      // Remove ALL Spotify tokens from database completely
      await dbPool.query(
        'UPDATE users SET spotify_access_token = NULL, spotify_refresh_token = NULL, spotify_token_expires_at = NULL WHERE id = ?',
        [userId]
      );
      
      console.log(`User ID ${userId} disconnected from Spotify successfully. All tokens cleared.`);
      res.json({ message: 'Successfully disconnected from Spotify. All tokens cleared.' });
      
    } catch (err) {
      console.error('Error disconnecting from Spotify:', err);
      res.status(500).json({ error: 'Failed to disconnect from Spotify.' });
    }
  });

  // Check token scopes endpoint for debugging
  router.get('/check-scopes', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;
      const token = await getValidSpotifyToken(userId);
      
      if (!token) {
        return res.status(400).json({ error: 'No Spotify connection found.' });
      }
      
      // Test different API calls to see what scopes work
      const tempSpotifyApi = new SpotifyWebApi();
      tempSpotifyApi.setAccessToken(token);
      
      const results = {
        token_exists: true,
        tests: {}
      };
      
      // Test basic profile access
      try {
        await tempSpotifyApi.getMe();
        results.tests.profile_access = 'SUCCESS';
      } catch (err) {
        results.tests.profile_access = `FAILED: ${err.statusCode}`;
      }
      
      // Test playlist search
      try {
        await tempSpotifyApi.searchPlaylists('test', { limit: 1 });
        results.tests.playlist_search = 'SUCCESS';
      } catch (err) {
        results.tests.playlist_search = `FAILED: ${err.statusCode}`;
      }
      
      // Test playback state
      try {
        await tempSpotifyApi.getMyCurrentPlaybackState();
        results.tests.playback_state = 'SUCCESS';
      } catch (err) {
        results.tests.playback_state = `FAILED: ${err.statusCode}`;
      }
      
      res.json(results);
      
    } catch (err) {
      console.error('Error checking scopes:', err);
      res.status(500).json({ error: 'Failed to check scopes.' });
    }
  });

  // Clear Spotify app authorization completely
  router.post('/force-reauth', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;
      
      // Clear ALL tokens from database
      await dbPool.query(
        'UPDATE users SET spotify_access_token = NULL, spotify_refresh_token = NULL, spotify_token_expires_at = NULL WHERE id = ?',
        [userId]
      );
      
      // Generate new authorization URL with show_dialog=true
      const token = req.headers.authorization?.split(' ')[1];
      const scopes = [
        'streaming',
        'user-read-email',
        'user-read-private',
        'user-read-playback-state',
        'user-modify-playback-state',
        'playlist-read-private',
        'playlist-read-collaborative',
        'playlist-modify-public',
        'playlist-modify-private'
      ];
      
      const authorizeURL = spotifyApi.createAuthorizeURL(scopes, String(token)) + '&show_dialog=true';
      
      console.log(`Force re-authorization for user ID ${userId}`);
      res.json({ 
        message: 'Tokens cleared. Please use this URL to re-authorize.',
        authorization_url: authorizeURL
      });
      
    } catch (err) {
      console.error('Error forcing re-authorization:', err);
      res.status(500).json({ error: 'Failed to force re-authorization.' });
    }
  });

  // Force token refresh endpoint for debugging
  router.post('/force-refresh', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;
      
      // Get current tokens
      const [users] = await dbPool.query(
        'SELECT spotify_refresh_token FROM users WHERE id = ?', 
        [userId]
      );
      
      if (users.length === 0 || !users[0].spotify_refresh_token) {
        return res.status(400).json({ error: 'No Spotify connection found. Please connect first.' });
      }
      
      // Force refresh with new scopes
      const tempSpotifyApi = new SpotifyWebApi({
        clientId: process.env.SPOTIFY_CLIENT_ID,
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
        redirectUri: process.env.SPOTIFY_REDIRECT_URI
      });
      
      tempSpotifyApi.setRefreshToken(users[0].spotify_refresh_token);
      const data = await tempSpotifyApi.refreshAccessToken();
      const newAccessToken = data.body.access_token;
      const newExpiryTime = new Date(Date.now() + data.body.expires_in * 1000);
      
      // Update with new token
      await dbPool.query(
        'UPDATE users SET spotify_access_token = ?, spotify_token_expires_at = ? WHERE id = ?',
        [newAccessToken, newExpiryTime, userId]
      );
      
      console.log(`Force refresh successful for user ID ${userId}`);
      res.json({ message: 'Token refreshed successfully.' });
      
    } catch (err) {
      console.error('Error force refreshing token:', err);
      res.status(500).json({ error: 'Failed to refresh token.' });
    }
  });

  return router;
};

// Export getValidSpotifyToken function for use in other modules  
module.exports.getValidSpotifyToken = (userId) => {
  const dbPool = require('../db');
  const SpotifyWebApi = require('spotify-web-api-node');
  
  return new Promise(async (resolve, reject) => {
    try {
      const [users] = await dbPool.query('SELECT spotify_access_token, spotify_refresh_token, spotify_token_expires_at FROM users WHERE id = ?', [userId]);
      if (users.length === 0 || !users[0].spotify_refresh_token) {
        throw new Error('Pengguna tidak mempunyai sambungan Spotify yang sah.');
      }
      const user = users[0];
      
      // Check if token is expired or will expire soon (within 5 minutes)
      const tokenExpiryTime = new Date(user.spotify_token_expires_at);
      const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
      
      if (tokenExpiryTime < fiveMinutesFromNow) {
        console.log(`Token Spotify untuk pengguna ID ${userId} telah tamat tempoh atau akan tamat tempoh tidak lama lagi. Memohon token baru...`);
        const tempSpotifyApi = new SpotifyWebApi({
          clientId: process.env.SPOTIFY_CLIENT_ID,
          clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
          redirectUri: process.env.SPOTIFY_REDIRECT_URI
        });
        
        tempSpotifyApi.setRefreshToken(user.spotify_refresh_token);
        const data = await tempSpotifyApi.refreshAccessToken();
        const newAccessToken = data.body.access_token;
        const newExpiryTime = new Date(Date.now() + data.body.expires_in * 1000);
        
        await dbPool.query(
          'UPDATE users SET spotify_access_token = ?, spotify_token_expires_at = ? WHERE id = ?',
          [newAccessToken, newExpiryTime, userId]
        );
        
        console.log(`Token Spotify baru untuk pengguna ID ${userId} berjaya disimpan. Tamat tempoh pada: ${newExpiryTime}`);
        resolve(newAccessToken);
      } else {
        console.log(`Menggunakan token Spotify sedia ada untuk pengguna ID ${userId}. Tamat tempoh pada: ${tokenExpiryTime}`);
        resolve(user.spotify_access_token);
      }
    } catch (error) {
      console.error(`Ralat mendapatkan token Spotify untuk pengguna ID ${userId}:`, error.message);
      reject(error);
    }
  });
};