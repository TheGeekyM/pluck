const express = require('express');
const { spawn, execFile } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const SETTINGS = path.join(__dirname, 'settings.json');
const load = () => fs.existsSync(SETTINGS) ? JSON.parse(fs.readFileSync(SETTINGS)) : { outputDir: path.join(require('os').homedir(), 'Downloads') };

// ponytail: pip --user install lands in ~/.local/bin, prefer it over the system copy
const YTDLP = fs.existsSync(path.join(os.homedir(), '.local/bin/yt-dlp')) ? path.join(os.homedir(), '.local/bin/yt-dlp') : 'yt-dlp';
const ytdlpVersion = () => new Promise(r => execFile(YTDLP, ['--version'], (e, out) => r(e ? null : out.trim())));

app.get('/api/ytdlp', async (req, res) => {
  const version = await ytdlpVersion();
  const latest = await fetch('https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest', { signal: AbortSignal.timeout(5000) })
    .then(r => r.json()).then(j => j.tag_name).catch(() => null);
  res.json({ installed: !!version, version, latest, outdated: !!(version && latest && version < latest) });
});
app.post('/api/ytdlp/update', (req, res) => {
  execFile('python3', ['-m', 'pip', 'install', '-U', '--user', '--break-system-packages', 'yt-dlp'], async (e, out, err) => {
    const version = await ytdlpVersion(), all = out + err;
    const output = e ? all.split('\n').filter(l => !/^WARNING/.test(l)).slice(-3).join('\n')
      : /Successfully installed/.test(all) ? `Updated to ${version}` : `Already up to date (${version})`;
    res.json({ ok: !e, output, version });
  });
});
const QUEUE = path.join(__dirname, 'queue.json'); // ponytail: client owns state, posts whole thing on change
app.get('/api/queue', (req, res) => res.json(fs.existsSync(QUEUE) ? JSON.parse(fs.readFileSync(QUEUE)) : { queue: [], history: [] }));
app.post('/api/queue', (req, res) => { fs.writeFileSync(QUEUE, JSON.stringify(req.body)); res.json({ ok: true }); });
app.get('/api/pick', async (req, res) => {
  const d = await app.pickFolder?.(); // set by main.js (Electron only)
  res.json({ outputDir: d || null });
});
app.get('/api/settings', (req, res) => res.json(load()));
app.post('/api/settings', (req, res) => {
  const dir = path.resolve(String(req.body.outputDir || ''));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SETTINGS, JSON.stringify({ outputDir: dir }));
  res.json({ outputDir: dir });
});

// format -> yt-dlp args. ponytail: fixed list, extend the map if more formats needed
const FORMATS = {
  best: ['-f', 'bv*+ba/b'],
  '2160': ['-f', 'bv*[height<=2160]+ba/b[height<=2160]'],
  '1440': ['-f', 'bv*[height<=1440]+ba/b[height<=1440]'],
  '1080': ['-f', 'bv*[height<=1080]+ba/b[height<=1080]'],
  '720':  ['-f', 'bv*[height<=720]+ba/b[height<=720]'],
  '480':  ['-f', 'bv*[height<=480]+ba/b[height<=480]'],
  '360':  ['-f', 'bv*[height<=360]+ba/b[height<=360]'],
  mp3: ['-x', '--audio-format', 'mp3', '--audio-quality', '0'],
  wav: ['-x', '--audio-format', 'wav'],
};

// SSE: streams yt-dlp output lines for one URL
app.get('/api/download', (req, res) => {
  let { url = '', format } = req.query;
  const args = FORMATS[format];
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
  const send = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  try { new URL(url); } catch { send('log', 'ERROR: invalid URL'); send('done', 1); return res.end(); }
  if (!args) { send('log', 'ERROR: unknown format'); send('done', 1); return res.end(); }

  const out = path.join(load().outputDir, '%(playlist_title|)s', '%(title)s.%(ext)s');
  const p = spawn(YTDLP, ['--newline', '--no-colors', '--no-update', '-o', out, '--merge-output-format', 'mp4', ...args, url]);
  p.on('error', e => { send('log', 'ERROR: ' + e.message); send('done', 1); res.end(); });
  p.stdout.on('data', d => d.toString().split('\n').filter(Boolean).forEach(l => send('log', l)));
  p.stderr.on('data', d => send('log', d.toString().trim()));
  p.on('close', code => { send('done', code); res.end(); });
  req.on('close', () => p.kill());
});

module.exports = app;
if (require.main === module) app.listen(3000, '127.0.0.1', () => console.log("http://localhost:3000"));
