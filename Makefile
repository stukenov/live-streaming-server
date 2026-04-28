.PHONY: install dev build test lint docker-up docker-down docker-build clean

install:
	cd api && npm install
	cd dash && npm install
	cd player && npm install

dev:
	@echo "Starting all services in development mode..."
	@echo "API:       http://localhost:3001"
	@echo "Dashboard: http://localhost:3000"
	@echo "Player:    http://localhost:3010"
	@echo "MediaMTX:  rtmp://localhost:1935"
	@echo ""
	npx concurrently -n api,dash,player -c blue,green,yellow \
		"cd api && npm run dev" \
		"cd dash && npm run dev" \
		"cd player && npm start"

build:
	cd api && npm run build
	cd dash && npm run build

test:
	cd api && npm test

lint:
	cd api && npm run lint
	cd dash && npm run lint

docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-build:
	docker compose build

docker-logs:
	docker compose logs -f

clean:
	rm -rf api/node_modules api/dist
	rm -rf dash/node_modules dash/.next
	rm -rf player/node_modules
