// Add at the beginning of your DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', () => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker registered with scope:', registration.scope);
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    }
    
    // The rest of your existing code...
    let currentFrame = 0;
    // ...

    // Add video caching utility functions
    const videoCacheManager = {
        async cacheVideo(videoBlob, cacheKey) {
            if (!navigator.serviceWorker.controller) {
                console.warn('Service Worker not controlling the page yet, cannot cache video');
                return false;
            }
            
            // Store the video in IndexedDB for more reliable storage
            await this.storeVideoInIndexedDB(videoBlob, cacheKey);
            
            // Create a unique URL for this cached video
            const videoUrl = `video-cache/${cacheKey}`;
            
            // Tell the service worker to cache this video
            navigator.serviceWorker.controller.postMessage({
                action: 'cacheVideo',
                videoUrl: URL.createObjectURL(videoBlob),
                cacheKey: cacheKey
            });
            
            return videoUrl;
        },
        
        async getVideoFromCache(cacheKey) {
            // Try to get from IndexedDB first
            const blob = await this.getVideoFromIndexedDB(cacheKey);
            if (blob) {
                return URL.createObjectURL(blob);
            }
            
            // Fallback to Cache API
            const cache = await caches.open('face-meme-maker-videos-v1');
            const response = await cache.match(`video-cache/${cacheKey}`);
            
            if (response) {
                return URL.createObjectURL(await response.blob());
            }
            
            return null;
        },
        
        async deleteVideo(cacheKey) {
            // Delete from IndexedDB
            await this.deleteVideoFromIndexedDB(cacheKey);
            
            // Delete from Cache API via service worker
            if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    action: 'deleteVideo',
                    cacheKey: cacheKey
                });
            }
        },
        
        // IndexedDB methods for more reliable storage
        async storeVideoInIndexedDB(videoBlob, cacheKey) {
            return new Promise((resolve, reject) => {
                const dbRequest = indexedDB.open('VideoCache', 1);
                
                dbRequest.onupgradeneeded = function(event) {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains('videos')) {
                        db.createObjectStore('videos', { keyPath: 'id' });
                    }
                };
                
                dbRequest.onsuccess = function(event) {
                    const db = event.target.result;
                    const transaction = db.transaction(['videos'], 'readwrite');
                    const store = transaction.objectStore('videos');
                    
                    const storeRequest = store.put({
                        id: cacheKey,
                        blob: videoBlob,
                        timestamp: Date.now()
                    });
                    
                    storeRequest.onsuccess = () => resolve(true);
                    storeRequest.onerror = (error) => reject(error);
                };
                
                dbRequest.onerror = function(event) {
                    reject('IndexedDB error: ' + event.target.errorCode);
                };
            });
        },
        
        async getVideoFromIndexedDB(cacheKey) {
            return new Promise((resolve, reject) => {
                const dbRequest = indexedDB.open('VideoCache', 1);
                
                dbRequest.onsuccess = function(event) {
                    const db = event.target.result;
                    const transaction = db.transaction(['videos'], 'readonly');
                    const store = transaction.objectStore('videos');
                    
                    const getRequest = store.get(cacheKey);
                    
                    getRequest.onsuccess = function(event) {
                        if (event.target.result) {
                            resolve(event.target.result.blob);
                        } else {
                            resolve(null);
                        }
                    };
                    
                    getRequest.onerror = function(error) {
                        reject(error);
                    };
                };
                
                dbRequest.onerror = function(event) {
                    reject('IndexedDB error: ' + event.target.errorCode);
                };
            });
        },
        
        async deleteVideoFromIndexedDB(cacheKey) {
            return new Promise((resolve, reject) => {
                const dbRequest = indexedDB.open('VideoCache', 1);
                
                dbRequest.onsuccess = function(event) {
                    const db = event.target.result;
                    const transaction = db.transaction(['videos'], 'readwrite');
                    const store = transaction.objectStore('videos');
                    
                    const deleteRequest = store.delete(cacheKey);
                    
                    deleteRequest.onsuccess = function() {
                        resolve(true);
                    };
                    
                    deleteRequest.onerror = function(error) {
                        reject(error);
                    };
                };
                
                dbRequest.onerror = function(event) {
                    reject('IndexedDB error: ' + event.target.errorCode);
                };
            });
        }
    };

    // Now update handleVideoUpload to use caching
    async function handleVideoUpload(e) {
        const file = e.target.files[0];
        if (file) {
            // Generate a unique cache key for this video (using the file name and size)
            const cacheKey = `${file.name.replace(/[^a-z0-9]/gi, '-')}_${file.size}_${Date.now()}`;
            
            // First, check if we have this video cached already (using some video metadata)
            const cachedVideoUrl = await videoCacheManager.getVideoFromCache(cacheKey);
            
            if (cachedVideoUrl) {
                console.log('Using cached video:', cachedVideoUrl);
                video.src = cachedVideoUrl;
            } else {
                console.log('Caching new video:', file.name);
                // Create a URL for the video file
                const videoUrl = URL.createObjectURL(file);
                video.src = videoUrl;
                
                // Cache the video for future use
                videoCacheManager.cacheVideo(file, cacheKey);
            }
            
            video.addEventListener('loadedmetadata', () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                totalFrames = Math.floor(video.duration * frameRate);
                totalFramesDisplay.textContent = totalFrames;
                
                const scrubber = document.getElementById('videoScrubber');
                scrubber.max = totalFrames - 1;
                scrubber.value = 0;
                
                currentFrameDisplay.textContent = '0';
                video.currentTime = 0;
                drawFrame();
                updateFrameMarkers();
            }, { once: true });
            
            e.target.value = '';
        }
    }
    
    // Replace the original handleVideoUpload function
    // Other code remains the same...
}); 