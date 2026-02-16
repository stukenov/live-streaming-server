# Live Streaming Server

A complete live streaming solution with NestJS API, Next.js dashboard, HLS player, and MediaMTX integration for real-time video streaming.

## Features

- **Live Streaming**: Real-time HLS streaming with MediaMTX
- **Management Dashboard**: Modern Next.js dashboard for stream management
- **REST API**: NestJS-powered API for stream control
- **Web Player**: Lightweight HLS.js-based video player
- **Multi-Stream Support**: Handle multiple concurrent live streams
- **Stream Monitoring**: Real-time stream health monitoring
- **DVR Support**: Time-shift viewing capabilities
- **Low Latency**: Optimized for minimal streaming delay

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Streamer  │────▶│  MediaMTX   │────▶│  HLS Output │
└─────────────┘     └─────────────┘     └─────────────┘
                            │                    │
                            ▼                    ▼
                    ┌─────────────┐     ┌─────────────┐
                    │  NestJS API │     │   Players   │
                    └─────────────┘     └─────────────┘
                            │
                            ▼
                    ┌─────────────┐
                    │  Dashboard  │
                    └─────────────┘
```

## Tech Stack

### API (`/api`)
- **Framework**: NestJS 11
- **Runtime**: Node.js with TypeScript
- **Testing**: Jest
- **Config**: @nestjs/config

### Dashboard (`/dash`)
- **Framework**: Next.js 15 (with Turbopack)
- **UI**: React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Components**: Radix UI
- **Icons**: Lucide React

### Player (`/player`)
- **Framework**: Express.js
- **Video**: HLS.js
- **Session**: express-session

### Media Server (`/media`)
- **Server**: MediaMTX
- **Protocol**: HLS, RTMP, RTSP
- **Format**: H.264, AAC

## Prerequisites

- Node.js 18+
- MediaMTX (included in `/media`)
- FFmpeg (for streaming to server)
- OBS Studio or similar streaming software

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/stukenov/live-streaming-server.git
cd live-streaming-server
```

### 2. Environment Setup

Copy example environment files:
```bash
cp .env.example .env
cp api/.env.example api/.env
cp dash/.env.example dash/.env
```

Configure `.env`:
```env
NODE_ENV=development
PORT=3001
ALLOWED_ORIGINS=http://localhost:3000
MEDIA_SERVER_URL=http://localhost:8889
```

### 3. Install Dependencies

Install for all components:
```bash
# API
cd api && npm install && cd ..

# Dashboard
cd dash && npm install && cd ..

# Player
cd player && npm install && cd ..
```

### 4. Start MediaMTX

```bash
cd media
./mediamtx
```

MediaMTX will start on default ports:
- HLS: 8888
- RTMP: 1935
- RTSP: 8554

### 5. Start API

```bash
cd api
npm run dev
```

API runs on `http://localhost:3001`

### 6. Start Dashboard

```bash
cd dash
npm run dev
```

Dashboard runs on `http://localhost:3000`

### 7. Start Player (Optional)

```bash
cd player
npm start
```

Player runs on `http://localhost:8080`

## Usage

### Streaming to Server

#### Using OBS Studio

1. Open OBS Studio
2. Go to Settings → Stream
3. Set:
   - Service: Custom
   - Server: `rtmp://localhost:1935/live`
   - Stream Key: `your-stream-name`
4. Click "Start Streaming"

#### Using FFmpeg

```bash
ffmpeg -re -i input.mp4 \
  -c:v libx264 -c:a aac \
  -f flv rtmp://localhost:1935/live/your-stream-name
```

### Viewing Stream

Open in browser:
```
http://localhost:8888/live/your-stream-name/index.m3u8
```

Or use the web player:
```
http://localhost:8080/?stream=your-stream-name
```

## Project Structure

```
.
├── api/                    # NestJS API
│   ├── src/
│   │   ├── app.module.ts   # Main module
│   │   ├── main.ts         # Entry point
│   │   └── media/          # Media endpoints
│   ├── test/               # Tests
│   └── package.json
│
├── dash/                   # Next.js Dashboard
│   ├── src/
│   │   ├── app/            # App router pages
│   │   └── components/     # React components
│   └── package.json
│
├── player/                 # Web Player
│   ├── server.js           # Express server
│   ├── index.html          # Player page
│   └── script.js           # HLS.js integration
│
├── media/                  # MediaMTX
│   ├── mediamtx            # Server binary
│   ├── mediamtx.yml        # Configuration
│   └── hls/                # HLS output
│
├── .github/                # CI/CD workflows
├── .env.example            # Environment template
└── README.md               # This file
```

## API Endpoints

### Media

- `GET /media/paths` - Get available media paths
- `GET /media/list` - List all active streams
- `POST /media/stream` - Create/configure stream
- `DELETE /media/stream/:id` - Delete stream

### Health

- `GET /` - API health check

## Configuration

### MediaMTX Configuration (`media/mediamtx.yml`)

Key settings:
```yaml
# HLS configuration
paths:
  all:
    source: publisher
    
# RTMP configuration
rtmpAddress: :1935

# HLS configuration
hlsAddress: :8888
hlsServerPath: hls
```

### API Configuration

Environment variables:
- `NODE_ENV` - Environment (development/production)
- `PORT` - API server port
- `ALLOWED_ORIGINS` - CORS allowed origins (comma-separated)
- `MEDIA_SERVER_URL` - MediaMTX API URL

## Development

### Running in Dev Mode

```bash
# API with hot reload
cd api && npm run dev

# Dashboard with Turbopack
cd dash && npm run dev

# Player
cd player && npm start
```

### Building for Production

```bash
# API
cd api && npm run build && npm run start:prod

# Dashboard
cd dash && npm run build && npm start

# MediaMTX (already compiled binary)
cd media && ./mediamtx
```

### Testing

```bash
# API unit tests
cd api && npm test

# API e2e tests
cd api && npm run test:e2e

# Test coverage
cd api && npm run test:cov
```

## Stream Protocols

### Supported Input Protocols
- RTMP (Real-Time Messaging Protocol)
- RTSP (Real-Time Streaming Protocol)
- WebRTC
- SRT (Secure Reliable Transport)

### Supported Output Protocols
- HLS (HTTP Live Streaming)
- DASH (Dynamic Adaptive Streaming)
- Low-Latency HLS
- WebRTC

## Performance Optimization

### Recommended Settings

For low latency:
```yaml
hlsSegmentDuration: 1s
hlsPartDuration: 200ms
```

For better compatibility:
```yaml
hlsSegmentDuration: 4s
hlsPartDuration: 1s
```

### Scaling

- Use CDN for HLS output
- Load balance multiple MediaMTX instances
- Implement stream origin/edge architecture
- Cache HLS segments at edge locations

## Troubleshooting

### Stream Not Playing

1. Check MediaMTX is running: `http://localhost:8889/`
2. Verify stream is publishing: Check dashboard
3. Test HLS URL directly in VLC
4. Check browser console for CORS errors

### High Latency

1. Reduce HLS segment duration
2. Enable low-latency HLS mode
3. Use WebRTC for sub-second latency
4. Optimize encoder settings

### Connection Issues

1. Check firewall settings (ports 1935, 8888, 8889)
2. Verify CORS configuration in API
3. Check MediaMTX logs
4. Test with direct IP instead of localhost

## Security Considerations

- Implement stream key authentication
- Use HTTPS for dashboard and API
- Secure MediaMTX API endpoints
- Rate limit API requests
- Validate stream inputs
- Implement user authentication

## CI/CD

GitHub Actions workflow included:
- Automated testing
- Build verification
- Dependency updates (Dependabot)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Author

Saken Tukenov

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

- [MediaMTX](https://github.com/bluenviron/mediamtx) - Media server
- [NestJS](https://nestjs.com/) - Backend framework
- [Next.js](https://nextjs.org/) - Frontend framework
- [HLS.js](https://github.com/video-dev/hls.js/) - Video player

## Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/stukenov/live-streaming-server/issues)
- Documentation: This README

## Roadmap

- [ ] Add authentication system
- [ ] Implement stream recording
- [ ] Add chat integration
- [ ] Support multiple quality levels
- [ ] Add stream analytics
- [ ] Implement CDN integration
