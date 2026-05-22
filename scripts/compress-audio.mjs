import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const require = createRequire(import.meta.url);
const ffmpeg = require("fluent-ffmpeg");
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");

const files = [
  { name: "love-instrumental.mp3", bitrate: "64k" },
  { name: "valle-music.mp3", bitrate: "64k" },
  { name: "voice-call-ringtone.mp3", bitrate: "48k" },
  { name: "video-call-ringtone.mp3", bitrate: "48k" },
  { name: "outgoing-voice-call.mp3", bitrate: "48k" },
  { name: "outgoing-video-call.mp3", bitrate: "48k" },
];

async function compress(file) {
  const input = path.join(publicDir, file.name);
  const tmp = path.join(publicDir, "_tmp_" + file.name);

  const before = fs.statSync(input).size;

  await new Promise((resolve, reject) => {
    ffmpeg(input)
      .audioBitrate(file.bitrate)
      .audioChannels(1)
      .audioFrequency(44100)
      .output(tmp)
      .on("end", resolve)
      .on("error", reject)
      .run();
  });

  const after = fs.statSync(tmp).size;
  fs.renameSync(tmp, input);
  console.log(
    `${file.name}: ${(before / 1024).toFixed(0)} KB → ${(after / 1024).toFixed(0)} KB (${Math.round((1 - after / before) * 100)}% smaller)`
  );
}

for (const file of files) {
  try {
    await compress(file);
  } catch (err) {
    console.error(`Failed ${file.name}:`, err.message);
  }
}
