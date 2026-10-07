# Deploy backend on Render

## Why the service exits with status 1

`.env` is **not** deployed (gitignored). Render logs `injected env (0) from .env` when no file exists.

Without `MONGODB_URI`, the app cannot connect to MongoDB and exits.

## Render Web Service settings

| Setting | Value |
|--------|--------|
| **Root directory** | `woodie-erp-backend` (if repo is monorepo) |
| **Build command** | `npm install` |
| **Start command** | `npm start` or `node src/server.js` |

## Required environment variables

Add these in **Environment** (not in a `.env` file):

| Key | Example |
|-----|---------|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/woodie_erp?retryWrites=true&w=majority` |
| `JWT_SECRET` | long random string |
| `CORS_ORIGINS` | `https://your-frontend-url.com` |

`PORT` is set automatically by Render.

## MongoDB Atlas

1. Create a free cluster.
2. Database user with password.
3. **Network Access** → allow `0.0.0.0/0` (or Render’s IPs) so Render can connect.
4. Copy the connection string into `MONGODB_URI`.

## After deploy

- Health check: `https://YOUR-SERVICE.onrender.com/api/health`
- Default admin is seeded on first successful start: `admin@woodie.com` / `Admin@123`
