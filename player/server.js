const express = require('express');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3010;

// Настройка MIME-типов для HLS
express.static.mime.define({
  'application/vnd.apple.mpegurl': ['m3u8'],
  'video/mp2t': ['ts']
});

// Настройка cookie и сессий
app.use(cookieParser());
app.use(session({
  secret: 'player-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', 
    maxAge: 24 * 60 * 60 * 1000 // 24 часа
  }
}));

// CORS middleware для разрешения cross-origin запросов
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  
  // Добавляем специальные заголовки для HLS файлов
  if (req.path.endsWith('.m3u8')) {
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
  } else if (req.path.endsWith('.ts')) {
    res.setHeader('Content-Type', 'video/mp2t');
  }
  
  next();
});

// Создание или получение уникального идентификатора сессии
app.use((req, res, next) => {
  if (!req.session.playerId) {
    req.session.playerId = uuidv4();
  }
  next();
});

// Serve static files (кроме директории hls и index.html)
app.use(express.static(__dirname, {
  setHeaders: (res, filePath) => {
    // Запрещаем прямой доступ к hls директории
    if (filePath.includes(path.join(__dirname, 'hls'))) {
      return res.status(403).end('Forbidden');
    }
  },
  index: false // Отключаем автоматическую отдачу index.html
}));

// Отдача JS и CSS файлов как есть
app.get('*.js', (req, res, next) => {
  const filePath = path.join(__dirname, req.path);
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return next();
    }
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(filePath);
  });
});

app.get('*.css', (req, res, next) => {
  const filePath = path.join(__dirname, req.path);
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return next();
    }
    res.setHeader('Content-Type', 'text/css');
    res.sendFile(filePath);
  });
});

// Route for the main page - с динамической подстановкой URL
app.get('/', (req, res) => {
  const playerHtmlPath = path.join(__dirname, 'index.html');
  
  fs.readFile(playerHtmlPath, 'utf8', (err, htmlContent) => {
    if (err) {
      return res.status(500).send('Ошибка при чтении файла плеера');
    }
    
    const secureHlsUrl = `/hls/${req.session.playerId}/master.m3u8`;
    
    // Простая замена шаблонной строки ##SECURE_HLS_URL## на реальный URL
    // Необходимо убедиться, что в index.html присутствует эта строка
    const modifiedHtml = htmlContent.replace('##SECURE_HLS_URL##', secureHlsUrl);
    
    res.setHeader('Content-Type', 'text/html');
    res.send(modifiedHtml);
  });
});

// Защищенный доступ к HLS файлам
app.get('/hls/:sessionId/*', (req, res, next) => {
  const { sessionId } = req.params;
  const requestedPath = req.params[0];
  
  // Проверка валидности сессии
  if (sessionId !== req.session.playerId) {
    return res.status(403).send('Доступ запрещен: недействительный идентификатор сессии');
  }
  
  // Формируем путь к реальному файлу (без sessionId)
  const realFilePath = path.join(__dirname, 'hls', requestedPath);
  
  // Проверка существования файла
  fs.access(realFilePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).send('Файл не найден');
    }
    
    // Устанавливаем правильные заголовки в зависимости от типа файла
    if (realFilePath.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else if (realFilePath.endsWith('.ts')) {
      res.setHeader('Content-Type', 'video/mp2t');
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
    
    // Отправляем файл
    res.sendFile(realFilePath);
  });
});

// Специальная логика для обработки master.m3u8
app.get('/hls/:sessionId/master.m3u8', (req, res) => {
  const { sessionId } = req.params;
  
  // Проверка валидности сессии
  if (sessionId !== req.session.playerId) {
    return res.status(403).send('Доступ запрещен: недействительный идентификатор сессии');
  }
  
  const masterPath = path.join(__dirname, 'hls', 'master.m3u8');
  
  fs.readFile(masterPath, 'utf8', (err, data) => {
    if (err) {
      return res.status(404).send('Файл master.m3u8 не найден');
    }
    
    // Модифицируем m3u8 содержимое, чтобы все ссылки на другие m3u8 файлы тоже содержали идентификатор сессии
    const modifiedContent = data.replace(
      /^(?!#)(.*\.m3u8)$/gm, 
      (match) => {
        // Если это реальная ссылка на файл m3u8 (не комментарий), добавляем сессию
        if (!match.startsWith('#')) {
          // Получаем имя файла
          const fileName = match.trim();
          // Возвращаем путь с идентификатором сессии
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

// Start the server
app.listen(port, () => {
  console.log(`Player server running at http://localhost:${port}`);
  console.log(`Access the player at http://localhost:${port}/`);
  console.log(`Each user will receive a personalized HTML with secure HLS URL`);
}); 