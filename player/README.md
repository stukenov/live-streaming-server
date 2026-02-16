# Player Server

A simple Express server to serve the player files with secure HLS streaming.

## Setup

1. Install dependencies:
```
npm install
```

2. Prepare your HTML file:
```html
<!-- В вашем index.html используйте следующую строку-шаблон для URL -->
<source src="##SECURE_HLS_URL##" type="application/x-mpegURL">
```

3. Start the server:
```
npm start
```

The server will run at http://localhost:3010 by default.

## Features

- Serves the player HTML as a template with dynamic URL replacement
- Uses a simple template approach with the placeholder `##SECURE_HLS_URL##`
- Securely serves HLS (HTTP Live Streaming) content:
  - Protected access to HLS streams via session-based UUIDs
  - Each user gets a unique URL path like `/hls/{uuid}/master.m3u8`
  - Cookie-based session management
  - Direct access to HLS directory is forbidden
  - `.m3u8` playlist files with proper MIME type (`application/vnd.apple.mpegurl`)
  - `.ts` segment files with proper MIME type (`video/mp2t`)
  - Appropriate caching headers for both types
  - CORS headers for cross-origin playback

## How It Works

1. When a user visits the player page, the server creates a unique session ID
2. The server reads the index.html file and replaces `##SECURE_HLS_URL##` with the secure URL
3. The player automatically uses the secure URL embedded in the HTML
4. All playlist references inside master.m3u8 are also rewritten to include the session ID

## Accessing The Player

Simply visit:
```
http://localhost:3010/
```

The server automatically handles session creation and injects the secure URL into your player HTML.

## HTML Template Example

See the provided `index.html.example` file for a complete example of how to set up your player HTML with the template placeholder.

## Configuration

You can change the port by setting the PORT environment variable:
```
PORT=8080 npm start
``` 