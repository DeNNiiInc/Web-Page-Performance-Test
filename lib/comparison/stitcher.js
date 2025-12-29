const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');

/**
 * Stitches two videos side-by-side.
 * @param {string} video1 Path to first video
 * @param {string} video2 Path to second video
 * @param {string} outputPath Path to save output
 * @returns {Promise<string>}
 */
function stitchVideos(video1, video2, outputPath) {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(video1) || !fs.existsSync(video2)) {
            return reject(new Error('One or both input videos not found'));
        }

        ffmpeg()
            .input(video1)
            .input(video2)
            .complexFilter([
                {
                    filter: 'hstack',
                    options: { inputs: 2 },
                    outputs: 'v'
                }
            ])
            .map('v') // Map the video stream from filter
             // We assume no audio for speed tests usually, or we ignore it
            .outputOptions([
                '-c:v libx264',
                '-crf 23',
                '-preset fast'
            ])
            .save(outputPath)
            .on('end', () => {
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('FFmpeg error:', err);
                reject(err);
            });
    });
}

module.exports = { stitchVideos };
