# Sports Trivia Showdown

A real-time multiplayer sports trivia game. Two to twenty players join a shared room from separate devices. The server synchronizes questions, validates answers and awards speed-based points.

## Run locally

1. Install Node.js 18 or newer.
2. In this folder run `npm install` and then `npm start`.
3. Open http://localhost:3000 in a browser.

## Publish a public URL (Render)

1. Upload this project folder to a GitHub repository (put package.json at the repository root).
2. On Render.com, create a **New > Web Service** connected to the repository.
3. Set runtime to **Node**, build command to `npm install`, and start command to `npm start`.
4. Deploy, then share the HTTPS URL provided by Render. Open it on two devices to test.

Socket.IO requires persistent WebSocket-capable hosting; do not use a static-site-only host. Rooms are held in server memory and are cleared when the server restarts. Use a single server instance (no horizontal scaling) for this version. Some free hosting plans sleep when idle, so allow time for the first visit.

## Rules

- At least 2 players; maximum 20 per room.
- Host starts 10 multiple-choice questions, each with a 15-second time limit.
- One answer per player per question.
- Correct answers: 0–3 seconds = 1000; >3–6 = 800; >6–10 = 600; >10–15 = 400. Incorrect or missed = 0.
- All players see round results and a leaderboard. The host advances to the next question.
- Highest score after 10 questions wins; ties share first place.

## Notes

Do not use this prototype for prizes or high-stakes competitions; there is no authentication or anti-cheat protection. Room codes are not private authentication credentials.
