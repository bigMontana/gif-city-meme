document.addEventListener('DOMContentLoaded', () => {
    // Move all variable declarations to the top
    let currentFrame = 0;
    let totalFrames = 100;
    const frameRate = 30;
    let maskPoints = [];
    let isDrawingMask = false;
    let isDragging = false;
    let lastPoint = null;
    let controlPoint = null;
    let selectedPoint = null;
    let isDraggingControlPoint = false;
    let showControlPoints = true;
    let isEditingMask = false;
    let copiedMaskPoints = null;
    let hasCopiedMask = false;
    let isPainting = false;
    let isDrawing = false;
    let brushSize = 20;
    let brushColor = 'rgba(255, 255, 255, 0.3)';
    let eraserMode = false;
    let copiedMaskDataURL = null;
    
    // Create logo image early
    const logoImage = new Image();
    logoImage.onload = () => {
        if (video.readyState >= 2) {
            drawFrame();
        }
    };
    logoImage.src = 'xlogo2.png';

    // Canvas setup
    const canvas = document.getElementById('videoCanvas');
    const ctx = canvas.getContext('2d');
    const video = document.createElement('video');
    
    // Create mask canvas early
    const maskCanvas = document.createElement('canvas');
    const maskCtx = maskCanvas.getContext('2d');
    
    // Initialize faces object before use
    let faces = {
        face1: {
            overlayImage: new Image(),
            frameData: {
                0: {
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
            color: 'rgba(255, 0, 0, 0.3)',
            usedImageNames: new Set(['Default'])
        }
    };
    let currentFace = 'face1';
    faces.face1.overlayImage.src = 'GERGFACE.png';

    // Get template ID from URL if editing existing template
    const urlParams = new URLSearchParams(window.location.search);
    const templateId = urlParams.get('template');

    // Load template if editing
    if (templateId) {
        loadTemplate(templateId);
    }

    // Add video input handler
    const videoInput = document.getElementById('videoInput');
    videoInput.addEventListener('change', handleVideoUpload);

    // Set default video if no file is selected
    if (!video.src && !templateId) {
        video.src = '02_ChairShot.mp4';
    }

    // Add image replacement functionality for default face - Move this up near the start
    const replaceImageButton = document.getElementById('replaceImageButton');
    const replaceImageUpload = document.getElementById('replaceImageUpload');

    replaceImageButton.addEventListener('click', () => {
        replaceImageUpload.click();
    });

    replaceImageUpload.addEventListener('change', handleFaceImageUpload);

    // Set initial dimensions (we'll update these when video loads)
    canvas.width = 1920;
    canvas.height = 1080;

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

    // Move the initialization of faces before any function that uses it
    // Add this near the top with other state variables
    const MAX_FACES = 5;
    const FACE_COLORS = {
        face1: 'rgba(255, 0, 0, 0.3)',   // Red
        face2: 'rgba(0, 0, 255, 0.3)',   // Blue
        face3: 'rgba(0, 255, 0, 0.3)',   // Green
        face4: 'rgba(255, 165, 0, 0.3)', // Orange
        face5: 'rgba(128, 0, 128, 0.3)'  // Purple
    };

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

    toggleFaceButton.addEventListener('click', handleFaceToggle);

    // Update the face creation code
    faceImageUpload.addEventListener('change', handleNewFaceUpload);

    // Update the Add Face button to show/hide based on face count
    function updateAddFaceButton() {
        const faceCount = Object.keys(faces).length;
        const addFaceButton = document.getElementById('addFaceButton');
        
        if (addFaceButton) {
            addFaceButton.style.display = faceCount >= MAX_FACES ? 'none' : 'inline';
            addFaceButton.title = faceCount >= MAX_FACES ? 
                'Maximum number of faces reached' : 
                `Add face (${faceCount}/${MAX_FACES})`;
        }
    }

    // Call this after creating a new face and after loading JSON
    updateAddFaceButton();

    // Function to draw the current frame
    function drawFrame() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Draw all faces
        Object.keys(faces).forEach(faceId => {
            const face = faces[faceId];
            
            // Skip if face doesn't have frameData
            if (!face || !face.frameData) return;
            
            // Find the last known frame data for face position/scale
            const frameNumbers = Object.keys(face.frameData)
                .map(Number)
                .filter(num => num <= currentFrame)
                .sort((a, b) => b - a);
                
            const data = frameNumbers.length > 0 ? 
                face.frameData[frameNumbers[0]] : 
                face.frameData[0];  // fallback to initial frame
            
            // Define currentFrameData here to fix the reference error
            const currentFrameData = face.frameData[Math.floor(currentFrame)];
            
            if (face.overlayImage && face.overlayImage.complete && data) {
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
                
                // Set global alpha to 0.5 before drawing the face image
                ctx.globalAlpha = 0.5;
                
                // Draw the overlay image
                ctx.drawImage(face.overlayImage, -100, -100, 200, 200);
                
                // Reset global alpha back to 1.0 for other drawings
                ctx.globalAlpha = 1.0;

                // If we're actively painting on this face, show the mask canvas as an overlay
                if (faceId === currentFace && isPainting) {
                    // Show a preview of what's being painted (as areas to be erased)
                    ctx.globalCompositeOperation = 'destination-out';
                    ctx.drawImage(maskCanvas, -100, -100, 200, 200);
                    ctx.globalCompositeOperation = 'source-over';
                    
                    // Draw the current brush position if we're drawing
                    if (isDrawing && lastPoint) {
                        ctx.fillStyle = eraserMode ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 0, 0, 0.5)';
                        ctx.beginPath();
                        ctx.arc(lastPoint.x - 100, lastPoint.y - 100, brushSize/2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                } 
                // Apply saved mask if not currently painting this face
                else if (currentFrameData?.maskDataURL) {
                    // If we have a saved mask data URL, use it
                    if (!currentFrameData.maskImage) {
                        // Create an image from the data URL if not already created
                        currentFrameData.maskImage = new Image();
                        currentFrameData.maskImage.src = currentFrameData.maskDataURL;
                        currentFrameData.maskImage.onload = () => drawFrame();
                    } else if (currentFrameData.maskImage.complete) {
                        // Apply the mask as a cutout (invert the behavior)
                        ctx.globalCompositeOperation = 'destination-out';
                        ctx.drawImage(currentFrameData.maskImage, -100, -100, 200, 200);
                        ctx.globalCompositeOperation = 'source-over';
                    }
                }
                
                ctx.restore();
            }
        });

        // Draw logo if needed
        if (logoImage.complete) {
            const padding = 40;
            const logoWidth = 256;  // 20% smaller than 320
            const logoHeight = 256; // 20% smaller than 320
            
            // Set up shadow
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 20;
            ctx.shadowOffsetX = 5;
            ctx.shadowOffsetY = 5;
            
            ctx.drawImage(logoImage, 
                padding,
                canvas.height - logoHeight - padding,
                logoWidth,
                logoHeight
            );
            ctx.restore();
        }
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
            // Clear temporary mask points when scrubbing
            maskPoints = [];
            // Reset mask drawing mode and buttons
            isDrawingMask = false;
            isEditingMask = false;
            
            // Add null checks for all button elements
            if (startMaskBtn) startMaskBtn.style.display = 'inline';
            if (finishMaskBtn) finishMaskBtn.style.display = 'none';
            if (clearMaskBtn) clearMaskBtn.style.display = 'none';
            if (editMaskBtn) editMaskBtn.style.display = 'inline';
            
            video.currentTime = currentFrame / frameRate;
            if (currentFrameDisplay) currentFrameDisplay.textContent = currentFrame;
            updateControlsFromData(faces[currentFace].frameData[Math.floor(currentFrame)]);
        });
        
        // Seek to first frame
        video.currentTime = 0;
        
        // Initialize markers
        updateFrameMarkers();
    });

    // This existing event listener will handle drawing after seeking
    video.addEventListener('seeked', () => {
        drawFrame();
    });

    // Update scrubber when changing frames
    function updateFrameAndScrubber(newFrame) {
        currentFrame = newFrame;
        const scrubber = document.getElementById('videoScrubber');
        scrubber.value = Math.floor(currentFrame);
        
        // Clear temporary mask points when changing frames
        maskPoints = [];
        // Reset mask drawing and editing mode
        isDrawingMask = false;
        isEditingMask = false;
        isPainting = false;
        
        // Update button visibility
        startMaskBtn.style.display = 'inline';
        finishMaskBtn.style.display = 'none';
        clearMaskBtn.style.display = 'none';
        
        // Show edit mask button if it exists
        if (document.getElementById('editMask')) {
            document.getElementById('editMask').style.display = 'inline';
        }
        
        // Hide brush controls
        if (eraserToggleBtn) eraserToggleBtn.style.display = 'none';
        if (brushSizeControl) brushSizeControl.style.display = 'none';
        
        // Keep paste button enabled if we have a copied mask
        if (pasteMaskBtn) pasteMaskBtn.disabled = !hasCopiedMask;
        
        // Update frame display immediately
        const currentFrameDisplay = document.getElementById('currentFrameDisplay');
        if (currentFrameDisplay) currentFrameDisplay.textContent = Math.floor(currentFrame);
        
        // Update controls for current face
        updateControlsFromData(faces[currentFace].frameData[Math.floor(currentFrame)]);
        
        // Wait for video to seek before drawing
        video.currentTime = Math.floor(currentFrame) / frameRate;
        // drawFrame will be called by the 'seeked' event listener
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
        
        // Only update the current face's data
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
                imageName: 'Default',
                maskPoints: [] // Initialize empty mask points array
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
        
        // Preserve existing mask points if they exist
        if (maskPoints.length > 0) {
            data.maskPoints = [...maskPoints];
        } else if (!data.maskPoints) {
            data.maskPoints = [];
        }
        
        // Redraw the canvas with all faces
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

    // Then update the updateUsedImageNames function to check if faces exists
    function updateUsedImageNames() {
        // Check if faces object exists
        if (!faces) return;
        
        const container = document.getElementById('usedImageNames');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Make sure the current face exists
        if (!faces[currentFace]) return;
        
        // Create the set if it doesn't exist
        if (!faces[currentFace].usedImageNames) {
            faces[currentFace].usedImageNames = new Set(['Default']);
        }
        
        // Display only the current face's image names
        faces[currentFace].usedImageNames.forEach(name => {
            const button = document.createElement('button');
            button.className = 'image-name-button';
            button.textContent = name;
            
            // Add click handler to set the image name input
            button.addEventListener('click', () => {
                const imageNameInput = document.getElementById('imageName');
                imageNameInput.value = name;
            });
            
            container.appendChild(button);
        });
    }

    // Update the save button handler
    document.getElementById('saveSquareData').addEventListener('click', () => {
        const face = faces[currentFace];
        const baseScale = parseFloat(scale.value);
        const scaleXAdjust = parseFloat(scaleX.value);
        const scaleYAdjust = parseFloat(scaleY.value);
        const imageName = document.getElementById('imageName').value || 'Default';
        
        // Create the set if it doesn't exist
        if (!face.usedImageNames) {
            face.usedImageNames = new Set(['Default']);
        }
        
        // Add to the current face's used image names
        face.usedImageNames.add(imageName);
        updateUsedImageNames();
        
        // Get existing frame data to preserve mask
        const existingData = face.frameData[Math.floor(currentFrame)] || {};
        
        const squareData = {
            position: { x: parseInt(posX.value), y: parseInt(posY.value) },
            scale: baseScale,
            scaleX: scaleXAdjust,
            scaleY: scaleYAdjust,
            finalScale: { x: baseScale * scaleXAdjust, y: baseScale * scaleYAdjust },
            rotation: parseInt(rotation.value),
            xFlip: xFlip.checked,
            hidden: hideFace.checked,
            imageName: imageName,
            // Preserve the mask data URL if it exists
            maskDataURL: existingData.maskDataURL || null,
            // Preserve the mask image if it exists
            maskImage: existingData.maskImage || null
        };
        
        // Only save data for current face
        face.frameData[Math.floor(currentFrame)] = squareData;
        
        // Log only the relevant data
        console.log(`Saved data for ${currentFace} at frame ${Math.floor(currentFrame)}:`, squareData);
        
        updateFrameMarkers();
    });

    // Update JSON download to include all faces
    document.getElementById('downloadJSON').addEventListener('click', () => {
        const fullData = {
            videoName: video.src.includes('blob:') ? 'custom_video' : '02_ChairShot.mp4',
            totalFrames: totalFrames,
            faces: Object.keys(faces).reduce((acc, faceId) => {
                // Create a deep copy of the frame data without the maskImage objects
                acc[faceId] = Object.keys(faces[faceId].frameData).reduce((frames, frameNum) => {
                    const frameData = {...faces[faceId].frameData[frameNum]};
                    // Remove the Image object but keep the data URL
                    delete frameData.maskImage;
                    frames[frameNum] = frameData;
                    return frames;
                }, {});
                return acc;
            }, {})
        };
        
        downloadJSON(fullData, 'overlay_data.json');
    });

    // Start loading the video
    video.load();

    // Fine-tuning button functionality
    document.querySelectorAll('.fine-tune-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const targetId = button.dataset.target;
            // Get the base step value
            let step = parseFloat(button.dataset.step);
            
            // If shift key is pressed, apply multiplier based on control type
            if (e.shiftKey) {
                // Use 10x multiplier for position controls
                if (targetId === 'posX' || targetId === 'posY') {
                    step *= 10;
                } else {
                    // Use 5x multiplier for other controls
                    step *= 5;
                }
            }
            
            const input = document.getElementById(targetId);
            
            // Get current value and calculate new value
            let currentValue = parseFloat(input.value);
            let newValue = currentValue + step;
            
            // Ensure new value is within min/max bounds
            newValue = Math.min(Math.max(newValue, parseFloat(input.min)), parseFloat(input.max));
            
            // Update input value
            input.value = newValue;
            
            // Trigger the input event to update the display and overlay
            const event = new Event('input', { bubbles: true });
            input.dispatchEvent(event);
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
            // Check if JSON has too many faces
            if (Object.keys(jsonData.faces).length > MAX_FACES) {
                alert(`Warning: JSON contains more than ${MAX_FACES} faces. Only the first ${MAX_FACES} will be loaded.`);
            }
            
            faces = Object.keys(jsonData.faces).reduce((acc, faceId) => {
                // Skip if we've reached the maximum number of faces
                if (Object.keys(acc).length >= MAX_FACES) return acc;
                
                acc[faceId] = {
                    overlayImage: new Image(),
                    frameData: jsonData.faces[faceId],
                    imageName: 'Default',
                    color: FACE_COLORS[faceId],
                    usedImageNames: new Set(['Default'])
                };
                acc[faceId].overlayImage.src = 'GERGFACE.png';
                
                // Collect all unique image names from frame data
                Object.values(acc[faceId].frameData).forEach(frame => {
                    if (frame.imageName) {
                        acc[faceId].usedImageNames.add(frame.imageName);
                    }
                });
                
                // Preload mask images from data URLs
                Object.keys(acc[faceId].frameData).forEach(frameNum => {
                    const frame = acc[faceId].frameData[frameNum];
                    if (frame.maskDataURL) {
                        frame.maskImage = new Image();
                        frame.maskImage.src = frame.maskDataURL;
                    }
                });
                
                return acc;
            }, {});
            
            // Update face selector and controls
            toggleFaceButton.textContent = `Face ${Object.keys(faces)[0].replace('face', '')}`;
            currentFace = Object.keys(faces)[0];
            updateControlsFromData(faces[currentFace].frameData[Math.floor(currentFrame)]);
            updateUsedImageNames();
            updateAddFaceButton(); // Update the Add Face button visibility
        }
    }

    // Also update the frame markers function to use the current face's data
    function updateFrameMarkers() {
        const markersContainer = document.getElementById('frameMarkers');
        if (!markersContainer) return;
        
        markersContainer.innerHTML = '';
        
        // Make sure currentFace exists and has frameData
        if (faces[currentFace] && faces[currentFace].frameData) {
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
    }

    // Export button functionality
    const exportButton = document.getElementById('exportButton');
    if (exportButton) {
        const statusDiv = document.getElementById('status') || document.createElement('div');
        if (!document.getElementById('status')) {
            statusDiv.id = 'status';
            document.body.appendChild(statusDiv);
        }

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
                            if (data && faces[currentFace].overlayImage.complete) {
                                offscreenCtx.save();
                                offscreenCtx.translate(data.position.x, data.position.y);
                                const finalScaleX = data.scale * data.scaleX * (data.xFlip ? -1 : 1);
                                const finalScaleY = data.scale * data.scaleY;
                                offscreenCtx.rotate(data.rotation * Math.PI / 180);
                                offscreenCtx.scale(finalScaleX, finalScaleY);
                                offscreenCtx.drawImage(faces[currentFace].overlayImage, -100, -100, 200, 200);
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
    }

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
        const solidColor = color.replace('0.3', '1');

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

        // Update save button text to indicate current face
        const saveButton = document.getElementById('saveSquareData');
        saveButton.textContent = `Save Face ${currentFace.replace('face', '')} Data`;
        saveButton.style.backgroundColor = solidColor;
    }

    // Update initial UI colors
    updateUIColors();

    // Add mask drawing functionality
    const startMaskBtn = document.getElementById('startMask');
    const finishMaskBtn = document.getElementById('finishMask');
    const clearMaskBtn = document.getElementById('clearMask');

    startMaskBtn.addEventListener('click', async () => {
        isPainting = true;
        isDrawingMask = false; // Disable the old mask system
        
        // Load existing mask if available
        const face = faces[currentFace];
        const currentData = face.frameData[Math.floor(currentFrame)];
        
        if (currentData && currentData.maskDataURL) {
            await loadMaskFromDataURL(currentData.maskDataURL);
        } else {
            clearMaskCanvas();
        }
        
        // Update button visibility
        startMaskBtn.style.display = 'none';
        finishMaskBtn.style.display = 'inline';
        clearMaskBtn.style.display = 'inline';
        eraserToggleBtn.style.display = 'inline';
        brushSizeControl.style.display = 'flex';
        
        // Hide old edit mask button if it exists
        if (document.getElementById('editMask')) {
            document.getElementById('editMask').style.display = 'none';
        }
        
        drawFrame();
    });

    finishMaskBtn.addEventListener('click', () => {
        if (!isPainting) return;
        
        // Save the mask as a data URL
        const maskDataURL = maskCanvas.toDataURL('image/png');
        
        // Save to the current face's frame data
        const face = faces[currentFace];
        if (!face.frameData[Math.floor(currentFrame)]) {
            face.frameData[Math.floor(currentFrame)] = {
                ...face.frameData[0] // Copy initial data
            };
        }
        
        // Make sure we're updating the current frame data
        const currentData = face.frameData[Math.floor(currentFrame)];
        
        // Add the mask data URL to the frame data
        currentData.maskDataURL = maskDataURL;
        
        // Create an image from the data URL for immediate display
        const maskImage = new Image();
        maskImage.src = maskDataURL;
        currentData.maskImage = maskImage;
        
        // Add console log for debugging
        console.log('Saved mask data URL:', maskDataURL.substring(0, 50) + '...');
        
        // Reset painting state
        isPainting = false;
        
        // Update button visibility
        startMaskBtn.style.display = 'inline';
        finishMaskBtn.style.display = 'none';
        clearMaskBtn.style.display = 'none';
        eraserToggleBtn.style.display = 'none';
        brushSizeControl.style.display = 'none';
        
        // Show old edit mask button if it exists
        if (document.getElementById('editMask')) {
            document.getElementById('editMask').style.display = 'inline';
        }
        
        // Update frame markers and redraw
        updateFrameMarkers();
        drawFrame();
    });

    clearMaskBtn.addEventListener('click', () => {
        clearMaskCanvas();
        drawFrame();
    });

    // Create brush size control
    const brushSizeControl = document.createElement('div');
    brushSizeControl.className = 'control-group';
    brushSizeControl.innerHTML = `
        <label>Brush Size:</label>
        <input type="range" id="brushSize" min="1" max="50" value="20">
        <span class="value-display" id="brushSizeValue">20</span>
    `;

    // Create eraser toggle button
    const eraserToggleBtn = document.createElement('button');
    eraserToggleBtn.id = 'eraserToggle';
    eraserToggleBtn.textContent = 'Brush Mode (Erase)';
    eraserToggleBtn.style.backgroundColor = '#f44336';

    // Add the new controls to the UI
    clearMaskBtn.parentNode.insertBefore(brushSizeControl, clearMaskBtn.nextSibling);
    clearMaskBtn.parentNode.insertBefore(eraserToggleBtn, brushSizeControl.nextSibling);

    // Initialize the mask canvas
    initMaskCanvas();

    // Add brush size control functionality
    const brushSizeInput = document.getElementById('brushSize');
    const brushSizeValue = document.getElementById('brushSizeValue');

    brushSizeInput.addEventListener('input', () => {
        brushSize = parseInt(brushSizeInput.value);
        brushSizeValue.textContent = brushSize;
    });

    // Add eraser toggle functionality
    eraserToggleBtn.addEventListener('click', () => {
        eraserMode = !eraserMode;
        if (eraserMode) {
            eraserToggleBtn.textContent = 'Eraser Mode (Restore)';
            eraserToggleBtn.style.backgroundColor = '#4CAF50';
        } else {
            eraserToggleBtn.textContent = 'Brush Mode (Erase)';
            eraserToggleBtn.style.backgroundColor = '#f44336';
        }
        drawFrame(); // Redraw to update the visual feedback
    });

    // Update the edit mask button functionality
    const editMaskBtn = document.getElementById('editMask');
    if (editMaskBtn) {
        editMaskBtn.addEventListener('click', async () => {
            const face = faces[currentFace];
            const currentData = face.frameData[Math.floor(currentFrame)];
            
            if (currentData && currentData.maskDataURL) {
                isPainting = true;
                
                // Load the existing mask
                await loadMaskFromDataURL(currentData.maskDataURL);
                
                // Update button visibility
                startMaskBtn.style.display = 'none';
                finishMaskBtn.style.display = 'inline';
                clearMaskBtn.style.display = 'inline';
                eraserToggleBtn.style.display = 'inline';
                brushSizeControl.style.display = 'flex';
                editMaskBtn.style.display = 'none';
                
                drawFrame();
            } else {
                alert('No mask to edit on this frame. Create a new mask first.');
            }
        });
    }

    // Update the copy/paste mask functionality
    const copyMaskBtn = document.getElementById('copyMask');
    const pasteMaskBtn = document.getElementById('pasteMask');

    if (copyMaskBtn) {
        copyMaskBtn.addEventListener('click', () => {
            const face = faces[currentFace];
            const currentData = face.frameData[Math.floor(currentFrame)];
            
            if (currentData && currentData.maskDataURL) {
                copiedMaskDataURL = currentData.maskDataURL;
                hasCopiedMask = true;
                pasteMaskBtn.disabled = false;
                
                // Visual feedback
                copyMaskBtn.textContent = '✓ Mask Copied';
                setTimeout(() => {
                    copyMaskBtn.textContent = 'Copy Mask';
                }, 1500);
            } else {
                alert('No mask to copy on this frame. Create a mask first.');
            }
        });
    }

    if (pasteMaskBtn) {
        pasteMaskBtn.addEventListener('click', async () => {
            if (!hasCopiedMask || !copiedMaskDataURL) {
                alert('No mask has been copied yet.');
                return;
            }
            
            const face = faces[currentFace];
            
            // Create frame data if it doesn't exist
            if (!face.frameData[Math.floor(currentFrame)]) {
                face.frameData[Math.floor(currentFrame)] = {
                    ...face.frameData[0] // Copy initial data
                };
            }
            
            // Paste the copied mask
            face.frameData[Math.floor(currentFrame)].maskDataURL = copiedMaskDataURL;
            
            // Create an image from the data URL for immediate display
            const maskImage = new Image();
            maskImage.src = copiedMaskDataURL;
            face.frameData[Math.floor(currentFrame)].maskImage = maskImage;
            
            // Visual feedback
            pasteMaskBtn.textContent = '✓ Mask Pasted';
            setTimeout(() => {
                pasteMaskBtn.textContent = 'Paste Mask';
            }, 1500);
            
            // Update the frame markers and redraw
            updateFrameMarkers();
            drawFrame();
        });
    }

    // Initialize the mask canvas
    function initMaskCanvas() {
        maskCanvas.width = 200;
        maskCanvas.height = 200;
        clearMaskCanvas();
    }

    // Clear the mask canvas
    function clearMaskCanvas() {
        maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        // Start with a transparent canvas (nothing visible)
        maskCtx.fillStyle = 'rgba(0, 0, 0, 0)';
        maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    }

    // Load a mask from data URL
    function loadMaskFromDataURL(dataURL) {
        return new Promise((resolve) => {
            clearMaskCanvas();
            if (!dataURL) {
                resolve();
                return;
            }
            
            const img = new Image();
            img.onload = () => {
                maskCtx.drawImage(img, 0, 0, maskCanvas.width, maskCanvas.height);
                resolve();
            };
            img.src = dataURL;
        });
    }

    // Update the mousedown event for painting
    canvas.addEventListener('mousedown', async (e) => {
        if (!isPainting) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
        
        // Get current face data for coordinate transformation
        const face = faces[currentFace];
        const data = face.frameData[Math.floor(currentFrame)] || face.frameData[0];
        
        // Transform coordinates relative to face center
        const dx = x - data.position.x;
        const dy = y - data.position.y;
        const angle = -data.rotation * Math.PI / 180;
        const scaleX = data.scale * data.scaleX * (data.xFlip ? -1 : 1);
        const scaleY = data.scale * data.scaleY;
        
        // Calculate local coordinates (0-200 range for the mask canvas)
        const localX = ((dx * Math.cos(angle) - dy * Math.sin(angle)) / scaleX + 100;
        const localY = ((dx * Math.sin(angle) + dy * Math.cos(angle)) / scaleY + 100;
        
        // Start painting
        isDrawing = true;
        lastPoint = { x: localX, y: localY };
        
        // Draw a dot at the starting point
        maskCtx.beginPath();
        maskCtx.globalCompositeOperation = eraserMode ? 'destination-out' : 'source-over';
        maskCtx.fillStyle = brushColor;
        maskCtx.arc(localX, localY, brushSize/2, 0, Math.PI * 2);
        maskCtx.fill();
        
        drawFrame();
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isPainting || !isDrawing) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
        
        // Get current face data for coordinate transformation
        const face = faces[currentFace];
        const data = face.frameData[Math.floor(currentFrame)] || face.frameData[0];
        
        // Transform coordinates relative to face center
        const dx = x - data.position.x;
        const dy = y - data.position.y;
        const angle = -data.rotation * Math.PI / 180;
        const scaleX = data.scale * data.scaleX * (data.xFlip ? -1 : 1);
        const scaleY = data.scale * data.scaleY;
        
        // Calculate local coordinates (0-200 range for the mask canvas)
        const localX = ((dx * Math.cos(angle) - dy * Math.sin(angle)) / scaleX) + 100;
        const localY = ((dx * Math.sin(angle) + dy * Math.cos(angle)) / scaleY) + 100;
        
        // Draw a line from the last point to the current point
        maskCtx.beginPath();
        maskCtx.globalCompositeOperation = eraserMode ? 'destination-out' : 'source-over';
        maskCtx.strokeStyle = brushColor;
        maskCtx.lineWidth = brushSize;
        maskCtx.lineCap = 'round';
        maskCtx.lineJoin = 'round';
        maskCtx.moveTo(lastPoint.x, lastPoint.y);
        maskCtx.lineTo(localX, localY);
        maskCtx.stroke();
        
        lastPoint = { x: localX, y: localY };
        
        drawFrame();
    });

    canvas.addEventListener('mouseup', () => {
        isDrawing = false;
    });

    canvas.addEventListener('mouseleave', () => {
        isDrawing = false;
    });

    // Add instructions for the paintbrush
    function updateInstructions() {
        const instructionsDiv = document.querySelector('.instructions') || document.createElement('div');
        instructionsDiv.className = 'instructions';
        instructionsDiv.innerHTML = `
            <h3>Paintbrush Mask Instructions:</h3>
            <ul>
                <li>Click and drag to paint areas you want to <strong>erase</strong></li>
                <li>Adjust brush size with the slider</li>
                <li>Toggle between brush (erase) and eraser (restore) modes</li>
                <li>Click "Save Mask" when finished</li>
                <li>Use Copy/Paste to reuse masks across frames</li>
            </ul>
        `;
        instructionsDiv.style.position = 'absolute';
        instructionsDiv.style.top = '10px';
        instructionsDiv.style.right = '10px';
        instructionsDiv.style.backgroundColor = 'rgba(0,0,0,0.7)';
        instructionsDiv.style.color = 'white';
        instructionsDiv.style.padding = '10px';
        instructionsDiv.style.borderRadius = '5px';
        instructionsDiv.style.zIndex = '1000';
        instructionsDiv.style.display = 'none';
        
        if (!document.querySelector('.instructions')) {
            document.body.appendChild(instructionsDiv);
        }
        
        // Show instructions when starting painting
        startMaskBtn.addEventListener('click', () => {
            instructionsDiv.style.display = 'block';
        });
        
        // Hide instructions when finishing painting
        finishMaskBtn.addEventListener('click', () => {
            instructionsDiv.style.display = 'none';
        });
    }

    // Call this function to update the instructions
    updateInstructions();

    // Add keyboard event listener for navigation and shortcuts
    document.addEventListener('keydown', (e) => {
        // Only trigger if we're not in an input field
        if (e.target.tagName === 'INPUT') return;
        
        if (e.key === 'ArrowLeft') {
            // Previous frame
            if (currentFrame > 0) {
                updateFrameAndScrubber(currentFrame - 1);
            }
        } else if (e.key === 'ArrowRight') {
            // Next frame
            if (currentFrame < totalFrames - 1) {
                updateFrameAndScrubber(currentFrame + 1);
            }
        } else if (e.key.toLowerCase() === 'q') {
            // Trigger save face button
            document.getElementById('saveSquareData').click();
        }
    });

    // Event handlers
    async function handleVideoUpload(e) {
        const file = e.target.files[0];
        if (file) {
            const videoUrl = URL.createObjectURL(file);
            video.src = videoUrl;
            
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

    async function handleFaceImageUpload(e) {
        const file = e.target.files[0];
        if (file) {
            const imageUrl = URL.createObjectURL(file);
            faces.face1.overlayImage.src = imageUrl;
            
            faces.face1.overlayImage.onload = () => {
                drawFrame();
            };
            
            e.target.value = '';
        }
    }

    function handleFaceToggle() {
        const faceIds = Object.keys(faces);
        const currentIndex = faceIds.indexOf(currentFace);
        const nextIndex = (currentIndex + 1) % faceIds.length;
        currentFace = faceIds[nextIndex];
        
        toggleFaceButton.textContent = `Face ${currentFace.replace('face', '')}`;
        updateControlsFromData(faces[currentFace].frameData[Math.floor(currentFrame)]);
        updateUIColors();
        updateUsedImageNames();
    }

    async function handleNewFaceUpload(e) {
        const file = e.target.files[0];
        if (file) {
            const faceNum = Object.keys(faces).length + 1;
            
            if (faceNum > MAX_FACES) {
                alert('Maximum number of faces (5) reached!');
                e.target.value = '';
                return;
            }
            
            const faceId = `face${faceNum}`;
            faces[faceId] = {
                overlayImage: new Image(),
                frameData: {
                    0: {
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
                color: FACE_COLORS[faceId],
                usedImageNames: new Set(['Default'])
            };
            
            const imageUrl = URL.createObjectURL(file);
            faces[faceId].overlayImage.src = imageUrl;
            
            faces[faceId].overlayImage.onload = () => {
                currentFace = faceId;
                toggleFaceButton.textContent = `Face ${faceNum}`;
                updateControlsFromData(faces[faceId].frameData[0]);
                updateUIColors();
                drawFrame();
            };
            
            e.target.value = '';
            updateAddFaceButton();
        }
    }

    // Load template if editing
    async function loadTemplate(templateId) {
        const { data: template, error } = await supabase
            .from('templates')
            .select('*')
            .eq('id', templateId)
            .single();
        
        if (error) {
            console.error('Error loading template:', error);
            alert('Failed to load template');
            return;
        }
        
        // Load video
        const videoUrl = getStorageUrl('videos', template.video_path);
        video.src = videoUrl;
        
        // Load JSON data
        const { data: jsonData } = await downloadFile('json', template.json_path);
        const templateData = JSON.parse(await jsonData.text());
        
        // Update state
        faces = templateData.faces;
        totalFrames = templateData.totalFrames;
        frameRate = templateData.frameRate;
        
        // Load face images
        for (const faceId in faces) {
            const face = faces[faceId];
            face.overlayImage = new Image();
            face.overlayImage.src = face.imagePath;
        }
        
        // Update UI
        updateUIColors();
        updateControlsFromData(faces[currentFace].frameData[0]);
    }

    async function generateThumbnail() {
        // Draw current frame to a new canvas
        const thumbnailCanvas = document.createElement('canvas');
        thumbnailCanvas.width = canvas.width;
        thumbnailCanvas.height = canvas.height;
        const thumbnailCtx = thumbnailCanvas.getContext('2d');
        
        // Draw video frame
        thumbnailCtx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Draw faces
        for (const faceId in faces) {
            const face = faces[faceId];
            if (face.frameData[currentFrame]) {
                drawFace(thumbnailCtx, face, currentFrame);
            }
        }
        
        // Convert to blob
        return new Promise(resolve => {
            thumbnailCanvas.toBlob(resolve, 'image/png');
        });
    }

    // Keep existing helper functions...
}); 