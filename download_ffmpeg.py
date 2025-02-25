import urllib.request
import os

# Create ffmpeg directory if it doesn't exist
if not os.path.exists('ffmpeg'):
    os.makedirs('ffmpeg')

# Files to download with updated versions
files = [
    ('https://unpkg.com/@ffmpeg/ffmpeg@0.10.1/dist/ffmpeg.min.js', 'ffmpeg.min.js'),
    ('https://unpkg.com/@ffmpeg/core@0.10.0/dist/ffmpeg-core.js', 'ffmpeg-core.js'),
    ('https://unpkg.com/@ffmpeg/core@0.10.0/dist/ffmpeg-core.worker.js', 'ffmpeg-core.worker.js'),
    ('https://unpkg.com/@ffmpeg/core@0.10.0/dist/ffmpeg-core.wasm', 'ffmpeg-core.wasm')
]

# Download each file
for url, filename in files:
    print(f"Downloading {filename}...")
    urllib.request.urlretrieve(url, f'ffmpeg/{filename}')
    print(f"Downloaded {filename}")