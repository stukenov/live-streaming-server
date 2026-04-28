<p align="center">
  <h1 align="center">Live Streaming Server</h1>
  <p align="center">
    Self-hosted live streaming infrastructure with RTMP ingest, HLS delivery, real-time dashboard, and REST API.
  </p>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> &bull;
  <a href="#architecture">Architecture</a> &bull;
  <a href="#features">Features</a> &bull;
  <a href="#configuration">Configuration</a> &bull;
  <a href="#deployment">Deployment</a> &bull;
  <a href="#contributing">Contributing</a>
</p>

---

## Why Live Streaming Server?

Most live streaming solutions are either expensive SaaS platforms or require stitching together dozens of tools. This project gives you a complete, production-ready streaming stack in a single repository:

- **One command to start** -- `docker compose up` and you're streaming
- **Full control** -- self-hosted, no vendor lock-in, MIT licensed
- **Modern stack** -- NestJS, Next.js 15, MediaMTX, TypeScript throughout
- **Protocol flexibility** -- ingest via RTMP, RTSP, WebRTC, or SRT; deliver via HLS, DASH, or WebRTC

## Quick Start

### Option 1: Docker (Recommended)

```bash
git clone https://github.com/stukenov/live-streaming-server.git
cd live-streaming-server
docker compose up -d
```

Services will be available at:

| Service | URL | Purpose |
|---------|-----|---------|
| Dashboard | http://localhost:3000 | Stream monitoring UI |
| API | http://localhost:3001 | REST API |
| HLS Output | http://localhost:8888 | Video playback |
| RTMP Ingest | rtmp://localhost:1935 | Stream input |
| Player | http://localhost:3010 | Embeddable player |

### Option 2: Manual Setup

**Prerequisites:** Node.js 18+, MediaMTX

```bash
# Install dependencies
make install

# Copy environment files
cp .env.example .env
cp api/.env.example api/.env
cp dash/.env.example dash/.env

# Start MediaMTX
cd media && ./mediamtx &

# Start all services
make dev
```

### Start Streaming

**Using OBS Studio:**
1. Settings → Stream → Custom
2. Server: `rtmp://localhost:1935/live`
3. Stream Key: `my-stream`
4. Click "Start Streaming"

**Using FFmpeg:**
```bash
ffmpeg -re -i input.mp4 \
  -c:v libx264 -c:a aac \
  -f flv rtmp://localhost:1935/live/my-stream
```

**Watch your stream:**
```
http://localhost:8888/live/my-stream/index.m3u8
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Live Streaming Server                    │
│                                                             │
│  ┌──────────┐     ┌───────────┐     ┌──────────────────┐   │
│  │ Streamer │────▶│ MediaMTX  │────▶│  HLS / WebRTC    │   │
│  │ (RTMP)   │     │  :1935    │     │  :8888           │   │
│  └──────────┘     └─────┬─────┘     └────────┬─────────┘   │
│                         │                     │             │
│                         ▼                     ▼             │
│                   ┌───────────┐        ┌────────────┐      │
│                   │  API      │        │  Player    │      │
│                   │  :3001    │        │  :3010     │      │
│                   └─────┬─────┘        └────────────┘      │
│                         │                                   │
│                         ▼                                   │
│                   ┌───────────┐                             │
│                   │ Dashboard │                             │
│                   │  :3000    │                             │
│                   └───────────┘                             │
└─────────────────────────────────────────────────────────────┘
```

### Components

| Component | Stack | Purpose |
|-----------|-------|---------|
| **API** (`/api`) | NestJS 11, TypeScript | Stream management REST API |
| **Dashboard** (`/dash`) | Next.js 15, React 19, Tailwind CSS 4 | Real-time monitoring UI |
| **Player** (`/player`) | Express.js, HLS.js | Embeddable video player with session security |
| **Media Server** (`/media`) | MediaMTX | Multi-protocol streaming engine |

## Features

### Streaming
- Multi-protocol ingest: RTMP, RTSP, WebRTC, SRT
- Multi-protocol delivery: HLS, DASH, Low-Latency HLS, WebRTC
- DVR / time-shift viewing
- Configurable latency (sub-second with WebRTC, 1-4s with LL-HLS)
- Multi-stream support with path-based routing

### Management
- Real-time dashboard with auto-refresh
- Stream health monitoring (bytes in/out, uptime, status)
- Live preview with inline player
- REST API for programmatic control

### Security
- Session-based player access with UUID tokens
- Configurable CORS policies
- Stream key authentication support
- API endpoint protection

### Developer Experience
- Docker Compose for one-command setup
- Hot-reload development mode for all services
- CI/CD with GitHub Actions
- TypeScript throughout the stack
- Makefile shortcuts for common operations

## API Endpoints

```
GET    /              Health check
GET    /media/paths   List available stream paths
GET    /media/list    List active HLS connections
GET    /media/rtmp    List active RTMP connections
GET    /media/stream/:name   Get stream details
DELETE /media/stream/:name   Kick/disconnect a stream
```

## Configuration

### Environment Variables

Create a `.env` file from the template:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | API server port |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | CORS origins (comma-separated) |
| `MEDIA_SERVER_URL` | `http://localhost:9997` | MediaMTX API endpoint |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Dashboard → API connection |
| `NEXT_PUBLIC_HLS_URL` | `http://localhost:8888` | Dashboard → HLS preview |
| `SESSION_SECRET` | -- | Player session encryption key |

### MediaMTX (`media/mediamtx.yml`)

Key tuning parameters:

```yaml
# Low latency (1-2s delay)
hlsSegmentDuration: 1s
hlsPartDuration: 200ms

# Better compatibility (4-6s delay)
hlsSegmentDuration: 4s
hlsPartDuration: 1s
```

See the [MediaMTX documentation](https://github.com/bluenviron/mediamtx) for the full configuration reference.

## Project Structure

```
.
├── api/                    # NestJS REST API
│   ├── src/
│   │   ├── main.ts         # Entry point with CORS setup
│   │   ├── app.module.ts   # Root module
│   │   └── media/          # Media management module
│   ├── Dockerfile
│   └── package.json
│
├── dash/                   # Next.js Dashboard
│   ├── src/
│   │   ├── app/            # App Router pages
│   │   ├── components/     # UI components
│   │   └── lib/            # API client & utilities
│   ├── Dockerfile
│   └── package.json
│
├── player/                 # Embeddable HLS Player
│   ├── server.js           # Express server with session auth
│   ├── Dockerfile
│   └── package.json
│
├── media/                  # MediaMTX Configuration
│   └── mediamtx.yml        # Streaming server config
│
├── examples/               # Example player implementations
│   ├── index.html          # Basic live player
│   └── dvr.html            # DVR player with time-shift
│
├── docker-compose.yml      # Production deployment
├── Makefile                # Developer shortcuts
└── .github/workflows/      # CI/CD pipeline
```

## Deployment

### Production with Docker

```bash
# Build and start
docker compose up -d --build

# View logs
docker compose logs -f

# Scale (if needed)
docker compose up -d --scale player=3
```

### Scaling Recommendations

- **CDN Integration**: Point a CDN at the HLS output port (8888) for edge caching
- **Multiple MediaMTX**: Run origin/edge topology for geographic distribution
- **Reverse Proxy**: Place Nginx/Caddy in front for TLS termination and load balancing
- **Monitoring**: Expose MediaMTX metrics to Prometheus/Grafana

## Development

```bash
# Install all dependencies
make install

# Start all services with hot reload
make dev

# Run tests
make test

# Run linters
make lint

# Clean build artifacts
make clean
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Stream not playing | Verify MediaMTX is running: `curl http://localhost:9997/v3/paths/list` |
| High latency | Reduce `hlsSegmentDuration` in `mediamtx.yml` |
| CORS errors | Check `ALLOWED_ORIGINS` in API `.env` |
| Dashboard empty | Confirm API is reachable at `NEXT_PUBLIC_API_URL` |
| Port conflicts | Change ports in `.env` and `docker-compose.yml` |

## Roadmap

- [ ] User authentication and role-based access
- [ ] Stream recording and VOD playback
- [ ] Live chat integration
- [ ] Adaptive bitrate transcoding
- [ ] Stream analytics and viewer metrics
- [ ] Webhook notifications (stream start/stop)
- [ ] Multi-node clustering
- [ ] Kubernetes Helm chart

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License -- see [LICENSE](LICENSE) for details.

## Acknowledgments

- [MediaMTX](https://github.com/bluenviron/mediamtx) -- Multi-protocol streaming engine
- [NestJS](https://nestjs.com/) -- Backend framework
- [Next.js](https://nextjs.org/) -- Frontend framework
- [HLS.js](https://github.com/video-dev/hls.js/) -- JavaScript HLS player
