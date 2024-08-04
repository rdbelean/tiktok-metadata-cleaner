const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { exec } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
const PORT = 3000;

const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));
app.use(express.json());

// Function to get video metadata using ffprobe
const getMetadata = (filePath) => {
    return new Promise((resolve, reject) => {
        exec(`ffprobe -v quiet -print_format json -show_format -show_streams ${filePath}`, (err, stdout, stderr) => {
            if (err) {
                reject(err);
            } else {
                resolve(JSON.parse(stdout));
            }
        });
    });
};

app.post('/upload', upload.single('videoFile'), async (req, res) => {
    const videoPath = req.file.path;
    const cleanedPath = path.join(__dirname, 'cleaned', 'cleaned_video.mp4');

    try {
        console.log(`Getting metadata for original video: ${videoPath}`);
        const originalMetadata = await getMetadata(videoPath);
        console.log(`Original Metadata:`, originalMetadata);

        console.log(`Cleaning metadata for video: ${videoPath}`);
        ffmpeg(videoPath)
            .outputOptions('-map_metadata', '-1') // Remove metadata
            .outputOptions('-vf', 'eq=saturation=1.1') // Adjust saturation
            .on('end', async () => {
                console.log(`Successfully cleaned video. Output saved to: ${cleanedPath}`);

                console.log(`Getting metadata for cleaned video: ${cleanedPath}`);
                const cleanedMetadata = await getMetadata(cleanedPath);
                console.log(`Cleaned Metadata:`, cleanedMetadata);

                res.json({ cleanedUrl: `/cleaned/cleaned_video.mp4`, originalMetadata, cleanedMetadata });
            })
            .on('error', (err) => {
                console.error(`Error during ffmpeg processing: ${err.message}`);
                res.status(500).json({ message: `Error cleaning video: ${err.message}` });
            })
            .save(cleanedPath);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        res.status(500).json({ message: `Error processing video: ${error.message}` });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});