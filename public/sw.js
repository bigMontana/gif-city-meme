const CACHE_NAME = 'face-meme-maker-cache-v1';
const VIDEO_CACHE_NAME = 'face-meme-maker-videos-v1';

// Files to cache for app shell
const appFiles = [
  '/',
  '/index.html',
  '/src/app.js',
  '/src/supabase.js',
  '/assets/images/logo.png',
  '/view_single.html',
  '/profile.html',
  '/styles.css',
  '/src/assets/images/GERGFACE.png'
];

// Install event - cache app shell files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching app shell files');
        return cache.addAll(appFiles);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME && key !== VIDEO_CACHE_NAME) {
          console.log('Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

// Fetch event - serve from cache if available
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Special handling for video files
  if (event.request.url.includes('video-cache/')) {
    event.respondWith(handleVideoFetch(event.request));
    return;
  }

  // Handle regular resource fetches
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        
        return fetch(event.request).then((response) => {
          // Skip caching for non GET requests or partial responses
          if (event.request.method !== 'GET' || !response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response since it can only be consumed once
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
  );
});

// Function to handle video fetches
async function handleVideoFetch(request) {
  // Check if the video is in the cache
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  // Fetch the video if not in cache
  try {
    const response = await fetch(request);
    const cache = await caches.open(VIDEO_CACHE_NAME);
    
    // Clone the response and put it in the cache
    cache.put(request, response.clone());
    
    return response;
  } catch (error) {
    console.error('Video fetch failed:', error);
    // Could return a fallback response here
    return new Response('Video fetch failed', { status: 500 });
  }
}

// Message event - handle cache management commands
self.addEventListener('message', (event) => {
  if (event.data && event.data.action) {
    switch (event.data.action) {
      case 'cacheVideo':
        // Cache a specific video
        if (event.data.videoUrl && event.data.cacheKey) {
          cacheVideo(event.data.videoUrl, event.data.cacheKey);
        }
        break;
      
      case 'deleteVideo':
        // Delete a specific video from cache
        if (event.data.cacheKey) {
          deleteVideoFromCache(event.data.cacheKey);
        }
        break;
        
      case 'clearVideoCache':
        // Clear entire video cache
        clearVideoCache();
        break;
    }
  }
});

// Function to cache a video
async function cacheVideo(videoUrl, cacheKey) {
  try {
    const cache = await caches.open(VIDEO_CACHE_NAME);
    const response = await fetch(videoUrl);
    await cache.put(`video-cache/${cacheKey}`, response);
    console.log(`Video cached with key: ${cacheKey}`);
    return true;
  } catch (error) {
    console.error('Failed to cache video:', error);
    return false;
  }
}

// Function to delete a video from cache
async function deleteVideoFromCache(cacheKey) {
  try {
    const cache = await caches.open(VIDEO_CACHE_NAME);
    await cache.delete(`video-cache/${cacheKey}`);
    console.log(`Video with key ${cacheKey} deleted from cache`);
    return true;
  } catch (error) {
    console.error('Failed to delete video from cache:', error);
    return false;
  }
}

// Function to clear entire video cache
async function clearVideoCache() {
  try {
    await caches.delete(VIDEO_CACHE_NAME);
    console.log('Video cache cleared');
    return true;
  } catch (error) {
    console.error('Failed to clear video cache:', error);
    return false;
  }
} 