document.addEventListener('DOMContentLoaded', () => {
    // Canvas setup
    const canvas = document.getElementById('videoCanvas');
    const ctx = canvas.getContext('2d');
    const video = document.createElement('video');
    video.src = '02_ChairShot.mp4';
    
    // Add image replacement functionality for default face - Move this up near the start
    const replaceImageButton = document.getElementById('replaceImageButton');
    const replaceImageUpload = document.getElementById('replaceImageUpload');

    replaceImageButton.addEventListener('click', () => {
        replaceImageUpload.click();
    });

    replaceImageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            // Create URL for the uploaded image
            const imageUrl = URL.createObjectURL(file);
            
            // Update only face1's image
            faces.face1.overlayImage.src = imageUrl;

            // Wait for image to load before redrawing
            faces.face1.overlayImage.onload = () => {
                // Force redraw
                drawFrame();
            };

            // Clean up the file input
            e.target.value = '';
        }
    });

    // Set initial dimensions (we'll update these when video loads)
    canvas.width = 1920;
    canvas.height = 1080;

    let currentFrame = 0;
    let totalFrames = 100;
    const frameRate = 30;

    // Create overlay image
    const overlayImage = new Image();
    overlayImage.src = 'GERGFACE.png';

    // Control elements
    const posX = document.getElementById('posX');
    const posY = document.getElementById('posY');
    const scale = document.getElementById('scale');
    const scaleX = document.getElementById('scaleX');
    const scaleY = document.getElementById('scaleY');
    const rotation = document.getElementById('rotation');
    const xFlip = document.getElementById('xFlip');
    const hideFace = document.getElementById('hideFace');

    // Value display elements
    const posXValue = document.getElementById('posXValue');
    const posYValue = document.getElementById('posYValue');
    const scaleValue = document.getElementById('scaleValue');
    const scaleXValue = document.getElementById('scaleXValue');
    const scaleYValue = document.getElementById('scaleYValue');
    const rotationValue = document.getElementById('rotationValue');

    // Store frame data
    let frameData = {};

    // Add at the top with other element selections
    const currentFrameDisplay = document.getElementById('currentFrameDisplay');
    const totalFramesDisplay = document.getElementById('totalFramesDisplay');

    // Add this at the top with other state variables
    let usedImageNames = new Set(['Default']);

    // Add face management with colors
    let faces = {
        face1: {
            overlayImage: new Image(),
            frameData: {
                0: {  // Add initial data for frame 0
                    position: { x: 0, y: 0 },
                    scale: 1,
                    scaleX: 1,
                    scaleY: 1,
                    finalScale: { x: 1, y: 1 },
                    rotation: 0,
                    xFlip: false,
                    imageName: 'Default'
                }
            },
            imageName: 'Default',
            color: 'rgba(255, 0, 0, 0.3)' // Red with 0.3 opacity
        }
    };
    let currentFace = 'face1';
    faces.face1.overlayImage.src = 'GERGFACE.png';

    // Initialize controls with face1 data
    updateControlsFromData(faces.face1.frameData[0]);
    updateUIColors();

    // Replace face selector functionality with toggle button
    const toggleFaceButton = document.getElementById('toggleFace');
    const addFaceButton = document.getElementById('addFaceButton');
    const faceImageUpload = document.getElementById('faceImageUpload');
    
    // Add click handler for Add New Face button
    addFaceButton.addEventListener('click', () => {
        faceImageUpload.click();
    });

    toggleFaceButton.addEventListener('click', () => {
        const faceIds = Object.keys(faces);
        const currentIndex = faceIds.indexOf(currentFace);
        const nextIndex = (currentIndex + 1) % faceIds.length;
        currentFace = faceIds[nextIndex];
        
        // Update button text
        toggleFaceButton.textContent = `Face ${currentFace.replace('face', '')}`;
        
        // Update controls and colors
        updateControlsFromData(faces[currentFace].frameData[Math.floor(currentFrame)]);
        updateUIColors();
    });

    // Update the face creation code
    faceImageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const faceNum = Object.keys(faces).length + 1;
            const faceId = `face${faceNum}`;
            
            // Create new face object with color
            faces[faceId] = {
                overlayImage: new Image(),
                frameData: {
                    0: {  // Add initial data for frame 0
                        position: { x: 0, y: 0 },
                        scale: 1,
                        scaleX: 1,
                        scaleY: 1,
                        finalScale: { x: 1, y: 1 },
                        rotation: 0,
                        xFlip: false,
                        imageName: 'Default'
                    }
                },
                imageName: 'Default',
                color: 'rgba(0, 0, 255, 0.3)' // Blue with 0.3 opacity
            };

            // Create URL for the uploaded image
            const imageUrl = URL.createObjectURL(file);
            faces[faceId].overlayImage.src = imageUrl;

            // Wait for image to load before updating UI
            faces[faceId].overlayImage.onload = () => {
                // Switch to new face
                currentFace = faceId;
                toggleFaceButton.textContent = `Face ${faceNum}`;
                
                // Update controls with initial data
                updateControlsFromData(faces[faceId].frameData[0]);
                
                // Update UI colors for new face
                updateUIColors();

                // Force redraw
                drawFrame();
                updateFrameMarkers();
            };

            // Clean up the file input
            e.target.value = '';
        }
    });

    // Function to draw the current frame
    function drawFrame() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Draw all faces
        Object.keys(faces).forEach(faceId => {
            const face = faces[faceId];
            const data = face.frameData[Math.floor(currentFrame)];
            
            if (face.overlayImage.complete && data) {
                // Skip drawing if face is hidden
                if (data.hidden) return;

                ctx.save();
                
                ctx.translate(data.position.x, data.position.y);
                const finalScaleX = data.scale * data.scaleX * (data.xFlip ? -1 : 1);
                const finalScaleY = data.scale * data.scaleY;
                
                ctx.rotate(data.rotation * Math.PI / 180);
                ctx.scale(finalScaleX, finalScaleY);
                
                // Draw colored square background
                ctx.fillStyle = face.color;
                ctx.fillRect(-100, -100, 200, 200);
                
                // Draw the overlay image
                ctx.drawImage(face.overlayImage, -100, -100, 200, 200);
                
                ctx.restore();
            }
        });
    }

    // Video load event
    video.addEventListener('loadedmetadata', () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        totalFrames = Math.floor(video.duration * frameRate);
        
        // Update total frames display
        totalFramesDisplay.textContent = totalFrames;
        
        // Set up video scrubber
        const scrubber = document.getElementById('videoScrubber');
        scrubber.max = totalFrames - 1;
        
        // Update scrubber event listener
        scrubber.addEventListener('input', () => {
            currentFrame = parseInt(scrubber.value);
            video.currentTime = currentFrame / frameRate;
            currentFrameDisplay.textContent = currentFrame;
            updateControlsFromData(faces[currentFace].frameData[Math.floor(currentFrame)]);
        });
        
        // Seek to first frame
        video.currentTime = 0;
        
        // Initialize markers
        updateFrameMarkers();
    });

    video.addEventListener('seeked', () => {
        drawFrame();
    });

    // Update scrubber when changing frames
    function updateFrameAndScrubber(newFrame) {
        currentFrame = newFrame;
        const scrubber = document.getElementById('videoScrubber');
        scrubber.value = Math.floor(currentFrame);
        video.currentTime = Math.floor(currentFrame) / frameRate;
        updateControlsFromData(faces[currentFace].frameData[Math.floor(currentFrame)]);
        currentFrameDisplay.textContent = Math.floor(currentFrame);
    }

    // Update the frame navigation buttons to use the new function
    document.getElementById('prevFrame').addEventListener('click', () => {
        if (currentFrame > 0) {
            updateFrameAndScrubber(currentFrame - 1);
        }
    });

    document.getElementById('nextFrame').addEventListener('click', () => {
        if (currentFrame < totalFrames - 1) {
            updateFrameAndScrubber(currentFrame + 1);
        }
    });

    // Update the control event listeners to work with current face
    function updateOverlay() {
        // Update value displays
        posXValue.textContent = posX.value;
        posYValue.textContent = posY.value;
        scaleValue.textContent = scale.value;
        scaleXValue.textContent = scaleX.value;
        scaleYValue.textContent = scaleY.value;
        rotationValue.textContent = rotation.value;
        
        // Save current values to face data
        const face = faces[currentFace];
        if (!face.frameData[Math.floor(currentFrame)]) {
            face.frameData[Math.floor(currentFrame)] = {
                position: { x: 0, y: 0 },
                scale: 1,
                scaleX: 1,
                scaleY: 1,
                finalScale: { x: 1, y: 1 },
                rotation: 0,
                xFlip: false,
                imageName: 'Default'
            };
        }
        
        const data = face.frameData[Math.floor(currentFrame)];
        data.position.x = parseInt(posX.value);
        data.position.y = parseInt(posY.value);
        data.scale = parseFloat(scale.value);
        data.scaleX = parseFloat(scaleX.value);
        data.scaleY = parseFloat(scaleY.value);
        data.rotation = parseInt(rotation.value);
        data.xFlip = xFlip.checked;
        data.hidden = hideFace.checked;
        
        // Redraw the canvas
        drawFrame();
    }

    // Move updateControlsFromData function inside
    function updateControlsFromData(data) {
        if (!data) return;  // If no data exists for this frame, do nothing

        // Update slider values
        posX.value = data.position.x;
        posY.value = data.position.y;
        scale.value = data.scale;
        scaleX.value = data.scaleX;
        scaleY.value = data.scaleY;
        rotation.value = data.rotation;
        xFlip.checked = data.xFlip || false;
        hideFace.checked = data.hidden || false;
        
        // Update image name if it exists in the data
        const imageNameInput = document.getElementById('imageName');
        if (data.imageName) {
            imageNameInput.value = data.imageName;
        } else {
            imageNameInput.value = 'Default';
        }

        // Update overlay position
        updateOverlay();
    }

    // Keep existing event listeners for controls
    [posX, posY, scale, scaleX, scaleY, rotation, xFlip, hideFace].forEach(control => {
        control.addEventListener('input', updateOverlay);
    });

    // Function to download JSON
    function downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // Update the updateUsedImageNames function
    function updateUsedImageNames() {
        const container = document.getElementById('usedImageNames');
        container.innerHTML = '';
        
        usedImageNames.forEach(name => {
            const tag = document.createElement('span');
            tag.className = 'image-tag';
            tag.textContent = name;
            container.appendChild(tag);
        });
    }

    // Update the save button to handle multiple faces
    document.getElementById('saveSquareData').addEventListener('click', () => {
        const face = faces[currentFace];
        const baseScale = parseFloat(scale.value);
        const scaleXAdjust = parseFloat(scaleX.value);
        const scaleYAdjust = parseFloat(scaleY.value);
        const imageName = document.getElementById('imageName').value || 'Default';
        
        usedImageNames.add(imageName);
        updateUsedImageNames();
        
        const squareData = {
            position: { x: parseInt(posX.value), y: parseInt(posY.value) },
            scale: baseScale,
            scaleX: scaleXAdjust,
            scaleY: scaleYAdjust,
            finalScale: { x: baseScale * scaleXAdjust, y: baseScale * scaleYAdjust },
            rotation: parseInt(rotation.value),
            xFlip: xFlip.checked,
            hidden: hideFace.checked,
            imageName: imageName
        };
        
        face.frameData[Math.floor(currentFrame)] = squareData;
        
        // Add console logs to show the data
        console.log('Current Face:', currentFace);
        console.log('Frame:', Math.floor(currentFrame));
        console.log('Square Data:', squareData);
        console.log('All Faces Data:', faces);
        
        updateFrameMarkers();
    });

    // Update JSON download to include all faces
    document.getElementById('downloadJSON').addEventListener('click', () => {
        const fullData = {
            videoName: '02_ChairShot.mp4',
            totalFrames: totalFrames,
            faces: Object.keys(faces).reduce((acc, faceId) => {
                acc[faceId] = faces[faceId].frameData;
                return acc;
            }, {})
        };
        
        downloadJSON(fullData, 'overlay_data.json');
    });

    // Load the overlay image
    overlayImage.onload = () => {
        drawFrame();
    };

    // Start loading the video
    video.load();

    // Fine-tuning button functionality
    document.querySelectorAll('.fine-tune-btn').forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.dataset.target;
            const step = parseFloat(button.dataset.step);
            const input = document.getElementById(targetId);
            
            // Get current value and calculate new value
            let currentValue = parseFloat(input.value);
            let newValue = currentValue + step;
            
            // Ensure new value is within min/max bounds
            newValue = Math.min(Math.max(newValue, parseFloat(input.min)), parseFloat(input.max));
            
            // Update input value
            input.value = newValue;
            
            // Trigger the input event to update the display and overlay
            input.dispatchEvent(new Event('input'));
        });
    });

    // JSON upload functionality
    const jsonUpload = document.getElementById('jsonUpload');
    document.getElementById('loadJSON').addEventListener('click', () => {
        jsonUpload.click();
    });

    // Update the existing JSON upload handler to use the new function
    jsonUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const jsonData = JSON.parse(e.target.result);
                    handleJSONLoad(jsonData);
                    drawFrame();
                    updateFrameMarkers();
                } catch (error) {
                    console.error('Error parsing JSON:', error);
                    alert('Error loading JSON file');
                }
            };
            reader.readAsText(file);
        }
    });

    // Update JSON loading to handle multiple faces
    function handleJSONLoad(jsonData) {
        if (jsonData.faces) {
            faces = Object.keys(jsonData.faces).reduce((acc, faceId) => {
                acc[faceId] = {
                    overlayImage: new Image(),
                    frameData: jsonData.faces[faceId],
                    imageName: 'Default'
                };
                acc[faceId].overlayImage.src = 'GERGFACE.png';
                return acc;
            }, {});

            // Update face selector
            toggleFaceButton.textContent = `Face ${Object.keys(faces)[0].replace('face', '')}`;
            currentFace = Object.keys(faces)[0];
            updateControlsFromData(faces[currentFace].frameData[Math.floor(currentFrame)]);
        }
    }

    // Also update the frame markers function to use the current face's data
    function updateFrameMarkers() {
        const markersContainer = document.getElementById('frameMarkers');
        markersContainer.innerHTML = '';
        
        // Get all frames that have data for the current face
        const frames = Object.keys(faces[currentFace].frameData).map(Number);
        
        frames.forEach(frame => {
            const marker = document.createElement('div');
            marker.className = 'frame-marker';
            // Calculate position as percentage of total width
            const position = (frame / (totalFrames - 1)) * 100;
            marker.style.left = `${position}%`;
            markersContainer.appendChild(marker);
        });
    }

    // Export button functionality
    const exportButton = document.getElementById('exportButton');
    const statusDiv = document.getElementById('status');

    exportButton.addEventListener('click', async () => {
        // Initialize FFmpeg with MP4 support
        const ffmpeg = createFFmpeg({ 
            log: true,
            corePath: 'https://unpkg.com/@ffmpeg/core@0.10.0/dist/ffmpeg-core.js',
            // Add MP4 support
            mainName: 'main',
            format: 'mp4'
        });
        
        try {
            await ffmpeg.load();
            
            // Create an offscreen canvas for high quality rendering
            const offscreenCanvas = document.createElement('canvas');
            offscreenCanvas.width = canvas.width;
            offscreenCanvas.height = canvas.height;
            const offscreenCtx = offscreenCanvas.getContext('2d', {
                alpha: false,
                desynchronized: true
            });
            
            statusDiv.textContent = 'Preparing for export...';
            
            // Start at frame 0
            let frame = 0;
            const totalFrames = Math.floor(video.duration * frameRate);
            const frames = [];

            // Function to render a single frame
            const renderFrame = () => {
                return new Promise((resolve) => {
                    video.currentTime = frame / frameRate;
                    
                    // Add error handling for seeking
                    const handleError = () => {
                        console.error('Error seeking to frame:', frame);
                        resolve();
                    };
                    
                    const handleSeeked = () => {
                        video.removeEventListener('error', handleError);
                        
                        // Draw video frame
                        offscreenCtx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        
                        // Draw overlay if we have data
                        const data = frameData[Math.floor(frame)];
                        if (data && overlayImage.complete) {
                            offscreenCtx.save();
                            offscreenCtx.translate(data.position.x, data.position.y);
                            const finalScaleX = data.scale * data.scaleX * (data.xFlip ? -1 : 1);
                            const finalScaleY = data.scale * data.scaleY;
                            offscreenCtx.rotate(data.rotation * Math.PI / 180);
                            offscreenCtx.scale(finalScaleX, finalScaleY);
                            offscreenCtx.drawImage(overlayImage, -100, -100, 200, 200);
                            offscreenCtx.restore();
                        }
                        
                        // Convert canvas to blob
                        offscreenCanvas.toBlob((blob) => {
                            frames.push(blob);
                            resolve();
                        }, 'image/png');
                    };
                    
                    video.addEventListener('error', handleError, { once: true });
                    video.addEventListener('seeked', handleSeeked, { once: true });
                });
            };

            // First pass: render all frames with proper waiting
            while (frame < totalFrames) {
                await renderFrame();
                frame++;
                statusDiv.textContent = `Rendering frames... ${Math.floor((frame/totalFrames) * 100)}%`;
                // Add a small delay to prevent browser from hanging
                await new Promise(resolve => setTimeout(resolve, 10));
            }

            statusDiv.textContent = 'Creating video...';

            // Run FFmpeg command with explicit MP4 settings
            await ffmpeg.run(
                '-framerate', '30',
                '-i', 'frame_%05d.png',
                '-c:v', 'libx264',
                '-pix_fmt', 'yuv420p',
                '-preset', 'medium',
                '-crf', '23',
                '-movflags', '+faststart',
                '-f', 'mp4',  // Explicitly specify MP4 format
                '-y',         // Overwrite output file if it exists
                'output.mp4'
            );

            // Read the output file
            const data = ffmpeg.FS('readFile', 'output.mp4');
            
            // Create download link with explicit MP4 MIME type and content disposition
            const blob = new Blob([data.buffer], { 
                type: 'video/mp4; codecs="avc1.42E01E"'  // Explicit H.264 codec
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'meme_with_overlay.mp4';
            // Force content disposition to download as MP4
            a.setAttribute('download', 'meme_with_overlay.mp4');
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // Clean up
            frames.forEach((_, i) => {
                try {
                    ffmpeg.FS('unlink', `frame_${i.toString().padStart(5, '0')}.png`);
                } catch (e) {
                    console.warn('Error cleaning up frame:', i, e);
                }
            });
            ffmpeg.FS('unlink', 'output.mp4');

            statusDiv.textContent = 'Export complete!';
        } catch (error) {
            console.error('Error during export:', error);
            statusDiv.textContent = 'Error during export: ' + error.message;
        }
    });

    // Add event listener for the Set Image button
    document.getElementById('setImageName').addEventListener('click', () => {
        // Save current frame data with new image name
        const saveButton = document.getElementById('saveSquareData');
        saveButton.click();
    });

    // Add function to update UI colors
    function updateUIColors() {
        const face = faces[currentFace];
        const color = face.color;
        const solidColor = color.replace('0.3', '1'); // Make color solid for UI

        // Update control group backgrounds
        document.querySelectorAll('.control-group').forEach(group => {
            group.style.borderLeft = `4px solid ${solidColor}`;
        });

        // Update buttons
        document.querySelectorAll('button').forEach(button => {
            if (!button.classList.contains('excluded-from-color')) {
                button.style.backgroundColor = solidColor;
            }
        });

        // Update range inputs
        document.querySelectorAll('input[type="range"]').forEach(range => {
            range.style.accentColor = solidColor;
        });
    }

    // Update initial UI colors
    updateUIColors();
}); 