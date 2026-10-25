# Deployment

## 1. GitHub

From the repository root:

```bash
git add client server render.yaml docs/DEPLOY.md .gitignore
git commit -m "Prepare Render, Vercel, and Atlas deployment"
git push origin main
```

The repository root must contain both `client/` and `server/`.

## 2. MongoDB Atlas

1. Create a free M0 cluster in Mumbai or Singapore, if offered.
2. Create a database user with a long random password.
3. In Network Access, allow `0.0.0.0/0` (Render has no static outbound IP).
4. Copy the SRV connection string and URL-encode special characters in the password.

Seed Atlas once from the laptop (PowerShell example):

```powershell
$env:MONGODB_URI="mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/hospital_db"
$env:SEED_PASSWORD="use-a-private-demo-password"
Set-Location server
npm ci
npm run seed -- --confirm-remote
```

Never commit these environment values.

## 3. Render

Create a Web Service or Blueprint from the GitHub repository. Use:

| Setting | Value |
|---|---|
| Root directory | `server` |
| Build command | `npm install` |
| Start command | `npm start` |
| Health check path | `/api/health` |
| Region | Singapore |
| Plan | Free |

Set these environment variables:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Atlas SRV URI |
| `JWT_SECRET` | unique random secret, 32+ characters |
| `CLIENT_ORIGINS` | temporary `http://localhost:3000` or the final Vercel URL |
| `SEED_PASSWORD` | private demo password (only needed for later reseeding) |

Deploy and copy the Render URL, for example `https://suman-hospital-api.onrender.com`.

## 4. Vercel

1. Import the same repository.
2. Set root directory to `client`.
3. Select Vite.
4. Set `VITE_API_URL=https://<render-url>/api`.
5. Deploy and copy the Vercel URL.

`client/vercel.json` handles SPA rewrites, so refreshes of `/doctors` and `/portal/beds` continue to serve the app.

## 5. Finish CORS

Return to Render, set `CLIENT_ORIGINS` to the exact Vercel origin (for example `https://suman-hospital.vercel.app`), and redeploy.

## 6. Smoke test

- Open `https://<render-url>/api/health` and confirm HTTP 200 with `"database":"connected"`.
- Log in once as admin, receptionist, doctor, nurse, pharmacist, and patient.
- Refresh public `/doctors` and protected `/portal/beds` deep links.
- Submit one booking and check the bed board.
- Confirm browser console has no CORS errors.

Free instances sleep after inactivity; open the health URL one or two minutes before a demo. Roll back by redeploying the previous commit.

## Security and operational notes

- Change all demo passwords after the demo.
- Never commit `.env`, Atlas credentials, or JWT secrets.
- Rotate the Atlas password if it is exposed.
- Render's filesystem is ephemeral; local backup files and uploads are not production storage.
- `npm run seed` refuses production and remote targets unless explicitly confirmed. It also requires `SEED_PASSWORD` for remote seeding.

## Rehearsal commands

```bash
cd server && npm ci && npm start
cd client && npm ci && npm run build && npm run preview -- --host 0.0.0.0
```

The production rehearsal uses local MongoDB with `NODE_ENV=production`, a strong test `JWT_SECRET`, `CLIENT_ORIGINS`, and `VITE_API_URL`.
