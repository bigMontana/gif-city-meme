This website will be a Meme Maker where users can upload an image of a head/face and then that face will be added to a video of a meme.

The website will have a simple and clean design.

I want to work this site out in steps because it requires a few separate steps:

1. The users won't see this, but I need a page that will allow me to upload a video, scrub/click through the video
    frame by frame. Add a square ontop of the video and control the squares position, rotation, scale, and skew for each frame of the video.  This 'square data' will be stored in a json file for each frame of the video. Probably Supabase will be used to store these files.  It will store the video file, the json file, and a thumbnail of the video.

2. The users will see a page where they can upload an image of a head/face, and below all the videos that have been uploaded.  This face will then be added to the videos using the 'square data' stored in the json file for each frame of the video.

3. Users will be able to download the meme video with their uploaded face applied to it.
