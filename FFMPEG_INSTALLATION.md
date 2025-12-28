# FFmpeg Installation Guide

## Why FFmpeg is Needed

FFmpeg is required for comprehensive video metadata extraction including:
- Video resolution, codec, bitrate, frame rate
- Audio codec, sample rate, channels
- Embedded GPS coordinates
- Camera make/model information
- Recording timestamps
- Quality assessment

Without FFmpeg, only basic file information (size, format) is available.

---

## Installation Instructions

### Windows

#### Option 1: Using Chocolatey (Recommended)
```bash
# Install Chocolatey first if not installed
# Then run:
choco install ffmpeg
```

#### Option 2: Manual Installation
1. Download FFmpeg from: https://www.gyan.dev/ffmpeg/builds/
2. Download the "ffmpeg-release-essentials.zip"
3. Extract to `C:\ffmpeg`
4. Add to PATH:
   - Open System Properties → Environment Variables
   - Edit "Path" variable
   - Add: `C:\ffmpeg\bin`
5. Restart terminal and verify:
   ```bash
   ffmpeg -version
   ```

### macOS

#### Using Homebrew (Recommended)
```bash
brew install ffmpeg
```

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install ffmpeg
```

### Linux (CentOS/RHEL)

```bash
sudo yum install ffmpeg
```

---

## Verification

After installation, verify FFmpeg is working:

```bash
ffmpeg -version
ffprobe -version
```

You should see version information for both commands.

---

## Restart Server

After installing FFmpeg:

1. Stop the Node.js server (Ctrl+C)
2. Restart the server:
   ```bash
   cd server
   npm start
   ```

---

## Re-upload Videos

Videos uploaded before FFmpeg installation will only have basic metadata.
To get comprehensive metadata:

1. Delete old videos (optional)
2. Re-upload videos
3. Metadata extraction will now include full details

---

## Troubleshooting

### "Cannot find ffprobe" Error

**Cause**: FFmpeg not in system PATH

**Solution**:
1. Verify installation: `ffmpeg -version`
2. If command not found, add FFmpeg to PATH
3. Restart terminal/command prompt
4. Restart Node.js server

### FFmpeg Installed but Still Not Working

**Solution**:
1. Restart your computer (Windows)
2. Ensure `ffmpeg` and `ffprobe` are both in PATH
3. Check `ffmpeg-static` npm package is installed:
   ```bash
   cd server
   npm install ffmpeg-static
   ```

---

## Alternative: Use ffmpeg-static (Node.js Package)

The system already uses `ffmpeg-static` which should include FFmpeg binaries.
If it's not working, try reinstalling:

```bash
cd server
npm uninstall ffmpeg-static
npm install ffmpeg-static
```

---

## Current Status

Without FFmpeg, the system will:
- ✅ Upload videos successfully
- ✅ Extract frames for object detection
- ✅ Store basic file information
- ❌ Cannot extract comprehensive metadata
- ❌ Cannot show video quality assessment
- ❌ Cannot extract GPS coordinates
- ❌ Cannot show camera information

With FFmpeg, you get:
- ✅ All basic features
- ✅ Comprehensive metadata extraction
- ✅ Quality assessment (excellent/good/fair/poor)
- ✅ CCTV suitability scoring
- ✅ GPS coordinates (if embedded)
- ✅ Camera make/model detection
- ✅ AI-powered recommendations

---

## Support

If you continue to have issues after following these steps, check:
1. Server logs for specific error messages
2. FFmpeg installation path
3. System PATH environment variable
4. Node.js server restart
