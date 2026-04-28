# Contributing to Live Streaming Server

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `make install`
3. Copy environment files: `cp .env.example .env`
4. Start development servers: `make dev`

## Project Structure

- `api/` -- NestJS backend (TypeScript)
- `dash/` -- Next.js frontend (TypeScript, React)
- `player/` -- Express.js HLS player (JavaScript)
- `media/` -- MediaMTX configuration

## Making Changes

1. Create a feature branch from `main`
2. Make your changes
3. Run tests: `make test`
4. Run linters: `make lint`
5. Submit a pull request

## Code Style

- TypeScript for API and Dashboard
- Follow existing patterns in the codebase
- No comments unless explaining a non-obvious "why"
- Keep PRs focused -- one feature or fix per PR

## Commit Messages

Use clear, concise commit messages:

```
feat: add stream recording endpoint
fix: resolve CORS issue with HLS segments
docs: update deployment instructions
```

## Reporting Issues

- Search existing issues before creating a new one
- Include steps to reproduce for bugs
- Include your environment (OS, Node.js version, Docker version)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
