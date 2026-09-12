# Pluck

Pluck videos and audio off YouTube. A dark, minimal desktop GUI for [yt-dlp](https://github.com/yt-dlp/yt-dlp).

- Paste video or playlist links, pick **download as**: best / 2160p … 360p / MP3 / WAV
- Live progress per link, resume unfinished downloads after restart
- History with YouTube link and one-click redownload in another format
- Checks yt-dlp on startup, one-click update from settings
- Choose the output folder with a native picker

## Requirements

`yt-dlp` and `ffmpeg` on your PATH. Update yt-dlp any time from the settings dialog.

## Install

Grab the AppImage or .deb from [Releases](https://github.com/TheGeekyM/pluck/releases).

## Develop

```
npm install
npm start          # desktop app
npm run web        # browser only, http://localhost:3000
npm run dist       # build AppImage + deb into release/
```

MIT © [Mohamed Emad](https://github.com/TheGeekyM) · thegeekym@gmail.com
