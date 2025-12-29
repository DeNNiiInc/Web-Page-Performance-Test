const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

/**
 * Creates an MP4 video from an array of frame objects.
 * @param {Array} frames - Array of { data: base64 } objects
 * @param {number} outputFps - Frames per second
 * @returns {Promise<string>} - Path to generated video file
 */
async function createVideoFromFrames(frames, outputFps = 10) {
    if (!frames || frames.length === 0) throw new Error('No frames provided');

    // Filter out invalid frames if any
    const validFrames = frames.filter(f => f && f.data);
    if (validFrames.length === 0) throw new Error('No valid frames found');

    const tempDir = path.join(os.tmpdir(), 'frames-' + uuidv4());
    fs.mkdirSync(tempDir, { recursive: true });

    try {
        // Save frames as images
        for (let i = 0; i < validFrames.length; i++) {
            const frame = validFrames[i];
            // Remove header if present
            const base64Data = frame.data.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');
            const filePath = path.join(tempDir, `frame-${i.toString().padStart(5, '0')}.jpg`);
            fs.writeFileSync(filePath, buffer);
        }

        const outputPath = path.join(os.tmpdir(), `video-${uuidv4()}.mp4`);

        return new Promise((resolve, reject) => {
            ffmpeg()
                .input(path.join(tempDir, 'frame-%05d.jpg'))
                .inputFPS(outputFps)
                .output(outputPath)
                .outputOptions([
                    '-c:v libx264',
                    '-pix_fmt yuv420p',
                    '-crf 23',
                    '-preset fast',
                    '-movflags +faststart' // Optimize for web playback
                ])
                .on('end', () => {
                    // Cleanup frames
                    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch(e) {}
                    resolve(outputPath);
                })
                .on('error', (err) => {
                    // Cleanup frames
                    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch(e) {}
                    console.error('FFmpeg video generation error:', err);
                    reject(err);
                })
                .run();
        });
    } catch (e) {
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch(err) {}
        throw e;
    }
}

module.exports = { createVideoFromFrames };
