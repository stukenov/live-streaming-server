const express = require('express');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3010;

express.static.mime.define({
  'application/vnd.apple.mpegurl': ['m3u8'],
  'video/mp2t': ['ts']
});

app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'change-me-in-production',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim());

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes('*')) {
    res.header('Access-Control-Allow-Origin', '*');
  } else if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

  if (req.path.endsWith('.m3u8')) {
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
  } else if (req.path.endsWith('.ts')) {
    res.setHeader('Content-Type', 'video/mp2t');
  }

  next();
});

app.use((req, res, next) => {
  if (!req.session.playerId) {
    req.session.playerId = uuidv4();
  }
  next();
});

app.use(express.static(__dirname, {
  setHeaders: (res, filePath) => {
    if (filePath.includes(path.join(__dirname, 'hls'))) {
      return res.status(403).end('Forbidden');
    }
  },
  index: false
}));

app.get('*.js', (req, res, next) => {
  const filePath = path.join(__dirname, req.path);
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) return next();
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(filePath);
  });
});

app.get('*.css', (req, res, next) => {
  const filePath = path.join(__dirname, req.path);
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) return next();
    res.setHeader('Content-Type', 'text/css');
    res.sendFile(filePath);
  });
});

app.get('/', (req, res) => {
  const playerHtmlPath = path.join(__dirname, 'index.html');

  fs.readFile(playerHtmlPath, 'utf8', (err, htmlContent) => {
    if (err) {
      return res.status(500).send('Error reading player file');
    }

    const secureHlsUrl = `/hls/${req.session.playerId}/master.m3u8`;
    const modifiedHtml = htmlContent.replace('##SECURE_HLS_URL##', secureHlsUrl);

    res.setHeader('Content-Type', 'text/html');
    res.send(modifiedHtml);
  });
});

app.get('/hls/:sessionId/*', (req, res, next) => {
  const { sessionId } = req.params;
  const requestedPath = req.params[0];

  if (sessionId !== req.session.playerId) {
    return res.status(403).send('Access denied: invalid session');
  }

  const realFilePath = path.join(__dirname, 'hls', requestedPath);

  fs.access(realFilePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).send('File not found');
    }

    if (realFilePath.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else if (realFilePath.endsWith('.ts')) {
      res.setHeader('Content-Type', 'video/mp2t');
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }

    res.sendFile(realFilePath);
  });
});

app.get('/hls/:sessionId/master.m3u8', (req, res) => {
  const { sessionId } = req.params;

  if (sessionId !== req.session.playerId) {
    return res.status(403).send('Access denied: invalid session');
  }

  const masterPath = path.join(__dirname, 'hls', 'master.m3u8');

  fs.readFile(masterPath, 'utf8', (err, data) => {
    if (err) {
      return res.status(404).send('master.m3u8 not found');
    }

    const modifiedContent = data.replace(
      /^(?!#)(.*\.m3u8)$/gm,
      (match) => {
        if (!match.startsWith('#')) {
          const fileName = match.trim();
          return `/hls/${sessionId}/${fileName}`;
        }
        return match;
      }
    );

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.send(modifiedContent);
  });
});

app.listen(port, () => {
  console.log(`Player server running at http://localhost:${port}`);
});
