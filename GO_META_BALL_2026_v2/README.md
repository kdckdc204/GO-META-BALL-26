# GO META BALL 2026 v2 — REAL ONLINE MULTIPLAYER

## What changed
- Real WebSocket server (`server.js`)
- Host creates a 6-character room code
- Friend joins the same room code from another device/browser
- Two players have separate sides and synchronized room state
- Team selection and tactic selection are synchronized
- Both players press READY → server starts one authoritative 90-minute match
- Match clock, score, commentary and quick tactics sync in real time
- OST keeps playing client-side across SPA screens

## Run locally in VS Code
1. Install Node.js 18+.
2. Open this folder in VS Code terminal.
3. Run:
   `npm install`
4. Run:
   `npm start`
5. Open `http://localhost:3000`.

### Playing with a friend on the same Wi-Fi
The friend cannot use `localhost` on their device. Find your PC's local IP (for example `192.168.x.x`) and have the friend open `http://YOUR_PC_IP:3000`. Windows Firewall may ask you to allow Node.js.

### Playing over the internet
Deploy this folder to a Node-compatible host that supports WebSockets. Set the start command to `npm start`. Then share the deployed HTTPS URL with your friend. WebSocket automatically uses `wss://` on HTTPS.

## Important
This v2 is a real multiplayer foundation, not a fake front-end room-code demo. The server is authoritative for room membership, readiness, match clock, score and commentary.

The squad database in this prototype is still not a verified complete 2025-26 EPL roster database for all 20 clubs. That can be upgraded separately without changing the multiplayer architecture.
